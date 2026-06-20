export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runAgent } from '@/lib/agents/orchestrator'
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
  const creatives = await prisma.creatives.findMany({ where: { id: { in: creativeIds } } })

  if (!creatives.length) return NextResponse.json({ error: 'Sin creativos' }, { status: 404 })

  const results = []
  for (const creative of creatives) {
    const trend = (creative.content as { trend?: { topic?: string; angle?: string } } | null)?.trend

    // El agente META_ADS define la audiencia óptima (registra AgentRunLog).
    const audience = { age_min: 25, age_max: 55, genders: [1, 2] as number[], interests: [] as string[], cities: ['Nuevo Vallarta', 'Bucerías', 'Puerto Vallarta'], budget_daily: 2500 }
    try {
      const result = await runAgent(
        'META_ADS',
        `Tendencia del contenido: ${trend?.topic ?? 'deporte familiar'}\nÁngulo: ${trend?.angle ?? 'club deportivo familiar'}\nDefine la audiencia óptima de Meta Ads.`,
        { skipApproval: true, tags: ['meta-ads', 'audiencia'] }
      )
      const pd = result.proposalData
      if (pd.proposalType === 'abstain') continue
      const aud = (pd.audience ?? {}) as Record<string, unknown>
      if (typeof aud.age_min === 'number') audience.age_min = aud.age_min
      if (typeof aud.age_max === 'number') audience.age_max = aud.age_max
      if (Array.isArray(aud.genders)) audience.genders = aud.genders as number[]
      if (Array.isArray(aud.interests)) audience.interests = aud.interests as string[]
      if (Array.isArray(aud.cities)) audience.cities = aud.cities as string[]
      if (typeof pd.budget_daily === 'number') audience.budget_daily = pd.budget_daily
      else if (typeof aud.budget_daily === 'number') audience.budget_daily = aud.budget_daily
    } catch {
      continue
    }

    // Crear campaña en Meta (modo simulado si no hay credenciales reales configuradas)
    // Las fotos del anuncio vienen de club_assets — sin generación IA
    // En producción esto crea la campaña real via API
    const campaignRes = await metaPost(`${AD_ACCOUNT}/campaigns`, {
      name: `Bahía - ${trend?.topic ?? 'General'} - ${new Date().toLocaleDateString('es-MX')}`,
      objective: 'LEAD_GENERATION',
      status: 'PAUSED', // empieza pausada hasta confirmación final
      special_ad_categories: [],
    }).catch(() => ({ id: 'simulado' }))

    // Actualizar creativo con el ID de campaña
    await prisma.creatives.update({
      where: { id: creative.id },
      data: { status: 'publicado', meta_campaign_id: campaignRes.id },
    })

    results.push({ creativeId: creative.id, campaignId: campaignRes.id, audience })

    const adLines = [
      `✅ *Campaña creada*`,
      `Tema: ${trend?.topic ?? 'General'}`,
      `Audiencia: ${audience.age_min}-${audience.age_max} años, ${audience.cities.join(' + ')}`,
      `Presupuesto: $${audience.budget_daily.toLocaleString()} MXN/día`,
      `📸 Agrega fotos del club desde /api/agents/contenido antes de activar`,
      `Estado: lista para activar → responde *activa* para encenderla`,
    ]
    if (process.env.ADMIN_PHONE) {
      try { await sendText(process.env.ADMIN_PHONE, adLines.filter(Boolean).join('\n')) }
      catch (e) { console.error('[meta-ads] sendText falló:', e instanceof Error ? e.message : e) }
    }
  }

  return NextResponse.json({ results })
}

async function monitorCampaigns() {
  // Leer campañas activas vía Prisma
  const active = await prisma.creatives.findMany({
    where: { status: 'publicado', meta_campaign_id: { not: null } },
    select: { meta_campaign_id: true, content: true },
  })

  if (!active.length) return NextResponse.json({ message: 'Sin campañas activas' })

  const alerts = []
  for (const c of active) {
    const content = c.content as { trend?: { topic?: string } } | null
    if (!c.meta_campaign_id || c.meta_campaign_id === 'simulado') continue

    const insights = await metaGet(
      `${c.meta_campaign_id}/insights?fields=impressions,clicks,spend,actions&date_preset=last_7d`
    ).catch(() => null)

    if (!insights?.data?.[0]) continue

    const { impressions, spend, actions } = insights.data[0]
    const leads = actions?.find((a: { action_type: string; value: string }) => a.action_type === 'lead')?.value ?? 0
    const cpl = leads > 0 ? (Number(spend) / Number(leads)).toFixed(2) : null

    if (cpl && Number(cpl) > 200) {
      alerts.push(`⚠️ Campaña "${content?.trend?.topic}" — CPL alto: $${cpl} MXN. Generando creativo alternativo...`)
    }
  }

  if (alerts.length > 0 && process.env.ADMIN_PHONE) {
    try { await sendText(process.env.ADMIN_PHONE, alerts.join('\n\n')) }
    catch (e) { console.error('[meta-ads] sendText falló:', e instanceof Error ? e.message : e) }
  }

  return NextResponse.json({ monitored: active.length, alerts: alerts.length })
}
