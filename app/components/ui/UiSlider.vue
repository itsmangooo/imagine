<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: number
    label: string
    min: number
    max: number
    step: number
    /** Value the slider snaps back to on double-click / reset. */
    default?: number
    disabled?: boolean
  }>(),
  { default: 0 },
)

const emit = defineEmits<{ 'update:modelValue': [number] }>()

/**
 * Decimal places come from `step`, never a fixed number — rounding to integers
 * makes every 0.01-step control read "0" no matter where you drag it.
 */
const decimals = computed(() => {
  const s = String(props.step)
  const dot = s.indexOf('.')
  return dot === -1 ? 0 : s.length - dot - 1
})

/** Bipolar sliders fill outward from the centre, unipolar from the left. */
const bipolar = computed(() => props.min < 0)

const display = computed(() => {
  const v = props.modelValue.toFixed(decimals.value)
  if (!bipolar.value || props.modelValue <= 0) return v
  return `+${v}`
})

const isDefault = computed(() => Math.abs(props.modelValue - props.default) < 1e-9)

const fill = computed(() => {
  const span = props.max - props.min
  const pct = ((props.modelValue - props.min) / span) * 100
  const origin = bipolar.value ? ((0 - props.min) / span) * 100 : 0
  return { start: `${Math.min(origin, pct)}%`, end: `${Math.max(origin, pct)}%` }
})

function onInput(event: Event) {
  emit('update:modelValue', Number((event.target as HTMLInputElement).value))
}

function reset() {
  emit('update:modelValue', props.default)
}
</script>

<template>
  <div class="slider" :class="{ 'slider--disabled': disabled }">
    <div class="slider__head">
      <span class="slider__label">{{ label }}</span>
      <button
        v-if="!isDefault && !disabled"
        class="slider__reset"
        type="button"
        title="Reset"
        aria-label="Reset"
        @click="reset"
      >
        <UiIcon name="reset" :size="12" />
      </button>
      <span class="slider__value tabular" :class="{ 'is-active': !isDefault }">{{ display }}</span>
    </div>

    <input
      class="slider__input"
      type="range"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      :aria-label="label"
      :style="{ '--fill-start': fill.start, '--fill-end': fill.end }"
      @input="onInput"
      @dblclick="reset"
    >
  </div>
</template>

<style scoped>
.slider {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.slider--disabled {
  opacity: 0.42;
}

.slider__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.slider__label {
  flex: 1;
  min-width: 0;
  font-size: var(--text-sm);
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slider__reset {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  flex: none;
  border-radius: var(--radius-xs);
  color: var(--text-muted);
}

.slider__reset:hover {
  color: var(--text);
  background: var(--bg-raised);
}

.slider__value {
  flex: none;
  font-size: var(--text-sm);
  color: var(--text-muted);
  min-width: 38px;
  text-align: right;
}

.slider__value.is-active {
  color: var(--accent);
}

/* ---- Track ------------------------------------------------------------
   The fill is painted with a gradient on the input's own background so there
   is no second element to keep in sync with the thumb. */
.slider__input {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 18px;
  background: transparent;
  cursor: pointer;
}

.slider__input:disabled {
  cursor: not-allowed;
}

.slider__input::-webkit-slider-runnable-track {
  height: 3px;
  border-radius: var(--radius-pill);
  background:
    linear-gradient(
      to right,
      transparent 0 var(--fill-start),
      var(--accent) var(--fill-start) var(--fill-end),
      transparent var(--fill-end) 100%
    ),
    var(--border-strong);
}

.slider__input::-moz-range-track {
  height: 3px;
  border-radius: var(--radius-pill);
  background:
    linear-gradient(
      to right,
      transparent 0 var(--fill-start),
      var(--accent) var(--fill-start) var(--fill-end),
      transparent var(--fill-end) 100%
    ),
    var(--border-strong);
}

.slider__input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 13px;
  height: 13px;
  margin-top: -5px;
  border-radius: 50%;
  background: var(--text);
  border: none;
  transition:
    background var(--dur-fast) var(--ease),
    transform var(--dur-fast) var(--ease);
}

.slider__input::-moz-range-thumb {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--text);
  border: none;
}

.slider__input:hover::-webkit-slider-thumb,
.slider__input:active::-webkit-slider-thumb {
  background: var(--accent);
  transform: scale(1.15);
}

.slider__input:focus-visible {
  outline: none;
}

.slider__input:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 3px var(--accent-ring);
}
</style>
