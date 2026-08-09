/**
 * Validate a user-supplied Replicate key.
 *
 * The key is read from the request, used for one free account lookup, and
 * discarded. Nothing is persisted here — persistence (encrypted at rest) lands
 * with the Postgres layer, which this rebuild does not have yet.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ key?: string }>(event)
  const key = body?.key?.trim()

  if (!key) {
    setResponseStatus(event, 400)
    return { ok: false, reason: 'No key supplied.' }
  }

  if (!looksLikeKey(key)) {
    return { ok: false, reason: 'That does not look like a Replicate key — they start with "r8_".' }
  }

  const result = await validateKey(key)
  // Only ever hand back a masked form.
  return result.ok
    ? { ok: true, account: result.account, masked: maskKey(key) }
    : { ok: false, reason: result.reason }
})
