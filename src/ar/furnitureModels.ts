import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { FurnitureProduct } from '../domain/types'

/**
 * Licensed demo assets downloaded to public/models.
 * These are illustrative models sized to the sample catalog, not verified
 * manufacturer dimensions. See public/models/ATTRIBUTION.md.
 */
export const arPreviewProducts = [
  'wooden-stool', 'monobloc-chair', 'gallinera-chair', 'gallinera-table', 'papasan-chair', 'woven-rocker', 'accent-chair', 'lounge-chair',
  'compact-wood-table', 'round-coffee-table', 'velvet-sofa', 'sofa-linen',
] as const

export const polyHavenProductIds = new Set([
  'wooden-stool', 'monobloc-chair', 'lounge-chair', 'gallinera-chair', 'gallinera-table',
  'compact-wood-table', 'round-coffee-table',
])

export const innersceneModelIds = new Set(['papasan-chair', 'woven-rocker'])

export function hasSourceMetricDimensions(productId: string) {
  return isPolyHavenModel(productId) || innersceneModelIds.has(productId)
}

export function isPolyHavenModel(productId: string) {
  return polyHavenProductIds.has(productId)
}

const paths: Record<string, string> = {
  'gallinera-chair': '/models/polyhaven/gallinera_chair.glb',
  'gallinera-table': '/models/polyhaven/gallinera_table.glb',
  'papasan-chair': '/models/innerscene/papasan-chair.glb',
  'woven-rocker': '/models/innerscene/woven-lounge-rocker.glb',
  'wooden-stool': '/models/polyhaven/wooden_stool_02.glb',
  'monobloc-chair': '/models/polyhaven/plastic_monobloc_chair_01.glb',
  'lounge-chair': '/models/polyhaven/mid_century_lounge_chair.glb',
  'compact-wood-table': '/models/polyhaven/small_wooden_table_01.glb',
  'round-coffee-table': '/models/polyhaven/coffee_table_round_01.glb',
  'velvet-sofa': '/models/velvet-sofa.glb',
  'accent-chair': '/models/accent-chair.glb',
  'sofa-linen': '/models/sofa-linen.glb',
}

const loader = new GLTFLoader()
const cache = new Map<string, Promise<THREE.Group>>()

export function isPreviewAssetAvailable(productId: string) {
  return Boolean(paths[productId])
}

function loadTemplate(path: string) {
  const existing = cache.get(path)
  if (existing) return existing
  const pending = new Promise<THREE.Group>((resolve, reject) => {
    loader.load(path, (model) => resolve(model.scene), undefined, reject)
  })
  cache.set(path, pending)
  return pending
}

export async function createFurnitureAsset(product: FurnitureProduct): Promise<THREE.Group> {
  const path = paths[product.id]
  if (!path) throw new Error('Photorealistic AR asset not yet available for this item.')
  // Vite uses / locally and /RoomFitAR/ for the GitHub Pages deployment.
  const original = await loadTemplate(import.meta.env.BASE_URL + path.replace(/^\/+/, ''))
  const root = original.clone(true)
  root.updateMatrixWorld(true)

  const bounds = new THREE.Box3().setFromObject(root)
  const size = bounds.getSize(new THREE.Vector3())
  if (size.x <= 0 || size.y <= 0 || size.z <= 0) {
    throw new Error('Furniture asset has invalid dimensions.')
  }

  const { width, height, depth } = product.dimensions
  // Use uniform scaling to preserve the proportions of the imported mesh.
  const ratios = [width / size.x, height / size.y, depth / size.z]
  // For Poly Haven models, keep all authored proportions instead of squeezing
  // three axes independently. Their API documents size in millimeters.
  // Other showcase assets retain their provisional fit-within behavior.
  const uniformScale = innersceneModelIds.has(product.id)
    ? 1
    : isPolyHavenModel(product.id) ? [...ratios].sort((a, b) => a - b)[1]
      : Math.min(...ratios)
  if (hasSourceMetricDimensions(product.id)) {
    const mismatch = Math.max(...ratios) / Math.min(...ratios)
    const absoluteMismatch = Math.max(...ratios.map(v => Math.max(v,1/v)))
    if (mismatch > 1.18 || (innersceneModelIds.has(product.id) && absoluteMismatch > 1.10)) {
      throw new Error(product.name + ' source dimensions do not match the 3D geometry. Placement blocked to avoid misleading scale.')
    }
  }
  root.scale.multiplyScalar(uniformScale)
  root.updateMatrixWorld(true)
  const actual = new THREE.Box3().setFromObject(root)
  const center = actual.getCenter(new THREE.Vector3())

  // RoomFit's furniture origin is centered on the footprint at floor level.
  root.position.set(-center.x, -actual.min.y, -center.z)
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.castShadow = true
      node.receiveShadow = true
    }
  })
  const pivot = new THREE.Group()
  pivot.add(root)
  const finalSize = new THREE.Box3().setFromObject(pivot).getSize(new THREE.Vector3())
  pivot.userData = {
    productId: product.id,
    modelSizeMeters: [finalSize.x, finalSize.y, finalSize.z],
    scaleEvidence: innersceneModelIds.has(product.id)
      ? 'Innerscene CC0 original model, authored at approximate real-world scale; not retail verified'
      : isPolyHavenModel(product.id)
        ? 'Poly Haven source-model dimensions (approximate, not retail verified)'
        : 'Provisional demo dimensions; not independently measured',
  }
  return pivot
}
