'use client'
import { useState, useCallback } from 'react'
import { PageHeader, Card, SectionTitle, Badge, T } from '../_components/ui'

const nf = (n: number) => n.toLocaleString('es-MX')

// ─── Tipos (shape de POST /api/agents/contenido) ──────────────────────────────
type Slide = { slide: number; headline: string; body: string }
type Carousel = { caption: string; slides: Slide[]; angle?: string }
type Variant = {
  creativeId: string | null
  angle: string
  carousel: Carousel
  aiScore: number | null
  photosNeeded: string[]
}
type Calif = {
  idea: string
  score: number
  verdict: string
  why: string
  suggestion: string
  canGenerate: boolean
}

function NaturalidadBadge({ score }: { score: number | null }) {
  if (typeof score !== 'number') return null
  const tone = score >= 70 ? 'success' : score >= 50 ? 'warning' : 'danger'
  const label = score >= 70 ? 'Natural' : score >= 50 ? 'Revisar tono' : 'Suena a IA'
  return <Badge tone={tone}>{label} · {nf(score)}/100</Badge>
}

// ─── Tarjeta de una variante de carrusel ──────────────────────────────────────
function VariantCard({ v, badge, onApprove, approving }: {
  v: Variant
  badge: string
  onApprove?: () => void
  approving?: boolean
}) {
  const [open, setOpen] = useState(false)
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
          <span style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap' }}>{badge}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.gold, fontFamily: 'var(--font-headline)', overflowWrap: 'anywhere' }}>{v.angle}</span>
        </div>
        <NaturalidadBadge score={v.aiScore} />
      </div>

      <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.5, marginBottom: 'var(--space-3)', overflowWrap: 'anywhere' }}>{v.carousel.caption}</div>

      <button className="btn btn-secondary" onClick={() => setOpen(!open)} style={{ marginBottom: open ? 'var(--space-3)' : 0 }}>
        {open ? 'Ocultar slides' : `Ver ${nf(v.carousel.slides.length)} slides`}
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          {v.carousel.slides.map(s => (
            <div key={s.slide} style={{ display: 'flex', gap: 'var(--space-3)', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 'var(--radius-lg)', padding: 'var(--space-2) var(--space-3)' }}>
              <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 'var(--radius-sm)', background: T.gold + '1f', color: T.gold, fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-headline)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{String(s.slide).padStart(2, '0')}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, overflowWrap: 'anywhere' }}>{s.headline}</div>
                <div style={{ fontSize: 12, color: T.textSec, marginTop: 2, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {v.photosNeeded.length > 0 && (
        <div style={{ marginTop: 'var(--space-2)' }}>
          <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 'var(--space-2)' }}>📸 Fotos que faltan ({nf(v.photosNeeded.length)})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {v.photosNeeded.map((p, i) => (
              <div key={i} style={{ fontSize: 12, color: T.text, background: T.gold + '12', border: `1px solid ${T.gold}26`, borderRadius: 8, padding: '6px 10px', overflowWrap: 'anywhere' }}>{p}</div>
            ))}
          </div>
        </div>
      )}

      {onApprove && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <button className="btn btn-primary" onClick={onApprove} disabled={approving}>
            {approving ? 'Generando rotación… (~1 min)' : 'Aprobar y generar rotación'}
          </button>
        </div>
      )}
    </Card>
  )
}

const inputStyle = {
  width: '100%',
  resize: 'vertical' as const,
  background: T.bg,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  color: T.text,
  padding: '12px 14px',
  fontSize: 14,
  fontFamily: 'var(--font-sans)',
  outline: 'none',
}

export default function ContenidoPage() {
  // Calificar
  const [califText, setCalifText] = useState('')
  const [calif, setCalif] = useState<Calif | null>(null)
  const [califLoading, setCalifLoading] = useState(false)
  const [califError, setCalifError] = useState<string | null>(null)

  // Generar
  const [genText, setGenText] = useState('')
  const [variants, setVariants] = useState<Variant[] | null>(null)
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  // Aprobar / rotación
  const [approvedId, setApprovedId] = useState<string | null>(null)
  const [derived, setDerived] = useState<Variant[] | null>(null)
  const [videoBrief, setVideoBrief] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const calificar = useCallback(async () => {
    const t = califText.trim()
    if (!t || califLoading) return
    setCalifLoading(true); setCalifError(null)
    try {
      const res = await fetch('/api/agents/contenido', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'calificar', idea: t }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setCalifError(d.error ?? 'Error al calificar'); setCalif(null) }
      else setCalif(d)
    } catch { setCalifError('Error de red') }
    finally { setCalifLoading(false) }
  }, [califText, califLoading])

  const generar = useCallback(async (topic: string) => {
    const t = topic.trim()
    if (!t || genLoading) return
    setGenLoading(true); setGenError(null)
    setVariants(null); setDerived(null); setApprovedId(null); setVideoBrief(null)
    try {
      const res = await fetch('/api/agents/contenido', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trend: { topic: t, angle: 'Bahía Social Sports Club' } }),
        signal: AbortSignal.timeout(290_000),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) setGenError(d.error ?? 'Error al generar')
      else setVariants(d.variants ?? [])
    } catch { setGenError('Error de red o tardó demasiado') }
    finally { setGenLoading(false) }
  }, [genLoading])

  const aprobar = useCallback(async (creativeId: string | null) => {
    if (!creativeId || approvingId) return
    setApprovingId(creativeId)
    try {
      const res = await fetch('/api/agents/contenido', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'aprobar', creativeId }),
        signal: AbortSignal.timeout(290_000),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        setApprovedId(creativeId)
        setDerived(d.derived ?? [])
        setVideoBrief(d.videoBrief ?? null)
      }
    } catch { /* fail-soft */ }
    finally { setApprovingId(null) }
  }, [approvingId])

  return (
    <>
      <PageHeader
        title="Agente de Contenido"
        blurb="Califica ideas de contenido del club contra las tendencias, y genera carruseles promocionales pauteables con variantes para rotación."
      />

      {/* ── Calificar idea de contenido normal ── */}
      <Card style={{ marginBottom: 'var(--space-4)' }}>
        <SectionTitle>Calificar una idea</SectionTitle>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
          ¿Una idea de post o historia que quiere hacer el club? El agente la califica según las tendencias de la semana.
        </div>
        <textarea
          value={califText}
          onChange={e => setCalifText(e.target.value)}
          placeholder="Ej: «un post sobre los beneficios del pádel para la salud mental»"
          rows={3}
          style={inputStyle}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <button className="btn btn-primary" onClick={calificar} disabled={califLoading || !califText.trim()}>
            {califLoading ? 'Calificando…' : 'Calificar'}
          </button>
          {califError && <span style={{ color: T.danger, fontSize: 13 }}>{califError}</span>}
        </div>

        {calif && (
          <div style={{ marginTop: 'var(--space-4)', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-headline)', color: calif.score >= 7 ? T.teal : calif.score >= 4 ? T.gold : T.coral }}>{nf(calif.score)}/10</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{calif.verdict}</span>
            </div>
            <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.5, marginBottom: 'var(--space-2)', overflowWrap: 'anywhere' }}>{calif.why}</div>
            {calif.suggestion && <div style={{ fontSize: 13, color: T.gold, lineHeight: 1.5, overflowWrap: 'anywhere' }}>💡 {calif.suggestion}</div>}
            {calif.canGenerate && (
              <div style={{ marginTop: 'var(--space-3)' }}>
                <button className="btn btn-primary" onClick={() => generar(calif.idea)} disabled={genLoading}>
                  {genLoading ? 'Generando…' : 'Generar carrusel promocional de esta idea'}
                </button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Generar carrusel promocional ── */}
      <Card style={{ marginBottom: 'var(--space-4)' }}>
        <SectionTitle>Generar carrusel promocional</SectionTitle>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
          Genera 3 variantes con ángulos distintos. Apruebas una y el agente crea 2 más del mismo estilo para rotación.
        </div>
        <textarea
          value={genText}
          onChange={e => setGenText(e.target.value)}
          placeholder="Ej: «Day Pass de fin de semana en las canchas de pádel»"
          rows={3}
          style={inputStyle}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <button className="btn btn-primary" onClick={() => generar(genText)} disabled={genLoading || !genText.trim()}>
            {genLoading ? 'Generando variantes… (~1-2 min)' : 'Generar 3 variantes'}
          </button>
          {genError && <span style={{ color: T.danger, fontSize: 13 }}>{genError}</span>}
        </div>
      </Card>

      {/* ── Variantes generadas ── */}
      {variants && variants.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <SectionTitle>Variantes — elige una para pautear</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
            {variants.map((v, i) => (
              <VariantCard
                key={v.creativeId ?? i}
                v={v}
                badge={`Variante ${i + 1}`}
                onApprove={approvedId ? undefined : () => aprobar(v.creativeId)}
                approving={approvingId === v.creativeId}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Cola de rotación ── */}
      {derived && derived.length > 0 && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <SectionTitle>Cola de rotación (mismo estilo)</SectionTitle>
          <div style={{ fontSize: 13, color: T.muted, marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
            El crítico activa la siguiente cuando baje la curva de interacción de la activa.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {derived.map((v, i) => (
              <VariantCard key={v.creativeId ?? i} v={v} badge={`Rotación ${i + 1}`} />
            ))}
          </div>
        </div>
      )}

      {/* ── Video complementario ── */}
      {videoBrief && (
        <Card>
          <SectionTitle>Video complementario (brief real)</SectionTitle>
          <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 13, lineHeight: 1.6, color: T.textSec, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 'var(--radius-lg)', padding: 'var(--space-4) var(--space-5)' }}>
            {videoBrief}
          </div>
        </Card>
      )}
    </>
  )
}
