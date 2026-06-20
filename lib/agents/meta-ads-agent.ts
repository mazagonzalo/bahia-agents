// Harness — Wrapper del agente META_ADS.
//
// Dos caminos:
//   - eval / directo: runMetaAds(mensaje) → runAgent('META_ADS', mensaje).
//   - producción: runMetaAdsForCreative(creativeId) junta la tendencia del
//     creativo desde Supabase, compone el mensaje y delega en runAgent.
// En ambos casos el agente solo PROPONE (AgentApproval PENDING). La ejecución
// real (crear campaña en Meta) sigue viviendo en /api/agents/meta-ads/route.ts.

import { runAgent, type RunAgentOptions, type RunAgentResult } from './orchestrator'

const DEFAULT_MESSAGE =
  'Diseña una campaña de Meta Ads para Bahía Social Sports Club orientada a generación de leads, con audiencia y presupuesto óptimos para el mercado de Bahía de Banderas.'

/**
 * Camino canónico (incl. evals): corre el agente META_ADS con el mensaje dado.
 */
export async function runMetaAds(
  userMessage?: string,
  options?: RunAgentOptions
): Promise<RunAgentResult> {
  return runAgent('META_ADS', userMessage ?? DEFAULT_MESSAGE, options)
}

/**
 * Camino de producción: arma el mensaje a partir de la tendencia de un creativo
 * y corre el agente. Lazy-import de supabase para no acoplar el harness/evals
 * al cliente de Supabase.
 */
export async function runMetaAdsForCreative(
  creativeId: string,
  options?: RunAgentOptions
): Promise<RunAgentResult> {
  const { supabase } = await import('@/lib/supabase')
  const { data: creative } = await supabase
    .from('creatives')
    .select('content')
    .eq('id', creativeId)
    .single()

  const trend = (creative?.content as { trend?: { topic?: string; angle?: string } } | null)?.trend
  const topic = trend?.topic ?? 'deporte familiar'
  const angle = trend?.angle ?? 'club deportivo familiar'

  const message = `Tendencia del contenido: ${topic}\nÁngulo: ${angle}\nDefine la audiencia óptima de Meta Ads y el presupuesto diario para una campaña de generación de leads de Bahía Social Sports Club en Nuevo Vallarta.`

  return runMetaAds(message, options)
}
