// Wrapper del agente EVENTOS (harness Fase 2).
//
// Aditivo: NO sustituye a `app/api/agents/eventos/route.ts` (que sigue vivo).
// Este wrapper conecta el dominio de eventos de Gonzalo al orquestador del
// harness, que se encarga de prompt activo + recall de contexto + Claude +
// parseo JSON + AgentApproval PENDING + AgentRunLog.

import { runAgent, type RunAgentOptions, type RunAgentResult } from './orchestrator'

const DEFAULT_MESSAGE =
  'Revisa los eventos próximos del club y propón el alta o ajuste de cualquier evento accionable que detectes.'

/**
 * Corre el agente EVENTOS a través del harness.
 *
 * @param userMessage Texto libre del admin describiendo un evento del club.
 *                    Si se omite, usa un mensaje por defecto (modo barrido).
 * @param options     Opciones del orquestador (model, tags, skipContext, etc.).
 */
export async function runEventos(
  userMessage?: string,
  options?: RunAgentOptions,
): Promise<RunAgentResult> {
  return runAgent('EVENTOS', userMessage ?? DEFAULT_MESSAGE, options)
}
