'use client'
import { useState, useEffect, useCallback } from 'react'
import { T, Card, StatCard, SectionTitle, Badge, EmptyState, PageHeader, Skeleton, SkeletonText } from '../_components/ui'

const nf = (n: number) => n.toLocaleString('es-MX')

// ─── Shape REAL del GET /api/agents/meta-ads (monitorCampaigns) ───────────────
// Sin campañas activas →            { message: string }
// Con campañas monitoreadas →       { monitored: number; alerts: number }
type MetaAdsMonitor =
  | { message: string }
  | { monitored: number; alerts: number }

type Snapshot = {
  monitored: number
  alerts: number
  message: string | null
  at: string
}

function isSummary(d: MetaAdsMonitor): d is { monitored: number; alerts: number } {
  return typeof (d as { monitored?: unknown }).monitored === 'number'
}

const ENDPOINT = '/api/agents/meta-ads'

export default function MetaAdsPage() {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Acción secundaria: re-disparar el barrido de monitoreo en Meta (POST action=monitor).
  const [checking, setChecking] = useState(false)
  const [checkMsg, setCheckMsg] = useState<string | null>(null)

  const load = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'refresh') setRefreshing(true)
    setError(null)
    try {
      const res = await fetch(ENDPOINT)
      const data = (await res.json().catch(() => null)) as MetaAdsMonitor | null
      if (!res.ok || !data) {
        setError(`Error ${res.status}: no se pudo leer el monitoreo de campañas.`)
      } else if (isSummary(data)) {
        setSnap({ monitored: data.monitored, alerts: data.alerts, message: null, at: new Date().toISOString() })
      } else {
        setSnap({ monitored: 0, alerts: 0, message: data.message, at: new Date().toISOString() })
      }
    } catch {
      setError('Error de red — intenta de nuevo.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load('initial') }, [load])

  async function runMonitor() {
    if (checking) return
    setChecking(true)
    setCheckMsg(null)
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'monitor' }),
      })
      const data = (await res.json().catch(() => null)) as MetaAdsMonitor | null
      if (!res.ok || !data) {
        setCheckMsg('No se pudo correr la verificación.')
      } else if (isSummary(data)) {
        setSnap({ monitored: data.monitored, alerts: data.alerts, message: null, at: new Date().toISOString() })
        setCheckMsg(`Verificadas ${data.monitored} campaña(s) · ${data.alerts} alerta(s).`)
      } else {
        setSnap({ monitored: 0, alerts: 0, message: data.message, at: new Date().toISOString() })
        setCheckMsg(data.message)
      }
    } catch {
      setCheckMsg('Error de red durante la verificación.')
    } finally {
      setChecking(false)
    }
  }

  const blurb = 'Vigila las campañas activas de Meta Ads, mide el costo por lead (CPL) y alerta por WhatsApp cuando una campaña se sale de presupuesto.'

  const actions = (
    <>
      <button className="btn btn-ghost" onClick={runMonitor} disabled={checking || loading}>
        {checking ? 'Verificando…' : 'Verificar campañas'}
      </button>
      <button className="btn btn-secondary" onClick={() => load('refresh')} disabled={refreshing || loading}>
        {refreshing ? 'Actualizando…' : 'Actualizar'}
      </button>
    </>
  )

  return (
    <div>
      <PageHeader title="Meta Ads" blurb={blurb} actions={actions} />

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }} aria-busy="true">
          <Skeleton width={220} height={12} />
          <div className="grid-kpis">
            {[0, 1, 2].map((i) => (
              <div key={i} className="metric-card">
                <Skeleton width="55%" height={10} />
                <Skeleton width={64} height={28} />
                <Skeleton width="70%" height={12} />
              </div>
            ))}
          </div>
          <Card>
            <Skeleton width={120} height={12} />
            <div style={{ marginTop: 'var(--space-5)' }}>
              <SkeletonText lines={4} />
            </div>
          </Card>
        </div>
      )}

      {!loading && error && (
        <Card style={{ borderColor: T.danger + '55' }}>
          <div style={{ color: T.danger, fontWeight: 600, fontSize: 14 }}>{error}</div>
          <div style={{ color: T.textSec, fontSize: 13, marginTop: 6 }}>
            El agente lee las campañas publicadas en Supabase y consulta insights de Meta. Reintenta con Actualizar.
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => load('refresh')}
            disabled={refreshing}
            style={{ marginTop: 'var(--space-4)' }}
          >
            {refreshing ? 'Actualizando…' : 'Reintentar'}
          </button>
        </Card>
      )}

      {/* Sin campañas activas — la API devolvió { message } */}
      {!loading && !error && snap?.message && (
        <EmptyState
          title="Sin campañas activas"
          sub="No hay creativos publicados con campaña de Meta. Publica un creativo desde el agente de contenido para empezar a monitorear su rendimiento."
        />
      )}

      {/* Resumen de monitoreo — la API devolvió { monitored, alerts } */}
      {!loading && !error && snap && !snap.message && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <SectionTitle>Resumen del último barrido · 7 días</SectionTitle>

          <div className="grid-kpis">
            <StatCard
              label="Campañas monitoreadas"
              value={nf(snap.monitored)}
              sub="publicadas con ID de Meta"
            />
            <StatCard
              label="Alertas de CPL"
              value={nf(snap.alerts)}
              sub="CPL > $200 MXN"
              color={snap.alerts > 0 ? T.danger : T.success}
            />
            <StatCard
              label="Estado"
              value={snap.alerts > 0 ? 'Atención' : 'Sano'}
              sub={snap.alerts > 0 ? 'revisa WhatsApp' : 'dentro de presupuesto'}
              color={snap.alerts > 0 ? T.warning : T.success}
            />
          </div>

          <Card>
            <SectionTitle>Detalle</SectionTitle>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Métrica</th>
                    <th>Valor</th>
                    <th>Significado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Campañas activas</td>
                    <td style={{ fontWeight: 700, color: T.text, fontFamily: 'var(--font-headline)' }}>{nf(snap.monitored)}</td>
                    <td className="text-secondary">Creativos en estado «publicado» con campaña real en Meta.</td>
                  </tr>
                  <tr>
                    <td>Campañas con CPL alto</td>
                    <td style={{ fontWeight: 700, color: snap.alerts > 0 ? T.danger : T.text, fontFamily: 'var(--font-headline)' }}>{nf(snap.alerts)}</td>
                    <td className="text-secondary">
                      Costo por lead arriba de $200 MXN — el agente genera un creativo alternativo y avisa por WhatsApp.
                    </td>
                  </tr>
                  <tr>
                    <td>Salud general</td>
                    <td>
                      <Badge tone={snap.alerts > 0 ? 'danger' : 'success'}>
                        {snap.alerts > 0 ? `${nf(snap.alerts)} en riesgo` : 'Todo en presupuesto'}
                      </Badge>
                    </td>
                    <td className="text-secondary">Proporción de campañas dentro del umbral de CPL objetivo.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {checkMsg && (
            <div style={{ fontSize: 12, color: T.textSec }}>↻ {checkMsg}</div>
          )}

          <div style={{ fontSize: 11, color: T.muted }}>
            Última lectura: {new Date(snap.at).toLocaleString('es-MX')} · El cron de Meta Ads corre este barrido automáticamente.
          </div>
        </div>
      )}
    </div>
  )
}
