import type { FabricImage, Rect } from 'fabric'

/**
 * Collage.
 *
 * Composes several of the session's loaded images into one picture. Sources are
 * the documents already in the filmstrip, so "import from device" and "use the
 * existing gallery" are the same action — adding a file adds a document, which
 * is immediately available as a collage cell.
 *
 * Cells are real Fabric objects while the tool is active, which is what gives
 * free dragging, resizing and reordering without writing any of it ourselves.
 * Geometry is mirrored back into normalised state so it survives tool switches,
 * and flattening renders at full output resolution into a NEW document — after
 * which crop, filters, text and the rest apply to it like any other image.
 */

export type CollageLayout = 'two-h' | 'two-v' | 'three' | 'four' | 'freeform'

export interface CollageLayoutDef {
  id: CollageLayout
  label: string
  slots: number
}

export const COLLAGE_LAYOUTS: CollageLayoutDef[] = [
  { id: 'two-h', label: '2 across', slots: 2 },
  { id: 'two-v', label: '2 down', slots: 2 },
  { id: 'three', label: '3 up', slots: 3 },
  { id: 'four', label: '4 grid', slots: 4 },
  { id: 'freeform', label: 'Freeform', slots: 0 },
]

export const COLLAGE_RATIOS = [
  { id: '1:1', label: 'Square', value: 1 },
  { id: '4:5', label: 'Portrait', value: 4 / 5 },
  { id: '16:9', label: 'Wide', value: 16 / 9 },
  { id: '9:16', label: 'Story', value: 9 / 16 },
]

/** Long edge of the flattened output. */
export const COLLAGE_LONG_EDGE = 2000

export interface CollageCell {
  id: string
  /** Which loaded document supplies the pixels. */
  docId: string
  /** Normalised against the collage frame. */
  x: number
  y: number
  w: number
  h: number
}

export interface CollageState {
  layout: CollageLayout
  ratio: string
  /** Gap between cells, as a fraction of the frame's smaller edge. */
  spacing: number
  background: string
  radius: number
  cells: CollageCell[]
}

/** Live Fabric objects for the cells, plus the frame backdrop. */
const cellObjects = new Map<string, FabricImage>()
let frameObject: Rect | null = null
let syncing = false

export function isSyncingCollage() {
  return syncing
}

let nextCellId = 0

/** Slot rectangles for a layout, in normalised frame coordinates. */
export function layoutSlots(layout: CollageLayout, gap: number): { x: number; y: number; w: number; h: number }[] {
  const g = gap
  const half = (1 - g * 3) / 2
  switch (layout) {
    case 'two-h':
      return [
        { x: g, y: g, w: half, h: 1 - g * 2 },
        { x: g * 2 + half, y: g, w: half, h: 1 - g * 2 },
      ]
    case 'two-v':
      return [
        { x: g, y: g, w: 1 - g * 2, h: half },
        { x: g, y: g * 2 + half, w: 1 - g * 2, h: half },
      ]
    case 'three':
      return [
        { x: g, y: g, w: 1 - g * 2, h: half },
        { x: g, y: g * 2 + half, w: half, h: half },
        { x: g * 2 + half, y: g * 2 + half, w: half, h: half },
      ]
    case 'four':
      return [
        { x: g, y: g, w: half, h: half },
        { x: g * 2 + half, y: g, w: half, h: half },
        { x: g, y: g * 2 + half, w: half, h: half },
        { x: g * 2 + half, y: g * 2 + half, w: half, h: half },
      ]
    default:
      return []
  }
}

export function useCollage() {
  const { canvas, imageObject, activeTool } = useEditor()
  const { documents, addImage } = useDocuments()

  const state = useState<CollageState>('collage:state', () => ({
    layout: 'two-h',
    ratio: '1:1',
    spacing: 0.02,
    background: '#0c0c0c',
    radius: 0,
    cells: [],
  }))
  const selectedCellId = useState<string | null>('collage:selected', () => null)
  const building = useState<boolean>('collage:building', () => false)

  const ratioValue = computed(
    () => COLLAGE_RATIOS.find(r => r.id === state.value.ratio)?.value ?? 1,
  )
  const layoutDef = computed(
    () => COLLAGE_LAYOUTS.find(l => l.id === state.value.layout) ?? COLLAGE_LAYOUTS[0]!,
  )
  const canFlatten = computed(() => state.value.cells.length > 0)

  /** Output pixel size, derived from the chosen aspect. */
  const outputSize = computed(() => {
    const r = ratioValue.value
    return r >= 1
      ? { width: COLLAGE_LONG_EDGE, height: Math.round(COLLAGE_LONG_EDGE / r) }
      : { width: Math.round(COLLAGE_LONG_EDGE * r), height: COLLAGE_LONG_EDGE }
  })

  /** Where the collage frame sits on the Fabric canvas, in canvas px. */
  const frameRect = computed(() => {
    const c = canvas.value
    if (!c) return { left: 0, top: 0, width: 0, height: 0 }
    const cw = c.getWidth()
    const ch = c.getHeight()
    const pad = 32
    const r = ratioValue.value
    let width = cw - pad * 2
    let height = width / r
    if (height > ch - pad * 2) {
      height = ch - pad * 2
      width = height * r
    }
    return { left: (cw - width) / 2, top: (ch - height) / 2, width, height }
  })

  function patch(next: Partial<CollageState>) {
    state.value = { ...state.value, ...next }
  }

  /** Fill the current layout's slots with whatever images are loaded. */
  function applyLayout(layout: CollageLayout) {
    const slots = layoutSlots(layout, state.value.spacing)
    if (!slots.length) {
      patch({ layout })
      return
    }
    const sources = state.value.cells.map(c => c.docId)
    // Top up from the filmstrip so a fresh layout is never empty.
    for (const doc of documents.value) {
      if (sources.length >= slots.length) break
      if (!sources.includes(doc.id)) sources.push(doc.id)
    }
    while (sources.length < slots.length && documents.value.length) {
      sources.push(documents.value[sources.length % documents.value.length]!.id)
    }

    const cells: CollageCell[] = slots.map((slot, index) => {
      nextCellId += 1
      return { id: `cell-${nextCellId}`, docId: sources[index]!, ...slot }
    })
    patch({ layout, cells })
  }

  function setCellSource(cellId: string, docId: string) {
    patch({ cells: state.value.cells.map(c => (c.id === cellId ? { ...c, docId } : c)) })
  }

  /** Reorder by swapping which image occupies two cells. */
  function swapCells(a: string, b: string) {
    const cells = state.value.cells.slice()
    const ia = cells.findIndex(c => c.id === a)
    const ib = cells.findIndex(c => c.id === b)
    if (ia < 0 || ib < 0) return
    const docA = cells[ia]!.docId
    cells[ia] = { ...cells[ia]!, docId: cells[ib]!.docId }
    cells[ib] = { ...cells[ib]!, docId: docA }
    patch({ cells })
  }

  function shiftCell(cellId: string, direction: -1 | 1) {
    const index = state.value.cells.findIndex(c => c.id === cellId)
    const target = state.value.cells[index + direction]
    if (!target) return
    swapCells(cellId, target.id)
  }

  function addCell(docId: string) {
    nextCellId += 1
    patch({
      layout: 'freeform',
      cells: [
        ...state.value.cells,
        { id: `cell-${nextCellId}`, docId, x: 0.12, y: 0.12, w: 0.5, h: 0.5 },
      ],
    })
  }

  function removeCell(cellId: string) {
    patch({ cells: state.value.cells.filter(c => c.id !== cellId) })
    if (selectedCellId.value === cellId) selectedCellId.value = null
  }

  async function importImages(files: FileList | null) {
    if (!files?.length) return
    for (const file of Array.from(files)) {
      const doc = await addImage(file)
      if (doc) addCell(doc.id)
    }
  }

  /* ---- Fabric reconciliation ------------------------------------------ */

  async function syncToCanvas() {
    const c = canvas.value
    if (!c) return
    const { FabricImage, Rect } = await import('fabric')
    const active = activeTool.value === 'collage'

    syncing = true
    try {
      // The single-document image is meaningless while composing.
      if (imageObject.value) imageObject.value.set({ visible: !active })

      if (!active) {
        for (const [id, obj] of cellObjects) {
          c.remove(obj)
          cellObjects.delete(id)
        }
        if (frameObject) {
          c.remove(frameObject)
          frameObject = null
        }
        c.selection = false
        c.requestRenderAll()
        return
      }

      const rect = frameRect.value

      if (frameObject && !c.contains(frameObject)) frameObject = null
      if (!frameObject) {
        frameObject = new Rect({ selectable: false, evented: false })
        c.add(frameObject)
        c.sendObjectToBack(frameObject)
      }
      frameObject.set({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        fill: state.value.background,
        rx: state.value.radius,
        ry: state.value.radius,
      })

      const wanted = new Set(state.value.cells.map(cell => cell.id))
      for (const [id, obj] of cellObjects) {
        if (!wanted.has(id)) {
          c.remove(obj)
          cellObjects.delete(id)
        }
      }

      for (const cell of state.value.cells) {
        const doc = documents.value.find(d => d.id === cell.docId)
        if (!doc) continue

        const width = cell.w * rect.width
        const height = cell.h * rect.height
        // Anchor on the slot's CENTRE. A clipPath is positioned relative to its
        // object's centre in Fabric, so centring the image too keeps the crop
        // symmetric — anchoring top-left clips from the middle outwards.
        const left = rect.left + (cell.x + cell.w / 2) * rect.width
        const top = rect.top + (cell.y + cell.h / 2) * rect.height

        let obj = cellObjects.get(cell.id)
        if (!obj || (obj as unknown as { srcDoc?: string }).srcDoc !== cell.docId) {
          if (obj) c.remove(obj)
          const element = await loadImage(doc.working.src)
          obj = new FabricImage(element, { originX: 'center', originY: 'center' })
          ;(obj as unknown as { cellId: string }).cellId = cell.id
          ;(obj as unknown as { srcDoc: string }).srcDoc = cell.docId
          cellObjects.set(cell.id, obj)
          c.add(obj)
        }

        // Cover the slot: scale to fill, then clip to the slot rectangle so the
        // image crops rather than distorts.
        const natural = { w: obj.width ?? 1, h: obj.height ?? 1 }
        const scale = Math.max(width / natural.w, height / natural.h)
        obj.set({
          left,
          top,
          scaleX: scale,
          scaleY: scale,
          selectable: true,
          evented: true,
          clipPath: new Rect({
            width: width / scale,
            height: height / scale,
            originX: 'center',
            originY: 'center',
          }),
        })
        obj.setCoords()
      }

      c.selection = false
      c.requestRenderAll()
    } finally {
      syncing = false
    }
  }

  /** Write a dragged/resized cell back into normalised state. */
  function commitObject(obj: FabricImage) {
    const cellId = (obj as unknown as { cellId?: string }).cellId
    const rect = frameRect.value
    if (!cellId || rect.width === 0) return
    // The object is centre-anchored on its slot, so convert back to a top-left
    // normalised rect. The clip is what defines the visible cell, and it tracks
    // the object's size, so scaled dimensions are the cell dimensions.
    const width = (obj.width ?? 0) * (obj.scaleX ?? 1)
    const height = (obj.height ?? 0) * (obj.scaleY ?? 1)
    const w = width / rect.width
    const h = height / rect.height
    patch({
      cells: state.value.cells.map(cell =>
        cell.id === cellId
          ? {
              ...cell,
              x: ((obj.left ?? 0) - rect.left) / rect.width - w / 2,
              y: ((obj.top ?? 0) - rect.top) / rect.height - h / 2,
              w,
              h,
            }
          : cell,
      ),
    })
  }

  /** Render the composition at full output resolution as a new document. */
  async function flatten(): Promise<boolean> {
    if (!canFlatten.value || building.value) return false
    building.value = true
    try {
      const { width, height } = outputSize.value
      const surface = document.createElement('canvas')
      surface.width = width
      surface.height = height
      const ctx = surface.getContext('2d')
      if (!ctx) return false

      ctx.fillStyle = state.value.background
      ctx.fillRect(0, 0, width, height)

      for (const cell of state.value.cells) {
        const doc = documents.value.find(d => d.id === cell.docId)
        if (!doc) continue
        const element = await loadImage(doc.working.src)

        const dx = cell.x * width
        const dy = cell.y * height
        const dw = cell.w * width
        const dh = cell.h * height

        // Same cover-crop as the preview, computed on the source pixels.
        const scale = Math.max(dw / element.naturalWidth, dh / element.naturalHeight)
        const sw = dw / scale
        const sh = dh / scale

        ctx.save()
        ctx.beginPath()
        ctx.rect(dx, dy, dw, dh)
        ctx.clip()
        ctx.drawImage(element, 0, 0, sw, sh, dx, dy, dw, dh)
        ctx.restore()
      }

      const blob = await new Promise<Blob | null>(resolve => surface.toBlob(resolve, 'image/png'))
      if (!blob) return false

      const file = new File([blob], `collage-${Date.now()}.png`, { type: 'image/png' })
      await addImage(file)
      return true
    } finally {
      building.value = false
    }
  }

  return {
    state,
    layoutDef,
    selectedCellId,
    building,
    canFlatten,
    outputSize,
    frameRect,
    documents,
    patch,
    applyLayout,
    setCellSource,
    shiftCell,
    addCell,
    removeCell,
    importImages,
    syncToCanvas,
    commitObject,
    flatten,
  }
}
