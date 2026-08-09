<script setup lang="ts">
const { activeToolDef, hasImage } = useEditor()
</script>

<template>
  <div class="bar" role="toolbar" :aria-label="`${activeToolDef.label} options`">
    <div class="bar__tool">
      <UiIcon :name="activeToolDef.icon" :size="15" />
      <span>{{ activeToolDef.label }}</span>
    </div>

    <div class="bar__divider" />

    <div class="bar__options">
      <!-- Contextual sub-options for the active tool are slotted in here. -->
      <slot>
        <p v-if="!hasImage" class="bar__hint">Open an image to begin editing.</p>
        <p v-else class="bar__hint">{{ activeToolDef.label }} options appear here.</p>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  height: var(--bottombar-h);
  flex: none;
  padding: 0 var(--space-5);
  background: var(--bg-surface);
  border-top: 1px solid var(--border-subtle);
}

.bar__tool {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex: none;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  white-space: nowrap;
}

.bar__divider {
  width: 1px;
  height: 24px;
  flex: none;
  background: var(--border);
}

.bar__options {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  overflow-x: auto;
  overflow-y: hidden;
}

.bar__hint {
  color: var(--text-muted);
  font-size: var(--text-sm);
}
</style>
