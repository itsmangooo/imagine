import type { Textbox } from 'fabric'

/**
 * Text layers.
 *
 * Stored as plain serialisable descriptors on the document, NOT as Fabric
 * objects. Fabric `Textbox` instances are reconciled from these — which keeps
 * text per-image like every other edit, survives the render pipeline swapping
 * the image element, and lets export re-render text at full resolution from the
 * same numbers rather than scaling up a screen-sized bitmap.
 *
 * Geometry is normalised against the image (0–1 for position, fractions of
 * image height for size), so nothing drifts when the window resizes or the
 * preview composite changes resolution.
 */

export type TextCase = 'none' | 'upper' | 'lower' | 'title'

export interface TextLayer {
  id: string
  text: string
  /** Centre of the box, 0–1 across the image. */
  x: number
  y: number
  /** Box width as a fraction of image width; the Textbox wraps at this. */
  width: number
  angle: number
  fontFamily: string
  /** Fraction of image height, so type scales with the picture. */
  fontSize: number
  fill: string
  opacity: number
  textAlign: 'left' | 'center' | 'right'
  bold: boolean
  italic: boolean
  underline: boolean
  /** Fabric charSpacing is 1/1000 em. */
  charSpacing: number
  lineHeight: number
  textCase: TextCase
  strokeColor: string
  strokeWidth: number
  shadow: boolean
  shadowColor: string
  shadowBlur: number
  shadowOffset: number
  /** Empty string = no highlight bar. */
  background: string
}

export const TEXT_FONTS = ['Roboto', 'Georgia', 'Courier New', 'Impact', 'Arial']

export function defaultTextLayer(): Omit<TextLayer, 'id'> {
  return {
    text: 'Your text',
    x: 0.5,
    y: 0.5,
    width: 0.6,
    angle: 0,
    fontFamily: 'Roboto',
    fontSize: 0.08,
    fill: '#ffffff',
    opacity: 1,
    textAlign: 'center',
    bold: true,
    italic: false,
    underline: false,
    charSpacing: 0,
    lineHeight: 1.16,
    textCase: 'none',
    strokeColor: '#000000',
    strokeWidth: 0,
    shadow: false,
    shadowColor: '#000000',
    shadowBlur: 12,
    shadowOffset: 4,
    background: '',
  }
}

export interface TextStylePreset {
  id: string
  label: string
  values: Partial<TextLayer>
}

export const TEXT_PRESETS: TextStylePreset[] = [
  { id: 'clean', label: 'Clean', values: { fill: '#ffffff', strokeWidth: 0, shadow: false, background: '', bold: true } },
  { id: 'outline', label: 'Outline', values: { fill: '#ffffff', strokeColor: '#000000', strokeWidth: 2, shadow: false, background: '' } },
  { id: 'shadow', label: 'Soft shadow', values: { fill: '#ffffff', strokeWidth: 0, shadow: true, shadowBlur: 16, shadowOffset: 5, background: '' } },
  { id: 'bar', label: 'Highlight bar', values: { fill: '#0b0b0b', background: '#ffffff', strokeWidth: 0, shadow: false } },
  { id: 'caption', label: 'Caption', values: { fill: '#ffffff', background: 'rgba(0,0,0,0.55)', strokeWidth: 0, shadow: false, fontSize: 0.05, textCase: 'upper', charSpacing: 60 } },
]

export function applyTextCase(value: string, mode: TextCase) {
  if (mode === 'upper') return value.toUpperCase()
  if (mode === 'lower') return value.toLowerCase()
  if (mode === 'title') return value.replace(/\w\S*/g, w => w[0]!.toUpperCase() + w.slice(1).toLowerCase())
  return value
}

/**
 * Fabric props for a layer against an arbitrary image box.
 *
 * Module-level and exported so EXPORT can reuse it with a box equal to the full
 * source resolution. Rendering export text through the same function as the
 * on-screen text is what guarantees the output matches the preview instead of
 * drifting as one of the two is edited.
 */
export function textLayerProps(layer: TextLayer, rect: { left: number; top: number; width: number; height: number }) {
  return {
    text: applyTextCase(layer.text, layer.textCase),
    left: rect.left + layer.x * rect.width,
    top: rect.top + layer.y * rect.height,
    width: Math.max(20, layer.width * rect.width),
    angle: layer.angle,
    fontFamily: layer.fontFamily,
    fontSize: Math.max(6, layer.fontSize * rect.height),
    fill: layer.fill,
    opacity: layer.opacity,
    textAlign: layer.textAlign,
    fontWeight: layer.bold ? 'bold' : 'normal',
    fontStyle: layer.italic ? 'italic' : 'normal',
    underline: layer.underline,
    charSpacing: layer.charSpacing,
    lineHeight: layer.lineHeight,
    stroke: layer.strokeWidth > 0 ? layer.strokeColor : undefined,
    strokeWidth: layer.strokeWidth,
    backgroundColor: layer.background || undefined,
    originX: 'center' as const,
    originY: 'center' as const,
  }
}

/** Live Fabric objects, keyed by layer id. Module scope — see useEditor. */
const objects = new Map<string, Textbox>()
/** Snap guide lines, created lazily. */
let guides: { v: unknown; h: unknown } | null = null
/**
 * Set while reconciling. `syncToCanvas` calls `setActiveObject`, which fires
 * Fabric's selection events — without this guard that writes `selectedId`,
 * which retriggers the sync watcher, which selects again: an infinite loop.
 */
let syncing = false

export function isSyncingText() {
  return syncing
}

let nextId = 0

/** Centre-snap threshold in canvas px. Tight, per the spec's 1–2px feel. */
const SNAP = 2

export function useText() {
  const { canvas, imageRect, hasImage, activeTool } = useEditor()
  const { activeDocument, patchEdits } = useDocuments()

  const selectedId = useState<string | null>('text:selected', () => null)

  const layers = computed<TextLayer[]>(() => activeDocument.value?.edits.texts ?? [])
  const selected = computed(() => layers.value.find(l => l.id === selectedId.value) ?? null)

  function writeLayers(next: TextLayer[]) {
    patchEdits(edits => ({ ...edits, texts: next }))
  }

  function updateLayer(id: string, patch: Partial<TextLayer>) {
    writeLayers(layers.value.map(l => (l.id === id ? { ...l, ...patch } : l)))
  }

  function updateSelected(patch: Partial<TextLayer>) {
    if (selectedId.value) updateLayer(selectedId.value, patch)
  }

  function addLayer(values?: Partial<TextLayer>) {
    nextId += 1
    const layer: TextLayer = { ...defaultTextLayer(), ...values, id: `text-${nextId}` }
    writeLayers([...layers.value, layer])
    selectedId.value = layer.id
    return layer
  }

  function duplicateSelected() {
    const current = selected.value
    if (!current) return
    nextId += 1
    const copy: TextLayer = {
      ...current,
      id: `text-${nextId}`,
      x: Math.min(0.95, current.x + 0.03),
      y: Math.min(0.95, current.y + 0.03),
    }
    writeLayers([...layers.value, copy])
    selectedId.value = copy.id
  }

  function deleteSelected() {
    const id = selectedId.value
    if (!id) return
    writeLayers(layers.value.filter(l => l.id !== id))
    selectedId.value = null
  }

  function bringToFront() {
    const id = selectedId.value
    if (!id) return
    const rest = layers.value.filter(l => l.id !== id)
    const one = layers.value.find(l => l.id === id)
    if (one) writeLayers([...rest, one])
  }

  function sendToBack() {
    const id = selectedId.value
    if (!id) return
    const rest = layers.value.filter(l => l.id !== id)
    const one = layers.value.find(l => l.id === id)
    if (one) writeLayers([one, ...rest])
  }

  function applyPreset(preset: TextStylePreset) {
    updateSelected(preset.values)
  }

  /* ---- Fabric reconciliation ------------------------------------------ */

  async function ensureGuides() {
    const c = canvas.value
    if (!c) return null
    // Loading a document clears the canvas, which takes the guides with it.
    if (guides && !c.contains(guides.v as never)) guides = null
    if (guides) return guides
    const { Line } = await import('fabric')
    const common = {
      stroke: '#08c18c',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      excludeFromExport: true,
      visible: false,
    }
    const v = new Line([0, 0, 0, 0], common)
    const h = new Line([0, 0, 0, 0], common)
    c.add(v)
    c.add(h)
    guides = { v, h }
    return guides
  }

  function toFabricProps(layer: TextLayer) {
    return textLayerProps(layer, imageRect.value)
  }

  /** Rebuild the Fabric objects so they match the document's descriptors. */
  async function syncToCanvas() {
    const c = canvas.value
    if (!c) return
    const { Textbox, Shadow } = await import('fabric')

    syncing = true
    try {
    const wanted = new Set(layers.value.map(l => l.id))
    for (const [id, obj] of objects) {
      if (!wanted.has(id)) {
        c.remove(obj)
        objects.delete(id)
      }
    }

    for (const layer of layers.value) {
      const props = toFabricProps(layer)
      let obj = objects.get(layer.id)
      if (!obj) {
        obj = new Textbox(props.text, props)
        // Rotation only; corner scaling would fight the normalised sizing.
        obj.setControlsVisibility({ mt: false, mb: false })
        ;(obj as unknown as { layerId: string }).layerId = layer.id
        objects.set(layer.id, obj)
        c.add(obj)
      } else {
        obj.set(props)
        // Switching documents clears the canvas but not this map.
        if (!c.contains(obj)) c.add(obj)
      }
      obj.set({
        shadow: layer.shadow
          ? new Shadow({
              color: layer.shadowColor,
              blur: layer.shadowBlur,
              offsetX: layer.shadowOffset,
              offsetY: layer.shadowOffset,
            })
          : null,
      })
      obj.setCoords()
    }

    // Text is only interactive while its own tool is active.
    const editing = activeTool.value === 'text'
    c.selection = false
    for (const obj of objects.values()) {
      obj.set({ selectable: editing, evented: editing })
    }

    const target = selectedId.value ? objects.get(selectedId.value) : null
    if (editing && target) c.setActiveObject(target)
    else c.discardActiveObject()

    c.requestRenderAll()
    } finally {
      syncing = false
    }
  }

  /** Write a moved/rotated object's geometry back into the document. */
  function commitObject(obj: Textbox) {
    const id = (obj as unknown as { layerId?: string }).layerId
    const rect = imageRect.value
    if (!id || rect.width === 0) return
    updateLayer(id, {
      x: ((obj.left ?? 0) - rect.left) / rect.width,
      y: ((obj.top ?? 0) - rect.top) / rect.height,
      width: (obj.width ?? 0) / rect.width,
      angle: obj.angle ?? 0,
      fontSize: ((obj.fontSize ?? 0) * (obj.scaleY ?? 1)) / rect.height,
    })
    // Scale is folded into fontSize/width above, so reset it.
    obj.set({ scaleX: 1, scaleY: 1 })
  }

  /**
   * Centre-snap guides. Compared against the IMAGE's centre rather than the
   * canvas's, since the image is what the user is composing against.
   */
  async function handleMoving(obj: Textbox) {
    const c = canvas.value
    const rect = imageRect.value
    if (!c) return
    const g = await ensureGuides()
    if (!g) return

    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const onX = Math.abs((obj.left ?? 0) - cx) <= SNAP
    const onY = Math.abs((obj.top ?? 0) - cy) <= SNAP

    if (onX) obj.set({ left: cx })
    if (onY) obj.set({ top: cy })

    ;(g.v as { set: (o: object) => void }).set({
      x1: cx, y1: rect.top, x2: cx, y2: rect.top + rect.height, visible: onX,
    })
    ;(g.h as { set: (o: object) => void }).set({
      x1: rect.left, y1: cy, x2: rect.left + rect.width, y2: cy, visible: onY,
    })
  }

  function hideGuides() {
    if (!guides) return
    ;(guides.v as { set: (o: object) => void }).set({ visible: false })
    ;(guides.h as { set: (o: object) => void }).set({ visible: false })
  }

  return {
    layers,
    selected,
    selectedId,
    hasImage,
    objects,
    addLayer,
    updateLayer,
    updateSelected,
    duplicateSelected,
    deleteSelected,
    bringToFront,
    sendToBack,
    applyPreset,
    syncToCanvas,
    commitObject,
    handleMoving,
    hideGuides,
  }
}
