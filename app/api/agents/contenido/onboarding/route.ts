export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { anthropic } from '@/lib/claude'

// POST /api/agents/contenido/onboarding
// Recibe una imagen (URL pública) o un asset ya en Supabase Storage,
// la analiza con Claude Vision y guarda el resultado en club_assets.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { url, source = 'manual' } = body

  if (!url) {
    return NextResponse.json({ error: 'Se requiere url de la imagen' }, { status: 400 })
  }

  const analysis = await analyzeAsset(url)
  if (!analysis) {
    return NextResponse.json({ error: 'Error analizando la imagen' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('club_assets')
    .insert({
      url,
      source,
      instalacion: analysis.instalacion,
      description: analysis.description,
      mood: analysis.mood,
      time_of_day: analysis.time_of_day,
      people: analysis.people,
      score_reel: analysis.score_reel,
      score_foto: analysis.score_foto,
      score_stories: analysis.score_stories,
      best_format: analysis.best_format,
      content_angles: analysis.content_angles,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ asset: data, analysis })
}

type AssetAnalysis = {
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
  why: string
}

async function analyzeAsset(imageUrl: string): Promise<AssetAnalysis | null> {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'url', url: imageUrl },
        },
        {
          type: 'text',
          text: `Eres el estratega de contenido de Bahía Social Sports Club, club deportivo premium en Nuevo Vallarta, Nayarit.
Analiza esta foto/imagen del club y devuelve SOLO el siguiente JSON sin markdown:

{
  "instalacion": "alberca|cancha_padel|cancha_tenis|cancha_pickleball|gym|vestidores|lago|restaurante|area_social|exterior|otro",
  "description": "qué se ve exactamente en la imagen (1-2 oraciones)",
  "mood": "emoción principal que transmite (ej: energía, relajación, familia, competencia, lujo, naturaleza)",
  "time_of_day": "mañana|tarde|atardecer|noche|interior",
  "people": true o false (¿hay personas en la imagen?),
  "score_reel": número del 1 al 10 (potencial para Reel de Instagram),
  "score_foto": número del 1 al 10 (potencial para foto o carrusel),
  "score_stories": número del 1 al 10 (potencial para Stories),
  "best_format": "Reel|Carrusel|Foto|Stories",
  "content_angles": ["ángulo 1", "ángulo 2", "ángulo 3"] (máx 3 ideas de contenido que funcionen con esta imagen),
  "why": "por qué tiene ese puntaje — qué la hace fuerte o débil para redes (1 oración)"
}

Criterios de scoring para un club premium:
- Alto score_reel (8-10): movimiento implícito, ambiente, atardecer, personas disfrutando, instalaciones icónicas
- Alto score_foto (8-10): composición clara, colores del club (verde, azul, dorado), instalación en buen estado, luz natural
- Bajo score (<5): imagen borrosa, mal encuadre, instalación vacía sin contexto, luz artificial plana`,
        },
      ],
    }],
  })

  const textBlock = res.content.find(b => b.type === 'text')
  if (!textBlock || !('text' in textBlock)) return null

  try {
    const raw = textBlock.text
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) return null
    return JSON.parse(raw.slice(start, end + 1)) as AssetAnalysis
  } catch {
    return null
  }
}
