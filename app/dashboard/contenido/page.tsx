'use client'
import { PageHeader, Card, SectionTitle, FormatBadge, ScoreBar, Badge, EmptyState, T } from '../_components/ui'
import { TriggerPanel } from '../_components/TriggerPanel'

// Shape EXACTO devuelto por POST /api/agents/contenido (ver route.ts)
type Slide = { slide: number; headline: string; body: string }
type Carousel = { caption: string; slides: Slide[] }
type ContenidoResult = {
  creativeId?: string | null
  format: 'Reel' | 'Carrusel' | 'Foto' | string
  carousel?: Carousel | null
  reelBrief?: string | null
  aiScore?: number | null
}

function ScoreLabel({ score }: { score: number }) {
  const tone = score >= 70 ? 'success' : score >= 50 ? 'warning' : 'danger'
  const label = score >= 70 ? 'Natural' : score >= 50 ? 'Revisar tono' : 'Suena a IA'
  return <Badge tone={tone}>{label}</Badge>
}

function renderResult(data: unknown) {
  const r = data as ContenidoResult
  const slides = r.carousel?.slides ?? []
  const hasReel = r.format === 'Reel' && !!r.reelBrief
  const hasCarousel = !!r.carousel && slides.length > 0

  // Guard on-brand: respuesta vacía / malformada → EmptyState con acción.
  if (!r || (!hasReel && !hasCarousel && typeof r.aiScore !== 'number')) {
    return (
      <Card>
        <EmptyState
          title="Sin contenido que mostrar"
          sub="El agente no devolvió un brief ni un carrusel. Ajusta la idea y vuelve a generar."
        />
      </Card>
    )
  }

  return (
    <Card>
      {/* Encabezado del creativo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0 }}>
          <FormatBadge format={r.format} />
          {r.creativeId && (
            <span
              title={r.creativeId}
              style={{
                fontSize: 11,
                color: T.muted,
                fontFamily: 'var(--font-headline)',
                maxWidth: 200,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              ID: {r.creativeId}
            </span>
          )}
        </div>
        {typeof r.aiScore === 'number' && <ScoreLabel score={r.aiScore} />}
      </div>

      {/* Naturalidad del copy (HumanizerAI 0–100) */}
      {typeof r.aiScore === 'number' && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <SectionTitle>Naturalidad del copy</SectionTitle>
          <ScoreBar score={r.aiScore} max={100} />
        </div>
      )}

      {/* Brief de Reel */}
      {hasReel && (
        <div style={{ marginBottom: hasCarousel ? 'var(--space-6)' : 0 }}>
          <SectionTitle>Brief de Reel</SectionTitle>
          <div
            style={{
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              fontSize: 14,
              lineHeight: 1.6,
              color: T.text,
              background: T.bg,
              border: `1px solid ${T.border}`,
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-4) var(--space-5)',
            }}
          >
            {r.reelBrief}
          </div>
        </div>
      )}

      {/* Carrusel (caption + slides) */}
      {hasCarousel && (
        <div>
          {r.carousel?.caption && (
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <SectionTitle>Caption</SectionTitle>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: T.textSec, overflowWrap: 'anywhere' }}>{r.carousel.caption}</div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <SectionTitle>Slides</SectionTitle>
            <span style={{ fontSize: 11, color: T.muted, fontFamily: 'var(--font-headline)', marginBottom: 'var(--space-5)' }}>
              {slides.length.toLocaleString('es-MX')} {slides.length === 1 ? 'lámina' : 'láminas'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {slides.map((s) => (
              <div
                key={s.slide}
                style={{
                  display: 'flex',
                  gap: 'var(--space-4)',
                  background: T.bg,
                  border: `1px solid ${T.border}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-3) var(--space-4)',
                  transition: 'border-color var(--transition-fast), background var(--transition-fast)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.borderHover; e.currentTarget.style.background = T.surface }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.bg }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: 26,
                    height: 26,
                    borderRadius: 'var(--radius-sm)',
                    background: T.gold + '1f',
                    color: T.gold,
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: 'var(--font-headline)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {String(s.slide).padStart(2, '0')}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: 'var(--font-headline)', overflowWrap: 'anywhere' }}>{s.headline}</div>
                  <div style={{ fontSize: 13, color: T.textSec, marginTop: 'var(--space-1)', lineHeight: 1.5, overflowWrap: 'anywhere' }}>{s.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

export default function ContenidoPage() {
  return (
    <>
      <PageHeader
        title="Agente de Contenido"
        blurb="Convierte una idea o tendencia en un brief de Reel o carrusel listo para Instagram, con copy del club y control de naturalidad."
      />
      <TriggerPanel
        endpoint="/api/agents/contenido"
        label="Idea o tendencia"
        placeholder="Escribe un tema o tendencia en texto libre. Ej: «Day Pass de fin de semana en las canchas de pádel» o «el pickleball está explotando en Riviera Nayarit»."
        cta="Generar contenido"
        // La ruta usa trend.topic y trend.angle → mandamos un objeto, no string.
        buildPayload={(text) => ({ trend: { topic: text, angle: 'Bahía Social Sports Club' } })}
        renderResult={renderResult}
      />
    </>
  )
}
