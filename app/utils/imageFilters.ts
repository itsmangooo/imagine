/**
 * Custom Fabric filters.
 *
 * Ten of the twelve adjustments map onto Fabric's built-in filter classes.
 * Tone (highlights/shadows) and vignette have no stock equivalent, so they are
 * implemented as proper `BaseFilter` subclasses — GPU fragment shader plus the
 * 2D fallback Fabric calls when WebGL is unavailable. That keeps them inside
 * Fabric's filter pipeline (cached, composable, applied in one pass over the
 * source) instead of a hand-rolled pixel loop bolted on afterwards.
 *
 * Fabric touches browser globals at import time, so the classes are defined
 * lazily on first use rather than at module scope.
 */

export interface CustomFilterClasses {
  /** Luminance-weighted lift/recovery of the dark and bright ends. */
  ToneCurve: new (options?: { highlights?: number; shadows?: number }) => object
  /** Radial darkening toward the frame edges. */
  Vignette: new (options?: { vignette?: number }) => object
}

let cache: CustomFilterClasses | null = null

export async function loadCustomFilters(): Promise<CustomFilterClasses> {
  if (cache) return cache

  const { filters, classRegistry } = await import('fabric')
  const Base = filters.BaseFilter as unknown as new (options?: Record<string, unknown>) => Record<
    string,
    unknown
  >

  /** Rec. 709 luma — matches how the rest of the pipeline weights brightness. */
  const LUMA = 'vec3(0.2126, 0.7152, 0.0722)'

  class ToneCurve extends Base {
    declare highlights: number
    declare shadows: number

    static type = 'ToneCurve'
    static defaults = { highlights: 0, shadows: 0 }
    static uniformLocations = ['uHighlights', 'uShadows']

    getFragmentSource() {
      // Cubic masks so each control stays in its own end of the range and the
      // midtones are left alone — a linear mask would just act as brightness.
      return `
        precision highp float;
        uniform sampler2D uTexture;
        uniform float uHighlights;
        uniform float uShadows;
        varying vec2 vTexCoord;
        void main() {
          vec4 color = texture2D(uTexture, vTexCoord);
          float l = dot(color.rgb, ${LUMA});
          float shadowMask = pow(1.0 - l, 3.0);
          float highlightMask = pow(l, 3.0);
          vec3 rgb = color.rgb + (uShadows * shadowMask + uHighlights * highlightMask) * 0.6;
          gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
        }
      `
    }

    applyTo2d({ imageData: { data } }: { imageData: ImageData }) {
      const h = this.highlights
      const s = this.shadows
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]! / 255
        const g = data[i + 1]! / 255
        const b = data[i + 2]! / 255
        const l = 0.2126 * r + 0.7152 * g + 0.0722 * b
        const shadowMask = (1 - l) ** 3
        const highlightMask = l ** 3
        // Uint8ClampedArray clamps for us.
        const delta = (s * shadowMask + h * highlightMask) * 0.6 * 255
        data[i] = data[i]! + delta
        data[i + 1] = data[i + 1]! + delta
        data[i + 2] = data[i + 2]! + delta
      }
    }

    isNeutralState() {
      return this.highlights === 0 && this.shadows === 0
    }

    sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
      gl.uniform1f(u.uHighlights!, this.highlights)
      gl.uniform1f(u.uShadows!, this.shadows)
    }
  }

  class Vignette extends Base {
    declare vignette: number

    static type = 'Vignette'
    static defaults = { vignette: 0 }
    static uniformLocations = ['uVignette']

    getFragmentSource() {
      // vTexCoord is 0–1 across the texture regardless of aspect, so the falloff
      // is elliptical on non-square images — which is what a vignette should do:
      // follow the frame rather than describe a circle inside it.
      return `
        precision highp float;
        uniform sampler2D uTexture;
        uniform float uVignette;
        varying vec2 vTexCoord;
        void main() {
          vec4 color = texture2D(uTexture, vTexCoord);
          float d = length(vTexCoord - vec2(0.5)) / 0.7071;
          float v = smoothstep(0.35, 1.05, d);
          gl_FragColor = vec4(clamp(color.rgb * (1.0 - uVignette * v), 0.0, 1.0), color.a);
        }
      `
    }

    applyTo2d({ imageData }: { imageData: ImageData }) {
      const { data, width, height } = imageData
      const amount = this.vignette
      const cx = width / 2
      const cy = height / 2
      const maxD = Math.hypot(cx, cy)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const d = Math.hypot(x - cx, y - cy) / maxD
          const t = Math.min(1, Math.max(0, (d - 0.35) / 0.7))
          const v = t * t * (3 - 2 * t) // smoothstep
          const f = 1 - amount * v
          const i = (y * width + x) * 4
          data[i] = data[i]! * f
          data[i + 1] = data[i + 1]! * f
          data[i + 2] = data[i + 2]! * f
        }
      }
    }

    isNeutralState() {
      return this.vignette === 0
    }

    sendUniformData(gl: WebGLRenderingContext, u: Record<string, WebGLUniformLocation>) {
      gl.uniform1f(u.uVignette!, this.vignette)
    }
  }

  // Registered the way the built-ins are, so serialisation can round-trip them.
  classRegistry.setClass(ToneCurve)
  classRegistry.setClass(Vignette)

  cache = {
    ToneCurve: ToneCurve as unknown as CustomFilterClasses['ToneCurve'],
    Vignette: Vignette as unknown as CustomFilterClasses['Vignette'],
  }
  return cache
}
