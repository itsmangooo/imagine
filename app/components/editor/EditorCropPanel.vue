<script setup lang="ts">
const { hasImage, source, isEdited } = useEditor()
const { revertActive } = useDocuments()
const { rect, preset, showGrid, applying, outputSize, isFullFrame, reset, apply } = useCrop()

/** Offset of the crop within the source, in real pixels. */
const offset = computed(() => {
  const s = source.value
  if (!s) return { x: 0, y: 0 }
  return {
    x: Math.round(rect.value.x * s.width),
    y: Math.round(rect.value.y * s.height),
  }
})

async function onApply() {
  await apply()
}
</script>

<template>
  <div v-if="!hasImage" class="hint">Open an image to crop it.</div>

  <div v-else class="crop-panel">
    <section class="group">
      <p class="group__label">Selection</p>
      <dl class="readout">
        <div class="readout__row">
          <dt>Output</dt>
          <dd class="tabular readout__strong">{{ outputSize.width }} × {{ outputSize.height }}</dd>
        </div>
        <div class="readout__row">
          <dt>Offset</dt>
          <dd class="tabular">{{ offset.x }}, {{ offset.y }}</dd>
        </div>
        <div class="readout__row">
          <dt>Ratio</dt>
          <dd class="tabular">{{ preset.hint }}</dd>
        </div>
      </dl>
    </section>

    <section class="group">
      <p class="group__label">Guides</p>
      <label class="toggle">
        <input v-model="showGrid" type="checkbox" class="visually-hidden">
        <span class="toggle__track" :class="{ 'is-on': showGrid }">
          <span class="toggle__thumb" />
        </span>
        <span class="toggle__label">Rule of thirds</span>
      </label>
    </section>

    <section class="group group--actions">
      <UiButton variant="primary" block icon="crop" :disabled="isFullFrame || applying" @click="onApply">
        {{ applying ? 'Applying…' : 'Apply crop' }}
      </UiButton>
      <UiButton variant="secondary" block icon="reset" :disabled="isFullFrame" @click="reset">
        Reset selection
      </UiButton>
      <UiButton v-if="isEdited" variant="ghost" block icon="undo" @click="revertActive">
        Revert to original
      </UiButton>
      <p v-if="isFullFrame" class="note">Drag a corner or pick a ratio to make a selection.</p>
    </section>
  </div>
</template>

<style scoped>
.hint {
  color: var(--text-muted);
  font-size: var(--text-sm);
  text-align: center;
  padding: var(--space-8) var(--space-4);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
}

.crop-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
}

.group__label {
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
  margin-bottom: var(--space-4);
}

.readout {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.readout__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  font-size: var(--text-sm);
}

.readout__row dt {
  color: var(--text-muted);
}

.readout__row dd {
  color: var(--text-secondary);
}

.readout__strong {
  color: var(--text);
  font-weight: var(--weight-medium);
  font-size: var(--text-md);
}

/* ---- Toggle ---- */
.toggle {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  cursor: pointer;
  font-size: var(--text-base);
  color: var(--text-secondary);
}

.toggle__track {
  position: relative;
  width: 34px;
  height: 20px;
  flex: none;
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
  border: 1px solid var(--border);
  transition:
    background var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}

.toggle__track.is-on {
  background: var(--accent);
  border-color: var(--accent);
}

.toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--text-muted);
  transition:
    transform var(--dur-fast) var(--ease),
    background var(--dur-fast) var(--ease);
}

.toggle__track.is-on .toggle__thumb {
  transform: translateX(14px);
  background: var(--accent-contrast);
}

.toggle input:focus-visible + .toggle__track {
  outline: 2px solid var(--accent-ring);
  outline-offset: 2px;
}

.group--actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.note {
  margin-top: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: var(--leading-normal);
}
</style>
