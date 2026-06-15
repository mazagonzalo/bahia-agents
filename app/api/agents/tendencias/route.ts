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

  // 4 consultas en paralelo — toda la inteligencia del mercado en este momento
  const [socialTrends, seasonalityRaw, hashtagsRaw, viralPatternsRaw] = await Promise.all([
    perplexityAsk(
      `¿Qué temas de deportes, vida activa y lifestyle están en tendencia ESTA SEMANA en ${region}? Dame 5 temas concretos con indicadores de interés real (búsquedas, engagement, menciones). Sé específico, no genérico.`
    ),
    perplexityAsk(
      `Para ${mes} en Puerto Vallarta y Riviera Nayarit: volumen aproximado de turistas, origen (EUA, Canadá, México), perfil demográfico dominante, duración promedio de estadía, cuándo empieza a decrecer el flujo, y qué actividades deportivas o de bienestar buscan en esta temporada. Datos concretos, no generalidades.`
    ),
    perplexityAsk(
      `Hashtags con MEJOR rendimiento en Instagram y TikTok AHORA (${mes} 2026) para contenido de pádel, pickleball, tenis, gym, natación, club deportivo y lifestyle activo en México. Categoriza en: masivos (popularidad alta, competencia alta), nicho (alta tasa de descubrimiento, competencia moderada), y locales de Puerto Vallarta / Nayarit / Riviera Nayarit. 6 a 8 por categoría.`
    ),
    perplexityAsk(
      `¿Qué tipo de videos están viralizando en Instagram Reels y TikTok en ${mes} 2026 para cuentas de menos de 10,000 seguidores en los nichos de pádel, pickleball, gym, club deportivo, natación y lifestyle activo? Describe los patrones comunes: qué aparece en los primeros 3 segundos, duración, tipo de música o audio, qué instalación o actividad muestran, qué emoción despiertan, y por qué crees que funcionan. Dame 4 patrones con ejemplos concretos.`
    ),
  ])

  // Claude genera el reporte estratégico completo — todo derivado de los datos, nada inventado
  const consolidated = await ask(
    `Eres el estratega de marketing de Bahía Social Sports Club (club deportivo premium en Nuevo Vallarta, Nayarit).

INSTALACIONES: 8 canchas de pádel techadas, 8 de pickleball, 3 de tenis dura, 3 de arcilla, alberca exterior con palmeras, gym funcional, restaurante panorámico 2 pisos, vestidores premium con mármol. DIFERENCIADOR ÚNICO: ríos naturales con cocodrilos, tortugas y garzas dentro del predio.
MEMBRESÍAS: Familiar $6,500/mes, Pareja $4,500/mes, Individual $2,500/mes, Solo Gym $1,800/mes.

INSTRUCCIÓN CRÍTICA: Todo lo que escribas debe derivarse de los datos de investigación que te doy. No apliques reglas fijas de horarios o días de la semana. Si la investigación dice que algo está en tendencia ahora, di por qué y cómo aprovecharlo. Si no tienes dato que respalde algo, no lo incluyas.

Devuelve SOLO este JSON (sin markdown, sin texto adicional):
{
  "generatedAt": "${now.toISOString()}",
  "period": "${mes}",
  "trends": [
    {
      "topic": "nombre del tema",
      "score": 85,
      "angle": "cómo lo conecta Bahía de forma concreta",
      "evidence": "dato o señal de la investigación que lo respalda"
    }
  ],
  "seasonality": {
    "touristFlow": "volumen y origen de turistas este mes",
    "dominantProfile": "perfil demográfico que más llega ahora",
    "peakWindow": "cuándo están aquí y cuándo decae",
    "localMarket": "qué pasa con el mercado residente local este mes",
    "insight": "oportunidad o riesgo clave que surge de esta estacionalidad"
  },
  "strategy": {
    "primarySegment": "segmento con mayor potencial esta semana según los datos",
    "secondarySegment": "segmento secundario",
    "message": "el ángulo de comunicación que más resuena ahora, en 1 oración",
    "avoid": "qué no hacer esta semana y por qué según los datos"
  },
  "hashtags": {
    "masivos": ["#tag"],
    "nicho": ["#tag"],
    "locales": ["#tag"],
    "mixRecomendado": "instrucción sobre cuántos de cada tipo usar y por qué este mix funciona ahora"
  },
  "contentOpportunities": [
    {
      "instalacion": "qué espacio del club mostrar",
      "oportunidad": "qué señal del mercado la justifica (dato de la investigación)",
      "momento": "cuándo publicar según los datos, no según una regla fija",
      "formatoIdeal": "formato específico (Reel 15s, carrusel 6 slides, etc.) y por qué",
      "urgencia": 9
    }
  ],
  "viralPatterns": [
    {
      "pattern": "nombre del patrón",
      "description": "qué hace exactamente el video que viraliza",
      "whyItWorks": "mecanismo psicológico o de plataforma que explica el alcance",
      "adaptForBahia": "cómo aplicarlo en Bahía: qué mostrar, qué decir, qué audio usar",
      "differentiator": "el cocodrilo/río/palmeras/etc: qué diferenciador único de Bahía encaja aquí"
    }
  ],
  "contentIdeas": [
    {
      "title": "concepto del video o post",
      "format": "Reel o Carrusel o Historia",
      "hook": "exactamente lo que aparece en los primeros 3 segundos — texto en pantalla o acción visual",
      "body": "qué muestra el resto del contenido",
      "cta": "qué acción pides al final",
      "instalacion": "espacio del club",
      "targetSegment": "a quién va dirigido",
      "hashtags": ["#tag"],
      "trendConnection": "qué tendencia detectada justifica publicar esto ahora",
      "urgency": 9
    }
  ]
}`,
    [{
      role: 'user',
      content: [
        `TENDENCIAS DEPORTIVAS/LIFESTYLE EN LA ZONA ESTA SEMANA:\n${socialTrends}`,
        `CONTEXTO ESTACIONAL ${mes.toUpperCase()}:\n${seasonalityRaw}`,
        `HASHTAGS EFECTIVOS AHORA:\n${hashtagsRaw}`,
        `PATRONES VIRALES EN CUENTAS CHICAS:\n${viralPatternsRaw}`,
      ].join('\n\n---\n\n'),
    }]
  )

  type Trend = { topic: string; score: number; angle: string; evidence: string }
  type ContentOpportunity = { instalacion: string; oportunidad: string; momento: string; formatoIdeal: string; urgencia: number }
  type ViralPattern = { pattern: string; description: string; whyItWorks: string; adaptForBahia: string; differentiator: string }
  type ContentIdea = { title: string; format: string; hook: string; body: string; cta: string; instalacion: string; targetSegment: string; hashtags: string[]; trendConnection: string; urgency: number }
  type Analysis = {
    generatedAt: string
    period: string
    trends: Trend[]
    seasonality: { touristFlow: string; dominantProfile: string; peakWindow: string; localMarket: string; insight: string }
    strategy: { primarySegment: string; secondarySegment: string; message: string; avoid: string }
    hashtags: { masivos: string[]; nicho: string[]; locales: string[]; mixRecomendado: string }
    contentOpportunities: ContentOpportunity[]
    viralPatterns: ViralPattern[]
    contentIdeas: ContentIdea[]
  }

  let analysis: Analysis | null = null

  try {
    const clean = consolidated.replace(/```json|```/g, '').trim()
    analysis = JSON.parse(clean)
  } catch {
    return NextResponse.json({ error: 'No se pudo parsear el análisis de Claude', raw: consolidated }, { status: 500 })
  }

  if (!analysis) return NextResponse.json({ error: 'Análisis vacío' }, { status: 500 })

  // Guardar reporte completo en agent_memory — consultable por otros agentes
  await supabase.from('agent_memory').insert({
    agent: 'tendencias',
    type: 'briefing',
    content: JSON.stringify(analysis),
    outcome: 'neutro',
  })

  // Guardar tendencias individuales también en tabla trends
  await supabase.from('trends').insert(
    analysis.trends.map(t => ({
      topic: t.topic,
      score: t.score,
      source: 'perplexity+claude',
      region,
    }))
  )

  // Pasar la idea de mayor urgency al Agente de Contenido
  const topIdea = [...analysis.contentIdeas].sort((a, b) => b.urgency - a.urgency)[0]
  await fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/contenido`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea: topIdea, strategy: analysis.strategy, report: analysis }),
  }).catch(() => {})

  // Notificar al admin
  if (notifyAdmin) {
    const { trends, seasonality: s, strategy: st, contentOpportunities: co, viralPatterns: vp, contentIdeas: ci, hashtags: h } = analysis

    const trendsText = trends
      .map((t, i) => `${i + 1}. *${t.topic}* (${t.score}/100)\n   → ${t.angle}\n   _${t.evidence}_`)
      .join('\n\n')

    const oppsText = [...co]
      .sort((a, b) => b.urgencia - a.urgencia)
      .slice(0, 3)
      .map(o => `• *${o.instalacion}* (urgencia ${o.urgencia}/10)\n  ${o.oportunidad}\n  Cuándo: ${o.momento}`)
      .join('\n\n')

    const viralText = vp.slice(0, 2)
      .map(v => `• *${v.pattern}*\n  ${v.adaptForBahia}`)
      .join('\n\n')

    const ideasText = [...ci]
      .sort((a, b) => b.urgency - a.urgency)
      .slice(0, 3)
      .map((idea, i) => `${i + 1}. *${idea.title}* (${idea.format})\n   Hook: "${idea.hook}"\n   → ${idea.targetSegment}`)
      .join('\n\n')

    const tagLine = [...h.masivos.slice(0, 2), ...h.nicho.slice(0, 3), ...h.locales.slice(0, 2)].join(' ')

    const msg = [
      `📡 *Briefing de marketing · ${mes}*`,
      '',
      `*Tendencias detectadas:*\n${trendsText}`,
      '',
      `*Temporada actual:*`,
      `${s.dominantProfile} · ${s.peakWindow}`,
      `Mercado local: ${s.localMarket}`,
      `💡 ${s.insight}`,
      '',
      `*Estrategia esta semana:*`,
      `→ Primario: ${st.primarySegment}`,
      `→ Mensaje: "${st.message}"`,
      `→ Evitar: ${st.avoid}`,
      '',
      `*Oportunidades de contenido (por datos, no por regla):*\n${oppsText}`,
      '',
      `*Patrones virales de cuentas chicas:*\n${viralText}`,
      '',
      `*Ideas de contenido prioritarias:*\n${ideasText}`,
      '',
      `*Hashtags recomendados:*\n${tagLine}`,
      h.mixRecomendado,
    ].join('\n')

    await sendText(process.env.ADMIN_PHONE!, msg)
  }

  return NextResponse.json(analysis)
}
