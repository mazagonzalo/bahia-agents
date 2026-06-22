import Link from 'next/link'
import Image from 'next/image'
import { agentsByGroup, type AgentKind } from './_lib/agents'
import { Icon } from './_components/icons'

const KIND_META: Record<AgentKind, { label: string; cls: string }> = {
  overview: { label: 'Resumen', cls: 'badge-muted' },
  data: { label: 'Vista', cls: 'badge-info' },
  trigger: { label: 'Generador', cls: 'badge-gold' },
  chat: { label: 'Chat', cls: 'badge-success' },
  crm: { label: 'CRM', cls: 'badge-warning' },
}

export default function DashboardOverview() {
  const groups = agentsByGroup()

  return (
    <div>
      <style>{`
        .overview-agent-card:hover .overview-agent-arrow{transform:translateX(4px)}
        .overview-hero{display:flex;align-items:center;justify-content:space-between;gap:var(--space-6);margin-bottom:var(--space-8);
          background:linear-gradient(120deg, var(--color-surface) 0%, var(--color-surface-2) 100%);
          border:1px solid var(--color-border);border-radius:var(--radius-xl);padding:var(--space-6) var(--space-8);overflow:hidden;position:relative}
        .overview-hero-rider{flex-shrink:0;filter:drop-shadow(0 6px 24px rgba(0,0,0,0.45))}
        @media (max-width:760px){.overview-hero{flex-direction:column;align-items:flex-start;text-align:left}.overview-hero-rider{align-self:center}}
      `}</style>

      {/* Hero con identidad Bahía — la ballena con raqueta (whale-rider) */}
      <div className="overview-hero">
        <div style={{ minWidth: 0, position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 700, fontSize: 12, letterSpacing: 2, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 10 }}>
            Bahía Social Sports Club
          </div>
          <h1 style={{ fontSize: 32, margin: 0, fontFamily: 'var(--font-headline)', letterSpacing: -0.5 }}>
            Sistema de agentes <span style={{ color: 'var(--color-primary)' }}>BAH.IA</span>
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 10, maxWidth: 560, lineHeight: 1.6 }}>
            La inteligencia de marketing del club. Cada agente tiene su panel: investigan tendencias,
            generan contenido, atienden leads y evalúan el desempeño.
          </p>
        </div>
        <Image
          src="/assets/whale-rider.png"
          alt="Bahía — ballena con raqueta"
          width={192}
          height={159}
          className="overview-hero-rider"
          style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxWidth: 192 }}
          priority
        />
      </div>

      {groups
        .filter((g) => g.items.some((a) => a.slug !== ''))
        .map(({ group, items }) => (
          <section key={group} style={{ marginBottom: 'var(--space-8)' }}>
            <div className="nav-section-title" style={{ padding: 0, marginBottom: 'var(--space-4)' }}>{group}</div>
            <div className="grid-kpis">
              {items
                .filter((a) => a.slug !== '')
                .map((a) => {
                  const meta = KIND_META[a.kind]
                  return (
                    <Link
                      key={a.slug}
                      href={`/dashboard/${a.slug}`}
                      className="metric-card overview-agent-card"
                      style={{ textDecoration: 'none', gap: 'var(--space-4)', justifyContent: 'space-between' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                        <span style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-lg)', background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-primary)' }}>
                          <Icon name={a.icon} />
                        </span>
                        <span className={`badge ${meta.cls}`}>{meta.label}</span>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-headline)', fontWeight: 600, color: 'var(--color-text-primary)', fontSize: 17, letterSpacing: -0.2 }}>{a.label}</div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 'var(--space-2)', lineHeight: 1.55 }}>{a.blurb}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', fontSize: 13, fontWeight: 600, paddingTop: 'var(--space-1)', borderTop: '1px solid var(--color-border)', marginTop: 'auto' }}>
                        <span style={{ paddingTop: 'var(--space-3)' }}>Abrir</span>
                        <span className="overview-agent-arrow" style={{ paddingTop: 'var(--space-3)', transition: 'transform var(--transition-fast)' }} aria-hidden>→</span>
                      </div>
                    </Link>
                  )
                })}
            </div>
          </section>
        ))}
    </div>
  )
}
