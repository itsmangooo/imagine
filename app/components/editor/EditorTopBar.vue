<script setup lang="ts">
const { source, hasImage, isEdited } = useEditor()
const { revertActive } = useDocuments()
const { open: exportOpen } = useExport()
</script>

<template>
  <header class="topbar">
    <div class="topbar__file">
      <span v-if="source" class="topbar__name" :title="source.name">{{ source.name }}</span>
      <span v-else class="topbar__name topbar__name--empty">Untitled</span>
      <span v-if="source" class="topbar__dims tabular">{{ source.width }} × {{ source.height }}</span>
      <span v-if="isEdited" class="topbar__badge">Edited</span>
    </div>

    <div class="topbar__actions">
      <UiButton variant="ghost" size="sm" icon-only icon="undo" label="Undo" disabled />
      <UiButton variant="ghost" size="sm" icon-only icon="redo" label="Redo" disabled />
      <div class="topbar__divider" />
      <UiButton variant="ghost" size="sm" icon="reset" :disabled="!isEdited" @click="revertActive">
        Reset
      </UiButton>
      <UiButton variant="primary" size="sm" icon="export" :disabled="!hasImage" @click="exportOpen = true">
        Export
      </UiButton>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-5);
  height: var(--topbar-h);
  flex: none;
  padding: 0 var(--space-5);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
}

.topbar__file {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.topbar__name {
  font-size: var(--text-base);
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.topbar__name--empty {
  color: var(--text-muted);
}

.topbar__dims {
  font-size: var(--text-sm);
  color: var(--text-muted);
  flex: none;
}

.topbar__badge {
  flex: none;
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-line);
  border-radius: var(--radius-xs);
  padding: 1px var(--space-2);
}

.topbar__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: none;
}

.topbar__divider {
  width: 1px;
  height: 20px;
  margin: 0 var(--space-2);
  background: var(--border);
}
</style>
