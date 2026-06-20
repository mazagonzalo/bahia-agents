import Link from 'next/link'
import { prisma } from '@/lib/db'
import { T, StatCard, Badge, EmptyState, PageHeader } from '../_components/ui'

export const dynamic = 'force-dynamic'

const STATUS_TONE: Record<string, 'info' | 'teal' | 'gold' | 'success' | 'danger' | 'muted'> = {
  nuevo: 'info', calificado: 'teal', citado: 'gold', cerrado: 'success', frio: 'danger',
}
const nf = (n: number) => n.toLocaleString('es-MX')
const fecha = (d: Date | null) => (d ? d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—')

async function getLeads() {
  try {
    const leads = await prisma.leads.findMany({
      orderBy: { created_at: 'desc' },
      take: 200,
      include: { _count: { select: { conversations: true } } },
    })
    const byStatus = leads.reduce<Record<string, number>>((acc, l) => {
      const s = l.status ?? 'nuevo'
      acc[s] = (acc[s] ?? 0) + 1
      return acc
    }, {})
    return { leads, byStatus, total: leads.length, error: null as string | null }
  } catch (e) {
    return { leads: [], byStatus: {}, total: 0, error: e instanceof Error ? e.message : 'error de DB' }
  }
}

export default async function LeadsPage() {
  const { leads, byStatus, total, error } = await getLeads()

  return (
    <div>
      <PageHeader title="Leads" blurb="Pipeline de prospectos del club. Los leads entran por WhatsApp/Instagram y los nutren los agentes de ventas y seguimiento." />

      {error ? (
        <EmptyState title="No se pudo cargar el CRM" sub={error.includes('DATABASE_URL') ? 'Falta DATABASE_URL en el entorno (ver STATUS.md).' : error} />
      ) : (
        <>
          <div className="grid-kpis" style={{ marginBottom: 'var(--space-8)' }}>
            <StatCard label="Total leads" value={nf(total)} sub="en el pipeline" />
            <StatCard label="Nuevos" value={nf(byStatus.nuevo ?? 0)} color={T.info} />
            <StatCard label="Calificados" value={nf(byStatus.calificado ?? 0)} color={T.teal} />
            <StatCard label="Citados" value={nf(byStatus.citado ?? 0)} color={T.gold} />
            <StatCard label="Cerrados" value={nf(byStatus.cerrado ?? 0)} color={T.success} />
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Prospecto</th><th>Estado</th><th>Score</th><th>Fuente</th><th>Mensajes</th><th>Último contacto</th></tr>
                </thead>
                <tbody>
                  {leads.length === 0 && (
                    <tr><td colSpan={6} style={{ color: T.muted, textAlign: 'center', padding: 32 }}>Aún no hay leads. Entrarán automáticamente cuando lleguen mensajes por WhatsApp.</td></tr>
                  )}
                  {leads.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <Link href={`/dashboard/leads/${l.id}`} style={{ color: T.text, fontWeight: 600 }}>
                          {l.name || l.phone}
                        </Link>
                        {l.name && <div style={{ fontSize: 11, color: T.muted }}>{l.phone}</div>}
                      </td>
                      <td><Badge tone={STATUS_TONE[l.status ?? 'nuevo'] ?? 'muted'}>{l.status ?? 'nuevo'}</Badge></td>
                      <td style={{ fontFamily: 'var(--font-headline)', color: T.gold }}>{nf(l.score ?? 0)}</td>
                      <td style={{ color: T.textSec }}>{l.source ?? '—'}</td>
                      <td style={{ color: T.textSec }}>{nf(l._count.conversations)}</td>
                      <td style={{ color: T.muted }}>{fecha(l.last_contact)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
