<script setup lang="ts">
import type { EditorDocument } from '~/composables/useDocuments'

const { documents, activeId, addImage, selectDocument, removeDocument, isDocumentEdited } = useDocuments()
const { filmstripOpen } = useEditor()

const fileEl = ref<HTMLInputElement | null>(null)
const confirming = ref<string | null>(null)

async function onPick(event: Event) {
  const input = event.target as HTMLInputElement
  for (const file of Array.from(input.files ?? [])) await addImage(file)
  // Allow re-picking the same file straight after removing it.
  input.value = ''
}

function requestRemove(doc: EditorDocument) {
  // Only interrupt when there is actually work to lose.
  if (isDocumentEdited(doc)) confirming.value = doc.id
  else removeDocument(doc.id)
}

function confirmRemove(id: string) {
  removeDocument(id)
  confirming.value = null
}
</script>

<template>
  <div v-if="documents.length" class="strip" :class="{ 'strip--closed': !filmstripOpen }">
    <button
      class="strip__toggle"
      type="button"
      :aria-expanded="filmstripOpen"
      :title="filmstripOpen ? 'Hide images' : 'Show images'"
      @click="filmstripOpen = !filmstripOpen"
    >
      <UiIcon :name="filmstripOpen ? 'chevron-down' : 'chevron-right'" :size="14" />
      <span class="strip__title">Images</span>
      <span class="strip__count tabular">{{ documents.length }}</span>
    </button>

    <div v-show="filmstripOpen" class="strip__items">
      <div
        v-for="doc in documents"
        :key="doc.id"
        class="thumb"
        :class="{ 'is-active': doc.id === activeId }"
      >
        <button class="thumb__button" type="button" :title="doc.name" @click="selectDocument(doc.id)">
          <img :src="doc.thumb" :alt="doc.name" class="thumb__img">
          <span v-if="isDocumentEdited(doc)" class="thumb__edited" title="Has edits" />
        </button>

        <button class="thumb__remove" type="button" :aria-label="`Remove ${doc.name}`" title="Remove" @click.stop="requestRemove(doc)">
          <UiIcon name="close" :size="12" />
        </button>

        <!-- Inline confirm rather than a modal: it stays next to the thing it
             is about, and there is only ever one open. -->
        <div v-if="confirming === doc.id" class="confirm">
          <p class="confirm__text">Discard edits?</p>
          <div class="confirm__actions">
            <UiButton variant="danger" size="sm" @click="confirmRemove(doc.id)">Remove</UiButton>
            <UiButton variant="ghost" size="sm" @click="confirming = null">Keep</UiButton>
          </div>
        </div>
      </div>

      <button class="add" type="button" title="Add images" @click="fileEl?.click()">
        <UiIcon name="plus" :size="18" />
        <span>Add</span>
      </button>

      <input ref="fileEl" type="file" accept="image/*" multiple class="visually-hidden" @change="onPick">
    </div>
  </div>
</template>

<style scoped>
.strip {
  flex: none;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  padding: var(--space-3) var(--space-5) var(--space-4);
}

.strip--closed {
  padding-bottom: var(--space-3);
}

.strip__toggle {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  height: 22px;
  color: var(--text-muted);
  transition: color var(--dur-fast) var(--ease);
}

.strip__toggle:hover {
  color: var(--text);
}

.strip__title {
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
}

.strip__count {
  font-size: var(--text-xs);
  color: var(--text-muted);
  background: var(--bg-raised);
  border-radius: var(--radius-pill);
  min-width: 18px;
  height: 16px;
  line-height: 16px;
  padding: 0 5px;
  text-align: center;
}

.strip__items {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-3);
  overflow-x: auto;
  overflow-y: visible;
  padding-bottom: var(--space-1);
}

.thumb {
  position: relative;
  flex: none;
}

.thumb__button {
  display: block;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--border);
  transition: border-color var(--dur-fast) var(--ease);
}

.thumb__button:hover {
  border-color: var(--border-strong);
}

.thumb.is-active .thumb__button {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.thumb__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb__edited {
  position: absolute;
  left: 4px;
  bottom: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
}

.thumb__remove {
  position: absolute;
  top: -5px;
  right: -5px;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--bg-raised);
  border: 1px solid var(--border-strong);
  color: var(--text-secondary);
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease);
}

.thumb:hover .thumb__remove,
.thumb__remove:focus-visible {
  opacity: 1;
}

.thumb__remove:hover {
  color: var(--danger);
  border-color: var(--danger);
}

.confirm {
  position: absolute;
  top: calc(100% + var(--space-2));
  left: 0;
  z-index: var(--z-popover);
  width: 168px;
  padding: var(--space-4);
  background: var(--bg-raised);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius);
}

.confirm__text {
  font-size: var(--text-sm);
  color: var(--text);
  margin-bottom: var(--space-3);
}

.confirm__actions {
  display: flex;
  gap: var(--space-2);
}

.add {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 56px;
  height: 56px;
  flex: none;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  font-size: var(--text-xs);
  transition:
    color var(--dur-fast) var(--ease),
    border-color var(--dur-fast) var(--ease),
    background var(--dur-fast) var(--ease);
}

.add:hover {
  color: var(--accent);
  border-color: var(--accent-line);
  background: var(--accent-faint);
}
</style>
