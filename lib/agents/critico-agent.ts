// Harness — Wrapper del agente CRITICO.
//
// Dos caminos:
//   - eval / directo: runCritico(mensaje) → runAgent('CRITICO', mensaje).
//   - producción: runCriticoReview() junta campañas + leads + conversaciones +
//     tendencias desde Supabase (igual que /api/agents/critico/route.ts),
//     compone el mensaje con las métricas reales y delega en runAgent.
// En ambos casos el agente solo PROPONE (AgentApproval PENDING). El endpoint
// /api/agents/critico/route.ts sigue vivo e intacto (camino legacy aditivo).

import { runAgent, type RunAgentOptions, type RunAgentResult } from './orchestrator'

const DEFAULT_MESSAGE =
  'Califica honestamente el rendimiento de las campañas publicitarias de Bahía Social Sports Club con los datos reales de los últimos 30 días.'

/**
 * Camino canónico (incl. evals): corre el agente CRITICO con el mensaje dado.
 */
export async function runCritico(
  userMessage?: string,
  options?: RunAgentOptions
): Promise<RunAgentResult> {
  return runAgent('CRITICO', userMessage ?? DEFAULT_MESSAGE, options)
}

type Lead = { id: string; status: string; source: string | null }

/**
 * Camino de producción: arma el mensaje con las métricas reales de campañas y
 * corre el agente. Lazy-import de supabase para no acoplar el harness/evals al
 * cliente de Supabase.
 */
export async function runCriticoReview(
  options?: RunAgentOptions
): Promise<RunAgentResult> {
  const { supabase } = await import('@/lib/supabase')
  const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()

  const [creativesRes, leadsRes, convsRes, trendsRes] = await Promise.all([
    supabase
      .from('creatives')
      .select('id, type, status, meta_campaign_id, created_at, content')
      .gte('created_at', since30d)
      .order('created_at', { ascending: false }),
    supabase
      .from('leads')
      .select('id, status, source, created_at')
      .gte('created_at', since30d),
    supabase
      .from('conversations')
      .select('lead_id, created_at')
      .gte('created_at', since30d),
    supabase
      .from('trends')
      .select('topic, score')
      .gte('created_at', since7d)
      .order('score', { ascending: false })
      .limit(5),
  ])

  type Creative = {
    id: string
    type: string
    status: string
    meta_campaign_id: string | null
    content: {
      idea?: { title?: string; instalacion?: string; hook?: { text?: string } }
      trend?: { topic?: string }
      carousel?: { slides?: { headline: string }[] }
      aiScore?: number | null
    } | null
  }

  const creativos = (creativesRes.data ?? []) as Creative[]
  const leads = (leadsRes.data ?? []) as Lead[]
  const convs = (convsRes.data ?? []) as { lead_id: string }[]

  const msgsPorLead = convs.reduce<Record<string, number>>((acc, c) => {
    acc[c.lead_id] = (acc[c.lead_id] ?? 0) + 1
    return acc
  }, {})

  const leadsPorCampaña = leads.reduce<Record<string, Lead[]>>((acc, l) => {
    const src = l.source ?? 'organico'
    ;(acc[src] ??= []).push(l)
    return acc
  }, {})

  const campañasTexto = creativos
    .slice(0, 12)
    .map((c, i) => {
      const titulo =
        c.content?.idea?.title ??
        c.content?.trend?.topic ??
        c.content?.carousel?.slides?.[0]?.headline ??
        `${c.type} sin título`
      const hook = c.content?.idea?.hook?.text ?? '—'
      const directos = leadsPorCampaña[`creative:${c.id}`] ?? []
      const meta = c.meta_campaign_id
        ? leadsPorCampaña[`meta:${c.meta_campaign_id}`] ?? []
        : []
      const lc = [...directos, ...meta]
      const total = lc.length
      const cerrados = lc.filter((l) => l.status === 'cerrado').length
      const citados = lc.filter((l) => l.status === 'citado').length
      const frios = lc.filter((l) => l.status === 'frio').length
      const tasaConv = total > 0 ? Math.round((cerrados / total) * 100) : 0
      const tasaFrio = total > 0 ? Math.round((frios / total) * 100) : 0
      const interProm =
        total > 0
          ? Math.round(lc.reduce((s, l) => s + (msgsPorLead[l.id] ?? 0), 0) / total)
          : 0
      return `${i + 1}. [${c.type}] "${titulo}" | id: ${c.id} | status: ${c.status} | leads: ${total} | citas: ${citados} | cerrados: ${cerrados} | fríos: ${frios} | conversión: ${tasaConv}% | abandono: ${tasaFrio}% | interacción prom: ${interProm} msgs | copy AI score: ${c.content?.aiScore ?? 'N/A'} | hook: "${hook}"`
    })
    .join('\n')

  const totalLeads = leads.length
  const totalCerrados = leads.filter((l) => l.status === 'cerrado').length
  const totalCitados = leads.filter((l) => l.status === 'citado').length
  const totalFrios = leads.filter((l) => l.status === 'frio').length
  const tendenciasTexto = (trendsRes.data ?? [])
    .map((t) => `${t.topic} (${t.score})`)
    .join(', ')

  const message = `CAMPAÑAS (últimos 30 días):
${campañasTexto || 'Sin campañas creadas aún.'}

RESUMEN GLOBAL:
- Total leads captados: ${totalLeads} | Cerrados: ${totalCerrados} | Citados: ${totalCitados} | Fríos: ${totalFrios}
- Total de creativos: ${creativos.length}
- Tendencias activas esta semana: ${tendenciasTexto || 'sin datos'}

Califica honestamente cada campaña destacada y el rendimiento general.`

  return runCritico(message, options)
}
