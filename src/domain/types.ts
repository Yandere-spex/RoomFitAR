export type Vector3Tuple = [number, number, number]

export type FurnitureKind = 'sofa' | 'chair' | 'table' | 'shelf' | 'plant' | 'bed'

export interface Dimensions {
  width: number
  height: number
  depth: number
}

export interface FurnitureProduct {
  id: string
  name: string
  category: string
  kind: FurnitureKind
  dimensions: Dimensions
  color: string
  accent: string
  description: string
}

export interface PlacedObject {
  id: string
  productId: string
  position: Vector3Tuple
  rotationY: number
}

export interface RoomLayout {
  schemaVersion: 1
  id: string
  name: string
  width: number
  depth: number
  objects: PlacedObject[]
  savedAt: string | null
}
