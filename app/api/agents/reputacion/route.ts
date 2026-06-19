export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ask } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp'

// POST /api/agents/reputacion  — procesa reseñas nuevas de Google Maps
// GET  /api/agents/reputacion  — devuelve el último análisis guardado
//
// Estado: skeleton listo. Se activa cuando el dueño proporcione:
//   GOOGLE_BUSINESS_ACCOUNT_ID   → formato: accounts/123456789
//   GOOGLE_BUSINESS_LOCATION_ID  → formato: locations/987654321
//   GOOGLE_ACCESS_TOKEN          → OAuth 2.0 desde Google Cloud Console
//
// API: https://mybusiness.googleapis.com/v4

const GBP_BASE = 'https://mybusiness.googleapis.com/v4'

type Review = {
  reviewId: string
  reviewer: { displayName: string; profilePhotoUrl?: string }
  starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE'
  comment?: string
  createTime: string
  updateTime: string
  reviewReply?: { comment: string; updateTime: string }
}

type ReviewAnalysis = {
  reviewId: string
  reviewer: string
  stars: number
  comment: string
  sentiment: 'positivo' | 'neutro' | 'negativo'
  themes: string[]
  suggestedReply: string
  priority: 'alta' | 'media' | 'baja'
  replyPosted: boolean
}

const STAR_MAP: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 }

async function fetchReviews(): Promise<Review[]> {
  const accountId = process.env.GOOGLE_BUSINESS_ACCOUNT_ID
  const locationId = process.env.GOOGLE_BUSINESS_LOCATION_ID
  const token = process.env.GOOGLE_ACCESS_TOKEN

  if (!accountId || !locationId || !token) return []

  try {
    const res = await fetch(
      `${GBP_BASE}/${accountId}/${locationId}/reviews?pageSize=20&orderBy=updateTime%20desc`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.reviews ?? []) as Review[]
  } catch {
    return []
  }
}

async function postReply(reviewId: string, reply: string): Promise<boolean> {
  const accountId = process.env.GOOGLE_BUSINESS_ACCOUNT_ID
  const locationId = process.env.GOOGLE_BUSINESS_LOCATION_ID
  const token = process.env.GOOGLE_ACCESS_TOKEN

  if (!accountId || !locationId || !token) return false

  try {
    const res = await fetch(
      `${GBP_BASE}/${accountId}/${locationId}/reviews/${reviewId}/reply`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: reply }),
      }
    )
    return res.ok
  } catch {
    return false
  }
}

async function analyzeReview(review: Review): Promise<ReviewAnalysis> {
  const stars = STAR_MAP[review.starRating] ?? 3
  const comment = review.comment ?? ''
  const reviewer = review.reviewer.displayName

  const raw = await ask(
    `Eres el community manager de Bahía Social Sports Club, club deportivo premium en Nuevo Vallarta.
Analiza esta reseña de Google Maps y devuelve SOLO JSON sin markdown:
{
  "sentiment": "positivo|neutro|negativo",
  "themes": ["tema1","tema2"],
  "suggestedReply": "respuesta en español, cálida, profesional, máx 3 oraciones. Si es negativa, reconoce, agradece y ofrece solución concreta. Si es positiva, personaliza con detalle de la reseña y invita a volver.",
  "priority": "alta|media|baja"
}
Priority: alta = 1-2 estrellas o crítica grave · media = 3 estrellas o menciona un problema · baja = 4-5 estrellas positiva`,
    [{ role: 'user', content: `Reseñador: ${reviewer}\nEstrellas: ${stars}/5\nComentario: "${comment}"` }]
  )

  let parsed: { sentiment: string; themes: string[]; suggestedReply: string; priority: string } = {
    sentiment: stars >= 4 ? 'positivo' : stars >= 3 ? 'neutro' : 'negativo',
    themes: [],
    suggestedReply: '',
    priority: stars <= 2 ? 'alta' : stars === 3 ? 'media' : 'baja',
  }
  try {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start !== -1 && end !== -1) parsed = JSON.parse(raw.slice(start, end + 1))
  } catch { /* usa defaults */ }

  return {
    reviewId: review.reviewId,
    reviewer,
    stars,
    comment,
    sentiment: parsed.sentiment as ReviewAnalysis['sentiment'],
    themes: parsed.themes,
    suggestedReply: parsed.suggestedReply,
    priority: parsed.priority as ReviewAnalysis['priority'],
    replyPosted: false,
  }
}

export async function GET() {
  const { data } = await supabase
    .from('agent_memory')
    .select('content, created_at')
    .eq('agent', 'reputacion')
    .eq('type', 'analysis')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) {
    const hasCredentials = !!(
      process.env.GOOGLE_BUSINESS_ACCOUNT_ID &&
      process.env.GOOGLE_BUSINESS_LOCATION_ID &&
      process.env.GOOGLE_ACCESS_TOKEN
    )
    return NextResponse.json({
      error: 'Sin análisis generado aún',
      ready: hasCredentials,
      hint: hasCredentials
        ? 'Llama a POST /api/agents/reputacion para analizar reseñas'
        : 'Faltan credenciales: GOOGLE_BUSINESS_ACCOUNT_ID, GOOGLE_BUSINESS_LOCATION_ID, GOOGLE_ACCESS_TOKEN',
    }, { status: 404 })
  }

  return NextResponse.json({ generatedAt: data.created_at, analysis: JSON.parse(data.content) })
}

export async function POST(req: NextRequest) {
  const { autoReply = false, dryRun = false } = await req.json().catch(() => ({}))

  const reviews = await fetchReviews()

  // Sin credenciales → modo demo con reseñas simuladas
  const workingReviews: Review[] = reviews.length > 0 ? reviews : [
    {
      reviewId: 'demo-1',
      reviewer: { displayName: 'María González' },
      starRating: 'FIVE',
      comment: 'Excelentes instalaciones, las canchas de pádel son increíbles. El staff muy amable. Sin duda el mejor club de la zona.',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
    },
    {
      reviewId: 'demo-2',
      reviewer: { displayName: 'Carlos Mendoza' },
      starRating: 'THREE',
      comment: 'Buen club pero los vestidores podrían estar más limpios. Las canchas están muy bien.',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
    },
    {
      reviewId: 'demo-3',
      reviewer: { displayName: 'Ana Rodríguez' },
      starRating: 'TWO',
      comment: 'Esperé 40 minutos para una cancha que tenía reservada. Mala organización.',
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
    },
  ]

  // Solo analizar reseñas sin respuesta
  const toAnalyze = workingReviews.filter(r => !r.reviewReply)
  if (!toAnalyze.length) {
    return NextResponse.json({ message: 'Todas las reseñas ya tienen respuesta', total: workingReviews.length })
  }

  const analyses = await Promise.all(toAnalyze.map(r => analyzeReview(r)))

  // Auto-responder reseñas si está habilitado y tenemos credenciales
  const hasCredentials = !!(
    process.env.GOOGLE_BUSINESS_ACCOUNT_ID &&
    process.env.GOOGLE_BUSINESS_LOCATION_ID &&
    process.env.GOOGLE_ACCESS_TOKEN
  )

  if (autoReply && hasCredentials && !dryRun) {
    for (const analysis of analyses) {
      if (analysis.suggestedReply) {
        analysis.replyPosted = await postReply(analysis.reviewId, analysis.suggestedReply)
      }
    }
  }

  // Guardar análisis en Supabase
  await supabase.from('agent_memory').insert({
    agent: 'reputacion',
    type: 'analysis',
    content: JSON.stringify({ reviews: analyses, total: workingReviews.length, isDemo: reviews.length === 0 }),
    outcome: 'neutro',
  })

  // Métricas globales
  const stars = analyses.map(a => a.stars)
  const avgStars = stars.reduce((a, b) => a + b, 0) / stars.length
  const negativas = analyses.filter(a => a.sentiment === 'negativo')
  const altas = analyses.filter(a => a.priority === 'alta')

  // Notificar al admin
  const lines = [
    `⭐ *Reputación Google Maps*`,
    ``,
    `${reviews.length === 0 ? '⚠️ _Modo demo — sin credenciales Google_\n' : ''}`,
    `Promedio: ${avgStars.toFixed(1)}/5 · ${toAnalyze.length} reseñas nuevas`,
    altas.length > 0 ? `🔴 ${altas.length} requieren atención urgente` : `✅ Sin reseñas críticas`,
    ``,
    ...altas.slice(0, 3).map(a =>
      `• *${a.reviewer}* (${a.stars}⭐) — ${a.comment.slice(0, 80)}...\n  Respuesta: "${a.suggestedReply.slice(0, 100)}..."`
    ),
    negativas.length > 0 && !autoReply ? `\nResponde *responde reseñas* para publicar las respuestas sugeridas.` : '',
  ].filter(Boolean)

  await sendText(process.env.ADMIN_PHONE!, lines.join('\n'))

  return NextResponse.json({
    dryRun,
    hasCredentials,
    isDemo: reviews.length === 0,
    total: workingReviews.length,
    analyzed: analyses.length,
    avgStars: parseFloat(avgStars.toFixed(1)),
    priority: { alta: altas.length, media: analyses.filter(a => a.priority === 'media').length, baja: analyses.filter(a => a.priority === 'baja').length },
    analyses,
  })
}
