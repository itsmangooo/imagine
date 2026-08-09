<script setup lang="ts">
const { activeTool, sidebarCollapsed, selectTool } = useEditor()
const user = useCurrentUser()

const navItems = computed(() => NAV_ITEMS.filter(item => !item.adminOnly || user.value.isAdmin))
</script>

<template>
  <aside class="sidebar" :class="{ 'sidebar--collapsed': sidebarCollapsed }">
    <div class="sidebar__brand">
      <AppLogo :wordmark="!sidebarCollapsed" />
    </div>

    <div class="sidebar__scroll">
      <nav class="group" aria-label="Main">
        <p class="group__label">Workspace</p>
        <NuxtLink
          v-for="item in navItems"
          :key="item.id"
          :to="item.to"
          class="row"
          :title="sidebarCollapsed ? item.label : undefined"
        >
          <UiIcon :name="item.icon" :size="18" />
          <span class="row__label">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <nav class="group" aria-label="Tools">
        <p class="group__label">Tools</p>
        <button
          v-for="tool in TOOLS"
          :key="tool.id"
          class="row row--tool"
          :class="{ 'is-active': activeTool === tool.id }"
          :aria-pressed="activeTool === tool.id"
          :title="sidebarCollapsed ? tool.label : undefined"
          @click="selectTool(tool.id)"
        >
          <UiIcon :name="tool.icon" :size="18" />
          <span class="row__label">{{ tool.label }}</span>
          <!-- Marks the one tool that calls a paid third-party API with the
               user's own key. Everything else is free and needs no key. -->
          <span v-if="tool.byok" class="row__tag" title="Uses your own Replicate API key">AI</span>
          <span v-else-if="tool.pending" class="row__soon" aria-hidden="true" />
        </button>
      </nav>
    </div>

    <div class="sidebar__foot">
      <button class="row row--muted" title="Log out">
        <UiIcon name="logout" :size="18" />
        <span class="row__label">Log out</span>
      </button>

      <button
        class="collapse"
        :title="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="sidebarCollapsed = !sidebarCollapsed"
      >
        <UiIcon :name="sidebarCollapsed ? 'chevron-right' : 'chevron-left'" :size="16" />
      </button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  /* NOT overflow:hidden — that clips the collapsed-state tooltips.
     Labels clip themselves via max-width instead. */
  display: flex;
  flex-direction: column;
  width: var(--sidebar-w);
  flex: none;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-subtle);
  transition: width var(--dur) var(--ease);
}

.sidebar--collapsed {
  width: var(--sidebar-w-collapsed);
}

.sidebar__brand {
  display: flex;
  align-items: center;
  height: var(--topbar-h);
  padding: 0 var(--space-5);
  flex: none;
}

.sidebar--collapsed .sidebar__brand {
  padding: 0;
  justify-content: center;
}

.sidebar__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: visible;
  padding: var(--space-4) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.group__label {
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
  padding: 0 var(--space-4) var(--space-3);
  white-space: nowrap;
  overflow: hidden;
}

.sidebar--collapsed .group__label {
  opacity: 0;
  padding-bottom: var(--space-2);
  height: 12px;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  height: 36px;
  padding: 0 var(--space-4);
  border-radius: var(--radius);
  color: var(--text-secondary);
  font-size: var(--text-base);
  font-weight: var(--weight-regular);
  text-align: left;
  width: 100%;
  transition:
    background var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.row:hover {
  background: var(--bg-raised);
  color: var(--text);
}

.row__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  max-width: 160px;
  opacity: 1;
  transition:
    max-width var(--dur) var(--ease),
    opacity var(--dur-fast) var(--ease);
}

.sidebar--collapsed .row {
  padding: 0;
  justify-content: center;
}

.sidebar--collapsed .row__label,
.sidebar--collapsed .row__tag {
  max-width: 0;
  opacity: 0;
  pointer-events: none;
}

/* Active tool: accent tint plus a left marker. The marker is what reads at a
   glance in the collapsed state, where the label is gone. */
.row--tool.is-active {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: var(--weight-medium);
  position: relative;
}

.row--tool.is-active::before {
  content: '';
  position: absolute;
  inset-block: 8px;
  left: calc(var(--space-3) * -1);
  width: 2px;
  border-radius: var(--radius-pill);
  background: var(--accent);
}

.row__tag {
  font-size: 9px;
  font-weight: var(--weight-bold);
  letter-spacing: 0.08em;
  color: var(--accent);
  background: var(--accent-soft);
  border: 1px solid var(--accent-line);
  border-radius: var(--radius-xs);
  padding: 1px 4px;
  line-height: 1.3;
  flex: none;
}

.row--tool.is-active .row__tag {
  background: transparent;
}

/* A quiet dot for tools that exist in the nav but aren't built yet. */
.row__soon {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--border-strong);
  flex: none;
}

.sidebar--collapsed .row__soon {
  display: none;
}

.row--muted {
  color: var(--text-muted);
}

.sidebar__foot {
  flex: none;
  padding: var(--space-3);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.collapse {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  margin-top: var(--space-2);
  border-radius: var(--radius);
  color: var(--text-muted);
  transition:
    background var(--dur-fast) var(--ease),
    color var(--dur-fast) var(--ease);
}

.collapse:hover {
  background: var(--bg-raised);
  color: var(--text);
}
</style>
