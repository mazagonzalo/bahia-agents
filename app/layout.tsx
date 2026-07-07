import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import { Inter, Sora, Cormorant_Garamond } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { CLIENT } from '@/lib/client.config'
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

// Serif editorial de marca — display de lujo para pósters/piezas premium.
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: CLIENT.brand.appTitle,
  description: CLIENT.brand.appDescription,
}

// Marca del cliente inyectada como CSS variables (color primario + watermark de página).
const brandVars = {
  ['--color-primary']: CLIENT.brand.primaryColor,
  ['--brand-watermark']: `url('${CLIENT.brand.pageWatermark}')`,
} as CSSProperties

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="es" className={`${inter.variable} ${sora.variable} ${cormorant.variable}`}>
        <body style={{ fontFamily: 'var(--font-inter, sans-serif)', ...brandVars }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
