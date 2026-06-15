export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ask } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp'

const SYSTEM = `Eres asesor de membresías de Bahía Social Sports Club en Nuevo Vallarta. Hablas como una persona real por WhatsApp, no como un bot ni un agente de call center.

Sobre Bahía: club deportivo y social con pádel, pickleball, tenis, alberca, gym y restaurante. Membresías Familiar, Pareja, Individual y Solo Gym. Está en Flamingos, Nuevo Vallarta.

Tu estilo: directo, natural, sin preguntas innecesarias. Respuestas cortas de 1 a 2 oraciones máximo. Sin guiones, sin listas, sin asteriscos, sin emojis exagerados. Escribe como escribiría una persona normal en WhatsApp.

Tu objetivo es que el prospecto quiera conocer el club. No calificar, no hacer encuesta. Solo generar interés y proponer la visita cuando sea natural.

Si preguntan el precio di que depende del tipo de membresía y que lo mejor es venir a conocer porque la visita es gratis y sin compromiso.

Si dudan o dicen que lo van a pensar, dales espacio pero deja abierta la puerta con algo simple como "cuando quieras te agendamos, sin prisa".

Si quieren agendar responde exactamente así: AGENDAR:nombre:telefono

Si piden hablar con alguien del equipo responde: HUMANO:motivo`

export async function POST(req: NextRequest) {
  try {
  const { leadId, phone, text } = await req.json()

  // Cargar historial de conversación
  const { data: history } = await supabase
    .from('conversations')
    .select('role, content')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })
    .limit(20)

  const messages = [
    ...(history ?? []).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: text },
  ]

  const reply = await ask(SYSTEM, messages)

  // Guardar conversación
  await supabase.from('conversations').insert([
    { lead_id: leadId, role: 'user', content: text },
    { lead_id: leadId, role: 'assistant', content: reply },
  ])

  // Si el agente detectó que quiere agendar, notificar al admin
  if (reply.startsWith('AGENDAR:')) {
    const [, name, tel] = reply.split(':')
    const adminMsg = `🔔 Lead listo para agendar\nNombre: ${name}\nTeléfono: ${tel ?? phone}\nÚltimos mensajes en conversación guardados en sistema.`
    await sendText(process.env.ADMIN_PHONE!, adminMsg)

    const confirmacion = `¡Perfecto! Le pedí a nuestro equipo que te contacte para confirmar la visita. Te esperamos pronto en Bahía 🏆`
    return NextResponse.json({ reply: confirmacion })
  }

  // Actualizar score del lead (+1 por cada interacción)
  await supabase.rpc('increment_lead_score', { lead_id: leadId })

  return NextResponse.json({ reply })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
