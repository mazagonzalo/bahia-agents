// ─── Primitivos de UI (tema oscuro Bahía) ────────────────────────────────────
// Re-tematizados desde el monolito de tendencias al design-system oscuro de
// globals.css. Sin manejadores de eventos → seguros en server o client.
import type { CSSProperties, ReactNode } from 'react'

// Paleta en JS para lógica de color por umbral (espeja los tokens de globals.css).
export const T = {
  gold: '#D4A853',
  goldDark: '#B8893A',
  goldLight: '#E8C57A',
  teal: '#0EA5E9',
  coral: '#F97316',
  bg: '#080C14',
  surface: '#0F1623',
  surface2: '#161E2E',
  surface3: '#1C2640',
  border: '#1E2D45',
  borderHover: '#2A3F60',
  text: '#E8EDF5',
  textSec: '#A0AEBF',
  muted: '#5C6E85',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
} as const

export const FORMAT_COLOR: Record<string, string> = {
  Reel: T.coral,
  TikTok: T.teal,
  Carrusel: T.info,
  Carrusel_alt: T.gold,
  Story: T.gold,
  Stories: T.gold,
  Post: T.teal,
}

// ── Ring (medidor circular 0–10) ──
export function Ring({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(score / 10, 1)
  const color = pct >= 0.8 ? T.gold : pct >= 0.5 ? T.teal : T.muted
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.border} strokeWidth={4} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill={color} fontSize={12} fontWeight={700} fontFamily="var(--font-headline)">{score}</text>
    </svg>
  )
}

// ── ScoreBar (barra 0–max) ──
export function ScoreBar({ score, max = 100, showLabel = true }: { score: number; max?: number; showLabel?: boolean }) {
  const pct = (score / max) * 100
  const color = pct >= 70 ? T.gold : pct >= 40 ? T.teal : T.muted
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
      {showLabel && <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 28, textAlign: 'right', fontFamily: 'var(--font-headline)' }}>{score}</span>}
    </div>
  )
}

// ── FormatBadge (Reel / Carrusel / …) ──
export function FormatBadge({ format }: { format: string }) {
  const color = FORMAT_COLOR[format] ?? T.muted
  return (
    <span style={{ background: color + '22', color, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, letterSpacing: 0.8, textTransform: 'uppercase' }}>
      {format}
    </span>
  )
}

// ── HashTag ──
export function HashTag({ tag, type = 'nicho' }: { tag: string; type?: 'masivo' | 'nicho' | 'local' }) {
  const colors = { masivo: T.info, nicho: T.teal, local: T.gold }
  const c = colors[type]
  return (
    <span style={{ background: c + '1f', color: c, fontSize: 12, padding: '4px 12px', borderRadius: 20, fontWeight: 500, border: `1px solid ${c}33` }}>
      {tag}
    </span>
  )
}

// ── TrendArrow ──
export function TrendArrow({ trend }: { trend: string }) {
  const up = trend === 'subiendo'
  const down = trend === 'bajando'
  const color = up ? T.success : down ? T.danger : T.warning
  const arrow = up ? '↑' : down ? '↓' : '→'
  return <span style={{ color, fontWeight: 700, fontSize: 13 }}>{arrow}</span>
}

// ── StatCard (métrica) ──
export function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="metric-card" style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color ?? T.gold, letterSpacing: -0.5, fontFamily: 'var(--font-headline)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: T.textSec }}>{sub}</div>}
    </div>
  )
}

// ── SectionTitle ──
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 10, color: T.muted, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 20, height: 1, background: 'var(--color-primary)', opacity: 0.6, display: 'inline-block' }} />
      {children}
    </div>
  )
}

// ── Card ──
export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div className="card" style={style}>{children}</div>
}

// ── Badge genérico ──
type BadgeTone = 'gold' | 'teal' | 'success' | 'warning' | 'danger' | 'info' | 'muted'
const BADGE_TONE: Record<BadgeTone, string> = {
  gold: T.gold, teal: T.teal, success: T.success, warning: T.warning, danger: T.danger, info: T.info, muted: T.muted,
}
export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: BadgeTone }) {
  const c = BADGE_TONE[tone]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: c + '26', color: c, fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 999 }}>
      {children}
    </span>
  )
}

// ── EmptyState ──
export function EmptyState({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '64px 24px', color: T.muted }}>
      <div style={{ fontSize: 36, marginBottom: 14, color: T.gold, fontFamily: 'var(--font-headline)' }}>∿</div>
      <div style={{ color: T.text, fontSize: 17, fontWeight: 600, fontFamily: 'var(--font-headline)' }}>{title}</div>
      {sub && <div style={{ color: T.muted, marginTop: 8, fontSize: 13 }}>{sub}</div>}
    </div>
  )
}

// ── Skeleton (bloque shimmer para estados de carga) ──
// Keyframes inyectados una sola vez; seguros en server o client (sin eventos).
const SKELETON_KEYFRAMES = `@keyframes bahia-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`

export function Skeleton({
  width = '100%',
  height = 16,
  radius = 'var(--radius-md)',
}: {
  width?: number | string
  height?: number | string
  radius?: number | string
}) {
  return (
    <span
      aria-hidden
      style={{
        display: 'block',
        width,
        height,
        borderRadius: radius,
        background: `linear-gradient(90deg, ${T.surface2} 0%, ${T.surface3} 50%, ${T.surface2} 100%)`,
        backgroundSize: '200% 100%',
        animation: 'bahia-shimmer 1.4s ease-in-out infinite',
      }}
    >
      <style>{SKELETON_KEYFRAMES}</style>
    </span>
  )
}

// ── SkeletonText (varias líneas; la última más corta) ──
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div role="status" aria-label="Cargando" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  )
}

// ── PageHeader (título + descripción + acciones por ruta) ──
export function PageHeader({ title, blurb, actions }: { title: string; blurb?: string; actions?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontSize: 24, margin: 0 }}>{title}</h1>
        {blurb && <div style={{ color: T.textSec, fontSize: 13, marginTop: 4, maxWidth: 620 }}>{blurb}</div>}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{actions}</div>}
    </div>
  )
}
