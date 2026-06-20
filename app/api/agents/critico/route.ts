export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runAgent } from '@/lib/agents/orchestrator'

// GET /api/agents/critico — califica campañas publicitarias con datos reales.
// Rewireado (Fase 3): lecturas vía Prisma, evaluación vía runAgent('CRITICO')
// (registra AgentRunLog + memoria gobernada). Contrato de respuesta INTACTO.

type Creative = {
  id: string
  type: string
  status: string
  meta_campaign_id: string | null
  created_at: string
  content: {
    idea?: { title?: string; instalacion?: string; targetSegment?: string; hook?: { text?: string } }
    trend?: { topic?: string; angle?: string }
    carousel?: { caption?: string; slides?: { headline: string }[] }
    reelBrief?: string
    aiScore?: number | null
  }
}

type Lead = {
  id: string
  status: string
  score: number | null
  source: string | null
  created_at: string
}

export async function GET() {
  const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000)
  const since7d  = new Date(Date.now() -  7 * 24 * 3600 * 1000)

  const [creativesRaw, leadsRaw, convsRaw, trendsRaw] = await Promise.all([
    prisma.creatives.findMany({
      where: { created_at: { gte: since30d } },
      orderBy: { created_at: 'desc' },
      select: { id: true, type: true, status: true, meta_campaign_id: true, created_at: true, content: true },
    }),
    prisma.leads.findMany({
      where: { created_at: { gte: since30d } },
      select: { id: true, status: true, score: true, source: true, created_at: true },
    }),
    prisma.conversations.findMany({
      where: { created_at: { gte: since30d } },
      select: { lead_id: true, role: true, created_at: true },
    }),
    prisma.trends.findMany({
      where: { created_at: { gte: since7d } },
      orderBy: { score: 'desc' },
      take: 5,
      select: { topic: true, score: true },
    }),
  ])

  // Normalizar al shape que espera la lógica de abajo (created_at → ISO string).
  const creativos: Creative[] = creativesRaw.map(c => ({
    id: c.id,
    type: c.type,
    status: c.status ?? 'borrador',
    meta_campaign_id: c.meta_campaign_id,
    created_at: c.created_at?.toISOString() ?? '',
    content: (c.content ?? {}) as Creative['content'],
  }))
  const leads: Lead[] = leadsRaw.map(l => ({
    id: l.id,
    status: l.status ?? 'nuevo',
    score: l.score,
    source: l.source,
    created_at: l.created_at?.toISOString() ?? '',
  }))
  const convs = convsRaw.map(c => ({ lead_id: c.lead_id ?? '', role: c.role }))

  // ── Mensajes por lead ─────────────────────────────────────────────────────
  const msgsPorLead = convs.reduce<Record<string, number>>((acc, c) => {
    acc[c.lead_id] = (acc[c.lead_id] ?? 0) + 1
    return acc
  }, {})

  // ── Atribuir leads a campañas por source ──────────────────────────────────
  const leadsPorCampaña = leads.reduce<Record<string, Lead[]>>((acc, l) => {
    const src = l.source ?? 'organico'
    if (!acc[src]) acc[src] = []
    acc[src].push(l)
    return acc
  }, {})

  // ── Calificar cada creativo ───────────────────────────────────────────────
  type CampañaCalificada = {
    id: string
    tipo: string
    titulo: string
    instalacion: string
    hook: string
    status: string
    hasCampaign: boolean
    aiScore: number | null
    leadsAtribuidos: number
    leadsCalificados: number
    leadsCitados: number
    leadsCerrados: number
    leadsFrios: number
    interaccionPromedio: number
    tasaConversion: number
    tasaFrio: number
    calidad: 'alta' | 'media' | 'baja' | 'sin-datos'
    createdAt: string
  }

  const campañasCalificadas: CampañaCalificada[] = creativos.map(c => {
    const titulo = c.content?.idea?.title ?? c.content?.trend?.topic ?? c.content?.carousel?.slides?.[0]?.headline ?? `${c.type} sin título`
    const instalacion = c.content?.idea?.instalacion ?? '—'
    const hook = c.content?.idea?.hook?.text ?? c.content?.carousel?.slides?.[0]?.headline ?? '—'

    const directKey = `creative:${c.id}`
    const metaKey = c.meta_campaign_id ? `meta:${c.meta_campaign_id}` : null
    const leadsDirectos = leadsPorCampaña[directKey] ?? []
    const leadsMeta = metaKey ? (leadsPorCampaña[metaKey] ?? []) : []
    const leadsCreativo = [...leadsDirectos, ...leadsMeta]

    const calificados = leadsCreativo.filter(l => l.status === 'calificado').length
    const citados     = leadsCreativo.filter(l => l.status === 'citado').length
    const cerrados    = leadsCreativo.filter(l => l.status === 'cerrado').length
    const frios       = leadsCreativo.filter(l => l.status === 'frio').length
    const total       = leadsCreativo.length

    const interaccionProm = leadsCreativo.length > 0
      ? Math.round(leadsCreativo.reduce((s, l) => s + (msgsPorLead[l.id] ?? 0), 0) / leadsCreativo.length)
      : 0

    const tasaConv  = total > 0 ? Math.round(cerrados / total * 100) : 0
    const tasaFrio  = total > 0 ? Math.round(frios / total * 100) : 0

    let calidad: CampañaCalificada['calidad'] = 'sin-datos'
    if (total > 0) {
      if (tasaConv >= 20 || (citados + cerrados) / total >= 0.3) calidad = 'alta'
      else if (tasaFrio >= 60) calidad = 'baja'
      else calidad = 'media'
    }

    return {
      id: c.id,
      tipo: c.type,
      titulo,
      instalacion,
      hook: hook.length > 80 ? hook.slice(0, 80) + '…' : hook,
      status: c.status,
      hasCampaign: !!c.meta_campaign_id,
      aiScore: c.content?.aiScore ?? null,
      leadsAtribuidos: total,
      leadsCalificados: calificados,
      leadsCitados: citados,
      leadsCerrados: cerrados,
      leadsFrios: frios,
      interaccionPromedio: interaccionProm,
      tasaConversion: tasaConv,
      tasaFrio,
      calidad,
      createdAt: c.created_at,
    }
  })

  // ── Resumen global de campañas ────────────────────────────────────────────
  const totalLeads     = leads.length
  const totalCerrados  = leads.filter(l => l.status === 'cerrado').length
  const totalCitados   = leads.filter(l => l.status === 'citado').length
  const totalFrios     = leads.filter(l => l.status === 'frio').length
  const leadsOrganicos = (leadsPorCampaña['organico'] ?? []).length + (leadsPorCampaña['whatsapp'] ?? []).length + (leadsPorCampaña['instagram'] ?? []).length

  const conDatos   = campañasCalificadas.filter(c => c.leadsAtribuidos > 0)
  const mejorCamp  = [...conDatos].sort((a, b) => b.tasaConversion - a.tasaConversion)[0]
  const peorCamp   = [...conDatos].sort((a, b) => a.tasaConversion - b.tasaConversion)[0]

  // ── Texto de campañas para el agente ──────────────────────────────────────
  const campañasTexto = campañasCalificadas.slice(0, 12).map((c, i) =>
    `${i + 1}. [${c.tipo}] "${c.titulo}" (${c.instalacion}) | status: ${c.status} | leads: ${c.leadsAtribuidos} | citas: ${c.leadsCitados} | cerrados: ${c.leadsCerrados} | fríos: ${c.leadsFrios} | conversión: ${c.tasaConversion}% | abandono: ${c.tasaFrio}% | interacción prom: ${c.interaccionPromedio} msgs | copy AI score: ${c.aiScore ?? 'N/A'} | hook: "${c.hook}"`
  ).join('\n')

  const tendenciasTexto = trendsRaw.map(t => `${t.topic} (${t.score})`).join(', ')

  const userMessage = `CAMPAÑAS (últimos 30 días):
${campañasTexto || 'Sin campañas creadas aún.'}

RESUMEN GLOBAL:
- Total leads captados: ${totalLeads} | Cerrados: ${totalCerrados} | Citados: ${totalCitados} | Fríos: ${totalFrios}
- Leads orgánicos (sin atribuir a campaña): ${leadsOrganicos}
- Mejor campaña por conversión: ${mejorCamp ? `"${mejorCamp.titulo}" (${mejorCamp.tasaConversion}%)` : 'N/A'}
- Peor campaña: ${peorCamp ? `"${peorCamp.titulo}" (${peorCamp.tasaFrio}% fríos)` : 'N/A'}
- Tendencias activas esta semana: ${tendenciasTexto || 'sin datos'}`

  // ── Evaluación vía harness (registra AgentRunLog + memoria; sin AgentApproval) ──
  let report: Record<string, unknown> | null = null
  try {
    const result = await runAgent('CRITICO', userMessage, { skipApproval: true, tags: ['critico', 'evaluacion'] })
    const pd = result.proposalData
    if (pd && pd.proposalType !== 'abstain' && pd.verdict !== undefined) report = pd
  } catch {
    /* si el harness falla, devolvemos las métricas sin report estructurado */
  }

  return NextResponse.json({
    campañas: campañasCalificadas,
    resumen: { totalLeads, totalCerrados, totalCitados, totalFrios, leadsOrganicos, totalCreativos: creativos.length },
    report,
    generatedAt: new Date().toISOString(),
  })
}
