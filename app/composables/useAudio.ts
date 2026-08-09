/**
 * Music → MP4.
 *
 * Combines the edited still with an uploaded audio track into an MP4, encoded
 * client-side with ffmpeg.wasm. Optional Ken Burns adds a slow zoom so the
 * result does not look like a frozen frame.
 *
 * TWO DELIBERATE DEVIATIONS FROM THE SPEC, both flagged to the user:
 *
 * 1. NO COOP/COEP HEADERS. Those are only needed by ffmpeg's multi-threaded
 *    core, which wants SharedArrayBuffer. Cross-origin isolation is an
 *    application-wide switch: it would require every image the editor ever
 *    loads — including everything served from R2 later — to carry CORP/CORS
 *    headers, or it simply fails to load. Paying that cost across the whole
 *    product to speed up one optional export is a bad trade, so this uses the
 *    single-threaded core. Encoding is slower; nothing else is constrained.
 *
 * 2. UPLOAD ONLY, no bundled track library. The spec calls the upload path
 *    "zero licensing risk" and says to build it first. Shipping a library means
 *    verifying and carrying licences for every track, which is a legal question
 *    rather than a technical one — that is the user's call to make, not a
 *    default to assume.
 *
 * The core is served from /ffmpeg (same-origin) rather than a CDN, so there is
 * no third-party fetch and no CORP dependency.
 */

export interface AudioTrack {
  name: string
  /** Object URL for playback and for handing to ffmpeg. */
  src: string
  /** Seconds. */
  duration: number
  size: number
}

export type VideoMotion = 'none' | 'zoom-in' | 'zoom-out'

export const VIDEO_MOTIONS: { id: VideoMotion; label: string }[] = [
  { id: 'none', label: 'Still' },
  { id: 'zoom-in', label: 'Slow zoom in' },
  { id: 'zoom-out', label: 'Slow zoom out' },
]

/** Output frame rate. Low on purpose — it is a still image. */
const FPS = 24

/** Cap the encode so a long track cannot lock the tab up for minutes. */
export const MAX_CLIP_SECONDS = 60

let ffmpegInstance: unknown = null
let loadingPromise: Promise<unknown> | null = null

async function getFFmpeg(onProgress?: (ratio: number) => void) {
  if (ffmpegInstance) return ffmpegInstance
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg')
    const instance = new FFmpeg()
    instance.on('progress', ({ progress }: { progress: number }) => {
      onProgress?.(Math.min(1, Math.max(0, progress)))
    })
    // Surface the encoder's own diagnostics; without this a failure inside the
    // worker is invisible and every error looks identical from the outside.
    instance.on('log', ({ message }: { message: string }) => {
      lastLog = message
    })
    await instance.load({
      coreURL: new URL('/ffmpeg/ffmpeg-core.js', window.location.origin).href,
      wasmURL: new URL('/ffmpeg/ffmpeg-core.wasm', window.location.origin).href,
    })
    ffmpegInstance = instance
    return instance
  })()

  try {
    return await loadingPromise
  } catch (cause) {
    // A rejected promise left in place would poison every later attempt with
    // the same stale failure, making the tool permanently broken after one
    // transient error.
    loadingPromise = null
    ffmpegInstance = null
    throw cause
  }
}

/** Most recent line from the encoder, used to explain failures. */
let lastLog = ''

/**
 * Track duration in seconds.
 *
 * Tries the cheap route first — an <audio> element's metadata — but ALWAYS
 * against a timeout. A media element's `loadedmetadata` can simply never fire
 * while the document is hidden, and an un-raced await on it hangs the whole
 * import with no error and no feedback (the exact failure mode that made
 * `img.decode()` unusable elsewhere in this app). `decodeAudioData` is the
 * fallback: heavier, since it decodes the file, but it does not depend on the
 * element pipeline.
 */
async function readDuration(file: File, src: string): Promise<number> {
  const viaElement = await new Promise<number | null>((resolve) => {
    const el = new Audio()
    const timer = setTimeout(() => resolve(null), 4000)
    const done = (value: number | null) => {
      clearTimeout(timer)
      resolve(value)
    }
    el.preload = 'metadata'
    el.onloadedmetadata = () => done(Number.isFinite(el.duration) ? el.duration : null)
    el.onerror = () => done(null)
    el.src = src
  })
  if (viaElement !== null) return viaElement

  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctor()
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer())
    void ctx.close()
    return decoded.duration
  } catch {
    return 0
  }
}

export function useAudio() {
  const { activeDocument } = useDocuments()
  const { renderFull } = useExport()

  const track = useState<AudioTrack | null>('audio:track', () => null)
  const trimStart = useState<number>('audio:start', () => 0)
  const trimEnd = useState<number>('audio:end', () => 0)
  const motion = useState<VideoMotion>('audio:motion', () => 'zoom-in')
  const busy = useState<boolean>('audio:busy', () => false)
  const stage = useState<string>('audio:stage', () => '')
  const progress = useState<number>('audio:progress', () => 0)
  const error = useState<string | null>('audio:error', () => null)

  const hasTrack = computed(() => track.value !== null)
  const clipLength = computed(() => Math.max(0, trimEnd.value - trimStart.value))
  const clipTooLong = computed(() => clipLength.value > MAX_CLIP_SECONDS)
  const canRender = computed(
    () => hasTrack.value && clipLength.value >= 0.5 && !clipTooLong.value && activeDocument.value !== null,
  )

  async function setTrack(file: File | null | undefined) {
    if (!file) return
    if (!file.type.startsWith('audio/')) {
      error.value = 'That file is not audio.'
      return
    }
    error.value = null

    const previous = track.value?.src
    const src = URL.createObjectURL(file)

    const duration = await readDuration(file, src)

    if (previous) URL.revokeObjectURL(previous)
    track.value = { name: file.name, src, duration, size: file.size }
    trimStart.value = 0
    trimEnd.value = Math.min(duration, MAX_CLIP_SECONDS)
  }

  function clearTrack() {
    if (track.value?.src) URL.revokeObjectURL(track.value.src)
    track.value = null
    trimStart.value = 0
    trimEnd.value = 0
  }

  function setTrim(start: number, end: number) {
    const max = track.value?.duration ?? 0
    const s = Math.max(0, Math.min(start, max))
    const e = Math.max(s + 0.5, Math.min(end, max))
    trimStart.value = s
    trimEnd.value = e
  }

  /**
   * Even dimensions are mandatory: libx264 with yuv420p rejects odd width or
   * height, and the failure message is deeply unhelpful.
   */
  function evenSize(width: number, height: number) {
    // Also cap the long edge — encoding a 6000px still is needlessly slow.
    const maxEdge = 1920
    const scale = Math.min(1, maxEdge / Math.max(width, height))
    return {
      width: Math.max(2, Math.round((width * scale) / 2) * 2),
      height: Math.max(2, Math.round((height * scale) / 2) * 2),
    }
  }

  async function renderVideo(): Promise<{ blob: Blob; name: string } | null> {
    const doc = activeDocument.value
    if (!doc || !track.value || !canRender.value || busy.value) return null

    busy.value = true
    error.value = null
    progress.value = 0

    try {
      stage.value = 'Loading encoder…'
      const ffmpeg = (await getFFmpeg(r => (progress.value = r))) as {
        writeFile: (path: string, data: Uint8Array) => Promise<void>
        readFile: (path: string) => Promise<Uint8Array>
        deleteFile: (path: string) => Promise<void>
        exec: (args: string[]) => Promise<number>
      }

      stage.value = 'Rendering frame…'
      // The exported still, with every edit already composited.
      const canvas = await renderFull()
      if (!canvas) throw new Error('Nothing to render.')

      const { width, height } = evenSize(canvas.width, canvas.height)
      const sized = document.createElement('canvas')
      sized.width = width
      sized.height = height
      sized.getContext('2d')?.drawImage(canvas, 0, 0, width, height)

      const stillBlob = await new Promise<Blob | null>(resolve => sized.toBlob(resolve, 'image/png'))
      if (!stillBlob) throw new Error('Could not prepare the frame.')

      const { fetchFile } = await import('@ffmpeg/util')
      await ffmpeg.writeFile('still.png', await fetchFile(stillBlob))
      await ffmpeg.writeFile('audio.bin', await fetchFile(track.value.src))

      stage.value = 'Encoding…'
      progress.value = 0

      const duration = clipLength.value
      const frames = Math.max(1, Math.round(duration * FPS))

      // zoompan works per-frame; d is the frame count for the single input image.
      const filters: string[] = []
      if (motion.value !== 'none') {
        const zoom
          = motion.value === 'zoom-in'
            ? `min(1+0.0009*on,1.12)`
            : `max(1.12-0.0009*on,1)`
        filters.push(
          `zoompan=z='${zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${FPS}`,
        )
      }
      filters.push('format=yuv420p')

      const args = [
        '-loop', '1',
        '-i', 'still.png',
        '-ss', trimStart.value.toFixed(3),
        '-t', duration.toFixed(3),
        '-i', 'audio.bin',
        '-vf', filters.join(','),
        '-r', String(FPS),
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'stillimage',
        '-crf', '24',
        '-c:a', 'aac',
        '-b:a', '160k',
        '-shortest',
        '-movflags', '+faststart',
        'out.mp4',
      ]

      const code = await ffmpeg.exec(args)
      if (code !== 0) throw new Error(`Encoder exited with code ${code}.`)

      const data = await ffmpeg.readFile('out.mp4')
      const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
      // Copy into a fresh buffer — the emscripten heap view can be recycled.
      const blob = new Blob([bytes.slice()], { type: 'video/mp4' })

      await ffmpeg.deleteFile('still.png').catch(() => {})
      await ffmpeg.deleteFile('audio.bin').catch(() => {})
      await ffmpeg.deleteFile('out.mp4').catch(() => {})

      const base = doc.name.replace(/\.[^.]+$/, '') || 'imagine'
      return { blob, name: `${base}.mp4` }
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause)
      error.value = lastLog ? `${detail} — ${lastLog}` : detail || 'Could not build the video.'
      console.error('[imagine] MP4 export failed', cause, lastLog)
      return null
    } finally {
      busy.value = false
      stage.value = ''
      progress.value = 0
    }
  }

  async function downloadVideo() {
    const result = await renderVideo()
    if (!result) return
    const url = URL.createObjectURL(result.blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = result.name
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  return {
    track,
    trimStart,
    trimEnd,
    motion,
    busy,
    stage,
    progress,
    error,
    hasTrack,
    clipLength,
    clipTooLong,
    canRender,
    setTrack,
    clearTrack,
    setTrim,
    renderVideo,
    downloadVideo,
  }
}
