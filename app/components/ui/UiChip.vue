<script setup lang="ts">
defineProps<{
  label: string
  /** Optional second line — aspect ratios, shortcut hints. */
  hint?: string
  active?: boolean
  disabled?: boolean
  /** Small dot marking a preset whose values have since been hand-tuned. */
  modified?: boolean
}>()
</script>

<template>
  <button
    class="chip"
    :class="{ 'is-active': active, 'chip--stacked': hint }"
    type="button"
    :aria-pressed="active"
    :disabled="disabled"
  >
    <span class="chip__label">{{ label }}</span>
    <span v-if="hint" class="chip__hint tabular">{{ hint }}</span>
    <span v-if="modified" class="chip__dot" title="Adjusted" />
  </button>
</template>

<style scoped>
.chip {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 1px;
  height: 44px;
  padding: 0 var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-raised);
  color: var(--text-secondary);
  white-space: nowrap;
  transition:
    background var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.chip:not(.chip--stacked) {
  justify-content: center;
  align-items: center;
}

.chip:hover:not(:disabled) {
  background: var(--bg-raised-hover);
  border-color: var(--border-strong);
  color: var(--text);
}

.chip.is-active {
  background: var(--accent-soft);
  border-color: var(--accent-line);
  color: var(--accent);
}

.chip:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.chip__label {
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  line-height: 1.2;
}

.chip__hint {
  font-size: var(--text-xs);
  color: var(--text-muted);
  line-height: 1.2;
}

.chip.is-active .chip__hint {
  color: var(--accent);
  opacity: 0.75;
}

.chip__dot {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
}
</style>
