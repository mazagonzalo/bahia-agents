import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function ask(
  system: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  maxTokens = 1024,
) {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system,
    messages,
  })
  // Toma el primer bloque de texto de forma segura (la respuesta puede traer
  // bloques que no son de texto, p. ej. tool_use); evita romper con un cast ciego.
  const textBlock = res.content.find((b) => b.type === 'text')
  return textBlock && 'text' in textBlock ? textBlock.text : ''
}
