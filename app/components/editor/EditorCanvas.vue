<script setup lang="ts">
import type { Canvas as FabricCanvas } from 'fabric'

const { canvas, imageObject, fitScale, imageRect, refitToken } = useEditor()
const { activeDocument, addImage } = useDocuments()
const { renderNow } = useRender()

const frameEl = ref<HTMLDivElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const fileEl = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const loading = ref(false)

/** Breathing room between the image and the frame edge, in canvas pixels. */
const PADDING = 32

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

/** Match the Fabric canvas to its frame, then re-fit whatever is loaded. */
function syncSize() {
  const c = canvas.value
  const frame = frameEl.value
  if (!c || !frame) return

  const rect = frame.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))
  if (c.getWidth() === width && c.getHeight() === height) return

  c.setDimensions({ width, height })
  fitImage()
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
    fitImage()
    await renderNow()
  } finally {
    loading.value = false
  }
}

/**
 * Scale the rendered element to fit the frame. Display only — crop and export
 * both work from the document's own full-resolution source.
 */
function fitImage() {
  const c = canvas.value
  const img = imageObject.value
  const doc = activeDocument.value
  if (!c || !img || !doc) return

  const cw = c.getWidth()
  const ch = c.getHeight()
  const iw = img.width ?? 1
  const ih = img.height ?? 1

  const scale = Math.min((cw - PADDING * 2) / iw, (ch - PADDING * 2) / ih)
  img.set({ scaleX: scale, scaleY: scale, left: cw / 2, top: ch / 2 })
  img.setCoords()

  const drawnW = iw * scale
  const drawnH = ih * scale

  // Reported against the SOURCE, not the rendered element — the composite runs
  // at preview resolution, so element scale would understate the real zoom.
  fitScale.value = drawnW / doc.working.width

  // Publish where the image actually sits so overlays (crop handles, mask
  // lasso) can position against it without reaching into Fabric themselves.
  imageRect.value = {
    left: (cw - drawnW) / 2,
    top: (ch - drawnH) / 2,
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

/* ---- Lifecycle -------------------------------------------------------- */

let observer: ResizeObserver | null = null

onMounted(async () => {
  await initCanvas()
  observer = new ResizeObserver(() => syncSize())
  if (frameEl.value) observer.observe(frameEl.value)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  const c = canvas.value as FabricCanvas | null
  c?.dispose()
  canvas.value = null
  imageObject.value = null
})

// Switching documents, or baking a crop into one, needs a fresh Fabric object.
watch(() => [activeDocument.value?.id, activeDocument.value?.working.src].join('|'), () => {
  void mountDocument()
})

// The render pipeline swaps the element for one at preview resolution, so the
// fit has to be recomputed once the new element is in place.
watch(refitToken, () => fitImage())
</script>

<template>
  <div class="stage">
    <div
      ref="frameEl"
      class="frame"
      :class="{ 'frame--dragging': dragging }"
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
