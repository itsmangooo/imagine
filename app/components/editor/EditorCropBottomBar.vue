<script setup lang="ts">
const { hasImage } = useEditor()
const { presetId, selectPreset } = useCrop()
</script>

<template>
  <div class="presets">
    <UiChip
      v-for="p in CROP_PRESETS"
      :key="p.id"
      :label="p.label"
      :hint="p.hint"
      :active="presetId === p.id"
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
