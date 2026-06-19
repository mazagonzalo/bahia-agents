import type { ReactNode } from 'react'
import { Sidebar } from './_components/Sidebar'
import { DashboardHeader } from './_components/DashboardHeader'

// El acceso ya lo protege proxy.ts (Clerk auth.protect() sobre /dashboard).
// TODO Fase 5: autorización por rol (publicMetadata.role OWNER/ADMIN) aquí,
// gated por DASHBOARD_REQUIRE_ROLE para no bloquear durante desarrollo.
export default function DashboardLayout({ children }: { children: ReactNode }) {
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
