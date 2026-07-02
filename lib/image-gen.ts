// Generación de fondos ABSTRACTOS para pósters de eventos (enfoque híbrido de
// Bahía: NUNCA personas/lugares/edificios IA — solo texturas, luz y atmósfera).
// Se usa como respaldo cuando no hay foto real del deporte.
//
// Gated por OPENAI_API_KEY: si no está, devuelve null (no-op) y el póster usa la
// foto real por defecto. Fail-soft — un error de generación nunca rompe el póster.

type BgOpts = { sport?: string; title?: string; theme?: string }

export async function generateAbstractBackground(opts: BgOpts): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  const sport = (opts.sport || '').trim()
  // Paleta Bahía: navy profundo + luz cálida oro / azul / sage.
  const theme = opts.theme || 'deep navy blue base with soft warm gold and muted blue accent light'
  const prompt = `Abstract premium background for a luxury sports club poster. ${theme}. Soft cinematic gradient lighting, subtle film grain, elegant negative space, gentle out-of-focus bokeh, minimal geometric accents. Sophisticated, editorial, high-end, calm. Absolutely NO people, NO faces, NO text, NO letters, NO logos, NO recognizable places or buildings. Mood inspiration: ${sport || 'premium social sports club'}.`

  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1536', n: 1 }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) {
      console.error('[image-gen] respuesta no OK:', res.status)
      return null
    }
    const data = await res.json()
    const b64 = data?.data?.[0]?.b64_json as string | undefined
    return b64 ? `data:image/png;base64,${b64}` : null
  } catch (e) {
    console.error('[image-gen] falló (se ignora):', e instanceof Error ? e.message : e)
    return null
  }
}
