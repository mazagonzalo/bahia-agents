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

  // 4 consultas a Perplexity en paralelo
  const [socialTrends, seasonalityRaw, hashtagsRaw, viralPatternsRaw] = await Promise.all([
    perplexityAsk(
      `¿Qué temas de deportes, vida activa y lifestyle están en tendencia esta semana en ${region}? Dame exactamente 5 temas concretos con su nivel de interés (alto/medio). Solo los temas, sin explicaciones largas.`
    ),
    perplexityAsk(
      `Para ${mes} en Puerto Vallarta y Riviera Nayarit: ¿cuántos turistas llegan aproximadamente este mes? ¿De dónde vienen la mayoría (EUA, Canadá, México local)? ¿Qué perfil demográfico domina (familias, parejas, jóvenes, adultos mayores)? ¿Cuándo empiezan a irse? ¿Qué actividades deportivas o de bienestar buscan más? Responde en 5 a 7 oraciones concretas, datos específicos si los tienes.`
    ),
    perplexityAsk(
      `¿Cuáles son los hashtags más efectivos en este momento en Instagram y TikTok para contenido de pádel, pickleball, tenis, gym, natación y estilo de vida activo en México y Latinoamérica? Separa en: hashtags masivos (más de 1M posts), hashtags de nicho (10k-500k, alta tasa de descubrimiento), y hashtags locales de Puerto Vallarta / Riviera Nayarit / Nayarit. Dame entre 5 y 8 por categoría.`
    ),
    perplexityAsk(
      `Analiza qué tipo de videos están viralizando en Instagram Reels y TikTok en ${mes} 2026 para cuentas pequeñas (menos de 10,000 seguidores) en los nichos de pádel, pickleball, gym, alberca, lifestyle deportivo y clubs deportivos. ¿Qué patrones tienen en común los videos que llegan a 100k+ views desde cuentas chicas? Describe: formato del video, tipo de hook inicial, duración ideal, momentos del día más efectivos para publicar, y qué tipo de instalación o actividad aparece más. Dame 4 a 5 patrones específicos con ejemplos reales si los tienes.`
    ),
  ])

  // Claude integra todo en un briefing estratégico completo
  const consolidated = await ask(
    `Eres el estratega de marketing de Bahía Social Sports Club (club deportivo premium en Nuevo Vallarta, Nayarit).

INSTALACIONES DEL CLUB: 8 canchas de pádel techadas, 8 de pickleball, 3 de tenis dura, 3 de arcilla, alberca exterior rodeada de palmeras, gym y fitness funcional, restaurante panorámico de 2 pisos con terraza, vestidores premium. DIFERENCIADOR ÚNICO: ríos naturales con cocodrilos, tortugas y garzas dentro del predio.

Tu trabajo: con toda la información de tendencias, estacionalidad, hashtags y patrones virales, genera un briefing de marketing completo para esta semana.

Devuelve SOLO este JSON exacto (sin markdown, sin texto adicional):
{
  "trends": [
    {"topic": "nombre", "score": 85, "angle": "enfoque concreto para Bahía"}
  ],
  "seasonality": {
    "touristFlow": "resumen en 1 oración del volumen de turistas este mes",
    "dominantProfile": "perfil demográfico que más llega",
    "peakWindow": "cuándo están aquí y cuándo se van",
    "localMarket": "estado del mercado residente local este mes"
  },
  "strategy": {
    "primarySegment": "segmento principal a atacar esta semana",
    "secondarySegment": "segmento secundario",
    "message": "el ángulo de comunicación que más resuena ahora, en 1 oración",
    "avoid": "qué segmento o mensaje no tiene sentido esta semana y por qué"
  },
  "hashtags": {
    "masivos": ["#hashtag1", "#hashtag2"],
    "nicho": ["#hashtag1", "#hashtag2"],
    "locales": ["#hashtag1", "#hashtag2"],
    "mix": "combinación recomendada para un post de Bahía (cuántos de cada tipo)"
  },
  "contentTiming": [
    {
      "instalacion": "Gym",
      "bestDays": ["Lunes", "Martes"],
      "bestTime": "6am-8am",
      "reason": "por qué este momento según las tendencias actuales",
      "urgency": 8
    }
  ],
  "viralPatterns": [
    {
      "pattern": "nombre del patrón",
      "description": "qué hace exactamente la cuenta chica que viraliza",
      "adaptForBahia": "cómo aplicarlo específicamente en Bahía, qué mostrar, qué decir",
      "estimatedReach": "potencial de alcance si se aplica bien"
    }
  ],
  "contentIdeas": [
    {
      "title": "Título/concepto del video o post",
      "format": "Reel o Carrusel o Historia",
      "hook": "primera oración o imagen de apertura que engancha en menos de 3 segundos",
      "instalacion": "qué espacio del club mostrar",
      "targetSegment": "a quién va dirigido",
      "hashtags": ["#tag1", "#tag2"],
      "urgency": 9
    }
  ]
}`,
    [{
      role: 'user',
      content: [
        `Tendencias deportivas/lifestyle de la zona esta semana:\n${socialTrends}`,
        `Contexto estacional de ${mes}:\n${seasonalityRaw}`,
        `Hashtags efectivos en este momento:\n${hashtagsRaw}`,
        `Patrones virales en cuentas chicas:\n${viralPatternsRaw}`,
      ].join('\n\n---\n\n'),
    }]
  )

  type Trend = { topic: string; score: number; angle: string }
  type ContentTiming = { instalacion: string; bestDays: string[]; bestTime: string; reason: string; urgency: number }
  type ViralPattern = { pattern: string; description: string; adaptForBahia: string; estimatedReach: string }
  type ContentIdea = { title: string; format: string; hook: string; instalacion: string; targetSegment: string; hashtags: string[]; urgency: number }
  type Analysis = {
    trends: Trend[]
    seasonality: { touristFlow: string; dominantProfile: string; peakWindow: string; localMarket: string }
    strategy: { primarySegment: string; secondarySegment: string; message: string; avoid: string }
    hashtags: { masivos: string[]; nicho: string[]; locales: string[]; mix: string }
    contentTiming: ContentTiming[]
    viralPatterns: ViralPattern[]
    contentIdeas: ContentIdea[]
  }

  let analysis: Analysis = {
    trends: [{ topic: 'deporte familiar', score: 70, angle: 'actividades para toda la familia en Bahía' }],
    seasonality: { touristFlow: '', dominantProfile: '', peakWindow: '', localMarket: '' },
    strategy: { primarySegment: '', secondarySegment: '', message: '', avoid: '' },
    hashtags: { masivos: [], nicho: [], locales: [], mix: '' },
    contentTiming: [],
    viralPatterns: [],
    contentIdeas: [],
  }

  try {
    const clean = consolidated.replace(/```json|```/g, '').trim()
    analysis = JSON.parse(clean)
  } catch {
    // fallback ya definido arriba
  }

  // Guardar tendencias en Supabase
  await supabase.from('trends').insert(
    analysis.trends.map(t => ({
      topic: t.topic,
      score: t.score,
      source: 'perplexity+claude',
      region,
    }))
  )

  // Disparar Agente de Contenido con la idea de mayor urgency
  const topIdea = analysis.contentIdeas.sort((a, b) => b.urgency - a.urgency)[0]
  const topTrend = analysis.trends[0]
  await fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/contenido`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trend: topTrend, idea: topIdea, strategy: analysis.strategy }),
  }).catch(() => {})

  // Notificar al admin con el briefing completo
  if (notifyAdmin) {
    const { seasonality: s, strategy: st, hashtags: h, contentTiming: ct, viralPatterns: vp, contentIdeas: ci } = analysis

    const trendsText = analysis.trends
      .map((t, i) => `${i + 1}. *${t.topic}* (${t.score}/100) → ${t.angle}`)
      .join('\n')

    const timingText = ct
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, 3)
      .map(t => `• *${t.instalacion}* → ${t.bestDays.join('/')} ${t.bestTime} (urgencia ${t.urgency}/10)`)
      .join('\n')

    const viralText = vp.slice(0, 2)
      .map(v => `• *${v.pattern}*\n  Para Bahía: ${v.adaptForBahia}`)
      .join('\n')

    const ideasText = ci
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, 3)
      .map((idea, i) => `${i + 1}. *${idea.title}* (${idea.format})\n   Hook: "${idea.hook}"\n   → ${idea.targetSegment} · ${idea.instalacion}`)
      .join('\n\n')

    const hashtagLine = [...h.masivos.slice(0, 2), ...h.nicho.slice(0, 3), ...h.locales.slice(0, 2)].join(' ')

    const msg = [
      `📡 *Briefing semanal · ${mes}*`,
      '',
      `*Tendencias top:*\n${trendsText}`,
      '',
      `*Temporada:* ${s.dominantProfile} · ${s.peakWindow}`,
      `*Mercado local:* ${s.localMarket}`,
      '',
      `*Estrategia:*`,
      `→ Atacar: ${st.primarySegment}`,
      `→ Mensaje: "${st.message}"`,
      `→ Evitar: ${st.avoid}`,
      '',
      `*Cuándo publicar qué:*\n${timingText}`,
      '',
      `*Patrones virales de cuentas chicas:*\n${viralText}`,
      '',
      `*Ideas de contenido esta semana:*\n${ideasText}`,
      '',
      `*Hashtags recomendados:*\n${hashtagLine}`,
      `(${h.mix})`,
    ].join('\n')

    await sendText(process.env.ADMIN_PHONE!, msg)
  }

  return NextResponse.json(analysis)
}
