<script setup lang="ts">
/**
 * A carousel of capability cards arranged on a real 3D cylinder.
 *
 * Each card is rotated around the Y axis by its own angle and pushed outward
 * along Z by the cylinder radius — the standard `rotateY(θ) translateZ(r)`
 * construction. Scrolling spins the whole rig, so cards genuinely travel
 * around the back and return, rather than sliding sideways.
 *
 * Under reduced motion the rig does not spin; the cards fall back to a plain
 * readable grid (see the CSS), because a rotating carousel is exactly the sort
 * of large continuous movement the preference is asking us to avoid.
 */

const sceneEl = ref<HTMLElement | null>(null)
const rigEl = ref<HTMLElement | null>(null)

const CARDS = [
  { title: 'Crop', copy: 'Freeform, or straight to the sizes LinkedIn, X and Instagram actually want.' },
  { title: 'Filters', copy: 'Fourteen presets and twelve adjustments — and the presets are just adjustment sets, so nothing is hidden from you.' },
  { title: 'Selective grading', copy: 'Lasso an object, magnetically if you like, and grade only what is inside it.' },
  { title: 'Type', copy: 'Outlines, shadows, highlight bars, letter spacing, and guides that snap to the true centre.' },
  { title: 'Drawing', copy: 'Pressure-free freehand with a real eraser and undo that goes all the way back.' },
  { title: 'Collage', copy: 'Grid or freeform across every image you have open, flattened into a new one.' },
  { title: 'Sound', copy: 'Attach a track, trim it, and encode an MP4 without a byte leaving the machine.' },
  { title: 'Export', copy: 'PNG, JPG, WEBP or MP4, re-rendered from the source file at full resolution.' },
]

/** Cylinder radius in px. Large enough that cards do not intersect. */
const RADIUS = 620

const angleFor = (index: number) => (360 / CARDS.length) * index

useScrollStage(({ gsap, reduced }) => {
  const rig = rigEl.value
  const scene = sceneEl.value
  if (!rig || !scene || reduced) return

  gsap.to(rig, {
    rotationY: -360,
    ease: 'none',
    scrollTrigger: {
      trigger: scene,
      start: 'top top',
      end: '+=220%',
      pin: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
    },
  })
})
</script>

<template>
  <section ref="sceneEl" class="deck">
    <header class="deck__head">
      <p class="eyebrow">What is actually in it</p>
      <h2 class="deck__title">Nine tools, none of them nagging you.</h2>
    </header>

    <div class="deck__stage">
      <div ref="rigEl" class="rig">
        <article
          v-for="(card, index) in CARDS"
          :key="card.title"
          class="card3d"
          :style="{ transform: `rotateY(${angleFor(index)}deg) translateZ(${RADIUS}px)` }"
        >
          <h3 class="card3d__title">{{ card.title }}</h3>
          <p class="card3d__copy">{{ card.copy }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.deck {
  position: relative;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-8);
  padding: var(--space-9) clamp(20px, 6vw, 96px);
  overflow: hidden;
}

.deck__head {
  max-width: 760px;
  margin: 0 auto;
  text-align: center;
}

.deck__title {
  font-size: clamp(1.7rem, 3.6vw, 2.9rem);
  font-weight: var(--weight-bold);
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.deck__stage {
  perspective: 1500px;
  perspective-origin: 50% 50%;
  height: min(58vh, 460px);
  display: grid;
  place-items: center;
}

.rig {
  position: relative;
  width: 300px;
  height: 100%;
  transform-style: preserve-3d;
  will-change: transform;
}

.card3d {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-6);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--bg-surface) 88%, transparent);
  backdrop-filter: blur(6px);
  /* Cards facing away are still legible edge-on without this; hiding them
     keeps the far side of the cylinder from muddying the near side. */
  backface-visibility: hidden;
}

.card3d__title {
  font-size: var(--text-xl);
  font-weight: var(--weight-medium);
  color: var(--accent);
}

.card3d__copy {
  font-size: var(--text-md);
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}

/**
 * Reduced motion: no cylinder, no spin. The same cards laid out as a plain
 * grid, which is the readable equivalent rather than a frozen carousel with
 * seven cards hidden behind the front one.
 */
@media (prefers-reduced-motion: reduce) {
  .deck {
    min-height: 0;
  }

  .deck__stage {
    perspective: none;
    height: auto;
  }

  .rig {
    width: 100%;
    height: auto;
    transform: none !important;
    transform-style: flat;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--space-4);
  }

  .card3d {
    position: static;
    transform: none !important;
    backface-visibility: visible;
  }
}
</style>
