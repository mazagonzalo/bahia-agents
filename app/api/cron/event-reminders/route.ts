export const dynamic = 'force-dynamic'
export const maxDuration = 120
import { NextRequest, NextResponse } from 'next/server'
import { requireCron } from '@/lib/cron-auth'
import { prisma } from '@/lib/db'
import { sendText } from '@/lib/whatsapp'

// Cron diario: busca eventos que ocurren en los próximos N días y, una sola vez por
// evento, dispara contenido de recordatorio + avisa al admin. Evita duplicados con
// una marca en agent_memory (type=recordatorio).
const REMINDER_DAYS = 3

export async function GET(req: NextRequest) {
  const unauthorized = requireCron(req)
  if (unauthorized) return unauthorized

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const limite = new Date(hoy)
  limite.setDate(limite.getDate() + REMINDER_DAYS)

  const eventos = await prisma.club_events.findMany({
    where: { active: true, start_date: { gte: hoy, lte: limite } },
    select: { id: true, name: true, sport: true, start_date: true, time_of_day: true, description: true },
  })
  if (!eventos.length) return NextResponse.json({ ok: true, recordatorios: 0 })

  // Recordatorios ya enviados (para no repetir).
  const previos = await prisma.agent_memory.findMany({
    where: { agent: 'eventos', type: 'recordatorio' },
    orderBy: { created_at: 'desc' },
    take: 200,
    select: { content: true },
  })
  const yaRecordados = new Set(
    previos.map((m) => { try { return (JSON.parse(m.content) as { eventId?: string }).eventId } catch { return '' } }),
  )

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const results: { event: string; dias: number }[] = []
  for (const ev of eventos) {
    if (!ev.start_date || yaRecordados.has(ev.id)) continue
    const dias = Math.max(0, Math.round((ev.start_date.getTime() - hoy.getTime()) / 86_400_000))
    const cuando = `en ${dias} día${dias === 1 ? '' : 's'}${ev.time_of_day ? ` · ${ev.time_of_day}` : ''}`

    // Dispara contenido de recordatorio (usa el flujo de contenido existente).
    fetch(`${baseUrl}/api/agents/contenido`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trend: {
          topic: `Recordatorio: ${ev.name}`,
          angle: `Falta poco para "${ev.name}" (${cuando}) en Bahía Social Sports Club. Genera contenido que lo recuerde e invite a asistir/participar. ${ev.description ?? ''}`,
        },
      }),
    }).catch(() => null)

    // Avisa al admin por WhatsApp.
    if (process.env.ADMIN_PHONE) {
      sendText(process.env.ADMIN_PHONE, `⏰ Recordatorio: *${ev.name}* es ${cuando}. Ya generé contenido para promoverlo.`).catch(() => {})
    }

    // Marca como recordado (una sola vez por evento).
    await prisma.agent_memory.create({
      data: { agent: 'eventos', type: 'recordatorio', content: JSON.stringify({ eventId: ev.id, name: ev.name, dias, ts: Date.now() }), outcome: 'neutro' },
    }).catch(() => null)

    results.push({ event: ev.name, dias })
  }

  return NextResponse.json({ ok: true, recordatorios: results.length, results, ran: new Date().toISOString() })
}
