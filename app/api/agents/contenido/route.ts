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

type Slide = { slide: number; headline: string; body: string }
type Carousel = { caption: string; slides: Slide[] }

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Acepta el payload rico de tendencias { idea, strategy, report }
  // o el formato legacy { trend }
  const idea: ContentIdea | null = body.idea ?? null
  const strategy: Strategy | null = body.strategy ?? null
  const trend = body.trend ?? null

  if (!idea && !trend) {
    return NextResponse.json({ error: 'Se requiere idea o trend' }, { status: 400 })
  }

  const contexto = buildContexto(idea, strategy, trend)
  const carousel = await generateCarousel(contexto, idea)
  if (!carousel) {
    return NextResponse.json({ error: 'Error generando carousel' }, { status: 500 })
  }

  const { data: creative } = await supabase
    .from('creatives')
    .insert({
      type: 'carrusel',
      content: { idea, trend, carousel },
      status: 'borrador',
    })
    .select()
    .single()

  await notifyAdmin(carousel, idea, trend, creative?.id)

  return NextResponse.json({ creativeId: creative?.id, carousel })
}

function buildContexto(idea: ContentIdea | null, strategy: Strategy | null, trend: { topic: string; angle: string } | null): string {
  if (idea) {
    const lines = [
      `Título: ${idea.title}`,
      `Formato: ${idea.format}`,
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
    ]
    if (strategy) {
      lines.push(
        ``,
        `Estrategia del período:`,
        `  Segmento principal: ${strategy.primarySegment}`,
        `  Mensaje central: "${strategy.message}"`,
        `  Evitar: ${strategy.avoid}`,
      )
    }
    return lines.join('\n')
  }
  return `Tendencia: ${trend!.topic}\nÁngulo: ${trend!.angle}`
}

async function generateCarousel(contexto: string, idea: ContentIdea | null): Promise<Carousel | null> {
  const hookInstruction = idea
    ? `Usa EXACTAMENTE este hook para el slide 1: "${idea.hook.text}"`
    : 'Crea un hook impactante para el slide 1.'

  const raw = await ask(
    `Eres el creador de contenido de Bahía Social Sports Club (club deportivo premium en Nuevo Vallarta, Riviera Nayarit).
Crea un carrusel de Instagram de 6 slides basado en el briefing.
${hookInstruction}
Slides 2-5: desarrolla el contenido con valor real (datos, beneficios, momentos del club).
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

async function notifyAdmin(
  carousel: Carousel,
  idea: ContentIdea | null,
  trend: { topic: string; angle: string } | null,
  creativeId: string | undefined,
) {
  const titulo = idea?.title ?? trend?.topic ?? 'Nuevo carrusel'
  const segmento = idea?.targetSegment ?? '—'
  const formato = idea?.format ?? 'Carrusel'
  const hashtags = idea?.hashtags?.join(' ') ?? ''

  const slidesText = carousel.slides
    .map(s => `${s.slide}. *${s.headline}*\n   ${s.body}`)
    .join('\n\n')

  const msg = [
    `🎨 *Carrusel listo para aprobar*`,
    ``,
    `*${titulo}* · ${formato}`,
    `Segmento: ${segmento}`,
    ``,
    `*Slides:*`,
    slidesText,
    ``,
    `*Caption:*`,
    carousel.caption,
    hashtags ? `\n${hashtags}` : '',
    ``,
    `ID: \`${creativeId ?? 'sin id'}\``,
    `¿Publico en Instagram? Responde *sí* para aprobar.`,
  ].filter(Boolean).join('\n')

  await sendText(process.env.ADMIN_PHONE!, msg)
}
