export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { ask } from '@/lib/claude'
import { getClubContext, contextToPrompt } from '@/lib/context'

// GET /api/test/chain?topic=padel+femenino
// Simula el flujo completo tendencias → contenido sin guardar en Supabase ni mandar WhatsApp.
// Devuelve JSON con todo lo que el sistema generaría en producción.
export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get('topic') ?? 'pádel en Riviera Nayarit'
  const angle = req.nextUrl.searchParams.get('angle') ?? `Tendencia creciente en Bahía de Banderas. ¿Cómo se posiciona Bahía Social Sports Club?`

  // 1. Contexto real del club (misma función que usan todos los agentes)
  const ctx = await getClubContext({ days: 14 })
  const clubContext = contextToPrompt(ctx)

  const trend = { topic, angle }

  // 2. Decidir formato (sin assets reales → Carrusel por defecto en prueba)
  const format = 'Carrusel'

  // 3. Generar carousel (misma lógica que contenido, sin guardar ni notificar)
  const carousel = await generateCarousel(trend, clubContext)

  // 4. Simular qué le llegaría al admin
  const adminPreview = buildAdminPreview(carousel, trend, ctx.upcomingEvents, format)

  return NextResponse.json({
    _note: 'Simulación en seco — sin Supabase, sin WhatsApp',
    input: { topic, angle },
    clubContext: {
      trends: ctx.trends.length,
      upcomingEvents: ctx.upcomingEvents.map(e => e.name),
      reviews: ctx.reviews.length,
      memory: ctx.memory.length,
    },
    format,
    carousel,
    adminPreview,
  })
}

type Slide = { slide: number; headline: string; body: string }
type Carousel = { caption: string; slides: Slide[] } | null

async function generateCarousel(
  trend: { topic: string; angle: string },
  clubContext: string,
): Promise<Carousel> {
  const contexto = `Tendencia: ${trend.topic}\nÁngulo: ${trend.angle}\n\n${clubContext}`

  const raw = await ask(
    `Eres el creador de contenido de Bahía Social Sports Club (club deportivo premium en Nuevo Vallarta, Riviera Nayarit).
Crea un carrusel de Instagram de 7 slides basado en el briefing.

ESTRUCTURA (7 slides):
• Slide 1 — HOOK: Para el scroll. Termina el body con "Desliza →".
• Slide 2 — CONTEXTO: Por qué esto importa para el lector.
• Slides 3-6 — VALOR: Un punto por slide, numerado (01 02 03 04).
• Slide 7 — CTA: Acción directa ("Agenda tu visita", "Day Pass desde $500").

REGLAS: tutéa al lector, máx 30 palabras por body, sin palabras de relleno, sé específico.
Formato Instagram 1080×1350 (4:5). Sin emojis en slides.

Devuelve SOLO el JSON sin markdown, con exactamente 7 slides:
{"caption":"string (máx 150 chars)","slides":[{"slide":1,"headline":"string","body":"string"},...]}`,
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

function buildAdminPreview(
  carousel: Carousel,
  trend: { topic: string; angle: string },
  events: { name: string; recurrence: string | null; start_date: string | null; time_of_day: string | null }[],
  format: string,
): string {
  const lines = [
    `🎨 *Brief de contenido listo* [SIMULACIÓN]`,
    ``,
    `*${trend.topic}* · ${format}`,
  ]

  if (events.length) {
    lines.push(``, `📅 *Eventos próximos:*`)
    events.slice(0, 3).forEach(e => {
      const cuando = e.recurrence ? `cada ${e.recurrence}` : e.start_date ?? ''
      lines.push(`  • ${e.name} — ${cuando}${e.time_of_day ? ` ${e.time_of_day}` : ''}`)
    })
  }

  if (carousel) {
    const slidesText = carousel.slides
      .map(s => `${s.slide}. *${s.headline}*\n   ${s.body}`)
      .join('\n\n')
    lines.push(``, `*Slides:*`, slidesText, ``, `*Caption:*`, carousel.caption)
  }

  lines.push(``, `📸 No tengo fotos aún — mándame imágenes de las instalaciones para completar el brief.`)
  lines.push(``, `ID: \`[se asignaría en producción]\``)

  return lines.join('\n')
}
