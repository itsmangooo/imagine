import type { CropRect } from './useCrop'
import type { AdjustmentValues } from './useFilters'
import type { TextLayer } from './useText'
import type { DoodleStroke } from './useDoodle'
import type { MovedPiece } from './useMove'

/**
 * Multi-document workspace.
 *
 * The editor holds several images at once and each carries its OWN edit state,
 * so switching between them preserves what was done to each rather than
 * resetting. Every tool reads and writes through the active document — there is
 * no global "current crop" or "current filters" any more.
 *
 * SCOPE: session-only. Documents live in memory for the life of the page; a
 * reload starts empty. Persisting drafts needs the backend (R2 for the pixels,
 * Postgres for the edit state) and none of that is wired yet, so saving to a
 * server would be inventing an API that does not exist. The state shape here is
 * deliberately serialisable apart from the mask bitmaps, so adding draft
 * persistence later is additive rather than a rewrite.
 */

export interface DocumentImage {
  src: string
  width: number
  height: number
}

export interface AdjustmentLayer {
  values: AdjustmentValues
  presetId: string
}

export interface DocumentEdits {
  crop: { rect: CropRect; presetId: string }
  /** Whole-image adjustments. */
  global: AdjustmentLayer
  /**
   * Adjustments confined to a mask, keyed by mask id.
   *
   * ONE layer per mask, shared by Filters and Colour Grading rather than one
   * set each. Grading's four controls (hue / saturation / luminance /
   * temperature) are a subset of the same twelve-adjustment vocabulary, so two
   * separate stores would mean the same mask could be adjusted twice and
   * stacked — ambiguous to reason about and to render. One store means a mask
   * painted in Filters is immediately meaningful in Grading, which is exactly
   * what the shared-masking requirement asks for.
   */
  masked: Record<string, AdjustmentLayer>
  /** Which mask each tool is pointed at. null = the whole image. */
  targets: { filters: string | null; grading: string | null }
  /** Text layers, back to front. Plain descriptors — see useText. */
  texts: TextLayer[]
  /** Freehand strokes, in draw order. Plain descriptors — see useDoodle. */
  doodles: DoodleStroke[]
  /** Masked regions lifted into draggable pieces — see useMove. */
  pieces: MovedPiece[]
}

export function emptyLayer(): AdjustmentLayer {
  return { values: neutralValues(), presetId: 'none' }
}

export interface EditorDocument {
  id: string
  name: string
  /** As first opened. "Revert to original" returns here. */
  original: DocumentImage
  /** Current working image, after destructive edits (crop) are baked in. */
  working: DocumentImage
  /** Small data URL for the filmstrip. Regenerated when the working image changes. */
  thumb: string
  edits: DocumentEdits
}

export const THUMB_SIZE = 96

let nextId = 0
function makeId() {
  nextId += 1
  return `doc-${nextId}-${Date.now().toString(36)}`
}

export function freshEdits(): DocumentEdits {
  return {
    crop: { rect: { x: 0, y: 0, w: 1, h: 1 }, presetId: 'free' },
    global: emptyLayer(),
    masked: {},
    targets: { filters: null, grading: null },
    texts: [],
    doodles: [],
    pieces: [],
  }
}

/** Render a small centre-cropped thumbnail. Kept tiny — dozens may be alive. */
export async function makeThumbnail(src: string): Promise<string> {
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = THUMB_SIZE
  canvas.height = THUMB_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const side = Math.min(img.naturalWidth, img.naturalHeight)
  const sx = (img.naturalWidth - side) / 2
  const sy = (img.naturalHeight - side) / 2
  ctx.drawImage(img, sx, sy, side, side, 0, 0, THUMB_SIZE, THUMB_SIZE)
  return canvas.toDataURL('image/jpeg', 0.7)
}

export function useDocuments() {
  const documents = useState<EditorDocument[]>('docs:list', () => [])
  const activeId = useState<string | null>('docs:active', () => null)

  const activeDocument = computed(() => documents.value.find(d => d.id === activeId.value) ?? null)
  const count = computed(() => documents.value.length)

  /** A document is "edited" once its working image differs from what was opened. */
  function isDocumentEdited(doc: EditorDocument) {
    if (doc.working.src !== doc.original.src) return true
    const e = doc.edits
    if (Object.values(e.global.values).some(v => v !== 0)) return true
    if (e.texts.length || e.doodles.length || e.pieces.length) return true
    return Object.values(e.masked).some(layer => Object.values(layer.values).some(v => v !== 0))
  }

  function patchActive(patch: (doc: EditorDocument) => EditorDocument) {
    const id = activeId.value
    if (!id) return
    documents.value = documents.value.map(d => (d.id === id ? patch(d) : d))
  }

  /** Replace the active document's edit state (used by every tool). */
  function patchEdits(patch: (edits: DocumentEdits) => DocumentEdits) {
    patchActive(doc => ({ ...doc, edits: patch(doc.edits) }))
  }

  async function addImage(file: File): Promise<EditorDocument | null> {
    if (!file.type.startsWith('image/')) return null

    const src = URL.createObjectURL(file)
    let probe: HTMLImageElement
    try {
      probe = await loadImage(src)
    } catch {
      URL.revokeObjectURL(src)
      return null
    }

    const image: DocumentImage = {
      src,
      width: probe.naturalWidth,
      height: probe.naturalHeight,
    }

    const doc: EditorDocument = {
      id: makeId(),
      name: file.name,
      original: image,
      working: image,
      thumb: await makeThumbnail(src),
      edits: freshEdits(),
    }

    documents.value = [...documents.value, doc]
    activeId.value = doc.id
    return doc
  }

  /**
   * Swap the active document's working image for a baked edit (crop today).
   * The original is untouched so Revert always has somewhere to go.
   */
  async function replaceWorking(next: DocumentImage) {
    const doc = activeDocument.value
    if (!doc) return
    releaseUrl(doc.working.src, next.src, doc.original.src)
    const thumb = await makeThumbnail(next.src)
    patchActive(d => ({ ...d, working: next, thumb }))
  }

  async function revertActive() {
    const doc = activeDocument.value
    if (!doc) return
    releaseUrl(doc.working.src, doc.original.src)
    const thumb = await makeThumbnail(doc.original.src)
    patchActive(d => ({ ...d, working: d.original, thumb, edits: freshEdits() }))
  }

  function selectDocument(id: string) {
    if (documents.value.some(d => d.id === id)) activeId.value = id
  }

  function removeDocument(id: string) {
    const doc = documents.value.find(d => d.id === id)
    if (!doc) return

    releaseUrl(doc.working.src, doc.original.src)
    releaseUrl(doc.original.src)
    disposeMasksFor(id)

    const remaining = documents.value.filter(d => d.id !== id)
    documents.value = remaining

    if (activeId.value === id) {
      // Prefer the neighbour that took its place, else the new last one.
      const index = documents.value.findIndex(d => d.id === id)
      activeId.value = remaining[Math.max(0, index)]?.id ?? remaining.at(-1)?.id ?? null
    }
  }

  return {
    documents,
    activeId,
    activeDocument,
    count,
    isDocumentEdited,
    addImage,
    replaceWorking,
    revertActive,
    selectDocument,
    removeDocument,
    patchEdits,
  }
}

/** Revoke an object URL unless something else still points at it. */
function releaseUrl(url: string | undefined, ...keep: (string | undefined)[]) {
  if (!url || !url.startsWith('blob:')) return
  if (keep.includes(url)) return
  URL.revokeObjectURL(url)
}
