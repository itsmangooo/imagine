<script setup lang="ts">
const { state, documents, applyLayout } = useCollage()
</script>

<template>
  <div class="bar">
    <UiChip
      v-for="layout in COLLAGE_LAYOUTS"
      :key="layout.id"
      :label="layout.label"
      :hint="layout.slots ? `${layout.slots} images` : 'Free'"
      :active="state.layout === layout.id"
      :disabled="!documents.length"
      @click="applyLayout(layout.id)"
    />
    <p v-if="!documents.length" class="bar__hint">Open some images first.</p>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.bar__hint {
  color: var(--text-muted);
  font-size: var(--text-sm);
  white-space: nowrap;
}
</style>
