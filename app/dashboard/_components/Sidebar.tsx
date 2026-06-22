'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { agentsByGroup } from '../_lib/agents'
import { Icon } from './icons'

export function Sidebar() {
  const pathname = usePathname()
  const groups = agentsByGroup()

  const isActive = (slug: string) =>
    slug === '' ? pathname === '/dashboard' : pathname === `/dashboard/${slug}` || pathname.startsWith(`/dashboard/${slug}/`)

  return (
    <aside className="dashboard-sidebar" aria-label="Navegación de agentes">
      <div style={{ height: 'var(--header-height)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 var(--space-5)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
        <Image src="/assets/whale-gold.png" alt="Bahía" width={26} height={26} style={{ objectFit: 'contain', flexShrink: 0 }} priority />
        <span className="sidebar-logo">BAH<span>.IA</span></span>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4) var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {groups.map(({ group, items }) => (
          <div key={group}>
            <div className="nav-section-title">{group}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6 }}>
              {items.map((a) => {
                const href = a.slug === '' ? '/dashboard' : `/dashboard/${a.slug}`
                const active = isActive(a.slug)
                return (
                  <Link
                    key={a.slug || 'overview'}
                    href={href}
                    className={`nav-item${active ? ' active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="nav-icon"><Icon name={a.icon} /></span>
                    {a.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div style={{ padding: 'var(--space-4) var(--space-5)', borderTop: '1px solid var(--color-border)', fontSize: 11, color: 'var(--color-text-muted)' }}>
        Bahía Social Sports Club
      </div>
    </aside>
  )
}
