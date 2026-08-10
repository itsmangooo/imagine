<script setup lang="ts">
/**
 * Marketing shell. Separate from the editor layout because the editor
 * deliberately owns the viewport and never scrolls; this one must.
 */
</script>

<template>
  <div class="marketing">
    <LandingBackdrop />
    <header class="topbar">
      <AppLogo :size="26" />
      <nav class="topbar__nav">
        <NuxtLink to="/editor" class="topbar__link">Open the editor</NuxtLink>
      </nav>
    </header>
    <main>
      <slot />
    </main>
  </div>
</template>

<style>
/* The editor pins the page; the marketing pages must scroll. Global on purpose
   — it undoes the `overflow: hidden` base.css sets for the editor. */
body:has(.marketing) {
  overflow-y: auto;
  overflow-x: hidden;
}
</style>

<style scoped>
.marketing {
  position: relative;
  min-height: 100%;
  background: var(--bg-app);
}

/* Content sits above the fixed backdrop layer. */
.marketing > main {
  position: relative;
  z-index: 1;
}

.topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: var(--z-chrome);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5) var(--space-8);
  /* Translucent so the drifting backdrop reads through the bar rather than
     being clipped off at the top of the page. */
  backdrop-filter: blur(10px);
  background: color-mix(in srgb, var(--bg-app) 72%, transparent);
  border-bottom: 1px solid var(--border-subtle);
}

.topbar__link {
  font-size: var(--text-md);
  font-weight: var(--weight-medium);
  color: var(--accent);
}

.topbar__link:hover {
  color: var(--accent-hover);
}
</style>
