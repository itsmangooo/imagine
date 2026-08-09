<script setup lang="ts">
const { hasImage } = useEditor()
const { busy, report, applied, error, canRun, run, revert } = useAutoEdit()

function signed(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`
}
</script>

<template>
  <div v-if="!hasImage" class="hint">Open an image to auto-edit it.</div>

  <div v-else class="auto">
    <p class="lede">
      Analyses this image and fills in the Filters sliders. Every value stays visible and
      editable — nothing is applied behind your back.
    </p>

    <UiButton variant="primary" block icon="autoedit" :disabled="!canRun" @click="run">
      {{ busy ? 'Analysing…' : applied ? 'Analyse again' : 'Suggest adjustments' }}
    </UiButton>

    <UiButton v-if="applied" variant="secondary" block icon="reset" @click="revert">
      Clear suggestions
    </UiButton>

    <p v-if="error" class="error">{{ error }}</p>

    <section v-if="report" class="report">
      <p class="section-label">What it found</p>
      <dl class="report__list">
        <div class="report__row">
          <dt>Mean brightness</dt>
          <dd class="tabular">{{ Math.round(report.meanLuma * 100) }}%</dd>
        </div>
        <div class="report__row">
          <dt>Clipped shadows</dt>
          <dd class="tabular">{{ (report.clippedShadows * 100).toFixed(1) }}%</dd>
        </div>
        <div class="report__row">
          <dt>Clipped highlights</dt>
          <dd class="tabular">{{ (report.clippedHighlights * 100).toFixed(1) }}%</dd>
        </div>
        <div class="report__row">
          <dt>Exposure</dt>
          <dd class="tabular">{{ signed(report.exposure) }}</dd>
        </div>
        <div class="report__row">
          <dt>Contrast</dt>
          <dd class="tabular">{{ signed(report.contrast) }}</dd>
        </div>
        <div class="report__row">
          <dt>Temperature</dt>
          <dd class="tabular">{{ signed(report.temperature) }}</dd>
        </div>
      </dl>
    </section>

    <p class="micro">
      Runs entirely in your browser from the image's own histogram — no API key needed and
      nothing to pay. Switch to Filters to fine-tune the result.
    </p>
  </div>
</template>

<style scoped>
.hint,
.lede {
  color: var(--text-muted);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

.hint {
  text-align: center;
  padding: var(--space-8) var(--space-4);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
}

.auto {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.section-label {
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--text-muted);
  margin-bottom: var(--space-3);
}

.report {
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-subtle);
}

.report__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.report__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  font-size: var(--text-sm);
}

.report__row dt {
  color: var(--text-muted);
}

.report__row dd {
  color: var(--text-secondary);
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
