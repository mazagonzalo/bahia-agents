// Kit de diseño premium compartido por las piezas visuales (póster de Eventos,
// carrusel de Contenido). Fuente única para serif, grano y el fondo de marca en
// capas. La MARCA (logo, wordmark, acentos) viene de client.config → config-driven.
// Todo se exporta bien con html-to-image.
import type { CSSProperties } from 'react'
import { CLIENT, type Accent } from '@/lib/client.config'

export type { Accent }

export const SERIF = 'var(--font-serif, Georgia, "Times New Roman", serif)'

// Grano de película sutil (textura editorial). Data-URI → se exporta en el PNG.
export const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

// Tonos de navy de la marca (config-driven) — para fondos de piezas/paneles.
export const NAVY = CLIENT.brand.navy
export const NAVY_RGB = CLIENT.brand.navyRgb
export const NAVY_PANEL = CLIENT.brand.navyPanel
export const NAVY_DEEP = CLIENT.brand.navyDeep

// Acento por deporte/tema — desde el config del cliente (NO todo es dorado).
// `glow` es "r,g,b" para rgba() de los meshes y hairlines.
export const ACCENT_DEFAULT: Accent = CLIENT.brand.accentDefault
export function accentForSport(hint: string): Accent {
  const s = (hint || '').toLowerCase()
  for (const { match, accent } of CLIENT.brand.accentBySport) if (match.some(m => s.includes(m))) return accent
  return CLIENT.brand.accentDefault
}

// Fondo de marca en capas: foto opcional + gradiente cinematográfico + viñeta +
// mesh de gradiente en el color de acento + grano + marco hairline. Ocupa todo
// el contenedor padre (que debe ser position:relative).
export function BrandBackdrop({ accent, photo }: { accent: Accent; photo?: string }) {
  const layer: CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none' }
  const { navy, navyRgb, navyRaised, navyDeep } = CLIENT.brand
  return (
    <>
      {photo && <div style={{ ...layer, background: `url(${photo}) center/cover no-repeat` }} />}
      {/* Con foto: gradiente oscuro para legibilidad. Sin foto: navy suave con profundidad. */}
      <div style={{ ...layer, background: photo
        ? `linear-gradient(180deg, rgba(${navyRgb},0.15) 0%, rgba(${navyRgb},0.40) 42%, rgba(${navyRgb},0.82) 74%, rgba(${navyRgb},0.97) 100%)`
        : `linear-gradient(160deg, ${navyRaised} 0%, ${navy} 55%, ${navyDeep} 100%)` }} />
      <div style={{ ...layer, background: `radial-gradient(120% 90% at 50% 22%, transparent 40%, rgba(${navyRgb},0.55) 100%)` }} />
      <div style={{ ...layer, background: `radial-gradient(62% 46% at 22% 82%, rgba(${accent.glow},${photo ? 0.24 : 0.30}) 0%, transparent 62%)` }} />
      <div style={{ ...layer, background: 'radial-gradient(48% 38% at 90% 12%, rgba(255,255,255,0.07) 0%, transparent 60%)' }} />
      <div style={{ ...layer, backgroundImage: GRAIN, backgroundRepeat: 'repeat', opacity: 0.10, mixBlendMode: 'overlay' }} />
      <div style={{ position: 'absolute', inset: 20, border: `1px solid rgba(${accent.glow},0.42)`, pointerEvents: 'none' }} />
    </>
  )
}

// Isotipo/logo del cliente por color de acento (config-driven).
export function whaleLogo(accent: Accent): string {
  return CLIENT.brand.logoByGlow[accent.glow] ?? CLIENT.brand.logoDefault
}
export const WHALE_WATERMARK = CLIENT.brand.logoWatermark

// Firma de marca: isotipo + wordmark + tagline (todo desde el config del cliente).
export function LogoLockup({ accent, size = 34 }: { accent: Accent; size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.34 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={whaleLogo(accent)} alt={CLIENT.shortName} style={{ height: size, width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
      <div>
        <div style={{ fontFamily: SERIF, fontSize: size * 0.6, letterSpacing: size * 0.15, color: CLIENT.brand.wordmarkColor, fontWeight: 600, lineHeight: 1 }}>{CLIENT.brand.wordmark}</div>
        <div style={{ fontSize: size * 0.21, letterSpacing: size * 0.1, color: accent.light, textTransform: 'uppercase', marginTop: 4 }}>{CLIENT.brand.tagline}</div>
      </div>
    </div>
  )
}

// Isotipo grande de fondo (elemento gráfico + marca), muy sutil. Sangra por un borde.
export function WhaleWatermark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={WHALE_WATERMARK}
      alt=""
      style={{ position: 'absolute', width: '92%', right: '-14%', top: '16%', opacity: 0.08, pointerEvents: 'none', zIndex: 1, transform: 'rotate(-6deg)' }}
    />
  )
}

// Wordmark de marca reutilizable (solo texto), desde el config del cliente.
export function Wordmark({ accent, size = 26 }: { accent: Accent; size?: number }) {
  return (
    <div>
      <div style={{ fontFamily: SERIF, fontSize: size, letterSpacing: size * 0.3, color: CLIENT.brand.wordmarkColor, fontWeight: 600, lineHeight: 1 }}>{CLIENT.brand.wordmark}</div>
      <div style={{ fontSize: size * 0.33, letterSpacing: size * 0.15, color: accent.light, textTransform: 'uppercase', marginTop: 5 }}>{CLIENT.brand.tagline}</div>
    </div>
  )
}
