export const dynamic = 'force-dynamic'
export const maxDuration = 300 // dispara la generación de 3 variantes (varias llamadas a Claude)
import { NextRequest, NextResponse } from 'next/server'
import { requireCron } from '@/lib/cron-auth'
import { prisma } from '@/lib/db'

// Cron biweekly (1 y 15 de cada mes ≈ cada 14 días): arranca el ciclo de pauta.
// Lee el ÚLTIMO reporte de tendencias y dispara la generación de 3 variantes del
// carrusel promocional. El admin aprueba una en el dashboard → el agente deriva la
// cola de rotación. La rotación entre variantes la maneja el crítico (sin costo).
export async function GET(req: NextRequest) {
  const unauthorized = requireCron(req)
  if (unauthorized) return unauthorized

  const last = await prisma.agent_memory.findFirst({
    where: { agent: 'tendencias', type: 'briefing' },
    orderBy: { created_at: 'desc' },
    select: { content: true },
  })
  if (!last?.content) return NextResponse.json({ skipped: 'sin reporte de tendencias' })

  let report: {
    contentIdeas?: { urgency?: number }[]
    trends?: { topic: string; angle: string }[]
    strategy?: unknown
  }
  try {
    report = JSON.parse(last.content)
  } catch {
    return NextResponse.json({ skipped: 'reporte ilegible' })
  }

  const topIdea = [...(report.contentIdeas ?? [])].sort((a, b) => (b.urgency ?? 0) - (a.urgency ?? 0))[0]
  const topTrend = report.trends?.[0]

  // Prioriza la idea de mayor urgencia; si el reporte vino sin ideas, usa el top trend.
  const payload = topIdea
    ? { idea: topIdea, strategy: report.strategy, trend: topTrend ? { topic: topTrend.topic, angle: topTrend.angle } : null }
    : topTrend
      ? { trend: { topic: topTrend.topic, angle: topTrend.angle } }
      : null

  if (!payload) return NextResponse.json({ skipped: 'reporte sin ideas ni trends' })

  const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/contenido`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => null)
  const data = res ? await res.json().catch(() => ({})) : {}

  return NextResponse.json({ ok: true, variants: data.variants?.length ?? 0, ran: new Date().toISOString() })
}
