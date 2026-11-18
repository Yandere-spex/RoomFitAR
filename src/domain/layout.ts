import { catalogById } from './catalog'
import type { PlacedObject, RoomLayout } from './types'

const STORAGE_KEY = 'roomfit-ar:digital-draft:v1'

export function createInitialLayout(): RoomLayout {
  return {
    schemaVersion: 1,
    id: 'living-room',
    name: 'My Living Room',
    width: 5.5,
    depth: 4.8,
    objects: [
      { id: 'demo-sofa', productId: 'sofa-linen', position: [-1.12, 0, -1.35], rotationY: 0 },
      { id: 'demo-table', productId: 'oak-table', position: [-1.08, 0, 0.15], rotationY: 0 },
      { id: 'demo-plant', productId: 'indoor-plant', position: [1.95, 0, -1.75], rotationY: 0 },
    ],
    savedAt: null,
  }
}

export function loadLayout(): RoomLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialLayout()
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !('schemaVersion' in parsed) || parsed.schemaVersion !== 1) {
      return createInitialLayout()
    }
    const layout = parsed as RoomLayout
    if (!Array.isArray(layout.objects) || !Number.isFinite(layout.width) || !Number.isFinite(layout.depth)) {
      return createInitialLayout()
    }
    return layout
  } catch {
    return createInitialLayout()
  }
}

export function saveLayout(layout: RoomLayout): RoomLayout {
  const saved = { ...layout, savedAt: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  return saved
}

export function rotatedFootprint(object: PlacedObject): { width: number; depth: number } {
  const dimensions = catalogById[object.productId]?.dimensions
  if (!dimensions) return { width: 0, depth: 0 }
  const cosine = Math.abs(Math.cos(object.rotationY))
  const sine = Math.abs(Math.sin(object.rotationY))
  return {
    width: dimensions.width * cosine + dimensions.depth * sine,
    depth: dimensions.width * sine + dimensions.depth * cosine,
  }
}

export function canPlace(layout: RoomLayout, candidate: PlacedObject): boolean {
  const footprint = rotatedFootprint(candidate)
  if (footprint.width === 0 || footprint.depth === 0) return false
  const [x, , z] = candidate.position
  if (Math.abs(x) + footprint.width / 2 > layout.width / 2 - 0.08) return false
  if (Math.abs(z) + footprint.depth / 2 > layout.depth / 2 - 0.08) return false

  return layout.objects.every((object) => {
    if (object.id === candidate.id) return true
    const other = rotatedFootprint(object)
    const [ox, , oz] = object.position
    return (
      Math.abs(x - ox) >= (footprint.width + other.width) / 2 + 0.06 ||
      Math.abs(z - oz) >= (footprint.depth + other.depth) / 2 + 0.06
    )
  })
}

export function findAvailablePosition(layout: RoomLayout, productId: string): PlacedObject | null {
  const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now())
  for (let z = -layout.depth / 2 + 0.3; z <= layout.depth / 2 - 0.3; z += 0.3) {
    for (let x = -layout.width / 2 + 0.3; x <= layout.width / 2 - 0.3; x += 0.3) {
      const candidate: PlacedObject = { id, productId, position: [Number(x.toFixed(2)), 0, Number(z.toFixed(2))], rotationY: 0 }
      if (canPlace(layout, candidate)) return candidate
    }
  }
  return null
}

export function exportLayout(layout: RoomLayout): void {
  const json = JSON.stringify(layout, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'roomfit-layout.json'
  anchor.click()
  URL.revokeObjectURL(url)
}
