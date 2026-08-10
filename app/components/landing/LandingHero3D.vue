<script setup lang="ts">
/**
 * Hero: a real 3D scene.
 *
 * Four planes sit at genuinely different Z depths inside a `perspective`
 * container with `preserve-3d`, so they parallax against each other from
 * perspective alone — no faked scale. Two inputs drive them:
 *
 *   - POINTER tilts the whole rig (rotateX/rotateY), which is what sells the
 *     depth as real rather than painted.
 *   - SCROLL pushes the planes apart in Z and rotates the rig further.
 *
 * Pointer tilt is gentle and opt-out under reduced motion; the scroll-driven
 * separation is large, so it is skipped there entirely.
 */

const sceneEl = ref<HTMLElement | null>(null)
const rigEl = ref<HTMLElement | null>(null)

/** Z depth per plane, in px within the 3D scene. */
const PLANES = [
  { id: 'back', z: -320, label: 'Original' },
  { id: 'mid', z: -140, label: 'Masked' },
  { id: 'front', z: 40, label: 'Graded' },
  { id: 'ui', z: 220, label: '' },
]

let detachPointer: (() => void) | null = null

useScrollStage(({ gsap, reduced }) => {
  const rig = rigEl.value
  const scene = sceneEl.value
  if (!rig || !scene) return

  /* ---- Pointer tilt --------------------------------------------------
     Kept even under reduced motion: it only responds while the pointer is
     moving, has a ~10 degree range, and stops the instant the user does. */
  const quickX = gsap.quickTo(rig, 'rotationY', { duration: 0.7, ease: 'power3.out' })
  const quickY = gsap.quickTo(rig, 'rotationX', { duration: 0.7, ease: 'power3.out' })

  function onPointer(event: PointerEvent) {
    const box = scene!.getBoundingClientRect()
    const nx = (event.clientX - box.left) / box.width - 0.5
    const ny = (event.clientY - box.top) / box.height - 0.5
    const range = reduced ? 4 : 11
    quickX(nx * range * 2)
    quickY(-ny * range)
  }

  function onLeave() {
    quickX(0)
    quickY(0)
  }

  window.addEventListener('pointermove', onPointer)
  scene.addEventListener('pointerleave', onLeave)
  detachPointer = () => {
    window.removeEventListener('pointermove', onPointer)
    scene.removeEventListener('pointerleave', onLeave)
  }

  if (reduced) return

  /* ---- Scroll: pull the stack apart in Z and swing the rig ---- */
  const planes = gsap.utils.toArray<HTMLElement>('.plane', rig)

  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: scene,
      start: 'top top',
      end: '+=150%',
      pin: true,
      scrub: 0.7,
      invalidateOnRefresh: true,
    },
  })

  timeline
    .to(rig, { rotationY: -26, rotationX: 8, ease: 'none' }, 0)
    .to(planes, {
      // Each plane travels a different distance, so they fan out in depth.
      z: (i: number) => (PLANES[i]?.z ?? 0) * 2.6,
      x: (i: number) => (i - 1.5) * 90,
      ease: 'none',
      stagger: 0.02,
    }, 0)
    .to('.plane__label', { opacity: 1, ease: 'none' }, 0.15)
})

onBeforeUnmount(() => detachPointer?.())
</script>

<template>
  <section ref="sceneEl" class="scene">
    <div class="scene__copy">
      <p class="eyebrow">Runs entirely in your browser</p>
      <h1 class="scene__title">
        Your photos never<br>
        leave <span class="accent">this machine.</span>
      </h1>
      <p class="scene__lede">
        A real editor — crop, grade, mask, letter, draw, export — with no upload, no account
        and no subscription. It works because your computer was always capable of this.
      </p>
      <div class="scene__actions">
        <NuxtLink to="/editor" class="cta">Open the editor</NuxtLink>
        <span class="scene__note">Free. Nothing to sign.</span>
      </div>
    </div>

    <div class="scene__stage">
      <div ref="rigEl" class="rig">
        <div
          v-for="(plane, index) in PLANES"
          :key="plane.id"
          class="plane"
          :class="`plane--${plane.id}`"
          :style="{ '--z': `${plane.z}px`, '--i': index }"
        >
          <span v-if="plane.label" class="plane__label">{{ plane.label }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.scene {
  position: relative;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: center;
  gap: clamp(24px, 5vw, 80px);
  padding: calc(var(--topbar-h) + var(--space-9)) clamp(20px, 6vw, 96px) var(--space-9);
  max-width: 1500px;
  margin: 0 auto;
}

/* Defined here rather than inherited: styles are scoped, so the page's copies
   of these classes do not reach this component's markup. */
.eyebrow {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--accent);
  margin-bottom: var(--space-5);
}

.accent {
  color: var(--accent);
}

.cta {
  display: inline-flex;
  align-items: center;
  height: 46px;
  padding: 0 var(--space-7);
  border-radius: var(--radius);
  background: var(--accent);
  color: var(--accent-contrast);
  font-size: var(--text-md);
  font-weight: var(--weight-medium);
  transition: background var(--dur-fast) var(--ease);
}

.cta:hover {
  background: var(--accent-hover);
}

.scene__title {
  font-size: clamp(2.3rem, 5.6vw, 4.3rem);
  font-weight: var(--weight-bold);
  line-height: 1.04;
  letter-spacing: -0.03em;
}

.scene__lede {
  margin-top: var(--space-6);
  max-width: 46ch;
  font-size: var(--text-lg);
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}

.scene__actions {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  flex-wrap: wrap;
  margin-top: var(--space-8);
}

.scene__note {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

/* ---- The 3D rig ------------------------------------------------------ */
.scene__stage {
  /* A tight perspective value is what makes the depth read as depth. */
  perspective: 1100px;
  perspective-origin: 50% 45%;
  display: grid;
  place-items: center;
  min-height: 60vh;
}

.rig {
  position: relative;
  width: min(420px, 80%);
  aspect-ratio: 3 / 4;
  transform-style: preserve-3d;
  will-change: transform;
}

.plane {
  position: absolute;
  inset: 0;
  border-radius: var(--radius);
  border: 1px solid rgb(255 255 255 / 0.14);
  transform: translateZ(var(--z));
  transform-style: preserve-3d;
  will-change: transform;
  overflow: hidden;
}

/* Each plane is a different stage of the same edit, so the stack reads as a
   pipeline seen edge-on rather than four unrelated rectangles. */
.plane--back {
  background: linear-gradient(150deg, #6b7280, #3f4650);
  filter: saturate(0.5);
}

.plane--mid {
  background: linear-gradient(150deg, #0f766e, #134e4a);
  clip-path: ellipse(46% 38% at 50% 44%);
}

.plane--front {
  background: linear-gradient(150deg, #10b981, #7c2d12 78%);
  clip-path: ellipse(40% 33% at 50% 44%);
}

/* The topmost plane is the app chrome: a viewfinder frame, no fill. */
.plane--ui {
  background: transparent;
  border: 2px solid var(--accent);
  box-shadow: 0 0 40px rgb(8 193 140 / 0.16);
}

.plane--ui::before,
.plane--ui::after {
  content: '';
  position: absolute;
  width: 28px;
  height: 28px;
  border: 2px solid var(--accent);
}

.plane--ui::before {
  top: 10px;
  left: 10px;
  border-right: none;
  border-bottom: none;
}

.plane--ui::after {
  bottom: 10px;
  right: 10px;
  border-left: none;
  border-top: none;
}

.plane__label {
  position: absolute;
  left: var(--space-4);
  bottom: var(--space-3);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: rgb(255 255 255 / 0.85);
  opacity: 0;
}

@media (max-width: 900px) {
  .scene {
    grid-template-columns: 1fr;
  }

  .scene__stage {
    min-height: 46vh;
  }
}
</style>
