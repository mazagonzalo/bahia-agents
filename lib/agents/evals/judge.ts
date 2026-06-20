// Harness — Claude como juez
//
// Dada la salida de un agente + una rúbrica, devuelve un score (1-5) por
// dimensión. La evaluación determinista de rúbrica ocurre primero en runner.ts;
// este módulo maneja el score subjetivo de calidad que requiere otra llamada
// LLM.

import { getClaudeClient, DEFAULT_MODEL } from '../orchestrator'

export interface RubricDimension {
  name: string
  description: string
}

export interface JudgeInput {
  agentType: string
  fixtureInput: string
  agentOutput: string
  rubric: RubricDimension[]
}

export interface JudgeScore {
  dimension: string
  score: number // 1-5
  reason: string
}

export interface JudgeResult {
  overall: number // media de todas las dimensiones
  scores: JudgeScore[]
  rawResponse: string
}

const JUDGE_SYSTEM_PROMPT = `Eres un juez de evaluación imparcial para los agentes runtime de Bahía Agents.

Recibirás:
1. El tipo de agente y su contexto de sistema.
2. El fixture de entrada que se envió al agente.
3. La salida del agente (un string JSON).
4. Una rúbrica con dimensiones nombradas.

Por cada dimensión de la rúbrica, devuelve un score de 1 (falla) a 5 (excelente)
y una frase de razonamiento. Sé estricto pero justo. No agregues dimensiones nuevas.

Responde ÚNICAMENTE con un objeto JSON con esta forma exacta:
{
  "scores": [
    { "dimension": "<nombre>", "score": <1-5>, "reason": "<una frase>" }
  ]
}`

export async function judge(input: JudgeInput, model = DEFAULT_MODEL): Promise<JudgeResult> {
  const client = getClaudeClient()
  const rubricBlock = input.rubric.map((d) => `- **${d.name}**: ${d.description}`).join('\n')

  const userMessage = [
    `Tipo de agente: ${input.agentType}`,
    ``,
    `Fixture de entrada:`,
    input.fixtureInput,
    ``,
    `Salida del agente:`,
    input.agentOutput,
    ``,
    `Dimensiones de la rúbrica:`,
    rubricBlock,
    ``,
    `Devuelve el objeto JSON ahora.`,
  ].join('\n')

  const resp = await client.messages.create({
    model,
    max_tokens: 1024,
    system: JUDGE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })
  const block = resp.content[0]
  if (block.type !== 'text') throw new Error('El juez devolvió un bloque no-texto')
  const raw = block.text.trim()

  let parsed: { scores: JudgeScore[] }
  try {
    parsed = JSON.parse(raw) as { scores: JudgeScore[] }
  } catch {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error(`El juez devolvió una respuesta inparseables: ${raw.slice(0, 200)}`)
    parsed = JSON.parse(match[0]) as { scores: JudgeScore[] }
  }

  const overall = parsed.scores.reduce((a, s) => a + s.score, 0) / Math.max(1, parsed.scores.length)
  return { overall, scores: parsed.scores, rawResponse: raw }
}
