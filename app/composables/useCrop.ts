/**
 * Crop state and geometry.
 *
 * The crop rect is stored NORMALISED (0–1) against the source image, never in
 * screen pixels. That keeps it correct across window resizes and zoom changes,
 * and means applying the crop can render at the image's full resolution rather
 * than the scaled-to-fit view.
 */

export interface CropRect {
  x: number
  y: number
  w: number
  h: number
}

export interface CropPreset {
  id: string
  label: string
  /** Width ÷ height in real image pixels. null = freeform. */
  ratio: number | null
  hint: string
}

/**
 * Ratios are the platforms' recommended upload dimensions. Several resolve to
 * 1:1 — they are kept as separate entries because users pick by destination,
 * not by arithmetic, and they map to different export sizes later.
 */
export const CROP_PRESETS: CropPreset[] = [
  { id: 'free', label: 'Freeform', ratio: null, hint: 'Any' },
  { id: 'li-post', label: 'LinkedIn Post', ratio: 1200 / 627, hint: '1.91:1' },
  { id: 'li-pfp', label: 'LinkedIn PFP', ratio: 1, hint: '1:1' },
  { id: 'x-post', label: 'X Post', ratio: 16 / 9, hint: '16:9' },
  { id: 'ig-post', label: 'IG Post', ratio: 1, hint: '1:1' },
  { id: 'ig-story', label: 'IG Story', ratio: 9 / 16, hint: '9:16' },
  { id: 'ig-pfp', label: 'IG PFP', ratio: 1, hint: '1:1' },
]

export type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const CROP_HANDLES: HandleId[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

const FULL: CropRect = { x: 0, y: 0, w: 1, h: 1 }

/** Smallest allowed crop, as a fraction of the image. */
const MIN = 0.04

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

export function useCrop() {
  const { imageRect } = useEditor()
  const { activeDocument, patchEdits, replaceWorking } = useDocuments()
  const { clearAllMasks } = useMasks()

  const source = computed(() => activeDocument.value?.working ?? null)

  // Writable computeds over the ACTIVE DOCUMENT, so each image keeps its own
  // crop selection and switching between them preserves it.
  const rect = computed<CropRect>({
    get: () => activeDocument.value?.edits.crop.rect ?? { ...FULL },
    set: next => patchEdits(e => ({ ...e, crop: { ...e.crop, rect: next } })),
  })
  const presetId = computed<string>({
    get: () => activeDocument.value?.edits.crop.presetId ?? 'free',
    set: next => patchEdits(e => ({ ...e, crop: { ...e.crop, presetId: next } })),
  })

  const showGrid = useState<boolean>('crop:grid', () => true)
  const applying = useState<boolean>('crop:applying', () => false)

  const preset = computed(() => CROP_PRESETS.find(p => p.id === presetId.value) ?? CROP_PRESETS[0]!)

  /** Aspect of the source image itself (w/h in pixels). */
  const imageAspect = computed(() => {
    const s = source.value
    return s && s.height > 0 ? s.width / s.height : 1
  })

  /**
   * The preset ratio expressed in NORMALISED space. A 1:1 pixel crop of a
   * portrait image is not 1:1 in normalised coordinates, so every ratio has to
   * be divided by the image's own aspect before it can constrain the rect.
   */
  const normRatio = computed(() => {
    const r = preset.value.ratio
    return r === null ? null : r / imageAspect.value
  })

  /** Crop size in real source pixels — what the export will actually be. */
  const outputSize = computed(() => {
    const s = source.value
    if (!s) return { width: 0, height: 0 }
    return {
      width: Math.max(1, Math.round(rect.value.w * s.width)),
      height: Math.max(1, Math.round(rect.value.h * s.height)),
    }
  })

  const isFullFrame = computed(() => {
    const r = rect.value
    return r.x < 1e-4 && r.y < 1e-4 && r.w > 1 - 1e-4 && r.h > 1 - 1e-4
  })

  /** Largest rect of the given normalised ratio, centred in the image. */
  function largestCentred(ratio: number): CropRect {
    let w = 1
    let h = w / ratio
    if (h > 1) {
      h = 1
      w = h * ratio
    }
    return { x: (1 - w) / 2, y: (1 - h) / 2, w, h }
  }

  function selectPreset(id: string) {
    presetId.value = id
    const next = CROP_PRESETS.find(p => p.id === id)
    if (!next) return
    if (next.ratio === null) return // freeform keeps whatever is on screen
    rect.value = largestCentred(next.ratio / imageAspect.value)
  }

  function reset() {
    presetId.value = 'free'
    rect.value = { ...FULL }
  }

  function move(dx: number, dy: number, start: CropRect) {
    rect.value = {
      w: start.w,
      h: start.h,
      x: clamp(start.x + dx, 0, 1 - start.w),
      y: clamp(start.y + dy, 0, 1 - start.h),
    }
  }

  function resize(handle: HandleId, dx: number, dy: number, start: CropRect) {
    const ratio = normRatio.value
    const west = handle.includes('w')
    const east = handle.includes('e')
    const north = handle.includes('n')
    const south = handle.includes('s')
    const isCorner = (west || east) && (north || south)

    if (ratio === null) {
      let left = west ? clamp(start.x + dx, 0, start.x + start.w - MIN) : start.x
      let right = east ? clamp(start.x + start.w + dx, start.x + MIN, 1) : start.x + start.w
      let top = north ? clamp(start.y + dy, 0, start.y + start.h - MIN) : start.y
      let bottom = south ? clamp(start.y + start.h + dy, start.y + MIN, 1) : start.y + start.h
      rect.value = { x: left, y: top, w: right - left, h: bottom - top }
      return
    }

    if (isCorner) {
      // Anchor the opposite corner and grow from it, so the corner under the
      // cursor is the only one that moves.
      const anchorX = west ? start.x + start.w : start.x
      const anchorY = north ? start.y + start.h : start.y
      const pointerX = west ? start.x + dx : start.x + start.w + dx
      const pointerY = north ? start.y + dy : start.y + start.h + dy

      let w = Math.abs(pointerX - anchorX)
      let h = Math.abs(pointerY - anchorY)

      // Whichever axis the user pulled further wins; the other follows.
      if (w / h > ratio) h = w / ratio
      else w = h * ratio

      const maxW = west ? anchorX : 1 - anchorX
      const maxH = north ? anchorY : 1 - anchorY
      if (w > maxW) {
        w = maxW
        h = w / ratio
      }
      if (h > maxH) {
        h = maxH
        w = h * ratio
      }
      if (w < MIN) {
        w = MIN
        h = w / ratio
      }

      const x = west ? anchorX - w : anchorX
      const y = north ? anchorY - h : anchorY
      rect.value = { x, y, w, h }
      return
    }

    // Edge handle with a locked ratio: the dragged axis leads, the other grows
    // symmetrically about the rect's centre so the crop stays put.
    if (west || east) {
      const anchorX = west ? start.x + start.w : start.x
      const pointerX = west ? start.x + dx : start.x + start.w + dx
      let w = clamp(Math.abs(pointerX - anchorX), MIN, west ? anchorX : 1 - anchorX)
      let h = w / ratio
      if (h > 1) {
        h = 1
        w = h * ratio
      }
      const cy = start.y + start.h / 2
      const y = clamp(cy - h / 2, 0, 1 - h)
      const x = west ? anchorX - w : anchorX
      rect.value = { x, y, w, h }
      return
    }

    const anchorY = north ? start.y + start.h : start.y
    const pointerY = north ? start.y + dy : start.y + start.h + dy
    let h = clamp(Math.abs(pointerY - anchorY), MIN, north ? anchorY : 1 - anchorY)
    let w = h * ratio
    if (w > 1) {
      w = 1
      h = w / ratio
    }
    const cx = start.x + start.w / 2
    const x = clamp(cx - w / 2, 0, 1 - w)
    const y = north ? anchorY - h : anchorY
    rect.value = { x, y, w, h }
  }

  /**
   * Bake the crop into a new working image, rendered at the source's full
   * resolution — never from the scaled-to-fit canvas on screen.
   */
  async function apply(): Promise<boolean> {
    const s = source.value
    if (!s || isFullFrame.value || applying.value) return false

    applying.value = true
    try {
      const img = await loadImage(s.src)

      const r = rect.value
      const sx = Math.round(r.x * s.width)
      const sy = Math.round(r.y * s.height)
      const sw = Math.max(1, Math.round(r.w * s.width))
      const sh = Math.max(1, Math.round(r.h * s.height))

      const out = document.createElement('canvas')
      out.width = sw
      out.height = sh
      const ctx = out.getContext('2d')
      if (!ctx) return false
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)

      const blob = await new Promise<Blob | null>(resolve => out.toBlob(resolve, 'image/png'))
      if (!blob) return false

      await replaceWorking({ src: URL.createObjectURL(blob), width: sw, height: sh })

      // Masks are painted against the frame that was on screen. Once pixels are
      // cut away, a "sky" region no longer covers the sky, and silently keeping
      // a misaligned mask is worse than dropping it. Flagged in the UI.
      clearAllMasks()

      // The new image IS the crop, so the rect goes back to full frame.
      rect.value = { ...FULL }
      presetId.value = 'free'
      return true
    } finally {
      applying.value = false
    }
  }

  /** Normalised rect projected into CSS px relative to the canvas frame. */
  const screenRect = computed(() => {
    const ir = imageRect.value
    const r = rect.value
    return {
      left: ir.left + r.x * ir.width,
      top: ir.top + r.y * ir.height,
      width: r.w * ir.width,
      height: r.h * ir.height,
    }
  })

  return {
    rect,
    presetId,
    preset,
    showGrid,
    applying,
    normRatio,
    outputSize,
    isFullFrame,
    screenRect,
    selectPreset,
    reset,
    move,
    resize,
    apply,
  }
}
