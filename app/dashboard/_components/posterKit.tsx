// Kit de diseño premium compartido por las piezas visuales de Bahía (póster de
// Eventos, carrusel de Contenido). Fuente única para serif, grano, acentos de
// paleta y el fondo de marca en capas. Todo se exporta bien con html-to-image.
import type { CSSProperties } from 'react'

export const SERIF = 'var(--font-serif, Georgia, "Times New Roman", serif)'

// Grano de película sutil (textura editorial). Data-URI → se exporta en el PNG.
export const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

// Acentos de la paleta Bahía — NO todo es dorado: cada deporte/tema usa su color.
// `glow` es "r,g,b" para rgba() de los meshes y hairlines.
export type Accent = { main: string; light: string; glow: string }
export const ACCENT_GOLD: Accent = { main: '#C9A85C', light: '#E4C786', glow: '201,168,92' }
const ACCENT_BY_SPORT: { match: string[]; accent: Accent }[] = [
  { match: ['padel', 'pádel', 'paddle'], accent: { main: '#5B79D6', light: '#9DB2EE', glow: '91,121,214' } },   // azul Bahía
  { match: ['pickle'], accent: { main: '#D98558', light: '#EBB093', glow: '217,133,88' } },                     // coral/terracota
  { match: ['tenis', 'tennis'], accent: ACCENT_GOLD },                                                          // oro clásico
  { match: ['natac', 'alberca', 'nado', 'aqua', 'swim', 'pool'], accent: { main: '#5B79D6', light: '#9DB2EE', glow: '91,121,214' } },
  { match: ['gym', 'funcional', 'fuerza', 'spinning', 'yoga', 'pilates', 'cross'], accent: { main: '#8AA088', light: '#B3C6AF', glow: '138,160,136' } }, // sage
]
export function accentForSport(hint: string): Accent {
  const s = (hint || '').toLowerCase()
  for (const { match, accent } of ACCENT_BY_SPORT) if (match.some(m => s.includes(m))) return accent
  return ACCENT_GOLD
}

// Fondo de marca en capas: foto opcional + gradiente cinematográfico + viñeta +
// mesh de gradiente en el color de acento + grano + marco hairline. Ocupa todo
// el contenedor padre (que debe ser position:relative).
export function BrandBackdrop({ accent, photo }: { accent: Accent; photo?: string }) {
  const layer: CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none' }
  return (
    <>
      {photo && <div style={{ ...layer, background: `url(${photo}) center/cover no-repeat` }} />}
      {/* Con foto: gradiente oscuro para legibilidad. Sin foto: navy suave con profundidad. */}
      <div style={{ ...layer, background: photo
        ? 'linear-gradient(180deg, rgba(10,16,36,0.15) 0%, rgba(10,16,36,0.40) 42%, rgba(10,16,36,0.82) 74%, rgba(8,12,26,0.96) 100%)'
        : 'linear-gradient(160deg, #101A33 0%, #0A1024 55%, #070B18 100%)' }} />
      <div style={{ ...layer, background: 'radial-gradient(120% 90% at 50% 22%, transparent 40%, rgba(6,9,20,0.55) 100%)' }} />
      <div style={{ ...layer, background: `radial-gradient(62% 46% at 22% 82%, rgba(${accent.glow},${photo ? 0.24 : 0.30}) 0%, transparent 62%)` }} />
      <div style={{ ...layer, background: 'radial-gradient(48% 38% at 90% 12%, rgba(255,255,255,0.07) 0%, transparent 60%)' }} />
      <div style={{ ...layer, backgroundImage: GRAIN, backgroundRepeat: 'repeat', opacity: 0.10, mixBlendMode: 'overlay' }} />
      <div style={{ position: 'absolute', inset: 20, border: `1px solid rgba(${accent.glow},0.42)`, pointerEvents: 'none' }} />
    </>
  )
}

// Wordmark de marca reutilizable.
export function Wordmark({ accent, size = 26 }: { accent: Accent; size?: number }) {
  return (
    <div>
      <div style={{ fontFamily: SERIF, fontSize: size, letterSpacing: size * 0.3, color: '#F5EFE2', fontWeight: 600, lineHeight: 1 }}>BAHÍA</div>
      <div style={{ fontSize: size * 0.33, letterSpacing: size * 0.15, color: accent.light, textTransform: 'uppercase', marginTop: 5 }}>Social Sports Club</div>
    </div>
  )
}
