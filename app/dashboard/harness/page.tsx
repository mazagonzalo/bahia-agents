'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  T, Card, StatCard, SectionTitle, Badge, EmptyState, PageHeader, Skeleton,
} from '../_components/ui'

type RunStatus = 'SUCCESS' | 'FAILED' | 'ABSTAINED'
type Run = {
  id: string; agentType: string; status: RunStatus
  latencyMs: number; inputTokens: number; outputTokens: number; costUsd: number; createdAt: string
}
type Summary = {
  totalRuns: number; totalCostUsd: number; totalInputTokens: number; totalOutputTokens: number
  byStatus: Record<string, number>
}
type Approval = {
  id: string; agentType: string; status: string
  proposalData: Record<string, unknown>; createdAt: string
}

const nf = (n: number) => n.toLocaleString('es-MX')
const usd = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`

const RUN_TONE: Record<RunStatus, 'success' | 'danger' | 'muted'> = {
  SUCCESS: 'success', FAILED: 'danger', ABSTAINED: 'muted',
}
const APPROVAL_TONE: Record<string, 'warning' | 'success' | 'danger' | 'info'> = {
  PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger', EXECUTED: 'info',
}

export default function HarnessPage() {
  const [runs, setRuns] = useState<Run[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [r, a] = await Promise.all([
        fetch('/api/harness/runs'),
        fetch('/api/harness/approvals?status=PENDING'),
      ])
      if (r.ok) { const d = await r.json(); setRuns(d.runs ?? []); setSummary(d.summary ?? null) }
      else setError('No se pudo leer el ledger (¿DATABASE_URL en el entorno?)')
      if (a.ok) { const d = await a.json(); setApprovals(d.approvals ?? []) }
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  async function act(id: string, action: 'approve' | 'reject') {
    setActing(id)
    setActionError(null)
    try {
      const res = await fetch('/api/harness/approvals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      if (res.ok) {
        setApprovals((prev) => prev.filter((p) => p.id !== id))
      } else {
        const d = await res.json().catch(() => ({}))
        setActionError(d.error ?? `No se pudo ${action === 'approve' ? 'aprobar' : 'rechazar'} (HTTP ${res.status})`)
        // 409 (ya resuelta) / 401-403 (sesión o rol): recarga para reflejar el estado real.
        if (res.status === 409 || res.status === 401 || res.status === 403) load()
      }
    } catch {
      setActionError('Error de red al procesar la aprobación')
    } finally {
      setActing(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Gobierno del harness"
        blurb="Cada corrida de agente (runAgent) deja un registro de costo/tokens y, si propone una acción, una aprobación pendiente. Esto es lo que la app no tenía: trazabilidad y control."
        actions={<button className="btn btn-secondary" onClick={load}>Actualizar</button>}
      />

      {loading && (
        <div className="grid-kpis" style={{ marginBottom: 'var(--space-6)' }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={92} />)}
        </div>
      )}

      {!loading && error && (
        <EmptyState title="Sin datos del harness" sub={error} />
      )}

      {!loading && !error && (
        <>
          {/* Resumen */}
          <div className="grid-kpis" style={{ marginBottom: 'var(--space-8)' }}>
            <StatCard label="Corridas" value={nf(summary?.totalRuns ?? 0)} sub="runAgent registrados" />
            <StatCard label="Costo total" value={usd(summary?.totalCostUsd ?? 0)} sub="acumulado (USD)" color={T.teal} />
            <StatCard label="Tokens out" value={nf(summary?.totalOutputTokens ?? 0)} sub={`${nf(summary?.totalInputTokens ?? 0)} in`} color={T.textSec} />
            <StatCard label="Aprobaciones" value={nf(approvals.length)} sub="pendientes" color={approvals.length > 0 ? T.warning : T.muted} />
          </div>

          {/* Cola de aprobaciones */}
          <section style={{ marginBottom: 'var(--space-8)' }}>
            <SectionTitle>Cola de aprobaciones</SectionTitle>
            {actionError && (
              <Card style={{ borderColor: T.danger, marginBottom: 10 }}>
                <div style={{ color: T.danger, fontSize: 13 }}>{actionError}</div>
              </Card>
            )}
            {approvals.length === 0 ? (
              <Card><div style={{ color: T.muted, fontSize: 13 }}>Sin propuestas pendientes.</div></Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {approvals.map((a) => (
                  <Card key={a.id}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <Badge tone="gold">{a.agentType}</Badge>
                          <Badge tone={APPROVAL_TONE[a.status] ?? 'muted'}>{a.status}</Badge>
                        </div>
                        <div style={{ fontSize: 12, color: T.textSec, fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto', background: T.bg, padding: '10px 12px', borderRadius: 8, border: `1px solid ${T.border}` }}>
                          {JSON.stringify(a.proposalData, null, 2).slice(0, 600)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary" disabled={acting === a.id} onClick={() => act(a.id, 'approve')}>Aprobar</button>
                        <button className="btn btn-ghost" disabled={acting === a.id} onClick={() => act(a.id, 'reject')}>Rechazar</button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Ledger de corridas */}
          <section>
            <SectionTitle>Corridas recientes</SectionTitle>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Agente</th><th>Estado</th><th>Latencia</th><th>Tokens (in/out)</th><th>Costo</th><th>Cuándo</th></tr>
                  </thead>
                  <tbody>
                    {runs.length === 0 && (
                      <tr><td colSpan={6} style={{ color: T.muted, textAlign: 'center', padding: 24 }}>Aún no hay corridas registradas.</td></tr>
                    )}
                    {runs.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.agentType}</td>
                        <td><Badge tone={RUN_TONE[r.status]}>{r.status}</Badge></td>
                        <td>{nf(r.latencyMs)} ms</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{nf(r.inputTokens)} / {nf(r.outputTokens)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{usd(r.costUsd)}</td>
                        <td style={{ color: T.muted }}>{new Date(r.createdAt).toLocaleString('es-MX')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
