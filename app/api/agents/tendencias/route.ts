export const dynamic = 'force-dynamic'
export const maxDuration = 300 // Vercel Pro — 5 min máx para múltiples llamadas Perplexity + Claude
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { askMetered } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp'
import { CLIENT } from '@/lib/client.config'

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
  const data = await prisma.agent_memory.findFirst({
    where: { agent: 'tendencias', type: 'briefing' },
    orderBy: { created_at: 'desc' },
    select: { content: true, created_at: true },
  })

  if (!data) return ''

  try {
    const prev = JSON.parse(data.content)
    const fecha = new Date(data.created_at ?? new Date()).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    const trends = (prev.trends ?? []).map((t: { topic: string; score: number }) => `${t.topic} (${t.score})`).join(', ')
    const gtrends = (prev.googleTrends ?? []).map((g: { keyword: string; avgScore: number; trend: string }) => `${g.keyword}: ${g.avgScore} (${g.trend})`).join(', ')
    const topIdeas = (prev.contentIdeas ?? []).slice(0, 2).map((i: { title: string }) => i.title).join(', ')
    return `REPORTE ANTERIOR (${fecha}):\n- Tendencias: ${trends}\n- Google Trends: ${gtrends || 'sin datos'}\n- Ideas top: ${topIdeas}\n- Estrategia: ${prev.strategy?.message ?? ''}`
  } catch {
    return ''
  }
}

async function runTendencias(notifyAdmin: boolean) {
  const region = CLIENT.location.searchRegion
  const now = new Date()
  const mes = now.toLocaleString('es-MX', { month: 'long', year: 'numeric' })
  const semana = `semana del ${now.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}`

  const previousReport = await getPreviousReport()

  // Extraer temas previos para evitar repetición (#3: robusto, nunca rompe)
  let prevTopics: string[] = []
  try {
    prevTopics = previousReport
      ? previousReport.match(/Tendencias: ([^\n]+)/)?.[1]?.split(',').map(t => t.trim().split('(')[0].trim()).filter(Boolean) ?? []
      : []
  } catch { prevTopics = [] }
  const avoidInstruction = prevTopics.length
    ? `\nTEMAS YA CUBIERTOS LA SEMANA PASADA (no repetir como tendencia principal): ${prevTopics.join(', ')}. Busca ángulos nuevos, temas adyacentes o tendencias completamente distintas.`
    : ''

  // Keywords y términos de anuncios — desde el config del cliente.
  const keywords = CLIENT.trendKeywords
  const adsTerms = CLIENT.adLibraryTerms

  // PERFIL DEL SOCIO — para filtrar relevancia en todos los prompts (config-driven).
  const audienceProfile = CLIENT.audienceProfile

  const [marketRaw, viralRaw, musicRaw, audienceRaw, metaAdsRaw, ...trendsData] = await Promise.all([
    perplexityAsk(
      `${audienceProfile}

Eres analista de tendencias para ${CLIENT.name}, ${CLIENT.industry} en ${region}. Fecha: ${semana} 2026. Responde estas 3 preguntas separadas con ---.

1. TENDENCIAS CON IMPACTO REAL EN ${CLIENT.shortName.toUpperCase()}: Qué temas están generando conversación ESTA SEMANA en redes sociales entre el perfil de audiencia descrito. Busca señales concretas en: torneos o eventos locales en ${CLIENT.location.region}, tendencias wellness premium (cold plunge, recovery, nutrición deportiva, mindfulness activo), familia activa en vacaciones de verano MX, turismo deportivo en la zona, tendencias de comunidad/pertenencia vs individualismo del gym, lifestyle de expats en la costa. Para cada tendencia: por qué importa específicamente a ${CLIENT.shortName}, qué conversación está generando, señales en redes (hashtags, cuentas, noticias reales).

2. ESTACIONALIDAD ${mes.toUpperCase()} en ${CLIENT.location.region}: Volumen y perfil del visitante esta semana. Comportamiento real del mercado local en vacaciones escolares de verano. Qué tipo de membresía o actividad busca cada segmento.

3. COMPETENCIA DIRECTA: 2-3 clubes en ${CLIENT.location.region} que compitan directamente con ${CLIENT.shortName} en el segmento premium (no gyms masivos). Qué mensajes usan en Instagram/TikTok. Qué gap evidente tienen que ${CLIENT.shortName} puede llenar.`,
      'sonar-pro'
    ),
    perplexityAsk(
      `${audienceProfile}

Responde estas 2 preguntas sobre contenido en redes para un club deportivo premium. Separa con ---. Fecha: ${semana} 2026.

1. FORMATOS VIRALES ESTA SEMANA: 2-3 tipos de Reel/TikTok que están funcionando AHORA para cuentas de deportes premium, wellness de alto nivel o lifestyle en México (<30k seguidores). Para cada formato: qué aparece exactamente en los primeros 3 segundos (plano visual + texto en pantalla), qué emoción activa en el espectador, estructura de edición (cortes, ritmo, duración), y por qué está funcionando en este momento cultural específico.

2. HASHTAGS DE ALTO RENDIMIENTO: Los más efectivos ahora en IG y TikTok para lifestyle deportivo premium en México. 4 masivos (>500k posts), 4 de nicho premium (10k-150k), 3 locales de ${CLIENT.location.region}. Cuáles tienen mejor engagement-to-reach ratio esta semana.`,
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
      `¿Qué consume en redes sociales el segmento premium en México y zona ${CLIENT.location.city}? Perfil: familias con ingreso alto, expats norteamericanos en ${CLIENT.location.region}, parejas profesionales 28-45 años que van a un ${CLIENT.industry}. Qué cuentas siguen, qué formatos guardan o comparten, qué los hace tomar acción (registrarse, compartir, visitar). Sé específico y concreto.`,
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

  // ─── #2 Validación de fuentes: no inventar si vienen vacías ─────────────────
  const has = (s: string, min = 40) => typeof s === 'string' && s.trim().length > min
  const sourceStatus: Record<string, boolean> = {
    tendencias: has(socialTrends), estacionalidad: has(seasonalityRaw), competencia: has(competitiveRaw),
    'formatos virales': has(viralPatternsRaw), hashtags: has(hashtagsRaw, 20),
    música: has(musicTrendsRaw), audiencia: has(audienceRaw),
    'google trends': googleTrendsResults.length > 0, 'meta ads': has(metaAdsRaw, 20),
  }
  const missing = Object.entries(sourceStatus).filter(([, ok]) => !ok).map(([k]) => k)
  const honestyRule = `REGLA DE HONESTIDAD — CRÍTICO: usa SOLO los datos de la investigación de abajo. Si algo no está ahí, NO lo inventes: pon "sin datos verificados esta semana". NUNCA inventes tendencias, scores, canciones ni competidores que no aparezcan en los datos.${missing.length ? ` Esta semana NO llegaron datos de: ${missing.join(', ')} — no inventes nada de eso.` : ''}`

  // Investigación compartida por las 2 llamadas (marca [SIN DATOS] lo vacío)
  const researchContent = [
    `TENDENCIAS REALES ESTA SEMANA (${semana}):\n${socialTrends || '[SIN DATOS]'}`,
    `ESTACIONALIDAD ${mes.toUpperCase()}:\n${seasonalityRaw || '[SIN DATOS]'}`,
    `FORMATOS VIRALES:\n${viralPatternsRaw || '[SIN DATOS]'}`,
    `HASHTAGS EFECTIVOS:\n${hashtagsRaw || '[SIN DATOS]'}`,
    `COMPETENCIA LOCAL:\n${competitiveRaw || '[SIN DATOS]'}`,
    `MÚSICA EN TENDENCIA (TikTok/Reels MX):\n${musicTrendsRaw || '[SIN DATOS]'}`,
    metaAdsRaw ? `META ADS (mercado + clubes deportivos LATAM):\n${metaAdsRaw}` : 'META ADS: [SIN DATOS]',
    `AUDIENCIA PREMIUM:\n${trunc(audienceRaw, 1000) || '[SIN DATOS]'}`,
    googleTrendsResults.length
      ? `GOOGLE TRENDS MX:\n${googleTrendsResults.map(t => `${t.keyword}: ${t.avgScore}/100 (${t.trend})`).join(', ')}`
      : 'GOOGLE TRENDS: [SIN DATOS]',
  ].join('\n\n---\n\n')

  // Contexto base del club, compartido por ambas llamadas
  const baseContext = `Eres el estratega de contenido de ${CLIENT.name}, ${CLIENT.industry} en ${CLIENT.location.address}.

INSTALACIONES: ${CLIENT.facilities}
MEMBRESÍAS: ${CLIENT.membershipsLine}.

${honestyRule}
ANTI-REPETICIÓN:${avoidInstruction}
${previousReport ? `\nREPORTE ANTERIOR:\n${previousReport}\n` : ''}`

  // ─── #1 Generación en 3 llamadas chicas y enfocadas (cada JSON pequeño → ───────
  // ni se trunca ni el modelo "vacía la cola"). A: brief · B: táctico · C: ideas.
  // Llamada A: BRIEF estratégico (análisis; sin oportunidades/patrones/ideas).
  const briefPrompt = `${baseContext}
Genera el BRIEF estratégico de la semana. Conciso: cada texto máximo 2-3 oraciones.
REGLAS: máximo 3 trends, 3 googleTrends · hashtags 4 masivos / 4 nicho / 3 locales.
Devuelve ÚNICAMENTE el JSON, sin markdown:
{"generatedAt":"${generatedAt}","period":"${mes}","trends":[{"topic":"string","score":0,"angle":"string","evidence":"string"}],"googleTrends":[{"keyword":"string","avgScore":0,"trend":"string","insight":"string"}],"seasonality":{"touristFlow":"string","dominantProfile":"string","peakWindow":"string","localMarket":"string","insight":"string"},"strategy":{"primarySegment":"string","secondarySegment":"string","message":"string","avoid":"string"},"competitive":{"topCompetitors":["string"],"theirAngle":"string","gap":"string","counterPositioning":"string"},"audienceWhere":{"accounts":["string"],"contentTypes":["string"],"ownHashtags":["#tag"],"insight":"string"},"hashtags":{"masivos":["#tag"],"nicho":["#tag"],"locales":["#tag"],"mixRecomendado":"string"}}`

  // Llamada B: TÁCTICO — oportunidades por instalación + patrones virales.
  // (Iban al final del brief y el modelo los devolvía vacíos; ahora van solos.)
  const tacticalPrompt = `${baseContext}
Genera el plan TÁCTICO de la semana basado en las tendencias REALES de la investigación.
REGLAS: exactamente 3 contentOpportunities (una por instalación con oportunidad concreta y momento) y 2 viralPatterns (formatos que están funcionando y cómo adaptarlos a ${CLIENT.shortName}). Nada genérico de gym.
Devuelve ÚNICAMENTE el JSON, sin markdown:
{"contentOpportunities":[{"instalacion":"string","oportunidad":"string","momento":"string","formatoIdeal":"string","urgencia":0}],"viralPatterns":[{"pattern":"string","description":"string","whyItWorks":"string","adaptForBahia":"string","differentiator":"string"}]}`

  // Llamada B: IDEAS de contenido ejecutables (la parte pesada, con música).
  const musicRule = sourceStatus['música']
    ? 'music: exactamente 4 opciones reales sacadas de la música provista. SOLO canciones ✅ (sin letra explícita, violencia, alcohol).'
    : 'music: NO hubo música verificada esta semana → deja "music":[] (vacío). NO inventes canciones.'
  const ideasPrompt = `${baseContext}
${HOOK_PATTERNS_CONTEXT}
${COPYWRITING_CONTEXT}
${REPURPOSING_CONTEXT}
Genera 3 ideas de contenido EJECUTABLES basadas en las tendencias REALES de la investigación.
- hook.text: la primera oración exacta en pantalla, impactante y completa.
- platforms.reel: como director de cine — plano de apertura, texto en pantalla a los 3s, ritmo de cortes, duración, cierre/CTA, emoción final. Mínimo 3 oraciones.
- platforms.tiktok/stories/carrusel: adaptación por plataforma.
- copyStructure.step1/step2/step3: guión real por momento (notas de producción).
- ${musicRule}
- trendConnection: conexión directa con una tendencia REAL de la investigación (no inventes).
FILTRO: cada idea debe pasar "¿un socio que paga ${CLIENT.topMembershipPrice}/mes pensaría 'esto es para mí'?". Nada genérico de gym.
Devuelve ÚNICAMENTE el JSON, sin markdown:
{"contentIdeas":[{"title":"string","format":"Reel","hook":{"text":"string","pattern":"string","triggerWords":["string"]},"copyStructure":{"framework":"PAS","step1":"string","step2":"string","step3":"string","cta":"string"},"platforms":{"reel":"string","tiktok":"string","stories":"string","carrusel":"string"},"music":[{"title":"string","artist":"string","bpm":0,"mood":"string","why":"string"}],"instalacion":"string","targetSegment":"string","hashtags":["#tag"],"trendConnection":"string","urgency":0}]}`

  const [briefRaw, tacticalRaw, ideasRaw] = await Promise.all([
    askMetered('TENDENCIAS', briefPrompt, [{ role: 'user', content: researchContent }], 3500),
    askMetered('TENDENCIAS', tacticalPrompt, [{ role: 'user', content: researchContent }], 2500),
    askMetered('TENDENCIAS', ideasPrompt, [{ role: 'user', content: researchContent }], 8000),
  ])

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

  const parseObj = <T,>(raw: string): T | null => {
    try {
      const start = raw.indexOf('{')
      const end = raw.lastIndexOf('}')
      if (start === -1 || end === -1) return null
      return JSON.parse(raw.slice(start, end + 1)) as T
    } catch {
      return null
    }
  }

  type Brief = Omit<Analysis, 'contentIdeas' | 'contentOpportunities' | 'viralPatterns'>
  type Tactical = Pick<Analysis, 'contentOpportunities' | 'viralPatterns'>

  // Parse de cada llamada con retry individual si vino vacía o inválida.
  let brief = parseObj<Brief>(briefRaw)
  if (!brief || !Array.isArray(brief.trends)) {
    brief = parseObj<Brief>(await askMetered('TENDENCIAS', `${briefPrompt}\n\nEl JSON anterior llegó inválido. Devuelve SOLO el JSON completo y válido.`, [{ role: 'user', content: researchContent }], 3500))
  }

  // Táctico: retry si vino vacío (era el síntoma — el modelo vaciaba la cola del brief).
  let tactical = parseObj<Tactical>(tacticalRaw)
  if (!tactical || !Array.isArray(tactical.contentOpportunities) || tactical.contentOpportunities.length === 0) {
    tactical = parseObj<Tactical>(await askMetered('TENDENCIAS', `${tacticalPrompt}\n\nEl JSON anterior llegó vacío o inválido. Devuelve SOLO el JSON con 3 contentOpportunities y 2 viralPatterns.`, [{ role: 'user', content: researchContent }], 2500))
  }

  // Ideas: retry si vino vacío. Es la parte pesada → presupuesto de tokens alto.
  let ideas = parseObj<{ contentIdeas: ContentIdea[] }>(ideasRaw)?.contentIdeas
  if (!Array.isArray(ideas) || ideas.length === 0) {
    ideas = parseObj<{ contentIdeas: ContentIdea[] }>(await askMetered('TENDENCIAS', `${ideasPrompt}\n\nEl JSON anterior llegó vacío o inválido. Devuelve SOLO el JSON con 3 ideas completas.`, [{ role: 'user', content: researchContent }], 8000))?.contentIdeas
  }

  if (!brief) {
    return NextResponse.json({ error: 'No se pudo generar el brief de tendencias' }, { status: 500 })
  }

  const analysis = {
    ...brief,
    contentOpportunities: Array.isArray(tactical?.contentOpportunities) ? tactical.contentOpportunities : [],
    viralPatterns: Array.isArray(tactical?.viralPatterns) ? tactical.viralPatterns : [],
    contentIdeas: Array.isArray(ideas) ? ideas : [],
  } as Analysis

  // Blindaje — nunca crashear por un campo faltante si Claude devolvió JSON parcial.
  analysis.trends ??= []
  analysis.googleTrends ??= []
  analysis.contentOpportunities ??= []
  analysis.viralPatterns ??= []
  analysis.contentIdeas ??= []
  analysis.hashtags ??= { masivos: [], nicho: [], locales: [], mixRecomendado: '' }
  analysis.hashtags.masivos ??= []
  analysis.hashtags.nicho ??= []
  analysis.hashtags.locales ??= []
  analysis.seasonality ??= { touristFlow: '', dominantProfile: '—', peakWindow: '—', localMarket: '', insight: '—' }
  analysis.strategy ??= { primarySegment: '—', secondarySegment: '', message: '—', avoid: '—' }
  analysis.competitive ??= { topCompetitors: [], theirAngle: '—', gap: '', counterPositioning: '—' }
  analysis.audienceWhere ??= { accounts: [], contentTypes: [], ownHashtags: [], insight: '' }

  // Descarta ideas incompletas (si Claude truncó la respuesta, la última idea
  // puede quedar a medias sin copyStructure/hook/platforms). Nos quedamos solo
  // con las ideas completas en lugar de crashear o mostrar datos rotos.
  analysis.contentIdeas = analysis.contentIdeas.filter(i =>
    i && typeof i.title === 'string'
    && i.hook && typeof i.hook.text === 'string'
    && i.copyStructure && typeof i.copyStructure.framework === 'string'
    && i.platforms,
  )
  analysis.contentOpportunities = analysis.contentOpportunities.filter(o =>
    o && typeof o.instalacion === 'string' && typeof o.oportunidad === 'string',
  )
  analysis.trends = analysis.trends.filter(t => t && typeof t.topic === 'string')

  // Los Google Trends mostrados deben ser los REALES (keywords fijas consultadas a
  // LinkFox) con su score real — NO las que invente Claude (que no matchean y se
  // perdían). Si hay datos reales, reemplazamos; conservamos el insight de Claude
  // cuando habló de un keyword parecido.
  if (googleTrendsResults.length) {
    const claudeGT = analysis.googleTrends ?? []
    analysis.googleTrends = googleTrendsResults.map(r => {
      const ci = claudeGT.find(g => {
        const a = (g.keyword ?? '').toLowerCase(), b = r.keyword.toLowerCase()
        return a && (a.includes(b) || b.includes(a))
      })
      return {
        keyword: r.keyword,
        avgScore: r.avgScore,
        trend: r.trend,
        insight: ci?.insight || `Interés ${r.trend} en México — promedio ${r.avgScore}/100 (últimos 30 días).`,
      }
    })
  }

  // Guardar reporte completo en agent_memory — consultable por todos los agentes
  await prisma.agent_memory.create({
    data: {
      agent: 'tendencias',
      type: 'briefing',
      content: JSON.stringify(analysis),
      outcome: 'neutro',
    },
  })

  // Guardar tendencias individuales
  await prisma.trends.createMany({
    data: analysis.trends.map(t => ({ topic: t.topic, score: t.score, source: 'perplexity+claude', region })),
  })

  // NOTA: la generación de carrusel promocional NO se dispara aquí (sería diaria).
  // El ciclo de pauta corre cada 14 días vía el cron /api/cron/promo-cycle, que
  // lee este reporte y genera las 3 variantes. Aquí solo se guarda el briefing.

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

    if (process.env.ADMIN_PHONE) {
      try { await sendText(process.env.ADMIN_PHONE, msg) }
      catch (e) { console.error('[tendencias] sendText falló:', e instanceof Error ? e.message : e) }
    }
  }

  return NextResponse.json(analysis)
}
