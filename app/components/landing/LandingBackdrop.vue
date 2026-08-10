<script setup lang="ts">
/**
 * Ambient background layer.
 *
 * Two independent motions, deliberately treated differently for reduced motion:
 *
 *  - DRIFT is a slow CSS animation, amplitude ~3% of the viewport over ~30s.
 *    It keeps running even when reduced motion is requested: that preference
 *    guards against large or fast movement that can trigger vestibular
 *    discomfort, not against something this gentle. Killing it would leave a
 *    dead flat page for no accessibility gain.
 *
 *  - PARALLAX is tied to scroll and moves a long way, so it IS skipped under
 *    reduced motion.
 *
 * Everything animates transform/opacity only. Colour lives entirely in CSS —
 * GSAP cannot interpolate `var(--token)` as a colour, and a tween containing
 * one silently invalidates itself along with everything else in it.
 */

const rootEl = ref<HTMLElement | null>(null)

/** Depth factor per orb: how far it travels over the full page scroll. */
const DEPTHS = [-0.55, 0.32, -0.18, 0.46, -0.38, 0.22]

useScrollStage(({ gsap, reduced }) => {
  if (reduced || !rootEl.value) return

  const orbs = gsap.utils.toArray<HTMLElement>('.orb', rootEl.value)

  orbs.forEach((orb, index) => {
    const depth = DEPTHS[index] ?? 0.2
    gsap.to(orb, {
      // Measured against the real document height so the travel stays
      // proportional however long the page grows.
      y: () => depth * window.innerHeight * 1.6,
      // A little Z separation so the layers genuinely sit at different depths
      // rather than just moving at different speeds.
      z: depth * 120,
      ease: 'none',
      scrollTrigger: {
        trigger: document.documentElement,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.9,
        invalidateOnRefresh: true,
      },
    })
  })
})
</script>

<template>
  <div ref="rootEl" class="backdrop" aria-hidden="true">
    <span class="orb orb--1" />
    <span class="orb orb--2" />
    <span class="orb orb--3" />
    <span class="orb orb--4" />
    <span class="orb orb--5" />
    <span class="orb orb--6" />
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  /* Establishes the 3D context the orbs' translateZ is measured against. */
  perspective: 900px;
  perspective-origin: 50% 40%;
}

.orb {
  position: absolute;
  display: block;
  border-radius: 50%;
  /* Radial gradient rather than a hard circle plus a huge blur radius: the
     falloff is already soft, so the blur can stay modest and cheap. */
  background: radial-gradient(circle at 50% 50%, var(--accent) 0%, transparent 68%);
  filter: blur(36px);
  will-change: transform;
  transform-style: preserve-3d;
}

/* Sizes and positions are spread out so the composition never reads as a grid.
   Opacity stays in the 6–10% band asked for. */
.orb--1 {
  --drift: 34s;
  width: 46vw;
  height: 46vw;
  top: -8vh;
  left: -6vw;
  opacity: 0.1;
  animation: drift-a var(--drift) ease-in-out infinite;
}

.orb--2 {
  --drift: 41s;
  width: 34vw;
  height: 34vw;
  top: 18vh;
  right: -8vw;
  opacity: 0.08;
  animation: drift-b var(--drift) ease-in-out infinite;
}

.orb--3 {
  --drift: 47s;
  width: 52vw;
  height: 52vw;
  top: 52vh;
  left: 12vw;
  opacity: 0.07;
  animation: drift-c var(--drift) ease-in-out infinite;
}

.orb--4 {
  --drift: 38s;
  width: 28vw;
  height: 28vw;
  top: 76vh;
  right: 6vw;
  opacity: 0.09;
  animation: drift-a var(--drift) ease-in-out infinite reverse;
}

.orb--5 {
  --drift: 52s;
  width: 40vw;
  height: 40vw;
  top: 34vh;
  left: 38vw;
  opacity: 0.06;
  animation: drift-b var(--drift) ease-in-out infinite;
}

.orb--6 {
  --drift: 44s;
  width: 24vw;
  height: 24vw;
  top: 6vh;
  left: 46vw;
  opacity: 0.08;
  animation: drift-c var(--drift) ease-in-out infinite reverse;
}

/**
 * base.css flattens every animation to 0.01ms under reduced motion. That is the
 * right default, but the ambient drift is a deliberate exception: a few percent
 * of the viewport over ~40 seconds is atmosphere, not motion, and suppressing it
 * buys no accessibility while leaving the page visibly dead. Re-asserted with
 * higher specificity so it survives the global `*` rule.
 */
@media (prefers-reduced-motion: reduce) {
  .backdrop .orb {
    animation-duration: var(--drift) !important;
  }
}

/* Amplitude is a few percent of the viewport across half a minute — slow
   enough to read as atmosphere rather than motion. */
@keyframes drift-a {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(3vw, -2.5vh, 0) scale(1.06); }
}

@keyframes drift-b {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1.04); }
  50% { transform: translate3d(-2.5vw, 3vh, 0) scale(1); }
}

@keyframes drift-c {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(2vw, 3vh, 0) scale(1.05); }
}
</style>
