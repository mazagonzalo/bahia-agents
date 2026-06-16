export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse, after } from 'next/server'
import crypto from 'crypto'
import { supabase } from '@/lib/supabase'
import { sendText } from '@/lib/whatsapp'

// Verifica que el POST venga realmente de Meta usando el App Secret (HMAC SHA-256
// del cuerpo crudo contra el header X-Hub-Signature-256). Sin esto, cualquiera
// puede disparar el webhook y quemar llamadas a Claude/WhatsApp.
function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.META_APP_SECRET
  if (!secret || !signature) return false
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

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
  const raw = await req.text()

  // Verifica la firma de Meta ANTES de procesar nada
  if (!verifySignature(raw, req.headers.get('x-hub-signature-256'))) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const body = JSON.parse(raw)

  // Procesa en background con after() (Meta requiere responder en <5s; after()
  // mantiene viva la función serverless hasta terminar, a diferencia de un
  // fire-and-forget que Vercel puede matar al enviar la respuesta).
  after(() => processMessage(body).catch(console.error))

  return new NextResponse('OK', { status: 200 })
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
