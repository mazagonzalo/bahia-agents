import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendText } from '@/lib/whatsapp'

// Verificación del webhook (Meta lo llama una vez al configurar)
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const mode = params.get('hub.mode')
  const token = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// Recepción de mensajes entrantes
export async function POST(req: NextRequest) {
  const body = await req.json()

  // Responde 200 inmediatamente — Meta requiere < 5 segundos
  const response = new NextResponse('OK', { status: 200 })

  // Procesa en background (sin await para no bloquear la respuesta)
  processMessage(body).catch(console.error)

  return response
}

async function processMessage(body: Record<string, unknown>) {
  const entry = (body.entry as { changes: { value: { messages?: { from: string; text?: { body: string } }[]; contacts?: { profile: { name: string } }[] } }[] }[])?.[0]
  const change = entry?.changes?.[0]
  const message = change?.value?.messages?.[0]

  if (!message) return

  const from = message.from
  const text = message.text?.body ?? ''
  const contact = change?.value?.contacts?.[0]
  const name = contact?.profile?.name ?? ''

  // Upsert del lead en Supabase
  const { data: lead } = await supabase
    .from('leads')
    .upsert({ phone: from, name, last_contact: new Date().toISOString() }, { onConflict: 'phone' })
    .select()
    .single()

  if (!lead) return

  // ¿Es el admin? → Agente Secretaria
  if (from === process.env.ADMIN_PHONE) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/secretaria`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, from }),
    })
    const { reply } = await res.json()
    if (reply) await sendText(from, reply)
    return
  }

  // Es un lead → Agente de Ventas
  const res = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/ventas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId: lead.id, phone: from, text }),
  })
  const { reply } = await res.json()
  if (reply) await sendText(from, reply)
}
