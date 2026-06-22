export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { ask } from '@/lib/claude'
import { prisma } from '@/lib/db'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function creativeTitle(content: unknown): string {
  const c = content as {
    idea?: { title?: string }
    trend?: { topic?: string }
    angle?: string
    carousel?: { angle?: string }
  } | null
  return c?.idea?.title ?? c?.trend?.topic ?? c?.carousel?.angle ?? c?.angle ?? 'sin título'
}

// #B — Si la pregunta menciona el nombre de un lead, trae su estado + conversación.
async function findMentionedLeads(text: string): Promise<string> {
  const candidates = await prisma.leads.findMany({
    select: { id: true, name: true, phone: true, status: true, score: true, last_contact: true },
    orderBy: { created_at: 'desc' },
    take: 500,
  })
  const t = text.toLowerCase()
  const matched = candidates.filter(l => l.name && l.name.trim().length > 2 && t.includes(l.name.toLowerCase()))
  if (matched.length === 0) return ''

  const lines: string[] = ['LEAD(S) MENCIONADO(S) EN LA PREGUNTA:']
  for (const l of matched.slice(0, 3)) {
    const ultimo = l.last_contact ? new Date(l.last_contact).toLocaleDateString('es-MX') : '—'
    lines.push(`• ${l.name} (${l.phone}) — ${l.status} · score ${l.score ?? '—'} · último contacto ${ultimo}`)
    const conv = await prisma.conversations.findMany({
      where: { lead_id: l.id },
      orderBy: { created_at: 'desc' },
      take: 6,
      select: { role: true, content: true },
    })
    if (conv.length) {
      lines.push('  Conversación reciente:')
      conv.reverse().forEach(m => lines.push(`    ${m.role === 'user' ? 'Lead' : 'Bahía'}: ${typeof m.content === 'string' ? m.content.slice(0, 140) : ''}`))
    }
  }
  return lines.join('\n')
}

// #A — Aprobación SEGURA: lista los borradores; aprueba solo el que el admin indique.
// Los carruseles se rutean por el ciclo de contenido (genera la cola de rotación).
async function handleApproval(text: string): Promise<NextResponse> {
  const pending = await prisma.creatives.findMany({
    where: { status: 'borrador' },
    orderBy: { created_at: 'desc' },
    take: 8,
    select: { id: true, type: true, content: true },
  })
  if (pending.length === 0) return NextResponse.json({ reply: 'No hay creativos pendientes de aprobación.' })

  const lower = text.toLowerCase()
  const numMatch = lower.match(/\b(\d{1,2})\b/)
  const idMatch = text.match(/\b([0-9a-f]{8})\b/i)
  let target: (typeof pending)[number] | undefined
  if (numMatch) target = pending[parseInt(numMatch[1], 10) - 1]
  else if (idMatch) target = pending.find(c => c.id.toLowerCase().startsWith(idMatch[1].toLowerCase()))

  // Sin indicación clara → listar y pedir cuál (nada de "aprobar todo a ciegas")
  if (!target) {
    const list = pending.map((c, i) => `${i + 1}. [${c.type}] ${creativeTitle(c.content)} — \`${c.id.slice(0, 8)}\``).join('\n')
    return NextResponse.json({
      reply: `Tienes ${pending.length} borrador(es) pendiente(s). ¿Cuál apruebo? Responde "aprueba el N":\n\n${list}`,
    })
  }

  if (target.type === 'carrusel') {
    // Rutea por contenido → marca aprobado + deriva las 2 variantes de rotación.
    await fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/contenido`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'aprobar', creativeId: target.id }),
    }).catch(() => {})
    return NextResponse.json({ reply: `✅ Aprobé el carrusel "${creativeTitle(target.content)}" y mandé a generar su cola de rotación.` })
  }

  await prisma.creatives.update({ where: { id: target.id }, data: { status: 'aprobado' } })
  return NextResponse.json({ reply: `✅ Aprobé "${creativeTitle(target.content)}" (${target.type}).` })
}

// ─── Estado del sistema (lee a todos los agentes vía Prisma) ──────────────────
async function loadSystemState(): Promise<string> {
  const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000)
  const since14d = new Date(Date.now() - 14 * 24 * 3600 * 1000)
  const since24h = new Date(Date.now() - 24 * 3600 * 1000)

  const [memoriesData, leadsData, leadsCitadosCount, leadsCalificadosCount, creativesData, trendsData] = await Promise.all([
    // Historial amplio de TODOS los agentes (excluye el Q&A propio de la secretaria,
    // que se pasa aparte como memoria de conversación).
    prisma.agent_memory.findMany({
      where: { created_at: { gte: since14d }, NOT: { agent: 'secretaria', type: 'qa' } },
      orderBy: { created_at: 'desc' },
      take: 80,
      select: { agent: true, type: true, content: true, outcome: true, created_at: true },
    }),
    prisma.leads.findMany({
      where: { created_at: { gte: since7d } },
      orderBy: { created_at: 'desc' },
      select: { status: true, score: true, created_at: true, last_contact: true, name: true, phone: true },
    }),
    prisma.leads.count({ where: { status: 'citado' } }),
    prisma.leads.count({ where: { status: 'calificado' } }),
    prisma.creatives.findMany({
      where: { created_at: { gte: since7d } },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: { id: true, type: true, status: true, content: true },
    }),
    prisma.trends.findMany({
      where: { created_at: { gte: since7d } },
      orderBy: { score: 'desc' },
      take: 10,
      select: { topic: true, score: true, source: true },
    }),
  ])

  const lines: string[] = [`=== ESTADO DEL SISTEMA BAHÍA — ${new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} ===`, '']

  // Leads
  const allLeads = leadsData
  const nuevos = allLeads.filter(l => l.status === 'nuevo').length
  const frios = allLeads.filter(l => l.status === 'frio').length
  lines.push(`LEADS (últimos 7 días):`)
  lines.push(`  Nuevos: ${nuevos} | Calificados: ${leadsCalificadosCount} | Citados: ${leadsCitadosCount} | Fríos: ${frios}`)
  const recientes = allLeads.slice(0, 5).map(l => `  • ${l.name ?? l.phone} — ${l.status} (score: ${l.score ?? '—'})`)
  if (recientes.length) lines.push('  Recientes:', ...recientes)
  lines.push('')

  // Creativos
  const borradores = creativesData.filter(c => c.status === 'borrador')
  const aprobados = creativesData.filter(c => c.status === 'aprobado')
  const publicados = creativesData.filter(c => c.status === 'publicado')
  lines.push(`CREATIVOS:`)
  lines.push(`  Borradores (pendientes de aprobación): ${borradores.length}`)
  borradores.slice(0, 3).forEach((c, i) => lines.push(`  ${i + 1}. [${c.type}] ${creativeTitle(c.content)} — ID: ${c.id.slice(0, 8)}`))
  lines.push(`  Aprobados: ${aprobados.length} | Publicados: ${publicados.length}`)
  lines.push('')

  // #C — Qué necesita tu atención (proactivo)
  const sinSeguimiento = allLeads.filter(l =>
    (l.status === 'nuevo' || l.status === 'calificado')
    && l.last_contact != null
    && (Date.now() - new Date(l.last_contact).getTime()) > 48 * 3600 * 1000,
  ).length
  const atencion: string[] = []
  if (borradores.length) atencion.push(`${borradores.length} creativo(s) en borrador por aprobar (escribe "aprueba" para verlos)`)
  if (sinSeguimiento) atencion.push(`${sinSeguimiento} lead(s) calificado/nuevo sin seguimiento hace +48h`)
  if (leadsCitadosCount) atencion.push(`${leadsCitadosCount} lead(s) citado(s) — confirmar asistencia`)
  if (atencion.length) {
    lines.push(`⚠️ NECESITA TU ATENCIÓN:`)
    atencion.forEach(a => lines.push(`  • ${a}`))
    lines.push('')
  }

  // Tendencias
  if (trendsData.length) {
    lines.push(`TENDENCIAS DETECTADAS ESTA SEMANA:`)
    trendsData.forEach(t => lines.push(`  • ${t.topic} (score: ${t.score}) — ${t.source}`))
    lines.push('')
  }

  // Actividad reciente por agente
  const agentGroups: Record<string, typeof memoriesData> = {}
  for (const m of memoriesData) {
    if (!agentGroups[m.agent]) agentGroups[m.agent] = []
    agentGroups[m.agent].push(m)
  }
  lines.push(`HISTORIAL POR AGENTE (últimos 14 días):`)
  for (const [agent, entries] of Object.entries(agentGroups)) {
    const good = entries.filter(e => e.outcome === 'bueno').length
    const bad = entries.filter(e => e.outcome === 'malo').length
    lines.push(`  [${agent}] ${entries.length} acción(es) · ✓${good} ✗${bad}`)
    entries.slice(0, 3).forEach(e => {
      const hace = e.created_at ? Math.round((Date.now() - e.created_at.getTime()) / 3600000) : 0
      const preview = typeof e.content === 'string' ? e.content.slice(0, 90) : JSON.stringify(e.content).slice(0, 90)
      lines.push(`    - hace ${hace}h · ${e.type} (${e.outcome ?? '—'}): ${preview}`)
    })
  }

  const nuevos24h = allLeads.filter(l => l.created_at != null && l.created_at >= since24h).length
  if (nuevos24h > 0) lines.push('', `⚡ ${nuevos24h} lead(s) nuevo(s) en las últimas 24h`)

  return lines.join('\n')
}

// Memoria propia: el hilo de conversación admin↔secretaria (recuerda lo ya preguntado).
async function loadOwnHistory(): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  const rows = await prisma.agent_memory.findMany({
    where: { agent: 'secretaria', type: 'qa' },
    orderBy: { created_at: 'desc' },
    take: 6,
    select: { content: true },
  })
  const msgs: { role: 'user' | 'assistant'; content: string }[] = []
  for (const r of rows.reverse()) {
    try {
      const { q, a } = JSON.parse(r.content) as { q?: string; a?: string }
      if (q && a) msgs.push({ role: 'user', content: q }, { role: 'assistant', content: a })
    } catch { /* ignora entradas con otro formato */ }
  }
  return msgs
}

export async function POST(req: NextRequest) {
  const { text } = await req.json()
  if (!text) return NextResponse.json({ error: 'Sin mensaje' }, { status: 400 })

  const lower = text.trim().toLowerCase()

  // #A — Comando de aprobación (intencional: el mensaje empieza con el imperativo)
  if (/^(aprueb|aprob|publica|dale)/.test(lower)) {
    return handleApproval(text)
  }

  // Memoria: estado del sistema + leads mencionados + hilo de conversación previo
  const [mentionedLeads, systemState, history] = await Promise.all([
    findMentionedLeads(text),
    loadSystemState(),
    loadOwnHistory(),
  ])

  const reply = await ask(
    `Eres la secretaria del sistema de agentes de marketing de Bahía Social Sports Club.
Tienes MEMORIA: recuerdas esta conversación (mensajes anteriores) y conoces el historial de todos los agentes.
Respondes preguntas del admin con DATOS REALES. Conciso y directo (máx 6 líneas salvo que pidan detalle).
- Si el admin se refiere a algo que ya hablaron ("¿y ese?", "el que dije"), usa el hilo de conversación.
- Si hay algo en "NECESITA TU ATENCIÓN" relevante, menciónalo proactivamente.
- Si preguntan por un lead específico, usa la sección "LEAD MENCIONADO" (incluye su conversación).
- Si preguntan por la historia de un agente, usa "HISTORIAL POR AGENTE".
- Si algo no está en los datos, dilo claro — NO inventes.
- Para aprobar creativos, dile al admin que escriba "aprueba" (tú no apruebas aquí).

ESTADO ACTUAL:
${systemState}${mentionedLeads ? `\n\n${mentionedLeads}` : ''}`,
    [...history, { role: 'user' as const, content: text }],
    800,
  )

  // Guarda el turno → memoria propia (para recordar lo que ya le preguntaron)
  await prisma.agent_memory.create({
    data: { agent: 'secretaria', type: 'qa', content: JSON.stringify({ q: text, a: reply }), outcome: 'neutro' },
  }).catch(() => {})

  return NextResponse.json({ reply })
}
