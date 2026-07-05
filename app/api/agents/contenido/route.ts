export const dynamic = 'force-dynamic'
export const maxDuration = 300 // genera 3 variantes (varias llamadas a Claude) — necesita margen
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { askMetered } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp'
import { getClubContext, contextToPrompt, type ClubEvent } from '@/lib/context'
import { CLIENT } from '@/lib/client.config'

type ContentIdea = {
  title: string
  format: string
  hook: { text: string; pattern: string; triggerWords: string[] }
  copyStructure: { framework: string; step1: string; step2: string; step3: string; cta: string }
  platforms: { reel: string; tiktok: string; stories: string; carrusel: string }
  instalacion: string
  targetSegment: string
  hashtags: string[]
  trendConnection: string
  urgency: number
}

type Strategy = {
  primarySegment: string
  secondarySegment: string
  message: string
  avoid: string
}

type ClubAsset = {
  id: string
  url: string
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
}


type Slide = { slide: number; headline: string; body: string; photo?: string }
type Carousel = { caption: string; slides: Slide[]; angle?: string }

// Una variante del carrusel promocional (para rotación cuando el crítico ve que baja la curva)
type PromoVariant = {
  creativeId: string | null
  angle: string
  carousel: Carousel
  aiScore: number | null
  photosNeeded: string[]
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Modo SUGERENCIAS (barra de apoyo): de una idea/tema del club, genera 3-4
  // sugerencias DETALLADAS (guía de producción, no drafts de IA) + califica c/u.
  if (body.mode === 'sugerencias') {
    const ideaText: string = (body.idea ?? body.trend?.topic ?? '').toString()
    if (!ideaText.trim()) return NextResponse.json({ error: 'Se requiere una idea' }, { status: 400 })
    return sugerenciasContenido(ideaText)
  }

  // Modo APROBAR: el admin aprueba una variante → se marca y se generan 2 más
  // del MISMO estilo (cola de rotación) + el brief de video complementario.
  if (body.mode === 'aprobar') {
    if (!body.creativeId) return NextResponse.json({ error: 'Se requiere creativeId' }, { status: 400 })
    return aprobarVariante(String(body.creativeId))
  }

  // Modo GENERAR (default): 3 variantes promocionales con ángulos DISTINTOS,
  // basadas en la tendencia/idea, para que el admin elija una.
  const idea: ContentIdea | null = body.idea ?? null
  const strategy: Strategy | null = body.strategy ?? null
  const trend = body.trend ?? null

  if (!idea && !trend) {
    return NextResponse.json({ error: 'Se requiere idea o trend' }, { status: 400 })
  }

  const instalacion = idea?.instalacion ?? null
  const [ctx, availableAssets, lastApproved, lastRejected] = await Promise.all([
    getClubContext({ agents: ['contenido'], days: 14 }),
    fetchBestAssets(instalacion),
    prisma.creatives.findFirst({ where: { type: 'carrusel', status: 'aprobado' }, orderBy: { created_at: 'desc' }, select: { content: true } }),
    prisma.creatives.findFirst({ where: { type: 'carrusel', status: 'rechazado' }, orderBy: { created_at: 'desc' }, select: { content: true } }),
  ])
  const upcomingEvents = ctx.upcomingEvents
  const sharedContext = contextToPrompt({ ...ctx, upcomingEvents: [] })
  let contexto = buildContexto(idea, strategy, trend, upcomingEvents, availableAssets, 'Carrusel', sharedContext)

  const captionOf = (c: { content: unknown } | null): string | null => {
    try { return (c?.content as { carousel?: { caption?: string } } | null)?.carousel?.caption ?? null } catch { return null }
  }
  // Aprende del último carrusel que el admin YA aprobó: lo usa como referencia de tono (no lo copia).
  const approvedCaption = captionOf(lastApproved)
  if (approvedCaption) {
    contexto += `\n\nREFERENCIA DE ESTILO — un carrusel que el admin YA aprobó (mismo tono premium; NO lo copies, inspírate en su voz): "${approvedCaption.slice(0, 400)}"`
  }
  // Aprende de lo RECHAZADO: evita repetir el enfoque que el admin descartó.
  const rejectedCaption = captionOf(lastRejected)
  if (rejectedCaption) {
    contexto += `\n\nEVITAR — un carrusel que el admin RECHAZÓ (NO repitas este enfoque, ángulo ni tono): "${rejectedCaption.slice(0, 400)}"`
  }

  // 3 ángulos distintos generados EN PARALELO (antes secuencial → ~3× más lento).
  const ANGLE_HINTS = [
    'Comunidad y pertenencia — el club como "tu gente", lo social y el ambiente.',
    'Aspiracional premium — la experiencia, el lifestyle y la calidad de las instalaciones.',
    'Beneficio directo — una razón concreta para venir YA (promo, Day Pass, evento).',
  ]
  const built = await Promise.all(ANGLE_HINTS.map(async (hint, i) => {
    const carousel = await generateCarousel(contexto, idea, { angleHint: hint })
    if (!carousel) return null
    const allCopy = carousel.slides.map(s => `${s.headline}. ${s.body}`).join(' ')
    const aiScore = await checkAiScore(allCopy)
    const photosNeeded = buildPhotoRequests(carousel, idea, availableAssets.length)
    const creative = await prisma.creatives.create({
      data: {
        type: 'carrusel',
        content: { idea, trend, carousel, availableAssets, aiScore, variant: i + 1, angle: carousel.angle, rol: 'inicial' } as Prisma.InputJsonValue,
        status: 'borrador',
      },
      select: { id: true },
    })
    return { creativeId: creative.id, angle: carousel.angle ?? `Variante ${i + 1}`, carousel, aiScore, photosNeeded } as PromoVariant
  }))
  const variants = built.filter((v): v is PromoVariant => v !== null)

  if (variants.length === 0) {
    return NextResponse.json({ error: 'Error generando el carrusel' }, { status: 500 })
  }

  await notifyAdmin({ titulo: idea?.title ?? trend?.topic ?? 'Nueva promo', variants })

  return NextResponse.json({ mode: 'generar', variants })
}

// ─── Aprobar una variante → marcar + derivar 2 del mismo estilo (rotación) ────
async function aprobarVariante(creativeId: string) {
  const creative = await prisma.creatives.findUnique({ where: { id: creativeId }, select: { content: true } })
  if (!creative) return NextResponse.json({ error: 'Creativo no encontrado' }, { status: 404 })

  const content = creative.content as unknown as {
    idea?: ContentIdea | null
    trend?: { topic: string; angle: string } | null
    carousel?: Carousel
    angle?: string
  }
  const approved = content.carousel
  if (!approved) return NextResponse.json({ error: 'El creativo no tiene carrusel' }, { status: 400 })

  const idea = content.idea ?? null
  const trend = content.trend ?? null
  const approvedAngle = approved.angle ?? content.angle ?? 'estilo aprobado'

  // Marca la aprobada
  await prisma.creatives.update({ where: { id: creativeId }, data: { status: 'aprobado' } })

  // Reconstruye contexto para derivar
  const instalacion = idea?.instalacion ?? null
  const [ctx, availableAssets] = await Promise.all([
    getClubContext({ agents: ['contenido'], days: 14 }),
    fetchBestAssets(instalacion),
  ])
  const upcomingEvents = ctx.upcomingEvents
  const sharedContext = contextToPrompt({ ...ctx, upcomingEvents: [] })
  const contexto = buildContexto(idea, null, trend, upcomingEvents, availableAssets, 'Carrusel', sharedContext)

  // 2 variantes del MISMO estilo → cola de rotación (status 'en_cola')
  const DERIVED_COUNT = 2
  const derived: PromoVariant[] = []
  for (let i = 0; i < DERIVED_COUNT; i++) {
    const carousel = await generateCarousel(contexto, idea, { styleRef: { angle: approvedAngle, caption: approved.caption } })
    if (!carousel) continue
    const allCopy = carousel.slides.map(s => `${s.headline}. ${s.body}`).join(' ')
    const aiScore = await checkAiScore(allCopy)
    const photosNeeded = buildPhotoRequests(carousel, idea, availableAssets.length)
    const c = await prisma.creatives.create({
      data: {
        type: 'carrusel',
        content: { idea, trend, carousel, availableAssets, aiScore, angle: carousel.angle, rol: 'rotacion', derivadaDe: creativeId } as Prisma.InputJsonValue,
        status: 'en_cola',
      },
      select: { id: true },
    })
    derived.push({ creativeId: c.id, angle: carousel.angle ?? `Rotación ${i + 1}`, carousel, aiScore, photosNeeded })
  }

  // Brief de video complementario REAL (sin IA) para la promo aprobada
  const videoBrief = await generateReelBrief(contexto, idea, upcomingEvents)

  await notifyAdmin({ titulo: `Aprobada: ${approvedAngle} · cola de rotación`, variants: derived, videoBrief })

  return NextResponse.json({ mode: 'aprobar', approvedId: creativeId, derived, videoBrief })
}

// ─── Voz de marca + guías (horneadas de las skills de tono / caption / collage) ───
const BRAND_VOICE = `VOZ DE MARCA BAHÍA — aplícala siempre:
• Personalidad: premium pero cálida; aspiracional sin presumir; comunidad y pertenencia (NO individualismo de gym).
• Sí: lenguaje sensorial (mar, luz, movimiento), pertenencia ("tu lugar", "los nuestros"), confianza serena, verbos activos.
• No: clichés de gym ("sin excusas", "no pain no gain"), urgencia agresiva, tecnicismos fríos, exceso de emojis.
• Mecánica: frases cortas, una idea por línea, español de México natural. Premium = claridad y calma, no gritar.`

const CAPTION_GUIDE = `CAPTION (estilo caption-writer): arranca con un GANCHO en la primera línea (lo que se ve antes del "ver más"); 1-2 ideas, escaneable, sin relleno; cierra con un CTA suave y claro; 3-5 hashtags relevantes al final (mezcla nicho + local), nunca masivos genéricos.`

const COLLAGE_GUIDE = `Si el contenido usa VARIAS fotos del mismo evento, propón un COLLAGE: rejilla limpia (2×2, o una foto "héroe" grande + 2-3 de apoyo), jerarquía visual clara, márgenes consistentes, estilo editorial premium, sin saturar.`

// ─── Sugerencias de contenido (apoyo de ideas) — guía detallada + score c/u ───
// NO escribe drafts: da una guía de producción de cómo crear cada idea.
async function sugerenciasContenido(ideaText: string) {
  const last = await prisma.agent_memory.findFirst({
    where: { agent: 'tendencias', type: 'briefing' },
    orderBy: { created_at: 'desc' },
    select: { content: true },
  })

  let trendsSummary = 'No hay un reporte de tendencias reciente; sugiere con criterio general de club deportivo premium.'
  if (last?.content) {
    try {
      const r = JSON.parse(last.content) as {
        trends?: { topic: string; angle: string; score: number }[]
        strategy?: { message?: string }
        seasonality?: { insight?: string }
      }
      const tr = (r.trends ?? []).map(t => `- ${t.topic} (${t.score}/100): ${t.angle}`).join('\n')
      trendsSummary = [
        tr && `TENDENCIAS DE LA SEMANA:\n${tr}`,
        r.strategy?.message && `Mensaje estratégico: ${r.strategy.message}`,
        r.seasonality?.insight && `Temporada: ${r.seasonality.insight}`,
      ].filter(Boolean).join('\n') || trendsSummary
    } catch { /* usa el default */ }
  }

  const raw = await askMetered(
    'CONTENIDO',
    `Eres el estratega de contenido de ${CLIENT.name} (${CLIENT.industry} en ${CLIENT.location.city}).
El club tiene una idea/tema y quiere APOYO para crear su propio contenido (reels, historias, posts).
NO escribas el contenido final ni drafts de IA: da una GUÍA DE PRODUCCIÓN detallada. Propón 3-4 sugerencias DISTINTAS de cómo ejecutar la idea, y detalla cómo se haría cada una.

${BRAND_VOICE}

CALIFICACIÓN (score 0-10): combina (a) alineación con las tendencias de la semana, (b) encaje con la VOZ DE MARCA de ${CLIENT.shortName}, y (c) fuerza del gancho. El campo "why" debe nombrar esos factores.
${CAPTION_GUIDE}

Devuelve SOLO este JSON, sin markdown:
{"suggestions":[{"format":"Reel|Historia|Post|Carrusel","title":"nombre corto de la idea","concept":"el ángulo: de qué trata y por qué funciona (1-2 oraciones)","hook":"el gancho / primeros 3 segundos","music":"audio o música sugerida si aplica (si no, vacío)","duration":"duración sugerida si es reel/historia (si no, vacío)","execution":"cómo se haría: tomas, qué aparece en cuadro, texto en pantalla, ritmo (2-4 oraciones)","score":número 0-10,"why":"1 oración: por qué ese score, conectando con tendencias"}]}`,
    [{ role: 'user', content: `IDEA / TEMA DEL CLUB:\n"${ideaText}"\n\n${trendsSummary}` }],
    2500,
  )

  let parsed: { suggestions?: unknown[] } | null = null
  try {
    const s = raw.indexOf('{')
    const e = raw.lastIndexOf('}')
    if (s !== -1 && e !== -1) parsed = JSON.parse(raw.slice(s, e + 1))
  } catch { /* */ }

  const suggestions = Array.isArray(parsed?.suggestions) ? parsed!.suggestions : []
  if (suggestions.length === 0) return NextResponse.json({ error: 'No se pudieron generar sugerencias' }, { status: 500 })

  return NextResponse.json({ mode: 'sugerencias', idea: ideaText, suggestions })
}

// ─── Consultas a Supabase ─────────────────────────────────────────────────────

async function fetchBestAssets(instalacion: string | null): Promise<ClubAsset[]> {
  const rows = await prisma.club_assets.findMany({
    where: instalacion ? { instalacion } : {},
    orderBy: { used_count: 'asc' }, // prioriza los menos usados
    take: 6,
  })
  return rows.map(a => ({
    id: a.id, url: a.url,
    instalacion: a.instalacion ?? '', description: a.description ?? '',
    mood: a.mood ?? '', time_of_day: a.time_of_day ?? '', people: a.people ?? false,
    score_reel: a.score_reel ?? 0, score_foto: a.score_foto ?? 0, score_stories: a.score_stories ?? 0,
    best_format: a.best_format ?? '', content_angles: a.content_angles ?? [],
  }))
}

// ─── Construcción de contexto ─────────────────────────────────────────────────

function buildContexto(
  idea: ContentIdea | null,
  strategy: Strategy | null,
  trend: { topic: string; angle: string } | null,
  events: ClubEvent[],
  assets: ClubAsset[],
  format: string,
  sharedContext = '',
): string {
  const lines: string[] = []

  if (idea) {
    lines.push(
      `Título: ${idea.title}`,
      `Formato decidido: ${format}`,
      `Instalación destacada: ${idea.instalacion}`,
      `Segmento objetivo: ${idea.targetSegment}`,
      `Hook sugerido: "${idea.hook.text}" (patrón: ${idea.hook.pattern})`,
      `Estructura del copy (${idea.copyStructure.framework}):`,
      `  Paso 1: ${idea.copyStructure.step1}`,
      `  Paso 2: ${idea.copyStructure.step2}`,
      `  Paso 3: ${idea.copyStructure.step3}`,
      `  CTA: ${idea.copyStructure.cta}`,
      `Conexión con tendencia: ${idea.trendConnection}`,
      `Hashtags: ${idea.hashtags.join(' ')}`,
    )
  } else if (trend) {
    lines.push(`Tendencia: ${trend.topic}`, `Ángulo: ${trend.angle}`)
  }

  if (strategy) {
    lines.push(``, `Estrategia: ${strategy.message}`, `Evitar: ${strategy.avoid}`)
  }

  if (events.length) {
    lines.push(``, `Eventos próximos del club (úsalos si son relevantes):`)
    events.forEach(e => {
      const cuando = e.recurrence ? `cada ${e.recurrence}` : e.start_date ?? ''
      lines.push(`  - ${e.name} (${e.sport}, ${cuando} ${e.time_of_day}) — potencial ${e.content_potential}/10`)
    })
  }

  if (assets.length) {
    lines.push(``, `Assets disponibles del club:`)
    assets.forEach(a => {
      lines.push(`  - ${a.instalacion}: ${a.description} | mood: ${a.mood} | mejor para: ${a.best_format} (reel:${a.score_reel} foto:${a.score_foto})`)
    })
  }

  if (sharedContext) {
    lines.push('', sharedContext)
  }

  return lines.join('\n')
}

// ─── Generación de contenido ──────────────────────────────────────────────────

async function generateCarousel(
  contexto: string,
  idea: ContentIdea | null,
  opts: { avoidAngles?: string[]; styleRef?: { angle: string; caption: string }; angleHint?: string } = {},
): Promise<Carousel | null> {
  const { avoidAngles = [], styleRef, angleHint } = opts

  // 1a variante (sin avoid/styleRef/hint): respeta el hook de la idea. Si no, hook nuevo.
  const hookInstruction = idea && avoidAngles.length === 0 && !styleRef && !angleHint
    ? `Usa EXACTAMENTE este hook para el slide 1: "${idea.hook.text}" — agrega "Desliza →" al final del body.`
    : 'Crea un hook que detenga el scroll: pregunta directa, afirmación con número o promesa concreta. Termina el body con "Desliza →".'

  const angleInstruction = styleRef
    ? `Esta es una variante de ROTACIÓN en el MISMO estilo y ángulo que la versión aprobada (mismo tono y estructura persuasiva, mismo "angle": "${styleRef.angle}"), pero con copy FRESCO y distinto. La aprobada decía en su caption: "${styleRef.caption}". No la copies; haz una nueva del mismo estilo.`
    : angleHint
      ? `Usa este ÁNGULO creativo para el carrusel: ${angleHint} Desarróllalo con copy fresco y específico; define el "angle" en pocas palabras.`
      : avoidAngles.length
        ? `Esta es una VARIANTE de la MISMA promoción. Usa un ángulo creativo CLARAMENTE distinto a los ya usados: ${avoidAngles.join('; ')}. Mismo objetivo, enfoque persuasivo diferente.`
        : 'Define el "angle": el ángulo creativo del carrusel (su enfoque persuasivo) en pocas palabras.'

  const raw = await askMetered(
    'CONTENIDO',
    `Eres el creador de contenido de ${CLIENT.name} (${CLIENT.industry} en ${CLIENT.location.region}).
Crea un carrusel promocional de Instagram (pauteable) basado en el briefing.
${angleInstruction}

${BRAND_VOICE}

ESTRUCTURA (usa SOLO los slides que el contenido pida — entre 2 y 8. MENOS puede ser mejor; no rellenes para llegar a un número. Si con 2-3 slides la idea queda clara y potente, hazlo así):
• Slide 1 — HOOK: Para el scroll. ${hookInstruction}
• Slides del medio (si los hay) — VALOR: un solo punto por slide, una idea, no dos.
• Último slide — CTA: acción clara y directa. Ej: "Agenda tu visita", "Prueba un Day Pass este finde".

REGLAS DE COPY (sin excepción):
- Tutéa al lector: "tú", "tu cancha", "tu nivel"
- Máximo 30 palabras por body de slide
- Sé específico: no "excelentes instalaciones" → "${CLIENT.facilitiesShort}"
- Sin palabras de relleno: "fundamental", "crucial", "sin duda", "aprovecha al máximo"
- Varía el ritmo: mezcla frases cortas con frases un poco más largas
- Menciona eventos próximos con nombre y fecha si son relevantes
- Sin emojis en los slides

FOTO POR SLIDE (campo "photo") — IMPORTANTE:
Cada slide lleva la descripción ESPECÍFICA de la toma real que necesita: qué se ve exactamente, encuadre, instalación concreta y momento. Concreta, no genérica.
✅ Bien: "Pareja jugando pádel en cancha techada al atardecer, plano medio desde la esquina"
❌ Mal (genérico): "foto de las instalaciones"
${COLLAGE_GUIDE}

${CAPTION_GUIDE}

FORMATO: Instagram 1080×1350 px (4:5).

Devuelve SOLO el JSON sin markdown. Incluye entre 2 y 8 slides en el array (los que el contenido necesite, numerados 1..N):
{"angle":"string (ángulo creativo en pocas palabras)","caption":"texto con hashtags (máx 150 chars, español natural)","slides":[{"slide":1,"headline":"string (máx 7 palabras, impacto)","body":"string (máx 30 palabras)","photo":"descripción específica de la toma para este slide"},{"slide":2,"headline":"string","body":"string","photo":"string"}]}`,
    [{ role: 'user', content: contexto }],
    2200,
  )

  try {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start === -1 || end === -1) return null
    return JSON.parse(raw.slice(start, end + 1))
  } catch {
    return null
  }
}

async function generateReelBrief(contexto: string, idea: ContentIdea | null, events: ClubEvent[]): Promise<string> {
  const eventNote = events.length
    ? `Eventos próximos que puedes usar: ${events.map(e => e.name).join(', ')}.`
    : ''

  return askMetered(
    'CONTENIDO',
    `Eres director de contenido de ${CLIENT.name} (${CLIENT.industry} en ${CLIENT.location.city}).
La persona que recibe este brief maneja el club — no es camarógrafo, pero tiene buen ojo y ganas.
Los Reels del club son recorridos de instalaciones, ambiente real, momentos de partidos, lifestyle de fin de semana. Sin trends de baile ni challenges.
${eventNote}

Escribe el brief como si se lo dijeras en persona. Directo, sin relleno, que lo pueda ejecutar hoy.

1. LA IDEA (1 línea — qué historia cuenta, por qué alguien lo vería completo)
2. LAS TOMAS (3-5 tomas específicas: desde dónde, qué aparece en cuadro, cuántos segundos)
3. EL AUDIO (ambiente del club, música energética, música suave — sé específico)
4. LOS PRIMEROS 3 SEGUNDOS (qué tiene que aparecer para que no deslicen)
5. CAPTION + hashtags

"Graba la alberca desde la esquina norte al atardecer" es útil. "Captura la esencia del club" no lo es.`,
    [{ role: 'user', content: contexto + (idea ? `\nIdea: ${idea.title}` : '') }],
    1000,
  )
}

// ─── Fotos a pedir (material REAL, sin IA) ────────────────────────────────────
// Pide SOLO las fotos que faltan: cubre las primeras láminas con la biblioteca
// (haveCount) y solicita el resto. Si hay suficientes, no pide nada.
function buildPhotoRequests(carousel: Carousel | null, idea: ContentIdea | null, haveCount: number): string[] {
  if (!carousel) return []
  return carousel.slides.slice(Math.max(0, haveCount)).map(s => {
    // Usa la descripción específica de la toma (campo photo); si falta, cae a una genérica.
    const desc = s.photo?.trim() || `foto real de ${idea?.instalacion ?? 'las instalaciones'} que ilustre "${s.headline}"`
    return `Slide ${s.slide}: ${desc}`
  })
}

// ─── Quality check: detect AI patterns ───────────────────────────────────────

async function checkAiScore(text: string): Promise<number | null> {
  const key = process.env.HUMANIZERAI_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://humanizerai.com/api/v1/detect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) return null
    const json = await res.json() as { score?: number }
    return json.score ?? null
  } catch {
    return null
  }
}

// ─── Notificación al admin ────────────────────────────────────────────────────

async function notifyAdmin({
  titulo, variants, videoBrief,
}: {
  titulo: string
  variants: PromoVariant[]
  videoBrief?: string | null
}) {
  if (!process.env.ADMIN_PHONE) return

  const lines: string[] = [
    `🎨 *Contenido — ${titulo}*`,
    `${variants.length} variante(s) de carrusel promocional.`,
    ``,
  ]

  variants.forEach((v, i) => {
    lines.push(`*${i + 1}. ${v.angle}*`)
    lines.push(`   Hook: ${v.carousel.slides[0]?.headline ?? '—'}`)
    if (typeof v.aiScore === 'number') {
      const label = v.aiScore >= 70 ? '✅ natural' : v.aiScore >= 50 ? '⚠️ tono' : '🔴 suena a IA'
      lines.push(`   Naturalidad: ${v.aiScore}/100 ${label}`)
    }
    if (v.photosNeeded.length) lines.push(`   📸 Faltan ${v.photosNeeded.length} foto(s) — revisa el panel`)
    lines.push(`   ID: ${v.creativeId ?? 'sin id'}`)
    lines.push(``)
  })

  if (videoBrief) lines.push(`🎬 *Video complementario (brief real):*`, videoBrief)

  try {
    await sendText(process.env.ADMIN_PHONE, lines.join('\n'))
  } catch (e) {
    console.error('[contenido] sendText falló (se ignora):', e instanceof Error ? e.message : e)
  }
}
