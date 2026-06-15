import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function ask(system: string, messages: { role: 'user' | 'assistant'; content: string }[]) {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system,
    messages,
  })
  return (res.content[0] as { type: string; text: string }).text
}
