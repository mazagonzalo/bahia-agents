// Harness — Meta-Agente (auto-mejora)
//
// El meta-agente analiza los RunLogs recientes de un agente objetivo y las
// entradas rechazadas de ProposalHistory, redacta un system prompt revisado, y
// crea una AgentApproval (agentType=META) con la versión de prompt propuesta.
//
// RIELES DE SEGURIDAD CRÍTICOS:
//   1. El meta-agente SOLO propone filas nuevas en AgentPromptVersion — NUNCA
//      escribe archivos TypeScript.
//   2. Las propuestas son PENDING por default; la activación ocurre solo tras
//      aprobación de un MANAGER/OWNER.
//   3. Si HARNESS_SELF_IMPROVE_ENABLED !== 'true', este módulo se niega a crear
//      propuestas.

import { getClaudeClient, createProposal, getAgentHistory, DEFAULT_MODEL } from './orchestrator'
import { getActivePrompt, createPromptVersion } from './prompt-registry'
import type { DomainAgentType } from '@/lib/types/agent'

export function isSelfImproveEnabled(): boolean {
  return process.env.HARNESS_SELF_IMPROVE_ENABLED === 'true'
}

export class SelfImproveDisabledError extends Error {
  constructor() {
    super('La auto-mejora está deshabilitada. Define HARNESS_SELF_IMPROVE_ENABLED=true para activarla.')
    this.name = 'SelfImproveDisabledError'
  }
}

const META_SYSTEM_PROMPT = `Eres el Meta-Agente de Bahía Agents — mejoras a otros agentes runtime proponiendo revisiones a sus system prompts.

Recibirás:
1. El system prompt actual del agente objetivo (verbatim).
2. Una lista de propuestas APROBADAS recientes (lo que el agente hizo bien).
3. Una lista de propuestas RECHAZADAS recientes (lo que el agente erró, con razones del manager si las hay).
4. Una lista de runs FALLIDOS recientes con sus mensajes de error.

Tu trabajo:
- Identifica ediciones de texto concretas y mínimas que atiendan las fallas observadas.
- Mantén intacta la estructura original y los encabezados de sección.
- NO agregues instrucciones de uso de herramientas que no estuvieran presentes.
- NO instruyas al agente a ejecutar mutaciones directamente; toda propuesta debe seguir pasando por la compuerta de aprobación.
- Responde SOLO con JSON.

Responde ÚNICAMENTE con:
{
  "newSystemPrompt": "<texto completo del prompt revisado>",
  "rationale": "<2-4 frases en español explicando los cambios clave y qué observaciones los motivaron>",
  "targetMetrics": ["<ej. 'reducir tasa de rechazo en tareas de retención'>"],
  "confidence": <0..1>
}`

export interface DraftMetaProposalInput {
  targetAgent: DomainAgentType
  authorUserId: string
  /** Opcional: número de items de historial a inspeccionar (default 20). */
  historyLimit?: number
}

export interface DraftMetaProposalResult {
  approvalId: string
  proposedPromptVersionId: string
  targetAgent: DomainAgentType
  newVersion: number
  rationale: string
  confidence: number
}

/**
 * Redacta una propuesta META: crea una AgentPromptVersion (inactiva) y una
 * AgentApproval (PENDING) que la enlaza. NO activa nada.
 */
export async function draftMetaProposal(
  input: DraftMetaProposalInput
): Promise<DraftMetaProposalResult> {
  if (!isSelfImproveEnabled()) throw new SelfImproveDisabledError()

  const current = await getActivePrompt(input.targetAgent)
  const history = await getAgentHistory(input.targetAgent, input.historyLimit ?? 20)

  const approved = history.filter((h) => h.executionStatus === 'success')
  const rejected = history.filter((h) => h.executionStatus === 'failed')

  const userMessage = [
    `Agente objetivo: ${input.targetAgent} (actualmente en v${current.version})`,
    ``,
    `System prompt actual:`,
    '"""',
    current.systemPrompt,
    '"""',
    ``,
    `Propuestas aprobadas recientes (${approved.length}):`,
    ...approved.slice(0, 5).map((h) => `- ${h.proposalSummary.slice(0, 200)}`),
    ``,
    `Propuestas rechazadas / fallidas recientes (${rejected.length}):`,
    ...rejected
      .slice(0, 10)
      .map((h) => `- ${h.proposalSummary.slice(0, 200)} | metrics: ${JSON.stringify(h.metrics).slice(0, 120)}`),
    ``,
    `Propón una revisión mínima ahora.`,
  ].join('\n')

  const client = getClaudeClient()
  const resp = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 4096,
    system: META_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })
  const block = resp.content[0]
  if (block.type !== 'text') throw new Error('El meta-agente devolvió un bloque no-texto')

  let parsed: { newSystemPrompt: string; rationale: string; targetMetrics: string[]; confidence: number }
  try {
    parsed = JSON.parse(block.text.trim())
  } catch {
    const match = block.text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('El meta-agente produjo JSON inparseables')
    parsed = JSON.parse(match[0])
  }

  // 1. Crea la versión de prompt inactiva.
  const version = await createPromptVersion({
    agentType: input.targetAgent,
    systemPrompt: parsed.newSystemPrompt,
    createdBy: 'meta-agent',
  })

  // 2. Crea la aprobación META que la apunta.
  const approvalId = await createProposal('META', {
    targetAgent: input.targetAgent,
    proposedPromptVersionId: version.id,
    newVersionNumber: version.version,
    rationale: parsed.rationale,
    targetMetrics: parsed.targetMetrics,
    confidence: parsed.confidence,
    authorUserId: input.authorUserId,
  })

  return {
    approvalId,
    proposedPromptVersionId: version.id,
    targetAgent: input.targetAgent,
    newVersion: version.version,
    rationale: parsed.rationale,
    confidence: parsed.confidence,
  }
}
