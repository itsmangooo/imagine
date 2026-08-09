<script setup lang="ts">
import type { CropRect, HandleId } from '~/composables/useCrop'

const { imageRect, hasImage } = useEditor()
const { rect, screenRect, showGrid, move, resize } = useCrop()

const dragging = ref(false)

interface DragState {
  mode: 'move' | HandleId
  startX: number
  startY: number
  startRect: CropRect
}

let drag: DragState | null = null

function begin(event: PointerEvent, mode: 'move' | HandleId) {
  if (!hasImage.value || imageRect.value.width === 0) return
  event.preventDefault()
  event.stopPropagation()
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  drag = { mode, startX: event.clientX, startY: event.clientY, startRect: { ...rect.value } }
  dragging.value = true
}

function onMove(event: PointerEvent) {
  if (!drag) return
  const ir = imageRect.value
  if (ir.width === 0 || ir.height === 0) return

  // Screen delta → normalised delta, so the maths never depends on zoom.
  const dx = (event.clientX - drag.startX) / ir.width
  const dy = (event.clientY - drag.startY) / ir.height

  if (drag.mode === 'move') move(dx, dy, drag.startRect)
  else resize(drag.mode, dx, dy, drag.startRect)
}

function end(event: PointerEvent) {
  if (!drag) return
  ;(event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId)
  drag = null
  dragging.value = false
}

const CURSORS: Record<HandleId, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
}

const style = computed(() => ({
  left: `${screenRect.value.left}px`,
  top: `${screenRect.value.top}px`,
  width: `${screenRect.value.width}px`,
  height: `${screenRect.value.height}px`,
}))
</script>

<template>
  <!-- overflow:hidden is load-bearing: the dimming box-shadow is 9999px wide
       and would darken the entire page if it were allowed to escape. -->
  <div v-if="hasImage" class="crop" :class="{ 'crop--dragging': dragging }">
    <div class="crop__rect" :style="style" @pointerdown="begin($event, 'move')" @pointermove="onMove" @pointerup="end" @pointercancel="end">
      <div v-if="showGrid" class="crop__grid" aria-hidden="true">
        <span /><span /><span /><span />
      </div>

      <span v-for="h in CROP_HANDLES" :key="h" class="handle" :class="[`handle--${h}`, { 'handle--corner': h.length === 2 }]" :style="{ cursor: CURSORS[h] }" @pointerdown.stop="begin($event, h)" @pointermove="onMove" @pointerup="end" @pointercancel="end" />
    </div>
  </div>
</template>

<style scoped>
.crop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: var(--z-chrome);
  /* The dimmed surround is decoration — it must not swallow events meant for
     the canvas beneath it, and dragging across it must not start a native text
     selection (which visibly highlights the surrounding panels). */
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
}

.crop__rect {
  position: absolute;
  pointer-events: auto;
  cursor: move;
  /* "Dim only outside the selection, moderately" — 42% reads clearly without
     making the surrounding image unreadable while composing the shot. */
  box-shadow: 0 0 0 9999px rgb(0 0 0 / 0.42);
  outline: 1px solid rgb(255 255 255 / 0.55);
  touch-action: none;
}

/* Rule-of-thirds guides, shown while composing and during a drag. */
.crop__grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.35;
  transition: opacity var(--dur-fast) var(--ease);
}

.crop--dragging .crop__grid {
  opacity: 0.6;
}

.crop__grid span {
  position: absolute;
  background: rgb(255 255 255 / 0.7);
}

.crop__grid span:nth-child(1),
.crop__grid span:nth-child(2) {
  top: 0;
  bottom: 0;
  width: 1px;
}

.crop__grid span:nth-child(1) {
  left: 33.333%;
}

.crop__grid span:nth-child(2) {
  left: 66.667%;
}

.crop__grid span:nth-child(3),
.crop__grid span:nth-child(4) {
  left: 0;
  right: 0;
  height: 1px;
}

.crop__grid span:nth-child(3) {
  top: 33.333%;
}

.crop__grid span:nth-child(4) {
  top: 66.667%;
}

/* ---- Handles ---------------------------------------------------------
   Corners are viewfinder brackets — the same motif as the logo, and the
   conventional crop affordance. Edges are plain bars. Hit areas are padded
   well beyond the visible mark so they stay grabbable. */
.handle {
  position: absolute;
  touch-action: none;
}

.handle--corner {
  width: 22px;
  height: 22px;
  border: 2px solid var(--accent);
}

.handle--nw {
  top: -2px;
  left: -2px;
  border-right: none;
  border-bottom: none;
  border-top-left-radius: 3px;
}

.handle--ne {
  top: -2px;
  right: -2px;
  border-left: none;
  border-bottom: none;
  border-top-right-radius: 3px;
}

.handle--se {
  bottom: -2px;
  right: -2px;
  border-left: none;
  border-top: none;
  border-bottom-right-radius: 3px;
}

.handle--sw {
  bottom: -2px;
  left: -2px;
  border-right: none;
  border-top: none;
  border-bottom-left-radius: 3px;
}

.handle--n,
.handle--s {
  left: 50%;
  width: 34px;
  height: 14px;
  transform: translateX(-50%);
}

.handle--n {
  top: -7px;
}

.handle--s {
  bottom: -7px;
}

.handle--e,
.handle--w {
  top: 50%;
  width: 14px;
  height: 34px;
  transform: translateY(-50%);
}

.handle--e {
  right: -7px;
}

.handle--w {
  left: -7px;
}

/* The visible bar sits inside the padded hit area. */
.handle--n::after,
.handle--s::after,
.handle--e::after,
.handle--w::after {
  content: '';
  position: absolute;
  inset: 0;
  margin: auto;
  background: var(--accent);
  border-radius: var(--radius-pill);
}

.handle--n::after,
.handle--s::after {
  width: 24px;
  height: 3px;
}

.handle--e::after,
.handle--w::after {
  width: 3px;
  height: 24px;
}
</style>
