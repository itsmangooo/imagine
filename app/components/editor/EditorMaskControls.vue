<script setup lang="ts">
/**
 * Mask picker. Shared verbatim by Filters and Colour Grading — there is exactly
 * one masking implementation and both tools mount this.
 */
const props = defineProps<{
  tool: 'filters' | 'grading'
  /** Grading is inherently selective, so it offers no "whole image" option. */
  allowWholeImage?: boolean
}>()

const { masks, showOverlay, drawing, createMask, renameMask, deleteMask, clearMask, toggleInvert, maskHasContent }
  = useMasks()
const { targetMaskId, setTarget } = useAdjustmentTarget(props.tool)

const renaming = ref<string | null>(null)
const renameValue = ref('')

const target = computed(() => masks.value.find(m => m.id === targetMaskId.value) ?? null)

function addMask() {
  const mask = createMask()
  if (mask) setTarget(mask.id)
}

function removeMask(id: string) {
  deleteMask(id)
  if (targetMaskId.value === id) setTarget(null)
}

function startRename(id: string, current: string) {
  renaming.value = id
  renameValue.value = current
}

function commitRename() {
  if (renaming.value && renameValue.value.trim()) renameMask(renaming.value, renameValue.value.trim())
  renaming.value = null
}
</script>

<template>
  <section class="masks">
    <p class="masks__label">Area</p>

    <div class="masks__list">
      <button
        v-if="allowWholeImage"
        class="target"
        type="button"
        :class="{ 'is-active': targetMaskId === null }"
        @click="setTarget(null)"
      >
        <UiIcon name="image" :size="14" />
        <span class="target__name">Whole image</span>
      </button>

      <div v-for="mask in masks" :key="mask.id" class="target-row">
        <button
          class="target"
          type="button"
          :class="{ 'is-active': targetMaskId === mask.id }"
          @click="setTarget(mask.id)"
        >
          <UiIcon name="layers" :size="14" />
          <input
            v-if="renaming === mask.id"
            v-model="renameValue"
            class="target__input"
            @click.stop
            @keydown.enter="commitRename"
            @blur="commitRename"
          >
          <span v-else class="target__name" @dblclick.stop="startRename(mask.id, mask.name)">{{ mask.name }}</span>
          <span v-if="!maskHasContent(mask)" class="target__empty">empty</span>
          <span v-else-if="mask.inverted" class="target__empty">inverted</span>
        </button>
        <button class="target__remove" type="button" :aria-label="`Delete ${mask.name}`" @click="removeMask(mask.id)">
          <UiIcon name="trash" :size="13" />
        </button>
      </div>

      <button class="target target--add" type="button" @click="addMask">
        <UiIcon name="plus" :size="14" />
        <span class="target__name">New mask</span>
      </button>
    </div>

    <div v-if="target" class="lasso">
      <p class="lasso__hint">
        <UiIcon name="info" :size="14" />
        <span v-if="drawing">Release to close the selection.</span>
        <span v-else-if="!maskHasContent(target)">Drag around an object on the canvas to select it.</span>
        <span v-else>Drag a point to reshape. Double-click a point to remove it.</span>
      </p>

      <div class="lasso__ops">
        <UiButton
          variant="secondary"
          size="sm"
          :icon="showOverlay ? 'eye' : 'eye-off'"
          :active="showOverlay"
          @click="showOverlay = !showOverlay"
        >
          Outline
        </UiButton>
        <UiButton
          variant="secondary"
          size="sm"
          :active="target.inverted"
          :disabled="!maskHasContent(target)"
          @click="toggleInvert(target.id)"
        >
          Invert
        </UiButton>
        <UiButton variant="ghost" size="sm" :disabled="!maskHasContent(target)" @click="clearMask(target.id)">
          Clear
        </UiButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.masks {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}

.masks__label {
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
}

.masks__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.target-row {
  display: flex;
  align-items: center;
  gap: 2px;
}

.target {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: 1;
  min-width: 0;
  height: 30px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  text-align: left;
  transition:
    background var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.target:hover {
  background: var(--bg-raised);
  color: var(--text);
}

.target.is-active {
  background: var(--accent-soft);
  color: var(--accent);
}

.target__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.target__input {
  flex: 1;
  min-width: 0;
  background: var(--bg-app);
  border: 1px solid var(--accent-line);
  border-radius: var(--radius-xs);
  padding: 0 var(--space-2);
  font-size: var(--text-sm);
}

.target__empty {
  flex: none;
  font-size: 10px;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  padding: 0 4px;
}

.target--add {
  color: var(--text-muted);
}

.target__remove {
  display: grid;
  place-items: center;
  width: 26px;
  height: 30px;
  flex: none;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
}

.target__remove:hover {
  color: var(--danger);
  background: var(--danger-soft);
}

.lasso {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-subtle);
}

.lasso__hint {
  display: flex;
  gap: var(--space-3);
  color: var(--text-muted);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

.lasso__ops {
  display: flex;
  gap: var(--space-2);
}

.lasso__ops > * {
  flex: 1;
}
</style>
