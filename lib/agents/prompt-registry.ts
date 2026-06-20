// Harness — Registro de Prompts
//
// Los system prompts activos viven en la tabla Prisma `AgentPromptVersion`, no
// en el código fuente. Esto habilita el flujo de auto-mejora META: el
// meta-agente propone una versión nueva, un manager la aprueba, y la ruta de
// activación voltea `isActive` para apuntar el agente al nuevo prompt — sin
// deploy.
//
// Seguridad: las ediciones de auto-mejora NUNCA tocan archivos .ts. Solo
// escriben filas nuevas en `AgentPromptVersion`.

import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { AgentType } from '@/lib/types/agent'

export interface PromptRecord {
  id: string
  agentType: AgentType
  version: number
  systemPrompt: string
  toolsConfig: Record<string, unknown>
  isActive: boolean
  createdAt: Date
  createdBy: string | null
}

export class PromptRegistryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PromptRegistryError'
  }
}

/**
 * Carga el prompt actualmente activo para un agentType. Lanza si no hay versión
 * activa — todo agente debe haberse sembrado (ver prisma/seed-harness.ts).
 */
export async function getActivePrompt(agentType: AgentType): Promise<PromptRecord> {
  const row = await prisma.agentPromptVersion.findFirst({
    where: { agentType, isActive: true },
    orderBy: { version: 'desc' },
  })
  if (!row) {
    throw new PromptRegistryError(
      `No hay versión de prompt activa para agentType=${agentType}. Corre \`npm run harness:seed\` para sembrar v1.`
    )
  }
  return toRecord(row)
}

/**
 * Lista todas las versiones de un agentType, más reciente primero. La usa el
 * dashboard meta para mostrar historial y permitir rollback.
 */
export async function listVersions(agentType: AgentType): Promise<PromptRecord[]> {
  const rows = await prisma.agentPromptVersion.findMany({
    where: { agentType },
    orderBy: { version: 'desc' },
  })
  return rows.map(toRecord)
}

/**
 * Crea una versión nueva de prompt (NO la activa). La llama el meta-agente al
 * redactar una propuesta de auto-mejora. El número de versión es
 * max(existente) + 1. La activación ocurre solo tras aprobación de manager.
 */
export async function createPromptVersion(input: {
  agentType: AgentType
  systemPrompt: string
  toolsConfig?: Record<string, unknown>
  createdBy: string
  approvalId?: string
}): Promise<PromptRecord> {
  const latest = await prisma.agentPromptVersion.findFirst({
    where: { agentType: input.agentType },
    orderBy: { version: 'desc' },
    select: { version: true },
  })
  const nextVersion = (latest?.version ?? 0) + 1

  const row = await prisma.agentPromptVersion.create({
    data: {
      agentType: input.agentType,
      version: nextVersion,
      systemPrompt: input.systemPrompt,
      toolsConfig: (input.toolsConfig ?? {}) as Prisma.InputJsonValue,
      isActive: false,
      createdBy: input.createdBy,
      approvalId: input.approvalId,
    },
  })
  return toRecord(row)
}

/**
 * Voltea atómicamente el puntero activo de un agentType a la versionId dada.
 * Todas las demás versiones de ese agentType pasan a inactivas. Se usa tanto
 * para activar una propuesta META APROBADA como para rollback. Envuelto en
 * transacción: nunca hay un momento con cero o dos versiones activas.
 */
export async function activateVersion(versionId: string): Promise<PromptRecord> {
  return prisma.$transaction(async (tx) => {
    const target = await tx.agentPromptVersion.findUnique({ where: { id: versionId } })
    if (!target) throw new PromptRegistryError(`Versión de prompt ${versionId} no encontrada`)

    await tx.agentPromptVersion.updateMany({
      where: { agentType: target.agentType, isActive: true },
      data: { isActive: false },
    })
    const row = await tx.agentPromptVersion.update({
      where: { id: versionId },
      data: { isActive: true },
    })
    return toRecord(row)
  })
}

/**
 * Upsert idempotente de la v1 activa de un agente. Lo usa el seed: si ya existe
 * la v1, la deja activa y actualiza el texto; si no, la crea activa.
 */
export async function upsertActiveV1(
  agentType: AgentType,
  systemPrompt: string,
  createdBy = 'seed'
): Promise<PromptRecord> {
  const existing = await prisma.agentPromptVersion.findUnique({
    where: { agentType_version: { agentType, version: 1 } },
  })
  if (existing) {
    const row = await prisma.agentPromptVersion.update({
      where: { id: existing.id },
      data: { systemPrompt, isActive: true },
    })
    return toRecord(row)
  }
  const row = await prisma.agentPromptVersion.create({
    data: { agentType, version: 1, systemPrompt, isActive: true, createdBy },
  })
  return toRecord(row)
}

type PromptVersionRow = {
  id: string
  agentType: string
  version: number
  systemPrompt: string
  toolsConfig: unknown
  isActive: boolean
  createdAt: Date
  createdBy: string | null
}

function toRecord(row: PromptVersionRow): PromptRecord {
  return {
    id: row.id,
    agentType: row.agentType as AgentType,
    version: row.version,
    systemPrompt: row.systemPrompt,
    toolsConfig: (row.toolsConfig ?? {}) as Record<string, unknown>,
    isActive: row.isActive,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  }
}
