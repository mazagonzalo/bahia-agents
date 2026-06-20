export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runAgent } from '@/lib/agents/orchestrator'
import { sendText } from '@/lib/whatsapp'
import { getClubContext } from '@/lib/context'
// POST /api/agents/eventos
// Recibe texto libre del admin (vía WhatsApp) describiendo un evento,
// lo parsea con Claude, guarda en club_events y dispara el agente de contenido.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { message } = body

  if (!message) {
    return NextResponse.json({ error: 'Se requiere message' }, { status: 400 })
  }

  // Obtener eventos existentes para detectar duplicados
  const ctx = await getClubContext({ days: 30 })
  const event = await parseEvent(message, ctx.upcomingEvents)
  if (!event) {
    return NextResponse.json({ error: 'No pude entender el evento — intenta con más detalle' }, { status: 422 })
  }

  const row = await prisma.club_events.create({
    data: {
      name: event.name,
      type: event.type,
      sport: event.sport,
      recurrence: event.recurrence,
      time_of_day: event.time_of_day,
      start_date: event.start_date ? new Date(event.start_date) : null,
      end_date: event.end_date ? new Date(event.end_date) : null,
      description: event.description,
      content_potential: event.content_potential,
      active: event.active,
    },
  })

  // Normalizar fechas Date → 'YYYY-MM-DD' para preservar el shape original.
  const saved: ParsedEvent & { id: string } = {
    id: row.id,
    name: row.name,
    type: row.type ?? 'especial',
    sport: row.sport,
    recurrence: row.recurrence,
    time_of_day: row.time_of_day,
    start_date: row.start_date ? row.start_date.toISOString().split('T')[0] : null,
    end_date: row.end_date ? row.end_date.toISOString().split('T')[0] : null,
    description: row.description,
    content_potential: row.content_potential ?? 5,
    active: row.active ?? true,
  }

  await notifyAdmin(saved)

  // Dispara el agente de contenido con el evento como contexto principal
  triggerContenido(saved).catch(() => null)

  return NextResponse.json({ event: saved })
}

// ─── Parser de lenguaje natural ───────────────────────────────────────────────

type ParsedEvent = {
  name: string
  type: string
  sport: string | null
  recurrence: string | null
  time_of_day: string | null
  start_date: string | null
  end_date: string | null
  description: string | null
  content_potential: number
  active: boolean
}

async function parseEvent(message: string, existingEvents: { name: string; start_date: string | null }[] = []): Promise<ParsedEvent | null> {
  const today = new Date().toISOString().split('T')[0]
  const existingNote = existingEvents.length
    ? ` Eventos ya registrados (evita duplicados): ${existingEvents.map(e => `"${e.name}"${e.start_date ? ` (${e.start_date})` : ''}`).join(', ')}.`
    : ''

  // Parseo vía harness: registra AgentRunLog. El prompt sembrado EVENTOS emite el
  // JSON del evento; abstain ⇒ el mensaje no describe un evento.
  let pd: Record<string, unknown> | null = null
  try {
    const result = await runAgent(
      'EVENTOS',
      `Hoy es ${today}.${existingNote}\n\nMensaje del admin: ${message}`,
      { skipApproval: true, tags: ['eventos'] }
    )
    if (result.proposalData.proposalType !== 'abstain') pd = result.proposalData
  } catch {
    return null
  }
  if (!pd || typeof pd.name !== 'string' || !pd.name) return null

  return {
    name: String(pd.name),
    type: String(pd.type ?? 'especial'),
    sport: typeof pd.sport === 'string' ? pd.sport : null,
    recurrence: typeof pd.recurrence === 'string' ? pd.recurrence : null,
    time_of_day: typeof pd.time_of_day === 'string' ? pd.time_of_day : null,
    start_date: typeof pd.start_date === 'string' ? pd.start_date : null,
    end_date: typeof pd.end_date === 'string' ? pd.end_date : null,
    description: typeof pd.description === 'string' ? pd.description : null,
    content_potential: typeof pd.content_potential === 'number' ? pd.content_potential : 5,
    active: pd.active !== false,
  }
}

// ─── Notificación de confirmación al admin ────────────────────────────────────

async function notifyAdmin(event: ParsedEvent & { id: string }) {
  const cuando = event.recurrence
    ? `Recurrente: ${event.recurrence}`
    : event.start_date ?? 'Sin fecha definida'

  const lines = [
    `✅ *Evento registrado*`,
    ``,
    `*${event.name}*`,
    event.sport ? `Deporte: ${event.sport}` : null,
    `Cuándo: ${cuando}${event.time_of_day ? ` · ${event.time_of_day}` : ''}`,
    event.description ? `Descripción: ${event.description}` : null,
    ``,
    `📱 Generando contenido para redes... te lo mando en un momento.`,
  ]

  if (process.env.ADMIN_PHONE) {
    try {
      await sendText(process.env.ADMIN_PHONE, lines.filter(Boolean).join('\n'))
    } catch (e) {
      console.error('[eventos] sendText falló (se ignora):', e instanceof Error ? e.message : e)
    }
  }
}

// ─── Disparo del agente de contenido ─────────────────────────────────────────

async function triggerContenido(event: ParsedEvent & { id: string }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  const cuando = event.recurrence
    ? `Recurrente: ${event.recurrence}`
    : event.start_date ?? ''

  const trend = {
    topic: event.name,
    angle: `Evento próximo en Bahía Social Sports Club: ${event.description ?? event.name}. ${cuando}${event.time_of_day ? ` a las ${event.time_of_day}` : ''}. Genera contenido que invite a la comunidad a participar.`,
  }

  await fetch(`${baseUrl}/api/agents/contenido`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trend }),
  })
}
