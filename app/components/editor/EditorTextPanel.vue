<script setup lang="ts">
import type { TextCase, TextLayer } from '~/composables/useText'

const {
  layers,
  selected,
  selectedId,
  hasImage,
  addLayer,
  updateSelected,
  duplicateSelected,
  deleteSelected,
  bringToFront,
  sendToBack,
} = useText()

const CASES: { id: TextCase; label: string }[] = [
  { id: 'none', label: 'Aa' },
  { id: 'upper', label: 'AA' },
  { id: 'lower', label: 'aa' },
  { id: 'title', label: 'Ab' },
]

const ALIGNS = [
  { id: 'left' as const, label: 'Left' },
  { id: 'center' as const, label: 'Centre' },
  { id: 'right' as const, label: 'Right' },
]

/** Slider fields, so the markup stays flat instead of a dozen near-copies. */
const FIELDS: { key: keyof TextLayer; label: string; min: number; max: number; step: number; def: number }[] = [
  { key: 'fontSize', label: 'Size', min: 0.02, max: 0.35, step: 0.005, def: 0.08 },
  { key: 'opacity', label: 'Opacity', min: 0.05, max: 1, step: 0.01, def: 1 },
  { key: 'charSpacing', label: 'Letter spacing', min: -100, max: 400, step: 5, def: 0 },
  { key: 'lineHeight', label: 'Line height', min: 0.7, max: 2.4, step: 0.02, def: 1.16 },
  { key: 'angle', label: 'Rotation', min: -180, max: 180, step: 1, def: 0 },
  { key: 'strokeWidth', label: 'Outline', min: 0, max: 12, step: 0.5, def: 0 },
]

function num(key: keyof TextLayer): number {
  return (selected.value?.[key] as number) ?? 0
}
</script>

<template>
  <div v-if="!hasImage" class="hint">Open an image to add text.</div>

  <div v-else class="text-panel">
    <section class="layers">
      <p class="section-label">Layers</p>
      <div v-if="!layers.length" class="layers__empty">No text yet.</div>
      <button
        v-for="layer in [...layers].reverse()"
        :key="layer.id"
        class="layer"
        :class="{ 'is-active': layer.id === selectedId }"
        type="button"
        @click="selectedId = layer.id"
      >
        <UiIcon name="text" :size="14" />
        <span class="layer__name">{{ layer.text || 'Empty' }}</span>
      </button>
      <UiButton variant="secondary" block size="sm" icon="plus" @click="addLayer()">Add text</UiButton>
    </section>

    <template v-if="selected">
      <section class="group">
        <p class="section-label">Content</p>
        <textarea
          class="content"
          :value="selected.text"
          rows="2"
          @input="updateSelected({ text: ($event.target as HTMLTextAreaElement).value })"
        />
      </section>

      <section class="group">
        <p class="section-label">Style</p>
        <div class="row">
          <select
            class="select"
            :value="selected.fontFamily"
            @change="updateSelected({ fontFamily: ($event.target as HTMLSelectElement).value })"
          >
            <option v-for="font in TEXT_FONTS" :key="font" :value="font">{{ font }}</option>
          </select>
        </div>

        <div class="row row--split">
          <div class="toggles">
            <button class="mini" :class="{ 'is-on': selected.bold }" title="Bold" @click="updateSelected({ bold: !selected.bold })"><b>B</b></button>
            <button class="mini" :class="{ 'is-on': selected.italic }" title="Italic" @click="updateSelected({ italic: !selected.italic })"><i>I</i></button>
            <button class="mini" :class="{ 'is-on': selected.underline }" title="Underline" @click="updateSelected({ underline: !selected.underline })"><u>U</u></button>
          </div>
          <div class="toggles">
            <button
              v-for="c in CASES"
              :key="c.id"
              class="mini"
              :class="{ 'is-on': selected.textCase === c.id }"
              :title="`Case: ${c.id}`"
              @click="updateSelected({ textCase: c.id })"
            >{{ c.label }}</button>
          </div>
        </div>

        <div class="row toggles toggles--wide">
          <button
            v-for="a in ALIGNS"
            :key="a.id"
            class="mini mini--wide"
            :class="{ 'is-on': selected.textAlign === a.id }"
            @click="updateSelected({ textAlign: a.id })"
          >{{ a.label }}</button>
        </div>

        <div class="row row--colors">
          <label class="swatch">
            <input type="color" :value="selected.fill" @input="updateSelected({ fill: ($event.target as HTMLInputElement).value })">
            <span>Fill</span>
          </label>
          <label class="swatch">
            <input type="color" :value="selected.strokeColor" @input="updateSelected({ strokeColor: ($event.target as HTMLInputElement).value })">
            <span>Outline</span>
          </label>
        </div>
      </section>

      <section class="group">
        <p class="section-label">Adjust</p>
        <UiSlider
          v-for="f in FIELDS"
          :key="f.key"
          :model-value="num(f.key)"
          :label="f.label"
          :min="f.min"
          :max="f.max"
          :step="f.step"
          :default="f.def"
          @update:model-value="updateSelected({ [f.key]: $event } as Partial<TextLayer>)"
        />
      </section>

      <section class="group">
        <p class="section-label">Effects</p>
        <label class="check">
          <input type="checkbox" :checked="selected.shadow" @change="updateSelected({ shadow: ($event.target as HTMLInputElement).checked })">
          <span>Drop shadow</span>
        </label>
        <label class="check">
          <input
            type="checkbox"
            :checked="!!selected.background"
            @change="updateSelected({ background: ($event.target as HTMLInputElement).checked ? 'rgba(0,0,0,0.55)' : '' })"
          >
          <span>Highlight bar</span>
        </label>
      </section>

      <section class="group group--actions">
        <UiButton variant="secondary" size="sm" icon="plus" @click="duplicateSelected">Duplicate</UiButton>
        <UiButton variant="secondary" size="sm" icon="layers" @click="bringToFront">Front</UiButton>
        <UiButton variant="secondary" size="sm" icon="layers" @click="sendToBack">Back</UiButton>
        <UiButton variant="danger" size="sm" icon="trash" @click="deleteSelected">Delete</UiButton>
      </section>
    </template>
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

.text-panel {
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

.layers {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}

.layers__empty {
  font-size: var(--text-sm);
  color: var(--text-muted);
  padding: var(--space-2) 0 var(--space-3);
}

.layer {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 28px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  text-align: left;
}

.layer:hover {
  background: var(--bg-raised);
  color: var(--text);
}

.layer.is-active {
  background: var(--accent-soft);
  color: var(--accent);
}

.layer__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.content,
.select {
  width: 100%;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  font-size: var(--text-sm);
  color: var(--text);
  resize: vertical;
}

.row {
  display: flex;
  gap: var(--space-2);
}

.row--split {
  justify-content: space-between;
}

.toggles {
  display: flex;
  gap: 2px;
}

.toggles--wide {
  width: 100%;
}

.mini {
  min-width: 28px;
  height: 26px;
  padding: 0 var(--space-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  background: var(--bg-raised);
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.mini--wide {
  flex: 1;
}

.mini:hover {
  color: var(--text);
}

.mini.is-on {
  background: var(--accent-soft);
  border-color: var(--accent-line);
  color: var(--accent);
}

.row--colors {
  gap: var(--space-3);
}

.swatch {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  cursor: pointer;
}

.swatch input {
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  background: none;
  cursor: pointer;
}

.check {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  cursor: pointer;
}

.group--actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}
</style>
