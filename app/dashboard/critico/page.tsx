'use client'
import { useState, useEffect, useCallback } from 'react'
import { T, Card, StatCard, EmptyState, PageHeader, Skeleton, SkeletonText } from '../_components/ui'

// ─── Helpers de formato ───────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('es-MX')

// ─── Types (espejan el shape real de GET /api/agents/critico) ─────────────────

type CriticoReport = {
  verdict: string
  score: number
  campañasDestacadas: { id: string; veredicto: string; calificacion: 'A' | 'B' | 'C' | 'D' | 'F'; razon: string; mejorar: string }[]
  patronesDetectados: string[]
  problemas: { problema: string; impacto: 'alto' | 'medio' | 'bajo'; evidencia: string }[]
  accionesInmediatas: string[]
  alertas: { nivel: 'rojo' | 'amarillo' | 'verde'; mensaje: string }[]
}

type CampañaCalificada = {
  id: string
  tipo: string
  titulo: string
  instalacion: string
  hook: string
  status: string
  hasCampaign: boolean
  aiScore: number | null
  leadsAtribuidos: number
  leadsCalificados: number
  leadsCitados: number
  leadsCerrados: number
  leadsFrios: number
  interaccionPromedio: number
  tasaConversion: number
  tasaFrio: number
  calidad: 'alta' | 'media' | 'baja' | 'sin-datos'
  createdAt: string
}

type Tendencia = { desde: string; leads: number; cerrados: number; conversion: number; frios: number }

type CriticoData = {
  campañas: CampañaCalificada[]
  resumen: { totalLeads: number; totalCerrados: number; totalCitados: number; totalFrios: number; leadsOrganicos: number; totalCreativos: number }
  tendencia: Tendencia | null
  atribucionDisponible: boolean
  report: CriticoReport | null
  generatedAt: string
}

// ─── Mapeo de grade a tono ────────────────────────────────────────────────────

type Grade = 'A' | 'B' | 'C' | 'D' | 'F' | '—'
const GRADE_COLOR: Record<Grade, string> = {
  A: T.success, B: T.info, C: T.gold, D: T.danger, F: T.danger, '—': T.muted,
}

function gradeFor(c: CampañaCalificada, report: CriticoReport | null): Grade {
  const highlight = report?.campañasDestacadas?.find(d => d.id === c.id)
  if (highlight?.calificacion) return highlight.calificacion
  if (c.calidad === 'alta') return 'B'
  if (c.calidad === 'baja') return 'D'
  if (c.calidad === 'sin-datos') return '—'
  return 'C'
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function Delta({ label, v, unit, invert }: { label: string; v: number; unit?: string; invert?: boolean }) {
  const neutral = v === 0
  const good = invert ? v < 0 : v > 0
  const color = neutral ? T.muted : good ? T.success : T.danger
  const arrow = neutral ? '→' : v > 0 ? '▲' : '▼'
  return (
    <div>
      <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color, fontFamily: 'var(--font-headline)' }}>
        {arrow} {v >= 0 ? '+' : ''}{v}{unit ? ` ${unit}` : ''}
      </div>
    </div>
  )
}

function Verdict({ report }: { report: CriticoReport }) {
  const scoreColor = report.score >= 7 ? T.success : report.score >= 4 ? T.gold : T.danger
  return (
    <Card style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
      <div style={{ textAlign: 'center', minWidth: 72 }}>
        <div style={{ fontSize: 42, fontWeight: 800, fontFamily: 'var(--font-headline)', color: scoreColor, lineHeight: 1 }}>{report.score}</div>
        <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>/10</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: T.text, fontWeight: 600, lineHeight: 1.5, marginBottom: 10 }}>{report.verdict}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {report.alertas?.map((a, i) => {
            const c = a.nivel === 'rojo' ? T.danger : a.nivel === 'amarillo' ? T.warning : T.success
            return (
              <div key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: c + '1f', borderRadius: 6, padding: '3px 10px' }}>
                <span style={{ fontSize: 7, color: c }}>●</span>
                <span style={{ fontSize: 11, color: T.textSec }}>{a.mensaje}</span>
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function CampañaRow({ c, report }: { c: CampañaCalificada; report: CriticoReport | null }) {
  const grade = gradeFor(c, report)
  const gColor = GRADE_COLOR[grade]
  const highlight = report?.campañasDestacadas?.find(d => d.id === c.id)
  return (
    <div className="critico-row" style={{ background: T.surface2, borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'grid', gridTemplateColumns: 'auto minmax(180px, 1fr) auto auto auto auto auto', alignItems: 'center', gap: 16, minWidth: 720, transition: 'background 0.18s ease' }}>
      {/* Grade */}
      <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: gColor + '26', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-headline)', color: gColor }}>
        {grade}
      </div>
      {/* Título + hook */}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.titulo}</div>
        <div style={{ fontSize: 11, color: T.muted, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.hook}</div>
        {highlight?.veredicto && <div style={{ fontSize: 11, color: T.textSec, marginTop: 4, lineHeight: 1.4 }}>{highlight.veredicto}</div>}
      </div>
      {/* Stats */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: 'var(--font-headline)' }}>{fmt(c.leadsAtribuidos)}</div>
        <div style={{ fontSize: 9, color: T.muted }}>leads</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.info, fontFamily: 'var(--font-headline)' }}>{fmt(c.leadsCitados)}</div>
        <div style={{ fontSize: 9, color: T.muted }}>citas</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.success, fontFamily: 'var(--font-headline)' }}>{fmt(c.leadsCerrados)}</div>
        <div style={{ fontSize: 9, color: T.muted }}>cerrados</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: c.tasaFrio > 50 ? T.danger : T.muted, fontFamily: 'var(--font-headline)' }}>{c.tasaFrio}%</div>
        <div style={{ fontSize: 9, color: T.muted }}>fríos</div>
      </div>
      {/* Tipo badge */}
      <div style={{ fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-md)', background: T.info + '22', color: T.info, fontWeight: 600, whiteSpace: 'nowrap' }}>{c.tipo}</div>
    </div>
  )
}

function PatternsAndActions({ report }: { report: CriticoReport }) {
  return (
    <div className="grid-2">
      <Card>
        <div style={{ fontSize: 10, color: T.info, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>Patrones detectados</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {report.patronesDetectados?.map((p, i) => (
            <div key={i} style={{ fontSize: 12, color: T.text, lineHeight: 1.5, display: 'flex', gap: 8 }}>
              <span style={{ color: T.info }}>→</span>{p}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: T.danger, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>Problemas</div>
        {report.problemas?.map((p, i) => {
          const c = p.impacto === 'alto' ? T.danger : p.impacto === 'medio' ? T.warning : T.success
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: c + '22', color: c, fontWeight: 600, whiteSpace: 'nowrap' }}>{p.impacto}</span>
              <div style={{ fontSize: 12, color: T.text, lineHeight: 1.4 }}>{p.problema}<span style={{ color: T.muted, fontStyle: 'italic' }}> — {p.evidencia}</span></div>
            </div>
          )
        })}
      </Card>
      <Card>
        <div style={{ fontSize: 10, color: T.gold, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>Acciones esta semana</div>
        {report.accionesInmediatas?.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: T.gold, fontFamily: 'var(--font-headline)', minWidth: 18 }}>{i + 1}.</span>
            <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5 }}>{a}</div>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ─── Skeleton de carga (espeja la forma del contenido real) ───────────────────

function CriticoSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* Veredicto */}
      <Card style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
        <div style={{ minWidth: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <Skeleton width={56} height={42} radius="var(--radius-md)" />
          <Skeleton width={28} height={10} />
        </div>
        <div style={{ flex: 1 }}>
          <SkeletonText lines={2} />
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {[120, 96, 140].map((w, i) => <Skeleton key={i} width={w} height={22} radius="var(--radius-sm)" />)}
          </div>
        </div>
      </Card>
      {/* KPIs */}
      <div className="grid-kpis">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="metric-card" style={{ minWidth: 0 }}>
            <Skeleton width="55%" height={10} />
            <Skeleton width="45%" height={28} />
          </div>
        ))}
      </div>
      {/* Tabla de campañas */}
      <Card>
        <Skeleton width={180} height={10} radius="var(--radius-sm)" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={56} radius="var(--radius-md)" />
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function CriticoPage() {
  const [data, setData] = useState<CriticoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [evaluating, setEvaluating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carga rápida: lee el último reporte YA calculado (instantáneo).
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/agents/critico/report')
      if (res.ok) { setData(await res.json()); setError(null) }
      else if (res.status === 404) { setData(null); setError(null) } // aún no hay evaluación → estado vacío
      else setError('No se pudo cargar la evaluación')
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }, [])

  // Reevaluar: recalcula desde cero (tarda ~1 min) y actualiza + cachea.
  const reevaluar = useCallback(async () => {
    setEvaluating(true); setError(null)
    try {
      const res = await fetch('/api/agents/critico', { signal: AbortSignal.timeout(290_000) })
      if (res.ok) setData(await res.json())
      else setError('No se pudo reevaluar')
    } catch {
      setError('La reevaluación tardó demasiado o falló')
    } finally {
      setEvaluating(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData() }, [fetchData])

  const r = data?.resumen
  const report = data?.report ?? null

  return (
    <>
      <style>{'.critico-row:hover{background:' + T.surface3 + ' !important}'}</style>
      <PageHeader
        title="Crítico"
        blurb="Califica honestamente cada campaña publicitaria con datos reales de leads, citas y cierres."
        actions={
          <button className="btn btn-secondary" onClick={reevaluar} disabled={evaluating || loading}>
            {evaluating ? 'Evaluando… (~1 min)' : loading ? 'Cargando…' : 'Reevaluar'}
          </button>
        }
      />

      {loading && !data && <CriticoSkeleton />}

      {!loading && error && !data && (
        <div>
          <EmptyState title="Sin evaluación" sub={error} />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-2)' }}>
            <button className="btn btn-secondary" onClick={fetchData}>Reintentar</button>
          </div>
        </div>
      )}

      {!loading && !error && !data && (
        <div>
          <EmptyState title="Aún no hay evaluación" sub="Dale a «Evaluar ahora» para calcular la primera (~1 min)." />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-2)' }}>
            <button className="btn btn-primary" onClick={reevaluar} disabled={evaluating}>{evaluating ? 'Evaluando… (~1 min)' : 'Evaluar ahora'}</button>
          </div>
        </div>
      )}

      {!loading && !error && data && data.campañas.length === 0 && !report && (
        <div>
          <EmptyState title="Sin campañas" sub="No hay creativos ni campañas en los últimos 30 días." />
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-2)' }}>
            <button className="btn btn-secondary" onClick={reevaluar} disabled={evaluating}>Reevaluar</button>
          </div>
        </div>
      )}

      {data && (report || data.campañas.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {report && <Verdict report={report} />}

          {/* Métricas globales */}
          {r && (
            <div className="grid-kpis">
              <StatCard label="Campañas" value={fmt(r.totalCreativos)} />
              <StatCard label="Leads totales" value={fmt(r.totalLeads)} />
              <StatCard label="Citados" value={fmt(r.totalCitados)} color={T.info} />
              <StatCard label="Cerrados" value={fmt(r.totalCerrados)} color={T.success} />
              <StatCard label="Orgánicos" value={fmt(r.leadsOrganicos)} color={T.textSec} />
            </div>
          )}

          {/* Tendencia vs evaluación anterior */}
          {data.tendencia && (
            <Card>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>
                Tendencia vs evaluación anterior · {data.tendencia.desde}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
                <Delta label="Leads" v={data.tendencia.leads} />
                <Delta label="Cerrados" v={data.tendencia.cerrados} />
                <Delta label="Conversión" v={data.tendencia.conversion} unit="pts" />
                <Delta label="Fríos" v={data.tendencia.frios} unit="pts" invert />
              </div>
            </Card>
          )}

          {/* Nota de atribución (cuando no hay enlace lead→campaña) */}
          {!data.atribucionDisponible && (
            <div style={{ padding: 'var(--space-3) var(--space-4)', background: T.surface2, border: `1px solid ${T.warning}`, borderRadius: 'var(--radius-lg)', fontSize: 13, color: T.textSec, lineHeight: 1.5 }}>
              ⚠️ <strong style={{ color: T.text }}>Sin atribución lead→campaña.</strong> El grading por campaña requiere conectar Meta/tracking. Mientras tanto, la evaluación se centra en la salud del embudo global y la calidad del contenido.
            </div>
          )}

          {/* Tabla de campañas */}
          <Card>
            <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>Rendimiento por campaña</div>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.campañas.length === 0 && (
                  <div style={{ fontSize: 13, color: T.muted, padding: '20px 0' }}>Sin campañas en los últimos 30 días.</div>
                )}
                {data.campañas.map(c => <CampañaRow key={c.id} c={c} report={report} />)}
              </div>
            </div>
          </Card>

          {/* Patrones + acciones */}
          {report && <PatternsAndActions report={report} />}
        </div>
      )}
    </>
  )
}
