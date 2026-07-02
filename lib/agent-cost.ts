import { Prisma } from '@prisma/client'
import type { AgentType } from '@prisma/client'
import { prisma } from '@/lib/db'
import { sendText } from '@/lib/whatsapp'

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

// Presupuesto mensual de IA (USD). Configurable por env; default $40.
export function iaBudgetUsd(): number {
  const v = Number(process.env.IA_BUDGET_USD)
  return Number.isFinite(v) && v > 0 ? v : 40
}

// Gasto de IA del mes calendario en curso (USD).
export async function monthlySpendUsd(): Promise<number> {
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const agg = await prisma.agentRunLog.aggregate({ where: { createdAt: { gte: inicioMes } }, _sum: { costUsd: true } })
  return Number(agg._sum.costUsd ?? 0)
}

// Si el gasto del mes supera el presupuesto, avisa al admin UNA sola vez por mes
// (dedup en agent_memory). Best-effort — nunca lanza.
export async function alertIfOverBudget(): Promise<void> {
  try {
    const spent = await monthlySpendUsd()
    const budget = iaBudgetUsd()
    if (spent <= budget) return
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const yaAvisado = await prisma.agent_memory.findFirst({
      where: { agent: 'sistema', type: 'budget-alert', created_at: { gte: inicioMes } },
      select: { id: true },
    })
    if (yaAvisado) return
    await prisma.agent_memory.create({
      data: { agent: 'sistema', type: 'budget-alert', content: JSON.stringify({ spent, budget, ts: Date.now() }), outcome: 'malo' },
    }).catch(() => {})
    if (process.env.ADMIN_PHONE) {
      await sendText(process.env.ADMIN_PHONE, `⚠️ El gasto de IA este mes ($${spent.toFixed(2)}) superó el presupuesto ($${budget.toFixed(2)}). Revisa el dashboard de la Secretaria.`)
    }
  } catch (e) {
    console.error('[agent-cost] alertIfOverBudget falló:', e instanceof Error ? e.message : e)
  }
}
