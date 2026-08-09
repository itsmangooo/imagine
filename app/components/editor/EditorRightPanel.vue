<script setup lang="ts">
const { activeToolDef, source, fitScale } = useEditor()

const zoomLabel = computed(() => `${Math.round(fitScale.value * 100)}%`)
const dimensions = computed(() =>
  source.value ? `${source.value.width} × ${source.value.height}` : '—',
)
</script>

<template>
  <aside class="panel" aria-label="Tool controls">
    <header class="panel__head">
      <UiIcon :name="activeToolDef.icon" :size="16" />
      <h2 class="panel__title">{{ activeToolDef.label }}</h2>
      <span v-if="activeToolDef.byok" class="panel__tag" title="Uses your own Replicate API key">AI</span>
    </header>

    <div class="panel__body">
      <!-- Each tool mounts its own controls here as it is built. -->
      <slot>
        <div class="placeholder">
          <UiIcon name="info" :size="16" />
          <p>Controls for {{ activeToolDef.label }} appear here.</p>
        </div>
      </slot>
    </div>

    <!-- Persistent across tools: what is actually on the canvas right now. -->
    <footer class="panel__foot">
      <p class="section-label">Image</p>
      <dl class="meta">
        <div class="meta__row">
          <dt>File</dt>
          <dd :title="source?.name">{{ source?.name ?? 'None' }}</dd>
        </div>
        <div class="meta__row">
          <dt>Size</dt>
          <dd class="tabular">{{ dimensions }}</dd>
        </div>
        <div class="meta__row">
          <dt>Zoom</dt>
          <dd class="tabular">{{ source ? zoomLabel : '—' }}</dd>
        </div>
      </dl>
    </footer>
  </aside>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  width: var(--rightbar-w);
  flex: none;
  background: var(--bg-surface);
  border-left: 1px solid var(--border-subtle);
}

.panel__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: var(--topbar-h);
  padding: 0 var(--space-5);
  flex: none;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-secondary);
}

.panel__title {
  flex: 1;
  min-width: 0;
  font-size: var(--text-md);
  font-weight: var(--weight-medium);
  color: var(--text);
}

.panel__tag {
  font-size: 9px;
  font-weight: var(--weight-bold);
  letter-spacing: 0.08em;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-line);
  border-radius: var(--radius-xs);
  padding: 1px 4px;
}

.panel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: var(--space-5);
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-8) var(--space-4);
  text-align: center;
  color: var(--text-muted);
  font-size: var(--text-sm);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
}

.panel__foot {
  flex: none;
  padding: var(--space-5);
  border-top: 1px solid var(--border-subtle);
}

.section-label {
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
  margin-bottom: var(--space-4);
}

.meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
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
  flex: none;
}

.meta__row dd {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
