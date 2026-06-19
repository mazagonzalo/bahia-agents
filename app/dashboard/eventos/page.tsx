'use client'
import { T, Card, SectionTitle, Ring, Badge, PageHeader } from '../_components/ui'
import { TriggerPanel } from '../_components/TriggerPanel'

// Espeja el shape de la respuesta de POST /api/agents/eventos → { event: saved }
type EventoCreado = {
  id: string
  name: string
  type: string
  sport: string | null
  recurrence: string | null
  time_of_day: string | null
  start_date: string | null
  end_date: string | null
  description: string | null
  content_potential: number
  active: boolean
}

type EventoResponse = { event?: EventoCreado }

// ── Fecha relativa en es-MX (hoy / en N días / hace N días) ──
function relativeDate(iso: string): string | null {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  const dayMs = 86_400_000
  const days = Math.round((t - Date.now()) / dayMs)
  const rtf = new Intl.RelativeTimeFormat('es-MX', { numeric: 'auto' })
  if (Math.abs(days) <= 30) return rtf.format(days, 'day')
  const weeks = Math.round(days / 7)
  return rtf.format(weeks, 'week')
}

// ── Fila de campo (etiqueta + valor) ──
function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', minWidth: 0 }}>
      <span style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 14, color: T.text, overflowWrap: 'anywhere' }}>{value}</span>
      {hint && <span style={{ fontSize: 12, color: T.muted }}>{hint}</span>}
    </div>
  )
}

function renderResult(data: unknown): React.ReactNode {
  const event = (data as EventoResponse)?.event
  if (!event) return null

  // "Cuándo" + una pista relativa cuando hay fecha de inicio.
  const cuando = event.recurrence
    ? event.recurrence
    : event.start_date
      ? event.start_date + (event.end_date && event.end_date !== event.start_date ? ` → ${event.end_date}` : '')
      : 'Sin fecha definida'
  const cuandoHint = !event.recurrence && event.start_date ? relativeDate(event.start_date) ?? undefined : undefined

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div style={{ minWidth: 0 }}>
          <SectionTitle>Evento registrado</SectionTitle>
          <h2
            style={{
              fontSize: 22,
              margin: 0,
              color: T.text,
              fontFamily: 'var(--font-headline)',
              lineHeight: 1.2,
              overflowWrap: 'anywhere',
            }}
          >
            {event.name}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Badge tone={event.type === 'recurrente' ? 'teal' : 'gold'}>{event.type}</Badge>
            {event.sport && <Badge tone="info">{event.sport}</Badge>}
            <Badge tone={event.active ? 'success' : 'muted'}>{event.active ? 'Activo' : 'Inactivo'}</Badge>
          </div>
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <Ring score={event.content_potential} size={64} />
          <div style={{ fontSize: 9, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 'var(--space-1)' }}>Potencial</div>
        </div>
      </div>

      <div className="divider-gold" style={{ margin: '0 0 var(--space-5)' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-5)' }}>
        <Field label="Cuándo" value={cuando} hint={cuandoHint} />
        {event.time_of_day && <Field label="Horario" value={event.time_of_day} />}
        {event.recurrence && <Field label="Recurrencia" value={event.recurrence} />}
      </div>

      {event.description && (
        <p style={{ fontSize: 14, color: T.textSec, lineHeight: 1.6, marginTop: 'var(--space-5)', marginBottom: 0 }}>
          {event.description}
        </p>
      )}

      <div
        style={{
          marginTop: 'var(--space-5)',
          padding: 'var(--space-3) var(--space-4)',
          background: T.surface2,
          border: `1px solid ${T.border}`,
          borderRadius: 'var(--radius-lg)',
          fontSize: 13,
          color: T.textSec,
        }}
      >
        El agente de contenido ya fue disparado con este evento — el contenido para redes se genera en segundo plano.
      </div>
    </Card>
  )
}

export default function EventosPage() {
  return (
    <div>
      <PageHeader
        title="Eventos"
        blurb="Describe un evento del club en lenguaje natural; el agente lo interpreta, lo registra y dispara la generación de contenido."
      />
      <TriggerPanel
        endpoint="/api/agents/eventos"
        label="Describe el evento"
        placeholder="Ej: Torneo de pádel sábado 28 a las 6pm, 300 por pareja, inscripciones en recepción"
        cta="Registrar evento"
        buildPayload={(text) => ({ message: text })}
        renderResult={renderResult}
      />
    </div>
  )
}
