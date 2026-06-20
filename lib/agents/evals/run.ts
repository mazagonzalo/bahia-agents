// Harness — Entrypoint del eval (npm run eval:agents)
//
// Corre las fixtures de TODOS los agentes de dominio (o uno solo si se pasa por
// arg), loguea un resumen por agente y un total, y sale con código != 0 si algún
// fixture falló los checks deterministas (para que CI lo marque rojo).
//
// Uso:
//   npm run eval:agents            # todos los agentes
//   npm run eval:agents TENDENCIAS # un agente

import { runEvals } from './runner'
import { DOMAIN_AGENT_TYPES, type DomainAgentType } from '@/lib/types/agent'

function parseTarget(): 'ALL' | DomainAgentType {
  const arg = process.argv[2]?.toUpperCase()
  if (!arg) return 'ALL'
  if ((DOMAIN_AGENT_TYPES as readonly string[]).includes(arg)) return arg as DomainAgentType
  console.error(`Agente desconocido: ${arg}. Válidos: ${DOMAIN_AGENT_TYPES.join(', ')}`)
  process.exit(2)
}

async function main(): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Falta ANTHROPIC_API_KEY — el eval necesita llamar a Claude.')
    process.exit(2)
  }

  const target = parseTarget()
  console.log(`\n▶ Corriendo evals para: ${target}\n`)

  const summaries = await runEvals(target)

  let totalFixtures = 0
  let totalPass = 0
  let totalCost = 0
  let anyFailure = false

  for (const s of summaries) {
    totalFixtures += s.fixturesTotal
    totalPass += s.fixturesDeterministicPass
    totalCost += s.totalCostUsd
    if (s.fixturesDeterministicPass < s.fixturesTotal) anyFailure = true

    const score = s.averageJudgeScore !== null ? s.averageJudgeScore.toFixed(2) : 'n/a'
    const flag = s.fixturesDeterministicPass === s.fixturesTotal ? '✓' : '✗'
    console.log(
      `  ${flag} ${s.agentType.padEnd(14)} ${s.fixturesDeterministicPass}/${s.fixturesTotal} det · juez ${score}/5 · $${s.totalCostUsd.toFixed(4)}`
    )
    for (const r of s.results) {
      if (!r.passedDeterministic) {
        console.log(`      - ${r.fixtureId}: ${r.deterministicFailures.join('; ')}${r.errorMsg ? ` (${r.errorMsg})` : ''}`)
      }
    }
  }

  console.log(
    `\n── Resumen: ${totalPass}/${totalFixtures} fixtures deterministas pasaron · costo total $${totalCost.toFixed(4)} ──`
  )
  console.log(`Resultados completos en .eval-results/latest.json\n`)

  process.exit(anyFailure ? 1 : 0)
}

main().catch((err) => {
  console.error('El eval reventó:', err)
  process.exit(1)
})
