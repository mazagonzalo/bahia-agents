// Harness — Coordinador de agentes
//
// Capa ligera de orquestación que deja a los agentes de dominio delegar entre
// sí y al harness resolver conflictos entre propuestas que compiten.
//
// Fase 1 deliberadamente mínima:
//   - routeTask: ruteo por reglas de un descriptor de tarea al agente correcto
//   - delegateTo: un agente le pide input a otro, devuelve un AgentRunResult
//   - resolveConflict: reglas deterministas primero; LLM-juez en fases futuras

import type { AgentType, DomainAgentType } from '@/lib/types/agent'

export interface TaskDescriptor {
  kind:
    | 'trend_scan' // detectar tendencias accionables → TENDENCIAS
    | 'content_brief' // generar idea/carrusel/reel → CONTENIDO
    | 'event_plan' // potencial de contenido de un evento → EVENTOS
    | 'ad_campaign' // campaña Meta Ads → META_ADS
    | 'lead_qualify' // calificar/avanzar un lead → VENTAS
    | 'lead_followup' // siguiente toque a un lead frío → SEGUIMIENTO
    | 'creative_review' // calificar una creatividad/campaña → CRITICO
    | 'review_reply' // responder reseñas/reputación → REPUTACION
    | 'inbox_triage' // bandeja/agenda/admin → SECRETARIA
    | 'generic'
  payload: Record<string, unknown>
  /** Tags opcionales para ayudar la recuperación de AgentContext. */
  tags?: string[]
}

export interface AgentRunResult {
  agentType: DomainAgentType
  approvalId: string
  proposalData: Record<string, unknown>
  confidence?: number
}

/**
 * Mapea un kind de tarea → el agente dueño. Única fuente de verdad para el
 * ruteo. Mantener puro; sin I/O.
 */
export function routeTask(task: TaskDescriptor): DomainAgentType {
  switch (task.kind) {
    case 'trend_scan':
      return 'TENDENCIAS'
    case 'content_brief':
      return 'CONTENIDO'
    case 'event_plan':
      return 'EVENTOS'
    case 'ad_campaign':
      return 'META_ADS'
    case 'lead_qualify':
      return 'VENTAS'
    case 'lead_followup':
      return 'SEGUIMIENTO'
    case 'creative_review':
      return 'CRITICO'
    case 'review_reply':
      return 'REPUTACION'
    case 'inbox_triage':
      return 'SECRETARIA'
    case 'generic':
      // Las tareas genéricas caen en el crítico (sintetiza/evalúa transversal).
      return 'CRITICO'
  }
}

/**
 * Hace que el agente `from` delegue al agente `to`. Fase 1: solo llama runAgent
 * para el objetivo y registra el origen vía delegatedFrom. NO ejecuta efectos:
 * la salida del agente objetivo pasa por createProposal como cualquier otra.
 */
export async function delegateTo(
  from: AgentType,
  to: DomainAgentType,
  userMessage: string,
  tags?: string[]
): Promise<AgentRunResult> {
  const { runAgent } = await import('./orchestrator')
  const result = await runAgent(to, userMessage, { tags, delegatedFrom: from })
  return {
    agentType: result.agentType,
    approvalId: result.approvalId,
    proposalData: result.proposalData,
    confidence: result.confidence,
  }
}

/**
 * Resuelve conflictos entre propuestas que compiten de varios agentes.
 * Reglas Fase 1 (deterministas, rápidas):
 *   1. Gana la mayor confianza si la brecha ≥ 0.2
 *   2. Si no, prefiere al agente dueño del dominio (routeTask de este kind)
 *   3. Empate → devuelve todas; el manager decide en la UI
 */
export function resolveConflict(
  proposals: AgentRunResult[],
  task: TaskDescriptor
): { winner: AgentRunResult | null; tied: AgentRunResult[] } {
  if (proposals.length === 0) return { winner: null, tied: [] }
  if (proposals.length === 1) return { winner: proposals[0], tied: [] }

  // Regla 1: mayor confianza con brecha decisiva.
  const sorted = [...proposals].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
  const top = sorted[0]
  const runnerUp = sorted[1]
  if ((top.confidence ?? 0) - (runnerUp.confidence ?? 0) >= 0.2) {
    return { winner: top, tied: [] }
  }

  // Regla 2: prefiere al agente dueño del dominio.
  const owner = routeTask(task)
  const ownerProposal = proposals.find((p) => p.agentType === owner)
  if (ownerProposal) return { winner: ownerProposal, tied: [] }

  // Regla 3: empate — que decida el manager.
  return { winner: null, tied: proposals }
}
