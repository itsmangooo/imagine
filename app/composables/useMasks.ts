/**
 * Shared mask infrastructure — lasso selection.
 *
 * A mask is a NAMED REGION and nothing more: a closed polygon in normalised
 * (0–1) image coordinates. It carries no adjustments of its own — what happens
 * inside it lives in the document's `masked` layer, which Filters and Colour
 * Grading both write into. So a region lassoed in one tool is immediately
 * usable in the other.
 *
 * Storing a polygon rather than a painted bitmap is what makes this cheap: the
 * region is a handful of points, it stays editable (drag a vertex to reshape),
 * it survives resizes for free, and the alpha bitmap the renderer needs is
 * rasterised on demand and cached against the point list.
 */

export interface MaskPoint {
  x: number
  y: number
}

export interface MaskRegion {
  id: string
  name: string
  /** Closed polygon, normalised 0–1 against the image. */
  points: MaskPoint[]
  /** Adjust everything OUTSIDE the polygon instead of inside. */
  inverted: boolean
}

/**
 * Rasterisation resolution. The render composite works at this size too, so
 * masking is a 1:1 draw with no resampling.
 */
export const MASK_MAX_EDGE = 2400

/** Feather applied to the polygon edge so selections do not look cut out. */
const FEATHER = 1.5

/** Cached rasterisations, invalidated by a signature of the point list. */
const rasterCache = new Map<string, { sig: string; canvas: HTMLCanvasElement }>()

function signature(region: MaskRegion, width: number, height: number) {
  return `${width}x${height}:${region.inverted ? 'i' : 'n'}:${region.points
    .map(p => `${p.x.toFixed(4)},${p.y.toFixed(4)}`)
    .join(';')}`
}

/** Dimensions a mask (and the preview composite) uses for a given image size. */
export function previewSize(width: number, height: number) {
  const scale = Math.min(1, MASK_MAX_EDGE / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export function maskHasContent(region: MaskRegion | undefined | null): boolean {
  return !!region && region.points.length >= 3
}

/**
 * Alpha bitmap for a region — white inside the polygon, transparent outside.
 * Cached, so re-rendering while dragging a slider costs nothing.
 */
export function rasterizeMask(
  docId: string,
  region: MaskRegion,
  width: number,
  height: number,
): HTMLCanvasElement | null {
  if (!maskHasContent(region)) return null

  const key = `${docId}:${region.id}`
  const sig = signature(region, width, height)
  const cached = rasterCache.get(key)
  if (cached && cached.sig === sig) return cached.canvas

  const canvas = cached?.canvas ?? document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, width, height)
  ctx.save()
  if (region.inverted) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
    ctx.globalCompositeOperation = 'destination-out'
  }

  ctx.filter = `blur(${FEATHER}px)`
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  region.points.forEach((p, i) => {
    const x = p.x * width
    const y = p.y * height
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  rasterCache.set(key, { sig, canvas })
  return canvas
}

export function disposeMasksFor(docId: string) {
  for (const k of [...rasterCache.keys()]) {
    if (k.startsWith(`${docId}:`)) rasterCache.delete(k)
  }
}

/** Smallest gap between recorded points, as a fraction of the image. */
const MIN_POINT_GAP = 0.006

export type LassoMode = 'freeform' | 'magnetic'

/**
 * Edge field for the active image, held at module scope. Computed once when
 * magnetic mode is first used on an image, never per frame.
 */
let edgeMap: EdgeMap | null = null
let edgeMapSrc: string | null = null

let nextMaskId = 0

export function useMasks() {
  const { activeDocument } = useDocuments()

  const masksByDoc = useState<Record<string, MaskRegion[]>>('masks:by-doc', () => ({}))
  const showOverlay = useState<boolean>('masks:overlay', () => true)
  /** The lasso currently being drawn, if any. */
  const draft = useState<MaskPoint[]>('masks:draft', () => [])
  const drawing = useState<boolean>('masks:drawing', () => false)
  const lassoMode = useState<LassoMode>('masks:lasso-mode', () => 'freeform')
  /** Search radius for edge snapping, as a fraction of the image's short edge. */
  const magnetStrength = useState<number>('masks:magnet', () => 0.02)
  const edgeMapReady = useState<boolean>('masks:edge-ready', () => false)
  const edgeMapBusy = useState<boolean>('masks:edge-busy', () => false)
  /** Bumped whenever geometry changes, so renders and badges react. */
  const revision = useState<number>('masks:revision', () => 0)

  const masks = computed<MaskRegion[]>(() => {
    const id = activeDocument.value?.id
    return id ? (masksByDoc.value[id] ?? []) : []
  })

  function setMasks(docId: string, next: MaskRegion[]) {
    masksByDoc.value = { ...masksByDoc.value, [docId]: next }
    revision.value++
  }

  function createMask(name?: string): MaskRegion | null {
    const doc = activeDocument.value
    if (!doc) return null
    nextMaskId += 1
    const region: MaskRegion = {
      id: `mask-${nextMaskId}`,
      name: name ?? `Mask ${masks.value.length + 1}`,
      points: [],
      inverted: false,
    }
    setMasks(doc.id, [...masks.value, region])
    return region
  }

  function updateMask(id: string, patch: Partial<MaskRegion>) {
    const doc = activeDocument.value
    if (!doc) return
    setMasks(doc.id, masks.value.map(m => (m.id === id ? { ...m, ...patch } : m)))
  }

  function renameMask(id: string, name: string) {
    updateMask(id, { name })
  }

  function deleteMask(id: string) {
    const doc = activeDocument.value
    if (!doc) return
    rasterCache.delete(`${doc.id}:${id}`)
    setMasks(doc.id, masks.value.filter(m => m.id !== id))
  }

  function clearMask(id: string) {
    updateMask(id, { points: [] })
  }

  function toggleInvert(id: string) {
    const region = masks.value.find(m => m.id === id)
    if (region) updateMask(id, { inverted: !region.inverted })
  }

  function clearAllMasks() {
    const doc = activeDocument.value
    if (!doc) return
    disposeMasksFor(doc.id)
    setMasks(doc.id, [])
  }

  /* ---- Edge field (magnetic mode) -------------------------------------- */

  /**
   * Build the edge field for the current image. Called when magnetic mode is
   * turned on or the image changes — never during a drag.
   */
  async function prepareEdgeMap() {
    const doc = activeDocument.value
    if (!doc) return
    if (edgeMapSrc === doc.working.src && edgeMap) {
      edgeMapReady.value = true
      return
    }
    edgeMapBusy.value = true
    edgeMapReady.value = false
    try {
      edgeMap = await computeEdgeMap(doc.working.src)
      edgeMapSrc = edgeMap ? doc.working.src : null
      edgeMapReady.value = !!edgeMap
    } finally {
      edgeMapBusy.value = false
    }
  }

  function setLassoMode(mode: LassoMode) {
    lassoMode.value = mode
    if (mode === 'magnetic') void prepareEdgeMap()
  }

  /** Apply edge snapping if magnetic mode is on and a field is available. */
  function resolvePoint(point: MaskPoint): MaskPoint {
    if (lassoMode.value !== 'magnetic' || !edgeMap) return point
    return snapToEdge(edgeMap, point, magnetStrength.value)
  }

  /* ---- Lasso drawing --------------------------------------------------- */

  function beginLasso(point: MaskPoint) {
    draft.value = [resolvePoint(point)]
    drawing.value = true
  }

  function extendLasso(rawPoint: MaskPoint) {
    if (!drawing.value) return
    const point = resolvePoint(rawPoint)
    const last = draft.value.at(-1)
    // Thin the path as it is drawn; a point per mouse event is far more
    // detail than the polygon needs and makes vertex editing unusable.
    // Measured against the RAW cursor, not the snapped point — otherwise a
    // snap that lands on the previous vertex stalls the path completely.
    if (last && Math.hypot(rawPoint.x - last.x, rawPoint.y - last.y) < MIN_POINT_GAP) return
    draft.value = [...draft.value, point]
  }

  /**
   * Close the path and commit it. The polygon closes automatically — the last
   * point joins the first with a straight line if the user did not return to
   * where they started, which is the standard lasso behaviour.
   */
  function commitLasso(maskId: string) {
    const points = draft.value
    draft.value = []
    drawing.value = false
    if (points.length < 3) return false
    updateMask(maskId, { points })
    return true
  }

  function cancelLasso() {
    draft.value = []
    drawing.value = false
  }

  /** Reshape a completed selection by dragging one of its vertices. */
  function moveVertex(maskId: string, index: number, point: MaskPoint) {
    const region = masks.value.find(m => m.id === maskId)
    if (!region || index < 0 || index >= region.points.length) return
    const points = region.points.slice()
    points[index] = point
    updateMask(maskId, { points })
  }

  function removeVertex(maskId: string, index: number) {
    const region = masks.value.find(m => m.id === maskId)
    if (!region || region.points.length <= 3) return
    updateMask(maskId, { points: region.points.filter((_, i) => i !== index) })
  }

  return {
    masks,
    showOverlay,
    draft,
    drawing,
    revision,
    lassoMode,
    magnetStrength,
    edgeMapReady,
    edgeMapBusy,
    setLassoMode,
    prepareEdgeMap,
    createMask,
    renameMask,
    deleteMask,
    clearMask,
    clearAllMasks,
    toggleInvert,
    beginLasso,
    extendLasso,
    commitLasso,
    cancelLasso,
    moveVertex,
    removeVertex,
    maskHasContent,
  }
}
