export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ask } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp'

type ContentIdea = {
  title: string
  format: string
  hook: { text: string; pattern: string; triggerWords: string[] }
  copyStructure: { framework: string; step1: string; step2: string; step3: string; cta: string }
  platforms: { reel: string; tiktok: string; stories: string; carrusel: string }
  instalacion: string
  targetSegment: string
  hashtags: string[]
  trendConnection: string
  urgency: number
}

type Strategy = {
  primarySegment: string
  secondarySegment: string
  message: string
  avoid: string
}

type ClubAsset = {
  id: string
  url: string
  instalacion: string
  description: string
  mood: string
  time_of_day: string
  people: boolean
  score_reel: number
  score_foto: number
  score_stories: number
  best_format: string
  content_angles: string[]
}

type ClubEvent = {
  id: string
  name: string
  type: string
  sport: string
  recurrence: string | null
  time_of_day: string
  start_date: string | null
  description: string
  content_potential: number
}

type Slide = { slide: number; headline: string; body: string }
type Carousel = { caption: string; slides: Slide[] }

export async function POST(req: NextRequest) {
  const body = await req.json()

  const idea: ContentIdea | null = body.idea ?? null
  const strategy: Strategy | null = body.strategy ?? null
  const trend = body.trend ?? null

  if (!idea && !trend) {
    return NextResponse.json({ error: 'Se requiere idea o trend' }, { status: 400 })
  }

  // Consultar eventos próximos y assets disponibles en paralelo
  const instalacion = idea?.instalacion ?? null
  const [upcomingEvents, availableAssets] = await Promise.all([
    fetchUpcomingEvents(),
    fetchBestAssets(instalacion),
  ])

  // Decidir formato basado en assets disponibles y tendencia
  const format = decideFormat(idea, availableAssets)

  const contexto = buildContexto(idea, strategy, trend, upcomingEvents, availableAssets, format)

  let creative: { id: string } | null = null
  let carousel: Carousel | null = null
  let reelBrief: string | null = null

  if (format === 'Reel') {
    reelBrief = await generateReelBrief(contexto, idea, upcomingEvents)
    const { data } = await supabase
      .from('creatives')
      .insert({ type: 'reel_brief', content: { idea, trend, reelBrief, availableAssets }, status: 'borrador' })
      .select().single()
    creative = data
  } else {
    carousel = await generateCarousel(contexto, idea)
    if (!carousel) return NextResponse.json({ error: 'Error generando carousel' }, { status: 500 })
    const { data } = await supabase
      .from('creatives')
      .insert({ type: 'carrusel', content: { idea, trend, carousel, availableAssets }, status: 'borrador' })
      .select().single()
    creative = data
  }

  await notifyAdmin({ carousel, reelBrief, idea, trend, availableAssets, upcomingEvents, format, creativeId: creative?.id })

  return NextResponse.json({ creativeId: creative?.id, format, carousel, reelBrief })
}

// ─── Consultas a Supabase ─────────────────────────────────────────────────────

async function fetchUpcomingEvents(): Promise<ClubEvent[]> {
  const today = new Date()
  const in7days = new Date(today)
  in7days.setDate(today.getDate() + 7)
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const { data } = await supabase
    .from('club_events')
    .select('*')
    .eq('active', true)
    .or(`type.eq.recurrente,and(type.eq.especial,start_date.gte.${fmt(today)},start_date.lte.${fmt(in7days)})`)
    .order('content_potential', { ascending: false })
    .limit(5)

  return (data ?? []) as ClubEvent[]
}

async function fetchBestAssets(instalacion: string | null): Promise<ClubAsset[]> {
  let query = supabase
    .from('club_assets')
    .select('*')
    .order('used_count', { ascending: true }) // prioriza los menos usados

  if (instalacion) {
    query = query.eq('instalacion', instalacion)
  }

  const { data } = await query.limit(6)
  return (data ?? []) as ClubAsset[]
}

// ─── Lógica de formato ────────────────────────────────────────────────────────

function decideFormat(idea: ContentIdea | null, assets: ClubAsset[]): 'Reel' | 'Carrusel' | 'Foto' {
  // Si la idea ya especifica formato, respetarlo
  if (idea?.format === 'Reel') return 'Reel'
  if (idea?.format === 'Carrusel') return 'Carrusel'

  // Si hay assets con alto score_reel y el tema es de ambiente/lifestyle → Reel
  const topReelScore = Math.max(0, ...assets.map(a => a.score_reel ?? 0))
  if (topReelScore >= 8) return 'Reel'

  // Default: carrusel (funciona sin assets físicos, solo copy)
  return 'Carrusel'
}

// ─── Construcción de contexto ─────────────────────────────────────────────────

function buildContexto(
  idea: ContentIdea | null,
  strategy: Strategy | null,
  trend: { topic: string; angle: string } | null,
  events: ClubEvent[],
  assets: ClubAsset[],
  format: string,
): string {
  const lines: string[] = []

  if (idea) {
    lines.push(
      `Título: ${idea.title}`,
      `Formato decidido: ${format}`,
      `Instalación destacada: ${idea.instalacion}`,
      `Segmento objetivo: ${idea.targetSegment}`,
      `Hook sugerido: "${idea.hook.text}" (patrón: ${idea.hook.pattern})`,
      `Estructura del copy (${idea.copyStructure.framework}):`,
      `  Paso 1: ${idea.copyStructure.step1}`,
      `  Paso 2: ${idea.copyStructure.step2}`,
      `  Paso 3: ${idea.copyStructure.step3}`,
      `  CTA: ${idea.copyStructure.cta}`,
      `Conexión con tendencia: ${idea.trendConnection}`,
      `Hashtags: ${idea.hashtags.join(' ')}`,
    )
  } else if (trend) {
    lines.push(`Tendencia: ${trend.topic}`, `Ángulo: ${trend.angle}`)
  }

  if (strategy) {
    lines.push(``, `Estrategia: ${strategy.message}`, `Evitar: ${strategy.avoid}`)
  }

  if (events.length) {
    lines.push(``, `Eventos próximos del club (úsalos si son relevantes):`)
    events.forEach(e => {
      const cuando = e.recurrence ? `cada ${e.recurrence}` : e.start_date ?? ''
      lines.push(`  - ${e.name} (${e.sport}, ${cuando} ${e.time_of_day}) — potencial ${e.content_potential}/10`)
    })
  }

  if (assets.length) {
    lines.push(``, `Assets disponibles del club:`)
    assets.forEach(a => {
      lines.push(`  - ${a.instalacion}: ${a.description} | mood: ${a.mood} | mejor para: ${a.best_format} (reel:${a.score_reel} foto:${a.score_foto})`)
    })
  }

  return lines.join('\n')
}

// ─── Generación de contenido ──────────────────────────────────────────────────

async function generateCarousel(contexto: string, idea: ContentIdea | null): Promise<Carousel | null> {
  const hookInstruction = idea
    ? `Usa EXACTAMENTE este hook para el slide 1: "${idea.hook.text}"`
    : 'Crea un hook impactante para el slide 1.'

  const raw = await ask(
    `Eres el creador de contenido de Bahía Social Sports Club (club deportivo premium en Nuevo Vallarta, Riviera Nayarit).
Crea un carrusel de Instagram de 6 slides basado en el briefing.
${hookInstruction}
Slides 2-5: desarrolla el contenido con valor real. Si hay eventos próximos relevantes, menciónalos.
Slide 6: CTA claro ("Agenda tu visita" / "Únete este mes" / "Day Pass $500").
Tono: aspiracional, familiar, deportivo — premium pero cercano. Sin emojis en los slides.
Devuelve SOLO el JSON sin markdown:
{"caption":"texto con hashtags (máx 150 chars)","slides":[{"slide":1,"headline":"string","body":"string (máx 12 palabras)"}]}`,
    [{ role: 'user', content: contexto }],
    1200,
  )

  try {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) return null
    return JSON.parse(raw.slice(start, end + 1))
  } catch {
    return null
  }
}

async function generateReelBrief(contexto: string, idea: ContentIdea | null, events: ClubEvent[]): Promise<string> {
  const eventNote = events.length
    ? `Eventos próximos que puedes integrar: ${events.map(e => e.name).join(', ')}.`
    : ''

  return ask(
    `Eres director de contenido de Bahía Social Sports Club (club premium en Nuevo Vallarta).
Tu trabajo: dar instrucciones exactas al admin para que grabe un Reel que pege en Instagram.
El club NO hace trends de baile ni challenges. Su contenido son recorridos de instalaciones,
ambiente del club, momentos reales de partidos y lifestyle premium.
${eventNote}
Escribe un brief de director claro y accionable. Incluye:
1. CONCEPTO (1 línea — qué historia cuenta este Reel)
2. TOMAS NECESARIAS (3-5 tomas específicas: ángulo, qué se ve, duración estimada)
3. AUDIO SUGERIDO (tipo de música o sonido ambiente)
4. HOOK de los primeros 3 segundos (qué debe verse para que no hagan scroll)
5. CAPTION + hashtags
Tono: director profesional pero accesible. El admin no es camarógrafo profesional.`,
    [{ role: 'user', content: contexto + (idea ? `\nIdea base: ${idea.title}` : '') }],
    1000,
  )
}

// ─── Notificación al admin ────────────────────────────────────────────────────

async function notifyAdmin({
  carousel, reelBrief, idea, trend, availableAssets, upcomingEvents, format, creativeId,
}: {
  carousel: Carousel | null
  reelBrief: string | null
  idea: ContentIdea | null
  trend: { topic: string; angle: string } | null
  availableAssets: ClubAsset[]
  upcomingEvents: ClubEvent[]
  format: string
  creativeId: string | undefined
}) {
  const titulo = idea?.title ?? trend?.topic ?? 'Nuevo contenido'
  const segmento = idea?.targetSegment ?? '—'

  const lines = [
    `🎨 *Brief de contenido listo*`,
    ``,
    `*${titulo}* · ${format}`,
    `Segmento: ${segmento}`,
  ]

  // Eventos próximos relevantes
  if (upcomingEvents.length) {
    lines.push(``, `📅 *Eventos próximos:*`)
    upcomingEvents.slice(0, 3).forEach(e => {
      const cuando = e.recurrence ? `cada ${e.recurrence}` : e.start_date ?? ''
      lines.push(`  • ${e.name} — ${cuando} ${e.time_of_day}`)
    })
  }

  if (format === 'Reel' && reelBrief) {
    lines.push(``, `🎬 *Brief de Reel:*`, reelBrief)

    // Pedir fotos/video si no hay assets
    if (availableAssets.length === 0) {
      lines.push(``, `📸 *Necesito material tuyo para esto.*`, `¿Tienes fotos o videos de ${idea?.instalacion ?? 'las instalaciones'}? Mándamelos aquí o dime qué tienes grabado.`)
    } else {
      lines.push(``, `✅ *Assets disponibles del club que puedes usar:*`)
      availableAssets.slice(0, 3).forEach(a => {
        lines.push(`  • ${a.instalacion} — ${a.description} (mejor para: ${a.best_format})`)
      })
      lines.push(`¿Tienes algo más reciente de esto? Mándalo aquí si quieres usarlo.`)
    }
  } else if (carousel) {
    const slidesText = carousel.slides
      .map(s => `${s.slide}. *${s.headline}*\n   ${s.body}`)
      .join('\n\n')
    lines.push(``, `*Slides:*`, slidesText, ``, `*Caption:*`, carousel.caption)

    if (availableAssets.length === 0) {
      lines.push(``, `📸 *Para las fotos del carrusel:*`)
      lines.push(`No tengo fotos de ${idea?.instalacion ?? 'esta área'} en mi biblioteca aún.`)
      lines.push(`¿Puedes mandarme 6 fotos de ${idea?.instalacion ?? 'las instalaciones'}? Idealmente una por slide.`)
    } else {
      lines.push(``, `✅ *Fotos sugeridas de mi biblioteca:*`)
      availableAssets.slice(0, 6).forEach((a, i) => {
        lines.push(`  ${i + 1}. ${a.description} (${a.mood})`)
      })
      lines.push(`¿Usamos estas o tienes algo más reciente?`)
    }
  }

  lines.push(``, `ID: \`${creativeId ?? 'sin id'}\``)

  await sendText(process.env.ADMIN_PHONE!, lines.filter(l => l !== undefined).join('\n'))
}
