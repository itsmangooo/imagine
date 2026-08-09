/**
 * AI Generate — one selfie + a prompt → a portrait.
 *
 * Billed to the requesting user's own Replicate account via their own key,
 * which arrives in a header, is used for the single call, and is never stored
 * or logged. The reference image is held only for the duration of the request.
 *
 * Rate limiting here is about protecting THIS server from being scripted
 * against, not about protecting an API budget — each user spends their own
 * money through their own key.
 */

interface GenerateBody {
  image?: string
  prompt?: string
  negativePrompt?: string
  width?: number
  height?: number
}

/** Per-IP window. In-memory on purpose: Redis lands with the backend stage. */
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 6
const hits = new Map<string, number[]>()

function rateLimited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter(t => now - t < WINDOW_MS)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > MAX_PER_WINDOW
}

export default defineEventHandler(async (event) => {
  // X-Forwarded-For is only trustworthy behind a proxy we control; without that
  // flag anyone could bypass the limit by varying the header.
  const ip
    = (process.env.NUXT_TRUST_PROXY ? getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() : null)
      ?? event.node.req.socket.remoteAddress
      ?? 'unknown'

  if (rateLimited(ip)) {
    setResponseStatus(event, 429)
    setResponseHeader(event, 'Retry-After', 60)
    return { ok: false, reason: 'Too many requests. Wait a minute and try again.' }
  }

  const key = readKey(event)
  if (!key) {
    setResponseStatus(event, 401)
    return { ok: false, reason: 'No Replicate API key. Add one in Settings.' }
  }

  const body = await readBody<GenerateBody>(event)
  if (!body?.image || !body.image.startsWith('data:image/')) {
    setResponseStatus(event, 400)
    return { ok: false, reason: 'A reference photo is required.' }
  }
  if (!body.prompt?.trim()) {
    setResponseStatus(event, 400)
    return { ok: false, reason: 'A prompt is required.' }
  }

  try {
    const replicate = client(key)
    const output = await replicate.run(IDENTITY_MODEL as `${string}/${string}`, {
      input: {
        // A data URI means no publicly reachable bucket is needed.
        main_face_image: body.image,
        prompt: body.prompt.trim(),
        negative_prompt: body.negativePrompt ?? 'blurry, lowres, distorted, watermark, text',
        width: body.width ?? 896,
        height: body.height ?? 1152,
        num_outputs: 1,
      },
    })

    const url = Array.isArray(output) ? String(output[0]) : String(output)
    return { ok: true, url }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Generation failed.'
    // Never echo the key, even inside an error string.
    setResponseStatus(event, 502)
    return { ok: false, reason: message.replace(/r8_[A-Za-z0-9]+/g, 'r8_***') }
  }
})
