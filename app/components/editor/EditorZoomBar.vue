<script setup lang="ts">
/**
 * Zoom controls. Canvas-level, so it sits in the top bar and applies to every
 * tool rather than being duplicated per panel.
 */
const { hasImage } = useEditor()
const { percent, isFit, zoomIn, zoomOut, fitToScreen, actualSize, setPercent } = useZoom()

const editing = ref(false)
const draft = ref('')
const inputEl = ref<HTMLInputElement | null>(null)

async function beginEdit() {
  if (!hasImage.value) return
  draft.value = String(percent.value)
  editing.value = true
  await nextTick()
  inputEl.value?.select()
}

function commit() {
  const parsed = Number.parseFloat(draft.value.replace('%', '').trim())
  if (Number.isFinite(parsed) && parsed > 0) setPercent(parsed)
  editing.value = false
}
</script>

<template>
  <div class="zoom" role="group" aria-label="Zoom">
    <UiButton
      variant="ghost"
      size="sm"
      icon-only
      icon="minus"
      label="Zoom out"
      :disabled="!hasImage"
      @click="zoomOut"
    />

    <input
      v-if="editing"
      ref="inputEl"
      v-model="draft"
      class="zoom__input tabular"
      type="text"
      inputmode="decimal"
      aria-label="Zoom percentage"
      @keydown.enter="commit"
      @keydown.esc="editing = false"
      @blur="commit"
    >
    <button
      v-else
      class="zoom__value tabular"
      type="button"
      :disabled="!hasImage"
      title="Click to type an exact zoom"
      @click="beginEdit"
    >
      {{ hasImage ? `${percent}%` : '—' }}
    </button>

    <UiButton
      variant="ghost"
      size="sm"
      icon-only
      icon="plus"
      label="Zoom in"
      :disabled="!hasImage"
      @click="zoomIn"
    />

    <div class="zoom__divider" />

    <UiButton
      variant="ghost"
      size="sm"
      :disabled="!hasImage"
      :active="isFit"
      title="Fit to screen (Ctrl+0)"
      @click="fitToScreen"
    >
      Fit
    </UiButton>
    <UiButton
      variant="ghost"
      size="sm"
      :disabled="!hasImage"
      title="Actual size (Ctrl+1)"
      @click="actualSize"
    >
      100%
    </UiButton>
  </div>
</template>

<style scoped>
.zoom {
  display: flex;
  align-items: center;
  gap: 2px;
}

.zoom__value,
.zoom__input {
  min-width: 54px;
  height: 30px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  text-align: center;
  color: var(--text-secondary);
}

.zoom__value:hover:not(:disabled) {
  background: var(--bg-raised);
  color: var(--text);
}

.zoom__value:disabled {
  color: var(--text-disabled);
  cursor: not-allowed;
}

.zoom__input {
  background: var(--bg-app);
  border: 1px solid var(--accent-line);
  color: var(--text);
}

.zoom__divider {
  width: 1px;
  height: 18px;
  margin: 0 var(--space-2);
  background: var(--border);
}
</style>
