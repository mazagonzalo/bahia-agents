import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ask } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  const { trend } = await req.json()

  // 1. Claude genera el concepto del carrusel
  const carouselJson = await ask(
    `Eres el creador de contenido de Bahía Social Sports Club (club deportivo premium en Nuevo Vallarta, Riviera Nayarit).
Crea un carrusel de Instagram de 6 slides basado en la tendencia indicada.
Devuelve SOLO un JSON con este formato exacto:
{
  "caption": "texto del caption con hashtags (máx 150 caracteres + 10 hashtags relevantes)",
  "slides": [
    {"slide": 1, "headline": "título impactante", "body": "texto corto (máx 12 palabras)"},
    ...6 slides en total...
  ]
}
Slide 1 = portada impactante. Slides 2-5 = contenido/valor. Slide 6 = CTA ("Visítanos" / "Únete").
Usa el tono de Bahía: aspiracional, familiar, deportivo, premium pero cercano.`,
    [{ role: 'user', content: `Tendencia: ${trend.topic}\nÁngulo: ${trend.angle}` }]
  )

  let carousel: { caption: string; slides: { slide: number; headline: string; body: string }[] }
  try {
    carousel = JSON.parse(carouselJson)
  } catch {
    return NextResponse.json({ error: 'Error generando carousel' }, { status: 500 })
  }

  // 2. Guardar creativo en Supabase como borrador
  const { data: creative } = await supabase
    .from('creatives')
    .insert({
      type: 'carrusel',
      content: { trend, carousel },
      status: 'borrador',
    })
    .select()
    .single()

  // 3. Notificar al admin con el contenido para aprobación
  const preview = `🎨 *Carrusel listo para aprobar*\n\nTendencia: *${trend.topic}*\nÁngulo: ${trend.angle}\n\n*Slides:*\n${carousel.slides.map(s => `${s.slide}. ${s.headline}`).join('\n')}\n\n*Caption:*\n${carousel.caption}\n\n¿Apruebo y publico? Responde *sí* para publicar en Instagram.`

  await sendText(process.env.ADMIN_PHONE!, preview)

  return NextResponse.json({ creativeId: creative?.id, carousel })
}
