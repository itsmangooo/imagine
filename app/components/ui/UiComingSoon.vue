<script setup lang="ts">
import type { IconName } from './UiIcon.vue'

defineProps<{ icon: IconName; title: string; description: string }>()
</script>

<template>
  <div class="soon">
    <div class="soon__card">
      <div class="soon__mark">
        <UiIcon :name="icon" :size="22" />
      </div>
      <h1 class="soon__title">{{ title }}</h1>
      <p class="soon__desc">{{ description }}</p>
      <p class="soon__note">Not built yet — the editor comes first.</p>
    </div>
  </div>
</template>

<style scoped>
.soon {
  flex: 1;
  display: grid;
  place-items: center;
  padding: var(--space-8);
}

.soon__card {
  max-width: 420px;
  text-align: center;
  padding: var(--space-9) var(--space-8);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.soon__mark {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin: 0 auto var(--space-5);
  border-radius: var(--radius);
  background: var(--accent-soft);
  color: var(--accent);
}

.soon__title {
  font-size: var(--text-xl);
  margin-bottom: var(--space-3);
}

.soon__desc {
  color: var(--text-secondary);
  font-size: var(--text-md);
  line-height: var(--leading-relaxed);
}

.soon__note {
  margin-top: var(--space-5);
  padding-top: var(--space-5);
  border-top: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: var(--text-sm);
}
</style>
