export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ask } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp'

const SYSTEM = `Eres el agente de ventas de Bahía Social Sports Club en Bahía de Banderas, México.
Tu objetivo es convertir prospectos en visitas al club.

SOBRE BAHÍA:
- Club deportivo y social premium con pádel, pickleball, tenis, alberca, gym y restaurante
- Membresías: Familiar, Pareja, Individual, Solo Gym
- Ubicación: dentro del fraccionamiento Flamingos, Nuevo Vallarta
- Instalaciones de primer nivel, ambiente familiar y deportivo

INSTRUCCIONES:
- Responde siempre en español, de forma cálida y profesional
- Haz preguntas para calificar: zona donde vive, tipo de membresía de interés, si ya conocía el club
- Si el prospecto quiere más información, ofrece agendar una visita guiada sin costo
- Si pregunta precio, explica que depende del tipo de membresía y lo mejor es verlo en persona
- Máximo 2-3 oraciones por respuesta — esto es WhatsApp, no email
- Cuando el prospecto quiera agendar, responde con: AGENDAR:nombre:telefono

NUNCA:
- Menciones precios específicos por WhatsApp
- Seas agresivo o presiones
- Escribas párrafos largos`

export async function POST(req: NextRequest) {
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
}
