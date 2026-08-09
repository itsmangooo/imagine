<script setup lang="ts">
import type { IconName } from './UiIcon.vue'

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md'
    icon?: IconName
    iconRight?: IconName
    /** Icon with no visible label — renders square. Pass `label` for a11y. */
    iconOnly?: boolean
    label?: string
    disabled?: boolean
    active?: boolean
    block?: boolean
    type?: 'button' | 'submit'
  }>(),
  { variant: 'secondary', size: 'md', type: 'button' },
)
</script>

<template>
  <button
    class="btn"
    :class="[`btn--${variant}`, `btn--${size}`, { 'btn--icon-only': iconOnly, 'btn--block': block, 'is-active': active }]"
    :type="type"
    :disabled="disabled"
    :aria-label="iconOnly ? label : undefined"
    :aria-pressed="active === undefined ? undefined : active"
    :title="iconOnly ? label : undefined"
  >
    <span class="btn__content">
      <UiIcon v-if="icon" :name="icon" :size="size === 'sm' ? 15 : 17" />
      <slot />
      <UiIcon v-if="iconRight" :name="iconRight" :size="size === 'sm' ? 15 : 17" />
    </span>
  </button>
</template>

<style scoped>
.btn {
  --btn-bg: transparent;
  --btn-fg: var(--text);
  --btn-border: transparent;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  border: 1px solid var(--btn-border);
  background: var(--btn-bg);
  color: var(--btn-fg);
  font-weight: var(--weight-medium);
  letter-spacing: 0;
  white-space: nowrap;
  transition:
    background var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease);
}

/* Without this, an icon + label pair wraps into a vertical stack. */
.btn__content {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  white-space: nowrap;
}

.btn--md {
  height: 36px;
  padding: 0 var(--space-5);
  font-size: var(--text-base);
}

.btn--sm {
  height: 30px;
  padding: 0 var(--space-4);
  font-size: var(--text-sm);
}

.btn--icon-only.btn--md {
  width: 36px;
  padding: 0;
}

.btn--icon-only.btn--sm {
  width: 30px;
  padding: 0;
}

.btn--block {
  width: 100%;
}

/* ---- Variants ---- */

.btn--primary {
  --btn-bg: var(--accent);
  --btn-fg: var(--accent-contrast);
  font-weight: var(--weight-medium);
}

.btn--primary:hover:not(:disabled) {
  --btn-bg: var(--accent-hover);
}

.btn--primary:active:not(:disabled) {
  --btn-bg: var(--accent-press);
}

.btn--secondary {
  --btn-bg: var(--bg-raised);
  --btn-border: var(--border);
}

.btn--secondary:hover:not(:disabled) {
  --btn-bg: var(--bg-raised-hover);
  --btn-border: var(--border-strong);
}

.btn--ghost {
  --btn-fg: var(--text-secondary);
}

.btn--ghost:hover:not(:disabled) {
  --btn-bg: var(--bg-raised);
  --btn-fg: var(--text);
}

.btn--danger {
  --btn-fg: var(--danger);
  --btn-border: var(--border);
  --btn-bg: var(--bg-raised);
}

.btn--danger:hover:not(:disabled) {
  --btn-bg: var(--danger-soft);
  --btn-fg: var(--danger-hover);
}

/* Active/selected state uses the accent as a tint, not a fill — a fully
   filled accent is reserved for the single primary action on screen. */
.btn.is-active:not(.btn--primary) {
  --btn-bg: var(--accent-soft);
  --btn-fg: var(--accent);
  --btn-border: var(--accent-line);
}

.btn:disabled {
  opacity: 0.42;
}
</style>
