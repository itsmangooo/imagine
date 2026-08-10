<script setup lang="ts">
useHead({ title: 'Editor — Imagine' })

const { activeTool, canvas, imageRect } = useEditor()
const { zoomIn, zoomOut, fitToScreen, actualSize } = useZoom()
const { activeDocument, documents: documentList } = useDocuments()
const { scheduleRender } = useRender()
const { syncToCanvas, commitObject, handleMoving, hideGuides, selectedId } = useText()
const {
  settings: doodleSettings,
  strokes: doodleStrokes,
  adoptPath,
  syncToCanvas: syncDoodle,
  syncBrush,
} = useDoodle()
const {
  state: collageState,
  frameRect: collageRect,
  syncToCanvas: syncCollage,
  commitObject: commitCollage,
} = useCollage()
const {
  moveMode,
  pieces,
  syncToCanvas: syncPieces,
  commitObject: commitPiece,
} = useMove()

/** Which mask the active tool is painting into, if any. */
const { targetMaskId: filtersTarget } = useAdjustmentTarget('filters')
const { targetMaskId: gradingTarget } = useAdjustmentTarget('grading')

const paintTarget = computed(() => {
  if (activeTool.value === 'filters') return filtersTarget.value
  if (activeTool.value === 'grading') return gradingTarget.value
  return null
})

const showMaskOverlay = computed(() => activeTool.value === 'filters' || activeTool.value === 'grading')

// Switching documents, or baking a crop, means the on-canvas Fabric object was
// rebuilt with an empty filter chain — the composite has to be redrawn or the
// adjustments belonging to that document silently vanish. Watched here once,
// rather than in every component that renders.
watch(
  () => [activeDocument.value?.id, activeDocument.value?.working.src].join('|'),
  () => scheduleRender(),
)

/* ---- Zoom keyboard shortcuts -------------------------------------------
   Standard conventions. Bound once here rather than in the zoom bar, so they
   work regardless of which panel has focus. */
function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

function onZoomKey(event: KeyboardEvent) {
  if (isTypingTarget(event.target)) return
  const mod = event.ctrlKey || event.metaKey

  if (mod && event.key === '0') {
    event.preventDefault()
    fitToScreen()
    return
  }
  if (mod && event.key === '1') {
    event.preventDefault()
    actualSize()
    return
  }
  // Accept both the bare key and the modified form; '=' is the unshifted '+'.
  if (event.key === '+' || event.key === '=') {
    event.preventDefault()
    zoomIn()
    return
  }
  if (event.key === '-' || event.key === '_') {
    event.preventDefault()
    zoomOut()
  }
}

onMounted(() => window.addEventListener('keydown', onZoomKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onZoomKey))

/* ---- Text <-> Fabric bridge -------------------------------------------
   Wired here once. Doing it inside the panel would re-register handlers
   every time the tool changed. */
function layerIdOf(target: unknown) {
  return (target as { layerId?: string } | undefined)?.layerId ?? null
}

watch(
  canvas,
  c => {
    if (!c) return
    c.on('object:moving', e => void handleMoving(e.target as never))
    c.on('object:modified', (e) => {
      hideGuides()
      // Collage cells, lifted pieces and text layers all live on this canvas;
      // route by the marker property each attaches to its object.
      const target = e.target as unknown as { cellId?: string; pieceId?: string }
      if (target?.cellId) commitCollage(e.target as never)
      else if (target?.pieceId) commitPiece(e.target as never)
      else commitObject(e.target as never)
    })
    c.on('selection:created', e => {
      if (!isSyncingText()) selectedId.value = layerIdOf(e.selected?.[0])
    })
    c.on('selection:updated', e => {
      if (!isSyncingText()) selectedId.value = layerIdOf(e.selected?.[0])
    })
    c.on('selection:cleared', () => {
      if (!isSyncingText()) selectedId.value = null
    })

    // Fabric hands back the finished Path; we store it normalised and let the
    // reconciler re-add it, so the live object is discarded here.
    c.on('path:created', (e) => {
      const path = (e as unknown as { path: never }).path
      c.remove(path)
      adoptPath(path)
    })
  },
  { immediate: true },
)

// Text objects are positioned from normalised values against the image, so any
// change to the layers, the image box, the tool or the selection needs a resync.
watch(
  [() => activeDocument.value?.edits.texts, imageRect, activeTool, selectedId],
  () => void syncToCanvas(),
  { deep: true },
)

// Strokes are stored normalised too, so they re-scale with the image box.
watch(
  [doodleStrokes, imageRect, () => activeDocument.value?.id],
  () => void syncDoodle(),
  { deep: true },
)

// Drawing mode and brush size follow the active tool and the settings.
watch(
  [activeTool, doodleSettings, imageRect, canvas],
  () => void syncBrush(),
  { deep: true, immediate: true },
)

// Lifted pieces are positioned from imageRect like every other overlay, so
// they follow zoom and pan for free.
watch(
  [pieces, imageRect, moveMode, activeTool, () => activeDocument.value?.id],
  () => void syncPieces(),
  { deep: true },
)

// Collage composes across documents, so it reacts to its own state and the
// document list rather than to the active document.
watch(
  [collageState, collageRect, activeTool, canvas, () => documentList.value.length],
  () => void syncCollage(),
  { deep: true },
)
</script>

<template>
  <div class="editor">
    <EditorTopBar class="editor__top" />
    <EditorFilmstrip class="editor__strip" />

    <EditorCanvas class="editor__stage">
      <template #overlay>
        <EditorCropOverlay v-if="activeTool === 'crop'" />
        <EditorMaskOverlay v-else-if="showMaskOverlay" :mask-id="paintTarget" />
      </template>
    </EditorCanvas>

    <EditorBottomBar class="editor__bottom">
      <EditorCropBottomBar v-if="activeTool === 'crop'" />
      <EditorFiltersBottomBar v-else-if="activeTool === 'filters'" />
      <EditorTextBottomBar v-else-if="activeTool === 'text'" />
      <EditorCollageBottomBar v-else-if="activeTool === 'collage'" />
    </EditorBottomBar>

    <EditorRightPanel class="editor__right">
      <EditorCropPanel v-if="activeTool === 'crop'" />
      <EditorFiltersPanel v-else-if="activeTool === 'filters'" />
      <EditorGradingPanel v-else-if="activeTool === 'grading'" />
      <EditorTextPanel v-else-if="activeTool === 'text'" />
      <EditorDoodlePanel v-else-if="activeTool === 'doodle'" />
      <EditorCollagePanel v-else-if="activeTool === 'collage'" />
      <EditorAudioPanel v-else-if="activeTool === 'audio'" />
      <EditorGeneratePanel v-else-if="activeTool === 'generate'" />
      <EditorAutoEditPanel v-else-if="activeTool === 'autoedit'" />
    </EditorRightPanel>

    <EditorExportDialog />
  </div>
</template>

<style scoped>
/* Right panel spans every row so it reads as a full-height sidebar, while the
   bottom bar stays tied to the canvas column it describes. */
.editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  height: 100%;
  min-height: 0;
}

.editor__top {
  grid-column: 1;
  grid-row: 1;
}

.editor__strip {
  grid-column: 1;
  grid-row: 2;
}

.editor__stage {
  grid-column: 1;
  grid-row: 3;
  min-height: 0;
}

.editor__bottom {
  grid-column: 1;
  grid-row: 4;
}

.editor__right {
  grid-column: 2;
  grid-row: 1 / -1;
}
</style>
