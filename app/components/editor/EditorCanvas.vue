<script setup lang="ts">
import type { Canvas as FabricCanvas } from 'fabric'

const { canvas, imageObject, fitScale, imageRect, refitToken } = useEditor()
const { activeDocument, addImage } = useDocuments()
const { renderNow } = useRender()
const {
  zoom,
  pan,
  panning,
  spaceHeld,
  canPan,
  zoomAtPoint,
  panBy,
  resetForDocument,
  reportCanvasSize,
  toCanvasPoint,
  cancelTween,
} = useZoom()

const frameEl = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const fileEl = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const loading = ref(false)

// Fabric is imported dynamically and only on the client: the module touches
// browser globals, and constructing a canvas during SSR throws outright.
let fabric: typeof import('fabric') | null = null

async function ensureFabric() {
  if (!fabric) fabric = await import('fabric')
  return fabric
}

async function initCanvas() {
  const el = canvasEl.value
  if (!el || canvas.value) return

  const f = await ensureFabric()
  canvas.value = new f.Canvas(el, {
    backgroundColor: 'transparent',
    preserveObjectStacking: true,
    selection: false,
    enableRetinaScaling: true,
  })
  syncSize()
  await mountDocument()
}

/** Match the Fabric canvas to its frame, then re-place whatever is loaded. */
function syncSize() {
  const c = canvas.value
  const frame = frameEl.value
  if (!c || !frame) return

  const rect = frame.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))
  if (c.getWidth() === width && c.getHeight() === height) return

  c.setDimensions({ width, height })
  // Fit zoom is derived from the canvas size, so the zoom layer has to know.
  reportCanvasSize(width, height)
  applyView()
}

/**
 * Put the active document on the canvas. The element created here is only the
 * starting point — the render pipeline immediately replaces it with the
 * composited result (global adjustments plus any masked regions).
 */
async function mountDocument() {
  const c = canvas.value
  if (!c) return

  const doc = activeDocument.value
  if (!doc) {
    c.remove(...c.getObjects())
    imageObject.value = null
    return
  }

  loading.value = true
  try {
    const f = await ensureFabric()
    const element = await loadImage(doc.working.src)
    const img = new f.FabricImage(element, {
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      hasControls: false,
    })

    c.remove(...c.getObjects())
    c.add(img)
    imageObject.value = img
    applyView()
    await renderNow()
  } finally {
    loading.value = false
  }
}

/**
 * Place the rendered element according to the current zoom and pan.
 *
 * Display only — crop and export both work from the document's own
 * full-resolution source, so zooming never affects output.
 */
function applyView() {
  const c = canvas.value
  const img = imageObject.value
  const doc = activeDocument.value
  if (!c || !img || !doc) return

  const cw = c.getWidth()
  const ch = c.getHeight()

  // Zoom is per SOURCE pixel; the Fabric element is the preview composite,
  // which is capped at 2400px — so the element scale has to be derived rather
  // than used as the zoom directly.
  const drawnW = doc.working.width * zoom.value
  const drawnH = doc.working.height * zoom.value
  const scale = drawnW / (img.width ?? 1)

  const centreX = cw / 2 + pan.value.x
  const centreY = ch / 2 + pan.value.y

  img.set({ scaleX: scale, scaleY: scale, left: centreX, top: centreY })
  img.setCoords()

  fitScale.value = zoom.value

  // Publish where the image actually sits so overlays (crop handles, mask
  // lasso, text, doodle) follow the viewport without knowing zoom exists.
  imageRect.value = {
    left: centreX - drawnW / 2,
    top: centreY - drawnH / 2,
    width: drawnW,
    height: drawnH,
  }

  c.requestRenderAll()
}

/* ---- Loading images from disk ---------------------------------------- */

async function acceptFiles(files: FileList | null | undefined) {
  if (!files?.length) return
  // Multi-select adds every file as its own document.
  for (const file of Array.from(files)) await addImage(file)
}

function onDrop(event: DragEvent) {
  dragging.value = false
  acceptFiles(event.dataTransfer?.files)
}

function onPick(event: Event) {
  acceptFiles((event.target as HTMLInputElement).files)
}

/* ---- Zoom & pan interaction ------------------------------------------- */

/**
 * Wheel zoom, anchored on the cursor.
 *
 * Registered natively (not via `@wheel`) so it can be non-passive and stop the
 * page scrolling. Crucially it does NOT touch any in-progress interaction: the
 * lasso stores its points in normalised image space, so changing zoom mid-draw
 * just re-projects them — the path survives.
 */
function onWheel(event: WheelEvent) {
  const frame = frameEl.value
  if (!frame || !activeDocument.value) return
  event.preventDefault()

  // Trackpad pinch arrives as a wheel event with ctrlKey set, and needs a much
  // larger response per unit than a mouse wheel.
  const intensity = event.ctrlKey ? 0.01 : 0.0015
  const factor = Math.exp(-event.deltaY * intensity)
  zoomAtPoint(zoom.value * factor, toCanvasPoint(event, frame), false)
}

let panOrigin: { x: number; y: number } | null = null

/**
 * Pan with middle-drag or space-drag. Bound in the CAPTURE phase so it wins
 * over tool overlays that sit on top of the canvas and would otherwise swallow
 * the press.
 */
function onPointerDownCapture(event: PointerEvent) {
  const wantsPan = event.button === 1 || (spaceHeld.value && event.button === 0)
  if (!wantsPan || !canPan.value) return

  event.preventDefault()
  event.stopPropagation()
  cancelTween()
  panning.value = true
  panOrigin = { x: event.clientX, y: event.clientY }
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}

function onPointerMoveCapture(event: PointerEvent) {
  if (!panning.value || !panOrigin) return
  event.preventDefault()
  event.stopPropagation()
  panBy(event.clientX - panOrigin.x, event.clientY - panOrigin.y)
  panOrigin = { x: event.clientX, y: event.clientY }
}

function onPointerUpCapture(event: PointerEvent) {
  if (!panning.value) return
  event.stopPropagation()
  panning.value = false
  panOrigin = null
  ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)
}

/** Space toggles pan mode. Ignored while typing, or it hijacks the space bar. */
function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

function onKeyDown(event: KeyboardEvent) {
  if (isTyping(event.target)) return
  if (event.code === 'Space' && !event.repeat) {
    spaceHeld.value = true
    event.preventDefault()
  }
}

function onKeyUp(event: KeyboardEvent) {
  if (event.code === 'Space') spaceHeld.value = false
}

/* ---- Lifecycle -------------------------------------------------------- */

let observer: ResizeObserver | null = null

onMounted(async () => {
  await initCanvas()
  observer = new ResizeObserver(() => syncSize())
  if (frameEl.value) observer.observe(frameEl.value)

  const frame = frameEl.value
  if (frame) {
    frame.addEventListener('wheel', onWheel, { passive: false })
    frame.addEventListener('pointerdown', onPointerDownCapture, true)
    frame.addEventListener('pointermove', onPointerMoveCapture, true)
    frame.addEventListener('pointerup', onPointerUpCapture, true)
    frame.addEventListener('pointercancel', onPointerUpCapture, true)
  }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null

  const frame = frameEl.value
  if (frame) {
    frame.removeEventListener('wheel', onWheel)
    frame.removeEventListener('pointerdown', onPointerDownCapture, true)
    frame.removeEventListener('pointermove', onPointerMoveCapture, true)
    frame.removeEventListener('pointerup', onPointerUpCapture, true)
    frame.removeEventListener('pointercancel', onPointerUpCapture, true)
  }
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)

  const c = canvas.value as FabricCanvas | null
  c?.dispose()
  canvas.value = null
  imageObject.value = null
})

// Switching documents, or baking a crop into one, needs a fresh Fabric object.
watch(() => [activeDocument.value?.id, activeDocument.value?.working.src].join('|'), () => {
  void mountDocument()
})

// A different image should not inherit the previous one's zoom.
watch(() => activeDocument.value?.id, () => resetForDocument())

// The render pipeline swaps the element for one at preview resolution, so the
// placement has to be recomputed once the new element is in place.
watch(refitToken, () => applyView())

// Zoom and pan are the only inputs to where the image sits.
watch([zoom, pan], () => applyView(), { deep: true })
</script>

<template>
  <div class="stage">
    <div
      ref="frameEl"
      class="frame"
      :class="{
        'frame--dragging': dragging,
        'frame--pan-ready': spaceHeld && canPan,
        'frame--panning': panning,
      }"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <canvas ref="canvasEl" class="frame__canvas" />

      <!-- Tool overlays (crop handles, mask lasso) sit above the canvas but
           inside the frame, so they clip with it. -->
      <slot name="overlay" />

      <div v-if="!activeDocument" class="empty">
        <div class="empty__mark">
          <UiIcon name="image" :size="26" />
        </div>
        <p class="empty__title">Drop an image to start</p>
        <p class="empty__hint">PNG, JPG or WEBP — add as many as you like</p>
        <div class="empty__actions">
          <UiButton variant="primary" icon="upload" @click="fileEl?.click()">Open images</UiButton>
          <UiButton variant="secondary" icon="generate" disabled>Generate</UiButton>
        </div>
        <input ref="fileEl" type="file" accept="image/*" multiple class="visually-hidden" @change="onPick">
      </div>

      <div v-else-if="loading" class="loading">Loading…</div>
    </div>
  </div>
</template>

<style scoped>
.stage {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: grid;
  place-items: center;
  padding: var(--space-5);
  background: var(--bg-app);
}

/* Spec: 65% of viewport width, 90% of the available height. Clamped so the
   frame never overflows its column on a narrower window. */
.frame {
  position: relative;
  width: min(var(--canvas-w), 100%);
  height: var(--canvas-h);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-sunken);
  overflow: hidden;
  transition: border-color var(--dur-fast) var(--ease);
}

.frame--dragging {
  border-color: var(--accent);
  background: var(--accent-faint);
}

/* Pan affordance. `!important` because tool overlays set their own cursor on
   children, and while space is held panning outranks whatever tool is active. */
.frame--pan-ready,
.frame--pan-ready * {
  cursor: grab !important;
}

.frame--panning,
.frame--panning * {
  cursor: grabbing !important;
}

/* Fabric wraps the element in .canvas-container and positions it absolutely;
   the wrapper needs to fill the frame or the canvas sits at its natural size. */
.frame :deep(.canvas-container) {
  position: absolute !important;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
}

.frame__canvas {
  display: block;
}

.empty,
.loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  pointer-events: none;
}

.empty > * {
  pointer-events: auto;
}

.empty__mark {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-muted);
  margin-bottom: var(--space-2);
}

.empty__title {
  font-size: var(--text-md);
  font-weight: var(--weight-medium);
  color: var(--text);
}

.empty__hint {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.empty__actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.loading {
  color: var(--text-muted);
  font-size: var(--text-sm);
}
</style>
