export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

// Vercel Cron lo llama cada día a las 8am
export async function GET() {
  await fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/tendencias`, {
    method: 'GET',
  })

  await fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/meta-ads?action=monitor`, {
    method: 'GET',
  })

  return NextResponse.json({ ok: true, ran: new Date().toISOString() })
}
