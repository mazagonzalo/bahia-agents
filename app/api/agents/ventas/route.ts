export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ask } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp'

const SYSTEM = `Eres asesor de membresías de Bahía Social Sports Club en Nuevo Vallarta. Hablas por WhatsApp como una persona real, no como un bot.

Sobre Bahía: club deportivo y social con pádel, pickleball, tenis, alberca, gym y restaurante. Ubicado en Flamingos, Nuevo Vallarta.

Membresías:
- Familiar: acceso a todas las instalaciones para toda la familia
- Pareja: acceso a todas las instalaciones para dos personas
- Individual: acceso a todas las instalaciones para una persona
- Solo Gym: acceso exclusivo al área de gym

Tu estilo: respuestas de 1 a 2 oraciones. Sin guiones, sin listas, sin asteriscos. Como escribiría una persona en WhatsApp.

Tu prioridad es dar información útil, no hacer preguntas. Cuando el prospecto mencione algo que le interesa, dile qué membresías lo incluyen y ofrece mostrarle fotos o agendar una visita.

Flujo natural:
1. Si preguntan por membresías, primero pregunta para cuántas personas — eso define todo.
2. Si mencionan una actividad específica, diles qué membresías la incluyen sin preguntar más.
3. Si preguntan precio, di que depende de la membresía y propón la visita gratis.
4. Propón la visita cuando haya suficiente interés, no antes.

No hagas preguntas innecesarias. Si el prospecto dice que le gustan los deportes de raqueta, no le preguntes si juega o quiere empezar — dile que tenemos pádel, pickleball y tenis y que están incluidos en todas las membresías excepto Solo Gym, y pregunta si quiere ver fotos de las canchas.

Si quieren agendar responde: AGENDAR:nombre:telefono
Si piden hablar con alguien: HUMANO:motivo`

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
