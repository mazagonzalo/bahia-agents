export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ask } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp'

const isDev = process.env.NODE_ENV === 'development'

export async function POST(req: NextRequest) {
  const { notifyAdmin = true } = await req.json().catch(() => ({}))
  if (isDev) {
    return runTendencias(notifyAdmin)
  }
  const { after } = await import('next/server')
  after(() => runTendencias(notifyAdmin))
  return NextResponse.json({ status: 'processing', readAt: '/api/agents/tendencias/report' })
}

export async function GET() {
  if (isDev) {
    return runTendencias(true)
  }
  const { after } = await import('next/server')
  after(() => runTendencias(true))
  return NextResponse.json({ status: 'processing', readAt: '/api/agents/tendencias/report' })
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

// ─── Meta Ads Library ────────────────────────────────────────────────────────

type AdResult = {
  page_name?: string
  ad_creative_bodies?: string[]
  ad_creative_link_titles?: string[]
  ad_creative_link_descriptions?: string[]
  ad_delivery_start_time?: string
}

async function metaAdsLibrary(searchTerms: string[]): Promise<string> {
  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  if (!appId || !appSecret) return ''

  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`
    )
    const tokenData = await tokenRes.json()
    const token: string = tokenData.access_token
    if (!token) return ''

    const searches = await Promise.all(
      searchTerms.map(async term => {
        const params = new URLSearchParams({
          search_terms: term,
          ad_reached_countries: JSON.stringify(['MX']),
          ad_type: 'ALL',
          ad_active_status: 'ACTIVE',
          limit: '8',
          fields: 'ad_creative_bodies,ad_creative_link_titles,ad_creative_link_descriptions,ad_delivery_start_time,page_name',
          access_token: token,
        })
        const res = await fetch(`https://graph.facebook.com/v21.0/ads_archive?${params}`)
        const data = await res.json()
        const ads: AdResult[] = data.data ?? []

        if (!ads.length) return ''

        const lines = ads.map(ad => {
          const page = ad.page_name ?? 'desconocido'
          const body = ad.ad_creative_bodies?.[0] ?? ''
          const title = ad.ad_creative_link_titles?.[0] ?? ''
          return `Página: ${page} | Título: ${title} | Copy: ${body.slice(0, 150)}`
        })

        return `Término "${term}":\n${lines.join('\n')}`
      })
    )

    return searches.filter(Boolean).join('\n\n')
  } catch {
    return ''
  }
}

// ─── Contexto embebido de viral-hook-creator y copywriting ────────────────────

const HOOK_PATTERNS_CONTEXT = `
PATRONES DE HOOK VIRAL (selecciona el más adecuado para cada idea):
1. Proxy Learning: "Analicé [N] para que no tengas que hacerlo."
2. Authority Credibility: "Después de [logro real], lo que nadie te dice sobre [tema]"
3. Cautionary Tale: "Cometí [error] y [consecuencia]."
4. Analysis-Based: "Analicé exactamente [N] [items]. Cero usaban [táctica común]"
5. Achievement with Constraint: "Cómo [logro] en [tiempo] sin [recurso obvio]"
6. Steal My Process: "Roba mi proceso para [resultado específico]"
7. Myth-Busting: "El mayor mito sobre [tema] está al revés"
8. Opposite/Contrarian: "Todos dicen [X]. Hice lo contrario y [resultado]"
9. You're Losing: "Estás perdiendo [métrica] por [acción común]"
10. Tiny Change, Big Impact: "Un cambio de [cosa] puede [resultado]"
11. Behind-the-Scenes: "Pasé [tiempo] probando [X] para que veas"
12. The Unexpected: "Lo único en común de todos los [grupo exitoso]"

TRIGGER WORDS: secretamente, revelado, oculto, perdiendo, al revés, mito, todos, nadie, exactamente
REGLAS: Sin emojis. Activo y presente. Máx 2 líneas.
`

const COPYWRITING_CONTEXT = `
FRAMEWORKS: PAS (Problem→Agitation→Solution) · AIDA (Attention→Interest→Desire→Action) · BAB (Before→After→Bridge)
`

const REPURPOSING_CONTEXT = `
PLATAFORMAS: Reel (hook 1-3s, 30-60s, subtítulos) · TikTok (texto primeros 2s, tono relajado) · Stories (texto mínimo, 5-7s/slide) · Carrusel (slide 1=hook, 2-6=desarrollo, final=CTA)
`

// ─── Main ─────────────────────────────────────────────────────────────────────

async function getPreviousReport(): Promise<string> {
  const { data } = await supabase
    .from('agent_memory')
    .select('content, created_at')
    .eq('agent', 'tendencias')
    .eq('type', 'briefing')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return ''

  try {
    const prev = JSON.parse(data.content)
    const fecha = new Date(data.created_at).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    const trends = (prev.trends ?? []).map((t: { topic: string; score: number }) => `${t.topic} (${t.score})`).join(', ')
    const gtrends = (prev.googleTrends ?? []).map((g: { keyword: string; avgScore: number; trend: string }) => `${g.keyword}: ${g.avgScore} (${g.trend})`).join(', ')
    const topIdeas = (prev.contentIdeas ?? []).slice(0, 2).map((i: { title: string }) => i.title).join(', ')
    return `REPORTE ANTERIOR (${fecha}):\n- Tendencias: ${trends}\n- Google Trends: ${gtrends || 'sin datos'}\n- Ideas top: ${topIdeas}\n- Estrategia: ${prev.strategy?.message ?? ''}`
  } catch {
    return ''
  }
}

async function runTendencias(notifyAdmin: boolean) {
  const region = 'Riviera Nayarit, Bahía de Banderas, Nuevo Vallarta, Puerto Vallarta'
  const now = new Date()
  const mes = now.toLocaleString('es-MX', { month: 'long', year: 'numeric' })
  const semana = `semana del ${now.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}`

  const previousReport = await getPreviousReport()

  // Extraer temas previos para evitar repetición
  const prevTopics = previousReport
    ? previousReport.match(/Tendencias: ([^\n]+)/)?.[1]?.split(',').map(t => t.trim().split('(')[0].trim()).filter(Boolean) ?? []
    : []
  const avoidInstruction = prevTopics.length
    ? `\nTEMAS YA CUBIERTOS LA SEMANA PASADA (no repetir como tendencia principal): ${prevTopics.join(', ')}. Busca ángulos nuevos, temas adyacentes o tendencias completamente distintas.`
    : ''

  // Keywords dinámicos: fijos de alto volumen + wellness/lifestyle para no ser repetitivos
  const keywords = ['padel', 'pickleball', 'natacion', 'wellness mexico', 'vida activa']
  const adsTerms = ['club deportivo Vallarta', 'membresía gym Nayarit', 'pádel Puerto Vallarta', 'deporte familia México']

  const [marketRaw, viralRaw, audienceRaw, metaAdsRaw, ...trendsData] = await Promise.all([
    perplexityAsk(
      `Eres un analista de tendencias para un club deportivo premium en ${region}. Responde estas 3 preguntas separadas con ---. Fecha: ${semana} 2026.

1. TENDENCIAS REALES ESTA SEMANA: Qué temas de deportes, wellness, lifestyle o cultura están generando conversación AHORA en redes sociales mexicanas y en la zona. NO menciones solo pádel o pickleball a menos que haya un evento o ángulo concreto nuevo. Busca: torneos locales, eventos deportivos, tendencias de salud mental + deporte, recuperación activa, familias activas en verano, temporada de vacaciones escolares México, turismo deportivo, tendencias fitness que llegaron a México en los últimos 30 días. Da 3-5 temas con señales concretas (hashtags, cuentas, noticias).

2. ESTACIONALIDAD ${mes.toUpperCase()}: Tipo de turista que llega a Riviera Nayarit en esta fecha, origen (MX local, norteamericano, expats), comportamiento de consumo en clubes deportivos. ¿Qué busca el mercado local en vacaciones escolares?

3. COMPETENCIA: 2-3 clubes o instalaciones que compitan con un club premium de raqueta + alberca + gym en Vallarta/Nayarit. ¿Qué mensajes usan en redes? ¿Qué no están haciendo?`,
      'sonar-pro'
    ),
    perplexityAsk(
      `Responde estas 2 preguntas sobre contenido en redes sociales para un club deportivo premium en México. Separa con ---. Fecha: ${semana} 2026.

1. VIDEOS VIRALES AHORA: 2-3 formatos de Reel o TikTok que están funcionando ESTA SEMANA para cuentas de deportes/wellness/lifestyle en México con menos de 20k seguidores. Para cada formato describe: los primeros 3 segundos exactos (qué se ve, qué dice el texto en pantalla), la emoción que activa, el tipo de corte/edición, la duración ideal, y por qué está funcionando ahora.

2. HASHTAGS: Los más efectivos ahora en Instagram y TikTok para deportes, wellness y vida activa en México. Incluye: 4 masivos (>500k posts), 4 de nicho (10k-200k), 3 locales de Vallarta/Nayarit/Riviera Nayarit. Indica cuáles tienen más engagement en este momento.`,
      'sonar-pro'
    ),
    perplexityAsk(
      `¿Qué tipo de contenido consumen en redes sociales los socios de clubes deportivos premium en México (Guadalajara, CDMX, Monterrey, turistas norteamericanos en Vallarta)? Ejemplos de cuentas que siguen, formatos que más guardan o comparten, y qué los hace decidir unirse a un club. Respuesta específica y concreta.`,
      'sonar'
    ),
    metaAdsLibrary(adsTerms),
    ...keywords.map(k => googleTrend(k)),
  ])

  const googleTrendsResults = trendsData.filter(Boolean) as { keyword: string; avgScore: number; trend: string }[]

  const trunc = (s: string, max = 1800) => s.length > max ? s.slice(0, max) + '…' : s

  const [marketQ1, marketQ2, marketQ3] = marketRaw.split(/---+/).map(s => s.trim())
  const [viralQ1, viralQ2] = viralRaw.split(/---+/).map(s => s.trim())
  const socialTrends = trunc(marketQ1 ?? marketRaw)
  const seasonalityRaw = trunc(marketQ2 ?? '')
  const competitiveRaw = trunc(marketQ3 ?? '')
  const viralPatternsRaw = trunc(viralQ1 ?? viralRaw)
  const hashtagsRaw = trunc(viralQ2 ?? '')

  // ─── Claude genera el briefing ────────────────────────────────────────────────

  const generatedAt = now.toISOString()
  const prompt = `Eres el estratega de contenido de Bahía Social Sports Club, club deportivo premium en Paseo de los Flamingos, Nuevo Vallarta, Nayarit. Tu trabajo es convertir tendencias reales en ideas de contenido concretas y ejecutables.

INSTALACIONES:
- 8 canchas de pádel techadas + 8 pickleball + tenis (concreto y arcilla)
- Albercas exteriores con asoleadero y palapa
- Gym funcional, spinning, yoga, terraza con vista
- Vestidores premium, salón de belleza, cafetería, salones de eventos
- Lago natural rodeado de vegetación tropical (área de paisaje)
- Entrada sobre Paseo de los Flamingos con estacionamiento

MEMBRESÍAS: Familiar $6,500 · Pareja $4,500 · Individual $2,500 · Solo Gym $1,800 (mensual).

${HOOK_PATTERNS_CONTEXT}
${COPYWRITING_CONTEXT}
${REPURPOSING_CONTEXT}

ANTI-REPETICIÓN — CRÍTICO:${avoidInstruction}
${previousReport ? `\nREPORTE ANTERIOR:\n${previousReport}\n\nComenta qué cambió, qué subió, qué es nuevo esta semana.` : ''}

INSTRUCCIONES PARA CONTENT IDEAS — LOS REELS DEBEN SER EJECUTABLES:
- hook.text: La primera oración exacta que dice o aparece en pantalla. Debe ser impactante y completa. Sin límite de palabras.
- platforms.reel: Describe el video como un director: qué se ve en el plano de apertura, qué texto aparece en pantalla en los primeros 3s, ritmo de edición, duración, qué emoción busca. Mínimo 2 oraciones.
- platforms.tiktok: Cómo adaptar el hook y tono para TikTok (más casual, texto directo desde segundo 0).
- step1/step2/step3: Notas de guión reales. Qué dice, qué muestra, qué siente el espectador en cada momento.
- trendConnection: Por qué esta idea conecta con la tendencia detectada esta semana. Específico.

REGLAS GENERALES:
- Máximo 3 trends, 3 googleTrends, 3 contentOpportunities, 2 viralPatterns, 4 contentIdeas
- Las ideas de contenido deben conectar con las tendencias reales de esta semana, no con los deportes del club en general
- hashtags por idea: máximo 5 tags
- triggerWords: máximo 3 elementos

Devuelve ÚNICAMENTE el JSON, sin markdown:
{"generatedAt":"${generatedAt}","period":"${mes}","trends":[{"topic":"string","score":0,"angle":"string","evidence":"string"}],"googleTrends":[{"keyword":"string","avgScore":0,"trend":"string","insight":"string"}],"seasonality":{"touristFlow":"string","dominantProfile":"string","peakWindow":"string","localMarket":"string","insight":"string"},"strategy":{"primarySegment":"string","secondarySegment":"string","message":"string","avoid":"string"},"competitive":{"topCompetitors":["string"],"theirAngle":"string","gap":"string","counterPositioning":"string"},"audienceWhere":{"accounts":["string"],"contentTypes":["string"],"ownHashtags":["#tag"],"insight":"string"},"hashtags":{"masivos":["#tag"],"nicho":["#tag"],"locales":["#tag"],"mixRecomendado":"string"},"contentOpportunities":[{"instalacion":"string","oportunidad":"string","momento":"string","formatoIdeal":"string","urgencia":0}],"viralPatterns":[{"pattern":"string","description":"string","whyItWorks":"string","adaptForBahia":"string","differentiator":"string"}],"contentIdeas":[{"title":"string","format":"Reel","hook":{"text":"string","pattern":"string","triggerWords":["string"]},"copyStructure":{"framework":"PAS","step1":"string","step2":"string","step3":"string","cta":"string"},"platforms":{"reel":"string","tiktok":"string","stories":"string","carrusel":"string"},"instalacion":"string","targetSegment":"string","hashtags":["#tag"],"trendConnection":"string","urgency":0}]}`

  const consolidated = await ask(prompt, [{
    role: 'user',
    content: [
      `TENDENCIAS REALES ESTA SEMANA (${semana}):\n${socialTrends}`,
      `ESTACIONALIDAD ${mes.toUpperCase()}:\n${seasonalityRaw}`,
      `FORMATOS VIRALES QUE FUNCIONAN AHORA:\n${viralPatternsRaw}`,
      `HASHTAGS EFECTIVOS:\n${hashtagsRaw}`,
      `COMPETENCIA LOCAL:\n${competitiveRaw}`,
      metaAdsRaw ? `META ADS COMPETIDORES:\n${metaAdsRaw}` : '',
      `AUDIENCIA ONLINE (qué consume, qué comparte):\n${trunc(audienceRaw, 1000)}`,
      googleTrendsResults.length
        ? `GOOGLE TRENDS MX:\n${googleTrendsResults.map(t => `${t.keyword}: ${t.avgScore}/100 (${t.trend})`).join(', ')}`
        : '',
    ].filter(Boolean).join('\n\n---\n\n'),
  }], 6000)

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
    const start = consolidated.indexOf('{')
    const end = consolidated.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('no JSON found')
    analysis = JSON.parse(consolidated.slice(start, end + 1))
  } catch {
    return NextResponse.json({ error: 'Error parsing Claude response', raw: consolidated.slice(0, 3000) }, { status: 500 })
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
