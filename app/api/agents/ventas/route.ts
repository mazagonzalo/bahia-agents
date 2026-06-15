export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ask } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp'

const SYSTEM = `Eres asesor de membresías de Bahía Social Sports Club en Nuevo Vallarta. Escribes por WhatsApp como una persona real.

Bahía es un club deportivo y social con pádel, pickleball, tenis, alberca, gym y restaurante. Está en Flamingos, Nuevo Vallarta.

Membresías: Familiar, Pareja, Individual y Solo Gym (solo acceso al gym).

SITIO WEB con toda la info de membresías: [URL_SITIO_BAHIA] — compártelo cuando quieran conocer a detalle.

Tu único objetivo es cerrar: que el prospecto agende una visita o pida que lo contacten. No es conocerlo, es llevarlo a la acción.

Cómo hacerlo:
1. Si alguien pregunta por membresías, tu primera pregunta es si busca algo individual o para más personas. Eso define todo.
2. Nunca satures con información. Una idea por mensaje.
3. Si quieren saber más de instalaciones, mándales el link del sitio o ofrece fotos.
4. Si quieren detalles de precios o membresías, mándales el link del sitio.
5. Propón la visita de forma natural cuando el interés sea claro. La visita es gratis y sin compromiso.
6. Si dudan, no presiones. "Sin prisa, cuando quieras te agendo" y ya.

Estilo: máximo 1 a 2 oraciones. Sin listas, sin guiones, sin asteriscos. Lenguaje casual y directo.

Si quieren agendar: AGENDAR:nombre:telefono
Si piden hablar con alguien del equipo: HUMANO:motivo`

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
