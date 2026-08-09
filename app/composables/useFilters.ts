/**
 * Filters: 14 presets + 12 manual adjustments, grouped Light / Colour / Effects.
 *
 * Presets ARE adjustment sets — picking one writes values into the same sliders
 * you can then tune by hand. There is no separate "preset layer", so preset and
 * manual tuning are one system rather than two that fight each other.
 *
 * Every adjustment is written into an "adjustment layer" on the active
 * document: either the whole-image layer, or the layer belonging to whichever
 * mask the tool is pointed at. Colour Grading writes into the very same layers
 * through a narrower set of controls.
 */

export type AdjustmentId =
  | 'exposure'
  | 'brightness'
  | 'contrast'
  | 'highlights'
  | 'shadows'
  | 'saturation'
  | 'temperature'
  | 'tint'
  | 'hue'
  | 'vignette'
  | 'sharpness'
  | 'grain'

export type AdjustmentGroupId = 'light' | 'colour' | 'effects'

export interface AdjustmentDef {
  id: AdjustmentId
  label: string
  group: AdjustmentGroupId
  min: number
  max: number
  step: number
}

export const ADJUSTMENT_GROUPS: { id: AdjustmentGroupId; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'colour', label: 'Colour' },
  { id: 'effects', label: 'Effects' },
]

export const ADJUSTMENTS: AdjustmentDef[] = [
  { id: 'exposure', label: 'Exposure', group: 'light', min: -1, max: 1, step: 0.01 },
  { id: 'brightness', label: 'Brightness', group: 'light', min: -1, max: 1, step: 0.01 },
  { id: 'contrast', label: 'Contrast', group: 'light', min: -1, max: 1, step: 0.01 },
  { id: 'highlights', label: 'Highlights', group: 'light', min: -1, max: 1, step: 0.01 },
  { id: 'shadows', label: 'Shadows', group: 'light', min: -1, max: 1, step: 0.01 },
  { id: 'saturation', label: 'Saturation', group: 'colour', min: -1, max: 1, step: 0.01 },
  { id: 'temperature', label: 'Temperature', group: 'colour', min: -1, max: 1, step: 0.01 },
  { id: 'tint', label: 'Tint', group: 'colour', min: -1, max: 1, step: 0.01 },
  { id: 'hue', label: 'Hue rotation', group: 'colour', min: -1, max: 1, step: 0.01 },
  { id: 'vignette', label: 'Vignette', group: 'effects', min: 0, max: 1, step: 0.01 },
  { id: 'sharpness', label: 'Sharpness', group: 'effects', min: 0, max: 1, step: 0.01 },
  { id: 'grain', label: 'Grain', group: 'effects', min: 0, max: 1, step: 0.01 },
]

export type AdjustmentValues = Record<AdjustmentId, number>

export function neutralValues(): AdjustmentValues {
  return Object.fromEntries(ADJUSTMENTS.map(a => [a.id, 0])) as AdjustmentValues
}

export interface FilterPreset {
  id: string
  label: string
  values: Partial<AdjustmentValues>
}

/** The spec's 14, in its order. "None" is the neutral state, not a special case. */
export const FILTER_PRESETS: FilterPreset[] = [
  { id: 'none', label: 'None', values: {} },
  {
    id: 'cinematic-teal',
    label: 'Cinematic Teal',
    values: { temperature: -0.26, tint: -0.08, contrast: 0.18, saturation: -0.1, shadows: 0.12, highlights: -0.15 },
  },
  {
    id: 'vintage-film',
    label: 'Vintage Film',
    values: { temperature: 0.18, saturation: -0.22, contrast: -0.1, shadows: 0.2, grain: 0.3, vignette: 0.25 },
  },
  {
    id: 'bw-noir',
    label: 'B&W Noir',
    values: { saturation: -1, contrast: 0.35, highlights: -0.1, shadows: -0.15, vignette: 0.3 },
  },
  {
    id: 'warm-sunset',
    label: 'Warm Sunset',
    values: { temperature: 0.35, saturation: 0.15, exposure: 0.08, highlights: -0.1, shadows: 0.1 },
  },
  {
    id: 'cold-press',
    label: 'Cold Press',
    values: { temperature: -0.3, saturation: -0.05, contrast: 0.12, highlights: 0.05 },
  },
  {
    id: 'faded',
    label: 'Faded',
    values: { contrast: -0.25, saturation: -0.2, shadows: 0.3, highlights: -0.12, exposure: 0.05 },
  },
  {
    id: 'golden-hour',
    label: 'Golden Hour',
    values: { temperature: 0.28, tint: 0.06, exposure: 0.12, saturation: 0.12, highlights: -0.08, vignette: 0.15 },
  },
  {
    id: 'moody',
    label: 'Moody',
    values: { exposure: -0.12, contrast: 0.22, saturation: -0.18, shadows: -0.2, temperature: -0.1, vignette: 0.35 },
  },
  { id: 'vivid', label: 'Vivid', values: { saturation: 0.4, contrast: 0.2, sharpness: 0.25 } },
  {
    id: 'noir-contrast',
    label: 'Noir Contrast',
    values: { saturation: -1, contrast: 0.55, shadows: -0.3, highlights: 0.1, vignette: 0.2 },
  },
  {
    id: 'pastel',
    label: 'Pastel',
    values: { saturation: -0.25, contrast: -0.18, exposure: 0.15, highlights: -0.2, shadows: 0.25, temperature: 0.08 },
  },
  { id: 'matte', label: 'Matte', values: { contrast: -0.2, shadows: 0.35, highlights: -0.18, saturation: -0.08 } },
  {
    id: 'cross-process',
    label: 'Cross Process',
    values: { temperature: -0.15, tint: 0.2, contrast: 0.3, saturation: 0.25, shadows: 0.15, highlights: -0.1 },
  },
]

export function presetValues(id: string): AdjustmentValues {
  const preset = FILTER_PRESETS.find(p => p.id === id)
  return { ...neutralValues(), ...(preset?.values ?? {}) }
}

/**
 * Translate an adjustment set into a Fabric filter chain.
 *
 * Order matters: exposure/white-balance first (they act on the raw signal),
 * then tone, then colour, then optical effects last so grain and vignette are
 * not themselves sharpened or saturated.
 */
export async function buildFilters(v: AdjustmentValues): Promise<object[]> {
  const { filters } = await import('fabric')
  const { ToneCurve, Vignette } = await loadCustomFilters()
  const chain: object[] = []

  // Exposure + white balance collapse into a single ColorMatrix — three
  // separate filters would mean three passes for what is one gain per channel.
  if (v.exposure || v.temperature || v.tint) {
    const gain = 2 ** v.exposure
    const r = gain * (1 + v.temperature * 0.3 + v.tint * 0.12)
    const g = gain * (1 - v.tint * 0.24)
    const b = gain * (1 - v.temperature * 0.3 + v.tint * 0.12)
    chain.push(
      new filters.ColorMatrix({
        matrix: [r, 0, 0, 0, 0, 0, g, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, 1, 0],
      }),
    )
  }

  // Fabric's brightness/contrast run to ±255, which is far past useful at the
  // slider extremes — scaled so the full travel stays in a workable range.
  if (v.brightness) chain.push(new filters.Brightness({ brightness: v.brightness * 0.4 }))
  if (v.contrast) chain.push(new filters.Contrast({ contrast: v.contrast * 0.5 }))
  if (v.highlights || v.shadows) {
    chain.push(new ToneCurve({ highlights: v.highlights, shadows: v.shadows }))
  }

  // -1 lands exactly on greyscale, which is what the two noir presets rely on.
  if (v.saturation) chain.push(new filters.Saturation({ saturation: v.saturation }))
  if (v.hue) chain.push(new filters.HueRotation({ rotation: v.hue }))

  if (v.vignette) chain.push(new Vignette({ vignette: v.vignette }))
  if (v.sharpness) {
    // Identity blended toward a 5-tap sharpen, so the slider is continuous.
    const a = v.sharpness
    chain.push(new filters.Convolute({ matrix: [0, -a, 0, -a, 1 + 4 * a, -a, 0, -a, 0] }))
  }
  if (v.grain) chain.push(new filters.Noise({ noise: v.grain * 80 }))

  return chain
}

/**
 * Read/write access to whichever adjustment layer a tool is currently pointed
 * at — the whole image, or one mask. Filters and Grading both go through this,
 * which is what makes a mask painted in one tool adjustable in the other.
 */
export function useAdjustmentTarget(tool: 'filters' | 'grading') {
  const { activeDocument, patchEdits } = useDocuments()
  const { scheduleRender } = useRender()

  const targetMaskId = computed(() => activeDocument.value?.edits.targets[tool] ?? null)

  const layer = computed<AdjustmentLayer>(() => {
    const doc = activeDocument.value
    if (!doc) return emptyLayer()
    const maskId = doc.edits.targets[tool]
    if (!maskId) return doc.edits.global
    return doc.edits.masked[maskId] ?? emptyLayer()
  })

  const values = computed(() => layer.value.values)
  const presetId = computed(() => layer.value.presetId)

  function writeLayer(next: AdjustmentLayer) {
    patchEdits(edits => {
      const maskId = edits.targets[tool]
      if (!maskId) return { ...edits, global: next }
      return { ...edits, masked: { ...edits.masked, [maskId]: next } }
    })
    scheduleRender()
  }

  function setAdjustment(id: AdjustmentId, value: number) {
    writeLayer({ ...layer.value, values: { ...layer.value.values, [id]: value } })
  }

  function selectPreset(id: string) {
    writeLayer({ values: presetValues(id), presetId: id })
  }

  function resetLayer() {
    writeLayer(emptyLayer())
  }

  function setTarget(maskId: string | null) {
    patchEdits(edits => ({
      ...edits,
      targets: { ...edits.targets, [tool]: maskId },
      // Give a newly-targeted mask a layer to write into.
      masked:
        maskId && !edits.masked[maskId]
          ? { ...edits.masked, [maskId]: emptyLayer() }
          : edits.masked,
    }))
    scheduleRender()
  }

  const isModified = computed(() => {
    const base = presetValues(presetId.value)
    return ADJUSTMENTS.some(a => Math.abs(values.value[a.id] - base[a.id]) > 1e-6)
  })

  const isNeutral = computed(() => ADJUSTMENTS.every(a => values.value[a.id] === 0))
  const activeCount = computed(() => ADJUSTMENTS.filter(a => values.value[a.id] !== 0).length)

  return {
    targetMaskId,
    values,
    presetId,
    isModified,
    isNeutral,
    activeCount,
    setAdjustment,
    selectPreset,
    resetLayer,
    setTarget,
  }
}

export function useFilters() {
  const { hasImage } = useEditor()
  const openGroups = useState<Record<AdjustmentGroupId, boolean>>('filters:groups', () => ({
    light: true,
    colour: true,
    effects: false,
  }))

  function toggleGroup(id: AdjustmentGroupId) {
    openGroups.value = { ...openGroups.value, [id]: !openGroups.value[id] }
  }

  return { ...useAdjustmentTarget('filters'), openGroups, toggleGroup, hasImage }
}
