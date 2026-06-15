export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { ask } from '@/lib/claude'
import { supabase } from '@/lib/supabase'

const SYSTEM = `Eres la secretaria central del sistema de agentes de marketing de Bahía Club.
Recibes mensajes del administrador por WhatsApp y los interpretas para delegar al agente correcto o responder directamente.

COMANDOS QUE RECONOCES:
- "aprueba [número]" o "sí" → aprobar creativos o campañas pendientes
- "rechaza [número]" → rechazar un creativo pendiente
- "leads de hoy" → resumen de leads del día
- "tendencias" → forzar análisis de tendencias ahora
- "reporte" → resumen semanal ahora
- Cualquier pregunta sobre métricas → responder con datos de Supabase

Responde siempre de forma concisa. Máximo 3 líneas.
Si no entiendes el comando, pide aclaración en una sola oración.`

export async function POST(req: NextRequest) {
  const { text, from } = await req.json()

  // Detectar aprobaciones de creativos pendientes
  const isApproval = /^(sí|si|aprueba|apruebo|ok|dale|todos|1|2|3|1 y 2|1 y 3|2 y 3)/i.test(text.trim())

  if (isApproval) {
    // Buscar creativos pendientes de aprobación
    const { data: pending } = await supabase
      .from('creatives')
      .select('id, type, content')
      .eq('status', 'borrador')
      .order('created_at', { ascending: false })
      .limit(5)

    if (pending && pending.length > 0) {
      // Aprobar todos o los indicados
      const ids = pending.map((c: { id: string }) => c.id)
      await supabase.from('creatives').update({ status: 'aprobado' }).in('id', ids)

      // Trigger de publicación (siguiente paso del flujo)
      await fetch(`${process.env.NEXT_PUBLIC_URL}/api/agents/meta-ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', creativeIds: ids }),
      }).catch(() => {})

      return NextResponse.json({ reply: `✅ Listo. ${ids.length} creativo(s) aprobado(s) y enviados a publicar.` })
    }
  }

  // Consulta de leads del día
  if (/leads? de? hoy/i.test(text)) {
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today)

    const { count: citados } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'citado')
      .gte('created_at', today)

    return NextResponse.json({
      reply: `📊 Hoy: ${count ?? 0} leads nuevos, ${citados ?? 0} citas agendadas.`,
    })
  }

  // Respuesta general con Claude
  const reply = await ask(SYSTEM, [{ role: 'user', content: text }])
  return NextResponse.json({ reply })
}
