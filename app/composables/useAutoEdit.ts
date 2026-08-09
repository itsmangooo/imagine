import type { AdjustmentValues } from './useFilters'

/**
 * Auto-Edit — suggested adjustments, written straight into the Filters sliders
 * so they stay visible and editable rather than being a black-box transform.
 *
 * HOW THIS ACTUALLY WORKS, stated plainly: the suggestions come from analysing
 * the image's own histogram in the browser — exposure from mean luminance,
 * contrast from the 5th/95th percentile spread, white balance from a grey-world
 * estimate, saturation from mean chroma, and shadow/highlight recovery from
 * clipping at each end. No model is called, so it needs **no API key and costs
 * nothing**.
 *
 * That is a deliberate choice, not a stub. A vision-model round trip would cost
 * the user real money per press to produce numbers a histogram already gives
 * accurately and instantly. If a model-backed version is wanted later it can be
 * added alongside this, gated on the user's own key like AI Generate — the
 * output shape (a set of adjustment values) is identical either way.
 */

/** Analysis runs on a small copy; a histogram does not need full resolution. */
const SAMPLE_EDGE = 256

export interface AutoEditReport {
  exposure: number
  contrast: number
  temperature: number
  saturation: number
  meanLuma: number
  clippedShadows: number
  clippedHighlights: number
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

export function useAutoEdit() {
  const { activeDocument } = useDocuments()
  const { values, setAdjustment } = useAdjustmentTarget('filters')

  const busy = useState<boolean>('autoedit:busy', () => false)
  const report = useState<AutoEditReport | null>('autoedit:report', () => null)
  const applied = useState<boolean>('autoedit:applied', () => false)
  const error = useState<string | null>('autoedit:error', () => null)

  const canRun = computed(() => activeDocument.value !== null && !busy.value)

  async function analyse(): Promise<AdjustmentValues | null> {
    const doc = activeDocument.value
    if (!doc) return null

    const img = await loadImage(doc.working.src)
    const scale = Math.min(1, SAMPLE_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, w, h)
    const { data } = ctx.getImageData(0, 0, w, h)

    const histogram = new Array<number>(256).fill(0)
    let sumR = 0
    let sumG = 0
    let sumB = 0
    let sumChroma = 0
    const pixels = w * h

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!
      const g = data[i + 1]!
      const b = data[i + 2]!
      sumR += r
      sumG += g
      sumB += b
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
      histogram[Math.min(255, Math.round(luma))]! += 1
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      sumChroma += max === 0 ? 0 : (max - min) / max
    }

    // Percentiles bound the tonal range without letting a few stray pixels
    // (a specular highlight, a black border) define it.
    let seen = 0
    let p5 = 0
    let p95 = 255
    for (let level = 0; level < 256; level++) {
      seen += histogram[level]!
      if (p5 === 0 && seen >= pixels * 0.05) p5 = level
      if (seen >= pixels * 0.95) {
        p95 = level
        break
      }
    }

    const meanLuma = (0.2126 * sumR + 0.7152 * sumG + 0.0722 * sumB) / pixels / 255
    const meanChroma = sumChroma / pixels
    const spread = (p95 - p5) / 255

    // Grey-world: a well-balanced image has roughly equal channel means.
    const meanR = sumR / pixels
    const meanB = sumB / pixels
    const meanAll = (sumR + sumG + sumB) / (pixels * 3)
    const warmth = (meanR - meanB) / (meanAll || 1)

    const clippedShadows = histogram.slice(0, 6).reduce((a, b) => a + b, 0) / pixels
    const clippedHighlights = histogram.slice(250).reduce((a, b) => a + b, 0) / pixels

    // Nudge toward a mid-grey of 0.46 and a full-ish tonal spread, gently —
    // an auto-correct that swings hard is worse than none.
    const next: AdjustmentValues = {
      ...neutralValues(),
      exposure: clamp((0.46 - meanLuma) * 0.9, -0.35, 0.35),
      contrast: clamp((0.72 - spread) * 0.9, -0.25, 0.4),
      temperature: clamp(-warmth * 0.55, -0.3, 0.3),
      saturation: clamp((0.34 - meanChroma) * 0.8, -0.2, 0.28),
      shadows: clamp(clippedShadows * 2.2, 0, 0.3),
      highlights: clamp(-clippedHighlights * 2.2, -0.3, 0),
    }

    report.value = {
      exposure: next.exposure,
      contrast: next.contrast,
      temperature: next.temperature,
      saturation: next.saturation,
      meanLuma,
      clippedShadows,
      clippedHighlights,
    }
    return next
  }

  async function run() {
    if (!canRun.value) return
    busy.value = true
    error.value = null
    try {
      const suggestion = await analyse()
      if (!suggestion) {
        error.value = 'Could not analyse this image.'
        return
      }
      // Written into the same layer the Filters panel edits, so every value is
      // visible and adjustable afterwards.
      for (const adjustment of ADJUSTMENTS) {
        if (suggestion[adjustment.id] !== values.value[adjustment.id]) {
          setAdjustment(adjustment.id, suggestion[adjustment.id])
        }
      }
      applied.value = true
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Analysis failed.'
    } finally {
      busy.value = false
    }
  }

  function revert() {
    for (const adjustment of ADJUSTMENTS) setAdjustment(adjustment.id, 0)
    applied.value = false
    report.value = null
  }

  return { busy, report, applied, error, canRun, run, revert }
}
