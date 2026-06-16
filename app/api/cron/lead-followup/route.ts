export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ask } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp'
import { requireCron } from '@/lib/cron-auth'

export async function GET(req: NextRequest) {
  const unauthorized = requireCron(req)
  if (unauthorized) return unauthorized

  const now = new Date()
  const hace24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const hace7d  = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString()

  // 1. Leads nuevos sin respuesta en más de 24h
  const { data: sinRespuesta } = await supabase
    .from('leads')
    .select('id, phone, name')
    .eq('status', 'nuevo')
    .lt('last_contact', hace24h)
    .limit(20)

  for (const lead of sinRespuesta ?? []) {
    const msg = await ask(
      'Escribe un mensaje de seguimiento corto y cálido (máx 2 oraciones) para un prospecto que mostró interés en Bahía Sports Club pero no respondió ayer. No seas agresivo. Personaliza con su nombre si está disponible.',
      [{ role: 'user', content: `Nombre del prospecto: ${lead.name || 'el prospecto'}` }]
    )
    await sendText(lead.phone, msg)
    await supabase.from('leads').update({ last_contact: now.toISOString() }).eq('id', lead.id)
  }

  // 2. Leads inactivos por más de 7 días → reactivación
  const { data: inactivos } = await supabase
    .from('leads')
    .select('id, phone, name')
    .in('status', ['nuevo', 'calificado'])
    .lt('last_contact', hace7d)
    .limit(10)

  // Obtener tendencia top de la semana
  const { data: topTrend } = await supabase
    .from('trends')
    .select('topic, angle')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  for (const lead of inactivos ?? []) {
    const msg = await ask(
      'Escribe un mensaje de reactivación para un prospecto inactivo de Bahía Sports Club. Menciona la tendencia local si es relevante. Máximo 2 oraciones. Sin presión.',
      [{ role: 'user', content: `Nombre: ${lead.name || 'el prospecto'}\nTendencia local: ${topTrend?.topic ?? 'deportes familiares'}` }]
    )
    await sendText(lead.phone, msg)
    await supabase.from('leads').update({ last_contact: now.toISOString() }).eq('id', lead.id)
  }

  return NextResponse.json({
    followedUp: (sinRespuesta?.length ?? 0) + (inactivos?.length ?? 0),
    ran: now.toISOString(),
  })
}
