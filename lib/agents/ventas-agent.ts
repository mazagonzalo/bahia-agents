// Harness — Wrapper del agente VENTAS (Gonzalo)
//
// runVentas() es el punto de entrada del agente de ventas dentro del harness.
// - Camino EVAL: se llama con un userMessage y delega directo a runAgent.
// - Camino PRODUCCIÓN: quien lo invoca arma el contexto del prospecto
//   (historial WhatsApp + datos del lead) y lo pasa como userMessage; el prompt
//   activo (VENTAS_SYSTEM_PROMPT, sembrado vía harness:seed) hace el resto.
//
// NO toca app/api/agents/ventas/route.ts — ese endpoint sigue vivo en paralelo.

import { runAgent, type RunAgentOptions, type RunAgentResult } from './orchestrator'

const DEFAULT_MESSAGE =
  'Analiza la conversación del prospecto y propón la siguiente acción de venta.'

/**
 * Corre el agente de ventas.
 *
 * @param userMessage Conversación/contexto del prospecto. En evals es el input
 *   del fixture; en producción es el historial de WhatsApp + datos del lead.
 * @param options Opciones del orquestador (model, tags, skipContext, etc.).
 */
export async function runVentas(
  userMessage?: string,
  options?: RunAgentOptions
): Promise<RunAgentResult> {
  return runAgent('VENTAS', userMessage ?? DEFAULT_MESSAGE, options)
}
