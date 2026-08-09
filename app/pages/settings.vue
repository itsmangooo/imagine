<script setup lang="ts">
useHead({ title: 'Settings — Imagine' })

const { masked, account, checking, error, hasKey, restore, save, clear } = useApiKey()

const draft = ref('')
const saved = ref(false)

onMounted(() => restore())

async function onSave() {
  saved.value = false
  const ok = await save(draft.value)
  if (ok) {
    draft.value = ''
    saved.value = true
    setTimeout(() => (saved.value = false), 4000)
  }
}
</script>

<template>
  <div class="settings">
    <div class="card">
      <header class="card__head">
        <UiIcon name="lock" :size="18" />
        <div>
          <h1 class="card__title">Replicate API key</h1>
          <p class="card__sub">AI features run on your own account. Imagine takes no payment.</p>
        </div>
      </header>

      <div class="card__body">
        <div v-if="hasKey" class="current">
          <div class="current__row">
            <span class="current__label">Saved key</span>
            <span class="current__value tabular">{{ masked }}</span>
          </div>
          <p v-if="account" class="current__account">Verified against <strong>{{ account }}</strong></p>
          <UiButton variant="danger" size="sm" icon="trash" @click="clear">Remove key</UiButton>
        </div>

        <div class="field">
          <label class="field__label" for="key">{{ hasKey ? 'Replace key' : 'Paste your key' }}</label>
          <input
            id="key"
            v-model="draft"
            class="field__input"
            type="password"
            autocomplete="off"
            spellcheck="false"
            placeholder="r8_..."
            @keydown.enter="onSave"
          >
          <UiButton variant="primary" size="sm" :disabled="!draft || checking" @click="onSave">
            {{ checking ? 'Checking…' : 'Verify and save' }}
          </UiButton>
          <p v-if="error" class="field__error">{{ error }}</p>
          <p v-if="saved" class="field__ok">Key verified and saved.</p>
        </div>

        <section class="explain">
          <h2 class="explain__title">What is this?</h2>
          <p>
            <a class="link" href="https://replicate.com" target="_blank" rel="noopener noreferrer">Replicate</a>
            hosts the AI model that generates portraits. You create an account there, generate an API
            token, and paste it here. Generations are billed by Replicate straight to you — roughly
            <strong>$0.02 per portrait</strong>. Imagine never handles payments and takes no cut.
          </p>
          <p>
            Everything else in the editor — crop, filters, colour grading, text, doodle, collage,
            music and export — runs entirely in your browser and is free with no key at all.
          </p>
          <p class="explain__storage">
            Your key is sent to our server only to make the call on your behalf, and is never logged
            or returned to the browser once saved. It is currently held for this browser session
            only, so you will re-enter it after closing the tab.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-8);
  display: flex;
  justify-content: center;
}

.card {
  width: min(560px, 100%);
  height: fit-content;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.card__head {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-6);
  border-bottom: 1px solid var(--border-subtle);
  color: var(--accent);
}

.card__title {
  font-size: var(--text-lg);
  color: var(--text);
}

.card__sub {
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin-top: 2px;
}

.card__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: var(--space-6);
}

.current {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: flex-start;
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.current__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  width: 100%;
}

.current__label {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.current__value {
  color: var(--text);
  font-weight: var(--weight-medium);
}

.current__account {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.field {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: flex-start;
}

.field__label {
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
}

.field__input {
  width: 100%;
  height: 36px;
  padding: 0 var(--space-4);
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: var(--text-md);
}

.field__input:focus-visible {
  border-color: var(--accent-line);
}

.field__error {
  font-size: var(--text-sm);
  color: var(--danger);
}

.field__ok {
  font-size: var(--text-sm);
  color: var(--accent);
}

.explain {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-5);
  border-top: 1px solid var(--border-subtle);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}

.explain__title {
  font-size: var(--text-md);
  color: var(--text);
}

.explain__storage {
  color: var(--text-muted);
}

.link {
  color: var(--accent);
}
</style>
