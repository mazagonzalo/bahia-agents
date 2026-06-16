export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireCron } from '@/lib/cron-auth'

// Vercel Cron lo llama cada día a las 8am
export async function GET(req: NextRequest) {
  const unauthorized = requireCron(req)
  if (unauthorized) return unauthorized

  await fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/tendencias`, {
    method: 'GET',
  })

  await fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/meta-ads?action=monitor`, {
    method: 'GET',
  })

  return NextResponse.json({ ok: true, ran: new Date().toISOString() })
}
