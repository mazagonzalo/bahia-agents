'use client'
import { useState, useCallback, useRef } from 'react'
import { toPng } from 'html-to-image'
import { PageHeader, Card, SectionTitle, Badge, T } from '../_components/ui'
import { SERIF, NAVY, accentForSport, BrandBackdrop, Wordmark } from '../_components/posterKit'

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
type Suggestion = {
  format: string
  title: string
  concept: string
  hook: string
  music?: string
  duration?: string
  execution: string
  score: number
  why: string
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

function NaturalidadBadge({ score }: { score: number | null }) {
  if (typeof score !== 'number') return null
  const tone = score >= 70 ? 'success' : score >= 50 ? 'warning' : 'danger'
  const label = score >= 70 ? 'Natural' : score >= 50 ? 'Revisar tono' : 'Suena a IA'
  return <Badge tone={tone}>{label} · {nf(score)}/100</Badge>
}

function Detail({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  if (!value) return null
  return (
    <div>
      <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: muted ? T.muted : T.textSec, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  )
}

// ─── Card expandible de una sugerencia de contenido ───────────────────────────
function SuggestionCard({ s }: { s: Suggestion }) {
  const [open, setOpen] = useState(false)
  const scoreColor = s.score >= 7 ? T.teal : s.score >= 4 ? T.gold : T.coral
  return (
    <div style={{ border: `1px solid ${open ? T.gold + '55' : T.border}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s ease' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ width: '100%', background: open ? T.surface2 : 'transparent', border: 'none', padding: '14px 18px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'var(--font-headline)', color: scoreColor, minWidth: 46 }}>{nf(s.score)}/10</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: T.text, fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</div>
          <div style={{ fontSize: 11, color: T.muted }}>{s.format}{s.duration ? ` · ${s.duration}` : ''}</div>
        </div>
        <span style={{ fontSize: 11, color: T.muted, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '4px 18px 16px', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Detail label="Concepto" value={s.concept} />
          <Detail label="Gancho / primeros 3s" value={s.hook} />
          <Detail label="Música / audio" value={s.music ?? ''} />
          <Detail label="Duración" value={s.duration ?? ''} />
          <Detail label="Cómo se haría" value={s.execution} />
          <Detail label="Por qué ese score" value={s.why} muted />
        </div>
      )}
    </div>
  )
}

// ─── Carrusel VISUAL premium (slides pauteables, exportables a PNG) ───────────
// Reusa el kit de diseño del póster (serif, fondo de marca, acento por deporte).
// El slide 1 se estiliza como portada; el resto como slides de contenido.
function CarouselVisual({ carousel }: { carousel: Carousel }) {
  const a = accentForSport(`${carousel.angle ?? ''} ${carousel.caption} ${carousel.slides.map(s => s.headline).join(' ')}`)
  const refs = useRef<(HTMLDivElement | null)[]>([])
  const [busy, setBusy] = useState(false)

  async function exportAll() {
    if (busy) return
    setBusy(true)
    for (let i = 0; i < refs.current.length; i++) {
      const node = refs.current[i]
      if (!node) continue
      try {
        const url = await toPng(node, { pixelRatio: 2.8, cacheBust: true })
        const link = document.createElement('a')
        link.href = url
        link.download = `bahia-carrusel-${String(i + 1).padStart(2, '0')}.png`
        link.click()
        await new Promise(r => setTimeout(r, 300)) // separa las descargas
      } catch { /* ignora ese slide */ }
    }
    setBusy(false)
  }

  return (
    <div style={{ marginTop: 'var(--space-3)' }}>
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 10 }}>
        {carousel.slides.map((s, i) => (
          <div
            key={s.slide}
            ref={el => { refs.current[i] = el }}
            style={{ flexShrink: 0, width: 288, aspectRatio: '4 / 5', position: 'relative', overflow: 'hidden', background: NAVY, color: '#fff', boxShadow: '0 18px 44px -22px rgba(0,0,0,0.7)' }}
          >
            <BrandBackdrop accent={a} />
            <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', padding: 26, boxSizing: 'border-box' }}>
              {i === 0 ? (
                <>
                  <Wordmark accent={a} size={17} />
                  <div style={{ flex: 1 }} />
                  {carousel.angle && <div style={{ fontSize: 9, letterSpacing: 3, color: a.light, textTransform: 'uppercase', marginBottom: 10, fontWeight: 500 }}>{carousel.angle}</div>}
                  <h2 style={{ fontFamily: SERIF, fontSize: 32, lineHeight: 1.0, margin: 0, fontWeight: 600, letterSpacing: -0.4 }}>{s.headline}</h2>
                  <div style={{ height: 1.5, width: 54, background: `linear-gradient(90deg, ${a.light}, rgba(${a.glow},0.12))`, margin: '14px 0 12px' }} />
                  {s.body && <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.82)', lineHeight: 1.5 }}>{s.body}</div>}
                  <div style={{ marginTop: 14, fontSize: 10, letterSpacing: 2, color: a.light, textTransform: 'uppercase' }}>desliza →</div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: a.light, lineHeight: 1 }}>{String(s.slide).padStart(2, '0')}</span>
                    <span style={{ fontFamily: SERIF, fontSize: 12, letterSpacing: 4, color: '#F5EFE2' }}>BAHÍA</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h3 style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1.06, margin: 0, fontWeight: 600, letterSpacing: -0.3 }}>{s.headline}</h3>
                    <div style={{ height: 1.5, width: 44, background: `linear-gradient(90deg, ${a.light}, rgba(${a.glow},0.12))`, margin: '13px 0 12px' }} />
                    {s.body && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.88)', lineHeight: 1.55 }}>{s.body}</div>}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-secondary" onClick={exportAll} disabled={busy} style={{ marginTop: 'var(--space-2)' }}>
        {busy ? 'Exportando…' : `↓ Exportar ${nf(carousel.slides.length)} slides (PNG)`}
      </button>
    </div>
  )
}

// ─── Card de una variante de carrusel promocional ─────────────────────────────
function VariantCard({ v, badge, onApprove, approving }: {
  v: Variant
  badge: string
  onApprove?: () => void
  approving?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [design, setDesign] = useState(false)
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

      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: (open || design) ? 'var(--space-3)' : 0 }}>
        <button className="btn btn-secondary" onClick={() => setOpen(!open)}>
          {open ? 'Ocultar texto' : `Ver ${nf(v.carousel.slides.length)} slides (texto)`}
        </button>
        <button className="btn btn-secondary" onClick={() => setDesign(!design)}>
          {design ? 'Ocultar diseño' : 'Ver diseño premium'}
        </button>
      </div>
      {design && <CarouselVisual carousel={v.carousel} />}
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

export default function ContenidoPage() {
  // Sugerencias de contenido (apoyo de ideas)
  const [sugText, setSugText] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [sugLoading, setSugLoading] = useState(false)
  const [sugError, setSugError] = useState<string | null>(null)

  // Generar carrusel promocional (pauta)
  const [genText, setGenText] = useState('')
  const [variants, setVariants] = useState<Variant[] | null>(null)
  const [genLoading, setGenLoading] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  // Aprobar / rotación
  const [approvedId, setApprovedId] = useState<string | null>(null)
  const [derived, setDerived] = useState<Variant[] | null>(null)
  const [videoBrief, setVideoBrief] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<string | null>(null)

  const sugerir = useCallback(async () => {
    const t = sugText.trim()
    if (!t || sugLoading) return
    setSugLoading(true); setSugError(null)
    try {
      const res = await fetch('/api/agents/contenido', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'sugerencias', idea: t }),
        signal: AbortSignal.timeout(120_000),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setSugError(d.error ?? 'Error al generar sugerencias'); setSuggestions(null) }
      else setSuggestions(d.suggestions ?? [])
    } catch { setSugError('Error de red o tardó demasiado') }
    finally { setSugLoading(false) }
  }, [sugText, sugLoading])

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
        blurb="Apoyo de ideas de contenido (guías detalladas + score) y carruseles promocionales pauteables con rotación."
      />

      {/* ── Sugerencias de contenido (apoyo de ideas) ── */}
      <Card style={{ marginBottom: 'var(--space-4)' }}>
        <SectionTitle>Sugerencias de contenido</SectionTitle>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
          Escribe una idea o tema. El agente propone 3-4 formas detalladas de hacerlo (formato, música, duración, cómo grabarlo), cada una calificada según las tendencias. Es apoyo de ideas — no genera el contenido final.
        </div>
        <textarea
          value={sugText}
          onChange={e => setSugText(e.target.value)}
          placeholder="Ej: «atardecer con pickleball»"
          rows={2}
          style={inputStyle}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <button className="btn btn-primary" onClick={sugerir} disabled={sugLoading || !sugText.trim()}>
            {sugLoading ? 'Generando sugerencias…' : 'Generar sugerencias'}
          </button>
          {sugError && <span style={{ color: T.danger, fontSize: 13 }}>{sugError}</span>}
        </div>

        {suggestions && suggestions.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            {suggestions.map((s, i) => <SuggestionCard key={i} s={s} />)}
          </div>
        )}
      </Card>

      {/* ── Generar carrusel promocional (pauta) ── */}
      <Card style={{ marginBottom: 'var(--space-4)' }}>
        <SectionTitle>Generar carrusel promocional</SectionTitle>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 'var(--space-3)', lineHeight: 1.5 }}>
          El contenido con pauta. Genera 3 variantes con ángulos distintos; apruebas una y el agente crea 2 más del mismo estilo para rotación. (Automático cada 14 días vía cron; aquí puedes dispararlo manual.)
        </div>
        <textarea
          value={genText}
          onChange={e => setGenText(e.target.value)}
          placeholder="Ej: «Day Pass de fin de semana en las canchas de pádel»"
          rows={2}
          style={inputStyle}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <button className="btn btn-primary" onClick={() => generar(genText)} disabled={genLoading || !genText.trim()}>
            {genLoading ? 'Generando 3 variantes… (~20-30s)' : 'Generar 3 variantes'}
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
