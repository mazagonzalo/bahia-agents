export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ask } from '@/lib/claude'
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

  const { data: saved, error } = await supabase
    .from('club_events')
    .insert(event)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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
    ? `\nEventos ya registrados (evita duplicados): ${existingEvents.map(e => `"${e.name}"${e.start_date ? ` (${e.start_date})` : ''}`).join(', ')}`
    : ''

  const raw = await ask(
    `Eres el asistente de Bahía Social Sports Club. El admin acaba de describir un evento del club.
Extrae la información y devuelve SOLO el siguiente JSON sin markdown (hoy es ${today}).${existingNote}

{
  "name": "nombre corto del evento",
  "type": "especial o recurrente",
  "sport": "deporte principal o null (pádel, tenis, pickleball, natación, gym, general, etc.)",
  "recurrence": "si es recurrente: con qué frecuencia en palabras (ej: 'todos los sábados', 'cada martes') — null si es evento único",
  "time_of_day": "hora o rango de hora (ej: '9:00 am', '6-8 pm') o null si no se especifica",
  "start_date": "YYYY-MM-DD de inicio — null si no se especifica o si es recurrente sin fecha fija",
  "end_date": "YYYY-MM-DD de cierre — null si no aplica",
  "description": "descripción completa del evento tal como la entendiste (1-2 oraciones)",
  "content_potential": número del 1 al 10 (qué tan buen contenido para redes genera este evento),
  "active": true
}

Criterios de content_potential:
- 8-10: torneos, clases especiales, eventos sociales, inauguraciones
- 5-7: ligas regulares, clínicas, actividades de temporada
- 1-4: mantenimiento, avisos internos, cambios de horario sin actividad

Si el mensaje no describe ningún evento del club, devuelve null.`,
    [{ role: 'user', content: message }],
    600,
  )

  try {
    if (raw.trim() === 'null') return null
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) return null
    return JSON.parse(raw.slice(start, end + 1)) as ParsedEvent
  } catch {
    return null
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

  await sendText(
    process.env.ADMIN_PHONE!,
    lines.filter(Boolean).join('\n'),
  )
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
