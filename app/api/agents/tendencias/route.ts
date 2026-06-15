export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ask } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  // Llamada manual desde la Secretaria o desde el cron
  const { notifyAdmin = true } = await req.json().catch(() => ({}))
  return runTendencias(notifyAdmin)
}

export async function GET() {
  // Llamada desde Vercel Cron
  return runTendencias(true)
}

async function runTendencias(notifyAdmin: boolean) {
  const keywords = ['padel', 'pickleball', 'tenis', 'natacion', 'gym', 'deporte familiar']
  const region = 'Riviera Nayarit Bahía de Banderas México'

  // 1. Perplexity — tendencias sociales de la zona
  const perplexityRes = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{
        role: 'user',
        content: `¿Qué temas de deportes, vida activa y lifestyle están tendencia esta semana en ${region}? Dame exactamente 5 temas concretos con su nivel de interés (alto/medio). Solo los temas, sin explicaciones largas.`,
      }],
    }),
  })
  const perplexityData = await perplexityRes.json()
  const socialTrends = perplexityData.choices?.[0]?.message?.content ?? ''

  // 2. Claude consolida y prioriza para Bahía
  const consolidated = await ask(
    `Eres el analista de tendencias de Bahía Social Sports Club (club deportivo premium en Nuevo Vallarta).
Dado el siguiente análisis de tendencias, selecciona los 3 temas MÁS relevantes para el club y devuelve SOLO un JSON array con este formato exacto:
[{"topic":"nombre del tema","score":85,"angle":"enfoque específico para Bahía"}]
No incluyas nada más en tu respuesta, solo el JSON.`,
    [{ role: 'user', content: `Tendencias detectadas:\n${socialTrends}\nKeywords de interés: ${keywords.join(', ')}` }]
  )

  let trends: { topic: string; score: number; angle: string }[] = []
  try {
    const clean = consolidated.replace(/```json|```/g, '').trim()
    trends = JSON.parse(clean)
  } catch {
    trends = [{ topic: 'deporte familiar', score: 70, angle: 'actividades para toda la familia en Bahía' }]
  }

  // 3. Guardar en Supabase
  await supabase.from('trends').insert(
    trends.map(t => ({ topic: t.topic, score: t.score, source: 'perplexity+claude', region }))
  )

  // 4. Disparar Agente de Contenido con la tendencia top
  const topTrend = trends[0]
  await fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/contenido`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trend: topTrend }),
  }).catch(() => {})

  // 5. Notificar al admin
  if (notifyAdmin) {
    const msg = `📡 *Tendencias de esta semana en Riviera Nayarit:*\n\n${trends.map((t, i) => `${i + 1}. *${t.topic}* (score: ${t.score})\n   → ${t.angle}`).join('\n\n')}\n\nEstoy generando contenido basado en "${topTrend.topic}" 🎨`
    await sendText(process.env.ADMIN_PHONE!, msg)
  }

  return NextResponse.json({ trends })
}
