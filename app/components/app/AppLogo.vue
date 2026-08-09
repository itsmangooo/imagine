<script setup lang="ts">
/**
 * Signature motif: viewfinder corner brackets. Reused as the selected state of
 * single-select cards elsewhere — deliberately not a checkmark or radio.
 */
withDefaults(defineProps<{ size?: number; wordmark?: boolean }>(), { size: 24, wordmark: true })
</script>

<template>
  <div class="logo">
    <svg
      class="logo__mark"
      :width="size"
      :height="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.9"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8.5V4.5a1.5 1.5 0 0 1 1.5-1.5h4" />
      <path d="M15.5 3h4A1.5 1.5 0 0 1 21 4.5v4" />
      <path d="M21 15.5v4a1.5 1.5 0 0 1-1.5 1.5h-4" />
      <path d="M8.5 21h-4A1.5 1.5 0 0 1 3 19.5v-4" />
      <circle cx="12" cy="12" r="3.25" />
    </svg>
    <span v-if="wordmark" class="logo__word">Imagine</span>
  </div>
</template>

<style scoped>
.logo {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  min-width: 0;
}

.logo__mark {
  color: var(--accent);
  flex: none;
}

.logo__word {
  font-size: var(--text-lg);
  font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-tight);
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
}
</style>
