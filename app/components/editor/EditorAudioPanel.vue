<script setup lang="ts">
const { hasImage } = useEditor()
const {
  track,
  trimStart,
  trimEnd,
  motion,
  busy,
  stage,
  progress,
  error,
  clipLength,
  clipTooLong,
  canRender,
  setTrack,
  clearTrack,
  setTrim,
  downloadVideo,
} = useAudio()

const fileEl = ref<HTMLInputElement | null>(null)

function onPick(event: Event) {
  const input = event.target as HTMLInputElement
  setTrack(input.files?.[0])
  input.value = ''
}

function clock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
</script>

<template>
  <div v-if="!hasImage" class="hint">Open an image to make a video from it.</div>

  <div v-else class="audio">
    <section class="group">
      <p class="section-label">Track</p>

      <div v-if="!track" class="pick">
        <p class="pick__text">Add an audio file to turn this image into an MP4.</p>
        <UiButton variant="secondary" size="sm" block icon="upload" @click="fileEl?.click()">
          Choose audio
        </UiButton>
      </div>

      <div v-else class="track">
        <div class="track__row">
          <UiIcon name="music" :size="15" />
          <span class="track__name" :title="track.name">{{ track.name }}</span>
          <button class="track__remove" title="Remove track" @click="clearTrack">
            <UiIcon name="close" :size="13" />
          </button>
        </div>
        <p class="track__meta tabular">{{ clock(track.duration) }} · {{ Math.round(track.size / 1024) }} KB</p>
        <audio :src="track.src" controls class="track__player" />
      </div>

      <input ref="fileEl" type="file" accept="audio/*" class="visually-hidden" @change="onPick">
    </section>

    <section v-if="track" class="group">
      <p class="section-label">Trim</p>
      <UiSlider
        :model-value="trimStart"
        label="Start"
        :min="0"
        :max="Math.max(0.5, track.duration - 0.5)"
        :step="0.1"
        :default="0"
        @update:model-value="setTrim($event, trimEnd)"
      />
      <UiSlider
        :model-value="trimEnd"
        label="End"
        :min="0.5"
        :max="track.duration"
        :step="0.1"
        :default="track.duration"
        @update:model-value="setTrim(trimStart, $event)"
      />
      <p class="length tabular" :class="{ 'is-error': clipTooLong }">
        Clip {{ clock(clipLength) }}<span v-if="clipTooLong"> — max {{ MAX_CLIP_SECONDS }}s</span>
      </p>
    </section>

    <section v-if="track" class="group">
      <p class="section-label">Motion</p>
      <div class="motions">
        <UiChip
          v-for="m in VIDEO_MOTIONS"
          :key="m.id"
          :label="m.label"
          :active="motion === m.id"
          @click="motion = m.id"
        />
      </div>
    </section>

    <section class="group">
      <UiButton variant="primary" block icon="export" :disabled="!canRender || busy" @click="downloadVideo">
        {{ busy ? (stage || 'Working…') : 'Export MP4' }}
      </UiButton>

      <div v-if="busy" class="progress">
        <div class="progress__bar" :style="{ width: `${Math.round(progress * 100)}%` }" />
      </div>

      <p v-if="error" class="error">{{ error }}</p>
      <p class="note">
        Encoded in your browser — the audio never leaves this device. The first export downloads a
        ~31 MB encoder, so it takes noticeably longer than later ones.
      </p>
    </section>
  </div>
</template>

<style scoped>
.hint {
  color: var(--text-muted);
  font-size: var(--text-sm);
  text-align: center;
  padding: var(--space-8) var(--space-4);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
}

.audio {
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

.pick__text {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: var(--leading-normal);
  margin-bottom: var(--space-3);
}

.track {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.track__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--text-secondary);
}

.track__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-sm);
  color: var(--text);
}

.track__remove {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-xs);
  color: var(--text-muted);
}

.track__remove:hover {
  color: var(--danger);
  background: var(--danger-soft);
}

.track__meta {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.track__player {
  width: 100%;
  height: 32px;
  margin-top: var(--space-2);
}

.length {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.length.is-error {
  color: var(--danger);
}

.motions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.progress {
  height: 3px;
  border-radius: var(--radius-pill);
  background: var(--bg-raised);
  overflow: hidden;
}

.progress__bar {
  height: 100%;
  background: var(--accent);
  transition: width var(--dur-fast) var(--ease);
}

.error {
  font-size: var(--text-sm);
  color: var(--danger);
}

.note {
  font-size: var(--text-sm);
  color: var(--text-muted);
  line-height: var(--leading-normal);
}
</style>
