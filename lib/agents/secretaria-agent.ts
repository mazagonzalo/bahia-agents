// Harness — Wrapper del agente SECRETARIA
//
// runSecretaria() es el punto de entrada de la secretaria dentro del harness.
// - Camino EVAL: se llama con un userMessage y delega directo a runAgent (el
//   fixture ya trae el "ESTADO ACTUAL" embebido en su input).
// - Camino PRODUCCIÓN: quien lo invoca arma el ESTADO ACTUAL del sistema
//   (resumen de leads, creativos, tendencias y actividad por agente) y lo
//   compone junto a la pregunta del admin como userMessage; el prompt activo
//   (SECRETARIA_SYSTEM_PROMPT, sembrado vía harness:seed) hace el resto.
//
// NO toca app/api/agents/secretaria/route.ts — ese endpoint sigue vivo en
// paralelo (chat directo del admin).

import { runAgent, type RunAgentOptions, type RunAgentResult } from './orchestrator'

const DEFAULT_MESSAGE =
  'Dame un resumen del estado actual del sistema de agentes de Bahía.'

/**
 * Compone el mensaje de producción: pregunta del admin + estado del sistema.
 * En evals no se usa (el fixture trae el estado embebido en su input).
 */
export function composeSecretariaMessage(adminQuestion: string, systemState: string): string {
  return `${adminQuestion.trim()}\n\nESTADO ACTUAL:\n${systemState}`
}

/**
 * Corre el agente SECRETARIA.
 *
 * @param userMessage Pregunta del admin. En evals es el input del fixture (con
 *   el ESTADO ACTUAL ya embebido). En producción usa composeSecretariaMessage()
 *   para juntar la pregunta con el estado del sistema antes de pasarlo aquí.
 * @param options Opciones del orquestador (model, tags, skipContext, etc.).
 */
export async function runSecretaria(
  userMessage?: string,
  options?: RunAgentOptions
): Promise<RunAgentResult> {
  return runAgent('SECRETARIA', userMessage ?? DEFAULT_MESSAGE, options)
}
