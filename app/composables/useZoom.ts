/**
 * Canvas zoom and pan.
 *
 * Zoom is expressed as **displayed pixels per SOURCE pixel**, so 1 really is
 * 1:1 with the original file — not with the preview composite, which is capped
 * at 2400px and would otherwise make "100%" a lie on large images.
 *
 * This is deliberately canvas-level rather than per-tool. Every overlay in the
 * editor already positions itself from `imageRect`, so driving that one rect
 * from zoom/pan makes crop handles, the mask lasso, text and doodle all follow
 * the viewport without any of them knowing zoom exists.
 */

export const ZOOM_MIN = 0.02
export const ZOOM_MAX = 32

/** Multiplier per button press / keyboard step. */
const STEP = 1.25

/** Discrete jumps animate; continuous gestures do not. Matches --dur-fast. */
const TWEEN_MS = 130

/** Breathing room between image and frame edge at fit, in canvas px. */
export const FIT_PADDING = 32

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

/** easeOutCubic — same shape as the app's --ease, close enough to feel native. */
function ease(t: number) {
  return 1 - (1 - t) ** 3
}

let tweenFrame = 0

export function useZoom() {
  const { canvas, imageRect } = useEditor()
  const { activeDocument } = useDocuments()

  /** null = follow fit automatically (the default until the user intervenes). */
  const zoomOverride = useState<number | null>('zoom:value', () => null)
  const pan = useState<{ x: number; y: number }>('zoom:pan', () => ({ x: 0, y: 0 }))
  /** True while space is held or a middle-drag is active. */
  const panning = useState<boolean>('zoom:panning', () => false)
  const spaceHeld = useState<boolean>('zoom:space', () => false)

  const canvasSize = useState<{ width: number; height: number }>('zoom:canvas', () => ({
    width: 0,
    height: 0,
  }))

  const source = computed(() => {
    const doc = activeDocument.value
    return doc ? { width: doc.working.width, height: doc.working.height } : null
  })

  /** The zoom at which the whole image fits inside the frame. */
  const fitZoom = computed(() => {
    const s = source.value
    const { width: cw, height: ch } = canvasSize.value
    if (!s || cw === 0 || ch === 0) return 1
    return Math.min((cw - FIT_PADDING * 2) / s.width, (ch - FIT_PADDING * 2) / s.height)
  })

  const zoom = computed(() => clamp(zoomOverride.value ?? fitZoom.value, ZOOM_MIN, ZOOM_MAX))
  const isFit = computed(() => zoomOverride.value === null || Math.abs(zoom.value - fitZoom.value) < 1e-4)
  const percent = computed(() => Math.round(zoom.value * 100))
  /** Panning only makes sense once the image is larger than its frame. */
  const canPan = computed(() => {
    const s = source.value
    if (!s) return false
    return s.width * zoom.value > canvasSize.value.width || s.height * zoom.value > canvasSize.value.height
  })

  /**
   * Keep the image from being dragged completely out of view. A generous
   * allowance rather than a hard edge-lock — clamping tightly makes panning
   * feel like it is fighting you near the boundary.
   */
  function clampPan(next: { x: number; y: number }, atZoom = zoom.value) {
    const s = source.value
    const { width: cw, height: ch } = canvasSize.value
    if (!s) return { x: 0, y: 0 }

    const drawnW = s.width * atZoom
    const drawnH = s.height * atZoom
    const slackX = Math.max(0, (drawnW - cw) / 2) + FIT_PADDING
    const slackY = Math.max(0, (drawnH - ch) / 2) + FIT_PADDING
    return { x: clamp(next.x, -slackX, slackX), y: clamp(next.y, -slackY, slackY) }
  }

  function cancelTween() {
    if (tweenFrame) {
      cancelAnimationFrame(tweenFrame)
      tweenFrame = 0
    }
  }

  /** Set zoom + pan instantly. Used by continuous gestures. */
  function setView(nextZoom: number, nextPan: { x: number; y: number }) {
    cancelTween()
    const z = clamp(nextZoom, ZOOM_MIN, ZOOM_MAX)
    zoomOverride.value = z
    pan.value = clampPan(nextPan, z)
  }

  /**
   * Animate to a zoom/pan. Only for DISCRETE jumps — buttons, fit, 100%, typed
   * values. Wheel and pinch stay instant because they are already continuous
   * gestures and adding easing to them just feels laggy.
   */
  function animateView(nextZoom: number, nextPan: { x: number; y: number }) {
    cancelTween()
    const fromZoom = zoom.value
    const fromPan = { ...pan.value }
    const toZoom = clamp(nextZoom, ZOOM_MIN, ZOOM_MAX)
    const toPan = clampPan(nextPan, toZoom)

    // requestAnimationFrame does not fire while the document is hidden, so a
    // tween started in a background tab would never land and the view would be
    // silently stuck at its old zoom on return. Nothing to animate for anyway.
    if (document.hidden) {
      zoomOverride.value = toZoom
      pan.value = toPan
      return
    }

    const start = performance.now()

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / TWEEN_MS)
      const k = ease(t)
      zoomOverride.value = fromZoom + (toZoom - fromZoom) * k
      pan.value = {
        x: fromPan.x + (toPan.x - fromPan.x) * k,
        y: fromPan.y + (toPan.y - fromPan.y) * k,
      }
      if (t < 1) tweenFrame = requestAnimationFrame(tick)
      else tweenFrame = 0
    }
    tweenFrame = requestAnimationFrame(tick)
  }

  /**
   * Zoom around a fixed point in canvas coordinates, so whatever is under the
   * cursor stays under the cursor. Without this, zooming re-centres on the
   * canvas origin and the thing you were aiming at slides away.
   */
  function zoomAtPoint(nextZoom: number, point: { x: number; y: number }, animate = false) {
    const s = source.value
    const rect = imageRect.value
    if (!s || rect.width === 0) return

    // Where the cursor is over the image, 0–1.
    const u = (point.x - rect.left) / rect.width
    const v = (point.y - rect.top) / rect.height

    const z = clamp(nextZoom, ZOOM_MIN, ZOOM_MAX)
    const drawnW = s.width * z
    const drawnH = s.height * z
    const { width: cw, height: ch } = canvasSize.value

    // Solve for the pan that puts that same image point back under the cursor.
    const nextPan = {
      x: point.x - u * drawnW + drawnW / 2 - cw / 2,
      y: point.y - v * drawnH + drawnH / 2 - ch / 2,
    }

    if (animate) animateView(z, nextPan)
    else setView(z, nextPan)
  }

  function zoomBy(factor: number, point?: { x: number; y: number }, animate = true) {
    const target = zoom.value * factor
    if (point) zoomAtPoint(target, point, animate)
    else if (animate) animateView(target, pan.value)
    else setView(target, pan.value)
  }

  function zoomIn() {
    zoomBy(STEP)
  }

  function zoomOut() {
    zoomBy(1 / STEP)
  }

  function fitToScreen() {
    animateView(fitZoom.value, { x: 0, y: 0 })
    // Returning to "follow the frame" only after the tween lands, so a resize
    // mid-animation does not yank it.
    setTimeout(() => {
      zoomOverride.value = null
      pan.value = { x: 0, y: 0 }
    }, TWEEN_MS)
  }

  function actualSize() {
    animateView(1, pan.value)
  }

  function setPercent(value: number) {
    const z = clamp(value / 100, ZOOM_MIN, ZOOM_MAX)
    animateView(z, pan.value)
  }

  /**
   * Frame a normalised region (0–1 against the image) — used to jump straight
   * to a mask so its vertices can be edited without hunting for it.
   */
  function zoomToRegion(region: { x: number; y: number; w: number; h: number }, margin = 1.25) {
    const s = source.value
    const { width: cw, height: ch } = canvasSize.value
    if (!s || region.w <= 0 || region.h <= 0) return

    const targetW = region.w * s.width * margin
    const targetH = region.h * s.height * margin
    const z = clamp(Math.min(cw / targetW, ch / targetH), ZOOM_MIN, ZOOM_MAX)

    // Centre of the region, in source pixels, offset from the image centre.
    const cxSource = (region.x + region.w / 2 - 0.5) * s.width
    const cySource = (region.y + region.h / 2 - 0.5) * s.height
    animateView(z, { x: -cxSource * z, y: -cySource * z })
  }

  function panBy(dx: number, dy: number) {
    cancelTween()
    // Any manual pan means the view is no longer "following fit".
    if (zoomOverride.value === null) zoomOverride.value = fitZoom.value
    pan.value = clampPan({ x: pan.value.x + dx, y: pan.value.y + dy })
  }

  function resetForDocument() {
    cancelTween()
    zoomOverride.value = null
    pan.value = { x: 0, y: 0 }
  }

  /** Called by the canvas whenever its pixel size changes. */
  function reportCanvasSize(width: number, height: number) {
    canvasSize.value = { width, height }
  }

  /** Canvas-space coordinates for a pointer/wheel event over the frame. */
  function toCanvasPoint(event: { clientX: number; clientY: number }, frame: HTMLElement) {
    const box = frame.getBoundingClientRect()
    return { x: event.clientX - box.left, y: event.clientY - box.top }
  }

  return {
    zoom,
    zoomOverride,
    pan,
    panning,
    spaceHeld,
    fitZoom,
    isFit,
    percent,
    canPan,
    canvasSize,
    zoomIn,
    zoomOut,
    zoomBy,
    zoomAtPoint,
    fitToScreen,
    actualSize,
    setPercent,
    zoomToRegion,
    panBy,
    resetForDocument,
    reportCanvasSize,
    toCanvasPoint,
    cancelTween,
  }
}
