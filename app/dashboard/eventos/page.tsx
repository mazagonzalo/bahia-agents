'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { toPng } from 'html-to-image'
import { T, Card, SectionTitle, Badge, PageHeader } from '../_components/ui'
import { TriggerPanel } from '../_components/TriggerPanel'
import { SERIF, accentForSport, BrandBackdrop, Wordmark } from '../_components/posterKit'

// ── Tipos ──────────────────────────────────────────────────────────────────
type Evento = {
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
type Agenda = { recurrentes: Evento[]; proximos: Evento[]; pasados: Evento[]; sinFecha: Evento[]; total: number }
type Poster = {
  title: string; subtitle: string; dateLine: string; location: string
  bullets: string[]; cta: string; sport: string; photo: string
}
type EventoResponse = { event?: Evento }

// ── Resultado de registro (card del evento creado) ──────────────────────────
function renderResult(data: unknown): React.ReactNode {
  const event = (data as EventoResponse)?.event
  if (!event) return null
  const cuando = event.recurrence ?? event.start_date ?? 'Sin fecha definida'
  return (
    <Card>
      <SectionTitle>Evento registrado</SectionTitle>
      <h2 style={{ fontSize: 22, margin: '4px 0 12px', color: T.text, fontFamily: 'var(--font-headline)', lineHeight: 1.2 }}>{event.name}</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <Badge tone={event.recurrence ? 'teal' : 'gold'}>{event.recurrence ? 'recurrente' : event.type}</Badge>
        {event.sport && <Badge tone="info">{event.sport}</Badge>}
        <Badge tone={event.active ? 'success' : 'muted'}>{event.active ? 'Activo' : 'Inactivo'}</Badge>
      </div>
      <p style={{ fontSize: 13, color: T.textSec, margin: 0 }}>
        {cuando}{event.time_of_day ? ` · ${event.time_of_day}` : ''} — ya quedó en la agenda y se disparó el contenido para redes.
      </p>
    </Card>
  )
}

// ── Fila de agenda ──────────────────────────────────────────────────────────
function EventoRow({ e }: { e: Evento }) {
  const cuando = e.recurrence ?? (e.start_date ? e.start_date + (e.end_date && e.end_date !== e.start_date ? ` → ${e.end_date}` : '') : 'Sin fecha')
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: `1px solid ${T.border}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, color: T.text, fontWeight: 600, overflowWrap: 'anywhere' }}>{e.name}</div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
          {cuando}{e.time_of_day ? ` · ${e.time_of_day}` : ''}{e.sport ? ` · ${e.sport}` : ''}
        </div>
      </div>
      {e.recurrence
        ? <Badge tone="teal">recurrente</Badge>
        : !e.active ? <Badge tone="muted">inactivo</Badge> : null}
    </div>
  )
}

function AgendaGroup({ title, hint, items }: { title: string; hint?: string; items: Evento[] }) {
  if (!items.length) return null
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: T.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>{title}</span>
        <span style={{ fontSize: 11, color: T.muted }}>{items.length}{hint ? ` · ${hint}` : ''}</span>
      </div>
      {items.map(e => <EventoRow key={e.id} e={e} />)}
    </div>
  )
}

// ── Póster premium editorial (se exporta a PNG con html-to-image) ────────────
// Estética "Warm Editorial" adaptada al navy premium de Bahía (kit compartido en
// _components/posterKit): serif de lujo, fondo de marca en capas, acento por deporte.
function PosterCard({ poster, innerRef }: { poster: Poster; innerRef: React.RefObject<HTMLDivElement | null> }) {
  const a = accentForSport(poster.sport || poster.title)
  return (
    <div
      ref={innerRef}
      style={{
        width: 540, aspectRatio: '4 / 5', position: 'relative', overflow: 'hidden',
        background: '#0A1024', color: '#fff', boxShadow: '0 30px 80px -30px rgba(0,0,0,0.7)',
      }}
    >
      <BrandBackdrop accent={a} photo={poster.photo} />

      {/* Contenido */}
      <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 46 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Wordmark accent={a} />
          {poster.sport && (
            <span style={{ fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase', border: `1px solid rgba(${a.glow},0.6)`, color: a.light, padding: '6px 13px', borderRadius: 999, backdropFilter: 'blur(2px)' }}>{poster.sport}</span>
          )}
        </div>

        <div>
          {poster.subtitle && (
            <div style={{ fontSize: 11.5, letterSpacing: 3.5, color: a.light, textTransform: 'uppercase', marginBottom: 14, fontWeight: 500 }}>{poster.subtitle}</div>
          )}
          <h2 style={{ fontFamily: SERIF, fontSize: 56, lineHeight: 0.98, margin: 0, fontWeight: 600, letterSpacing: -0.5, textShadow: '0 4px 40px rgba(0,0,0,0.4)' }}>{poster.title}</h2>
          <div style={{ height: 1.5, width: 72, background: `linear-gradient(90deg, ${a.light}, rgba(${a.glow},0.12))`, margin: '22px 0 20px' }} />
          {poster.dateLine && <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: 0.3, marginBottom: 5 }}>{poster.dateLine}</div>}
          {poster.location && <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.78)', letterSpacing: 0.2, marginBottom: 20 }}>{poster.location}</div>}
          {poster.bullets.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 26px', display: 'flex', flexDirection: 'column', gap: 9 }}>
              {poster.bullets.map((b, i) => (
                <li key={i} style={{ fontSize: 13.5, display: 'flex', gap: 11, alignItems: 'baseline', color: 'rgba(255,255,255,0.90)', letterSpacing: 0.1 }}>
                  <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: a.light, flexShrink: 0, transform: 'translateY(-2px)' }} />{b}
                </li>
              ))}
            </ul>
          )}
          {poster.cta && (
            <div style={{ display: 'inline-block', background: `linear-gradient(135deg, ${a.light}, ${a.main})`, color: '#0A1024', fontWeight: 700, fontSize: 14, letterSpacing: 0.4, padding: '13px 28px', borderRadius: 999, boxShadow: `0 12px 34px -10px rgba(${a.glow},0.55)` }}>{poster.cta}</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function EventosPage() {
  const [agenda, setAgenda] = useState<Agenda | null>(null)
  const loadAgenda = useCallback(() => {
    fetch('/api/agents/eventos').then(r => r.json()).then(setAgenda).catch(() => {})
  }, [])
  useEffect(() => { loadAgenda() }, [loadAgenda])

  const [eventoInfo, setEventoInfo] = useState('')
  const [instructions, setInstructions] = useState('')
  const [poster, setPoster] = useState<Poster | null>(null)
  const [loadingPoster, setLoadingPoster] = useState(false)
  const [posterErr, setPosterErr] = useState('')
  const posterRef = useRef<HTMLDivElement>(null)

  async function generarPoster() {
    if (!eventoInfo.trim()) return
    setLoadingPoster(true); setPosterErr(''); setPoster(null)
    try {
      const res = await fetch('/api/agents/eventos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'poster', message: eventoInfo, instructions }),
        signal: AbortSignal.timeout(120_000),
      })
      const data = await res.json()
      if (data.poster) setPoster(data.poster as Poster)
      else setPosterErr(data.error ?? 'No se pudo generar el póster')
    } catch {
      setPosterErr('Error de conexión o tardó demasiado. Intenta de nuevo.')
    }
    setLoadingPoster(false)
  }

  async function exportarPoster() {
    if (!posterRef.current) return
    try {
      const url = await toPng(posterRef.current, { pixelRatio: 2, cacheBust: true })
      const a = document.createElement('a')
      a.href = url
      a.download = `poster-${(poster?.title ?? 'evento').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.png`
      a.click()
    } catch {
      setPosterErr('No se pudo exportar la imagen.')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10,
    color: T.text, padding: '12px 14px', fontSize: 14, fontFamily: 'inherit', resize: 'vertical',
  }
  const btnStyle = (primary = true): React.CSSProperties => ({
    background: primary ? T.gold : 'transparent', color: primary ? '#080C14' : T.gold,
    border: `1px solid ${T.gold}`, borderRadius: 999, padding: '11px 22px', fontSize: 14,
    fontWeight: 700, cursor: 'pointer',
  })

  return (
    <div>
      <PageHeader
        title="Eventos"
        blurb="Registra eventos del club en lenguaje natural (incluye recurrentes como ligas), lleva la agenda histórica y genera pósters exportables de cada evento."
      />

      {/* 1 · Registrar evento */}
      <TriggerPanel
        endpoint="/api/agents/eventos"
        label="Describe el evento (puntual o recurrente)"
        placeholder="Ej: Liga de pádel los martes 8pm desde el 1 de julio · o · Torneo de pickleball sábado 28 a las 6pm, 300 por pareja"
        cta="Registrar evento"
        buildPayload={(text) => ({ message: text })}
        renderResult={renderResult}
      />

      {/* 2 · Agenda / histórico */}
      <Card style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionTitle>Agenda del club{agenda ? ` · ${agenda.total}` : ''}</SectionTitle>
          <button onClick={loadAgenda} style={{ ...btnStyle(false), padding: '6px 14px', fontSize: 12 }}>Actualizar</button>
        </div>
        {!agenda
          ? <p style={{ color: T.muted, fontSize: 13 }}>Cargando agenda…</p>
          : agenda.total === 0
            ? <p style={{ color: T.muted, fontSize: 13 }}>Aún no hay eventos registrados. Registra el primero arriba.</p>
            : (
              <>
                <AgendaGroup title="Recurrentes" hint="ligas y fijos" items={agenda.recurrentes} />
                <AgendaGroup title="Próximos" items={agenda.proximos} />
                <AgendaGroup title="Sin fecha" items={agenda.sinFecha} />
                <AgendaGroup title="Histórico" hint="ya pasaron" items={agenda.pasados.slice(0, 10)} />
              </>
            )}
      </Card>

      {/* 3 · Póster del evento */}
      <Card style={{ marginTop: 24 }}>
        <SectionTitle>Generar póster del evento</SectionTitle>
        <p style={{ fontSize: 13, color: T.textSec, margin: '4px 0 16px' }}>
          Pega la info del evento; el agente arma un póster con la identidad Bahía y una foto real del club. Lo exportas como PNG. Tus instrucciones se guardan y entrenan los siguientes.
        </p>
        <textarea
          value={eventoInfo}
          onChange={e => setEventoInfo(e.target.value)}
          placeholder="Info del evento: nombre, fecha, hora, precio, formato, premio…"
          rows={3}
          style={{ ...inputStyle, marginBottom: 10 }}
        />
        <input
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          placeholder="Instrucción opcional de diseño (ej. menos texto, tono más vibrante, usa la alberca)"
          style={{ ...inputStyle, marginBottom: 12 }}
        />
        <button onClick={generarPoster} disabled={loadingPoster || !eventoInfo.trim()} style={{ ...btnStyle(true), opacity: loadingPoster || !eventoInfo.trim() ? 0.55 : 1 }}>
          {loadingPoster ? 'Generando…' : 'Generar póster'}
        </button>
        {posterErr && <p style={{ color: T.danger, fontSize: 13, marginTop: 12 }}>{posterErr}</p>}

        {poster && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
            <PosterCard poster={poster} innerRef={posterRef} />
            <button onClick={exportarPoster} style={btnStyle(false)}>↓ Exportar PNG</button>
          </div>
        )}
      </Card>
    </div>
  )
}
