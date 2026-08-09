<script setup lang="ts">
const {
  state,
  building,
  canFlatten,
  outputSize,
  documents,
  patch,
  setCellSource,
  shiftCell,
  removeCell,
  importImages,
  flatten,
} = useCollage()

const fileEl = ref<HTMLInputElement | null>(null)
const note = ref<string | null>(null)

function docName(id: string) {
  return documents.value.find(d => d.id === id)?.name ?? 'Missing image'
}

function docThumb(id: string) {
  return documents.value.find(d => d.id === id)?.thumb ?? ''
}

async function onPick(event: Event) {
  const input = event.target as HTMLInputElement
  await importImages(input.files)
  input.value = ''
}

async function onFlatten() {
  const ok = await flatten()
  note.value = ok ? 'Collage added to your images.' : 'Could not build the collage.'
  setTimeout(() => (note.value = null), 4000)
}
</script>

<template>
  <div class="collage">
    <section class="group">
      <p class="section-label">Canvas</p>
      <div class="ratios">
        <UiChip
          v-for="r in COLLAGE_RATIOS"
          :key="r.id"
          :label="r.label"
          :hint="r.id"
          :active="state.ratio === r.id"
          @click="patch({ ratio: r.id })"
        />
      </div>
      <p class="size tabular">{{ outputSize.width }} × {{ outputSize.height }}</p>
    </section>

    <section class="group">
      <p class="section-label">Cells</p>
      <div v-if="!state.cells.length" class="empty">
        Pick a layout below, or add images to start a freeform collage.
      </div>
      <div v-for="(cell, index) in state.cells" :key="cell.id" class="cell">
        <img v-if="docThumb(cell.docId)" :src="docThumb(cell.docId)" alt="" class="cell__thumb">
        <select
          class="cell__select"
          :value="cell.docId"
          :title="docName(cell.docId)"
          @change="setCellSource(cell.id, ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="doc in documents" :key="doc.id" :value="doc.id">{{ doc.name }}</option>
        </select>
        <button class="cell__op" title="Move earlier" :disabled="index === 0" @click="shiftCell(cell.id, -1)">
          <UiIcon name="chevron-left" :size="13" />
        </button>
        <button
          class="cell__op"
          title="Move later"
          :disabled="index === state.cells.length - 1"
          @click="shiftCell(cell.id, 1)"
        >
          <UiIcon name="chevron-right" :size="13" />
        </button>
        <button class="cell__op cell__op--danger" title="Remove" @click="removeCell(cell.id)">
          <UiIcon name="trash" :size="13" />
        </button>
      </div>

      <UiButton variant="secondary" size="sm" block icon="upload" @click="fileEl?.click()">
        Add images
      </UiButton>
      <input ref="fileEl" type="file" accept="image/*" multiple class="visually-hidden" @change="onPick">
    </section>

    <section class="group">
      <p class="section-label">Style</p>
      <UiSlider
        :model-value="state.spacing"
        label="Spacing"
        :min="0"
        :max="0.08"
        :step="0.002"
        :default="0.02"
        @update:model-value="patch({ spacing: $event })"
      />
      <UiSlider
        :model-value="state.radius"
        label="Corner radius"
        :min="0"
        :max="40"
        :step="1"
        :default="0"
        @update:model-value="patch({ radius: $event })"
      />
      <label class="swatch">
        <input type="color" :value="state.background" @input="patch({ background: ($event.target as HTMLInputElement).value })">
        <span>Background</span>
      </label>
    </section>

    <section class="group">
      <UiButton variant="primary" block icon="collage" :disabled="!canFlatten || building" @click="onFlatten">
        {{ building ? 'Building…' : 'Flatten to new image' }}
      </UiButton>
      <p v-if="note" class="note">{{ note }}</p>
      <p class="hint">
        Drag and resize cells directly on the canvas. Flattening adds the result as a new image, so
        crop, filters and text can then be applied to it.
      </p>
    </section>
  </div>
</template>

<style scoped>
.collage {
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
  gap: var(--space-3);
}

.ratios {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}

.size {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.empty {
  font-size: var(--text-sm);
  color: var(--text-muted);
  padding: var(--space-3) 0;
}

.cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.cell__thumb {
  width: 24px;
  height: 24px;
  flex: none;
  border-radius: var(--radius-xs);
  object-fit: cover;
  border: 1px solid var(--border);
}

.cell__select {
  flex: 1;
  min-width: 0;
  height: 26px;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  color: var(--text);
  font-size: var(--text-sm);
  padding: 0 var(--space-2);
}

.cell__op {
  display: grid;
  place-items: center;
  width: 24px;
  height: 26px;
  flex: none;
  border-radius: var(--radius-xs);
  color: var(--text-muted);
}

.cell__op:hover:not(:disabled) {
  background: var(--bg-raised);
  color: var(--text);
}

.cell__op:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.cell__op--danger:hover {
  color: var(--danger);
  background: var(--danger-soft);
}

.swatch {
  display: flex;
  align-items: center;
  gap: var(--space-3);
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

.note {
  font-size: var(--text-sm);
  color: var(--accent);
}

.hint {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: var(--leading-normal);
}
</style>
