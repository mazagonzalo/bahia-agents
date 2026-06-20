'use client'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { AGENTS } from '../_lib/agents'

export function DashboardHeader() {
  const pathname = usePathname()
  const slug = pathname.replace(/^\/dashboard\/?/, '').split('/')[0] // '' para el índice
  const current = AGENTS.find((a) => a.slug === slug) ?? AGENTS[0]

  return (
    <header className="dashboard-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>Agentes</span>
        <span style={{ color: 'var(--color-text-muted)' }}>/</span>
        <span style={{ fontFamily: 'var(--font-headline)', fontWeight: 600, color: 'var(--color-text-primary)' }}>{current.label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <UserButton />
      </div>
    </header>
  )
}
