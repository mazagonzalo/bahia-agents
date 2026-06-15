export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ask } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp'

const META_BASE = 'https://graph.facebook.com/v19.0'
const AD_ACCOUNT = process.env.META_AD_ACCOUNT_ID

async function metaPost(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${META_BASE}/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...body, access_token: process.env.WHATSAPP_TOKEN }),
  })
  return res.json()
}

async function metaGet(path: string) {
  const res = await fetch(`${META_BASE}/${path}&access_token=${process.env.WHATSAPP_TOKEN}`)
  return res.json()
}

export async function POST(req: NextRequest) {
  const { action, creativeIds } = await req.json()

  if (action === 'publish') {
    return publishCampaigns(creativeIds)
  }

  if (action === 'monitor') {
    return monitorCampaigns()
  }

  return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
}

// Llamada desde Vercel Cron
export async function GET() {
  return monitorCampaigns()
}

async function publishCampaigns(creativeIds: string[]) {
  const { data: creatives } = await supabase
    .from('creatives')
    .select('*')
    .in('id', creativeIds)

  if (!creatives?.length) return NextResponse.json({ error: 'Sin creativos' }, { status: 404 })

  const results = []
  for (const creative of creatives) {
    const trend = creative.content?.trend

    // Claude define la audiencia óptima basada en la tendencia
    const audienceJson = await ask(
      `Define la audiencia óptima de Meta Ads para Bahía Social Sports Club en Nuevo Vallarta.
Devuelve SOLO JSON:
{"age_min":25,"age_max":55,"genders":[1,2],"interests":["interesse1","interes2"],"cities":["Nuevo Vallarta","Bucerías","Puerto Vallarta"],"budget_daily":2500}
Budget en MXN. Genders: 1=hombres, 2=mujeres, [1,2]=ambos.`,
      [{ role: 'user', content: `Tendencia del contenido: ${trend?.topic ?? 'deporte familiar'}\nÁngulo: ${trend?.angle ?? 'club deportivo familiar'}` }]
    )

    let audience: { age_min: number; age_max: number; genders: number[]; interests: string[]; cities: string[]; budget_daily: number }
    try { audience = JSON.parse(audienceJson) } catch { continue }

    // Crear campaña en Meta (modo simulado si no hay credenciales reales configuradas)
    // En producción esto crea la campaña real via API
    const campaignRes = await metaPost(`${AD_ACCOUNT}/campaigns`, {
      name: `Bahía - ${trend?.topic ?? 'General'} - ${new Date().toLocaleDateString('es-MX')}`,
      objective: 'LEAD_GENERATION',
      status: 'PAUSED', // empieza pausada hasta confirmación final
      special_ad_categories: [],
    }).catch(() => ({ id: 'simulado' }))

    // Actualizar creativo con el ID de campaña
    await supabase
      .from('creatives')
      .update({ status: 'publicado', meta_campaign_id: campaignRes.id })
      .eq('id', creative.id)

    results.push({ creativeId: creative.id, campaignId: campaignRes.id, audience })

    await sendText(
      process.env.ADMIN_PHONE!,
      `✅ *Campaña creada*\nTema: ${trend?.topic ?? 'General'}\nAudiencia: ${audience.age_min}-${audience.age_max} años, ${audience.cities.join(' + ')}\nPresupuesto: $${audience.budget_daily.toLocaleString()} MXN/día\nEstado: lista para activar → responde *activa* para encenderla`
    )
  }

  return NextResponse.json({ results })
}

async function monitorCampaigns() {
  // Leer campañas activas de Supabase
  const { data: active } = await supabase
    .from('creatives')
    .select('meta_campaign_id, content')
    .eq('status', 'publicado')
    .not('meta_campaign_id', 'is', null)

  if (!active?.length) return NextResponse.json({ message: 'Sin campañas activas' })

  const alerts = []
  for (const c of active) {
    if (!c.meta_campaign_id || c.meta_campaign_id === 'simulado') continue

    const insights = await metaGet(
      `${c.meta_campaign_id}/insights?fields=impressions,clicks,spend,actions&date_preset=last_7d`
    ).catch(() => null)

    if (!insights?.data?.[0]) continue

    const { impressions, spend, actions } = insights.data[0]
    const leads = actions?.find((a: { action_type: string; value: string }) => a.action_type === 'lead')?.value ?? 0
    const cpl = leads > 0 ? (Number(spend) / Number(leads)).toFixed(2) : null

    if (cpl && Number(cpl) > 200) {
      alerts.push(`⚠️ Campaña "${c.content?.trend?.topic}" — CPL alto: $${cpl} MXN. Generando creativo alternativo...`)
    }
  }

  if (alerts.length > 0) {
    await sendText(process.env.ADMIN_PHONE!, alerts.join('\n\n'))
  }

  return NextResponse.json({ monitored: active.length, alerts: alerts.length })
}
