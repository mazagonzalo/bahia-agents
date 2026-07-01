// ─── Registro de agentes del dashboard ──────────────────────────────────────
// Fuente única para la navegación lateral y los encabezados por ruta.
// Cada agente vive en app/dashboard/<slug>/page.tsx.

export type AgentKind = 'overview' | 'data' | 'trigger' | 'chat' | 'crm'

export type AgentNav = {
  slug: string // segmento de ruta bajo /dashboard ('' = índice/resumen)
  label: string
  group: string
  kind: AgentKind
  icon: string // clave resuelta en _components/icons.tsx
  blurb: string // descripción corta para el encabezado de la página
  endpoint?: string // endpoint principal de la API
}

export const NAV_GROUPS = [
  'General',
  'Crecimiento',
  'Ventas & CRM',
  'Inteligencia',
  'Operación',
  'Gobierno',
] as const

export const AGENTS: AgentNav[] = [
  { slug: '', label: 'Resumen', group: 'General', kind: 'overview', icon: 'home', blurb: 'Vista general del sistema de agentes de marketing IA del club.' },

  // ── Crecimiento ──
  { slug: 'tendencias', label: 'Tendencias', group: 'Crecimiento', kind: 'data', icon: 'trending', blurb: 'Investigación semanal de tendencias y briefing de contenido.', endpoint: '/api/agents/tendencias' },
  { slug: 'contenido', label: 'Contenido', group: 'Crecimiento', kind: 'trigger', icon: 'sparkles', blurb: 'Genera carruseles y reels a partir de una idea o tendencia.', endpoint: '/api/agents/contenido' },
  { slug: 'eventos', label: 'Eventos', group: 'Crecimiento', kind: 'trigger', icon: 'calendar', blurb: 'Crea eventos del club desde lenguaje natural.', endpoint: '/api/agents/eventos' },
  { slug: 'meta-ads', label: 'Meta Ads', group: 'Crecimiento', kind: 'data', icon: 'megaphone', blurb: 'Publica y monitorea campañas pagadas en Meta.', endpoint: '/api/agents/meta-ads' },

  // ── Ventas & CRM ──
  { slug: 'leads', label: 'Leads', group: 'Ventas & CRM', kind: 'crm', icon: 'users', blurb: 'Pipeline de prospectos del club (WhatsApp / Instagram).' },
  { slug: 'ventas', label: 'Ventas', group: 'Ventas & CRM', kind: 'chat', icon: 'chat', blurb: 'Bot de ventas de membresías por WhatsApp.', endpoint: '/api/agents/ventas' },
  { slug: 'seguimiento', label: 'Seguimiento', group: 'Ventas & CRM', kind: 'data', icon: 'route', blurb: 'Nurture por etapas y estado del pipeline de leads.', endpoint: '/api/agents/seguimiento' },

  // ── Inteligencia ──
  { slug: 'critico', label: 'Crítico', group: 'Inteligencia', kind: 'data', icon: 'gauge', blurb: 'Evalúa y califica las campañas (A–F) con métricas reales.', endpoint: '/api/agents/critico' },
  { slug: 'reputacion', label: 'Reputación', group: 'Inteligencia', kind: 'data', icon: 'star', blurb: 'Analiza reseñas y reputación online del club.', endpoint: '/api/agents/reputacion' },

  // ── Operación ──
  { slug: 'secretaria', label: 'Secretaria', group: 'Operación', kind: 'chat', icon: 'clipboard', blurb: 'Asistente del admin — lee el estado de todos los agentes.', endpoint: '/api/agents/secretaria' },
  { slug: 'memoria', label: 'Memoria', group: 'Operación', kind: 'data', icon: 'route', blurb: 'El cerebro compartido — qué hizo cada agente, organizado por rama.' },

  // ── Gobierno (harness) ──
  { slug: 'harness', label: 'Gobierno', group: 'Gobierno', kind: 'data', icon: 'gauge', blurb: 'Ledger de corridas (costo/tokens) + cola de aprobaciones del harness.', endpoint: '/api/harness/runs' },
]

export function agentBySlug(slug: string): AgentNav | undefined {
  return AGENTS.find((a) => a.slug === slug)
}

/** Agentes agrupados, respetando el orden de NAV_GROUPS. */
export function agentsByGroup(): { group: string; items: AgentNav[] }[] {
  return NAV_GROUPS.map((group) => ({
    group,
    items: AGENTS.filter((a) => a.group === group),
  })).filter((g) => g.items.length > 0)
}
