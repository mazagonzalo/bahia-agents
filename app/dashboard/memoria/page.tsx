import { prisma } from '@/lib/db'
import { T, Card, Badge, PageHeader, EmptyState } from '../_components/ui'

export const dynamic = 'force-dynamic'

type Tone = 'gold' | 'teal' | 'info' | 'success' | 'danger' | 'muted'

// Cada agente es una "rama" (branch) de la memoria compartida, con su título.
const BRANCH: { agent: string; title: string; sub: string; tone: Tone }[] = [
  { agent: 'tendencias', title: 'Tendencias', sub: 'Briefings semanales de tendencias e ideas de contenido', tone: 'gold' },
  { agent: 'contenido', title: 'Contenido', sub: 'Ideas, carruseles y guías generadas', tone: 'teal' },
  { agent: 'eventos', title: 'Eventos', sub: 'Torneos, ligas y eventos registrados', tone: 'info' },
  { agent: 'seguimiento', title: 'Seguimiento', sub: 'Follow-ups enviados a prospectos', tone: 'success' },
  { agent: 'critico', title: 'Crítico', sub: 'Evaluaciones y snapshots del desempeño', tone: 'danger' },
  { agent: 'secretaria', title: 'Secretaria', sub: 'Consultas del admin al sistema', tone: 'muted' },
  { agent: 'ventas', title: 'Ventas', sub: 'Registros del bot de ventas', tone: 'muted' },
]

// Extrae un resumen legible por rama (la memoria guarda JSON distinto en cada una).
function preview(agent: string, content: string): string {
  try {
    const p = JSON.parse(content) as Record<string, unknown>
    switch (agent) {
      case 'eventos':
        return `Evento: ${p.name ?? ''}${p.cuando ? ` · ${p.cuando}` : ''}`
      case 'seguimiento':
        return `→ ${p.name ?? p.phone ?? 'lead'}: ${String(p.msg ?? '').slice(0, 110)}`
      case 'secretaria':
        return `«${String(p.q ?? '').slice(0, 100)}»`
      case 'critico': {
        const rep = p.report as { verdict?: string } | undefined
        return rep?.verdict ?? (p.score != null ? `Snapshot · score ${p.score}` : `Evaluación · ${p.fecha ?? ''}`)
      }
      case 'tendencias':
        return `Briefing ${p.period ?? ''} · ${Array.isArray(p.trends) ? p.trends.length : 0} tendencias, ${Array.isArray(p.contentIdeas) ? p.contentIdeas.length : 0} ideas`
      default:
        return JSON.stringify(p).slice(0, 120)
    }
  } catch {
    return content.slice(0, 130)
  }
}

type MemRow = { id: string; agent: string; type: string; content: string; created_at: Date | null }

async function getMemory(): Promise<{ rows: MemRow[]; error: string | null }> {
  try {
    const rows = await prisma.agent_memory.findMany({
      orderBy: { created_at: 'desc' },
      take: 400,
      select: { id: true, agent: true, type: true, content: true, created_at: true },
    })
    return { rows, error: null }
  } catch (e) {
    return { rows: [], error: e instanceof Error ? e.message : 'error de DB' }
  }
}

export default async function MemoriaPage() {
  const { rows, error } = await getMemory()

  const byAgent = new Map<string, typeof rows>()
  for (const r of rows) {
    if (!byAgent.has(r.agent)) byAgent.set(r.agent, [])
    byAgent.get(r.agent)!.push(r)
  }
  const known = BRANCH.map((b) => b.agent)
  const extra = [...byAgent.keys()].filter((a) => !known.includes(a)).map((a): { agent: string; title: string; sub: string; tone: Tone } => ({ agent: a, title: a, sub: '', tone: 'muted' }))
  const branches = [...BRANCH, ...extra].filter((b) => byAgent.has(b.agent))

  return (
    <div>
      <PageHeader
        title="Memoria compartida"
        blurb="El cerebro del sistema: lo que cada agente ha hecho, organizado por rama. Todos los agentes leen y escriben aquí."
      />

      {error ? (
        <EmptyState title="No se pudo cargar la memoria" sub={error} />
      ) : branches.length === 0 ? (
        <EmptyState title="Memoria vacía" sub="Aún no hay actividad registrada de los agentes." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {branches.map((b) => {
            const entries = byAgent.get(b.agent)!
            return (
              <Card key={b.agent}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 3 }}>
                  <h2 style={{ fontFamily: 'var(--font-headline)', fontSize: 22, color: T.text, margin: 0 }}>{b.title}</h2>
                  <Badge tone={b.tone}>{entries.length}</Badge>
                </div>
                {b.sub && <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>{b.sub}</div>}
                <div>
                  {entries.slice(0, 20).map((e) => (
                    <div key={e.id} style={{ display: 'flex', gap: 14, padding: '11px 0', borderTop: `1px solid ${T.border}` }}>
                      <span style={{ fontSize: 10, color: T.muted, fontFamily: 'var(--font-mono)', minWidth: 118, paddingTop: 3, flexShrink: 0 }}>
                        {e.created_at ? e.created_at.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 10, color: T.gold, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{e.type}</span>
                        <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.5, overflowWrap: 'anywhere', marginTop: 1 }}>{preview(e.agent, e.content)}</div>
                      </div>
                    </div>
                  ))}
                  {entries.length > 20 && (
                    <div style={{ fontSize: 12, color: T.muted, paddingTop: 11, borderTop: `1px solid ${T.border}` }}>y {entries.length - 20} más…</div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
