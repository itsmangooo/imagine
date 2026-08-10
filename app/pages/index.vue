<script setup lang="ts">
definePageMeta({ layout: 'marketing' })

const DESCRIPTION
  = 'A real photo editor that runs entirely in your browser. Crop, grade, mask, letter, draw and export at full resolution — your photos are never uploaded. Free, no account needed.'

useSeoMeta({
  title: 'Imagine — a photo editor that runs in your browser',
  description: DESCRIPTION,
  ogTitle: 'Imagine — a photo editor that never uploads your photos',
  ogDescription: DESCRIPTION,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Imagine — a photo editor that never uploads your photos',
  twitterDescription: DESCRIPTION,
})

const statementEl = ref<HTMLElement | null>(null)
const missionEl = ref<HTMLElement | null>(null)
const essayEl = ref<HTMLElement | null>(null)
const showcaseEl = ref<HTMLElement | null>(null)

/* ---- The big scroll-revealed statement ---- */
const STATEMENT
  = 'Most photo editors want your photos on their servers. Some want your money every month. Imagine wants neither. It is a real editor — crop, grade, mask, draw — that runs entirely in your browser. Your photos never leave your machine. It is free because it costs us nothing to give away.'

const ACCENT_WORDS = new Set(['neither.', 'browser.', 'machine.', 'free'])

const statementWords = STATEMENT.split(' ').map((word, index) => ({
  id: `${index}-${word}`,
  word,
  accent: ACCENT_WORDS.has(word),
}))

/* ---- Longer-form reading ---- */
const MISSION = [
  'Every photo editor worth using seems to arrive with a toll booth attached. Upload your pictures to somebody else\'s servers, or pay a subscription every month for software you will never own — and usually both at once.',
  'None of that is a technical requirement. Browsers have been able to do this work for years: they can decode a RAW-sized JPEG, push it through a GPU shader, and hand you the result faster than a round trip to a data centre would take. The tolls are a business model, not a constraint.',
  'Imagine is the argument made concrete. A genuinely capable editor — crop, grade, mask, letter, draw, compose, export — running entirely on hardware you already own. Your photos are never uploaded, because there is nowhere to upload them to.',
  'It stays free because giving it away costs us nothing. There is no server bill that scales with your usage, because there is no server in the path at all. The single feature that genuinely needs one — AI portrait generation — runs on your own API key and is billed to you directly, at cost, by the provider.',
]

const ESSAY = [
  {
    heading: 'Local is not a compromise any more',
    body: [
      'For a long time "runs in the browser" meant a toy: a resize box, three filters, a watermark. That was a fair description in 2014. It has not been true for years, and most of the industry simply never revisited the assumption.',
      'Every adjustment here runs as a GPU shader through the same pipeline a native application would use. A twelve-megapixel photo takes a few milliseconds per pass, which is faster than the upload progress bar you would otherwise be watching. The bottleneck was never the browser.',
    ],
  },
  {
    heading: 'Nothing here is a preview of something better',
    body: [
      'There is no export watermark, no resolution ceiling, no locked filter, and no button that turns out to require a plan. Crop, filters, selective grading, text, drawing, collage, audio and export are the whole product, and they are all free.',
      'Export re-renders from your original file at full resolution — it never captures what is on screen. The preview is deliberately downscaled so that dragging a slider stays instant on a twenty-megapixel image; the file you get back is not.',
    ],
  },
  {
    heading: 'Privacy without a privacy policy',
    body: [
      'The strongest privacy guarantee is not a promise in a document. It is an architecture in which the data was never transmitted, so there is nothing to leak, subpoena, sell, train on, or accidentally leave in a public bucket.',
      'Open the network tab while you work. You will see the page load, and then nothing. That is the entire claim, and you can verify it yourself in about four seconds.',
    ],
  },
  {
    heading: 'Where the AI fits',
    body: [
      'One feature genuinely cannot run locally: generating a portrait from a single photograph needs a model far larger than anything sensible to ship to a browser. So that one runs on Replicate — using your API key, billed to your account, at roughly two cents an image.',
      'We never see the key beyond the request that uses it, we take no cut, and the rest of the editor keeps working perfectly without one. If you never touch AI generation, you never need an account anywhere.',
    ],
  },
]

const SHOWCASE = [
  { id: 'mask', title: 'Lasso an object', copy: 'Trace it freehand, or let magnetic mode cling to the real edges in the image.' },
  { id: 'grade', title: 'Grade just that region', copy: 'Hue, saturation, luminance and temperature, confined to the selection you drew.' },
  { id: 'text', title: 'Set type on it', copy: 'Outlines, shadows, highlight bars, and guides that snap to the true centre.' },
  { id: 'collage', title: 'Compose several at once', copy: 'Grid or freeform, flattened into a new image you can carry on editing.' },
  { id: 'video', title: 'Add a track, get an MP4', copy: 'Encoded in your browser. The audio never leaves the machine either.' },
  { id: 'export', title: 'Export at full resolution', copy: 'Re-rendered from the source file, never captured from the preview.' },
]

const FAQ = [
  {
    q: 'Is it really free, or free for now?',
    a: 'Really free. The editor costs nothing to run because it runs on your computer, not ours. There is no usage bill for us to eventually pass on to you.',
  },
  {
    q: 'Do I need an account?',
    a: 'No. There is no sign-up, and no account exists to be deleted later. Open the editor and start.',
  },
  {
    q: 'What happens to my photos?',
    a: 'Nothing. They are read by the page, held in memory, and discarded when you close the tab. They are never transmitted anywhere.',
  },
  {
    q: 'What does the AI feature cost?',
    a: 'Around two cents per portrait, billed by Replicate directly to your own account. We handle no payments and take no percentage.',
  },
  {
    q: 'Can I use the results commercially?',
    a: 'The edits are yours — it is your photo and your machine. AI generations are governed by the model provider\'s terms, which is between you and them.',
  },
]

useScrollStage(({ gsap, reduced }) => {
  /* ---- Statement: words brighten as they cross the threshold. Opacity only,
     so this runs even under reduced motion — it is the point of the section. */
  if (statementEl.value) {
    const words = gsap.utils.toArray<HTMLElement>('.statement__word', statementEl.value)
    gsap.set(words, { opacity: 0.16 })
    gsap.to(words, {
      opacity: 1,
      ease: 'none',
      stagger: { each: 0.4, from: 'start' },
      scrollTrigger: {
        trigger: statementEl.value,
        start: 'top top',
        end: '+=170%',
        pin: true,
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    })
  }

  /**
   * Generic reveal. `fromTo` with immediateRender:false is load-bearing: a
   * plain gsap.from() applies its start state at build time, so a trigger that
   * never fires — because async content resized the page after ScrollTrigger
   * measured — leaves the section permanently invisible.
   */
  const reveal = (targets: string, root?: HTMLElement | null, stagger = 0.1) => {
    const items = gsap.utils.toArray<HTMLElement>(targets, root ?? undefined)
    if (!items.length) return
    gsap.fromTo(
      items,
      { y: reduced ? 0 : 26, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: 'power2.out',
        stagger,
        immediateRender: false,
        scrollTrigger: { trigger: items[0], start: 'top 88%', once: true },
      },
    )
  }

  reveal('.mission__reveal', missionEl.value, 0.12)
  reveal('.chapter', essayEl.value, 0.08)
  reveal('.faq__item', null, 0.06)
  reveal('.step', null, 0.1)

  /* ---- Showcase: cards tilt in 3D as they cross the viewport ---- */
  if (showcaseEl.value && !reduced) {
    gsap.utils.toArray<HTMLElement>('.tile', showcaseEl.value).forEach((tile) => {
      gsap.fromTo(
        tile,
        { rotationY: 16, rotationX: -6, z: -140, opacity: 0 },
        {
          rotationY: 0,
          rotationX: 0,
          z: 0,
          opacity: 1,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: {
            trigger: tile,
            start: 'top 92%',
            end: 'top 55%',
            scrub: 0.6,
          },
        },
      )
    })
  }
})
</script>

<template>
  <div class="landing">
    <LandingHero3D />

    <!-- BIG STATEMENT -->
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

    <!-- 3D CAPABILITY CAROUSEL -->
    <LandingDeck3D />

    <!-- MISSION -->
    <section ref="missionEl" class="mission">
      <p class="eyebrow mission__reveal">Why this exists</p>
      <h2 class="mission__title mission__reveal">Nobody needs your photos on their server.</h2>
      <div class="mission__body">
        <p v-for="(para, i) in MISSION" :key="i" class="mission__para mission__reveal">{{ para }}</p>
      </div>
    </section>

    <!-- LONG READ -->
    <section ref="essayEl" class="essay">
      <article v-for="chapter in ESSAY" :key="chapter.heading" class="chapter">
        <h3 class="chapter__heading">{{ chapter.heading }}</h3>
        <div class="chapter__body">
          <p v-for="(para, i) in chapter.body" :key="i">{{ para }}</p>
        </div>
      </article>
    </section>

    <!-- SHOWCASE -->
    <section ref="showcaseEl" class="showcase">
      <header class="section-head">
        <h2 class="section-title">From selection to finished file.</h2>
        <p class="section-lede">
          The parts that usually mean a subscription and an upload queue, running on your own
          hardware instead.
        </p>
      </header>
      <div class="tiles">
        <figure v-for="item in SHOWCASE" :key="item.id" class="tile" :class="`tile--${item.id}`">
          <div class="tile__art" aria-hidden="true">
            <span class="art art--a" />
            <span class="art art--b" />
            <span class="art art--c" />
          </div>
          <figcaption class="tile__caption">
            <span class="tile__title">{{ item.title }}</span>
            <span class="tile__copy">{{ item.copy }}</span>
          </figcaption>
        </figure>
      </div>
    </section>

    <!-- STEPS -->
    <section class="steps">
      <div class="step">
        <p class="step__n">01</p>
        <h3 class="step__title">Drop in your photos</h3>
        <p class="step__copy">
          As many as you like. Each keeps its own independent edit history, so you can jump
          between them without losing where you were.
        </p>
      </div>
      <div class="step">
        <p class="step__n">02</p>
        <h3 class="step__title">Edit without uploading</h3>
        <p class="step__copy">
          Crop, grade, mask, letter and draw. Every pixel stays on your machine for the whole
          session — there is no request that could carry it anywhere.
        </p>
      </div>
      <div class="step">
        <p class="step__n">03</p>
        <h3 class="step__title">Export at full resolution</h3>
        <p class="step__copy">
          PNG, JPG, WEBP or MP4, re-rendered from the source file rather than captured from the
          preview, so nothing is quietly downscaled on the way out.
        </p>
      </div>
    </section>

    <!-- FAQ -->
    <section class="faq">
      <header class="section-head">
        <h2 class="section-title">The obvious questions.</h2>
      </header>
      <dl class="faq__list">
        <div v-for="item in FAQ" :key="item.q" class="faq__item">
          <dt class="faq__q">{{ item.q }}</dt>
          <dd class="faq__a">{{ item.a }}</dd>
        </div>
      </dl>
    </section>

    <LandingContributors />

    <!-- CLOSE -->
    <section class="close">
      <h2 class="close__title">Open it and start.</h2>
      <p class="close__lede">
        No account, no upload, no trial that expires. The editor is free and stays free, because
        it runs on your machine and costs us nothing to give away.
      </p>
      <NuxtLink to="/editor" class="cta cta--lg">Open the editor</NuxtLink>

      <footer class="foot">
        <div class="foot__brand">
          <AppLogo :size="20" />
          <span>© {{ new Date().getFullYear() }} Imagine</span>
        </div>
        <nav class="foot__links">
          <NuxtLink to="/editor" class="foot__link">Editor</NuxtLink>
          <NuxtLink to="/settings" class="foot__link">API key</NuxtLink>
          <a
            class="foot__link"
            href="https://github.com/itsmangooo/imagine"
            target="_blank"
            rel="noopener noreferrer"
          >Source</a>
        </nav>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.landing {
  --gutter: clamp(20px, 6vw, 96px);
  position: relative;
}

.eyebrow {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  color: var(--accent);
  margin-bottom: var(--space-5);
}

.section-head {
  max-width: 760px;
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
  line-height: var(--leading-relaxed);
}

/* ---- Statement ---- */
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
  opacity: 0.16;
  /* Gap is a margin, not a text space: Vue collapses whitespace between
     interpolations, which would run every word together into one string. */
  display: inline-block;
  margin-inline-end: 0.26em;
}

.statement__word[data-accent='true'] {
  color: var(--accent);
}

/* ---- Mission ---- */
.mission {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-10) var(--gutter);
}

.mission__title {
  max-width: 18ch;
  font-size: clamp(1.9rem, 4.6vw, 3.4rem);
  font-weight: var(--weight-bold);
  letter-spacing: -0.025em;
  line-height: 1.08;
}

.mission__body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-6) var(--space-8);
  margin-top: var(--space-8);
  max-width: 1100px;
}

.mission__para {
  font-size: var(--text-lg);
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
}

.mission__para:last-child {
  color: var(--text);
}

/* ---- Long read ---- */
.essay {
  max-width: 1100px;
  margin: 0 auto;
  padding: var(--space-9) var(--gutter);
  display: flex;
  flex-direction: column;
  gap: var(--space-9);
}

.chapter {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.4fr);
  gap: clamp(20px, 4vw, 64px);
  padding-top: var(--space-7);
  border-top: 1px solid var(--border-subtle);
}

.chapter__heading {
  font-size: var(--text-xl);
  font-weight: var(--weight-medium);
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.chapter__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  color: var(--text-secondary);
  font-size: var(--text-md);
  line-height: var(--leading-relaxed);
}

/* ---- Showcase ---- */
.showcase {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-10) var(--gutter);
  perspective: 1200px;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-5);
  transform-style: preserve-3d;
}

.tile {
  display: flex;
  flex-direction: column;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-surface);
  overflow: hidden;
  transform-style: preserve-3d;
  will-change: transform;
}

.tile__art {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
}

.art {
  position: absolute;
  display: block;
}

.tile__caption {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-5);
  border-top: 1px solid var(--border-subtle);
}

.tile__title {
  font-size: var(--text-lg);
  font-weight: var(--weight-medium);
  color: var(--text);
}

.tile__copy {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  line-height: var(--leading-normal);
}

.tile--mask .tile__art { background: linear-gradient(150deg, #155e75, #0f766e); }
.tile--mask .art--a { inset: 16% 24%; border: 2px dashed rgb(255 255 255 / 0.9); border-radius: 46% 54% 50% 50%; }
.tile--mask .art--b { inset: 16% 24%; background: var(--accent); opacity: 0.22; border-radius: 46% 54% 50% 50%; }

.tile--grade .tile__art { background: linear-gradient(150deg, #3f3f46, #27272a); }
.tile--grade .art--a { inset: 16% 24%; border-radius: 46% 54% 50% 50%; background: linear-gradient(140deg, #f59e0b, #db2777); }
.tile--grade .art--b { inset: 16% 24%; border: 2px dashed rgb(255 255 255 / 0.55); border-radius: 46% 54% 50% 50%; }

.tile--text .tile__art { background: linear-gradient(150deg, #1e3a8a, #172554); }
.tile--text .art--a { left: 14%; right: 14%; top: 38%; height: 13px; border-radius: 3px; background: #fff; }
.tile--text .art--b { left: 26%; right: 26%; top: 58%; height: 8px; border-radius: 3px; background: rgb(255 255 255 / 0.55); }
.tile--text .art--c { left: 50%; top: 12%; bottom: 12%; width: 1px; background: var(--accent); }

.tile--collage .tile__art { background: var(--bg-sunken); }
.tile--collage .art--a { inset: 10% 52% 52% 10%; background: #0ea5e9; border-radius: 4px; }
.tile--collage .art--b { inset: 10% 10% 52% 52%; background: #f59e0b; border-radius: 4px; }
.tile--collage .art--c { inset: 52% 10% 10% 10%; background: #4d7c0f; border-radius: 4px; }

.tile--video .tile__art { background: linear-gradient(150deg, #4c0519, #831843); }
.tile--video .art--a {
  left: 50%; top: 40%; width: 0; height: 0;
  transform: translate(-40%, -50%);
  border-left: 24px solid #fff;
  border-top: 15px solid transparent;
  border-bottom: 15px solid transparent;
}
.tile--video .art--b {
  left: 16%; right: 16%; bottom: 18%; height: 24px;
  background: repeating-linear-gradient(to right, var(--accent) 0 3px, transparent 3px 8px);
  opacity: 0.75;
  mask-image: linear-gradient(to right, transparent, #000 15%, #000 85%, transparent);
}

.tile--export .tile__art { background: linear-gradient(150deg, #14532d, #052e16); }
.tile--export .art--a { inset: 32% 38%; border: 2px solid rgb(255 255 255 / 0.35); border-radius: 4px; }
.tile--export .art--b { inset: 22% 28%; border: 2px solid rgb(255 255 255 / 0.55); border-radius: 5px; }
.tile--export .art--c { inset: 12% 18%; border: 2px solid var(--accent); border-radius: 6px; }

/* ---- Steps ---- */
.steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--space-8);
  padding: var(--space-9) var(--gutter);
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

/* ---- FAQ ---- */
.faq {
  max-width: 1000px;
  margin: 0 auto;
  padding: var(--space-9) var(--gutter);
}

.faq__list {
  display: flex;
  flex-direction: column;
}

.faq__item {
  padding: var(--space-6) 0;
  border-top: 1px solid var(--border-subtle);
}

.faq__q {
  font-size: var(--text-lg);
  font-weight: var(--weight-medium);
  color: var(--text);
  margin-bottom: var(--space-3);
}

.faq__a {
  color: var(--text-secondary);
  line-height: var(--leading-relaxed);
  max-width: 70ch;
}

/* ---- Close ---- */
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
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-5);
  margin-top: var(--space-10);
  padding-top: var(--space-6);
  border-top: 1px solid var(--border-subtle);
  color: var(--text-muted);
  font-size: var(--text-sm);
  text-align: left;
}

.foot__brand {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.foot__links {
  display: flex;
  gap: var(--space-6);
}

.foot__link {
  color: var(--text-secondary);
  transition: color var(--dur-fast) var(--ease);
}

.foot__link:hover {
  color: var(--accent);
}

@media (max-width: 760px) {
  .chapter {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
}
</style>
