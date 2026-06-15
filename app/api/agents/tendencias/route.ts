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

// ─── Perplexity ──────────────────────────────────────────────────────────────

type PerplexityModel = 'sonar' | 'sonar-pro' | 'sonar-pro-search'

async function perplexityAsk(prompt: string, model: PerplexityModel = 'sonar-pro'): Promise<string> {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

// ─── Google Trends (LinkFox) ──────────────────────────────────────────────────

async function googleTrend(keyword: string): Promise<{ keyword: string; avgScore: number; trend: string } | null> {
  const apiKey = process.env.LINKFOXAGENT_API_KEY
  if (!apiKey) return null

  try {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    const fmt = (d: Date) => d.toISOString().split('T')[0]

    const res = await fetch('https://tool-gateway.linkfox.com/googleTrend/getTrendByKeys', {
      method: 'POST',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, region: 'MX', dayRangeStart: fmt(start), dayRangeEnd: fmt(end) }),
    })
    const data = await res.json()
    if (data.errcode && data.errcode !== 200) return null

    const values: number[] = (data.trendInfoForKeys?.[0]?.trendValues ?? []).map((v: { value: string }) => Number(v.value))
    if (!values.length) return null

    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
    const recent = values.slice(-7)
    const older = values.slice(-14, -7)
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length
    const trend = recentAvg > olderAvg * 1.1 ? 'subiendo' : recentAvg < olderAvg * 0.9 ? 'bajando' : 'estable'

    return { keyword, avgScore: avg, trend }
  } catch {
    return null
  }
}

// ─── Contexto embebido de viral-hook-creator y copywriting ────────────────────

const HOOK_PATTERNS_CONTEXT = `
PATRONES DE HOOK VIRAL (selecciona el más adecuado para cada idea):
1. Proxy Learning: "Analicé [N] para que no tengas que hacerlo. Estos son los patrones que nadie menciona"
2. Authority Credibility: "Después de [logro real], lo que nadie te dice sobre [tema]"
3. Cautionary Tale: "Cometí [error] y [consecuencia]. Aquí lo que aprendí"
4. Analysis-Based: "Analicé exactamente [N] [items]. Cero usaban [táctica común]"
5. Achievement with Constraint: "Cómo [logro] en [tiempo] sin [recurso obvio]"
6. Steal My Process: "Roba mi proceso para [resultado específico]"
7. Myth-Busting: "El mayor mito sobre [tema] está completamente al revés"
8. Opposite/Contrarian: "Todos dicen [X]. Hice lo contrario y [resultado concreto]"
9. You're Losing: "Estás [perdiendo/desperdiciando] [métrica específica] por [acción común]"
10. Tiny Change, Big Impact: "Un cambio de [cosa pequeña] puede [resultado desproporcionado]"
11. Behind-the-Scenes Testing: "Pasé [tiempo] probando [X] para que veas el resultado real"
12. The Unexpected: "Lo único que tienen en común todos los [grupo exitoso]"

TRIGGER WORDS (integra 1-2 por hook de forma natural):
- Insider: secretamente, revelado, descubierto, oculto, filtrado, ignorado, lo que nadie dice
- Helper (pérdida): perdiendo, desperdiciando, destruyendo, drenando, sacrificando
- Thinker (contrarian): al revés, paradoja, mito, contraintuitivo, error, ilusión
- Amplifiers: todos, nadie, cero, exactamente, completamente, literalmente, cada

REGLAS DEL HOOK: Números específicos > vaguedad. Sin emojis. Activo y presente. Máx 2 líneas.
`

const COPYWRITING_CONTEXT = `
FRAMEWORKS DE COPY (aplica uno por idea según el objetivo):
- PAS (Problem → Agitation → Solution): para contenido de conversión o urgencia
- AIDA (Attention → Interest → Desire → Action): para contenido de descubrimiento y awareness
- BAB (Before → After → Bridge): para testimonios, transformaciones y resultados
`

const REPURPOSING_CONTEXT = `
ADAPTACIÓN POR PLATAFORMA (para cada idea, especifica cómo cambia en cada formato):
- Reel (IG/FB): hook visual en 1-3s, máx 30-60s, subtítulos quemados, música trending
- TikTok: texto en pantalla en los primeros 2s, tono más relajado y directo, sin producción excesiva
- Historia (IG Stories): texto mínimo, sticker de pregunta o desliza, duración 5-7s por slide
- Carrusel: slide 1 = hook puro, slides 2-6 = desarrollo, slide final = CTA con link en bio
`

// ─── Main ─────────────────────────────────────────────────────────────────────

async function runTendencias(notifyAdmin: boolean) {
  const region = 'Riviera Nayarit Bahía de Banderas Puerto Vallarta México'
  const now = new Date()
  const mes = now.toLocaleString('es-MX', { month: 'long', year: 'numeric' })

  // Todas las consultas externas en paralelo
  const keywords = ['padel', 'pickleball', 'gym', 'tenis', 'club deportivo']
  const [
    socialTrends,
    seasonalityRaw,
    hashtagsRaw,
    viralPatternsRaw,
    competitiveRaw,
    audienceRaw,
    ...trendsData
  ] = await Promise.all([
    // 1. Tendencias deportivas/lifestyle — sonar-pro
    perplexityAsk(
      `¿Qué temas de deportes, vida activa y lifestyle están en tendencia ESTA SEMANA en ${region}? Dame 5 temas concretos con señales reales de interés (búsquedas, engagement, menciones). Sé específico, no genérico.`,
      'sonar-pro'
    ),
    // 2. Estacionalidad — sonar-pro
    perplexityAsk(
      `Para ${mes} en Puerto Vallarta y Riviera Nayarit: volumen aproximado de turistas, origen (EUA, Canadá, México), perfil demográfico dominante, duración promedio de estadía, cuándo decae el flujo, y qué actividades deportivas o de bienestar buscan. Datos concretos.`,
      'sonar-pro'
    ),
    // 3. Hashtags — sonar-pro
    perplexityAsk(
      `Hashtags con MEJOR rendimiento en Instagram y TikTok AHORA (${mes} 2026) para contenido de pádel, pickleball, tenis, gym, club deportivo y lifestyle activo en México. Separa en: masivos (>1M posts), nicho (10k-500k, alta tasa de descubrimiento), locales de Puerto Vallarta/Nayarit. 6-8 por categoría.`,
      'sonar-pro'
    ),
    // 4. Patrones virales — sonar-pro-search (modelo avanzado, análisis multi-step)
    perplexityAsk(
      `Analiza qué videos están viralizando en Instagram Reels y TikTok en ${mes} 2026 para cuentas pequeñas (<10,000 seguidores) en pádel, pickleball, gym, alberca, lifestyle deportivo y clubs deportivos en México y Latinoamérica. Para cada patrón describe: los primeros 3 segundos exactos, duración, tipo de audio, qué muestra, qué emoción activa, y por qué funciona algorítmicamente. 4-5 patrones con ejemplos reales.`,
      'sonar-pro-search'
    ),
    // 5. Inteligencia competitiva — sonar-pro (NUEVO: competitive-intel skill)
    perplexityAsk(
      `¿Qué clubes deportivos, gyms o centros de fitness compiten con un club de pádel y pickleball premium en Riviera Nayarit, Bahía de Banderas o Puerto Vallarta? ¿Qué tipo de contenido publican en Instagram o TikTok? ¿Qué mensajes, promociones o ángulos están usando actualmente? ¿Qué está funcionando bien para ellos? Dame nombres concretos y ejemplos de su contenido si los tienes.`,
      'sonar-pro'
    ),
    // 6. Investigación de audiencia — sonar-pro (NUEVO: audience-research skill)
    perplexityAsk(
      `¿Qué cuentas de Instagram, YouTube o TikTok siguen los aficionados al pádel, pickleball, gym y deportes de raqueta en México? ¿Qué hashtags usan en sus propios posts? ¿Qué tipo de contenido consumen más — tutoriales, humor, lifestyle, resultados físicos, torneos? ¿Qué influencers o creadores tienen mayor afinidad con este segmento en México? Dame señales concretas de comportamiento, no generalidades.`,
      'sonar-pro'
    ),
    // 7. Google Trends real para cada keyword — linkfox-google-trends skill (NUEVO)
    ...keywords.map(k => googleTrend(k)),
  ])

  const googleTrendsResults = trendsData.filter(Boolean) as { keyword: string; avgScore: number; trend: string }[]

  // ─── Claude genera el briefing completo con todos los skills incorporados ───

  const prompt = `Eres el estratega de marketing de Bahía Social Sports Club (club deportivo premium en Nuevo Vallarta, Nayarit).

INSTALACIONES: 8 canchas de pádel techadas, 8 de pickleball, 3 de tenis dura, 3 de arcilla, alberca exterior con palmeras, gym funcional, restaurante panorámico 2 pisos, vestidores premium. DIFERENCIADOR ÚNICO: ríos naturales con cocodrilos, tortugas y garzas dentro del predio.
MEMBRESÍAS: Familiar $6,500/mes, Pareja $4,500/mes, Individual $2,500/mes, Solo Gym $1,800/mes.

${HOOK_PATTERNS_CONTEXT}

${COPYWRITING_CONTEXT}

${REPURPOSING_CONTEXT}

INSTRUCCIÓN CRÍTICA: Todo lo que generes debe derivarse de los datos de investigación que te doy. No apliques reglas fijas de horarios o días. Si la investigación respalda algo, di por qué.

Devuelve SOLO este JSON (sin markdown, sin texto adicional):
{
  "generatedAt": "${now.toISOString()}",
  "period": "${mes}",
  "trends": [
    {
      "topic": "nombre del tema",
      "score": 85,
      "angle": "cómo lo conecta Bahía concretamente",
      "evidence": "dato de la investigación que lo respalda"
    }
  ],
  "googleTrends": [
    {
      "keyword": "padel",
      "avgScore": 72,
      "trend": "subiendo",
      "insight": "qué significa este dato para Bahía"
    }
  ],
  "seasonality": {
    "touristFlow": "volumen y origen este mes",
    "dominantProfile": "perfil demográfico que más llega",
    "peakWindow": "cuándo están y cuándo decae",
    "localMarket": "estado del mercado residente local",
    "insight": "oportunidad o riesgo clave de esta estacionalidad"
  },
  "strategy": {
    "primarySegment": "segmento con mayor potencial esta semana según datos",
    "secondarySegment": "segmento secundario",
    "message": "ángulo de comunicación que más resuena ahora, 1 oración",
    "avoid": "qué no hacer esta semana y por qué según los datos"
  },
  "competitive": {
    "topCompetitors": ["nombre del competidor y su canal"],
    "theirAngle": "qué mensaje o ángulo están usando ellos",
    "gap": "qué no están haciendo ellos que Bahía puede capitalizar",
    "counterPositioning": "cómo posicionar Bahía para ganarles en contenido"
  },
  "audienceWhere": {
    "accounts": ["cuentas o creadores que sigue nuestra audiencia"],
    "contentTypes": ["qué tipo de contenido consumen más"],
    "ownHashtags": ["hashtags que usa la audiencia en sus propios posts"],
    "insight": "oportunidad de canal o colaboración derivada de este análisis"
  },
  "hashtags": {
    "masivos": ["#tag"],
    "nicho": ["#tag"],
    "locales": ["#tag"],
    "mixRecomendado": "cuántos de cada tipo usar y por qué este mix funciona ahora"
  },
  "contentOpportunities": [
    {
      "instalacion": "espacio del club",
      "oportunidad": "señal del mercado que la justifica",
      "momento": "cuándo publicar según los datos",
      "formatoIdeal": "formato específico y por qué",
      "urgencia": 9
    }
  ],
  "viralPatterns": [
    {
      "pattern": "nombre del patrón",
      "description": "qué hace exactamente",
      "whyItWorks": "mecanismo psicológico o algorítmico",
      "adaptForBahia": "cómo aplicarlo en Bahía: qué mostrar, qué decir",
      "differentiator": "qué diferenciador único de Bahía encaja aquí (cocodrilos, río, palmeras, etc.)"
    }
  ],
  "contentIdeas": [
    {
      "title": "concepto del video o post",
      "format": "Reel o Carrusel o Historia",
      "hook": {
        "text": "texto exacto del hook — primeros 3 segundos o primera línea",
        "pattern": "nombre del patrón de hook usado (de la lista de 12)",
        "triggerWords": ["palabra trigger usada"]
      },
      "copyStructure": {
        "framework": "PAS o AIDA o BAB",
        "step1": "primer elemento del framework aplicado a esta idea",
        "step2": "segundo elemento",
        "step3": "tercer elemento",
        "cta": "llamada a la acción específica"
      },
      "platforms": {
        "reel": "cómo adaptar para Reel de IG/FB",
        "tiktok": "cómo adaptar para TikTok",
        "stories": "cómo adaptar para IG Stories",
        "carrusel": "estructura de slides si aplica"
      },
      "instalacion": "espacio del club",
      "targetSegment": "a quién va dirigido",
      "hashtags": ["#tag"],
      "trendConnection": "qué tendencia o dato justifica publicar esto ahora",
      "urgency": 9
    }
  ]
}`

  const consolidated = await ask(prompt, [{
    role: 'user',
    content: [
      `TENDENCIAS DEPORTIVAS/LIFESTYLE ESTA SEMANA:\n${socialTrends}`,
      `CONTEXTO ESTACIONAL ${mes.toUpperCase()}:\n${seasonalityRaw}`,
      `HASHTAGS EFECTIVOS AHORA:\n${hashtagsRaw}`,
      `PATRONES VIRALES EN CUENTAS CHICAS:\n${viralPatternsRaw}`,
      `INTELIGENCIA COMPETITIVA LOCAL:\n${competitiveRaw}`,
      `DÓNDE ESTÁ LA AUDIENCIA ONLINE:\n${audienceRaw}`,
      googleTrendsResults.length
        ? `GOOGLE TRENDS (últimos 30 días, México):\n${googleTrendsResults.map(t => `${t.keyword}: score ${t.avgScore}/100, tendencia ${t.trend}`).join('\n')}`
        : '',
    ].filter(Boolean).join('\n\n---\n\n'),
  }])

  type Trend = { topic: string; score: number; angle: string; evidence: string }
  type GTrend = { keyword: string; avgScore: number; trend: string; insight: string }
  type ContentOpportunity = { instalacion: string; oportunidad: string; momento: string; formatoIdeal: string; urgencia: number }
  type ViralPattern = { pattern: string; description: string; whyItWorks: string; adaptForBahia: string; differentiator: string }
  type ContentIdea = {
    title: string; format: string
    hook: { text: string; pattern: string; triggerWords: string[] }
    copyStructure: { framework: string; step1: string; step2: string; step3: string; cta: string }
    platforms: { reel: string; tiktok: string; stories: string; carrusel: string }
    instalacion: string; targetSegment: string; hashtags: string[]; trendConnection: string; urgency: number
  }
  type Analysis = {
    generatedAt: string; period: string
    trends: Trend[]; googleTrends: GTrend[]
    seasonality: { touristFlow: string; dominantProfile: string; peakWindow: string; localMarket: string; insight: string }
    strategy: { primarySegment: string; secondarySegment: string; message: string; avoid: string }
    competitive: { topCompetitors: string[]; theirAngle: string; gap: string; counterPositioning: string }
    audienceWhere: { accounts: string[]; contentTypes: string[]; ownHashtags: string[]; insight: string }
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
    return NextResponse.json({ error: 'Error parsing Claude response', raw: consolidated.slice(0, 500) }, { status: 500 })
  }

  if (!analysis) return NextResponse.json({ error: 'Análisis vacío' }, { status: 500 })

  // Enriquecer googleTrends con datos reales si los tenemos
  if (googleTrendsResults.length && analysis.googleTrends) {
    analysis.googleTrends = analysis.googleTrends.map(gt => {
      const real = googleTrendsResults.find(r => r.keyword.toLowerCase() === gt.keyword.toLowerCase())
      return real ? { ...gt, avgScore: real.avgScore, trend: real.trend } : gt
    })
  }

  // Guardar reporte completo en agent_memory — consultable por todos los agentes
  await supabase.from('agent_memory').insert({
    agent: 'tendencias',
    type: 'briefing',
    content: JSON.stringify(analysis),
    outcome: 'neutro',
  })

  // Guardar tendencias individuales
  await supabase.from('trends').insert(
    analysis.trends.map(t => ({ topic: t.topic, score: t.score, source: 'perplexity+claude', region }))
  )

  // Disparar Agente de Contenido con la idea de mayor urgency
  const topIdea = [...analysis.contentIdeas].sort((a, b) => b.urgency - a.urgency)[0]
  await fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/contenido`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea: topIdea, strategy: analysis.strategy, report: analysis }),
  }).catch(() => {})

  // Notificar al admin
  if (notifyAdmin) {
    const { trends, seasonality: s, strategy: st, competitive: c, contentOpportunities: co, contentIdeas: ci, hashtags: h } = analysis

    const trendsText = trends.map((t, i) =>
      `${i + 1}. *${t.topic}* (${t.score}/100)\n   → ${t.angle}\n   _${t.evidence}_`
    ).join('\n\n')

    const gtText = googleTrendsResults.length
      ? googleTrendsResults.map(g => `${g.keyword}: ${g.avgScore}/100 (${g.trend})`).join(' · ')
      : ''

    const oppsText = [...co].sort((a, b) => b.urgencia - a.urgencia).slice(0, 3)
      .map(o => `• *${o.instalacion}* (${o.urgencia}/10) — ${o.oportunidad}`)
      .join('\n')

    const ideasText = [...ci].sort((a, b) => b.urgency - a.urgency).slice(0, 3)
      .map((idea, i) =>
        `${i + 1}. *${idea.title}* (${idea.format})\n   Hook: "${idea.hook.text}" [${idea.hook.pattern}]\n   Copy: ${idea.copyStructure.framework} → ${idea.copyStructure.cta}\n   → ${idea.targetSegment}`
      ).join('\n\n')

    const tagLine = [...h.masivos.slice(0, 2), ...h.nicho.slice(0, 3), ...h.locales.slice(0, 2)].join(' ')

    const msg = [
      `📡 *Briefing · ${mes}*`,
      '',
      `*Tendencias:*\n${trendsText}`,
      gtText ? `\n*Google Trends MX:* ${gtText}` : '',
      '',
      `*Temporada:* ${s.dominantProfile} · ${s.peakWindow}`,
      `💡 ${s.insight}`,
      '',
      `*Estrategia:* → ${st.primarySegment}`,
      `Mensaje: "${st.message}"`,
      `Evitar: ${st.avoid}`,
      '',
      `*Competencia:* ${c.theirAngle}`,
      `→ Nuestra ventaja: ${c.counterPositioning}`,
      '',
      `*Oportunidades de contenido:*\n${oppsText}`,
      '',
      `*Ideas prioritarias:*\n${ideasText}`,
      '',
      `*Hashtags:*\n${tagLine}`,
      h.mixRecomendado,
    ].filter(Boolean).join('\n')

    await sendText(process.env.ADMIN_PHONE!, msg)
  }

  return NextResponse.json(analysis)
}
