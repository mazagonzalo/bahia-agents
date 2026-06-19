'use client'
import { useState, useEffect, useCallback } from 'react'
import { T, Card, StatCard, Badge, EmptyState, PageHeader, ScoreBar, Skeleton } from '../_components/ui'

const nf = (n: number) => n.toLocaleString('es-MX')

// ─── Types (espejan el shape real de GET /api/agents/seguimiento) ─────────────
// El endpoint devuelve conteos por etapa (pipeline) y los leads de cada etapa.
// Cada lead trae { id, name, phone, last_contact } (score llega en la Fase 4).

type SeguimientoLead = {
  id: string
  name: string | null
  phone: string
  last_contact: string | null
  score?: number | null
}

type Pipeline = {
  sinRespuesta24h: number
  calificadosSinAvance: number
  citadosPendientes: number
  inactivos7d: number
}

type SeguimientoData = {
  pipeline: Pipeline
  leads: {
    sinRespuesta24h: SeguimientoLead[]
    calificadosSinAvance: SeguimientoLead[]
    citadosPendientes: SeguimientoLead[]
    inactivos7d: SeguimientoLead[]
  }
}

// ─── Mapeo de etapa → etiqueta + tono del Badge ───────────────────────────────

type StageKey = keyof Pipeline
type BadgeTone = 'gold' | 'teal' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

const STAGES: { key: StageKey; label: string; status: string; tone: BadgeTone }[] = [
  { key: 'sinRespuesta24h', label: 'Sin respuesta 24h', status: 'nuevo', tone: 'warning' },
  { key: 'calificadosSinAvance', label: 'Calificado sin avance', status: 'calificado', tone: 'info' },
  { key: 'citadosPendientes', label: 'Citado pendiente', status: 'citado', tone: 'success' },
  { key: 'inactivos7d', label: 'Inactivo 7d+', status: 'inactivo', tone: 'danger' },
]

type Row = SeguimientoLead & { status: string; tone: BadgeTone }

function fmtContact(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 3600 * 1000))
  if (days <= 0) return 'hoy'
  if (days === 1) return 'ayer'
  return `hace ${days}d`
}

// ─── Skeleton con la forma del contenido (KPIs + tabla) ───────────────────────

function LeadsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div className="grid-kpis">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="metric-card" style={{ minWidth: 0 }}>
            <Skeleton width="60%" height={10} />
            <Skeleton width="45%" height={28} radius="var(--radius-sm)" />
          </div>
        ))}
      </div>
      <Card>
        <Skeleton width={180} height={10} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-5)' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <Skeleton width="32%" height={14} />
              <Skeleton width={96} height={20} radius="var(--radius-full)" />
              <Skeleton width="20%" height={4} radius="var(--radius-full)" />
              <Skeleton width={56} height={12} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [data, setData] = useState<SeguimientoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/agents/seguimiento')
      if (res.ok) {
        setData(await res.json())
        setError(null)
      } else {
        setError('No se pudo cargar el pipeline')
      }
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData() }, [fetchData])

  const pipeline = data?.pipeline
  const rows: Row[] = data
    ? STAGES.flatMap(s =>
        (data.leads[s.key] ?? []).map(l => ({ ...l, status: s.label, tone: s.tone })),
      )
    : []
  const total = pipeline
    ? pipeline.sinRespuesta24h + pipeline.calificadosSinAvance + pipeline.citadosPendientes + pipeline.inactivos7d
    : 0

  return (
    <>
      <PageHeader
        title="Leads"
        blurb="Pipeline de prospectos del club (WhatsApp / Instagram), agrupado por etapa de seguimiento."
        actions={
          <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        }
      />

      {/* Aviso de vista previa */}
      <Card style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <Badge tone="warning">Vista previa</Badge>
        <div style={{ fontSize: 12, color: T.textSec, lineHeight: 1.5 }}>
          Estos datos vienen del agente de <strong style={{ color: T.text }}>Seguimiento</strong> (pipeline en vivo de
          Supabase). El <strong style={{ color: T.text }}>CRM gobernado</strong> con modelos
          {' '}<code style={{ color: T.gold }}>Lead</code> y <code style={{ color: T.gold }}>Conversation</code> en
          Prisma —con historial, notas y propiedad por etapa— llega en la <strong style={{ color: T.text }}>Fase 4</strong>.
        </div>
      </Card>

      {loading && !data && <LeadsSkeleton />}

      {!loading && error && !data && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <EmptyState title="No se pudo cargar el pipeline" sub={error} />
          <button className="btn btn-secondary" onClick={fetchData} style={{ marginTop: 'var(--space-2)' }}>
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && data && total === 0 && (
        <EmptyState title="Sin prospectos pendientes" sub="No hay leads en seguimiento en este momento." />
      )}

      {data && total > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {/* Conteos por etapa */}
          {pipeline && (
            <div className="grid-kpis">
              <StatCard label="Total en pipeline" value={nf(total)} />
              <StatCard label="Sin respuesta 24h" value={nf(pipeline.sinRespuesta24h)} color={T.warning} />
              <StatCard label="Calif. sin avance" value={nf(pipeline.calificadosSinAvance)} color={T.info} />
              <StatCard label="Citados pendientes" value={nf(pipeline.citadosPendientes)} color={T.success} />
              <StatCard label="Inactivos 7d+" value={nf(pipeline.inactivos7d)} color={T.danger} />
            </div>
          )}

          {/* Tabla de leads */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600 }}>
                Prospectos en seguimiento
              </div>
              <div style={{ fontSize: 12, color: T.textSec, fontFamily: 'var(--font-headline)' }}>
                {nf(rows.length)} {rows.length === 1 ? 'prospecto' : 'prospectos'}
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 180 }}>Prospecto</th>
                    <th style={{ minWidth: 140 }}>Etapa</th>
                    <th style={{ width: 160, minWidth: 140 }}>Score</th>
                    <th style={{ textAlign: 'right', minWidth: 120 }}>Último contacto</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(l => (
                    <tr key={`${l.status}-${l.id}`}>
                      <td>
                        <div style={{ fontWeight: 600, color: T.text, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name ?? 'Sin nombre'}</div>
                        <div style={{ fontSize: 12, color: T.muted, fontFamily: 'var(--font-headline)' }}>{l.phone}</div>
                      </td>
                      <td><Badge tone={l.tone}>{l.status}</Badge></td>
                      <td>
                        {typeof l.score === 'number'
                          ? <ScoreBar score={l.score} />
                          : <span style={{ fontSize: 12, color: T.muted }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'right', color: T.textSec, whiteSpace: 'nowrap' }}>{fmtContact(l.last_contact)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
