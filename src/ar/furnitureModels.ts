import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { FurnitureProduct } from '../domain/types'

/**
 * Licensed demo assets downloaded to public/models.
 * These are illustrative models sized to the sample catalog, not verified
 * manufacturer dimensions. See public/models/ATTRIBUTION.md.
 */
export const arPreviewProducts = ['velvet-sofa', 'sofa-linen', 'accent-chair'] as const

const paths: Record<string, string> = {
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
  const original = await loadTemplate(path)
  const root = original.clone(true)
  root.updateMatrixWorld(true)

  const bounds = new THREE.Box3().setFromObject(root)
  const size = bounds.getSize(new THREE.Vector3())
  if (size.x <= 0 || size.y <= 0 || size.z <= 0) {
    throw new Error('Furniture asset has invalid dimensions.')
  }

  const { width, height, depth } = product.dimensions
  // Use uniform scaling to preserve the proportions of the imported mesh.
  const uniformScale = Math.min(width / size.x, height / size.y, depth / size.z)
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
  return pivot
}
