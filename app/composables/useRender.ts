/**
 * The render pipeline both adjustment tools share.
 *
 * Everything the user sees is composited here in one place:
 *
 *   1. downscale the working image to preview resolution
 *   2. apply the whole-image adjustment chain
 *   3. for each mask that has paint AND a non-neutral adjustment layer, filter
 *      the result again and composite it back through the mask's alpha
 *
 * Masked regions are cut into a SINGLE element rather than added as extra Fabric
 * objects. One object on the canvas keeps the crop overlay, fitting and export
 * logic unchanged, and means adding a third masked tool later costs nothing.
 *
 * PREVIEW RESOLUTION: the composite is built at `previewSize()`, not the source
 * size. A 20-megapixel photo would otherwise run N+1 full filter passes on every
 * slider tick. Nothing is lost — crop still bakes from the full-resolution
 * source, and export must re-run this chain at source resolution.
 */

import type { AdjustmentValues } from './useFilters'

/** Decoded source images, keyed by object URL, so a re-render never re-decodes. */
const sourceCache = new Map<string, HTMLImageElement>()

async function getSourceElement(src: string): Promise<HTMLImageElement> {
  const cached = sourceCache.get(src)
  if (cached) return cached
  const el = await loadImage(src)
  sourceCache.set(src, el)
  return el
}

export function forgetSource(src: string) {
  sourceCache.delete(src)
}

function scratch(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

/** Run a Fabric filter chain over an element and hand back the result. */
async function runChain(
  element: CanvasImageSource,
  chain: object[],
  width: number,
  height: number,
): Promise<CanvasImageSource> {
  if (!chain.length) return element

  const { FabricImage } = await import('fabric')
  // Fabric filters read from the element it was constructed with, so a canvas
  // source works exactly like an <img> here.
  const image = new FabricImage(element as HTMLImageElement)
  image.filters = chain as never[]
  image.applyFilters()
  const out = image.getElement() as CanvasImageSource
  return out ?? scratch(width, height)
}

let frame = 0
let pending = false

export function useRender() {
  const { activeDocument } = useDocuments()
  const { imageObject, canvas, requestRefit } = useEditor()
  const { masks, revision } = useMasks()

  const rendering = useState<boolean>('render:busy', () => false)

  async function renderNow() {
    const doc = activeDocument.value
    const imageObj = imageObject.value as unknown as
      | { setElement: (el: CanvasImageSource) => void; setCoords: () => void }
      | null
    const fabricCanvas = canvas.value
    if (!doc || !imageObj || !fabricCanvas) return

    rendering.value = true
    try {
      const { width, height } = previewSize(doc.working.width, doc.working.height)
      const source = await getSourceElement(doc.working.src)

      const base = scratch(width, height)
      base.getContext('2d')?.drawImage(source, 0, 0, width, height)

      // --- whole-image adjustments ---
      const globalChain = await buildFilters(doc.edits.global.values)
      let composed = await runChain(base, globalChain, width, height)

      // --- masked adjustments ---
      const layers = masks.value.filter(mask => {
        const layer = doc.edits.masked[mask.id]
        if (!layer) return false
        if (!Object.values(layer.values).some(v => v !== 0)) return false
        return maskHasContent(mask)
      })

      if (layers.length) {
        const out = scratch(width, height)
        const ctx = out.getContext('2d')
        if (ctx) {
          ctx.drawImage(composed, 0, 0, width, height)

          for (const mask of layers) {
            const layer = doc.edits.masked[mask.id]!
            const chain = await buildFilters(layer.values)
            if (!chain.length) continue

            const filtered = await runChain(composed, chain, width, height)
            // Rasterised on demand from the polygon and cached against its points.
            const bitmap = rasterizeMask(doc.id, mask, width, height)
            if (!bitmap) continue

            // Cut the filtered version down to the mask's alpha, then lay it over.
            const cut = scratch(width, height)
            const cutCtx = cut.getContext('2d')
            if (!cutCtx) continue
            cutCtx.drawImage(filtered, 0, 0, width, height)
            cutCtx.globalCompositeOperation = 'destination-in'
            cutCtx.drawImage(bitmap, 0, 0, width, height)

            ctx.drawImage(cut, 0, 0)
          }
          composed = out
        }
      }

      imageObj.setElement(composed)
      imageObj.setCoords()
      requestRefit()
      fabricCanvas.requestRenderAll()
    } finally {
      rendering.value = false
    }
  }

  /**
   * Coalesce to one composite per frame. `requestAnimationFrame` does not fire
   * while the document is hidden, which would leave the canvas stale, so fall
   * back to a timer in that case.
   */
  function scheduleRender() {
    pending = true
    if (frame) return

    const run = () => {
      frame = 0
      if (!pending) return
      pending = false
      void renderNow()
    }

    frame = document.hidden ? window.setTimeout(run, 16) : requestAnimationFrame(run)
  }

  // Any stroke changes what the masked layers cover.
  watch(revision, () => scheduleRender())

  return { renderNow, scheduleRender, rendering }
}

/**
 * Re-run the whole chain at the source's full resolution.
 * Export uses this — never the preview composite on screen.
 */
export async function renderAtFullResolution(
  src: string,
  width: number,
  height: number,
  globalValues: AdjustmentValues,
  maskedLayers: { values: AdjustmentValues; bitmap: HTMLCanvasElement | null }[],
): Promise<HTMLCanvasElement> {
  const source = await getSourceElement(src)

  const base = scratch(width, height)
  base.getContext('2d')?.drawImage(source, 0, 0, width, height)

  let composed = await runChain(base, await buildFilters(globalValues), width, height)

  const active = maskedLayers.filter(l => l.bitmap && Object.values(l.values).some(v => v !== 0))
  if (active.length) {
    const out = scratch(width, height)
    const ctx = out.getContext('2d')!
    ctx.drawImage(composed, 0, 0, width, height)

    for (const layer of active) {
      const chain = await buildFilters(layer.values)
      if (!chain.length) continue
      const filtered = await runChain(composed, chain, width, height)
      const cut = scratch(width, height)
      const cutCtx = cut.getContext('2d')!
      cutCtx.drawImage(filtered, 0, 0, width, height)
      cutCtx.globalCompositeOperation = 'destination-in'
      // Mask bitmaps live at preview size; scale them up to the source here.
      cutCtx.drawImage(layer.bitmap!, 0, 0, width, height)
      ctx.drawImage(cut, 0, 0)
    }
    composed = out
  }

  const final = scratch(width, height)
  final.getContext('2d')?.drawImage(composed, 0, 0, width, height)
  return final
}
