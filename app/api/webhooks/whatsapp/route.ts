export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse, after } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { sendText } from '@/lib/whatsapp'
import { clipVideo } from '@/lib/muapi'

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
  const messageType: string = (message as Record<string, unknown>).type as string ?? 'text'
  const videoMedia = (message as Record<string, unknown>).video as { id?: string; url?: string } | undefined
  const contact = change?.value?.contacts?.[0]
  const name = contact?.profile?.name ?? ''

  // Upsert del lead vía Prisma (ingesta del CRM)
  const lead = await prisma.leads.upsert({
    where: { phone: from },
    update: { name: name || undefined, last_contact: new Date() },
    create: { phone: from, name, last_contact: new Date() },
  })

  if (!lead) return

  // ¿Es el admin? → Agente Secretaria (o clipping si mandó un video)
  if (from === process.env.ADMIN_PHONE) {
    // Admin mandó un video → convertir en clips virales automáticamente
    if (messageType === 'video' && videoMedia?.url) {
      await sendText(from, `🎬 Recibí el video. Extrayendo los mejores momentos para Reels... un momento.`)
      const clips = await clipVideo(videoMedia.url, 5, '9:16')
      if (clips.length === 0) {
        await sendText(from, `⚠️ No pude procesar el video. Intenta con un video más largo (mín. 1 minuto).`)
        return
      }
      const lines = [
        `✅ *${clips.length} clips extraídos* (listos para Reels/TikTok)`,
        ``,
        ...clips.map((c, i) =>
          `${i + 1}. *${c.title}* — score ${c.score}/100\n   Hook: "${c.hook_sentence}"\n   ${c.clip_url}`
        ),
      ]
      await sendText(from, lines.join('\n'))
      return
    }

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
