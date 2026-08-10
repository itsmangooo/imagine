/**
 * Edge map for the magnetic lasso.
 *
 * A Sobel gradient magnitude field, computed ONCE per working image and cached
 * — not per frame. Classic edge detection is enough to remove most of the
 * manual precision from tracing an object, and it runs in tens of milliseconds
 * client-side, which an ML segmentation model would not.
 */

export interface EdgeMap {
  width: number
  height: number
  /** Gradient magnitude per pixel, normalised 0–1. */
  data: Float32Array
}

/**
 * Resolution the edge field is computed at. Deliberately below the preview
 * composite: Sobel cost is linear in pixels, and snapping does not benefit from
 * more precision than the eye can place a cursor at.
 */
const EDGE_MAX_EDGE = 1024

const cache = new Map<string, EdgeMap>()

export function forgetEdgeMap(src: string) {
  cache.delete(src)
}

export async function computeEdgeMap(src: string): Promise<EdgeMap | null> {
  const cached = cache.get(src)
  if (cached) return cached

  const img = await loadImage(src)
  const scale = Math.min(1, EDGE_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, width, height)

  const { data: rgba } = ctx.getImageData(0, 0, width, height)

  // Rec. 709 luma, matching how the rest of the pipeline weights brightness.
  const luma = new Float32Array(width * height)
  for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
    luma[p] = (0.2126 * rgba[i]! + 0.7152 * rgba[i + 1]! + 0.0722 * rgba[i + 2]!) / 255
  }

  const magnitude = new Float32Array(width * height)
  let peak = 0

  // Sobel. Borders stay zero — an edge on the frame boundary is not something
  // the user is ever tracing toward.
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x
      const tl = luma[i - width - 1]!
      const t = luma[i - width]!
      const tr = luma[i - width + 1]!
      const l = luma[i - 1]!
      const r = luma[i + 1]!
      const bl = luma[i + width - 1]!
      const b = luma[i + width]!
      const br = luma[i + width + 1]!

      const gx = tl + 2 * l + bl - (tr + 2 * r + br)
      const gy = tl + 2 * t + tr - (bl + 2 * b + br)
      const m = Math.hypot(gx, gy)
      magnitude[i] = m
      if (m > peak) peak = m
    }
  }

  // Normalise against the actual peak rather than a theoretical maximum, so a
  // low-contrast photo still produces a usable field.
  if (peak > 0) {
    for (let i = 0; i < magnitude.length; i++) magnitude[i] = magnitude[i]! / peak
  }

  const map: EdgeMap = { width, height, data: magnitude }
  cache.set(src, map)
  return map
}

/**
 * Pull a point toward the strongest nearby edge.
 *
 * Input and output are NORMALISED (0–1) image coordinates, matching how mask
 * polygons are stored, so this is independent of zoom and preview resolution.
 *
 * Candidates are scored by edge strength minus a distance penalty, so a strong
 * edge far away never beats a decent edge under the cursor — without that, the
 * path snaps across the image and fights the user.
 */
export function snapToEdge(
  map: EdgeMap,
  point: { x: number; y: number },
  /** Search radius as a fraction of the image's smaller edge. */
  radiusFraction = 0.02,
): { x: number; y: number } {
  const cx = point.x * map.width
  const cy = point.y * map.height
  const radius = Math.max(2, Math.round(radiusFraction * Math.min(map.width, map.height)))

  let bestScore = -Infinity
  let bestX = cx
  let bestY = cy

  const minX = Math.max(1, Math.floor(cx - radius))
  const maxX = Math.min(map.width - 2, Math.ceil(cx + radius))
  const minY = Math.max(1, Math.floor(cy - radius))
  const maxY = Math.min(map.height - 2, Math.ceil(cy + radius))

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const distance = Math.hypot(x - cx, y - cy)
      if (distance > radius) continue
      const strength = map.data[y * map.width + x]!
      const score = strength - (distance / radius) * 0.35
      if (score > bestScore) {
        bestScore = score
        bestX = x
        bestY = y
      }
    }
  }

  // Nothing meaningful nearby — leave the cursor position alone rather than
  // snapping to noise.
  if (bestScore < 0.08) return point

  return { x: bestX / map.width, y: bestY / map.height }
}
