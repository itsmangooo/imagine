<script setup lang="ts">
import type { AdjustmentId } from '~/composables/useFilters'

/**
 * Selective colour grading: the spec's four controls, applied only inside the
 * targeted mask. They are a subset of the same adjustment vocabulary Filters
 * writes into, so a region tuned here and a region tuned in Filters are the
 * same layer rather than two that stack.
 */
const GRADING_CONTROLS: { id: AdjustmentId; label: string }[] = [
  { id: 'hue', label: 'Hue' },
  { id: 'saturation', label: 'Saturation' },
  { id: 'brightness', label: 'Luminance' },
  { id: 'temperature', label: 'Temperature' },
]

const { hasImage } = useEditor()
const { masks } = useMasks()
const { targetMaskId, values, isNeutral, setAdjustment, resetLayer } = useAdjustmentTarget('grading')

function defFor(id: AdjustmentId) {
  return ADJUSTMENTS.find(a => a.id === id)!
}
</script>

<template>
  <div v-if="!hasImage" class="hint">Open an image to grade it.</div>

  <div v-else class="grading">
    <EditorMaskControls tool="grading" />

    <div v-if="!targetMaskId" class="notice">
      <UiIcon name="info" :size="15" />
      <p>
        Grading works on a selected region.
        {{ masks.length ? 'Pick a mask above' : 'Create a mask above' }}, lasso around the area, then adjust.
      </p>
    </div>

    <template v-else>
      <section class="group">
        <p class="group__label">Adjustments</p>
        <div class="group__body">
          <UiSlider
            v-for="control in GRADING_CONTROLS"
            :key="control.id"
            :model-value="values[control.id]"
            :label="control.label"
            :min="defFor(control.id).min"
            :max="defFor(control.id).max"
            :step="defFor(control.id).step"
            @update:model-value="setAdjustment(control.id, $event)"
          />
        </div>
      </section>

      <UiButton variant="secondary" block icon="reset" :disabled="isNeutral" @click="resetLayer">
        Reset this region
      </UiButton>
    </template>
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

.grading {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.notice {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

.notice p {
  min-width: 0;
}

.group__label {
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
  margin-bottom: var(--space-4);
}

.group__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
