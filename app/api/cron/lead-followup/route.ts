export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireCron } from '@/lib/cron-auth'

export async function GET(req: NextRequest) {
  const unauthorized = requireCron(req)
  if (unauthorized) return unauthorized

  const base = process.env.NEXT_PUBLIC_URL ?? `https://${process.env.VERCEL_URL}`
  const res = await fetch(`${base}/api/agents/seguimiento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dryRun: false }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
