import type { Canvas, FabricImage } from 'fabric'
import type { IconName } from '~/components/ui/UiIcon.vue'

/**
 * Editor shell state. The left sidebar, bottom bar and right panel are all
 * driven from here — each region renders whatever the active tool declares, so
 * adding a tool never means touching the layout.
 *
 * Image and edit state now lives per document; see `useDocuments`.
 */

export type ToolId =
  | 'crop'
  | 'filters'
  | 'grading'
  | 'text'
  | 'doodle'
  | 'collage'
  | 'audio'
  | 'generate'
  | 'autoedit'

export interface ToolDef {
  id: ToolId
  label: string
  icon: IconName
  /**
   * Calls a third-party AI provider with the USER'S OWN API key and is billed
   * to them directly. There are no credits and Imagine handles no payments —
   * every other tool is client-side and free with no key at all.
   */
  byok?: boolean
  /** Not built yet — shown but inert, so the nav reflects the real roadmap. */
  pending?: boolean
}

export const TOOLS: ToolDef[] = [
  { id: 'crop', label: 'Crop', icon: 'crop' },
  { id: 'filters', label: 'Filters', icon: 'filters' },
  { id: 'grading', label: 'Color Grading', icon: 'grading' },
  { id: 'text', label: 'Text', icon: 'text' },
  { id: 'doodle', label: 'Doodle', icon: 'doodle' },
  { id: 'collage', label: 'Collage', icon: 'collage' },
  { id: 'audio', label: 'Music', icon: 'music' },
  { id: 'generate', label: 'AI Generate', icon: 'generate', byok: true },
  // Auto-Edit analyses the histogram locally, so it needs no key and no billing.
  { id: 'autoedit', label: 'AI Auto-Edit', icon: 'autoedit' },
]

export interface NavItem {
  id: string
  label: string
  icon: IconName
  to?: string
  adminOnly?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'editor', label: 'Editor', icon: 'editor', to: '/editor' },
  { id: 'profile', label: 'Profile', icon: 'profile', to: '/profile' },
  { id: 'settings', label: 'Settings', icon: 'lock', to: '/settings' },
  { id: 'admin', label: 'Admin', icon: 'admin', to: '/admin', adminOnly: true },
]

/** Where the image is actually drawn, in CSS px relative to the canvas frame. */
export interface ImageRect {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Live Fabric handles.
 *
 * MODULE scope on purpose. They cannot go in `useState` — Fabric objects are
 * large, mutable and circular, so deep reactivity destroys performance and Nuxt
 * cannot serialise them. But a `shallowRef` declared inside the composable is
 * NOT shared the way `useState` is: every caller would get its own null ref, and
 * the render pipeline would never see what the canvas component wrote. That bug
 * silently disabled all filtering once already.
 *
 * Safe from cross-request pollution on the server because nothing assigns them
 * during SSR — Fabric is only ever constructed in `onMounted`.
 */
const canvasRef = shallowRef<Canvas | null>(null)
const imageObjectRef = shallowRef<FabricImage | null>(null)

export function useEditor() {
  const activeTool = useState<ToolId>('editor:tool', () => 'crop')
  const sidebarCollapsed = useState<boolean>('editor:sidebar-collapsed', () => false)
  const filmstripOpen = useState<boolean>('editor:filmstrip', () => true)
  const imageRect = useState<ImageRect>('editor:image-rect', () => ({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  }))
  /** Zoom of the on-screen view relative to the SOURCE image. */
  const fitScale = useState<number>('editor:fit-scale', () => 1)
  /** Bumped when the canvas must re-fit (the rendered element changed size). */
  const refitToken = useState<number>('editor:refit', () => 0)

  const { activeDocument, isDocumentEdited } = useDocuments()

  const canvas = canvasRef
  const imageObject = imageObjectRef

  const activeToolDef = computed(() => TOOLS.find(t => t.id === activeTool.value) ?? TOOLS[0]!)
  const hasImage = computed(() => activeDocument.value !== null)

  /** Kept for the components that only need the displayed image's facts. */
  const source = computed(() => {
    const doc = activeDocument.value
    return doc ? { ...doc.working, name: doc.name } : null
  })

  const isEdited = computed(() => {
    const doc = activeDocument.value
    return doc ? isDocumentEdited(doc) : false
  })

  function selectTool(id: ToolId) {
    activeTool.value = id
  }

  function requestRefit() {
    refitToken.value++
  }

  return {
    activeTool,
    activeToolDef,
    sidebarCollapsed,
    filmstripOpen,
    source,
    hasImage,
    isEdited,
    canvas,
    imageObject,
    fitScale,
    imageRect,
    refitToken,
    selectTool,
    requestRefit,
  }
}

/**
 * PLACEHOLDER. Returns a fake signed-in user so the nav can render before auth
 * exists. This is NOT a security boundary — it is replaced wholesale when
 * nuxt-auth-utils lands. Never gate anything server-side on it.
 */
export function useCurrentUser() {
  return computed(() => ({
    name: 'Emanuel',
    email: 'vjecni1@gmail.com',
    isAdmin: true,
  }))
}
