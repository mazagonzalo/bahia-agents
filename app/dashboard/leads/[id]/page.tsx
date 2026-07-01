import Link from 'next/link'
import { prisma } from '@/lib/db'
import { T, Card, Badge, PageHeader, EmptyState } from '../../_components/ui'

export const dynamic = 'force-dynamic'

const STATUS_TONE: Record<string, 'info' | 'teal' | 'gold' | 'success' | 'danger' | 'muted'> = {
  nuevo: 'info', calificado: 'teal', citado: 'gold', cerrado: 'success', frio: 'danger',
}

const FOLLOWUP_LABEL: Record<string, string> = {
  followup_24h: 'Reactivación · 24h sin respuesta',
  followup_calificado: 'Calificado · propuesta de visita',
  followup_post_visita: 'Post-visita',
  reactivacion_7d: 'Reactivación · 7 días',
  reactivacion_14d: 'Último intento · 14 días',
}

type Followup = { id: string; tipo: string; msg: string; created_at: Date | null }

async function getLead(id: string) {
  try {
    const lead = await prisma.leads.findUnique({ where: { id } })
    if (!lead) return { lead: null, convos: [], followups: [] as Followup[], error: null as string | null }
    const [convos, memRows] = await Promise.all([
      prisma.conversations.findMany({
        where: { lead_id: id },
        orderBy: { created_at: 'asc' },
        select: { id: true, role: true, content: true, created_at: true },
      }),
      // Follow-ups que el sistema le envió (viven en la memoria compartida agent_memory).
      prisma.agent_memory.findMany({
        where: { agent: 'seguimiento' },
        orderBy: { created_at: 'desc' },
        take: 200,
        select: { id: true, type: true, content: true, created_at: true },
      }),
    ])
    const followups: Followup[] = memRows
      .map((m) => {
        try {
          const p = JSON.parse(m.content) as { leadId?: string; msg?: string }
          return p?.leadId === id && p.msg ? { id: m.id, tipo: m.type, msg: p.msg, created_at: m.created_at } : null
        } catch { return null }
      })
      .filter((f): f is Followup => f !== null)
    return { lead, convos, followups, error: null as string | null }
  } catch (e) {
    return { lead: null, convos: [], followups: [] as Followup[], error: e instanceof Error ? e.message : 'error de DB' }
  }
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { lead, convos, followups, error } = await getLead(id)

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <Link href="/dashboard/leads" className="btn btn-ghost" style={{ paddingLeft: 0 }}>← Leads</Link>
      </div>

      {error ? (
        <EmptyState title="No se pudo cargar el lead" sub={error} />
      ) : !lead ? (
        <EmptyState title="Lead no encontrado" sub="Puede que se haya eliminado o el enlace sea inválido." />
      ) : (
        <>
          <PageHeader
            title={lead.name || lead.phone}
            blurb={lead.name ? lead.phone : undefined}
            actions={<Badge tone={STATUS_TONE[lead.status ?? 'nuevo'] ?? 'muted'}>{lead.status ?? 'nuevo'}</Badge>}
          />

          <div className="grid-3" style={{ marginBottom: 'var(--space-8)' }}>
            <Card><div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.2 }}>Score</div><div style={{ fontFamily: 'var(--font-headline)', fontSize: 28, color: T.gold }}>{(lead.score ?? 0).toLocaleString('es-MX')}</div></Card>
            <Card><div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.2 }}>Fuente</div><div style={{ fontSize: 18, color: T.text, marginTop: 6 }}>{lead.source ?? '—'}</div></Card>
            <Card><div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.2 }}>Último contacto</div><div style={{ fontSize: 16, color: T.text, marginTop: 6 }}>{lead.last_contact ? lead.last_contact.toLocaleString('es-MX') : '—'}</div></Card>
          </div>

          <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 14, fontWeight: 600 }}>Conversación ({convos.length})</div>
          {convos.length === 0 ? (
            <Card><div style={{ color: T.muted, fontSize: 13 }}>Sin mensajes registrados con este prospecto.</div></Card>
          ) : (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {convos.map((m) => (
                <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-start' : 'flex-end', maxWidth: '78%' }}>
                  <div style={{
                    background: m.role === 'user' ? T.surface2 : 'var(--color-primary)',
                    color: m.role === 'user' ? T.text : T.bg,
                    padding: '10px 14px', borderRadius: 14, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                    border: m.role === 'user' ? `1px solid ${T.border}` : 'none',
                  }}>{m.content}</div>
                  <div style={{ fontSize: 10, color: T.muted, marginTop: 3, textAlign: m.role === 'user' ? 'left' : 'right' }}>
                    {m.role === 'user' ? lead.name || 'Prospecto' : 'Bahía'} · {m.created_at?.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) ?? ''}
                  </div>
                </div>
              ))}
            </div>
          )}

          {followups.length > 0 && (
            <div style={{ marginTop: 'var(--space-8)' }}>
              <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 14, fontWeight: 600 }}>
                Seguimientos que le envió el sistema ({followups.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {followups.map((f) => (
                  <Card key={f.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <Badge tone="teal">{FOLLOWUP_LABEL[f.tipo] ?? f.tipo}</Badge>
                      <span style={{ fontSize: 11, color: T.muted }}>{f.created_at ? f.created_at.toLocaleString('es-MX') : ''}</span>
                    </div>
                    <div style={{ fontSize: 14, color: T.text, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{f.msg}</div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
