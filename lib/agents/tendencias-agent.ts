// Harness — Wrapper del agente TENDENCIAS
//
// Dos caminos, ambos terminan en runAgent() del orquestador (prompt activo +
// memoria + AgentApproval PENDING, sin efectos):
//   - EVAL / directo: runTendencias(userMessage, options) pasa el mensaje tal
//     cual (el runner usa esto con skipContext).
//   - PRODUCCIÓN: gatherTendenciasSignals() recolecta las señales de la semana
//     (Perplexity, Google Trends, Meta Ads, música) y compone el userMessage;
//     runTendenciasFromSignals() las junta y delega en runAgent.
//
// ADITIVO: no toca app/api/agents/tendencias/route.ts, que sigue vivo con su
// propia lógica de notificación/persistencia en Supabase.

import { runAgent, type RunAgentOptions, type RunAgentResult } from './orchestrator'

const DEFAULT_TENDENCIAS_MESSAGE =
  'Analiza las señales de tendencias de esta semana para Bahía Social Sports Club y propón un briefing de contenido accionable para la audiencia premium de Riviera Nayarit. Si no hay nada accionable, abstente.'

/**
 * Corre el agente de TENDENCIAS por el harness.
 *
 * @param userMessage Señales/escenario ya compuesto. Si se omite, usa un
 *   mensaje por defecto (útil para disparos manuales y evals deterministas que
 *   pasan su propio input vía el runner).
 */
export async function runTendencias(
  userMessage?: string,
  options?: RunAgentOptions
): Promise<RunAgentResult> {
  return runAgent('TENDENCIAS', userMessage ?? DEFAULT_TENDENCIAS_MESSAGE, options)
}

// ─── Camino de producción: recolección de señales ────────────────────────────

export interface TendenciasSignals {
  /** Tendencias sociales con impacto real esta semana (Perplexity). */
  socialTrends?: string
  /** Estacionalidad del mes en Riviera Nayarit. */
  seasonality?: string
  /** Formatos virales que funcionan ahora. */
  viralPatterns?: string
  /** Hashtags efectivos. */
  hashtags?: string
  /** Competencia local directa. */
  competitive?: string
  /** Música en tendencia (ya filtrada). */
  music?: string
  /** Meta Ads relevantes (lifestyle/wellness + clubes deportivos). */
  metaAds?: string
  /** Google Trends MX (keyword: score/100 (tendencia)). */
  googleTrends?: string
  /** Etiqueta de periodo, ej. "semana del 19 de junio · junio 2026". */
  period?: string
}

/**
 * Compone el userMessage de producción a partir de señales ya recolectadas.
 * Mantiene el mismo orden y encabezados que el route legado para que el modelo
 * reciba el contexto familiar.
 */
export function composeTendenciasMessage(signals: TendenciasSignals): string {
  const blocks: string[] = []
  if (signals.period) blocks.push(`PERIODO: ${signals.period}`)
  if (signals.socialTrends) blocks.push(`TENDENCIAS REALES ESTA SEMANA:\n${signals.socialTrends}`)
  if (signals.seasonality) blocks.push(`ESTACIONALIDAD:\n${signals.seasonality}`)
  if (signals.viralPatterns) blocks.push(`FORMATOS VIRALES QUE FUNCIONAN AHORA:\n${signals.viralPatterns}`)
  if (signals.hashtags) blocks.push(`HASHTAGS EFECTIVOS:\n${signals.hashtags}`)
  if (signals.competitive) blocks.push(`COMPETENCIA LOCAL:\n${signals.competitive}`)
  if (signals.music) blocks.push(`MÚSICA EN TENDENCIA (TikTok/Reels MX):\n${signals.music}`)
  if (signals.metaAds) blocks.push(`META ADS (lifestyle/wellness + clubes deportivos):\n${signals.metaAds}`)
  if (signals.googleTrends) blocks.push(`GOOGLE TRENDS MX:\n${signals.googleTrends}`)
  return blocks.length
    ? blocks.join('\n\n---\n\n')
    : DEFAULT_TENDENCIAS_MESSAGE
}

/**
 * Camino de producción: compone el mensaje desde señales recolectadas y corre
 * el agente por el harness. El consumidor (cron/endpoint) recolecta las señales
 * — esta función no llama APIs externas, para mantenerla testeable y barata.
 */
export async function runTendenciasFromSignals(
  signals: TendenciasSignals,
  options?: RunAgentOptions
): Promise<RunAgentResult> {
  return runTendencias(composeTendenciasMessage(signals), options)
}
