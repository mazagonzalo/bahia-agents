export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ask } from '@/lib/claude'

// GET /api/agents/critico — evalúa honestamente el rendimiento del sistema

export async function GET() {
  const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const since7d  = new Date(Date.now() -  7 * 24 * 3600 * 1000).toISOString()

  // Cargar todos los datos relevantes en paralelo
  const [
    leadsAll,
    conversations,
    creatives,
    agentMemory,
    trends,
  ] = await Promise.all([
    supabase.from('leads').select('id, status, score, source, created_at, last_contact').gte('created_at', since30d),
    supabase.from('conversations').select('lead_id, role, content, created_at').gte('created_at', since30d).eq('role', 'user'),
    supabase.from('creatives').select('id, type, status, content, meta_campaign_id, created_at').gte('created_at', since30d),
    supabase.from('agent_memory').select('agent, type, outcome, created_at').gte('created_at', since30d),
    supabase.from('trends').select('topic, score, created_at').gte('created_at', since7d).order('score', { ascending: false }).limit(5),
  ])

  const leads = leadsAll.data ?? []
  const convs = conversations.data ?? []
  const creativos = creatives.data ?? []
  const memories = agentMemory.data ?? []

  // ── Métricas de leads ──────────────────────────────────────────────────────
  const total = leads.length
  const porStatus = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status ?? 'desconocido'] = (acc[l.status ?? 'desconocido'] ?? 0) + 1
    return acc
  }, {})

  const citados = porStatus['citado'] ?? 0
  const cerrados = porStatus['cerrado'] ?? 0
  const frios = porStatus['frio'] ?? 0
  const nuevos = porStatus['nuevo'] ?? 0
  const calificados = porStatus['calificado'] ?? 0

  const tasaConversion = total > 0 ? Math.round((cerrados / total) * 100) : 0
  const tasaCita = total > 0 ? Math.round((citados / total) * 100) : 0
  const tasaFrio = total > 0 ? Math.round((frios / total) * 100) : 0

  // Leads con al menos 3 mensajes = interacción real
  const leadConvCount = convs.reduce<Record<string, number>>((acc, c) => {
    acc[c.lead_id] = (acc[c.lead_id] ?? 0) + 1
    return acc
  }, {})
  const leadsConInteraccionReal = Object.values(leadConvCount).filter(n => n >= 3).length

  // Tiempo promedio hasta primer contacto (lead creado → primer mensaje de vuelta)
  // (aproximación: usando score como proxy de interacción)
  const scorePromedio = leads.length > 0
    ? Math.round(leads.reduce((s, l) => s + (l.score ?? 0), 0) / leads.length)
    : 0

  // ── Métricas de creativos ──────────────────────────────────────────────────
  const totalCreativos = creativos.length
  const borradores = creativos.filter(c => c.status === 'borrador').length
  const aprobados  = creativos.filter(c => c.status === 'aprobado').length
  const publicados = creativos.filter(c => c.status === 'publicado').length
  const rechazados = creativos.filter(c => c.status === 'rechazado').length
  const tasaAprobacion = totalCreativos > 0 ? Math.round((aprobados + publicados) / totalCreativos * 100) : 0

  // ── Actividad por agente ───────────────────────────────────────────────────
  const actividadAgente = memories.reduce<Record<string, { total: number; buenos: number; malos: number }>>((acc, m) => {
    if (!acc[m.agent]) acc[m.agent] = { total: 0, buenos: 0, malos: 0 }
    acc[m.agent].total++
    if (m.outcome === 'bueno') acc[m.agent].buenos++
    if (m.outcome === 'malo')  acc[m.agent].malos++
    return acc
  }, {})

  // ── Input para Claude: evaluación crítica ──────────────────────────────────
  const datosParaEvaluar = `
MÉTRICAS REALES DEL SISTEMA (últimos 30 días):

LEADS:
- Total leads captados: ${total}
- Nuevos (sin calificar): ${nuevos}
- Calificados: ${calificados}
- Citados (visitaron o visitarán): ${citados}
- Cerrados (se inscribieron): ${cerrados}
- Fríos (perdidos): ${frios}
- Tasa de conversión lead→inscripción: ${tasaConversion}%
- Tasa de leads que llegaron a cita: ${tasaCita}%
- Tasa de abandono (fríos): ${tasaFrio}%
- Leads con interacción real (≥3 mensajes): ${leadsConInteraccionReal}/${total}
- Score promedio de leads: ${scorePromedio}/10

CREATIVOS:
- Total generados: ${totalCreativos}
- En borrador (sin aprobar): ${borradores}
- Aprobados/publicados: ${aprobados + publicados}
- Rechazados: ${rechazados}
- Tasa de aprobación: ${tasaAprobacion}%

ACTIVIDAD POR AGENTE:
${Object.entries(actividadAgente).map(([ag, d]) => `- ${ag}: ${d.total} acciones | ${d.buenos} buenas | ${d.malos} malas`).join('\n') || '- Sin datos aún'}

TENDENCIAS DETECTADAS ESTA SEMANA:
${(trends.data ?? []).map(t => `- ${t.topic} (score: ${t.score})`).join('\n') || '- Sin datos'}
`

  // ── Evaluación honesta con Claude ──────────────────────────────────────────
  const evaluacion = await ask(
    `Eres un consultor externo y crítico que evalúa el sistema de marketing de Bahía Social Sports Club.
Tu trabajo es decir la verdad sin suavizarla. Si algo no está funcionando, lo dices directamente.
No eres un cheerleader — eres alguien que quiere que el negocio mejore.

Evalúa estos datos y produce un análisis en JSON con este formato exacto:
{
  "verdict": "string — una sola oración que resume el estado real del sistema ahora mismo",
  "score": number — del 1 al 10, qué tan bien está funcionando el sistema de marketing,
  "fortalezas": ["string"] — máx 3, qué está funcionando bien con evidencia en los datos,
  "problemas": [{"problema": "string", "impacto": "alto|medio|bajo", "evidencia": "string"}] — máx 5 problemas reales,
  "accionesInmediatas": ["string"] — máx 3 cosas concretas a hacer esta semana,
  "embudo": {
    "captacion": {"label": "Leads captados", "valor": ${total}, "tendencia": "subiendo|estable|bajando", "comentario": "string"},
    "calificacion": {"label": "Calificados", "valor": ${calificados}, "tasa": ${total > 0 ? Math.round(calificados/total*100) : 0}, "comentario": "string"},
    "cita": {"label": "Citados", "valor": ${citados}, "tasa": ${tasaCita}, "comentario": "string"},
    "cierre": {"label": "Cerrados", "valor": ${cerrados}, "tasa": ${tasaConversion}, "comentario": "string"}
  },
  "alertas": [{"nivel": "rojo|amarillo|verde", "mensaje": "string"}]
}

Devuelve SOLO el JSON sin markdown.`,
    [{ role: 'user', content: datosParaEvaluar }],
    2000,
  )

  let report = null
  try {
    const s = evaluacion.indexOf('{')
    const e = evaluacion.lastIndexOf('}')
    if (s !== -1 && e !== -1) report = JSON.parse(evaluacion.slice(s, e + 1))
  } catch { /* devuelve raw si falla */ }

  // Guardar en agent_memory
  await supabase.from('agent_memory').insert({
    agent: 'critico',
    type: 'evaluacion',
    content: JSON.stringify({ metricas: { total, citados, cerrados, frios, tasaConversion, tasaCita, tasaAprobacion, leadsConInteraccionReal, scorePromedio }, report }),
    outcome: report?.score >= 7 ? 'bueno' : report?.score >= 4 ? 'neutro' : 'malo',
  })

  return NextResponse.json({
    metricas: {
      leads: { total, nuevos, calificados, citados, cerrados, frios, tasaConversion, tasaCita, tasaFrio, leadsConInteraccionReal, scorePromedio },
      creativos: { total: totalCreativos, borradores, aprobados, publicados, rechazados, tasaAprobacion },
      agentes: actividadAgente,
    },
    report,
    generatedAt: new Date().toISOString(),
  })
}
