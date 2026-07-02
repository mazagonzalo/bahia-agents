import Anthropic from '@anthropic-ai/sdk'
import type { AgentType } from '@prisma/client'
import { logAgentRun } from '@/lib/agent-cost'

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MODEL = 'claude-sonnet-4-6'

export async function ask(
  system: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens = 1024,
) {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages,
  })
  // Toma el primer bloque de texto de forma segura (la respuesta puede traer
  // bloques que no son de texto, p. ej. tool_use); evita romper con un cast ciego.
  const textBlock = res.content.find((b) => b.type === 'text')
  return textBlock && 'text' in textBlock ? textBlock.text : ''
}

// Igual que ask(), pero registra la corrida en AgentRunLog (tokens + costo + latencia).
// Úsala en los agentes que NO pasan por el harness (Tendencias, Contenido) para que el
// reporte de costo los incluya. El logging es best-effort y nunca rompe la generación.
export async function askMetered(
  agentType: AgentType,
  system: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens = 1024,
) {
  const started = Date.now()
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages,
  })
  await logAgentRun({
    agentType,
    model: MODEL,
    inputTokens: res.usage?.input_tokens ?? 0,
    outputTokens: res.usage?.output_tokens ?? 0,
    latencyMs: Date.now() - started,
  })
  const textBlock = res.content.find((b) => b.type === 'text')
  return textBlock && 'text' in textBlock ? textBlock.text : ''
}
