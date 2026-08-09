<script setup lang="ts">
/**
 * Hand-rolled 24×24 stroke icons on a single consistent grid.
 * Extend the ICONS map below rather than adding an icon package — it keeps the
 * stroke weight, cap style and optical weight uniform across the whole product.
 *
 * Values are raw inner-SVG markup. They are compile-time constants defined in
 * this file only, never user input, so v-html carries no injection risk.
 */

const ICONS = {
  /* ---- Navigation ---- */
  editor: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.75" cy="8.75" r="1.6"/><path d="M21 15.5 16.5 11 6 21"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  billing: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/><path d="M6.5 14.5h3"/>',
  admin: '<path d="M12 2.5 4.5 5.75v5.5c0 4.6 3.1 8.4 7.5 10.25 4.4-1.85 7.5-5.65 7.5-10.25v-5.5Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  logout: '<path d="M9.5 21H5.5A2.5 2.5 0 0 1 3 18.5v-13A2.5 2.5 0 0 1 5.5 3h4"/><path d="m16 16.5 4.5-4.5L16 7.5"/><path d="M20.5 12H9.5"/>',

  /* ---- Editor tools ---- */
  crop: '<path d="M6.5 2.5v13a2 2 0 0 0 2 2h13"/><path d="M2.5 6.5h13a2 2 0 0 1 2 2v13"/>',
  filters: '<path d="M4 7h10"/><path d="M18.5 7H20"/><path d="M4 12h3"/><path d="M11.5 12H20"/><path d="M4 17h9"/><path d="M17.5 17H20"/><circle cx="16.25" cy="7" r="2.25"/><circle cx="9.25" cy="12" r="2.25"/><circle cx="15.25" cy="17" r="2.25"/>',
  grading: '<path d="M12 21a6.5 6.5 0 0 0 6.5-6.5c0-1.9-1-3.7-2.9-5.3S12.6 5.5 12 3c-.6 2.5-1.9 4.6-3.6 6.2S5.5 12.6 5.5 14.5A6.5 6.5 0 0 0 12 21Z"/><path d="M12 21a6.5 6.5 0 0 0 6.5-6.5H12Z" fill="currentColor" stroke="none" opacity=".35"/>',
  text: '<path d="M4.5 7.5V4.5h15v3"/><path d="M12 4.5v15"/><path d="M8.75 19.5h6.5"/>',
  doodle: '<path d="M16.8 3.2a2.55 2.55 0 0 1 3.6 3.6L8.2 19H4.5v-3.7Z"/><path d="m14.5 5.5 4 4"/>',
  collage: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5"/>',
  music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  generate: '<path d="m12 3 1.85 5.15L19 10l-5.15 1.85L12 17l-1.85-5.15L5 10l5.15-1.85Z"/><path d="M18.5 15.5 19.25 18l2.25.75L19.25 19.5 18.5 22l-.75-2.5L15.5 18.75l2.25-.75Z"/>',
  autoedit: '<path d="M15 3V1.5"/><path d="M15 16.5V15"/><path d="M9 8.25h1.5"/><path d="M19.5 8.25H21"/><path d="m18.6 11.85 1.05 1.05"/><path d="m18.6 4.65 1.05-1.05"/><path d="M3 21 13.5 10.5"/><path d="m11.4 4.65-1.05-1.05"/><circle cx="15" cy="8.25" r="3"/>',

  /* ---- Actions & chrome ---- */
  upload: '<path d="M21 15.5v3A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5v-3"/><path d="m16.5 8-4.5-4.5L7.5 8"/><path d="M12 3.5V15"/>',
  export: '<path d="M21 15.5v3A2.5 2.5 0 0 1 18.5 21h-13A2.5 2.5 0 0 1 3 18.5v-3"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M12 15V3.5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.75" cy="8.75" r="1.6"/><path d="M21 15.5 16.5 11 6 21"/>',
  undo: '<path d="M3 8.5h7.5"/><path d="M3 8.5 6.5 5M3 8.5 6.5 12"/><path d="M3.8 14.5A8 8 0 1 0 10.5 8.5H3"/>',
  redo: '<path d="M21 8.5h-7.5"/><path d="M21 8.5 17.5 5M21 8.5 17.5 12"/><path d="M20.2 14.5A8 8 0 1 1 13.5 8.5H21"/>',
  eraser: '<path d="m8.5 20.5-5-5a2 2 0 0 1 0-2.8l8.3-8.3a2 2 0 0 1 2.8 0l4.7 4.7a2 2 0 0 1 0 2.8l-8.6 8.6Z"/><path d="M20.5 20.5h-12"/><path d="m7.5 9.5 7 7"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M10.7 6.2A9.9 9.9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.9"/><path d="M6.4 7.9A17 17 0 0 0 2.5 12S6 18.5 12 18.5a9.6 9.6 0 0 0 4-.85"/><path d="M3 3l18 18"/><path d="M10 10a3 3 0 0 0 4 4"/>',
  layers: '<path d="m12 3 9 4.5-9 4.5-9-4.5Z"/><path d="m3 13.5 9 4.5 9-4.5"/>',
  close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  plus: '<path d="M12 5.5v13"/><path d="M5.5 12h13"/>',
  minus: '<path d="M5.5 12h13"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  trash: '<path d="M3.5 6.5h17"/><path d="M8.5 6.5V4.75A1.25 1.25 0 0 1 9.75 3.5h4.5a1.25 1.25 0 0 1 1.25 1.25V6.5"/><path d="M6 6.5 6.9 19.4A1.7 1.7 0 0 0 8.6 21h6.8a1.7 1.7 0 0 0 1.7-1.6L18 6.5"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-down': '<path d="m6 9.5 6 6 6-6"/>',
  'panel-left': '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9.5 4v16"/>',
  reset: '<path d="M3.5 6v5h5"/><path d="M4.4 11A8 8 0 1 1 5.6 16"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.75h.01"/>',
} as const

export type IconName = keyof typeof ICONS

const props = withDefaults(
  defineProps<{
    name: IconName
    size?: number | string
    strokeWidth?: number
  }>(),
  { size: 18, strokeWidth: 1.6 },
)

const markup = computed(() => ICONS[props.name] ?? '')
</script>

<template>
  <svg
    class="icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    v-html="markup"
  />
</template>

<style scoped>
.icon {
  flex: none;
  display: block;
}
</style>
