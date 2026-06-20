// Harness — Seed de prompts (npm run harness:seed)
//
// Importa los 9 system prompts de lib/agents/prompts/<slug>-system-prompt.ts y
// hace upsert idempotente de la v1 activa por agente en AgentPromptVersion.
// Re-correrlo es seguro: actualiza el texto y deja la v1 activa.
//
// NOTA: los módulos de prompt los entrega la SIGUIENTE fase (los 9 agentes).
// Hasta entonces estos imports no resuelven — es esperado.

import { upsertActiveV1 } from '@/lib/agents/prompt-registry'
import type { AgentType } from '@/lib/types/agent'

import { TENDENCIAS_SYSTEM_PROMPT } from '@/lib/agents/prompts/tendencias-system-prompt'
import { CONTENIDO_SYSTEM_PROMPT } from '@/lib/agents/prompts/contenido-system-prompt'
import { EVENTOS_SYSTEM_PROMPT } from '@/lib/agents/prompts/eventos-system-prompt'
import { META_ADS_SYSTEM_PROMPT } from '@/lib/agents/prompts/meta-ads-system-prompt'
import { VENTAS_SYSTEM_PROMPT } from '@/lib/agents/prompts/ventas-system-prompt'
import { SEGUIMIENTO_SYSTEM_PROMPT } from '@/lib/agents/prompts/seguimiento-system-prompt'
import { CRITICO_SYSTEM_PROMPT } from '@/lib/agents/prompts/critico-system-prompt'
import { REPUTACION_SYSTEM_PROMPT } from '@/lib/agents/prompts/reputacion-system-prompt'
import { SECRETARIA_SYSTEM_PROMPT } from '@/lib/agents/prompts/secretaria-system-prompt'

const PROMPTS: Array<{ agentType: AgentType; prompt: string }> = [
  { agentType: 'TENDENCIAS', prompt: TENDENCIAS_SYSTEM_PROMPT },
  { agentType: 'CONTENIDO', prompt: CONTENIDO_SYSTEM_PROMPT },
  { agentType: 'EVENTOS', prompt: EVENTOS_SYSTEM_PROMPT },
  { agentType: 'META_ADS', prompt: META_ADS_SYSTEM_PROMPT },
  { agentType: 'VENTAS', prompt: VENTAS_SYSTEM_PROMPT },
  { agentType: 'SEGUIMIENTO', prompt: SEGUIMIENTO_SYSTEM_PROMPT },
  { agentType: 'CRITICO', prompt: CRITICO_SYSTEM_PROMPT },
  { agentType: 'REPUTACION', prompt: REPUTACION_SYSTEM_PROMPT },
  { agentType: 'SECRETARIA', prompt: SECRETARIA_SYSTEM_PROMPT },
]

async function main(): Promise<void> {
  console.log(`▶ Sembrando ${PROMPTS.length} prompts v1 (idempotente)…\n`)
  for (const { agentType, prompt } of PROMPTS) {
    const rec = await upsertActiveV1(agentType, prompt)
    console.log(`  ✓ ${agentType.padEnd(14)} v${rec.version} activo (${rec.systemPrompt.length} chars)`)
  }
  console.log(`\n── Seed completo: ${PROMPTS.length} agentes con v1 activa ──\n`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('El seed reventó:', err)
    process.exit(1)
  })
