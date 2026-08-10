/**
 * Export.
 *
 * Re-runs the entire edit chain at the SOURCE image's resolution — global
 * adjustments, masked regions, doodle strokes and text — rather than reading
 * back the on-screen canvas. The preview composites at `previewSize()` and is
 * scaled to fit the frame, so exporting what is on screen would silently ship a
 * downscaled, differently-sized image.
 *
 * Text and strokes are rebuilt through the very same helpers the preview uses
 * (`textLayerProps`, `strokeToFabric`) with the image box set to the full source
 * rectangle, so output cannot drift from what the user was looking at.
 */

export type ExportFormat = 'png' | 'jpeg' | 'webp'

export interface ExportFormatDef {
  id: ExportFormat
  label: string
  extension: string
  mime: string
  /** Lossy formats get the quality slider; PNG does not. */
  lossy: boolean
}

export const EXPORT_FORMATS: ExportFormatDef[] = [
  { id: 'png', label: 'PNG', extension: 'png', mime: 'image/png', lossy: false },
  { id: 'jpeg', label: 'JPG', extension: 'jpg', mime: 'image/jpeg', lossy: true },
  { id: 'webp', label: 'WEBP', extension: 'webp', mime: 'image/webp', lossy: true },
]

export function useExport() {
  const { activeDocument } = useDocuments()
  const { masks } = useMasks()

  const open = useState<boolean>('export:open', () => false)
  const format = useState<ExportFormat>('export:format', () => 'png')
  const quality = useState<number>('export:quality', () => 0.92)
  const busy = useState<boolean>('export:busy', () => false)
  const error = useState<string | null>('export:error', () => null)

  const formatDef = computed(() => EXPORT_FORMATS.find(f => f.id === format.value) ?? EXPORT_FORMATS[0]!)

  const outputSize = computed(() => {
    const doc = activeDocument.value
    return doc ? { width: doc.working.width, height: doc.working.height } : { width: 0, height: 0 }
  })

  const filename = computed(() => {
    const doc = activeDocument.value
    if (!doc) return `imagine.${formatDef.value.extension}`
    const base = doc.name.replace(/\.[^.]+$/, '') || 'imagine'
    return `${base}-edited.${formatDef.value.extension}`
  })

  /** Composite everything at source resolution. */
  async function renderFull(): Promise<HTMLCanvasElement | null> {
    const doc = activeDocument.value
    if (!doc) return null

    const { width, height } = doc.working

    // 1. adjustments (global + masked), at full size
    const base = await renderAtFullResolution(
      doc.working.src,
      width,
      height,
      doc.edits.global.values,
      masks.value.map(mask => ({
        values: doc.edits.masked[mask.id]?.values ?? neutralValues(),
        bitmap: rasterizeMask(doc.id, mask, width, height),
      })),
    )

    // 2. strokes and text, drawn over it in an offscreen Fabric canvas
    const { StaticCanvas, FabricImage, Textbox, Path, Shadow } = await import('fabric')
    const stage = new StaticCanvas(undefined, {
      width,
      height,
      backgroundColor: 'transparent',
      enableRetinaScaling: false,
    })

    stage.add(new FabricImage(base, { left: 0, top: 0, originX: 'left', originY: 'top' }))

    const rect = { left: 0, top: 0, width, height }

    // Lifted pieces sit above the image and below strokes/text, matching the
    // on-screen stacking. Re-cut at full resolution rather than scaling up the
    // preview copy.
    for (const piece of doc.edits.pieces) {
      const element = await renderPiece(doc.working.src, piece, width, height)
      if (!element) continue
      stage.add(
        new FabricImage(element, {
          left: piece.x * width,
          top: piece.y * height,
          originX: 'left',
          originY: 'top',
          opacity: MOVED_PIECE_OPACITY,
        }),
      )
    }

    for (const stroke of doc.edits.doodles) {
      const { path, props } = strokeToFabric(stroke, rect)
      stage.add(new Path(path as never, props))
    }

    for (const layer of doc.edits.texts) {
      const props = textLayerProps(layer, rect)
      const textbox = new Textbox(props.text, props)
      if (layer.shadow) {
        textbox.set({
          shadow: new Shadow({
            color: layer.shadowColor,
            blur: layer.shadowBlur,
            offsetX: layer.shadowOffset,
            offsetY: layer.shadowOffset,
          }),
        })
      }
      stage.add(textbox)
    }

    stage.renderAll()
    const out = stage.toCanvasElement()
    stage.dispose()
    return out
  }

  async function toBlob(): Promise<{ blob: Blob; name: string } | null> {
    const rendered = await renderFull()
    if (!rendered) return null

    let surface = rendered
    if (formatDef.value.id === 'jpeg') {
      // JPEG has no alpha, so anything transparent would come out black.
      // Matte onto white first.
      const matted = document.createElement('canvas')
      matted.width = rendered.width
      matted.height = rendered.height
      const ctx = matted.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, matted.width, matted.height)
        ctx.drawImage(rendered, 0, 0)
        surface = matted
      }
    }

    const blob = await new Promise<Blob | null>(resolve =>
      surface.toBlob(resolve, formatDef.value.mime, formatDef.value.lossy ? quality.value : undefined),
    )
    if (!blob) return null
    return { blob, name: filename.value }
  }

  async function download() {
    if (busy.value) return
    busy.value = true
    error.value = null
    try {
      const result = await toBlob()
      if (!result) {
        error.value = 'Nothing to export.'
        return
      }
      const url = URL.createObjectURL(result.blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = result.name
      anchor.click()
      // Revoke on the next tick; revoking synchronously can cancel the download.
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      open.value = false
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Export failed.'
    } finally {
      busy.value = false
    }
  }

  return {
    open,
    format,
    quality,
    busy,
    error,
    formatDef,
    outputSize,
    filename,
    renderFull,
    toBlob,
    download,
  }
}
