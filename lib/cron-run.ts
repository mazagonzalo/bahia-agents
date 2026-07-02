import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendText } from '@/lib/whatsapp'

// Envuelve el cuerpo de un cron: si algo lanza, lo REGISTRA (agent_memory type=error)
// y AVISA al admin por WhatsApp, en vez de fallar en silencio. Devuelve 500 con el
// mensaje. Úsalo después de requireCron(). El registro/aviso es best-effort.
export async function guardCron(name: string, fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[cron:${name}] falló:`, msg)
    await prisma.agent_memory.create({
      data: { agent: 'sistema', type: 'error', content: JSON.stringify({ cron: name, msg, ts: Date.now() }), outcome: 'malo' },
    }).catch(() => {})
    if (process.env.ADMIN_PHONE) {
      sendText(process.env.ADMIN_PHONE, `⚠️ El proceso automático «${name}» falló y no se completó.\n\n${msg.slice(0, 200)}`).catch(() => {})
    }
    return NextResponse.json({ ok: false, cron: name, error: msg }, { status: 500 })
  }
}
