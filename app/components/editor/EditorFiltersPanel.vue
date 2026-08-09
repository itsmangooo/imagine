<script setup lang="ts">
import type { AdjustmentGroupId } from '~/composables/useFilters'

const { hasImage } = useEditor()
const { masks } = useMasks()
const {
  values,
  presetId,
  targetMaskId,
  isModified,
  isNeutral,
  activeCount,
  openGroups,
  setAdjustment,
  resetLayer,
  toggleGroup,
} = useFilters()

const preset = computed(() => FILTER_PRESETS.find(p => p.id === presetId.value) ?? FILTER_PRESETS[0]!)
const targetName = computed(
  () => masks.value.find(m => m.id === targetMaskId.value)?.name ?? 'Whole image',
)

function groupAdjustments(group: AdjustmentGroupId) {
  return ADJUSTMENTS.filter(a => a.group === group)
}

function groupActive(group: AdjustmentGroupId) {
  return groupAdjustments(group).filter(a => values.value[a.id] !== 0).length
}
</script>

<template>
  <div v-if="!hasImage" class="hint">Open an image to apply filters.</div>

  <div v-else class="filters">
    <!-- Same masking system Colour Grading uses; Filters additionally offers
         the whole image as a target. -->
    <EditorMaskControls tool="filters" allow-whole-image />

    <section class="summary">
      <div class="summary__row">
        <span class="summary__label">Applying to</span>
        <span class="summary__value" :class="{ 'summary__value--masked': targetMaskId }">{{ targetName }}</span>
      </div>
      <div class="summary__row">
        <span class="summary__label">Preset</span>
        <span class="summary__value">
          {{ preset.label }}<span v-if="isModified" class="summary__mod"> · adjusted</span>
        </span>
      </div>
      <div class="summary__row">
        <span class="summary__label">Active</span>
        <span class="summary__value tabular">{{ activeCount }} of {{ ADJUSTMENTS.length }}</span>
      </div>
    </section>

    <section v-for="group in ADJUSTMENT_GROUPS" :key="group.id" class="group">
      <button class="group__head" type="button" :aria-expanded="openGroups[group.id]" @click="toggleGroup(group.id)">
        <UiIcon :name="openGroups[group.id] ? 'chevron-down' : 'chevron-right'" :size="14" />
        <span class="group__label">{{ group.label }}</span>
        <span v-if="groupActive(group.id)" class="group__count tabular">{{ groupActive(group.id) }}</span>
      </button>

      <div v-show="openGroups[group.id]" class="group__body">
        <UiSlider
          v-for="a in groupAdjustments(group.id)"
          :key="a.id"
          :model-value="values[a.id]"
          :label="a.label"
          :min="a.min"
          :max="a.max"
          :step="a.step"
          @update:model-value="setAdjustment(a.id, $event)"
        />
      </div>
    </section>

    <UiButton variant="secondary" block icon="reset" :disabled="isNeutral" @click="resetLayer">
      {{ targetMaskId ? 'Reset this region' : 'Reset all' }}
    </UiButton>
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

.filters {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}

.summary__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  font-size: var(--text-sm);
}

.summary__label {
  color: var(--text-muted);
}

.summary__value {
  color: var(--text);
  font-weight: var(--weight-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary__value--masked {
  color: var(--accent);
}

.summary__mod {
  color: var(--accent);
  font-weight: var(--weight-regular);
}

.group {
  display: flex;
  flex-direction: column;
}

.group__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  height: 30px;
  padding: 0;
  color: var(--text-muted);
  transition: color var(--dur-fast) var(--ease);
}

.group__head:hover {
  color: var(--text);
}

.group__label {
  flex: 1;
  text-align: left;
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
}

.group__count {
  flex: none;
  font-size: var(--text-xs);
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: var(--radius-pill);
  min-width: 18px;
  height: 16px;
  line-height: 16px;
  text-align: center;
  padding: 0 5px;
}

.group__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-3) 0 var(--space-5);
}
</style>
