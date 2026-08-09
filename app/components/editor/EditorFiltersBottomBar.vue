<script setup lang="ts">
const { hasImage } = useEditor()
const { presetId, isModified, selectPreset } = useFilters()
</script>

<template>
  <div class="presets">
    <UiChip
      v-for="p in FILTER_PRESETS"
      :key="p.id"
      :label="p.label"
      :active="presetId === p.id"
      :modified="presetId === p.id && isModified"
      :disabled="!hasImage"
      @click="selectPreset(p.id)"
    />
  </div>
</template>

<style scoped>
.presets {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
</style>
