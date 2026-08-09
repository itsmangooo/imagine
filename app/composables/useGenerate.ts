/**
 * AI Generate — one selfie + a style → a portrait, billed to the user's own
 * Replicate account. No credits, no purchase: see `useApiKey`.
 *
 * The reference photo is held only long enough to build the request and is
 * released immediately afterwards, success or failure.
 */

export interface StylePreset {
  id: string
  label: string
  prompt: string
}

export const STYLE_PRESETS: StylePreset[] = [
  { id: 'corporate', label: 'Corporate', prompt: 'professional corporate headshot, neutral studio backdrop, soft key light, sharp focus, business attire' },
  { id: 'linkedin', label: 'LinkedIn', prompt: 'friendly professional portrait, natural office background, warm soft lighting, approachable expression' },
  { id: 'editorial', label: 'Editorial', prompt: 'editorial magazine portrait, dramatic rim lighting, shallow depth of field, high detail' },
  { id: 'outdoor', label: 'Outdoor', prompt: 'outdoor portrait at golden hour, natural sunlight, bokeh foliage background' },
  { id: 'cinematic', label: 'Cinematic', prompt: 'cinematic portrait, teal and orange grade, moody lighting, film grain, anamorphic' },
  { id: 'bw', label: 'Black & white', prompt: 'black and white studio portrait, high contrast, classic monochrome film look' },
]

export const GENERATE_FORMATS = [
  { id: 'portrait', label: 'Portrait', width: 896, height: 1152 },
  { id: 'square', label: 'Square', width: 1024, height: 1024 },
  { id: 'story', label: 'Story', width: 832, height: 1216 },
  { id: 'landscape', label: 'Landscape', width: 1216, height: 832 },
]

export function useGenerate() {
  const { addImage } = useDocuments()
  const { hasKey, authHeaders } = useApiKey()

  const reference = useState<{ src: string; name: string } | null>('gen:reference', () => null)
  const styleId = useState<string>('gen:style', () => 'corporate')
  const formatId = useState<string>('gen:format', () => 'portrait')
  const extraPrompt = useState<string>('gen:extra', () => '')
  const busy = useState<boolean>('gen:busy', () => false)
  const error = useState<string | null>('gen:error', () => null)
  const lastUrl = useState<string | null>('gen:last', () => null)

  const style = computed(() => STYLE_PRESETS.find(s => s.id === styleId.value) ?? STYLE_PRESETS[0]!)
  const format = computed(() => GENERATE_FORMATS.find(f => f.id === formatId.value) ?? GENERATE_FORMATS[0]!)
  const canGenerate = computed(() => hasKey.value && reference.value !== null && !busy.value)

  function setReference(file: File | null | undefined) {
    if (!file?.type.startsWith('image/')) return
    if (reference.value) URL.revokeObjectURL(reference.value.src)
    reference.value = { src: URL.createObjectURL(file), name: file.name }
    error.value = null
  }

  function clearReference() {
    if (reference.value) URL.revokeObjectURL(reference.value.src)
    reference.value = null
  }

  /** Downscale before upload — a 20 MP selfie helps identity not at all. */
  async function referenceDataUri(): Promise<string | null> {
    if (!reference.value) return null
    const img = await loadImage(reference.value.src)
    const maxEdge = 1024
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.9)
  }

  async function generate(): Promise<boolean> {
    if (!canGenerate.value) return false
    busy.value = true
    error.value = null

    try {
      const dataUri = await referenceDataUri()
      if (!dataUri) throw new Error('Could not read the reference photo.')

      const prompt = [style.value.prompt, extraPrompt.value.trim()].filter(Boolean).join(', ')

      const result = await $fetch<{ ok: boolean; url?: string; reason?: string }>('/api/ai/generate', {
        method: 'POST',
        headers: authHeaders(),
        body: { image: dataUri, prompt, width: format.value.width, height: format.value.height },
      })

      if (!result.ok || !result.url) {
        error.value = result.reason ?? 'Generation failed.'
        return false
      }

      // Bring the result into the workspace as its own document.
      const blob = await (await fetch(result.url)).blob()
      const file = new File([blob], `generated-${Date.now()}.png`, { type: blob.type || 'image/png' })
      await addImage(file)
      lastUrl.value = result.url
      return true
    } catch (cause) {
      const detail = cause as { data?: { reason?: string }; message?: string }
      error.value = detail?.data?.reason ?? detail?.message ?? 'Generation failed.'
      return false
    } finally {
      // The selfie is never kept around beyond the request it was needed for.
      clearReference()
      busy.value = false
    }
  }

  return {
    reference,
    styleId,
    formatId,
    extraPrompt,
    busy,
    error,
    style,
    format,
    hasKey,
    canGenerate,
    setReference,
    clearReference,
    generate,
  }
}
