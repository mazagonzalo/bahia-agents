import type { ReactNode } from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Sidebar } from './_components/Sidebar'
import { DashboardHeader } from './_components/DashboardHeader'

// Acceso: proxy.ts ya exige login (Clerk auth.protect() sobre /dashboard).
// Autorización por ROL (Fase 5): env-gated por DASHBOARD_REQUIRE_ROLE para no
// bloquear en desarrollo. Cuando esté en 'true' (prod, con roles asignados en
// Clerk → publicMetadata.role), solo OWNER/ADMIN entran al panel.
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  if (process.env.DASHBOARD_REQUIRE_ROLE === 'true') {
    const { sessionClaims } = await auth()
    const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role
    if (role !== 'OWNER' && role !== 'ADMIN') redirect('/')
  }

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <div className="dashboard-main">
        <DashboardHeader />
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  )
}
