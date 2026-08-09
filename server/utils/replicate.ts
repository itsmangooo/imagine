import Replicate from 'replicate'

/**
 * Replicate access, using the REQUESTING USER'S OWN API KEY.
 *
 * There is no app-wide token: every AI call is billed to the user's own
 * Replicate account. The key arrives per-request, is used immediately, and is
 * never written to disk, never logged, and never echoed back to the client.
 */

export const IDENTITY_MODEL = 'bytedance/flux-pulid'

/** Replicate keys look like `r8_…`. Cheap shape check before spending a call. */
export function looksLikeKey(value: string) {
  return /^r8_[A-Za-z0-9]{20,}$/.test(value.trim())
}

/** Mask for display. Never return the full key to the client once stored. */
export function maskKey(value: string) {
  const clean = value.trim()
  if (clean.length < 12) return 'r8_****'
  return `${clean.slice(0, 5)}${'*'.repeat(8)}${clean.slice(-4)}`
}

export function readKey(event: { node: { req: { headers: Record<string, unknown> } } }): string | null {
  const header = event.node.req.headers['x-replicate-key']
  const value = Array.isArray(header) ? header[0] : header
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function client(token: string) {
  return new Replicate({ auth: token })
}

/**
 * Cheap validation: read the account the key belongs to. Costs nothing and
 * fails fast, so an invalid key is reported when it is saved rather than on the
 * user's first real generation.
 */
export async function validateKey(token: string): Promise<{ ok: boolean; account?: string; reason?: string }> {
  try {
    const response = await fetch('https://api.replicate.com/v1/account', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (response.status === 401) return { ok: false, reason: 'Replicate rejected that key.' }
    if (!response.ok) return { ok: false, reason: `Replicate returned ${response.status}.` }
    const body = (await response.json()) as { username?: string; name?: string }
    return { ok: true, account: body.username ?? body.name ?? 'your account' }
  } catch {
    return { ok: false, reason: 'Could not reach Replicate.' }
  }
}
