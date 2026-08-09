<script setup lang="ts">
/**
 * Lasso surface. Shared by Filters and Colour Grading — whichever tool is
 * active passes the mask it is pointed at.
 *
 * Drawn as SVG rather than a canvas: the selection is a polygon, so SVG gives
 * marching ants and draggable vertices for free, at any zoom, with no redraw
 * code of our own.
 */
const props = defineProps<{ maskId: string | null }>()

const { imageRect } = useEditor()
const { masks, showOverlay, draft, drawing, beginLasso, extendLasso, commitLasso, cancelLasso, moveVertex, removeVertex }
  = useMasks()

const region = computed(() => masks.value.find(m => m.id === props.maskId) ?? null)
const draggingVertex = ref<number | null>(null)

/** Normalised points → an SVG points attribute in overlay pixel space. */
function toSvg(points: { x: number; y: number }[]) {
  const r = imageRect.value
  return points.map(p => `${p.x * r.width},${p.y * r.height}`).join(' ')
}

const draftPoints = computed(() => toSvg(draft.value))
const regionPoints = computed(() => (region.value ? toSvg(region.value.points) : ''))

function positionOf(event: PointerEvent, el: HTMLElement) {
  const box = el.getBoundingClientRect()
  return {
    x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)),
    y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)),
  }
}

function onDown(event: PointerEvent) {
  if (!props.maskId || draggingVertex.value !== null) return
  const el = event.currentTarget as HTMLElement
  // Start the path first: capture is an enhancement (it keeps the stroke alive
  // if the cursor leaves the image), not a precondition. It throws when the
  // pointer id is not active, and letting that abort the handler would drop the
  // whole selection.
  beginLasso(positionOf(event, el))
  try {
    el.setPointerCapture(event.pointerId)
  } catch {
    /* pointer already released or not capturable — drawing still works */
  }
}

function onMove(event: PointerEvent) {
  if (!drawing.value) return
  extendLasso(positionOf(event, event.currentTarget as HTMLElement))
}

function onUp(event: PointerEvent) {
  ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)
  if (!drawing.value || !props.maskId) return
  commitLasso(props.maskId)
}

/* ---- Vertex editing --------------------------------------------------- */

function onVertexDown(event: PointerEvent, index: number) {
  event.stopPropagation()
  draggingVertex.value = index
  ;(event.currentTarget as Element).setPointerCapture(event.pointerId)
}

function onVertexMove(event: PointerEvent) {
  if (draggingVertex.value === null || !props.maskId) return
  const surface = (event.currentTarget as Element).closest('.mask') as HTMLElement | null
  if (!surface) return
  moveVertex(props.maskId, draggingVertex.value, positionOf(event, surface))
}

function onVertexUp(event: PointerEvent) {
  ;(event.currentTarget as Element).releasePointerCapture?.(event.pointerId)
  draggingVertex.value = null
}

function onVertexDouble(index: number) {
  if (props.maskId) removeVertex(props.maskId, index)
}

onBeforeUnmount(() => cancelLasso())

const style = computed(() => ({
  left: `${imageRect.value.left}px`,
  top: `${imageRect.value.top}px`,
  width: `${imageRect.value.width}px`,
  height: `${imageRect.value.height}px`,
}))
</script>

<template>
  <div class="mask" :style="style">
    <svg
      class="mask__svg"
      :viewBox="`0 0 ${Math.max(1, imageRect.width)} ${Math.max(1, imageRect.height)}`"
      preserveAspectRatio="none"
    >
      <!-- Committed selection: shaded fill plus marching ants. -->
      <template v-if="region && region.points.length >= 3 && showOverlay">
        <polygon class="shape__fill" :points="regionPoints" />
        <polygon class="shape__ants shape__ants--under" :points="regionPoints" />
        <polygon class="shape__ants" :points="regionPoints" />
      </template>

      <!-- Path being drawn: open polyline, closing edge implied on release. -->
      <template v-if="drawing && draft.length > 1">
        <polyline class="shape__ants shape__ants--under" :points="draftPoints" />
        <polyline class="shape__ants" :points="draftPoints" />
      </template>
    </svg>

    <div
      class="mask__surface"
      :class="{ 'mask__surface--armed': maskId }"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointercancel="onUp"
    />

    <!-- Vertex handles, for reshaping without redrawing from scratch. -->
    <template v-if="region && !drawing && showOverlay">
      <span
        v-for="(point, index) in region.points"
        :key="index"
        class="vertex"
        :class="{ 'is-dragging': draggingVertex === index }"
        :style="{ left: `${point.x * imageRect.width}px`, top: `${point.y * imageRect.height}px` }"
        :title="`Vertex ${index + 1} — drag to reshape, double-click to remove`"
        @pointerdown="onVertexDown($event, index)"
        @pointermove="onVertexMove"
        @pointerup="onVertexUp"
        @dblclick.stop="onVertexDouble(index)"
      />
    </template>
  </div>
</template>

<style scoped>
.mask {
  position: absolute;
  z-index: var(--z-chrome);
}

.mask__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
}

.shape__fill {
  fill: var(--accent);
  fill-opacity: 0.16;
}

/* Two stacked strokes: a dark solid one underneath so the dashes stay legible
   over any image, and the animated white dashes on top. */
.shape__ants {
  fill: none;
  stroke: #fff;
  stroke-width: 1.25;
  stroke-dasharray: 5 4;
  animation: ants 0.6s linear infinite;
}

.shape__ants--under {
  stroke: rgb(0 0 0 / 0.75);
  stroke-dasharray: none;
  animation: none;
}

@keyframes ants {
  to {
    stroke-dashoffset: -9;
  }
}

@media (prefers-reduced-motion: reduce) {
  .shape__ants {
    animation: none;
  }
}

.mask__surface {
  position: absolute;
  inset: 0;
  touch-action: none;
  /* No mask selected means nothing to draw into — let events reach the canvas. */
  pointer-events: none;
  cursor: crosshair;
}

.mask__surface--armed {
  pointer-events: auto;
}

.vertex {
  position: absolute;
  width: 9px;
  height: 9px;
  margin: -5px 0 0 -5px;
  border-radius: 50%;
  background: var(--accent);
  border: 1.5px solid #fff;
  cursor: grab;
  touch-action: none;
}

.vertex.is-dragging {
  cursor: grabbing;
  transform: scale(1.3);
}
</style>
