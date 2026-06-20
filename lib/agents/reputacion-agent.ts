// Wrapper del agente REPUTACION (Gonzalo) sobre el orquestador del harness.
//
// Dos caminos:
//  - eval/simple: pasa un userMessage y delega directo en runAgent('REPUTACION').
//  - producción: junta los datos de una reseña de Google Maps (reseñador,
//    estrellas, comentario) y compone el userMessage antes de proponer.
//
// NO toca app/api/agents/reputacion/route.ts (sigue vivo); este wrapper es la
// vía del harness para que Gonzalo genere propuestas PENDING (sin publicar nada).

import { runAgent, type RunAgentOptions, type RunAgentResult } from './orchestrator'

const DEFAULT_MESSAGE =
  'Analiza la última reseña de Google Maps y propón una respuesta pública (o abstain si no corresponde).'

/** Datos de una reseña de Google Maps para componer el prompt de producción. */
export interface ReputacionReviewInput {
  reviewer?: string | null
  stars?: number | null
  comment?: string | null
  /** Si la reseña ya tiene respuesta publicada, normalmente corresponde abstain. */
  hasReply?: boolean | null
}

/** Compone el userMessage de producción a partir de los datos de la reseña. */
export function composeReputacionMessage(review: ReputacionReviewInput): string {
  const reviewer = review.reviewer?.trim() || 'Anónimo'
  const stars = review.stars != null ? `${review.stars}/5` : 'sin calificación'
  const comment = review.comment?.trim() || '(sin comentario)'
  const reply = review.hasReply
    ? '\nEstado: la reseña YA tiene respuesta publicada.'
    : ''
  return [
    `Reseñador: ${reviewer}`,
    `Estrellas: ${stars}`,
    `Comentario: "${comment}"${reply}`,
    'Analiza la reseña y propón una respuesta pública (o abstain si no corresponde).',
  ].join('\n')
}

/**
 * Corre el agente REPUTACION.
 * - Sin argumentos / string → camino eval/simple.
 * - Con un objeto de reseña → compone el prompt de producción.
 */
export async function runReputacion(
  input?: string | ReputacionReviewInput,
  options?: RunAgentOptions
): Promise<RunAgentResult> {
  const userMessage =
    typeof input === 'string'
      ? input
      : input
        ? composeReputacionMessage(input)
        : DEFAULT_MESSAGE
  return runAgent('REPUTACION', userMessage, options)
}
