export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { ask } from '@/lib/claude'
import { supabase } from '@/lib/supabase'

// Carga el estado reciente de todos los agentes desde Supabase
async function loadSystemState(): Promise<string> {
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString()

  const [
    memories,
    leads,
    leadsCitados,
    leadsCalificados,
    creatives,
    trends,
  ] = await Promise.all([
    // Últimas acciones de cada agente
    supabase
      .from('agent_memory')
      .select('agent, type, content, outcome, created_at')
      .gte('created_at', since7d)
      .order('created_at', { ascending: false })
      .limit(30),

    // Resumen de leads
    supabase
      .from('leads')
      .select('status, score, created_at, last_contact, name, phone')
      .gte('created_at', since7d)
      .order('created_at', { ascending: false }),

    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'citado'),

    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'calificado'),

    // Creativos pendientes y recientes
    supabase
      .from('creatives')
      .select('id, type, status, content, created_at')
      .gte('created_at', since7d)
      .order('created_at', { ascending: false })
      .limit(10),

    // Tendencias detectadas esta semana
    supabase
      .from('trends')
      .select('topic, score, source, created_at')
      .gte('created_at', since7d)
      .order('score', { ascending: false })
      .limit(10),
  ])

  const lines: string[] = [`=== ESTADO DEL SISTEMA BAHÍA — ${new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} ===`, '']

  // Resumen de leads
  const allLeads = leads.data ?? []
  const nuevos = allLeads.filter(l => l.status === 'nuevo').length
  const frios = allLeads.filter(l => l.status === 'frio').length
  lines.push(`LEADS (últimos 7 días):`)
  lines.push(`  Nuevos: ${nuevos} | Calificados: ${leadsCalificados.count ?? 0} | Citados: ${leadsCitados.count ?? 0} | Fríos: ${frios}`)
  const recientes = allLeads.slice(0, 5).map(l => `  • ${l.name ?? l.phone} — ${l.status} (score: ${l.score ?? '—'})`)
  if (recientes.length) lines.push('  Recientes:', ...recientes)
  lines.push('')

  // Creativos
  const creativos = creatives.data ?? []
  const borradores = creativos.filter(c => c.status === 'borrador')
  const aprobados = creativos.filter(c => c.status === 'aprobado')
  const publicados = creativos.filter(c => c.status === 'publicado')
  lines.push(`CREATIVOS:`)
  lines.push(`  Borradores (pendientes de aprobación): ${borradores.length}`)
  if (borradores.length) {
    borradores.slice(0, 3).forEach((c, i) => {
      const titulo = c.content?.idea?.title ?? c.content?.trend?.topic ?? c.type
      lines.push(`  ${i + 1}. [${c.type}] ${titulo} — ID: ${c.id.slice(0, 8)}`)
    })
  }
  lines.push(`  Aprobados: ${aprobados.length} | Publicados: ${publicados.length}`)
  lines.push('')

  // Tendencias detectadas
  const topTrends = trends.data ?? []
  if (topTrends.length) {
    lines.push(`TENDENCIAS DETECTADAS ESTA SEMANA:`)
    topTrends.forEach(t => lines.push(`  • ${t.topic} (score: ${t.score}) — ${t.source}`))
    lines.push('')
  }

  // Actividad reciente por agente
  const agentGroups: Record<string, { type: string; outcome: string; created_at: string; content: string }[]> = {}
  for (const m of memories.data ?? []) {
    if (!agentGroups[m.agent]) agentGroups[m.agent] = []
    agentGroups[m.agent].push(m)
  }

  lines.push(`ACTIVIDAD RECIENTE POR AGENTE:`)
  for (const [agent, entries] of Object.entries(agentGroups)) {
    const last = entries[0]
    const hace = Math.round((Date.now() - new Date(last.created_at).getTime()) / 3600000)
    const preview = typeof last.content === 'string' ? last.content.slice(0, 120) : JSON.stringify(last.content).slice(0, 120)
    lines.push(`  [${agent}] última acción hace ${hace}h — ${last.type} (${last.outcome})`)
    lines.push(`    → ${preview}`)
  }

  // Nuevos leads en las últimas 24h
  const nuevos24h = allLeads.filter(l => l.created_at >= since24h).length
  if (nuevos24h > 0) lines.push('', `⚡ ${nuevos24h} lead(s) nuevo(s) en las últimas 24h`)

  return lines.join('\n')
}

export async function POST(req: NextRequest) {
  const { text } = await req.json()

  if (!text) return NextResponse.json({ error: 'Sin mensaje' }, { status: 400 })

  // Detectar aprobación de creativos
  const isApproval = /^(sí|si|aprueba|apruebo|ok|dale|todos|1|2|3|1 y 2|1 y 3|2 y 3)/i.test(text.trim())
  if (isApproval) {
    const { data: pending } = await supabase
      .from('creatives')
      .select('id, type, content')
      .eq('status', 'borrador')
      .order('created_at', { ascending: false })
      .limit(5)

    if (pending?.length) {
      const ids = pending.map((c: { id: string }) => c.id)
      await supabase.from('creatives').update({ status: 'aprobado' }).in('id', ids)
      await fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/meta-ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', creativeIds: ids }),
      }).catch(() => {})
      return NextResponse.json({ reply: `✅ ${ids.length} creativo(s) aprobado(s) y enviados a publicar.` })
    }

    return NextResponse.json({ reply: 'No hay creativos pendientes de aprobación.' })
  }

  // Cargar estado completo del sistema y responder
  const systemState = await loadSystemState()

  const reply = await ask(
    `Eres la secretaria del sistema de agentes de marketing de Bahía Social Sports Club.
El admin te hace preguntas sobre el estado del sistema — qué está haciendo cada agente, cuántos leads hay, qué tendencias se detectaron, qué creativos están pendientes, qué pasó esta semana.

Tienes acceso al estado completo del sistema. Responde de forma concisa y directa.
Si el admin pregunta por algo que no está en los datos, dilo claramente.
Máximo 5 líneas salvo que el admin pida un detalle específico.

ESTADO ACTUAL:
${systemState}`,
    [{ role: 'user', content: text }],
    800,
  )

  return NextResponse.json({ reply })
}
