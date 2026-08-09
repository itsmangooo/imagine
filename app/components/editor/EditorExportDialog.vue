<script setup lang="ts">
const { open, format, quality, busy, error, formatDef, outputSize, filename, download } = useExport()

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) open.value = false
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div v-if="open" class="scrim" @click.self="open = false">
    <div class="dialog" role="dialog" aria-modal="true" aria-label="Export image">
      <header class="dialog__head">
        <h2 class="dialog__title">Export</h2>
        <button class="dialog__close" type="button" aria-label="Close" @click="open = false">
          <UiIcon name="close" :size="16" />
        </button>
      </header>

      <div class="dialog__body">
        <section>
          <p class="label">Format</p>
          <div class="formats">
            <UiChip
              v-for="f in EXPORT_FORMATS"
              :key="f.id"
              :label="f.label"
              :active="format === f.id"
              @click="format = f.id"
            />
          </div>
        </section>

        <section v-if="formatDef.lossy">
          <UiSlider
            :model-value="quality"
            label="Quality"
            :min="0.4"
            :max="1"
            :step="0.01"
            :default="0.92"
            @update:model-value="quality = $event"
          />
        </section>

        <dl class="meta">
          <div class="meta__row">
            <dt>Size</dt>
            <dd class="tabular">{{ outputSize.width }} × {{ outputSize.height }}</dd>
          </div>
          <div class="meta__row">
            <dt>File</dt>
            <dd :title="filename">{{ filename }}</dd>
          </div>
        </dl>

        <p class="note">
          Rendered at full source resolution — adjustments, masked regions, drawing and text are
          re-composited rather than copied from the preview.
        </p>

        <p v-if="error" class="error">{{ error }}</p>
      </div>

      <footer class="dialog__foot">
        <UiButton variant="ghost" @click="open = false">Cancel</UiButton>
        <UiButton variant="primary" icon="export" :disabled="busy" @click="download">
          {{ busy ? 'Rendering…' : 'Download' }}
        </UiButton>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: grid;
  place-items: center;
  background: var(--bg-overlay);
  padding: var(--space-5);
}

.dialog {
  width: min(420px, 100%);
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
  overflow: hidden;
}

.dialog__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}

.dialog__title {
  font-size: var(--text-lg);
  font-weight: var(--weight-medium);
}

.dialog__close {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
}

.dialog__close:hover {
  background: var(--bg-raised);
  color: var(--text);
}

.dialog__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-5);
}

.label {
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
  margin-bottom: var(--space-3);
}

.formats {
  display: flex;
  gap: var(--space-3);
}

.meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-subtle);
}

.meta__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  font-size: var(--text-sm);
}

.meta__row dt {
  color: var(--text-muted);
}

.meta__row dd {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: var(--leading-normal);
}

.error {
  font-size: var(--text-sm);
  color: var(--danger);
}

.dialog__foot {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-5);
  border-top: 1px solid var(--border-subtle);
}
</style>
