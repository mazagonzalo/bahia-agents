export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ask } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp'

// POST /api/agents/seguimiento  — llamado por el cron o por el admin vía WhatsApp
// GET  /api/agents/seguimiento  — resumen del pipeline actual (sin enviar mensajes)

const CLUB = `Bahía Social Sports Club, club deportivo premium en Nuevo Vallarta, Nayarit.
Instalaciones: 8 canchas pádel, 8 pickleball, tenis, alberca olímpica, gym funcional, spinning, yoga.
Membresías: Familiar $6,500 · Pareja $4,500 · Individual $2,500 · Solo Gym $1,800 (mensual).`

type Lead = {
  id: string
  phone: string
  name: string | null
  status: string | null
  score: number | null
  last_contact: string | null
  created_at: string
}

type ConvMessage = { role: string; content: string; created_at: string }

async function getHistory(leadId: string): Promise<string> {
  const { data } = await supabase
    .from('conversations')
    .select('role, content, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(6)
  if (!data?.length) return 'Sin historial previo.'
  return data.reverse().map((m: ConvMessage) => `${m.role === 'user' ? 'Lead' : 'Bahía'}: ${m.content}`).join('\n')
}

async function getTopTrend(): Promise<string> {
  const { data } = await supabase
    .from('trends')
    .select('topic')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data?.topic ?? 'deportes familiares en Riviera Nayarit'
}

async function sendFollowUp(lead: Lead, tipo: string, prompt: string): Promise<boolean> {
  // Marcar last_contact primero — si el cron corre dos veces, el segundo no agarra este lead
  const sentAt = new Date().toISOString()
  await supabase.from('leads').update({ last_contact: sentAt }).eq('id', lead.id)

  const history = await getHistory(lead.id)
  const nombre = lead.name ?? 'el prospecto'
  const msg = await ask(prompt, [{
    role: 'user',
    content: `Club: ${CLUB}\nProspecto: ${nombre}\nHistorial:\n${history}`,
  }])
  if (!msg) return false
  await sendText(lead.phone, msg)
  await supabase.from('agent_memory').insert({
    agent: 'seguimiento',
    type: tipo,
    content: `Lead ${lead.phone} (${nombre}): ${msg}`,
    outcome: 'neutro',
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
  const now = new Date()
  const hace24h = new Date(now.getTime() - 24 * 3600 * 1000).toISOString()
  const hace48h = new Date(now.getTime() - 48 * 3600 * 1000).toISOString()
  const hace7d  = new Date(now.getTime() - 7  * 24 * 3600 * 1000).toISOString()

  const [nuevos, calificados, citados, inactivos] = await Promise.all([
    supabase.from('leads').select('id, name, phone, last_contact').eq('status', 'nuevo').lt('last_contact', hace24h),
    supabase.from('leads').select('id, name, phone, last_contact').eq('status', 'calificado').lt('last_contact', hace48h),
    supabase.from('leads').select('id, name, phone, last_contact').eq('status', 'citado'),
    supabase.from('leads').select('id, name, phone, last_contact').in('status', ['nuevo', 'calificado']).lt('last_contact', hace7d),
  ])

  return NextResponse.json({
    pipeline: {
      sinRespuesta24h: nuevos.data?.length ?? 0,
      calificadosSinAvance: calificados.data?.length ?? 0,
      citadosPendientes: citados.data?.length ?? 0,
      inactivos7d: inactivos.data?.length ?? 0,
    },
    leads: {
      sinRespuesta24h: nuevos.data ?? [],
      calificadosSinAvance: calificados.data ?? [],
      citadosPendientes: citados.data ?? [],
      inactivos7d: inactivos.data ?? [],
    },
  })
}

async function runSeguimiento(dryRun = false) {
  const now = new Date()
  const hace24h = new Date(now.getTime() - 24 * 3600 * 1000).toISOString()
  const hace48h = new Date(now.getTime() - 48 * 3600 * 1000).toISOString()
  const hace7d  = new Date(now.getTime() - 7  * 24 * 3600 * 1000).toISOString()
  const hace14d = new Date(now.getTime() - 14 * 24 * 3600 * 1000).toISOString()

  const topTrend = await getTopTrend()
  const results: { type: string; phone: string; sent: boolean }[] = []

  // ── 1. Nuevos sin respuesta > 24h ─────────────────────────────────────────────
  const { data: sinRespuesta } = await supabase
    .from('leads')
    .select('id, phone, name, status, score, last_contact, created_at')
    .eq('status', 'nuevo')
    .lt('last_contact', hace24h)
    .limit(15)

  for (const lead of (sinRespuesta ?? []) as Lead[]) {
    if (!dryRun) {
      const sent = await sendFollowUp(lead, 'followup_24h',
        `Escribe un mensaje de seguimiento cálido y breve (máx 2 oraciones) para un prospecto que mostró interés en el club pero no respondió en 24h. Usa su nombre. No seas insistente. Deja la puerta abierta con una pregunta suave.`
      )
      results.push({ type: 'followup_24h', phone: lead.phone, sent })
    } else {
      results.push({ type: 'followup_24h', phone: lead.phone, sent: false })
    }
  }

  // ── 2. Calificados sin avance > 48h ──────────────────────────────────────────
  const { data: calificados } = await supabase
    .from('leads')
    .select('id, phone, name, status, score, last_contact, created_at')
    .eq('status', 'calificado')
    .lt('last_contact', hace48h)
    .limit(10)

  for (const lead of (calificados ?? []) as Lead[]) {
    if (!dryRun) {
      const sent = await sendFollowUp(lead, 'followup_calificado',
        `Este prospecto ya fue calificado y mostró interés real. Escribe un mensaje corto (2-3 oraciones) que proponga agendar una visita al club de forma concreta — "¿te viene este jueves o viernes?" No expliques el club, ya lo conoce. Crea urgencia real: plazas limitadas.`
      )
      results.push({ type: 'followup_calificado', phone: lead.phone, sent })
    } else {
      results.push({ type: 'followup_calificado', phone: lead.phone, sent: false })
    }
  }

  // ── 3. Citados: visita programada pasó hace > 3h y no hay confirmación ────────
  const { data: citados } = await supabase
    .from('leads')
    .select('id, phone, name, status, score, last_contact, created_at')
    .eq('status', 'citado')
    .lt('last_contact', hace24h)
    .limit(10)

  for (const lead of (citados ?? []) as Lead[]) {
    if (!dryRun) {
      const sent = await sendFollowUp(lead, 'followup_post_visita',
        `El prospecto tenía una visita agendada. Escribe un mensaje empático y breve (1-2 oraciones) preguntando si pudo venir y cómo le fue. Si no vino, abre la puerta para reagendar. Tono cálido, sin presión.`
      )
      results.push({ type: 'followup_post_visita', phone: lead.phone, sent })
    } else {
      results.push({ type: 'followup_post_visita', phone: lead.phone, sent: false })
    }
  }

  // ── 4. Inactivos 7-14 días → reactivación con tendencia ─────────────────────
  const { data: inactivos7 } = await supabase
    .from('leads')
    .select('id, phone, name, status, score, last_contact, created_at')
    .in('status', ['nuevo', 'calificado'])
    .lt('last_contact', hace7d)
    .gt('last_contact', hace14d)
    .limit(10)

  for (const lead of (inactivos7 ?? []) as Lead[]) {
    if (!dryRun) {
      const sent = await sendFollowUp(lead, 'reactivacion_7d',
        `El prospecto lleva ~1 semana inactivo. Usa la tendencia local "${topTrend}" como gancho genuino para reabrir la conversación. Máximo 2 oraciones. No menciones que llevan tiempo sin hablar. Habla del tema deportivo primero, conecta con el club al final.`
      )
      results.push({ type: 'reactivacion_7d', phone: lead.phone, sent })
    } else {
      results.push({ type: 'reactivacion_7d', phone: lead.phone, sent: false })
    }
  }

  // ── 5. Inactivos > 14 días → último intento ──────────────────────────────────
  const { data: inactivos14 } = await supabase
    .from('leads')
    .select('id, phone, name, status, score, last_contact, created_at')
    .in('status', ['nuevo', 'calificado'])
    .lt('last_contact', hace14d)
    .limit(5)

  for (const lead of (inactivos14 ?? []) as Lead[]) {
    if (!dryRun) {
      const sent = await sendFollowUp(lead, 'reactivacion_14d',
        `Último intento de reactivación. El prospecto lleva más de 2 semanas sin responder. Escribe un mensaje honesto y breve: "No quiero molestarte, pero si algún día quieres conocer el club, aquí estamos." Tono de cierre amable. Una sola oración.`
      )
      // Después del último intento → marcar como frío
      if (sent) {
        await supabase.from('leads').update({ status: 'frio' }).eq('id', lead.id)
      }
      results.push({ type: 'reactivacion_14d', phone: lead.phone, sent })
    } else {
      results.push({ type: 'reactivacion_14d', phone: lead.phone, sent: false })
    }
  }

  const total = results.filter(r => r.sent).length
  return NextResponse.json({
    dryRun,
    processed: results.length,
    sent: total,
    results,
    ran: now.toISOString(),
  })
}
