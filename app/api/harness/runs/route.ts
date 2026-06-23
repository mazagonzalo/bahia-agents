import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePanelRole } from '@/lib/auth/require-role'

// Ledger de corridas del harness (AgentRunLog) — solo lectura, requiere rol de panel.
export async function GET() {
  const access = await requirePanelRole()
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

  try {
    const [runs, totalRuns, agg] = await Promise.all([
      prisma.agentRunLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.agentRunLog.count(),
      prisma.agentRunLog.aggregate({ _sum: { inputTokens: true, outputTokens: true, costUsd: true } }),
    ])
    const byStatus = await prisma.agentRunLog.groupBy({ by: ['status'], _count: { _all: true } })
    return NextResponse.json({
      runs: runs.map((r) => ({
        id: r.id,
        agentType: r.agentType,
        status: r.status,
        latencyMs: r.latencyMs,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        costUsd: Number(r.costUsd),
        createdAt: r.createdAt,
      })),
      summary: {
        totalRuns,
        totalCostUsd: Number(agg._sum.costUsd ?? 0),
        totalInputTokens: agg._sum.inputTokens ?? 0,
        totalOutputTokens: agg._sum.outputTokens ?? 0,
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
      },
    })
  } catch (e) {
    console.error('[harness/runs GET]', e)
    return NextResponse.json({ error: 'error de DB' }, { status: 500 })
  }
}
