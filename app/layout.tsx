import type { Metadata } from 'next'
import { Inter, Sora } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  weight: ['600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Bahía · Agentes de Marketing IA',
  description: 'Panel de control de los agentes de marketing IA del Bahía Social Sports Club.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="es" className={`${inter.variable} ${sora.variable}`}>
        <body style={{ fontFamily: 'var(--font-inter, sans-serif)' }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
