const BASE = 'https://api.muapi.ai/api/v1'

function headers() {
  return {
    'x-api-key': process.env.MUAPI_API_KEY ?? '',
    'Content-Type': 'application/json',
  }
}

// ─── Imagen ───────────────────────────────────────────────────────────────────

export async function generateImage(
  prompt: string,
  aspectRatio: '1:1' | '4:5' | '9:16' = '1:1',
): Promise<string | null> {
  if (!process.env.MUAPI_API_KEY) return null
  try {
    const res = await fetch(`${BASE}/nano-banana-2`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ prompt, num_images: 1, aspect_ratio: aspectRatio }),
    })
    const json = await res.json() as { outputs?: { url: string }[] }
    return json.outputs?.[0]?.url ?? null
  } catch {
    return null
  }
}

// ─── Video (texto → video) ────────────────────────────────────────────────────

export async function generateVideo(
  prompt: string,
  opts: { aspectRatio?: '9:16' | '16:9' | '1:1'; duration?: number; imageUrl?: string } = {},
): Promise<string | null> {
  if (!process.env.MUAPI_API_KEY) return null
  const { aspectRatio = '9:16', duration = 10, imageUrl } = opts
  const endpoint = imageUrl ? 'seedance-2-image-to-video' : 'seedance-2-text-to-video'
  try {
    const body: Record<string, unknown> = { prompt, duration, aspect_ratio: aspectRatio }
    if (imageUrl) body.image_url = imageUrl
    const res = await fetch(`${BASE}/${endpoint}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    })
    const json = await res.json() as { outputs?: { url: string }[] }
    return json.outputs?.[0]?.url ?? null
  } catch {
    return null
  }
}

// ─── Clipping (video largo → clips virales) ───────────────────────────────────

export type VideoClip = {
  title: string
  start_time: number
  end_time: number
  score: number
  hook_sentence: string
  virality_reason: string
  clip_url: string
}

export async function clipVideo(
  videoUrl: string,
  numClips = 3,
  aspectRatio: '9:16' | '1:1' | '4:5' = '9:16',
): Promise<VideoClip[]> {
  if (!process.env.MUAPI_API_KEY) return []
  try {
    const res = await fetch(`${BASE}/ai-clipping`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ video_url: videoUrl, num_clips: numClips, aspect_ratio: aspectRatio }),
    })
    const json = await res.json() as { shorts?: VideoClip[] }
    return json.shorts ?? []
  } catch {
    return []
  }
}
