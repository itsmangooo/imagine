<script setup lang="ts">
const {
  reference, styleId, formatId, extraPrompt, busy, error, hasKey, canGenerate,
  setReference, clearReference, generate,
} = useGenerate()

const fileEl = ref<HTMLInputElement | null>(null)

function onPick(event: Event) {
  const input = event.target as HTMLInputElement
  setReference(input.files?.[0])
  input.value = ''
}
</script>

<template>
  <div class="generate">
    <!-- No key is a normal state, not an error: everything else in the editor
         works without one. -->
    <div v-if="!hasKey" class="needs-key">
      <UiIcon name="lock" :size="18" />
      <div>
        <p class="needs-key__title">Add your Replicate API key</p>
        <p class="needs-key__text">
          AI features run on your own Replicate account, billed directly to you — roughly
          $0.02 per portrait. Everything else in the editor is free and needs no key.
        </p>
        <NuxtLink to="/settings" class="needs-key__link">Open Settings →</NuxtLink>
      </div>
    </div>

    <template v-else>
      <section class="group">
        <p class="section-label">Reference photo</p>
        <div v-if="reference" class="reference">
          <img :src="reference.src" alt="" class="reference__img">
          <span class="reference__name">{{ reference.name }}</span>
          <button class="reference__remove" title="Remove" @click="clearReference">
            <UiIcon name="close" :size="13" />
          </button>
        </div>
        <UiButton v-else variant="secondary" size="sm" block icon="upload" @click="fileEl?.click()">
          Choose a selfie
        </UiButton>
        <input ref="fileEl" type="file" accept="image/*" class="visually-hidden" @change="onPick">
        <p class="micro">Used for this request only, then discarded. Never stored.</p>
      </section>

      <section class="group">
        <p class="section-label">Format</p>
        <div class="chips">
          <UiChip
            v-for="f in GENERATE_FORMATS"
            :key="f.id"
            :label="f.label"
            :hint="`${f.width}×${f.height}`"
            :active="formatId === f.id"
            @click="formatId = f.id"
          />
        </div>
      </section>

      <section class="group">
        <p class="section-label">Look</p>
        <div class="chips">
          <UiChip
            v-for="s in STYLE_PRESETS"
            :key="s.id"
            :label="s.label"
            :active="styleId === s.id"
            @click="styleId = s.id"
          />
        </div>
      </section>

      <section class="group">
        <p class="section-label">Extra detail</p>
        <textarea
          v-model="extraPrompt"
          class="prompt"
          rows="2"
          placeholder="Optional — e.g. navy jacket, plain background"
        />
      </section>

      <section class="group">
        <UiButton variant="primary" block icon="generate" :disabled="!canGenerate" @click="generate">
          {{ busy ? 'Generating…' : 'Generate portrait' }}
        </UiButton>
        <p v-if="error" class="error">{{ error }}</p>
        <p class="micro">Billed by Replicate to your account. Imagine takes no payment.</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.generate {
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

.needs-key {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-5);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
}

.needs-key__title {
  color: var(--text);
  font-weight: var(--weight-medium);
  font-size: var(--text-md);
  margin-bottom: var(--space-2);
}

.needs-key__text {
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

.needs-key__link {
  display: inline-block;
  margin-top: var(--space-3);
  color: var(--accent);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
}

.reference {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.reference__img {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-xs);
  object-fit: cover;
}

.reference__name {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reference__remove {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-xs);
  color: var(--text-muted);
}

.reference__remove:hover {
  color: var(--danger);
  background: var(--danger-soft);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.prompt {
  width: 100%;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-3);
  font-size: var(--text-sm);
  color: var(--text);
  resize: vertical;
}

.micro {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: var(--leading-normal);
}

.error {
  font-size: var(--text-sm);
  color: var(--danger);
}
</style>
