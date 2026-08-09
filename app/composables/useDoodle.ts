import type { Path } from 'fabric'

/**
 * Freehand drawing, on Fabric's built-in `PencilBrush`.
 *
 * Strokes are stored as normalised path data on the document rather than as
 * live Fabric objects — same reasoning as text: per-image state, survives the
 * render pipeline replacing the image element, and export can redraw at source
 * resolution instead of upscaling a screen-sized bitmap.
 *
 * Erasing is a stroke drawn with `destination-out` rather than a separate
 * eraser implementation, so it undoes and re-renders through exactly the same
 * path as a normal stroke.
 */

export type PathCommand = (string | number)[]

export interface DoodleStroke {
  id: string
  /** Path segments with coordinates normalised 0–1 against the image. */
  path: PathCommand[]
  color: string
  /** Fraction of the image's smaller edge, so it scales with the picture. */
  width: number
  opacity: number
  erase: boolean
}

export interface DoodleSettings {
  color: string
  width: number
  opacity: number
  erase: boolean
}

export const DOODLE_COLORS = ['#ffffff', '#0b0b0b', '#08c18c', '#e5484d', '#e8a33d', '#3b82f6']

/** Live Fabric objects and the redo stack. Module scope — see useEditor. */
const objects = new Map<string, Path>()
const redoStacks = new Map<string, DoodleStroke[]>()
let syncing = false

export function isSyncingDoodle() {
  return syncing
}

let nextId = 0

/**
 * Fabric path segments look like ['M', x, y] / ['Q', cx, cy, x, y]. After the
 * command letter, coordinates alternate x, y — so odd indices are x and even
 * indices are y.
 */
function mapSegment(segment: PathCommand, fx: (v: number) => number, fy: (v: number) => number) {
  return segment.map((value, index) => {
    if (index === 0 || typeof value !== 'number') return value
    return index % 2 === 1 ? fx(value) : fy(value)
  })
}

/**
 * Denormalise a stroke against an arbitrary image box, returning the path plus
 * the Fabric props. Exported so EXPORT can redraw strokes at full source
 * resolution through the same code the preview uses.
 */
export function strokeToFabric(
  stroke: DoodleStroke,
  rect: { left: number; top: number; width: number; height: number },
) {
  const path = stroke.path.map(segment =>
    mapSegment(
      segment,
      x => rect.left + x * rect.width,
      y => rect.top + y * rect.height,
    ),
  )
  const scale = Math.min(rect.width, rect.height)
  return {
    path,
    props: {
      stroke: stroke.color,
      strokeWidth: Math.max(1, stroke.width * scale),
      strokeLineCap: 'round' as const,
      strokeLineJoin: 'round' as const,
      fill: undefined,
      opacity: stroke.opacity,
      selectable: false,
      evented: false,
      globalCompositeOperation: stroke.erase
        ? ('destination-out' as const)
        : ('source-over' as const),
    },
  }
}

export function useDoodle() {
  const { canvas, imageRect, hasImage, activeTool } = useEditor()
  const { activeDocument, patchEdits } = useDocuments()

  const settings = useState<DoodleSettings>('doodle:settings', () => ({
    color: '#ffffff',
    width: 0.012,
    opacity: 1,
    erase: false,
  }))

  const strokes = computed<DoodleStroke[]>(() => activeDocument.value?.edits.doodles ?? [])
  const canUndo = computed(() => strokes.value.length > 0)
  const canRedo = computed(() => (redoStacks.get(activeDocument.value?.id ?? '') ?? []).length > 0)

  function writeStrokes(next: DoodleStroke[]) {
    patchEdits(edits => ({ ...edits, doodles: next }))
  }

  /** Adopt a path Fabric just drew, converting it into stored image space. */
  function adoptPath(object: Path) {
    const rect = imageRect.value
    if (rect.width === 0 || rect.height === 0) return
    nextId += 1

    const normalised = (object.path as unknown as PathCommand[]).map(segment =>
      mapSegment(
        segment,
        x => (x - rect.left) / rect.width,
        y => (y - rect.top) / rect.height,
      ),
    )

    writeStrokes([
      ...strokes.value,
      {
        id: `stroke-${nextId}`,
        path: normalised,
        color: settings.value.color,
        width: settings.value.width,
        opacity: settings.value.opacity,
        erase: settings.value.erase,
      },
    ])
    // A new stroke invalidates anything that was undone.
    redoStacks.set(activeDocument.value?.id ?? '', [])
  }

  function undo() {
    const doc = activeDocument.value
    if (!doc || !strokes.value.length) return
    const next = strokes.value.slice()
    const popped = next.pop()!
    redoStacks.set(doc.id, [...(redoStacks.get(doc.id) ?? []), popped])
    writeStrokes(next)
  }

  function redo() {
    const doc = activeDocument.value
    if (!doc) return
    const stack = (redoStacks.get(doc.id) ?? []).slice()
    const restored = stack.pop()
    if (!restored) return
    redoStacks.set(doc.id, stack)
    writeStrokes([...strokes.value, restored])
  }

  function clearAll() {
    const doc = activeDocument.value
    if (!doc) return
    redoStacks.set(doc.id, [...(redoStacks.get(doc.id) ?? []), ...strokes.value])
    writeStrokes([])
  }

  function update(patch: Partial<DoodleSettings>) {
    settings.value = { ...settings.value, ...patch }
  }

  /* ---- Fabric reconciliation ------------------------------------------ */

  /** Rebuild Fabric paths so they match the document's stored strokes. */
  async function syncToCanvas() {
    const c = canvas.value
    if (!c) return
    const { Path } = await import('fabric')
    const rect = imageRect.value

    syncing = true
    try {
      const wanted = new Set(strokes.value.map(s => s.id))
      for (const [id, obj] of objects) {
        if (!wanted.has(id)) {
          c.remove(obj)
          objects.delete(id)
        }
      }

      for (const stroke of strokes.value) {
        // Same conversion export uses, so preview and output cannot drift.
        const { path, props } = strokeToFabric(stroke, rect)

        const existing = objects.get(stroke.id)
        if (existing) {
          c.remove(existing)
          objects.delete(stroke.id)
        }
        const obj = new Path(path as never, props)
        objects.set(stroke.id, obj)
        c.add(obj)
      }

      c.requestRenderAll()
    } finally {
      syncing = false
    }
  }

  /** Turn Fabric's drawing mode on/off and keep the brush in step. */
  async function syncBrush() {
    const c = canvas.value
    if (!c) return
    const drawing = activeTool.value === 'doodle' && hasImage.value
    c.isDrawingMode = drawing
    if (!drawing) return

    const { PencilBrush } = await import('fabric')
    if (!(c.freeDrawingBrush instanceof PencilBrush)) {
      c.freeDrawingBrush = new PencilBrush(c)
    }
    const scale = Math.min(imageRect.value.width, imageRect.value.height)
    const brush = c.freeDrawingBrush
    brush.width = Math.max(1, settings.value.width * scale)
    // The live preview stroke should look like what it will become; the real
    // destination-out compositing happens once the path is adopted.
    brush.color = settings.value.erase ? 'rgba(0,0,0,0.35)' : settings.value.color
  }

  return {
    settings,
    strokes,
    canUndo,
    canRedo,
    hasImage,
    adoptPath,
    undo,
    redo,
    clearAll,
    update,
    syncToCanvas,
    syncBrush,
  }
}
