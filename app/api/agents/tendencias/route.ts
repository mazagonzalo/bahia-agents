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

  // PERFIL DEL SOCIO — para filtrar relevancia en todos los prompts
  const audienceProfile = `AUDIENCIA OBJETIVO DE BAHÍA (filtra TODO por este perfil):
- Familias premium con hijos (ingreso familiar >$80k MXN/mes), residentes Nuevo Vallarta/Bucerías/La Cruz
- Parejas jóvenes profesionales 28-45 años con lifestyle activo
- Turistas norteamericanos y canadienses de alto poder adquisitivo (snowbirds + vacaciones premium)
- Expats viviendo en la zona Vallarta/Riviera Nayarit
- Empresarios de Tepic/Guadalajara con segunda residencia en la costa
DESCARTA cualquier tendencia de: gym low-cost (Smartfit, Sport City masivo), home workouts gratuitos, apps fitness sin costo, rutinas sin equipo, noticias de deporte profesional sin impacto local, tendencias de masa sin conexión a lifestyle premium o comunidad real.`

  const [marketRaw, viralRaw, musicRaw, audienceRaw, metaAdsRaw, ...trendsData] = await Promise.all([
    perplexityAsk(
      `${audienceProfile}

Eres analista de tendencias para Bahía Social Sports Club, club deportivo premium en ${region}. Fecha: ${semana} 2026. Responde estas 3 preguntas separadas con ---.

1. TENDENCIAS CON IMPACTO REAL EN BAHÍA: Qué temas están generando conversación ESTA SEMANA en redes sociales entre el perfil de audiencia descrito. Busca señales concretas en: torneos o eventos locales en Riviera Nayarit/Vallarta, tendencias wellness premium (cold plunge, recovery, nutrición deportiva, mindfulness activo), familia activa en vacaciones de verano MX, turismo deportivo en la zona, tendencias de comunidad/pertenencia vs individualismo del gym, lifestyle de expats en la costa. Para cada tendencia: por qué importa específicamente a Bahía, qué conversación está generando, señales en redes (hashtags, cuentas, noticias reales).

2. ESTACIONALIDAD ${mes.toUpperCase()} en Riviera Nayarit: Volumen y perfil del visitante esta semana. Comportamiento real del mercado local en vacaciones escolares de verano. Qué tipo de membresía o actividad busca cada segmento.

3. COMPETENCIA DIRECTA: 2-3 clubes en Vallarta/Nayarit que compitan directamente con Bahía en el segmento premium (no gyms masivos). Qué mensajes usan en Instagram/TikTok. Qué gap evidente tienen que Bahía puede llenar.`,
      'sonar-pro'
    ),
    perplexityAsk(
      `${audienceProfile}

Responde estas 2 preguntas sobre contenido en redes para un club deportivo premium. Separa con ---. Fecha: ${semana} 2026.

1. FORMATOS VIRALES ESTA SEMANA: 2-3 tipos de Reel/TikTok que están funcionando AHORA para cuentas de deportes premium, wellness de alto nivel o lifestyle en México (<30k seguidores). Para cada formato: qué aparece exactamente en los primeros 3 segundos (plano visual + texto en pantalla), qué emoción activa en el espectador, estructura de edición (cortes, ritmo, duración), y por qué está funcionando en este momento cultural específico.

2. HASHTAGS DE ALTO RENDIMIENTO: Los más efectivos ahora en IG y TikTok para lifestyle deportivo premium en México. 4 masivos (>500k posts), 4 de nicho premium (10k-150k), 3 de Riviera Nayarit/Vallarta/Nayarit. Cuáles tienen mejor engagement-to-reach ratio esta semana.`,
      'sonar-pro'
    ),
    perplexityAsk(
      `¿Qué canciones o audios están en tendencia ESTA SEMANA en TikTok e Instagram Reels en México para contenido de deportes, wellness, lifestyle premium y familias activas? Dame 4-5 opciones reales.

Para cada canción incluye: nombre, artista, BPM aproximado, mood/energía, por qué está viral ahora, y en qué tipo de Reel funciona mejor (clip de cancha, amanecer en club, celebración, lifestyle aspiracional, familia).

FILTRO OBLIGATORIO — evalúa cada canción antes de reportarla:
✅ Recomienda: instrumental o letra que evoque energía positiva, superación, alegría, naturaleza, amor, unidad. Beats sin letra, pop melódico, acústico, ambient positivo, phonk sin agresión, electrónica limpia.
❌ Descarta automáticamente: letras con contenido sexual explícito, referencias a violencia/alcohol/drogas/apuestas, mensajes nihilistas u ofensivos. Reggaeton/trap con letra explícita.
⚠️ Indica advertencia si: la canción es neutral pero el artista tiene controversia pública, o el audio se usa en contextos inapropiados aunque el track sea instrumental.

Contexto del club: ambiente familiar premium, valores de comunidad y excelencia deportiva. Tono aspiracional y positivo — nunca agresivo ni provocador.

Fecha: ${semana} 2026.`,
      'sonar-pro'
    ),
    perplexityAsk(
      `¿Qué consume en redes sociales el segmento premium en México y zona Vallarta? Perfil: familias con ingreso alto, expats norteamericanos en Riviera Nayarit, parejas profesionales 28-45 años que van a un club deportivo premium. Qué cuentas siguen, qué formatos guardan o comparten, qué los hace tomar acción (registrarse, compartir, visitar). Sé específico y concreto.`,
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
  const musicTrendsRaw = trunc(musicRaw, 1200)

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
- hook.text: La primera oración exacta que aparece en pantalla o dice el creador. Impactante, completa, en presente. Sin límite de palabras.
- platforms.reel: Descríbelo como director de cine: plano de apertura (qué se ve exactamente), texto en pantalla en los primeros 3s, ritmo de cortes, duración total, cierre/CTA visual, qué emoción debe sentir el espectador al terminar. Mínimo 3 oraciones.
- platforms.tiktok: Adaptación de tono y hook para TikTok — más casual, texto desde segundo 0, energía diferente.
- step1/step2/step3: Guión real por momento. Qué dice el audio/texto en pantalla, qué se muestra, qué construye emocionalmente. No resúmenes, notas de producción reales.
- music: Propón 4-5 opciones de canciones para que el admin elija. SOLO canciones ✅ (sin letra explícita, violencia, alcohol ni contenido sexual). Para cada opción: title, artist, bpm, mood y why (por qué esta canción encaja con este reel específico). El admin decide cuál usar.
- trendConnection: Conexión directa con la tendencia real detectada esta semana. Por qué ahora, por qué Bahía.

FILTRO DE CALIDAD — CRÍTICO:
- Cada idea debe pasar este test: "¿Un socio potencial de Bahía que paga $6,500/mes vería este reel y pensaría 'esto es para mí'?" Si no, descártala.
- Evita ideas genéricas de gym o deporte sin ángulo específico de Bahía.
- Las tendencias deben ser reales y verificables, no suposiciones.

REGLAS:
- Máximo 3 trends, 3 googleTrends, 3 contentOpportunities, 2 viralPatterns, 4 contentIdeas
- hashtags por idea: máximo 5 tags · triggerWords: máximo 3 elementos

Devuelve ÚNICAMENTE el JSON, sin markdown:
{"generatedAt":"${generatedAt}","period":"${mes}","trends":[{"topic":"string","score":0,"angle":"string","evidence":"string"}],"googleTrends":[{"keyword":"string","avgScore":0,"trend":"string","insight":"string"}],"seasonality":{"touristFlow":"string","dominantProfile":"string","peakWindow":"string","localMarket":"string","insight":"string"},"strategy":{"primarySegment":"string","secondarySegment":"string","message":"string","avoid":"string"},"competitive":{"topCompetitors":["string"],"theirAngle":"string","gap":"string","counterPositioning":"string"},"audienceWhere":{"accounts":["string"],"contentTypes":["string"],"ownHashtags":["#tag"],"insight":"string"},"hashtags":{"masivos":["#tag"],"nicho":["#tag"],"locales":["#tag"],"mixRecomendado":"string"},"contentOpportunities":[{"instalacion":"string","oportunidad":"string","momento":"string","formatoIdeal":"string","urgencia":0}],"viralPatterns":[{"pattern":"string","description":"string","whyItWorks":"string","adaptForBahia":"string","differentiator":"string"}],"contentIdeas":[{"title":"string","format":"Reel","hook":{"text":"string","pattern":"string","triggerWords":["string"]},"copyStructure":{"framework":"PAS","step1":"string","step2":"string","step3":"string","cta":"string"},"platforms":{"reel":"string","tiktok":"string","stories":"string","carrusel":"string"},"music":[{"title":"string","artist":"string","bpm":0,"mood":"string","why":"string"}],"instalacion":"string","targetSegment":"string","hashtags":["#tag"],"trendConnection":"string","urgency":0}]}`

  const consolidated = await ask(prompt, [{
    role: 'user',
    content: [
      `TENDENCIAS REALES ESTA SEMANA (${semana}):\n${socialTrends}`,
      `ESTACIONALIDAD ${mes.toUpperCase()}:\n${seasonalityRaw}`,
      `FORMATOS VIRALES QUE FUNCIONAN AHORA:\n${viralPatternsRaw}`,
      `HASHTAGS EFECTIVOS:\n${hashtagsRaw}`,
      `COMPETENCIA LOCAL:\n${competitiveRaw}`,
      musicTrendsRaw ? `MÚSICA EN TENDENCIA ESTA SEMANA (TikTok/Reels MX):\n${musicTrendsRaw}` : '',
      metaAdsRaw ? `META ADS COMPETIDORES:\n${metaAdsRaw}` : '',
      `AUDIENCIA PREMIUM (qué consume, qué comparte):\n${trunc(audienceRaw, 1000)}`,
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
    music?: { title: string; artist: string; bpm: number; mood: string; why: string }[]
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
