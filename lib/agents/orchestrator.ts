// Harness — Orquestador de agentes
//
// runAgent() es el corazón: carga el prompt activo, recall de memoria, llama a
// Claude (SDK directo para contar tokens + costo), parsea JSON estricto, crea
// una AgentApproval PENDING (salvo abstain), escribe un AgentRunLog y persiste
// un aprendizaje (remember). NUNCA ejecuta efectos: solo propone.

import Anthropic from '@anthropic-ai/sdk'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { AgentType, DomainAgentType } from '@/lib/types/agent'
import { recall, remember, formatContextForPrompt, type ContextRow } from './context-store'
import { getActivePrompt, PromptRegistryError } from './prompt-registry'

// Cliente Claude perezoso — solo se inicializa cuando ANTHROPIC_API_KEY existe.
let _client: Anthropic | null = null

export function getClaudeClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY no está configurada. Agrégala a .env.local para usar agentes.')
    }
    _client = new Anthropic({ apiKey })
  }
  return _client
}

export function isClaudeAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

/**
 * Extrae el JSON de la respuesta de Claude de forma robusta: quita fences
 * ```json … ``` y prosa antes/después, y recorta al primer `{` … último `}`.
 */
export function extractJson(text: string): string {
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fence) t = fence[1].trim()
  if (!t.startsWith('{')) {
    const first = t.indexOf('{')
    const last = t.lastIndexOf('}')
    if (first !== -1 && last > first) t = t.slice(first, last + 1)
  }
  return t
}

/** Modelo por defecto para los agentes de Bahía. */
export const DEFAULT_MODEL = 'claude-sonnet-4-6'

/**
 * Precios para estimar costo en AgentRunLog. USD por 1M tokens. Mantener en
 * sync con anthropic.com.
 */
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-opus-4-6': { input: 15, output: 75 },
}

function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? PRICING[DEFAULT_MODEL]
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000
}

/**
 * Crea una AgentApproval (PENDING) y devuelve su id. TODAS las salidas de
 * agente pasan por aquí — nunca se ejecuta directamente.
 */
export async function createProposal(
  agentType: AgentType,
  proposalData: Record<string, unknown>
): Promise<string> {
  const approval = await prisma.agentApproval.create({
    data: {
      agentType,
      proposalData: proposalData as Prisma.InputJsonValue,
      status: 'PENDING',
    },
    select: { id: true },
  })
  return approval.id
}

/** Marca una aprobación como APPROVED y registra quién la aprobó. */
export async function approveProposal(approvalId: string, approvedByUserId: string): Promise<void> {
  await prisma.agentApproval.update({
    where: { id: approvalId },
    data: { status: 'APPROVED', approvedBy: approvedByUserId, approvedAt: new Date() },
  })
}

/** Marca una aprobación como REJECTED. */
export async function rejectProposal(approvalId: string, rejectedByUserId: string): Promise<void> {
  await prisma.agentApproval.update({
    where: { id: approvalId },
    data: { status: 'REJECTED', approvedBy: rejectedByUserId, approvedAt: new Date() },
  })
}

/** Marca una aprobación como EXECUTED y guarda el resultado. */
export async function markExecuted(approvalId: string, result: Record<string, unknown>): Promise<void> {
  await prisma.agentApproval.update({
    where: { id: approvalId },
    data: { status: 'EXECUTED', executedAt: new Date(), result: result as Prisma.InputJsonValue },
  })
}

export interface RunAgentOptions {
  /** Override del modelo (default: DEFAULT_MODEL = claude-sonnet-4-6). */
  model?: string
  /** Tags para acotar la recuperación de contexto (ej. ['reel', 'verano']). */
  tags?: string[]
  /** Si este run lo disparó otro agente, registra el origen para auditoría. */
  delegatedFrom?: AgentType
  /** Máximo de filas de contexto a inyectar al system prompt. */
  contextLimit?: number
  /** Override: usa este system prompt en vez del registro. Útil para evals. */
  systemPromptOverride?: string
  /** Override: salta el recall de contexto (runs de eval deterministas). */
  skipContext?: boolean
  /**
   * Si es true, registra la corrida (AgentRunLog + memoria) pero NO crea una
   * AgentApproval. Para agentes EVALUADORES/informativos (critico, reputacion)
   * que corren seguido y cuya salida no es una acción a aprobar.
   */
  skipApproval?: boolean
}

export interface RunAgentResult {
  agentType: DomainAgentType
  approvalId: string
  proposalData: Record<string, unknown>
  confidence?: number
  promptVersionId: string | null
  contextIdsUsed: string[]
  runLogId: string
  latencyMs: number
  inputTokens: number
  outputTokens: number
  costUsd: number
}

/**
 * Punto de entrada canónico del harness para correr un agente runtime.
 *
 * Responsabilidades:
 *   1. Cargar el system prompt activo de AgentPromptVersion (o usar override).
 *   2. Recall de filas de contexto relevantes de AgentContext e inyectarlas.
 *   3. Llamar a Claude (SDK directo, para contar tokens + costo).
 *   4. Parsear la respuesta JSON estricta a proposalData.
 *   5. Crear una AgentApproval (PENDING) salvo que el agente se abstenga.
 *   6. Escribir un AgentRunLog (latencia + tokens + costo + ids de contexto).
 *   7. Persistir un LEARNING ligero en AgentContext para que la memoria crezca.
 */
export async function runAgent(
  agentType: DomainAgentType,
  userMessage: string,
  options: RunAgentOptions = {}
): Promise<RunAgentResult> {
  const started = Date.now()

  // 1. Prompt activo (o override para evals).
  let systemPrompt = options.systemPromptOverride
  let promptVersionId: string | null = null
  if (!systemPrompt) {
    try {
      const active = await getActivePrompt(agentType)
      systemPrompt = active.systemPrompt
      promptVersionId = active.id
    } catch (err) {
      if (err instanceof PromptRegistryError) throw err
      throw err
    }
  }

  // 2. Recall de contexto.
  let contextRows: ContextRow[] = []
  if (!options.skipContext) {
    contextRows = await recall(agentType, {
      tags: options.tags,
      limit: options.contextLimit ?? 10,
      includeGlobal: true,
    })
  }
  const contextBlock = formatContextForPrompt(contextRows)
  const composedSystemPrompt = contextBlock ? `${systemPrompt}\n\n${contextBlock}` : systemPrompt

  // 3. Llamada a Claude.
  const model = options.model ?? DEFAULT_MODEL
  let status: 'SUCCESS' | 'FAILED' | 'ABSTAINED' = 'SUCCESS'
  let errorMsg: string | null = null
  let inputTokens = 0
  let outputTokens = 0
  let rawText = ''

  try {
    const client = getClaudeClient()
    const resp = await client.messages.create({
      model,
      max_tokens: 8192, // los agentes de Bahía emiten JSON grande (briefings, evaluaciones); 2048 truncaba
      system: composedSystemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })
    inputTokens = resp.usage?.input_tokens ?? 0
    outputTokens = resp.usage?.output_tokens ?? 0
    const block = resp.content[0]
    if (block.type !== 'text') {
      throw new Error(`Bloque de respuesta de Claude inesperado: ${block.type}`)
    }
    rawText = block.text
  } catch (err) {
    status = 'FAILED'
    errorMsg = err instanceof Error ? err.message : String(err)
  }

  // 4. Parseo de JSON estricto (best-effort; el contrato pide JSON).
  let proposalData: Record<string, unknown> = {}
  let confidence: number | undefined
  if (status === 'SUCCESS') {
    try {
      proposalData = JSON.parse(extractJson(rawText)) as Record<string, unknown>
      if (proposalData.proposalType === 'abstain') status = 'ABSTAINED'
      if (typeof proposalData.confidence === 'number') confidence = proposalData.confidence
    } catch {
      proposalData = { _raw: rawText }
    }
  }

  // 5. Propuesta (solo para runs exitosos no-abstain).
  let approvalId = ''
  if (status === 'SUCCESS' && proposalData.proposalType !== 'abstain' && !options.skipApproval) {
    const delegationMeta = options.delegatedFrom ? { delegatedFrom: options.delegatedFrom } : {}
    approvalId = await createProposal(agentType, { ...proposalData, ...delegationMeta })
  }

  const latencyMs = Date.now() - started
  const costUsd = estimateCostUsd(model, inputTokens, outputTokens)

  // 6. Run log.
  const runLog = await prisma.agentRunLog.create({
    data: {
      agentType,
      approvalId: approvalId || null,
      promptVersionId,
      status,
      errorMsg,
      latencyMs,
      inputTokens,
      outputTokens,
      costUsd: new Prisma.Decimal(costUsd),
      contextIdsUsed: contextRows.map((r) => r.id),
    },
    select: { id: true },
  })

  // 7. Persistir un LEARNING ligero en runs exitosos para que la memoria crezca.
  if (status === 'SUCCESS' && approvalId) {
    const summary =
      typeof proposalData.rationale === 'string'
        ? proposalData.rationale
        : JSON.stringify(proposalData).slice(0, 400)
    void remember({
      agentType,
      kind: 'LEARNING',
      content: summary,
      tags: options.tags ?? [],
    }).catch(() => {
      /* memoria es best-effort */
    })
  }

  if (status === 'FAILED') {
    throw new Error(`runAgent(${agentType}) falló: ${errorMsg}`)
  }

  return {
    agentType,
    approvalId,
    proposalData,
    confidence,
    promptVersionId,
    contextIdsUsed: contextRows.map((r) => r.id),
    runLogId: runLog.id,
    latencyMs,
    inputTokens,
    outputTokens,
    costUsd,
  }
}

/**
 * Registra el resultado de ejecución de una propuesta aprobada (loop de
 * aprendizaje). Escribe AgentProposalHistory y marca la aprobación EXECUTED.
 */
export async function recordExecutionResult(
  approvalId: string,
  executionStatus: 'success' | 'failed',
  metrics: Record<string, unknown>
): Promise<void> {
  const approval = await prisma.agentApproval.findUnique({ where: { id: approvalId } })
  if (!approval) throw new Error(`Aprobación ${approvalId} no encontrada`)

  try {
    await prisma.agentProposalHistory.create({
      data: {
        approvalId,
        agentType: approval.agentType,
        proposalSummary: JSON.stringify(approval.proposalData).substring(0, 500),
        executionStatus,
        metrics: metrics as Prisma.InputJsonValue,
        result: { status: executionStatus, timestamp: new Date().toISOString() },
      },
    })
  } catch {
    console.debug('Tabla AgentProposalHistory no disponible aún')
  }

  await markExecuted(approvalId, metrics)
}

/** Historial de propuestas de un agente para contexto de aprendizaje. */
export async function getAgentHistory(
  agentType: AgentType,
  limit = 10
): Promise<Array<{ proposalSummary: string; executionStatus: string; metrics: Record<string, unknown> }>> {
  try {
    const history = await prisma.agentProposalHistory.findMany({
      where: { agentType },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { proposalSummary: true, executionStatus: true, metrics: true },
    })
    return history.map((h) => ({
      proposalSummary: h.proposalSummary,
      executionStatus: h.executionStatus,
      metrics: (h.metrics ?? {}) as Record<string, unknown>,
    }))
  } catch {
    console.debug(`AgentProposalHistory no disponible para ${agentType}`)
    return []
  }
}
