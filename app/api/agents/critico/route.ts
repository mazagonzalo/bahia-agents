export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ask } from '@/lib/claude'

// GET /api/agents/critico — califica campañas publicitarias con datos reales

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
  const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const since7d  = new Date(Date.now() -  7 * 24 * 3600 * 1000).toISOString()

  const [creativesRes, leadsRes, convsRes, trendsRes] = await Promise.all([
    supabase.from('creatives').select('id, type, status, meta_campaign_id, created_at, content').gte('created_at', since30d).order('created_at', { ascending: false }),
    supabase.from('leads').select('id, status, score, source, created_at').gte('created_at', since30d),
    supabase.from('conversations').select('lead_id, role, created_at').gte('created_at', since30d),
    supabase.from('trends').select('topic, score').gte('created_at', since7d).order('score', { ascending: false }).limit(5),
  ])

  const creativos = (creativesRes.data ?? []) as Creative[]
  const leads = (leadsRes.data ?? []) as Lead[]
  const convs = convsRes.data ?? []

  // ── Mensajes por lead ─────────────────────────────────────────────────────
  const msgsPorLead = convs.reduce<Record<string, number>>((acc, c) => {
    acc[c.lead_id] = (acc[c.lead_id] ?? 0) + 1
    return acc
  }, {})

  // ── Atribuir leads a campañas por source ──────────────────────────────────
  // source puede ser: "creative:<id>", "meta:<campaign_id>", "whatsapp", "instagram", etc.
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

    // Leads atribuidos directamente a este creativo
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
  const mejorCamp  = conDatos.sort((a, b) => b.tasaConversion - a.tasaConversion)[0]
  const peorCamp   = conDatos.sort((a, b) => a.tasaConversion - b.tasaConversion)[0]

  // ── Texto de campañas para Claude ────────────────────────────────────────
  const campañasTexto = campañasCalificadas.slice(0, 12).map((c, i) =>
    `${i + 1}. [${c.tipo}] "${c.titulo}" (${c.instalacion}) | status: ${c.status} | leads: ${c.leadsAtribuidos} | citas: ${c.leadsCitados} | cerrados: ${c.leadsCerrados} | fríos: ${c.leadsFrios} | conversión: ${c.tasaConversion}% | abandono: ${c.tasaFrio}% | interacción prom: ${c.interaccionPromedio} msgs | copy AI score: ${c.aiScore ?? 'N/A'} | hook: "${c.hook}"`
  ).join('\n')

  const tendenciasTexto = (trendsRes.data ?? []).map(t => `${t.topic} (${t.score})`).join(', ')

  // ── Evaluación Claude — centrada en campañas ──────────────────────────────
  const evaluacion = await ask(
    `Eres un consultor de paid media y marketing digital especializado en clubes deportivos premium.
Tu trabajo: calificar honestamente cada campaña publicitaria de Bahía Social Sports Club con los datos reales.
Habla con precisión. Si una campaña no generó leads, dilo. Si el copy suena a IA y eso puede estar afectando la conversión, dilo.
No suavices. El admin necesita saber qué funciona y qué está tirando presupuesto.

Devuelve SOLO este JSON sin markdown:
{
  "verdict": "string — estado real de las campañas en una oración",
  "score": número 1-10 (rendimiento general de las campañas),
  "campañasDestacadas": [
    {
      "id": "string — id del creativo",
      "veredicto": "string — evaluación directa de esta campaña en 1-2 oraciones",
      "calificacion": "A|B|C|D|F",
      "razon": "string — por qué esa calificación, con evidencia",
      "mejorar": "string — qué cambiarías específicamente en el copy, hook o audiencia"
    }
  ],
  "patronesDetectados": ["string"] — máx 3 patrones entre todas las campañas (ej: "los reels convierten mejor que carruseles"),
  "problemas": [{"problema": "string", "impacto": "alto|medio|bajo", "evidencia": "string"}],
  "accionesInmediatas": ["string"] — máx 3 acciones concretas para mejorar campañas esta semana,
  "alertas": [{"nivel": "rojo|amarillo|verde", "mensaje": "string"}]
}`,
    [{
      role: 'user',
      content: `CAMPAÑAS (últimos 30 días):
${campañasTexto || 'Sin campañas creadas aún.'}

RESUMEN GLOBAL:
- Total leads captados: ${totalLeads} | Cerrados: ${totalCerrados} | Citados: ${totalCitados} | Fríos: ${totalFrios}
- Leads orgánicos (sin atribuir a campaña): ${leadsOrganicos}
- Mejor campaña por conversión: ${mejorCamp ? `"${mejorCamp.titulo}" (${mejorCamp.tasaConversion}%)` : 'N/A'}
- Peor campaña: ${peorCamp ? `"${peorCamp.titulo}" (${peorCamp.tasaFrio}% fríos)` : 'N/A'}
- Tendencias activas esta semana: ${tendenciasTexto || 'sin datos'}`,
    }],
    2500,
  )

  let report = null
  try {
    const s = evaluacion.indexOf('{')
    const e = evaluacion.lastIndexOf('}')
    if (s !== -1 && e !== -1) report = JSON.parse(evaluacion.slice(s, e + 1))
  } catch { /* continúa sin report estructurado */ }

  await supabase.from('agent_memory').insert({
    agent: 'critico',
    type: 'evaluacion_campañas',
    content: JSON.stringify({ campañas: campañasCalificadas.length, report }),
    outcome: (report?.score ?? 0) >= 7 ? 'bueno' : (report?.score ?? 0) >= 4 ? 'neutro' : 'malo',
  })

  return NextResponse.json({
    campañas: campañasCalificadas,
    resumen: { totalLeads, totalCerrados, totalCitados, totalFrios, leadsOrganicos, totalCreativos: creativos.length },
    report,
    generatedAt: new Date().toISOString(),
  })
}
