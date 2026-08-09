<script setup lang="ts">
const { settings, strokes, canUndo, canRedo, hasImage, undo, redo, clearAll, update } = useDoodle()
</script>

<template>
  <div v-if="!hasImage" class="hint">Open an image to draw on it.</div>

  <div v-else class="doodle">
    <section class="group">
      <p class="section-label">Tool</p>
      <div class="modes">
        <UiButton
          variant="secondary"
          size="sm"
          icon="doodle"
          :active="!settings.erase"
          @click="update({ erase: false })"
        >
          Draw
        </UiButton>
        <UiButton
          variant="secondary"
          size="sm"
          icon="eraser"
          :active="settings.erase"
          @click="update({ erase: true })"
        >
          Erase
        </UiButton>
      </div>
    </section>

    <section v-if="!settings.erase" class="group">
      <p class="section-label">Colour</p>
      <div class="swatches">
        <button
          v-for="colour in DOODLE_COLORS"
          :key="colour"
          class="swatch"
          :class="{ 'is-active': settings.color.toLowerCase() === colour }"
          :style="{ background: colour }"
          :title="colour"
          @click="update({ color: colour })"
        />
        <label class="swatch swatch--custom" title="Custom colour">
          <input type="color" :value="settings.color" @input="update({ color: ($event.target as HTMLInputElement).value })">
        </label>
      </div>
    </section>

    <section class="group">
      <p class="section-label">Brush</p>
      <UiSlider
        :model-value="settings.width"
        label="Size"
        :min="0.002"
        :max="0.1"
        :step="0.001"
        :default="0.012"
        @update:model-value="update({ width: $event })"
      />
      <UiSlider
        v-if="!settings.erase"
        :model-value="settings.opacity"
        label="Opacity"
        :min="0.05"
        :max="1"
        :step="0.01"
        :default="1"
        @update:model-value="update({ opacity: $event })"
      />
    </section>

    <section class="group">
      <p class="section-label">History</p>
      <div class="history">
        <UiButton variant="secondary" size="sm" icon="undo" :disabled="!canUndo" @click="undo">Undo</UiButton>
        <UiButton variant="secondary" size="sm" icon="redo" :disabled="!canRedo" @click="redo">Redo</UiButton>
      </div>
      <p class="count tabular">{{ strokes.length }} stroke{{ strokes.length === 1 ? '' : 's' }}</p>
      <UiButton variant="danger" size="sm" block icon="trash" :disabled="!strokes.length" @click="clearAll">
        Clear drawing
      </UiButton>
    </section>
  </div>
</template>

<style scoped>
.hint {
  color: var(--text-muted);
  font-size: var(--text-sm);
  text-align: center;
  padding: var(--space-8) var(--space-4);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
}

.doodle {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.section-label {
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
  margin-bottom: var(--space-3);
}

.group {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.modes {
  display: flex;
  gap: var(--space-2);
}

.modes > * {
  flex: 1;
}

.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.swatch {
  width: 26px;
  height: 26px;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border-strong);
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease);
}

.swatch:hover {
  transform: scale(1.08);
}

.swatch.is-active {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.swatch--custom {
  display: grid;
  place-items: center;
  background: var(--bg-raised);
  overflow: hidden;
}

.swatch--custom input {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
}

.history {
  display: flex;
  gap: var(--space-2);
}

.history > * {
  flex: 1;
}

.count {
  font-size: var(--text-sm);
  color: var(--text-muted);
}
</style>
