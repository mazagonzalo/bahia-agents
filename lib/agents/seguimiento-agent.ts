// Wrapper del agente SEGUIMIENTO (Gonzalo) sobre el orquestador del harness.
//
// Dos caminos:
//  - eval/simple: pasa un userMessage y delega directo en runAgent('SEGUIMIENTO').
//  - producción: junta los datos del prospecto (etapa, historial, antigüedad,
//    tendencia local) y compone el userMessage antes de proponer.
//
// NO toca app/api/agents/seguimiento/route.ts (sigue vivo); este wrapper es la
// vía del harness para que Gonzalo genere propuestas PENDING (sin enviar nada).

import { runAgent, type RunAgentOptions, type RunAgentResult } from './orchestrator'

const DEFAULT_MESSAGE =
  'Revisa el pipeline de prospectos y propón el siguiente toque de seguimiento más oportuno.'

/** Datos de un prospecto para componer el prompt en el camino de producción. */
export interface SeguimientoLeadInput {
  name?: string | null
  stage?: string | null
  hoursSinceLastContact?: number | null
  history?: string | null
  topTrend?: string | null
}

/** Compone el userMessage de producción a partir de los datos del prospecto. */
export function composeSeguimientoMessage(lead: SeguimientoLeadInput): string {
  const nombre = lead.name ?? 'el prospecto'
  const etapa = lead.stage ?? 'desconocida'
  const horas =
    lead.hoursSinceLastContact != null
      ? `${Math.round(lead.hoursSinceLastContact)}h desde el último contacto`
      : 'antigüedad del último contacto desconocida'
  const historial = lead.history?.trim() || 'Sin historial previo.'
  const trend = lead.topTrend ? `\nTendencia local: ${lead.topTrend}` : ''
  return [
    `Prospecto: ${nombre}`,
    `Etapa: ${etapa}`,
    `Contacto: ${horas}`,
    `Historial:\n${historial}${trend}`,
    'Propón el siguiente toque de seguimiento (o abstain si no corresponde).',
  ].join('\n')
}

/**
 * Corre el agente SEGUIMIENTO.
 * - Sin argumentos / string → camino eval/simple.
 * - Con un objeto de lead → compone el prompt de producción.
 */
export async function runSeguimiento(
  input?: string | SeguimientoLeadInput,
  options?: RunAgentOptions
): Promise<RunAgentResult> {
  const userMessage =
    typeof input === 'string'
      ? input
      : input
        ? composeSeguimientoMessage(input)
        : DEFAULT_MESSAGE
  return runAgent('SEGUIMIENTO', userMessage, options)
}
