// Wrapper del agente CONTENIDO.
//
// Camino eval/harness: llama runAgent('CONTENIDO', ...) directo (el orquestador
// carga el prompt activo, recall de memoria, crea la AgentApproval PENDING).
// Camino producción: un caller arma un mensaje con la idea/tendencia/estrategia
// y se lo pasa como userMessage; aquí solo lo encaminamos al orquestador.

import { runAgent, type RunAgentOptions, type RunAgentResult } from './orchestrator'

const MENSAJE_POR_DEFECTO =
  'Propón una pieza de contenido (Reel o Carrusel) para esta semana de Bahía Social Sports Club. ' +
  'Elige el ángulo más relevante para el club según el contexto disponible.'

/**
 * Corre el agente de CONTENIDO.
 *
 * @param userMessage Briefing en texto (idea / tendencia / estrategia + assets/eventos).
 *                    Si se omite, usa un disparador genérico de "contenido de la semana".
 * @param options     Opciones del orquestador (model, tags, skipContext para evals, etc.).
 */
export async function runContenido(
  userMessage?: string,
  options?: RunAgentOptions
): Promise<RunAgentResult> {
  return runAgent('CONTENIDO', userMessage ?? MENSAJE_POR_DEFECTO, options)
}
