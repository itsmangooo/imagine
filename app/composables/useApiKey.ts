/**
 * The user's own Replicate API key (BYOK).
 *
 * Imagine handles no payments. AI features call Replicate with the user's own
 * key and are billed directly to their Replicate account; everything else in
 * the editor is entirely client-side and free with no key at all.
 *
 * STORAGE, HONESTLY: the key lives in `sessionStorage` for now — it survives
 * reloads but is cleared when the tab closes. The brief asks for encryption at
 * rest in Postgres, which cannot be built yet because this rebuild has no
 * database or auth layer. `sessionStorage` was chosen over `localStorage`
 * deliberately: an indefinitely-persisted plaintext credential is worse than
 * one the browser drops on close. Swap this for the encrypted server-side store
 * the moment the DB lands — the rest of the app only ever asks for `key.value`.
 */

const STORAGE_KEY = 'imagine:replicate-key'

export function useApiKey() {
  const key = useState<string>('apikey:value', () => '')
  const masked = useState<string>('apikey:masked', () => '')
  const account = useState<string>('apikey:account', () => '')
  const checking = useState<boolean>('apikey:checking', () => false)
  const error = useState<string | null>('apikey:error', () => null)

  const hasKey = computed(() => key.value.length > 0)

  /** Restore on the client only — sessionStorage does not exist during SSR. */
  function restore() {
    if (!import.meta.client || key.value) return
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      key.value = saved
      masked.value = maskLocally(saved)
    }
  }

  function maskLocally(value: string) {
    if (value.length < 12) return 'r8_****'
    return `${value.slice(0, 5)}${'*'.repeat(8)}${value.slice(-4)}`
  }

  /**
   * Verify against Replicate before accepting, so an invalid key is reported
   * now rather than on the user's first real generation.
   */
  async function save(candidate: string): Promise<boolean> {
    const trimmed = candidate.trim()
    if (!trimmed) return false

    checking.value = true
    error.value = null
    try {
      const result = await $fetch<{ ok: boolean; account?: string; masked?: string; reason?: string }>(
        '/api/ai/validate',
        { method: 'POST', body: { key: trimmed } },
      )
      if (!result.ok) {
        error.value = result.reason ?? 'That key was rejected.'
        return false
      }
      key.value = trimmed
      masked.value = result.masked ?? maskLocally(trimmed)
      account.value = result.account ?? ''
      sessionStorage.setItem(STORAGE_KEY, trimmed)
      return true
    } catch {
      error.value = 'Could not reach the server to check that key.'
      return false
    } finally {
      checking.value = false
    }
  }

  function clear() {
    key.value = ''
    masked.value = ''
    account.value = ''
    error.value = null
    if (import.meta.client) sessionStorage.removeItem(STORAGE_KEY)
  }

  /** Header for AI requests. The key never appears in a URL or a log line. */
  function authHeaders(): Record<string, string> {
    return key.value ? { 'x-replicate-key': key.value } : {}
  }

  return { key, masked, account, checking, error, hasKey, restore, save, clear, authHeaders }
}
