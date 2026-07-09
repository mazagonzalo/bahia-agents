import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { requirePanelRole } from '@/lib/auth/require-role'
import { Sidebar } from './_components/Sidebar'
import { DashboardHeader } from './_components/DashboardHeader'

// Acceso: proxy.ts ya exige login (Clerk auth.protect() sobre /dashboard).
// Autorización por ROL (fail-closed): el panel expone PII de leads + gobierno, así
// que SIEMPRE exige rol OWNER/ADMIN, leído de forma confiable (Clerk publicMetadata;
// ver lib/auth/require-role). En dev, DASHBOARD_ALLOW_NO_ROLE=true permite trabajar
// sin roles; en prod NO hay opt-out → una env faltante NUNCA abre el panel.
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const access = await requirePanelRole()
  if (!access.ok) redirect('/')

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
