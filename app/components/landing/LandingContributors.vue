<script setup lang="ts">
/**
 * Contributors, pulled live from the real GitHub API.
 *
 * Nothing here is hardcoded, mocked or seeded with placeholder people. This is
 * a solo project; the honest states are "the founder, plus whoever has actually
 * contributed" and "nobody yet — be the first". Inventing teammates or using
 * stock headshots would misrepresent the project to visitors.
 */

const GITHUB_OWNER = 'itsmangooo'
const GITHUB_REPO = 'imagine'
const REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`

interface Contributor {
  id: number
  login: string
  avatar_url: string
  html_url: string
  contributions: number
  type: string
}

const contributors = ref<Contributor[]>([])
const state = ref<'loading' | 'ready' | 'empty' | 'error'>('loading')

onMounted(async () => {
  try {
    const data = await $fetch<Contributor[]>(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contributors`,
      { query: { per_page: 40 }, headers: { Accept: 'application/vnd.github+json' } },
    )
    // Bots commit too, and listing them as contributors is misleading.
    const people = (data ?? []).filter(c => c.type !== 'Bot')
    contributors.value = people
    state.value = people.length ? 'ready' : 'empty'
  } catch {
    // A private repo, a rate limit, or no network. All of them mean "we cannot
    // show a real list", which is the empty state — never a fabricated one.
    state.value = 'error'
  } finally {
    // This section grows the page once the fetch lands, which invalidates every
    // ScrollTrigger position measured at mount — sections below it silently stop
    // firing. Re-measure once the new layout has settled.
    await nextTick()
    const { ScrollTrigger } = await import('gsap/ScrollTrigger')
    ScrollTrigger.refresh()
  }
})
</script>

<template>
  <section class="contributors">
    <header class="section-head">
      <h2 class="section-title">Built in the open.</h2>
      <p class="section-lede">
        Built and maintained by
        <a class="link" :href="`https://github.com/${GITHUB_OWNER}`" target="_blank" rel="noopener noreferrer">
          {{ GITHUB_OWNER }}
        </a>
        — a solo developer project, open to contributions.
      </p>
    </header>

    <div v-if="state === 'loading'" class="note">Loading contributors…</div>

    <ul v-else-if="state === 'ready'" class="grid">
      <li v-for="person in contributors" :key="person.id">
        <a class="person" :href="person.html_url" target="_blank" rel="noopener noreferrer">
          <img
            class="person__avatar"
            :src="`${person.avatar_url}&s=120`"
            :alt="`${person.login} on GitHub`"
            loading="lazy"
            width="48"
            height="48"
          >
          <span class="person__name">{{ person.login }}</span>
          <span class="person__count tabular">
            {{ person.contributions }} commit{{ person.contributions === 1 ? '' : 's' }}
          </span>
        </a>
      </li>
    </ul>

    <div v-else class="empty">
      <p class="empty__title">
        {{ state === 'error' ? 'Contributor list unavailable right now.' : 'No outside contributors yet.' }}
      </p>
      <p class="empty__copy">
        The code is public and the issues are open — be the first name on this list.
      </p>
      <a class="cta cta--ghost" :href="REPO_URL" target="_blank" rel="noopener noreferrer">
        View the repository
      </a>
    </div>
  </section>
</template>

<style scoped>
.contributors {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-10) clamp(20px, 6vw, 96px);
}

.section-head {
  max-width: 720px;
  margin-bottom: var(--space-8);
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

.link {
  color: var(--accent);
}

.link:hover {
  color: var(--accent-hover);
}

.grid {
  /* Wide enough that a normal GitHub handle is not truncated to "itsm…". */
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-4);
  list-style: none;
}

.person {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-surface);
  transition:
    border-color var(--dur-fast) var(--ease),
    background var(--dur-fast) var(--ease);
}

.person:hover {
  border-color: var(--accent-line);
  background: var(--bg-raised);
}

.person__avatar {
  width: 48px;
  height: 48px;
  flex: none;
  border-radius: 50%;
  background: var(--bg-raised);
}

.person__name {
  flex: 1;
  min-width: 0;
  font-size: var(--text-md);
  font-weight: var(--weight-medium);
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.person__count {
  font-size: var(--text-xs);
  color: var(--text-muted);
  white-space: nowrap;
}

.note {
  color: var(--text-muted);
  font-size: var(--text-md);
}

.empty {
  padding: var(--space-8);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  text-align: center;
}

.empty__title {
  font-size: var(--text-lg);
  font-weight: var(--weight-medium);
  color: var(--text);
}

.empty__copy {
  margin: var(--space-3) 0 var(--space-6);
  color: var(--text-secondary);
}

.cta--ghost {
  display: inline-flex;
  align-items: center;
  height: 42px;
  padding: 0 var(--space-7);
  border-radius: var(--radius);
  border: 1px solid var(--accent-line);
  color: var(--accent);
  font-weight: var(--weight-medium);
  transition: background var(--dur-fast) var(--ease);
}

.cta--ghost:hover {
  background: var(--accent-soft);
}
</style>
