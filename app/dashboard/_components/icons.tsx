// ─── Iconos del sidebar (lucide-style, stroke=currentColor, 18px) ────────────
import type { JSX } from 'react'

const P = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export const ICONS: Record<string, JSX.Element> = {
  home: (
    <svg {...P}><path d="M3 9.5 12 3l9 6.5" /><path d="M5 10v10h14V10" /><path d="M9 20v-6h6v6" /></svg>
  ),
  trending: (
    <svg {...P}><path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" /></svg>
  ),
  sparkles: (
    <svg {...P}><path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z" /><path d="M19 14l.9 2.3L22 17l-2.1.7L19 20l-.9-2.3L16 17l2.1-.7z" /></svg>
  ),
  calendar: (
    <svg {...P}><rect x="3" y="4.5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v3M16 3v3" /></svg>
  ),
  megaphone: (
    <svg {...P}><path d="M3 11v2a1 1 0 0 0 1 1h2l9 5V5L6 10H4a1 1 0 0 0-1 1z" /><path d="M18 8a4 4 0 0 1 0 8" /></svg>
  ),
  users: (
    <svg {...P}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 6.1" /><path d="M17.5 20a5.5 5.5 0 0 0-3-4.9" /></svg>
  ),
  chat: (
    <svg {...P}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z" /></svg>
  ),
  route: (
    <svg {...P}><circle cx="6" cy="19" r="2.2" /><circle cx="18" cy="5" r="2.2" /><path d="M8 19h6a4 4 0 0 0 0-8H10a4 4 0 0 1 0-8h2" /></svg>
  ),
  gauge: (
    <svg {...P}><path d="M12 14l4-4" /><path d="M4.5 18a9 9 0 1 1 15 0" /><circle cx="12" cy="14" r="1.2" fill="currentColor" stroke="none" /></svg>
  ),
  star: (
    <svg {...P}><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9z" /></svg>
  ),
  clipboard: (
    <svg {...P}><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 4v1.5H9z" /><path d="M9 11h6M9 15h4" /></svg>
  ),
}

export function Icon({ name }: { name: string }) {
  return ICONS[name] ?? ICONS.home
}
