/**
 * GSAP + Lenis, wired for the landing page only.
 *
 * Both libraries are imported dynamically inside `onMounted`:
 *  - ScrollTrigger touches `window` at registration, so importing at module
 *    scope breaks the server build outright;
 *  - and it keeps ~70 KB out of the signed-in editor's bundle entirely.
 *
 * Every caller gets its own `gsap.context()`, reverted on unmount. In an SPA,
 * ScrollTriggers created by a page that has since been navigated away from
 * otherwise survive and start fighting the next page's.
 */

export function prefersReducedMotion() {
  return import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export interface ScrollStage {
  gsap: typeof import('gsap').gsap
  ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger
  /**
   * True when the visitor asked for reduced motion.
   *
   * This is passed to the build function rather than used to skip it, because
   * "reduced motion" is not "no animation". What the preference guards against
   * is vestibular discomfort from large movement — parallax, pinned panning,
   * things flying across the viewport. A word changing opacity as you scroll
   * past it causes none of that, and suppressing it removes the entire point of
   * the page while leaving a dead husk behind.
   *
   * So: honour it for TRANSFORMS, ignore it for OPACITY and colour.
   */
  reduced: boolean
}

let lenis: { raf: (t: number) => void; destroy: () => void; on: (e: string, cb: () => void) => void } | null = null
let lenisUsers = 0

/**
 * Smooth scroll, shared across the page's sections. Reference-counted so the
 * last section to unmount tears it down — two instances would fight over the
 * scroll position.
 */
async function acquireLenis(onScroll: () => void) {
  lenisUsers += 1
  if (lenis) {
    lenis.on('scroll', onScroll)
    return lenis
  }

  const { default: Lenis } = await import('lenis')
  const instance = new Lenis({ duration: 1.05, smoothWheel: true })
  instance.on('scroll', onScroll)

  let frame = 0
  const tick = (time: number) => {
    instance.raf(time)
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)

  lenis = {
    raf: t => instance.raf(t),
    on: (e, cb) => instance.on(e as 'scroll', cb),
    destroy: () => {
      cancelAnimationFrame(frame)
      instance.destroy()
    },
  }
  return lenis
}

function releaseLenis() {
  lenisUsers = Math.max(0, lenisUsers - 1)
  if (lenisUsers === 0 && lenis) {
    lenis.destroy()
    lenis = null
  }
}

/**
 * Set up a scroll stage. `build` receives gsap + ScrollTrigger and runs inside
 * a context; return nothing — cleanup is handled by reverting the context.
 *
 * `build` ALWAYS runs. It is handed a `reduced` flag and decides per-animation
 * what to do with it (see ScrollStage). Smooth scrolling is the one thing
 * switched off wholesale under reduced motion — hijacking the scroll velocity
 * is exactly the kind of movement the preference is asking us not to do.
 */
export function useScrollStage(build: (stage: ScrollStage) => void) {
  const ready = ref(false)
  let context: { revert: () => void } | null = null
  let usingLenis = false

  onMounted(async () => {
    const reduced = prefersReducedMotion()

    const [{ gsap }, { ScrollTrigger }] = await Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
    ])
    gsap.registerPlugin(ScrollTrigger)

    if (!reduced) {
      await acquireLenis(() => ScrollTrigger.update())
      usingLenis = true
    }

    context = gsap.context(() => build({ gsap, ScrollTrigger, reduced }))
    // Layout settles after hydration; refreshing on the next frame stops
    // triggers being measured against a half-built DOM.
    await nextTick()
    ScrollTrigger.refresh()
    ready.value = true
  })

  onBeforeUnmount(() => {
    context?.revert()
    context = null
    if (usingLenis) releaseLenis()
  })

  return { ready }
}
