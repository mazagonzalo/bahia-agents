// Harness — tipos de agentes de Bahía
//
// AgentType es el espejo en TS del enum Prisma `AgentType` (ya en la DB).
// Son los 9 agentes de dominio + META (el meta-agente de auto-mejora).

export type AgentType =
  | 'TENDENCIAS'
  | 'CONTENIDO'
  | 'EVENTOS'
  | 'META_ADS'
  | 'VENTAS'
  | 'SEGUIMIENTO'
  | 'CRITICO'
  | 'REPUTACION'
  | 'SECRETARIA'
  | 'META'

/** Los agentes de dominio (todo menos META, el meta-agente de auto-mejora). */
export type DomainAgentType = Exclude<AgentType, 'META'>

export const DOMAIN_AGENT_TYPES: readonly DomainAgentType[] = [
  'TENDENCIAS',
  'CONTENIDO',
  'EVENTOS',
  'META_ADS',
  'VENTAS',
  'SEGUIMIENTO',
  'CRITICO',
  'REPUTACION',
  'SECRETARIA',
] as const

/** Slug en kebab-case por agente (carpeta de prompt/fixtures/wrapper). */
export const AGENT_SLUGS: Record<DomainAgentType, string> = {
  TENDENCIAS: 'tendencias',
  CONTENIDO: 'contenido',
  EVENTOS: 'eventos',
  META_ADS: 'meta-ads',
  VENTAS: 'ventas',
  SEGUIMIENTO: 'seguimiento',
  CRITICO: 'critico',
  REPUTACION: 'reputacion',
  SECRETARIA: 'secretaria',
}

export type AgentApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED'

// ─────────────────────────────────────────────────────────────────────────────
// Contrato de salida de los agentes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Propuesta base que TODO agente de dominio emite como JSON estricto.
 *
 * Contrato mínimo:
 *   - `proposalType`: discrimina la forma del payload. `"abstain"` significa
 *     que el agente decidió NO proponer nada (no se crea AgentApproval).
 *   - `confidence`: 0..1, qué tan seguro está el agente de su propuesta.
 *   - `rationale`: por qué (en español formal). Se usa también como semilla de
 *     memoria (remember LEARNING) tras un run exitoso.
 *
 * Cada agente extiende esta interfaz con sus campos de dominio. El orquestador
 * NO valida el shape: parsea el JSON, crea la AgentApproval PENDING (salvo
 * abstain) y deja la validación de campos a la capa de evals (requiredFields).
 */
export interface BaseAgentProposal {
  /** Discriminador del tipo de propuesta. "abstain" ⇒ no se crea aprobación. */
  proposalType: string
  /** Confianza del agente en su propuesta (0..1). */
  confidence: number
  /** Justificación en español formal. */
  rationale?: string
  /** Campos de dominio específicos del agente. */
  [key: string]: unknown
}

/** Propuesta de abstención: el agente no tiene una recomendación accionable. */
export interface AbstainProposal {
  proposalType: 'abstain'
  rationale?: string
}

/** Registro de una AgentApproval tal como vive en la DB (forma TS). */
export interface AgentProposalRecord {
  id: string
  agentType: AgentType
  proposalData: Record<string, unknown>
  status: AgentApprovalStatus
  proposedAt: Date
  approvedBy?: string | null
  approvedAt?: Date | null
  coordinatedWith: string[]
  executedAt?: Date | null
  result?: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}
