// Harness — Almacén de contexto de agentes (memoria gobernada)
//
// Memoria persistente para los agentes runtime: aprendizajes, hechos, fallas y
// patrones. `recall()` lee antes de cada run; `remember()` escribe después.
//
// Estrategia de recuperación (Fase 1): intersección de tags + recencia
// (lastUsedAt DESC). Fase 2 añadirá kNN por embeddings (pgvector vive ya en
// AgentContext.embedding como Bytes?).
//
// Cada fila tiene scope:
//   GLOBAL — visible a todos los agentes (hechos org-wide)
//   AGENT  — visible solo al mismo agentType (default)
//   TASK   — efímera, atada a una tarea vía tags

import { prisma } from '@/lib/db'
import type { AgentType } from '@/lib/types/agent'

export type ContextKind = 'LEARNING' | 'FACT' | 'FAILURE' | 'PATTERN'
export type ContextScope = 'GLOBAL' | 'AGENT' | 'TASK'

export interface RememberInput {
  agentType: AgentType
  kind: ContextKind
  content: string
  tags?: string[]
  scope?: ContextScope
}

export interface RecallOptions {
  tags?: string[]
  kinds?: ContextKind[]
  includeGlobal?: boolean
  limit?: number
}

export interface ContextRow {
  id: string
  kind: ContextKind
  scope: ContextScope
  content: string
  tags: string[]
  lastUsedAt: Date
  useCount: number
}

/**
 * Escribe una fila de contexto para un agente. Se llama tras cada run para
 * capturar aprendizajes, hechos observados, fallas a evitar o patrones.
 */
export async function remember(input: RememberInput): Promise<string> {
  const row = await prisma.agentContext.create({
    data: {
      agentType: input.agentType,
      kind: input.kind,
      scope: input.scope ?? 'AGENT',
      content: input.content,
      tags: input.tags ?? [],
    },
    select: { id: true },
  })
  return row.id
}

/**
 * Recupera filas de contexto relevantes para un agente. Fase 1: intersecta
 * tags, opcionalmente incluye filas GLOBAL, ordena por lastUsedAt DESC. Bumpea
 * `useCount` y `lastUsedAt` en las filas devueltas para que el conocimiento
 * "caliente" se mantenga arriba.
 */
export async function recall(
  agentType: AgentType,
  options: RecallOptions = {}
): Promise<ContextRow[]> {
  const limit = options.limit ?? 10
  const includeGlobal = options.includeGlobal ?? true

  const scopeFilter = includeGlobal
    ? { in: ['AGENT', 'GLOBAL'] as const }
    : { equals: 'AGENT' as const }

  const where: Record<string, unknown> = {
    agentType,
    scope: scopeFilter,
  }
  if (options.kinds && options.kinds.length > 0) {
    where.kind = { in: options.kinds }
  }
  if (options.tags && options.tags.length > 0) {
    where.tags = { hasSome: options.tags }
  }

  const rows = await prisma.agentContext.findMany({
    where,
    orderBy: { lastUsedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      kind: true,
      scope: true,
      content: true,
      tags: true,
      lastUsedAt: true,
      useCount: true,
    },
  })

  // Marca como usadas (fire-and-forget; no bloquea al llamador).
  if (rows.length > 0) {
    const ids = rows.map((r) => r.id)
    void prisma.agentContext
      .updateMany({
        where: { id: { in: ids } },
        data: { lastUsedAt: new Date(), useCount: { increment: 1 } },
      })
      .catch(() => {
        /* best-effort; el logging se hace a nivel de run */
      })
  }

  return rows as ContextRow[]
}

/**
 * Formatea el contexto recuperado en un bloque inyectable al system prompt del
 * agente. Trunca cada entrada para mantener los tokens bajos.
 */
export function formatContextForPrompt(rows: ContextRow[], maxCharsPerRow = 400): string {
  if (rows.length === 0) return ''
  const lines = rows.map((r) => {
    const body =
      r.content.length > maxCharsPerRow
        ? r.content.slice(0, maxCharsPerRow - 1) + '…'
        : r.content
    return `- [${r.kind}] ${body}`
  })
  return ['## Memoria relevante', ...lines].join('\n')
}
