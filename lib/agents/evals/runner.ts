// Harness — Runner de evals
//
// Descubre fixtures del/los agente(s) pedidos, corre cada uno por el prompt
// activo del agente vía runAgent({ skipContext:true }), aplica checks
// deterministas (requiredFields), luego pide a judge() scores por dimensión de
// rúbrica. Escribe un JSON de resultados en .eval-results/ e imprime un resumen.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { DomainAgentType } from '@/lib/types/agent'
import { DOMAIN_AGENT_TYPES, AGENT_SLUGS } from '@/lib/types/agent'
import { runAgent } from '../orchestrator'
import { judge, type RubricDimension } from './judge'

export interface Fixture {
  id: string
  input: string
  requiredFields: string[]
  rubric: RubricDimension[]
  /** Tags opcionales pasados a runAgent para acotar recuperación de contexto. */
  tags?: string[]
  /** Si true, el fixture espera que el agente se abstenga (proposalType="abstain"). */
  expectAbstain?: boolean
}

export interface FixtureResult {
  fixtureId: string
  agentType: DomainAgentType
  passedDeterministic: boolean
  deterministicFailures: string[]
  judgeScore: number | null
  judgeDimensions: Array<{ dimension: string; score: number; reason: string }>
  latencyMs: number
  inputTokens: number
  outputTokens: number
  costUsd: number
  errorMsg?: string
}

export interface AgentEvalSummary {
  agentType: DomainAgentType
  fixturesTotal: number
  fixturesDeterministicPass: number
  averageJudgeScore: number | null
  totalCostUsd: number
  results: FixtureResult[]
}

const EVALS_DIR = path.join(process.cwd(), 'lib', 'agents', 'evals')
const RESULTS_DIR = path.join(process.cwd(), '.eval-results')

async function loadFixtures(agentType: DomainAgentType): Promise<Fixture[]> {
  const dir = path.join(EVALS_DIR, 'fixtures', AGENT_SLUGS[agentType])
  let files: string[]
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json')).sort()
  } catch {
    return []
  }
  const fixtures: Fixture[] = []
  for (const f of files) {
    const body = await fs.readFile(path.join(dir, f), 'utf8')
    const parsed = JSON.parse(body) as Omit<Fixture, 'id'>
    fixtures.push({ id: f.replace(/\.json$/, ''), ...parsed })
  }
  return fixtures
}

function checkRequiredFields(
  proposalData: Record<string, unknown>,
  requiredFields: string[]
): string[] {
  const failures: string[] = []
  for (const field of requiredFields) {
    const parts = field.split('.')
    let cur: unknown = proposalData
    for (const p of parts) {
      if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[p]
      } else {
        cur = undefined
        break
      }
    }
    if (cur === undefined || cur === null || cur === '') {
      failures.push(`falta campo requerido: ${field}`)
    }
  }
  return failures
}

export async function runEvalForAgent(agentType: DomainAgentType): Promise<AgentEvalSummary> {
  const fixtures = await loadFixtures(agentType)
  const results: FixtureResult[] = []

  for (const fx of fixtures) {
    try {
      const runResult = await runAgent(agentType, fx.input, {
        tags: fx.tags,
        skipContext: true, // runs deterministas — ignora memoria
      })
      const failures = checkRequiredFields(runResult.proposalData, fx.requiredFields)

      // Si el fixture esperaba abstain, la ausencia de approvalId es éxito.
      if (fx.expectAbstain) {
        const abstained = runResult.approvalId === ''
        if (!abstained) failures.push('se esperaba abstain pero se creó una propuesta')
      }

      // Juez solo si pasaron los checks deterministas (no quemar tokens en roto).
      let judgeResult: Awaited<ReturnType<typeof judge>> | null = null
      if (failures.length === 0 && !fx.expectAbstain) {
        judgeResult = await judge({
          agentType,
          fixtureInput: fx.input,
          agentOutput: JSON.stringify(runResult.proposalData),
          rubric: fx.rubric,
        })
      }

      results.push({
        fixtureId: fx.id,
        agentType,
        passedDeterministic: failures.length === 0,
        deterministicFailures: failures,
        judgeScore: judgeResult?.overall ?? null,
        judgeDimensions: judgeResult?.scores ?? [],
        latencyMs: runResult.latencyMs,
        inputTokens: runResult.inputTokens,
        outputTokens: runResult.outputTokens,
        costUsd: runResult.costUsd,
      })
    } catch (err) {
      const errName = err instanceof Error ? err.name : typeof err
      const errMessage = err instanceof Error ? err.message : ''
      const errStack = err instanceof Error && err.stack ? err.stack : ''
      const errString = String(err)
      const composed =
        [
          errName && `name=${errName}`,
          errMessage && `message=${errMessage}`,
          !errMessage && errString && errString !== '[object Object]' && `raw=${errString}`,
          errStack && `stack=${errStack.split('\n').slice(0, 4).join(' | ')}`,
        ]
          .filter(Boolean)
          .join(' :: ') || 'sin info de diagnóstico capturada'

      console.error(`[eval] ${agentType} :: ${fx.id} lanzó — ${composed}`)

      results.push({
        fixtureId: fx.id,
        agentType,
        passedDeterministic: false,
        deterministicFailures: ['runAgent lanzó'],
        judgeScore: null,
        judgeDimensions: [],
        latencyMs: 0,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        errorMsg: composed,
      })
    }
  }

  const deterministicPass = results.filter((r) => r.passedDeterministic).length
  const judged = results.filter((r) => r.judgeScore !== null)
  const averageJudgeScore = judged.length
    ? judged.reduce((a, r) => a + (r.judgeScore ?? 0), 0) / judged.length
    : null
  const totalCostUsd = results.reduce((a, r) => a + r.costUsd, 0)

  return {
    agentType,
    fixturesTotal: results.length,
    fixturesDeterministicPass: deterministicPass,
    averageJudgeScore,
    totalCostUsd,
    results,
  }
}

export async function runEvals(target: 'ALL' | DomainAgentType = 'ALL'): Promise<AgentEvalSummary[]> {
  const targets: DomainAgentType[] = target === 'ALL' ? [...DOMAIN_AGENT_TYPES] : [target]
  const summaries: AgentEvalSummary[] = []
  for (const t of targets) {
    const s = await runEvalForAgent(t)
    summaries.push(s)
  }

  await fs.mkdir(RESULTS_DIR, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const out = { runAt: new Date().toISOString(), target, summaries }
  await fs.writeFile(path.join(RESULTS_DIR, `${stamp}.json`), JSON.stringify(out, null, 2), 'utf8')
  await fs.writeFile(path.join(RESULTS_DIR, `latest.json`), JSON.stringify(out, null, 2), 'utf8')

  return summaries
}
