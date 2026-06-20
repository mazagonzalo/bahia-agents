'use client'
import { useState, useEffect, useCallback } from 'react'
import { T, Card, StatCard, SectionTitle, Ring, Badge, EmptyState, PageHeader, Skeleton, SkeletonText } from '../_components/ui'

// Formatea enteros con separador de miles es-MX (1234 → "1,234").
const fmt = (n: number) => n.toLocaleString('es-MX')

// ─── Types (espejan el shape real de GET /api/agents/reputacion) ──────────────
// 200 → { generatedAt, analysis: { reviews, total, isDemo } }
//   reviews[]  ← se guardan en POST (analyzeReview): reviewId, reviewer, stars,
//                comment, sentiment, themes[], suggestedReply, priority, replyPosted
// 404 → { error, ready, hint }

type Sentiment = 'positivo' | 'neutro' | 'negativo'
type Priority = 'alta' | 'media' | 'baja'

type ReviewAnalysis = {
  reviewId: string
  reviewer: string
  stars: number
  comment: string
  sentiment: Sentiment
  themes: string[]
  suggestedReply: string
  priority: Priority
  replyPosted: boolean
}

type ReputacionData = {
  generatedAt: string
  analysis: { reviews: ReviewAnalysis[]; total: number; isDemo: boolean }
}

type NotReady = { error: string; ready?: boolean; hint?: string }

// ─── Mapeos de color ──────────────────────────────────────────────────────────

const SENTIMENT_TONE: Record<Sentiment, 'success' | 'warning' | 'danger'> = {
  positivo: 'success',
  neutro: 'warning',
  negativo: 'danger',
}
const SENTIMENT_COLOR: Record<Sentiment, string> = {
  positivo: T.success,
  neutro: T.warning,
  negativo: T.danger,
}
const PRIORITY_TONE: Record<Priority, 'danger' | 'warning' | 'muted'> = {
  alta: 'danger',
  media: 'warning',
  baja: 'muted',
}

// ─── Subcomponentes ─────────────────────────────────────────────────────────────

function Stars({ n }: { n: number }) {
  const full = Math.max(0, Math.min(5, Math.round(n)))
  return (
    <span style={{ color: T.gold, fontSize: 13, letterSpacing: 1 }}>
      {'★'.repeat(full)}
      <span style={{ color: T.border }}>{'★'.repeat(5 - full)}</span>
    </span>
  )
}

function ReviewCard({ r }: { r: ReviewAnalysis }) {
  const sColor = SENTIMENT_COLOR[r.sentiment]
  return (
    <Card style={{ borderLeft: `3px solid ${sColor}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{r.reviewer}</div>
          <div style={{ marginTop: 4 }}><Stars n={r.stars} /> <span style={{ fontSize: 11, color: T.muted }}>{r.stars}/5</span></div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Badge tone={SENTIMENT_TONE[r.sentiment]}>{r.sentiment}</Badge>
          <Badge tone={PRIORITY_TONE[r.priority]}>prioridad {r.priority}</Badge>
          {r.replyPosted && <Badge tone="info">respondida</Badge>}
        </div>
      </div>

      {r.comment && (
        <p style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6, margin: '0 0 12px', fontStyle: 'italic' }}>
          &ldquo;{r.comment}&rdquo;
        </p>
      )}

      {r.themes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {r.themes.map((t, i) => (
            <span key={i} style={{ fontSize: 11, padding: '2px 9px', borderRadius: 999, background: T.surface2, color: T.textSec, border: `1px solid ${T.border}` }}>{t}</span>
          ))}
        </div>
      )}

      {r.suggestedReply && (
        <div style={{ padding: '10px 12px', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 9, color: T.gold, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600, marginBottom: 6 }}>Respuesta sugerida</div>
          <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5 }}>{r.suggestedReply}</div>
        </div>
      )}
    </Card>
  )
}

// ── Skeleton de carga (espeja la forma: resumen + tarjetas de reseña) ──
function ReputacionSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <Card style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
        <Skeleton width={72} height={72} radius="var(--radius-full)" />
        <div className="grid-kpis" style={{ flex: 1, minWidth: 240 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="metric-card" style={{ gap: 'var(--space-2)' }}>
              <Skeleton width="50%" height={10} />
              <Skeleton width="70%" height={28} />
            </div>
          ))}
        </div>
      </Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} style={{ borderLeft: `3px solid ${T.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 'var(--space-3)' }}>
              <Skeleton width={140} height={16} />
              <Skeleton width={90} height={16} />
            </div>
            <SkeletonText lines={2} />
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Página ─────────────────────────────────────────────────────────────────────

export default function ReputacionPage() {
  const [data, setData] = useState<ReputacionData | null>(null)
  const [notReady, setNotReady] = useState<NotReady | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotReady(null)
    try {
      const res = await fetch('/api/agents/reputacion')
      const json = await res.json()
      if (res.ok) {
        setData(json as ReputacionData)
      } else {
        setData(null)
        setNotReady(json as NotReady)
      }
    } catch {
      setData(null)
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData() }, [fetchData])

  const reviews = data?.analysis.reviews ?? []
  const isDemo = data?.analysis.isDemo ?? false

  // Métricas agregadas
  const avgStars = reviews.length ? reviews.reduce((a, r) => a + r.stars, 0) / reviews.length : 0
  const score10 = Math.round(avgStars * 2 * 10) / 10 // 0–10 para el Ring
  const negativas = reviews.filter(r => r.sentiment === 'negativo').length
  const altas = reviews.filter(r => r.priority === 'alta').length

  return (
    <>
      <PageHeader
        title="Reputación"
        blurb="Analiza las reseñas de Google Maps, detecta sentimiento y redacta respuestas listas para publicar."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {data && isDemo && <Badge tone="warning">demo</Badge>}
            <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
              {loading ? 'Cargando…' : 'Actualizar'}
            </button>
          </div>
        }
      />

      {loading && !data && <ReputacionSkeleton />}

      {!loading && error && !data && (
        <div>
          <EmptyState title="No se pudo cargar" sub={error} />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
            <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>Reintentar</button>
          </div>
        </div>
      )}

      {!loading && !error && notReady && (
        <div>
          <EmptyState title="Sin análisis generado aún" sub={notReady.hint ?? notReady.error} />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
            <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>Actualizar</button>
          </div>
        </div>
      )}

      {!loading && data && reviews.length === 0 && (
        <div>
          <EmptyState title="Sin reseñas" sub="El último análisis no contiene reseñas." />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
            <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>Actualizar</button>
          </div>
        </div>
      )}

      {data && reviews.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Resumen */}
          <Card style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <Ring score={score10} size={72} />
              <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 6 }}>Score /10</div>
            </div>
            <div className="grid-kpis" style={{ flex: 1, minWidth: 240 }}>
              <StatCard label="Promedio" value={`${avgStars.toFixed(1)}★`} sub={`${fmt(reviews.length)} reseñas`} />
              <StatCard label="Negativas" value={fmt(negativas)} color={negativas ? T.danger : T.textSec} />
              <StatCard label="Prioridad alta" value={fmt(altas)} color={altas ? T.warning : T.textSec} />
              <StatCard label="Total" value={fmt(data.analysis.total)} color={T.textSec} />
            </div>
          </Card>

          {/* Reseñas */}
          <div>
            <SectionTitle>Reseñas analizadas</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {reviews.map(r => <ReviewCard key={r.reviewId} r={r} />)}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
