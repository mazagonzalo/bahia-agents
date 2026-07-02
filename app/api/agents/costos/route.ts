export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Reporte de gasto de IA (lee AgentRunLog). Determinista, sin Claude.
// "Mes" = mes calendario en curso. Cubre todos los agentes: los del harness
// (runAgent) y los que registran vía askMetered (Tendencias, Contenido).
export async function GET() {
  const now = new Date()
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1)
  const inicioHoy = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [porAgente, totalMes, totalHoy] = await Promise.all([
    prisma.agentRunLog.groupBy({
      by: ['agentType'],
      where: { createdAt: { gte: inicioMes } },
      _sum: { costUsd: true, inputTokens: true, outputTokens: true },
      _count: { _all: true },
    }),
    prisma.agentRunLog.aggregate({
      where: { createdAt: { gte: inicioMes } },
      _sum: { costUsd: true },
      _count: { _all: true },
    }),
    prisma.agentRunLog.aggregate({
      where: { createdAt: { gte: inicioHoy } },
      _sum: { costUsd: true },
      _count: { _all: true },
    }),
  ])

  const agentes = porAgente
    .map((a) => ({
      agent: a.agentType,
      costoUsd: Number(a._sum.costUsd ?? 0),
      corridas: a._count._all,
      inputTokens: a._sum.inputTokens ?? 0,
      outputTokens: a._sum.outputTokens ?? 0,
    }))
    .sort((x, y) => y.costoUsd - x.costoUsd)

  return NextResponse.json({
    mes: {
      etiqueta: now.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
      totalUsd: Number(totalMes._sum.costUsd ?? 0),
      corridas: totalMes._count._all,
      porAgente: agentes,
    },
    hoy: {
      totalUsd: Number(totalHoy._sum.costUsd ?? 0),
      corridas: totalHoy._count._all,
    },
  })
}
