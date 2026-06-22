'use client'
import { useState, useEffect, useCallback } from 'react'
import { T, Card, StatCard, EmptyState, PageHeader, Badge, Skeleton } from '../_components/ui'

// ─── Types (espejan el shape real de GET /api/agents/seguimiento) ─────────────

type PipelineLead = {
  id: string
  name: string | null
  phone: string
  last_contact: string | null
}

type SeguimientoData = {
  pipeline: {
    sinRespuesta24h: number
    calificadosSinAvance: number
    citadosPendientes: number
    inactivos7d: number
  }
  leads: {
    sinRespuesta24h: PipelineLead[]
    calificadosSinAvance: PipelineLead[]
    citadosPendientes: PipelineLead[]
    inactivos7d: PipelineLead[]
  }
}

// ─── Etapas del embudo ────────────────────────────────────────────────────────

type EtapaKey = keyof SeguimientoData['pipeline']
type BadgeTone = 'gold' | 'teal' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

const ETAPAS: { key: EtapaKey; label: string; tone: BadgeTone; color: string; status: string }[] = [
  { key: 'sinRespuesta24h', label: 'Sin respuesta 24h', tone: 'warning', color: T.warning, status: 'Nuevo' },
  { key: 'calificadosSinAvance', label: 'Calificado sin avance', tone: 'info', color: T.info, status: 'Calificado' },
  { key: 'citadosPendientes', label: 'Cita pendiente', tone: 'success', color: T.success, status: 'Citado' },
  { key: 'inactivos7d', label: 'Inactivo 7d+', tone: 'danger', color: T.danger, status: 'Inactivo' },
]

// Etiquetas legibles para los tipos de follow-up que devuelve el preview (dryRun)
const TIPO_LABEL: Record<string, string> = {
  followup_24h: 'Sin respuesta 24h',
  followup_calificado: 'Calificado · agendar visita',
  followup_post_visita: 'Post-visita',
  reactivacion_7d: 'Reactivación 7d',
  reactivacion_14d: 'Último intento 14d',
}

type PreviewItem = { type: string; phone: string; name: string | null; sent: boolean; preview: string }

type FlatLead = PipelineLead & { etapa: EtapaKey }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diasSinContacto(last: string | null): number | null {
  if (!last) return null
  const ms = Date.now() - new Date(last).getTime()
  if (Number.isNaN(ms)) return null
  return Math.max(0, Math.floor(ms / (24 * 3600 * 1000)))
}

function fechaCorta(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
}

const nf = (n: number) => n.toLocaleString('es-MX')

// ─── Skeleton con la forma del contenido (KPIs + tabla) ──────────────────────

function SeguimientoSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <div className="grid-kpis">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="metric-card" style={{ minWidth: 0 }}>
            <Skeleton height={10} width="55%" />
            <Skeleton height={28} width="40%" />
            <Skeleton height={12} width="70%" />
          </div>
        ))}
      </div>
      <Card>
        <Skeleton height={10} width={180} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-5)' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <Skeleton height={14} width="26%" />
              <Skeleton height={14} width="20%" />
              <Skeleton height={20} width={72} radius={999} />
              <span style={{ flex: 1 }} />
              <Skeleton height={14} width={48} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function SeguimientoPage() {
  const [data, setData] = useState<SeguimientoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [preview, setPreview] = useState<PreviewItem[] | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewErr, setPreviewErr] = useState<string | null>(null)

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

  const runPreview = useCallback(async () => {
    setPreviewLoading(true); setPreviewErr(null)
    try {
      const res = await fetch('/api/agents/seguimiento', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true }), signal: AbortSignal.timeout(180_000),
      })
      const json = await res.json()
      const items = (json.results as PreviewItem[] | undefined)?.filter(r => r.preview) ?? []
      setPreview(items)
      if (!items.length) setPreviewErr('No hay mensajes que generar ahora mismo.')
    } catch {
      setPreviewErr('No se pudo generar el preview (o tardó demasiado).')
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData() }, [fetchData])

  const pipeline = data?.pipeline
  const totalPendientes = pipeline
    ? pipeline.sinRespuesta24h + pipeline.calificadosSinAvance + pipeline.citadosPendientes + pipeline.inactivos7d
    : 0

  // Aplanar leads por etapa para la tabla, ordenados por días sin contacto (más urgente arriba)
  const filas: FlatLead[] = data
    ? ETAPAS.flatMap(e => (data.leads[e.key] ?? []).map(l => ({ ...l, etapa: e.key })))
        .sort((a, b) => (diasSinContacto(b.last_contact) ?? -1) - (diasSinContacto(a.last_contact) ?? -1))
    : []

  return (
    <>
      <PageHeader
        title="Seguimiento"
        blurb="Reactiva prospectos sin avance: detecta cada etapa estancada del embudo y dispara mensajes de seguimiento por WhatsApp."
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
              {loading ? 'Cargando…' : 'Actualizar'}
            </button>
            <button className="btn btn-primary" onClick={runPreview} disabled={previewLoading}>
              {previewLoading ? 'Generando…' : 'Previsualizar mensajes'}
            </button>
          </div>
        }
      />

      {(preview || previewErr || previewLoading) && (
        <Card style={{ marginBottom: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 600 }}>
              Preview de mensajes · no enviados
            </div>
            <button className="btn btn-secondary" onClick={() => { setPreview(null); setPreviewErr(null) }} style={{ fontSize: 12 }}>Cerrar</button>
          </div>
          {previewLoading && <div style={{ fontSize: 13, color: T.muted }}>Generando mensajes (sin enviar)…</div>}
          {previewErr && !previewLoading && <div style={{ fontSize: 13, color: T.warning }}>{previewErr}</div>}
          {preview && preview.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {preview.map((p, i) => (
                <div key={i} style={{ padding: 'var(--space-3) var(--space-4)', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>{p.name ?? 'Sin nombre'}</span>
                    <span style={{ color: T.muted, fontSize: 12, fontFamily: 'var(--font-headline)' }}>{p.phone}</span>
                    <Badge tone="muted">{TIPO_LABEL[p.type] ?? p.type}</Badge>
                  </div>
                  <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.5 }}>{p.preview}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {loading && !data && <SeguimientoSkeleton />}

      {!loading && error && !data && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <EmptyState title="Sin datos" sub={error} />
          <button className="btn btn-secondary" onClick={fetchData} style={{ marginTop: 'var(--space-1)' }}>
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && data && totalPendientes === 0 && (
        <EmptyState title="Embudo al día" sub="No hay prospectos estancados que requieran seguimiento ahora mismo." />
      )}

      {data && totalPendientes > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {/* Embudo — una StatCard por etapa */}
          <div className="grid-kpis">
            <StatCard label="Pendientes total" value={nf(totalPendientes)} sub="prospectos por seguir" />
            {pipeline && ETAPAS.map(e => (
              <StatCard key={e.key} label={e.label} value={nf(pipeline[e.key])} color={e.color} />
            ))}
          </div>

          {/* Tabla de leads */}
          <Card>
            <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>
              Prospectos por seguir ({nf(filas.length)})
            </div>
            {filas.length === 0 ? (
              <div style={{ fontSize: 13, color: T.muted, padding: '20px 0' }}>Sin prospectos en seguimiento.</div>
            ) : (
              <div style={{ overflowX: 'auto', margin: '0 calc(-1 * var(--space-5))', padding: '0 var(--space-5)' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Prospecto</th>
                    <th>WhatsApp</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Sin contacto</th>
                    <th style={{ textAlign: 'right' }}>Último</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map(l => {
                    const etapa = ETAPAS.find(e => e.key === l.etapa)!
                    const dias = diasSinContacto(l.last_contact)
                    const diasColor = dias === null ? T.muted : dias >= 7 ? T.danger : dias >= 2 ? T.warning : T.textSec
                    return (
                      <tr key={l.id}>
                        <td style={{ fontWeight: 600, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {l.name ?? 'Sin nombre'}
                        </td>
                        <td style={{ color: T.textSec, fontFamily: 'var(--font-headline)', whiteSpace: 'nowrap' }}>{l.phone}</td>
                        <td><Badge tone={etapa.tone}>{etapa.status}</Badge></td>
                        <td style={{ textAlign: 'right', color: diasColor, fontWeight: 700, fontFamily: 'var(--font-headline)', whiteSpace: 'nowrap' }}>
                          {dias === null ? '—' : `${nf(dias)}d`}
                        </td>
                        <td style={{ textAlign: 'right', color: T.muted, whiteSpace: 'nowrap' }}>{fechaCorta(l.last_contact)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
