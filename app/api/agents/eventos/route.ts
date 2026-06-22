export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runAgent } from '@/lib/agents/orchestrator'
import { ask } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp'
import { getClubContext } from '@/lib/context'
// POST /api/agents/eventos
// Recibe texto libre del admin (vía WhatsApp) describiendo un evento,
// lo parsea con Claude, guarda en club_events y dispara el agente de contenido.
// GET /api/agents/eventos → calendario/histórico ordenado (recurrentes · próximos · pasados)
export async function GET() {
  const rows = await prisma.club_events.findMany({
    orderBy: [{ start_date: 'asc' }],
    select: {
      id: true, name: true, type: true, sport: true, recurrence: true, time_of_day: true,
      start_date: true, end_date: true, description: true, content_potential: true, active: true,
    },
  })
  const hoy = new Date().toISOString().split('T')[0]
  const norm = rows.map(r => ({
    id: r.id, name: r.name, type: r.type ?? 'especial', sport: r.sport, recurrence: r.recurrence,
    time_of_day: r.time_of_day,
    start_date: r.start_date ? r.start_date.toISOString().split('T')[0] : null,
    end_date: r.end_date ? r.end_date.toISOString().split('T')[0] : null,
    description: r.description, content_potential: r.content_potential ?? 5, active: r.active ?? true,
  }))

  const recurrentes = norm.filter(e => e.recurrence)
  const conFecha = norm.filter(e => !e.recurrence && e.start_date)
  const sinFecha = norm.filter(e => !e.recurrence && !e.start_date)
  const proximos = conFecha.filter(e => (e.start_date as string) >= hoy)
  const pasados = conFecha.filter(e => (e.start_date as string) < hoy).reverse() // más reciente primero

  return NextResponse.json({ recurrentes, proximos, pasados, sinFecha, total: norm.length })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { message } = body

  // Modo PÓSTER: genera el contenido del póster del evento (se renderiza/exporta en el dashboard)
  if (body.mode === 'poster') {
    return generarPoster(String(message ?? ''), String(body.instructions ?? ''))
  }

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

// ─── Póster del evento (diseño branded exportable; sin IA ni Canva) ───────────
// Usa fotos REALES del club según el deporte. El póster se arma y exporta en el
// dashboard a partir de este contenido.
const PHOTO_BY_SPORT: { match: string[]; photo: string }[] = [
  { match: ['pickle'], photo: '/assets/pickleball-lifestyle.jpg' },
  { match: ['padel', 'pádel', 'paddle'], photo: '/assets/pickleball-01.jpg' },
  { match: ['tenis', 'tennis'], photo: '/assets/cancha-tenis-arcilla.jpg' },
  { match: ['natac', 'alberca', 'nado', 'aqua', 'swim', 'pool'], photo: '/assets/alberca-01.jpg' },
  { match: ['gym', 'funcional', 'fuerza', 'spinning', 'yoga', 'pilates', 'cross'], photo: '/assets/gym.png' },
]
function photoForSport(hint: string): string {
  const s = hint.toLowerCase()
  for (const { match, photo } of PHOTO_BY_SPORT) if (match.some(m => s.includes(m))) return photo
  return '/assets/alberca-restaurante.png' // ambiente premium del club por defecto
}

type PosterSpec = {
  title: string
  subtitle: string
  dateLine: string
  location: string
  bullets: string[]
  cta: string
  sport: string
}

async function generarPoster(message: string, instructions: string) {
  if (!message.trim()) {
    return NextResponse.json({ error: 'Se requiere la info del evento' }, { status: 400 })
  }

  // Memoria / entrenamiento: instrucciones previas del admin para pósters
  const prev = await prisma.agent_memory.findMany({
    where: { agent: 'eventos', type: 'poster' },
    orderBy: { created_at: 'desc' },
    take: 8,
    select: { content: true },
  })
  const learned = prev
    .map(p => { try { return (JSON.parse(p.content) as { instructions?: string }).instructions } catch { return '' } })
    .filter((x): x is string => !!x && x.trim().length > 2)
  const trainingNote = learned.length
    ? `\nPREFERENCIAS APRENDIDAS del admin (aplícalas salvo que contradigan la instrucción de este póster): ${learned.slice(0, 5).join(' · ')}`
    : ''

  const raw = await ask(
    `Eres el diseñador de pósters de eventos de Bahía Social Sports Club (club deportivo-social premium en Nuevo Vallarta, Nayarit). Genera el CONTENIDO de un póster para redes a partir de la info del evento. Impactante, conciso y aspiracional premium.${trainingNote}
Devuelve SOLO este JSON, sin markdown ni texto extra:
{"title":"nombre del evento, corto e impactante (máx 6 palabras)","subtitle":"una línea de gancho","dateLine":"fecha y hora legible (ej. Sáb 28 jun · 6:00 pm)","location":"lugar dentro del club","bullets":["3 datos clave muy cortos: precio, formato, premio, cupo, etc."],"cta":"llamado a la acción corto (ej. Inscríbete en recepción)","sport":"deporte principal en una palabra"}`,
    [{ role: 'user', content: `INFO DEL EVENTO:\n${message}${instructions ? `\n\nINSTRUCCIÓN DEL ADMIN PARA ESTE PÓSTER: ${instructions}` : ''}` }],
    900,
  )

  let spec: PosterSpec | null = null
  try {
    const s = raw.indexOf('{')
    const e = raw.lastIndexOf('}')
    if (s !== -1 && e !== -1) spec = JSON.parse(raw.slice(s, e + 1)) as PosterSpec
  } catch { /* JSON inválido */ }
  if (!spec || !spec.title) {
    return NextResponse.json({ error: 'No se pudo generar el póster — intenta con más detalle' }, { status: 502 })
  }

  const poster = {
    title: spec.title,
    subtitle: spec.subtitle ?? '',
    dateLine: spec.dateLine ?? '',
    location: spec.location ?? '',
    bullets: Array.isArray(spec.bullets) ? spec.bullets.slice(0, 4) : [],
    cta: spec.cta ?? '',
    sport: spec.sport ?? '',
    photo: photoForSport(spec.sport || message),
  }

  await prisma.agent_memory.create({
    data: { agent: 'eventos', type: 'poster', content: JSON.stringify({ poster, instructions }), outcome: 'neutro' },
  }).catch(() => {})

  return NextResponse.json({ poster })
}
