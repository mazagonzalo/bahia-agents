export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runAgent } from '@/lib/agents/orchestrator'
import { sendText } from '@/lib/whatsapp'

// POST /api/agents/seguimiento  — llamado por el cron o por el admin vía WhatsApp
// GET  /api/agents/seguimiento  — resumen del pipeline actual (sin enviar mensajes)
//
// Rewireado (Fase 3): lecturas/escrituras vía Prisma; el mensaje de nurture lo
// genera runAgent('SEGUIMIENTO') (registra AgentRunLog). Contrato externo INTACTO.

const CLUB = `Bahía Social Sports Club, club deportivo premium en Nuevo Vallarta, Nayarit.
Instalaciones: 8 canchas pádel, 8 pickleball, tenis, alberca olímpica, gym funcional, spinning, yoga.
Membresías: Familiar $6,500 · Pareja $4,500 · Individual $2,500 · Solo Gym $1,800 (mensual).`

type LeadRef = { id: string; phone: string; name: string | null }

async function getHistory(leadId: string): Promise<string> {
  const data = await prisma.conversations.findMany({
    where: { lead_id: leadId },
    orderBy: { created_at: 'desc' },
    take: 6,
    select: { role: true, content: true },
  })
  if (!data.length) return 'Sin historial previo.'
  return data.reverse().map((m) => `${m.role === 'user' ? 'Lead' : 'Bahía'}: ${m.content}`).join('\n')
}

async function getTopTrend(): Promise<string> {
  const data = await prisma.trends.findFirst({ orderBy: { created_at: 'desc' }, select: { topic: true } })
  return data?.topic ?? 'deportes familiares en Riviera Nayarit'
}

async function sendFollowUp(lead: LeadRef, tipo: string, instruccion: string): Promise<boolean> {
  // Marcar last_contact primero — si el cron corre dos veces, el segundo no agarra este lead.
  await prisma.leads.update({ where: { id: lead.id }, data: { last_contact: new Date() } })

  const history = await getHistory(lead.id)
  const nombre = lead.name ?? 'el prospecto'

  let msg = ''
  try {
    const result = await runAgent(
      'SEGUIMIENTO',
      `${instruccion}\n\nClub: ${CLUB}\nProspecto: ${nombre}\nHistorial:\n${history}`,
      { skipApproval: true, tags: ['seguimiento', tipo] }
    )
    const pd = result.proposalData
    if (pd && pd.proposalType !== 'abstain' && typeof pd.message === 'string') msg = pd.message
  } catch {
    return false
  }
  if (!msg) return false

  try {
    await sendText(lead.phone, msg)
  } catch (e) {
    console.error('[seguimiento] sendText falló (se ignora):', e instanceof Error ? e.message : e)
    return false
  }
  await prisma.agent_memory.create({
    data: { agent: 'seguimiento', type: tipo, content: `Lead ${lead.phone} (${nombre}): ${msg}`, outcome: 'neutro' },
  })
  return true
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const dryRun: boolean = body.dryRun === true
  return runSeguimiento(dryRun)
}

export async function GET() {
  return getPipelineSummary()
}

async function getPipelineSummary() {
  const now = Date.now()
  const hace24h = new Date(now - 24 * 3600 * 1000)
  const hace48h = new Date(now - 48 * 3600 * 1000)
  const hace7d = new Date(now - 7 * 24 * 3600 * 1000)
  const sel = { id: true, name: true, phone: true, last_contact: true }

  const [nuevos, calificados, citados, inactivos] = await Promise.all([
    prisma.leads.findMany({ where: { status: 'nuevo', last_contact: { lt: hace24h } }, select: sel }),
    prisma.leads.findMany({ where: { status: 'calificado', last_contact: { lt: hace48h } }, select: sel }),
    prisma.leads.findMany({ where: { status: 'citado' }, select: sel }),
    prisma.leads.findMany({ where: { status: { in: ['nuevo', 'calificado'] }, last_contact: { lt: hace7d } }, select: sel }),
  ])

  return NextResponse.json({
    pipeline: {
      sinRespuesta24h: nuevos.length,
      calificadosSinAvance: calificados.length,
      citadosPendientes: citados.length,
      inactivos7d: inactivos.length,
    },
    leads: {
      sinRespuesta24h: nuevos,
      calificadosSinAvance: calificados,
      citadosPendientes: citados,
      inactivos7d: inactivos,
    },
  })
}

async function runSeguimiento(dryRun = false) {
  const now = Date.now()
  const hace24h = new Date(now - 24 * 3600 * 1000)
  const hace48h = new Date(now - 48 * 3600 * 1000)
  const hace7d = new Date(now - 7 * 24 * 3600 * 1000)
  const hace14d = new Date(now - 14 * 24 * 3600 * 1000)
  const sel = { id: true, phone: true, name: true }

  const topTrend = await getTopTrend()
  const results: { type: string; phone: string; sent: boolean }[] = []

  // Helper: procesa una etapa (envía salvo dryRun).
  async function etapa(leads: LeadRef[], tipo: string, instruccion: string, onSent?: (l: LeadRef) => Promise<void>) {
    for (const lead of leads) {
      let sent = false
      if (!dryRun) {
        sent = await sendFollowUp(lead, tipo, instruccion)
        if (sent && onSent) await onSent(lead)
      }
      results.push({ type: tipo, phone: lead.phone, sent })
    }
  }

  // 1. Nuevos sin respuesta > 24h
  await etapa(
    await prisma.leads.findMany({ where: { status: 'nuevo', last_contact: { lt: hace24h } }, select: sel, take: 15 }),
    'followup_24h',
    `Escribe un mensaje de seguimiento cálido y breve (máx 2 oraciones) para un prospecto que mostró interés en el club pero no respondió en 24h. Usa su nombre. No seas insistente. Deja la puerta abierta con una pregunta suave.`
  )

  // 2. Calificados sin avance > 48h
  await etapa(
    await prisma.leads.findMany({ where: { status: 'calificado', last_contact: { lt: hace48h } }, select: sel, take: 10 }),
    'followup_calificado',
    `Este prospecto ya fue calificado y mostró interés real. Escribe un mensaje corto (2-3 oraciones) que proponga agendar una visita al club de forma concreta — "¿te viene este jueves o viernes?" No expliques el club, ya lo conoce. Crea urgencia real: plazas limitadas.`
  )

  // 3. Citados sin contacto reciente
  await etapa(
    await prisma.leads.findMany({ where: { status: 'citado', last_contact: { lt: hace24h } }, select: sel, take: 10 }),
    'followup_post_visita',
    `El prospecto tenía una visita agendada. Escribe un mensaje empático y breve (1-2 oraciones) preguntando si pudo venir y cómo le fue. Si no vino, abre la puerta para reagendar. Tono cálido, sin presión.`
  )

  // 4. Inactivos 7-14 días → reactivación con tendencia
  await etapa(
    await prisma.leads.findMany({ where: { status: { in: ['nuevo', 'calificado'] }, last_contact: { lt: hace7d, gt: hace14d } }, select: sel, take: 10 }),
    'reactivacion_7d',
    `El prospecto lleva ~1 semana inactivo. Usa la tendencia local "${topTrend}" como gancho genuino para reabrir la conversación. Máximo 2 oraciones. No menciones que llevan tiempo sin hablar. Habla del tema deportivo primero, conecta con el club al final.`
  )

  // 5. Inactivos > 14 días → último intento → marcar frío
  await etapa(
    await prisma.leads.findMany({ where: { status: { in: ['nuevo', 'calificado'] }, last_contact: { lt: hace14d } }, select: sel, take: 5 }),
    'reactivacion_14d',
    `Último intento de reactivación. El prospecto lleva más de 2 semanas sin responder. Escribe un mensaje honesto y breve: "No quiero molestarte, pero si algún día quieres conocer el club, aquí estamos." Tono de cierre amable. Una sola oración.`,
    async (lead) => { await prisma.leads.update({ where: { id: lead.id }, data: { status: 'frio' } }) }
  )

  const total = results.filter((r) => r.sent).length
  return NextResponse.json({ dryRun, processed: results.length, sent: total, results, ran: new Date().toISOString() })
}
