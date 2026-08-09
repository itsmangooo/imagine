/**
 * Load an image element and resolve once its pixels are available.
 *
 * Deliberately built on `onload`/`onerror` rather than `HTMLImageElement.decode()`.
 * `decode()` reads better, but Chrome can defer it indefinitely while the
 * document is hidden — the promise simply never settles, so `await img.decode()`
 * hangs with no error and whatever follows it never runs. That was observed
 * here: a blob-URL image reported the correct naturalWidth/naturalHeight while
 * its decode() promise was still pending after seconds. `onload` has no such
 * caveat, and a background tab is an entirely ordinary thing for a user to do
 * mid-edit.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Required for an exportable canvas: a remote image without this taints the
    // canvas and every toBlob()/toDataURL() call throws.
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Could not load image: ${src.slice(0, 64)}`))
    img.src = src
  })
}
