import { prisma } from '@/lib/db'

// Tipos compartidos entre agentes
export type Trend = {
  id: string
  topic: string
  score: number
  source: string
  region: string
  used: boolean
  created_at: string
}

export type ClubEvent = {
  id: string
  name: string
  type: string
  sport: string | null
  recurrence: string | null
  time_of_day: string | null
  start_date: string | null
  end_date: string | null
  description: string | null
  content_potential: number
}

export type Review = {
  id: string
  author: string
  rating: number
  text: string
  responded: boolean
  created_at: string
}

export type AgentMemory = {
  id: string
  agent: string
  type: string
  content: string
  outcome: string
  created_at: string
}

export type ClubContext = {
  trends: Trend[]
  upcomingEvents: ClubEvent[]
  reviews: Review[]
  memory: AgentMemory[]
}

// Briefing compartido del club — todos los agentes que lo necesiten lo llaman al arrancar
export async function getClubContext(opts?: {
  agents?: string[]   // filtrar memoria por agente específico
  days?: number       // ventana de eventos (default 14)
}): Promise<ClubContext> {
  const days = opts?.days ?? 14
  const today = new Date()
  const future = new Date(today)
  future.setDate(today.getDate() + days)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(today.getDate() - 7)

  const [trendsRows, eventsRows, memoryRows] = await Promise.all([
    // Top tendencias activas de los últimos 7 días
    prisma.trends.findMany({
      where: { used: false, created_at: { gte: sevenDaysAgo } },
      orderBy: { score: 'desc' },
      take: 5,
    }),

    // Eventos próximos: recurrentes siempre + especiales dentro de la ventana
    prisma.club_events.findMany({
      where: {
        active: true,
        OR: [
          { type: 'recurrente' },
          { type: 'especial', start_date: { gte: today, lte: future } },
        ],
      },
      orderBy: { content_potential: 'desc' },
      take: 8,
    }),

    // Memoria de agentes: aprendizajes recientes con buen/mal outcome
    prisma.agent_memory.findMany({
      where: {
        outcome: { in: ['bueno', 'malo'] },
        created_at: { gte: sevenDaysAgo },
        ...(opts?.agents?.length ? { agent: { in: opts.agents } } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    }),
  ])
  // Nota: la tabla `reviews` no existe en la DB (el código la leía con fallo
  // silencioso); con Prisma simplemente la omitimos hasta que exista.

  const trends: Trend[] = trendsRows.map(t => ({
    id: t.id, topic: t.topic, score: t.score ?? 0, source: t.source ?? '',
    region: t.region ?? '', used: t.used ?? false, created_at: t.created_at?.toISOString() ?? '',
  }))
  const upcomingEvents: ClubEvent[] = eventsRows.map(e => ({
    id: e.id, name: e.name, type: e.type ?? '', sport: e.sport, recurrence: e.recurrence,
    time_of_day: e.time_of_day, start_date: e.start_date ? e.start_date.toISOString().split('T')[0] : null,
    end_date: e.end_date ? e.end_date.toISOString().split('T')[0] : null,
    description: e.description, content_potential: e.content_potential ?? 0,
  }))
  const memory: AgentMemory[] = memoryRows.map(m => ({
    id: m.id, agent: m.agent, type: m.type, content: m.content,
    outcome: m.outcome ?? 'neutro', created_at: m.created_at?.toISOString() ?? '',
  }))

  return { trends, upcomingEvents, reviews: [], memory }
}

// Convierte el contexto en texto plano para incluir en prompts de Claude
export function contextToPrompt(ctx: ClubContext): string {
  const lines: string[] = []

  if (ctx.trends.length) {
    lines.push('TENDENCIAS ACTIVAS (última semana):')
    ctx.trends.forEach(t => lines.push(`  • ${t.topic} — score ${t.score} (${t.source})`))
  }

  if (ctx.upcomingEvents.length) {
    lines.push('', 'EVENTOS PRÓXIMOS DEL CLUB:')
    ctx.upcomingEvents.forEach(e => {
      const cuando = e.recurrence ? `cada ${e.recurrence}` : e.start_date ?? 'fecha por confirmar'
      lines.push(`  • ${e.name}${e.sport ? ` (${e.sport})` : ''} — ${cuando}${e.time_of_day ? ` ${e.time_of_day}` : ''} — potencial ${e.content_potential}/10`)
    })
  }

  if (ctx.reviews.length) {
    const positivas = ctx.reviews.filter(r => r.rating >= 4)
    const negativas = ctx.reviews.filter(r => r.rating <= 2)
    if (positivas.length) {
      lines.push('', 'RESEÑAS POSITIVAS RECIENTES:')
      positivas.slice(0, 3).forEach(r => lines.push(`  • ★${r.rating} — "${r.text}"`))
    }
    if (negativas.length) {
      lines.push('', 'RESEÑAS NEGATIVAS RECIENTES (áreas a mejorar):')
      negativas.slice(0, 3).forEach(r => lines.push(`  • ★${r.rating} — "${r.text}"`))
    }
  }

  if (ctx.memory.length) {
    const buenos = ctx.memory.filter(m => m.outcome === 'bueno').slice(0, 3)
    if (buenos.length) {
      lines.push('', 'QUÉ HA FUNCIONADO RECIENTEMENTE:')
      buenos.forEach(m => lines.push(`  • [${m.agent}] ${m.content}`))
    }
  }

  return lines.join('\n')
}
