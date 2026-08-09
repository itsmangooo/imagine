<script setup lang="ts">
const { selected, hasImage, addLayer, applyPreset } = useText()
</script>

<template>
  <div class="bar">
    <UiButton variant="secondary" size="sm" icon="plus" :disabled="!hasImage" @click="addLayer()">
      Add text
    </UiButton>

    <div class="bar__divider" />

    <div class="presets">
      <UiChip
        v-for="preset in TEXT_PRESETS"
        :key="preset.id"
        :label="preset.label"
        :disabled="!selected"
        @click="applyPreset(preset)"
      />
    </div>

    <p v-if="!selected" class="bar__hint">Select a text layer to style it.</p>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.bar__divider {
  width: 1px;
  height: 24px;
  flex: none;
  background: var(--border);
}

.presets {
  display: flex;
  gap: var(--space-3);
}

.bar__hint {
  color: var(--text-muted);
  font-size: var(--text-sm);
  white-space: nowrap;
}
</style>
