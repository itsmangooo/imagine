import type { FabricImage } from 'fabric'
import type { MaskPoint } from './useMasks'

/**
 * Lifting a masked region into a movable piece.
 *
 * The original image is left completely untouched underneath — nothing is
 * erased. The lifted piece renders semi-transparently so that is obvious at a
 * glance, rather than needing a tooltip to explain why the content still
 * appears in two places.
 */

/** Opacity of a lifted piece. Tunable — see the note above on why it is < 1. */
export const MOVED_PIECE_OPACITY = 0.33

export interface MovedPiece {
  id: string
  /** The mask this was lifted from, so it is never lifted twice. */
  maskId: string
  /**
   * The polygon at the moment of extraction, normalised.
   *
   * Snapshotted deliberately: editing the mask afterwards must not retroactively
   * reshape a piece that has already been lifted and moved.
   */
  points: MaskPoint[]
  /** Bounding box of those points, normalised, at extraction time. */
  origin: { x: number; y: number; w: number; h: number }
  /** Current top-left of the piece, normalised against the image. */
  x: number
  y: number
}

/** Live Fabric objects for pieces, and per-document undo history. */
const pieceObjects = new Map<string, FabricImage>()
const undoStacks = new Map<string, MovedPiece[][]>()
let syncing = false

export function isSyncingPieces() {
  return syncing
}

let nextPieceId = 0

function boundsOf(points: MaskPoint[]) {
  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

/**
 * Cut the polygon out of an image into its own canvas, at the given resolution.
 * Shared by the on-screen preview and by export, so the two cannot diverge.
 */
export async function renderPiece(
  src: string,
  piece: MovedPiece,
  imageWidth: number,
  imageHeight: number,
): Promise<HTMLCanvasElement | null> {
  const img = await loadImage(src)
  const { origin, points } = piece

  const w = Math.max(1, Math.round(origin.w * imageWidth))
  const h = Math.max(1, Math.round(origin.h * imageHeight))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // Clip to the polygon, expressed relative to the bounding box.
  ctx.beginPath()
  points.forEach((p, i) => {
    const px = (p.x - origin.x) * imageWidth
    const py = (p.y - origin.y) * imageHeight
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  ctx.closePath()
  ctx.clip()

  ctx.drawImage(img, -origin.x * imageWidth, -origin.y * imageHeight, imageWidth, imageHeight)
  return canvas
}

export function useMove() {
  const { canvas, imageRect, activeTool } = useEditor()
  const { activeDocument, patchEdits } = useDocuments()
  const { masks } = useMasks()

  const moveMode = useState<boolean>('move:active', () => false)
  const busy = useState<boolean>('move:busy', () => false)

  const pieces = computed<MovedPiece[]>(() => activeDocument.value?.edits.pieces ?? [])
  const canUndo = computed(() => (undoStacks.get(activeDocument.value?.id ?? '') ?? []).length > 0)

  function writePieces(next: MovedPiece[], recordUndo = true) {
    const doc = activeDocument.value
    if (!doc) return
    if (recordUndo) {
      const stack = undoStacks.get(doc.id) ?? []
      undoStacks.set(doc.id, [...stack, pieces.value.map(p => ({ ...p }))])
    }
    patchEdits(edits => ({ ...edits, pieces: next }))
  }

  /** Lift the masked region into a piece that can be dragged. */
  async function liftMask(maskId: string): Promise<boolean> {
    const doc = activeDocument.value
    const mask = masks.value.find(m => m.id === maskId)
    if (!doc || !mask || mask.points.length < 3 || busy.value) return false

    // Already lifted — toggle Move rather than stacking a duplicate copy on
    // top of the first, which is never what pressing the button again means.
    if (pieces.value.some(p => p.maskId === maskId)) {
      moveMode.value = !moveMode.value
      return true
    }

    busy.value = true
    try {
      nextPieceId += 1
      const origin = boundsOf(mask.points)
      const piece: MovedPiece = {
        id: `piece-${nextPieceId}`,
        maskId,
        points: mask.points.map(p => ({ ...p })),
        origin,
        x: origin.x,
        y: origin.y,
      }
      writePieces([...pieces.value, piece])
      moveMode.value = true
      return true
    } finally {
      busy.value = false
    }
  }

  function removePiece(id: string) {
    writePieces(pieces.value.filter(p => p.id !== id))
  }

  function undo() {
    const doc = activeDocument.value
    if (!doc) return
    const stack = (undoStacks.get(doc.id) ?? []).slice()
    const previous = stack.pop()
    if (!previous) return
    undoStacks.set(doc.id, stack)
    writePieces(previous, false)
  }

  /* ---- Fabric reconciliation ------------------------------------------ */

  async function syncToCanvas() {
    const c = canvas.value
    const doc = activeDocument.value
    if (!c) return
    const { FabricImage } = await import('fabric')

    syncing = true
    try {
      const wanted = new Set(pieces.value.map(p => p.id))
      for (const [id, obj] of pieceObjects) {
        if (!wanted.has(id)) {
          c.remove(obj)
          pieceObjects.delete(id)
        }
      }
      if (!doc) return

      const rect = imageRect.value
      // Pieces are only draggable while Move is on; otherwise they are inert
      // so they cannot be nudged while using another tool.
      const interactive = moveMode.value && (activeTool.value === 'grading' || activeTool.value === 'filters')

      for (const piece of pieces.value) {
        let obj = pieceObjects.get(piece.id)
        if (!obj) {
          const element = await renderPiece(doc.working.src, piece, doc.working.width, doc.working.height)
          if (!element) continue
          obj = new FabricImage(element, { originX: 'left', originY: 'top' })
          ;(obj as unknown as { pieceId: string }).pieceId = piece.id
          pieceObjects.set(piece.id, obj)
          c.add(obj)
        }

        const width = piece.origin.w * rect.width
        const height = piece.origin.h * rect.height
        obj.set({
          left: rect.left + piece.x * rect.width,
          top: rect.top + piece.y * rect.height,
          scaleX: width / (obj.width || 1),
          scaleY: height / (obj.height || 1),
          opacity: MOVED_PIECE_OPACITY,
          selectable: interactive,
          evented: interactive,
          hasControls: false,
        })
        obj.setCoords()
      }

      c.requestRenderAll()
    } finally {
      syncing = false
    }
  }

  /** Write a dragged piece's position back into the document. */
  function commitObject(obj: FabricImage) {
    const pieceId = (obj as unknown as { pieceId?: string }).pieceId
    const rect = imageRect.value
    if (!pieceId || rect.width === 0) return
    writePieces(
      pieces.value.map(p =>
        p.id === pieceId
          ? {
              ...p,
              x: ((obj.left ?? 0) - rect.left) / rect.width,
              y: ((obj.top ?? 0) - rect.top) / rect.height,
            }
          : p,
      ),
    )
  }

  return {
    moveMode,
    busy,
    pieces,
    canUndo,
    liftMask,
    removePiece,
    undo,
    syncToCanvas,
    commitObject,
  }
}
