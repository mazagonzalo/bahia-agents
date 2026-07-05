export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ask } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp'
import { CLIENT } from '@/lib/client.config'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const CONTACTO = [
  CLIENT.contact.whatsapp && `- WhatsApp: ${CLIENT.contact.whatsapp}`,
  CLIENT.contact.instagram && `- Instagram: ${CLIENT.contact.instagram}`,
  CLIENT.contact.email && `- Email: ${CLIENT.contact.email}`,
  CLIENT.contact.calendar && `- Agendar visita: ${CLIENT.contact.calendar}`,
  CLIENT.contact.website && `- Sitio web: ${CLIENT.contact.website}`,
].filter(Boolean).join('\n')

const SYSTEM = `Eres asesor de membresías de ${CLIENT.name}. Escribes por WhatsApp como una persona real, directo y sin rodeos.

SOBRE ${CLIENT.shortName.toUpperCase()}
${CLIENT.oneLiner} ${CLIENT.location.note}

INSTALACIONES
${CLIENT.facilitiesList.map((f) => `- ${f}`).join('\n')}

MEMBRESÍAS
${CLIENT.memberships.map((m) => `- ${m.name} ${m.price}${m.setup ? ` (${m.setup})` : ''} — ${m.detail}`).join('\n')}

CONTACTO
${CONTACTO}

TU OBJETIVO
Que el prospecto agende una visita o pida que lo contacten. No es conocerlo, es llevarlo a la acción.

CÓMO HACERLO
1. Si preguntan por membresías, primero menciona los ${CLIENT.memberships.length} planes en una sola oración y pregunta si es para uno solo o para más personas.
2. Según lo que respondan, diles cuál les conviene y ofrece el link del sitio para que vean todos los detalles.
3. Si preguntan canchas o instalaciones, responde con los datos reales de arriba. No inventes.
4. Propón la visita cuando haya interés. La visita es gratis y sin compromiso.${CLIENT.contact.calendar ? ` El link para agendar es ${CLIENT.contact.calendar}` : ''}
5. Si dudan, no presiones. "Sin prisa, cuando quieras te agendo" y ya.

ESTILO
Máximo 1 a 2 oraciones por mensaje. Sin listas, sin guiones, sin asteriscos. Lenguaje casual como una persona real en WhatsApp.

Nunca inventes datos que no estén en este prompt. Si no sabes algo, manda al sitio o di que el equipo lo confirma.

Si quieren agendar: AGENDAR:nombre:telefono
Si piden hablar con alguien del equipo: HUMANO:motivo`

export async function POST(req: NextRequest) {
  try {
  const { leadId, phone, text } = await req.json()

  // leadId real = UUID de un lead. El panel de prueba manda 'test-panel' →
  // chat sin persistencia (la columna lead_id es uuid, no acepta strings libres).
  const validLead = typeof leadId === 'string' && UUID_RE.test(leadId)

  // Cargar historial de conversación (solo leads reales)
  const history = validLead
    ? await prisma.conversations.findMany({
        where: { lead_id: leadId },
        orderBy: { created_at: 'asc' },
        take: 20,
        select: { role: true, content: true },
      })
    : []

  const messages = [
    ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: text },
  ]

  const reply = await ask(SYSTEM, messages)

  // Guardar conversación (solo leads reales)
  if (validLead) {
    await prisma.conversations.createMany({
      data: [
        { lead_id: leadId, role: 'user', content: text },
        { lead_id: leadId, role: 'assistant', content: reply },
      ],
    })
  }

  // Si el agente detectó que quiere agendar, notificar al admin
  if (reply.startsWith('AGENDAR:')) {
    const [, name, tel] = reply.split(':')
    const adminMsg = `🔔 Lead listo para agendar\nNombre: ${name}\nTeléfono: ${tel ?? phone}\nÚltimos mensajes en conversación guardados en sistema.`
    if (process.env.ADMIN_PHONE) {
      try { await sendText(process.env.ADMIN_PHONE, adminMsg) }
      catch (e) { console.error('[ventas] sendText falló:', e instanceof Error ? e.message : e) }
    }

    const confirmacion = `¡Perfecto! Le pedí a nuestro equipo que te contacte para confirmar la visita. Te esperamos pronto en ${CLIENT.shortName} 🏆`
    return NextResponse.json({ reply: confirmacion })
  }

  // Score del lead +1 por interacción (reemplaza el RPC increment_lead_score)
  if (validLead) {
    await prisma.leads.updateMany({ where: { id: leadId }, data: { score: { increment: 1 } } })
  }

  return NextResponse.json({ reply })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
