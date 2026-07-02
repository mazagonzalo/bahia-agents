export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireCron } from '@/lib/cron-auth'
import { guardCron } from '@/lib/cron-run'
import { alertIfOverBudget } from '@/lib/agent-cost'

// Vercel Cron lo llama cada día a las 8am
export async function GET(req: NextRequest) {
  const unauthorized = requireCron(req)
  if (unauthorized) return unauthorized

  return guardCron('daily-trends', async () => {
    await fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/tendencias`, { method: 'GET' })
    await fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/meta-ads?action=monitor`, { method: 'GET' })

    // Chequeo diario de presupuesto de IA (avisa una vez por mes si se pasó).
    await alertIfOverBudget()

    return NextResponse.json({ ok: true, ran: new Date().toISOString() })
  })
}
