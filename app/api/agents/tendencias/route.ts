export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ask } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  const { notifyAdmin = true } = await req.json().catch(() => ({}))
  return runTendencias(notifyAdmin)
}

export async function GET() {
  return runTendencias(true)
}

async function perplexityAsk(prompt: string): Promise<string> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sonar',
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

async function runTendencias(notifyAdmin: boolean) {
  const region = 'Riviera Nayarit Bahía de Banderas Puerto Vallarta México'
  const now = new Date()
  const mes = now.toLocaleString('es-MX', { month: 'long', year: 'numeric' })

  // 1. Perplexity — tendencias deportivas y lifestyle de la zona (en paralelo con estacionalidad)
  const [socialTrends, seasonalityRaw] = await Promise.all([
    perplexityAsk(
      `¿Qué temas de deportes, vida activa y lifestyle están en tendencia esta semana en ${region}? Dame exactamente 5 temas concretos con su nivel de interés (alto/medio). Solo los temas, sin explicaciones largas.`
    ),
    perplexityAsk(
      `Para ${mes} en Puerto Vallarta y Riviera Nayarit: ¿cuántos turistas llegan aproximadamente este mes? ¿De dónde vienen la mayoría (EUA, Canadá, México local)? ¿Qué perfil demográfico domina (familias, parejas, jóvenes, adultos mayores)? ¿Cuándo empiezan a irse? ¿Qué actividades deportivas o de bienestar buscan más? Responde en 5 a 7 oraciones concretas, datos específicos si los tienes.`
    ),
  ])

  // 2. Claude integra todo: tendencias + estacionalidad + estrategia de segmento
  const consolidated = await ask(
    `Eres el estratega de marketing de Bahía Social Sports Club (club deportivo premium en Nuevo Vallarta, Nayarit). El club tiene: 8 canchas de pádel techadas, 8 de pickleball, 3 de tenis dura, 3 de arcilla, alberca, gym, restaurante panorámico y vestidores premium. Membresías desde $1,800/mes hasta $6,500/mes.

Tu trabajo: integrar tendencias locales + contexto estacional del mes para definir qué comunicar, a quién y cuándo.

Devuelve SOLO este JSON (sin markdown, sin texto adicional):
{
  "trends": [
    {"topic": "nombre del tema", "score": 85, "angle": "enfoque concreto para Bahía"}
  ],
  "seasonality": {
    "touristFlow": "resumen en 1 oración del flujo de turistas este mes",
    "dominantProfile": "perfil que más llega este mes (ej: familias americanas de vacaciones)",
    "peakWindow": "cuándo están aquí y cuándo se van",
    "localMarket": "estado del mercado local residente este mes"
  },
  "strategy": {
    "primarySegment": "segmento al que atacar este mes (ej: Familias turistas de corta estadía)",
    "secondarySegment": "segmento secundario",
    "message": "el ángulo de comunicación que más resuena este mes en 1 oración",
    "avoid": "qué tipo de mensaje o segmento NO tiene sentido este mes y por qué"
  }
}`,
    [{
      role: 'user',
      content: `Tendencias detectadas esta semana:\n${socialTrends}\n\nContexto estacional de ${mes} en la zona:\n${seasonalityRaw}`,
    }]
  )

  type Trend = { topic: string; score: number; angle: string }
  type Analysis = {
    trends: Trend[]
    seasonality: { touristFlow: string; dominantProfile: string; peakWindow: string; localMarket: string }
    strategy: { primarySegment: string; secondarySegment: string; message: string; avoid: string }
  }

  let analysis: Analysis = {
    trends: [{ topic: 'deporte familiar', score: 70, angle: 'actividades para toda la familia en Bahía' }],
    seasonality: { touristFlow: '', dominantProfile: '', peakWindow: '', localMarket: '' },
    strategy: { primarySegment: '', secondarySegment: '', message: '', avoid: '' },
  }

  try {
    const clean = consolidated.replace(/```json|```/g, '').trim()
    analysis = JSON.parse(clean)
  } catch {
    // fallback ya definido arriba
  }

  // 3. Guardar tendencias en Supabase
  await supabase.from('trends').insert(
    analysis.trends.map(t => ({
      topic: t.topic,
      score: t.score,
      source: 'perplexity+claude',
      region,
    }))
  )

  // 4. Disparar Agente de Contenido con la tendencia top + contexto estratégico
  const topTrend = analysis.trends[0]
  await fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/contenido`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trend: topTrend, strategy: analysis.strategy }),
  }).catch(() => {})

  // 5. Notificar al admin con análisis completo
  if (notifyAdmin) {
    const { seasonality: s, strategy: st } = analysis
    const trendsText = analysis.trends
      .map((t, i) => `${i + 1}. *${t.topic}* (${t.score}/100)\n   → ${t.angle}`)
      .join('\n\n')

    const msg = [
      `📡 *Análisis semanal · ${mes}*`,
      '',
      `*Tendencias relevantes para Bahía:*\n${trendsText}`,
      '',
      `*Contexto del mes:*`,
      `• ${s.touristFlow}`,
      `• Perfil dominante: ${s.dominantProfile}`,
      `• Ventana: ${s.peakWindow}`,
      `• Mercado local: ${s.localMarket}`,
      '',
      `*Estrategia recomendada:*`,
      `• Atacar primero: ${st.primarySegment}`,
      `• Secundario: ${st.secondarySegment}`,
      `• Mensaje clave: "${st.message}"`,
      `• Evitar ahora: ${st.avoid}`,
      '',
      `Generando contenido basado en "${topTrend.topic}" 🎨`,
    ].join('\n')

    await sendText(process.env.ADMIN_PHONE!, msg)
  }

  return NextResponse.json(analysis)
}
