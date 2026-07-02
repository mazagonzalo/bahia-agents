import { Prisma } from '@prisma/client'
import type { AgentType } from '@prisma/client'
import { prisma } from '@/lib/db'

// USD por 1M tokens. Espejo del map del orchestrator — mantener en sync con anthropic.com.
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-opus-4-6': { input: 15, output: 75 },
}

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? PRICING['claude-sonnet-4-6']
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000
}

// Registra en AgentRunLog una corrida de Claude hecha FUERA del harness (Tendencias,
// Contenido) para que el reporte de costo cubra a todos los agentes, no solo a los
// que pasan por runAgent(). Nunca lanza: un fallo de logging no debe tumbar la generación.
export async function logAgentRun(params: {
  agentType: AgentType
  model: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  status?: 'SUCCESS' | 'FAILED'
}): Promise<void> {
  try {
    await prisma.agentRunLog.create({
      data: {
        agentType: params.agentType,
        status: params.status ?? 'SUCCESS',
        latencyMs: params.latencyMs,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        costUsd: new Prisma.Decimal(estimateCostUsd(params.model, params.inputTokens, params.outputTokens)),
      },
    })
  } catch (e) {
    console.error('[agent-cost] no se pudo registrar la corrida:', e instanceof Error ? e.message : e)
  }
}
