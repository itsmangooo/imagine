<script setup lang="ts">
definePageMeta({ layout: 'marketing' })
useHead({ title: 'Imagine — a photo editor that runs in your browser' })

const heroEl = ref<HTMLElement | null>(null)
const scanEl = ref<HTMLElement | null>(null)
const gradedEl = ref<HTMLElement | null>(null)
const railEl = ref<HTMLElement | null>(null)
const galleryEl = ref<HTMLElement | null>(null)
const statementEl = ref<HTMLElement | null>(null)

/**
 * The big statement, split into words so each can be revealed independently.
 * `accent` marks the words that land on the green as they brighten, so the
 * emphasis is carried by the animation rather than by markup the reader has to
 * decode when it is static.
 */
const STATEMENT = 'Most photo editors want your photos on their servers. Some want your money every month. Imagine wants neither. It is a real editor — crop, grade, mask, draw — that runs entirely in your browser. Your photos never leave your machine. It is free because it costs us nothing to give away.'

const ACCENT_WORDS = new Set(['neither.', 'browser.', 'machine.', 'free'])

const statementWords = STATEMENT.split(' ').map((word, index) => ({
  id: `${index}-${word}`,
  word,
  accent: ACCENT_WORDS.has(word),
}))

const TOOL_CARDS = [
  { icon: 'crop' as const, title: 'Crop', copy: 'Freeform or straight to LinkedIn, X and Instagram sizes.' },
  { icon: 'filters' as const, title: 'Filters', copy: '14 presets and 12 adjustments, grouped and always editable.' },
  { icon: 'grading' as const, title: 'Colour grading', copy: 'Lasso an object and grade only that region.' },
  { icon: 'text' as const, title: 'Text', copy: 'Outlines, shadows, highlight bars and centre-snap guides.' },
  { icon: 'doodle' as const, title: 'Doodle', copy: 'Draw and erase freehand, with undo all the way back.' },
  { icon: 'collage' as const, title: 'Collage', copy: 'Grid or freeform, flattened into a new image.' },
  { icon: 'music' as const, title: 'Music', copy: 'Add a track and export an MP4, encoded in your browser.' },
  { icon: 'generate' as const, title: 'AI portraits', copy: 'Your own Replicate key. We never touch your payment.' },
]

const STEPS = [
  { n: '01', title: 'Drop in your photos', copy: 'As many as you like. Each keeps its own edit history, so you can jump between them.' },
  { n: '02', title: 'Edit without uploading', copy: 'Crop, grade, mask, letter and draw. Every pixel stays on your machine.' },
  { n: '03', title: 'Export at full resolution', copy: 'PNG, JPG, WEBP or MP4 — re-rendered from the source, never from the preview.' },
]

useScrollStage(({ gsap, reduced }) => {
  /* ---- Big statement: words brighten as they cross the scroll threshold.
     Opacity and colour only, so this runs even under reduced motion — it is
     the whole point of the section. */
  if (statementEl.value) {
    const words = gsap.utils.toArray<HTMLElement>('.statement__word', statementEl.value)
    gsap.set(words, { opacity: 0.16 })

    // Opacity ONLY. GSAP cannot interpolate `var(--token)` as a colour, and an
    // unparseable property invalidates the whole tween — which silently took
    // the opacity down with it. Accent words get their colour from CSS and
    // brighten along with everything else.
    gsap.to(words, {
      opacity: 1,
      ease: 'none',
      // Each word finishes slightly after the one before, so the sentence
      // writes itself in rather than the block fading as one lump.
      stagger: { each: 0.4, from: 'start' },
      scrollTrigger: {
        trigger: statementEl.value,
        start: 'top top',
        // Long enough to read comfortably while scrubbing through it.
        end: '+=170%',
        pin: true,
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    })
  }

  // --- Hero: scrub a scan line down the frame while the graded half wipes in.
  // Skipped under reduced motion: it pins and pans, which is the movement the
  // preference exists to avoid. The static layout already shows the graded state.
  if (!reduced && heroEl.value && scanEl.value && gradedEl.value) {
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: heroEl.value,
        start: 'top top',
        end: '+=140%',
        pin: true,
        scrub: 0.6,
        invalidateOnRefresh: true,
      },
    })

    // A measured pixel distance, NOT yPercent: yPercent is relative to the
    // element's OWN height, so on a 2px scan line it moves 2px, not the frame.
    timeline
      .fromTo(
        scanEl.value,
        { y: 0, opacity: 0 },
        { y: () => (heroEl.value?.querySelector('.shot')?.clientHeight ?? 0), opacity: 1, ease: 'none' },
        0,
      )
      .fromTo(
        gradedEl.value,
        { clipPath: 'inset(0 0 100% 0)' },
        { clipPath: 'inset(0 0 0% 0)', ease: 'none' },
        0,
      )
      .to(scanEl.value, { opacity: 0, duration: 0.1 }, 0.9)
  }

  // --- Tool cards: staggered reveal. The rise is dropped under reduced
  // motion, but the fade stays — it costs nothing and keeps the rhythm.
  gsap.utils.toArray<HTMLElement>('.card').forEach((card, index) => {
    gsap.from(card, {
      y: reduced ? 0 : 28,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
      delay: (index % 4) * 0.06,
      scrollTrigger: { trigger: card, start: 'top 88%' },
    })
  })

  // --- Horizontal gallery: translate by the MEASURED overhang, never a guess.
  // Pinned panning is real movement, so reduced motion gets the plain
  // scrollable rail the CSS already provides.
  if (!reduced && railEl.value && galleryEl.value) {
    const overhang = () => Math.max(0, railEl.value!.scrollWidth - window.innerWidth)
    gsap.to(railEl.value, {
      x: () => -overhang(),
      ease: 'none',
      scrollTrigger: {
        trigger: galleryEl.value,
        start: 'top top',
        end: () => `+=${overhang()}`,
        pin: true,
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    })
  }

  // --- Steps: parallax on the numerals.
  gsap.utils.toArray<HTMLElement>('.step__n').forEach((n) => {
    gsap.from(n, {
      y: reduced ? 0 : 40,
      opacity: 0,
      duration: 0.6,
      ease: 'power2.out',
      scrollTrigger: { trigger: n, start: 'top 90%' },
    })
  })
})
</script>

<template>
  <div class="landing">
    <!-- HERO -->
    <section ref="heroEl" class="hero">
      <div class="hero__inner">
        <div class="hero__copy">
          <p class="eyebrow">Runs entirely in your browser</p>
          <h1 class="hero__title">
            A real photo editor<br>
            that never uploads<br>
            <span class="accent">your photos.</span>
          </h1>
          <p class="hero__lede">
            Crop, grade, mask, letter, draw and export at full resolution — all on your own
            machine. No account needed, nothing to pay, nothing sent anywhere.
          </p>
          <div class="hero__actions">
            <NuxtLink to="/editor" class="cta">Start editing — it's free</NuxtLink>
            <span class="hero__note">No sign-up. No upload. No catch.</span>
          </div>
        </div>

        <div class="hero__stage">
          <div class="shot">
            <div class="shot__base" />
            <div ref="gradedEl" class="shot__graded" />
            <div ref="scanEl" class="shot__scan" />
            <div class="shot__brackets" aria-hidden="true">
              <span /><span /><span /><span />
            </div>
          </div>
          <p class="shot__caption">Scroll to grade</p>
        </div>
      </div>
    </section>

    <!-- BIG STATEMENT — words brighten as you scroll through -->
    <section ref="statementEl" class="statement">
      <p class="statement__text">
        <span
          v-for="item in statementWords"
          :key="item.id"
          class="statement__word"
          :data-accent="item.accent ? 'true' : 'false'"
        >{{ item.word }}</span>
      </p>
    </section>

    <!-- TOOLS -->
    <section class="tools">
      <header class="section-head">
        <h2 class="section-title">Everything you'd expect, and the parts you wouldn't.</h2>
        <p class="section-lede">
          That's the promise. Here's what it actually buys you — nine tools that would normally
          mean a subscription and an upload queue, running on your own hardware instead.
        </p>
      </header>
      <div class="cards">
        <article v-for="tool in TOOL_CARDS" :key="tool.title" class="card">
          <UiIcon :name="tool.icon" :size="20" />
          <h3 class="card__title">{{ tool.title }}</h3>
          <p class="card__copy">{{ tool.copy }}</p>
        </article>
      </div>
    </section>

    <!-- HORIZONTAL GALLERY -->
    <section ref="galleryEl" class="gallery">
      <div ref="railEl" class="rail">
        <div class="rail__intro">
          <h2 class="section-title">Built for real work.</h2>
          <p class="section-lede">Masked grading, multi-image sessions, full-resolution export.</p>
        </div>
        <figure v-for="n in 6" :key="n" class="frame" :class="`frame--${n}`">
          <figcaption>0{{ n }}</figcaption>
        </figure>
      </div>
    </section>

    <!-- STEPS -->
    <section class="steps">
      <div v-for="step in STEPS" :key="step.n" class="step">
        <p class="step__n">{{ step.n }}</p>
        <h3 class="step__title">{{ step.title }}</h3>
        <p class="step__copy">{{ step.copy }}</p>
      </div>
    </section>

    <!-- CLOSE -->
    <section class="close">
      <h2 class="close__title">Open it and start.</h2>
      <p class="close__lede">
        The editor is free and always will be — it runs on your machine, so it costs us nothing
        to give away. AI portraits use your own Replicate key, billed to you directly.
      </p>
      <NuxtLink to="/editor" class="cta cta--lg">Open the editor</NuxtLink>
      <footer class="foot">
        <AppLogo :size="20" />
        <span>© {{ new Date().getFullYear() }} Imagine</span>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.landing {
  --gutter: clamp(20px, 6vw, 96px);
}

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

/* ---- Hero ---- */
.hero {
  min-height: 100dvh;
  display: grid;
  align-content: center;
  padding: calc(var(--topbar-h) + var(--space-9)) var(--gutter) var(--space-9);
}

.hero__inner {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: clamp(32px, 6vw, 96px);
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.hero__title {
  font-size: clamp(2.4rem, 6vw, 4.6rem);
  font-weight: var(--weight-bold);
  line-height: 1.03;
  letter-spacing: -0.03em;
}

.hero__lede {
  margin-top: var(--space-6);
  max-width: 46ch;
  font-size: var(--text-lg);
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}

.hero__actions {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  flex-wrap: wrap;
  margin-top: var(--space-8);
}

.hero__note {
  font-size: var(--text-sm);
  color: var(--text-muted);
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

.cta--lg {
  height: 54px;
  padding: 0 var(--space-9);
  font-size: var(--text-lg);
}

/* The "photo": two generated gradients, so there is no asset to download and
   the transformation is a real change rather than a frame sequence. */
.shot {
  position: relative;
  aspect-ratio: 4 / 5;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border);
}

.shot__base,
.shot__graded {
  position: absolute;
  inset: 0;
}

.shot__base {
  background:
    radial-gradient(120% 80% at 30% 20%, #4b5563 0%, transparent 60%),
    linear-gradient(150deg, #6b7280, #3f4650 70%);
  filter: saturate(0.55) brightness(0.9);
}

.shot__graded {
  background:
    radial-gradient(120% 80% at 30% 20%, #10b981 0%, transparent 55%),
    linear-gradient(150deg, #0f766e, #7c2d12 78%);
  filter: saturate(1.15) contrast(1.08);
}

.shot__scan {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 2px;
  background: var(--accent);
  box-shadow: 0 0 18px 2px var(--accent);
  opacity: 0;
}

.shot__brackets span {
  position: absolute;
  width: 26px;
  height: 26px;
  border: 2px solid rgb(255 255 255 / 0.85);
}

.shot__brackets span:nth-child(1) { top: 12px; left: 12px; border-right: none; border-bottom: none; }
.shot__brackets span:nth-child(2) { top: 12px; right: 12px; border-left: none; border-bottom: none; }
.shot__brackets span:nth-child(3) { bottom: 12px; right: 12px; border-left: none; border-top: none; }
.shot__brackets span:nth-child(4) { bottom: 12px; left: 12px; border-right: none; border-top: none; }

.shot__caption {
  margin-top: var(--space-4);
  text-align: center;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

/* ---- Big statement ---- */
.statement {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--space-9) var(--gutter);
}

.statement__text {
  max-width: 22ch;
  font-size: clamp(1.9rem, 5.2vw, 4rem);
  font-weight: var(--weight-medium);
  line-height: 1.18;
  letter-spacing: -0.025em;
  text-wrap: balance;
}

.statement__word {
  /* Opacity is animated by GSAP. Set here too so the text is legible-but-dim
     before any script runs, rather than invisible. */
  opacity: 0.16;
  transition: none;
  /* The gap is a MARGIN, not a text space. Vue collapses whitespace between
     interpolations, which ran every word together into one unbreakable string
     that then overflowed the viewport. inline-block keeps each word whole so
     lines break between words rather than mid-word. */
  display: inline-block;
  margin-inline-end: 0.26em;
}

/* Emphasis is carried by colour, which stays out of the tween entirely. */
.statement__word[data-accent='true'] {
  color: var(--accent);
}

/* ---- Sections ---- */
.section-head {
  max-width: 720px;
  margin-bottom: var(--space-9);
}

.section-title {
  font-size: clamp(1.7rem, 3.4vw, 2.75rem);
  font-weight: var(--weight-bold);
  letter-spacing: -0.02em;
  line-height: 1.1;
}

.section-lede {
  margin-top: var(--space-4);
  font-size: var(--text-lg);
  color: var(--text-secondary);
}

.tools {
  padding: var(--space-10) var(--gutter);
  max-width: 1400px;
  margin: 0 auto;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: var(--space-5);
}

.card {
  padding: var(--space-6);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-surface);
  color: var(--accent);
}

.card__title {
  margin: var(--space-4) 0 var(--space-2);
  font-size: var(--text-lg);
  color: var(--text);
}

.card__copy {
  font-size: var(--text-md);
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}

/* ---- Horizontal gallery ---- */
.gallery {
  /* Laid out to read correctly even when the pin never happens (reduced
     motion): it simply becomes a horizontally scrollable rail. */
  min-height: 100dvh;
  display: flex;
  align-items: center;
  overflow-x: auto;
  padding: var(--space-9) 0;
}

.rail {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  padding: 0 var(--gutter);
  will-change: transform;
}

.rail__intro {
  flex: none;
  width: min(460px, 74vw);
  padding-right: var(--space-6);
}

.frame {
  position: relative;
  flex: none;
  width: min(360px, 68vw);
  aspect-ratio: 3 / 4;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  overflow: hidden;
}

.frame figcaption {
  position: absolute;
  left: var(--space-5);
  bottom: var(--space-4);
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  color: rgb(255 255 255 / 0.9);
}

.frame--1 { background: linear-gradient(160deg, #0f766e, #134e4a); }
.frame--2 { background: linear-gradient(160deg, #b45309, #7c2d12); }
.frame--3 { background: linear-gradient(160deg, #1d4ed8, #1e3a8a); }
.frame--4 { background: linear-gradient(160deg, #4d7c0f, #14532d); }
.frame--5 { background: linear-gradient(160deg, #9d174d, #4c0519); }
.frame--6 { background: linear-gradient(160deg, #3f3f46, #18181b); }

/* ---- Steps ---- */
.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-8);
  padding: var(--space-10) var(--gutter);
  max-width: 1400px;
  margin: 0 auto;
}

.step__n {
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  color: var(--accent);
  margin-bottom: var(--space-4);
}

.step__title {
  font-size: var(--text-xl);
  margin-bottom: var(--space-3);
}

.step__copy {
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}

/* ---- Close ---- */
.close {
  text-align: center;
  padding: var(--space-10) var(--gutter) var(--space-8);
}

.close__title {
  font-size: clamp(2rem, 5vw, 3.4rem);
  font-weight: var(--weight-bold);
  letter-spacing: -0.02em;
}

.close__lede {
  max-width: 56ch;
  margin: var(--space-5) auto var(--space-8);
  color: var(--text-secondary);
  font-size: var(--text-lg);
  line-height: var(--leading-relaxed);
}

.foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  margin-top: var(--space-10);
  padding-top: var(--space-6);
  border-top: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

@media (max-width: 900px) {
  .hero__inner {
    grid-template-columns: 1fr;
  }
}
</style>
