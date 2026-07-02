export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { askMetered } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp'
import { requireCron } from '@/lib/cron-auth'

export async function GET(req: NextRequest) {
  const unauthorized = requireCron(req)
  if (unauthorized) return unauthorized

  const now = new Date()
  const hace7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Leads de la semana
  const { count: leadsTotal } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', hace7d)

  const { count: leadsCitados } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'citado')
    .gte('created_at', hace7d)

  const { count: leadsCerrados } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'cerrado')
    .gte('created_at', hace7d)

  // Campañas publicadas esta semana
  const { count: campanasPublicadas } = await supabase
    .from('creatives')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'publicado')
    .gte('created_at', hace7d)

  // Tendencia top de la semana
  const { data: topTrend } = await supabase
    .from('trends')
    .select('topic, score')
    .gte('created_at', hace7d)
    .order('score', { ascending: false })
    .limit(1)
    .single()

  // Claude genera el resumen ejecutivo (registra costo como SECRETARIA)
  const resumen = await askMetered(
    'SECRETARIA',
    `Eres la secretaria de Bahía Social Sports Club. Genera un reporte semanal breve y profesional para el administrador.
Máximo 6 líneas. Tono ejecutivo. Sin emojis excesivos. Termina con una recomendación concreta para la siguiente semana.`,
    [{
      role: 'user',
      content: `Datos de la semana:
- Leads nuevos: ${leadsTotal ?? 0}
- Citas agendadas: ${leadsCitados ?? 0}
- Membresías cerradas: ${leadsCerrados ?? 0}
- Campañas publicadas: ${campanasPublicadas ?? 0}
- Tendencia más fuerte: ${topTrend?.topic ?? 'sin datos'}
- Tasa de conversión lead→cita: ${leadsTotal ? ((leadsCitados ?? 0) / leadsTotal * 100).toFixed(1) : 0}%`,
    }]
  )

  // Fail-soft: si no hay WhatsApp configurado o el envío falla, no tumbar el cron.
  if (process.env.ADMIN_PHONE) {
    try {
      await sendText(
        process.env.ADMIN_PHONE,
        `📋 *Reporte semanal Bahía — semana del ${new Date(hace7d).toLocaleDateString('es-MX')}*\n\n${resumen}`
      )
    } catch (e) {
      console.error('[weekly-report] sendText falló (se ignora):', e instanceof Error ? e.message : e)
    }
  }

  return NextResponse.json({
    leadsTotal,
    leadsCitados,
    leadsCerrados,
    campanasPublicadas,
    topTrend: topTrend?.topic,
    ran: now.toISOString(),
  })
}
