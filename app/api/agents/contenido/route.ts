export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ask } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp'
import { getClubContext, contextToPrompt, type ClubEvent } from '@/lib/context'

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

  // Obtener contexto compartido del club + assets específicos en paralelo
  const instalacion = idea?.instalacion ?? null
  const [ctx, availableAssets] = await Promise.all([
    getClubContext({ agents: ['contenido'], days: 14 }),
    fetchBestAssets(instalacion),
  ])
  const upcomingEvents = ctx.upcomingEvents

  // Decidir formato basado en assets disponibles y tendencia
  const format = decideFormat(idea, availableAssets)

  const sharedContext = contextToPrompt({ ...ctx, upcomingEvents: [] }) // eventos ya van en buildContexto
  const contexto = buildContexto(idea, strategy, trend, upcomingEvents, availableAssets, format, sharedContext)

  let creative: { id: string } | null = null
  let carousel: Carousel | null = null
  let reelBrief: string | null = null
  let aiScore: number | null = null

  if (format === 'Reel') {
    reelBrief = await generateReelBrief(contexto, idea, upcomingEvents)
    aiScore = await checkAiScore(reelBrief)
    const { data } = await supabase
      .from('creatives')
      .insert({ type: 'reel_brief', content: { idea, trend, reelBrief, availableAssets, aiScore }, status: 'borrador' })
      .select().single()
    creative = data
  } else {
    carousel = await generateCarousel(contexto, idea)
    if (!carousel) return NextResponse.json({ error: 'Error generando carousel' }, { status: 500 })
    const allCopy = carousel.slides.map(s => `${s.headline}. ${s.body}`).join(' ')
    aiScore = await checkAiScore(allCopy)
    const { data } = await supabase
      .from('creatives')
      .insert({ type: 'carrusel', content: { idea, trend, carousel, availableAssets, aiScore }, status: 'borrador' })
      .select().single()
    creative = data
  }

  await notifyAdmin({ carousel, reelBrief, idea, trend, availableAssets, upcomingEvents, format, creativeId: creative?.id, aiScore })

  return NextResponse.json({ creativeId: creative?.id, format, carousel, reelBrief, aiScore })
}

// ─── Consultas a Supabase ─────────────────────────────────────────────────────

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
  sharedContext = '',
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

  if (sharedContext) {
    lines.push('', sharedContext)
  }

  return lines.join('\n')
}

// ─── Generación de contenido ──────────────────────────────────────────────────

async function generateCarousel(contexto: string, idea: ContentIdea | null): Promise<Carousel | null> {
  const hookInstruction = idea
    ? `Usa EXACTAMENTE este hook para el slide 1: "${idea.hook.text}" — agrega "Desliza →" al final del body.`
    : 'Crea un hook que detenga el scroll: pregunta directa, afirmación con número o promesa concreta. Termina el body con "Desliza →".'

  const raw = await ask(
    `Eres el creador de contenido de Bahía Social Sports Club (club deportivo premium en Nuevo Vallarta, Riviera Nayarit).
Crea un carrusel de Instagram de 7 slides basado en el briefing.

ESTRUCTURA (7 slides — no negociable):
• Slide 1 — HOOK: Para el scroll. ${hookInstruction}
• Slide 2 — CONTEXTO: Por qué esto importa. Plantea el problema o el deseo del lector.
• Slides 3-6 — VALOR: Un solo punto por slide, numerado (01 02 03 04). Una idea, no dos.
• Slide 7 — CTA: Acción clara y directa. Ej: "Agenda tu visita", "Prueba un Day Pass este finde", "8 canchas te esperan".

REGLAS DE COPY (sin excepción):
- Tutéa al lector: "tú", "tu cancha", "tu nivel", "te lo mereces"
- Máximo 30 palabras por body de slide
- Sé específico: no "excelentes instalaciones" → "8 canchas de pádel + 8 de pickleball + alberca olímpica"
- Sin palabras de relleno: "fundamental", "crucial", "sin duda", "de hecho", "en definitiva", "aprovecha al máximo"
- Varía el ritmo: mezcla frases cortas con frases un poco más largas. Que no todos suenen igual.
- Menciona eventos próximos con nombre y fecha si son relevantes para el tema
- Sin emojis en los slides

FORMATO: Instagram 1080×1350 px (4:5) — más visibilidad en el feed que cuadrado.

Devuelve SOLO el JSON sin markdown, con exactamente 7 slides:
{"caption":"texto con hashtags (máx 150 chars, español natural)","slides":[{"slide":1,"headline":"string (máx 7 palabras, impacto)","body":"string (máx 30 palabras)"},{"slide":2,"headline":"string","body":"string"},{"slide":3,"headline":"string","body":"string"},{"slide":4,"headline":"string","body":"string"},{"slide":5,"headline":"string","body":"string"},{"slide":6,"headline":"string","body":"string"},{"slide":7,"headline":"string","body":"string"}]}`,
    [{ role: 'user', content: contexto }],
    1500,
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
    ? `Eventos próximos que puedes usar: ${events.map(e => e.name).join(', ')}.`
    : ''

  return ask(
    `Eres director de contenido de Bahía Social Sports Club (club premium en Nuevo Vallarta).
La persona que recibe este brief maneja el club — no es camarógrafo, pero tiene buen ojo y ganas.
Los Reels del club son recorridos de instalaciones, ambiente real, momentos de partidos, lifestyle de fin de semana. Sin trends de baile ni challenges.
${eventNote}

Escribe el brief como si se lo dijeras en persona. Directo, sin relleno, que lo pueda ejecutar hoy.

1. LA IDEA (1 línea — qué historia cuenta, por qué alguien lo vería completo)
2. LAS TOMAS (3-5 tomas específicas: desde dónde, qué aparece en cuadro, cuántos segundos)
3. EL AUDIO (ambiente del club, música energética, música suave — sé específico)
4. LOS PRIMEROS 3 SEGUNDOS (qué tiene que aparecer para que no deslicen)
5. CAPTION + hashtags

"Graba la alberca desde la esquina norte al atardecer" es útil. "Captura la esencia del club" no lo es.`,
    [{ role: 'user', content: contexto + (idea ? `\nIdea: ${idea.title}` : '') }],
    1000,
  )
}

// ─── Quality check: detect AI patterns ───────────────────────────────────────

async function checkAiScore(text: string): Promise<number | null> {
  const key = process.env.HUMANIZERAI_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://humanizerai.com/api/v1/detect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) return null
    const json = await res.json() as { score?: number }
    return json.score ?? null
  } catch {
    return null
  }
}

// ─── Notificación al admin ────────────────────────────────────────────────────

async function notifyAdmin({
  carousel, reelBrief, idea, trend, availableAssets, upcomingEvents, format, creativeId, aiScore,
}: {
  carousel: Carousel | null
  reelBrief: string | null
  idea: ContentIdea | null
  trend: { topic: string; angle: string } | null
  availableAssets: ClubAsset[]
  upcomingEvents: ClubEvent[]
  format: string
  creativeId: string | undefined
  aiScore: number | null
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

  if (aiScore !== null) {
    const label = aiScore >= 70 ? '✅ natural' : aiScore >= 50 ? '⚠️ revisar tono' : '🔴 suena a IA'
    lines.push(``, `🤖 *Naturalidad del copy:* ${aiScore}/100 — ${label}`)
  }

  lines.push(``, `ID: \`${creativeId ?? 'sin id'}\``)

  await sendText(process.env.ADMIN_PHONE!, lines.filter(l => l !== undefined).join('\n'))
}
