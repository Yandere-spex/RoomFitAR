/**
 * The AR provider boundary is deliberately separate from the Digital Draft editor.
 * No spatial provider has been integrated yet. Saving a local 3D transform is NOT
 * the same as relocalizing physical furniture after a new browser session.
 */
export interface SpatialPose {
  position: [number, number, number]
  rotation: [number, number, number, number]
}

export interface SpatialMap {
  provider: string
  mapId: string
  version: string
}

export type LocalizationResult =
  | { status: 'localized'; pose: SpatialPose; map: SpatialMap; confidence?: number }
  | { status: 'unavailable' | 'searching' | 'failed'; reason?: string }

export interface SpatialProvider {
  readonly id: string
  canMapInBrowser(): Promise<boolean>
  createMap(): Promise<SpatialMap>
  localize(map: SpatialMap): Promise<LocalizationResult>
  stop(): Promise<void>
}

export const unavailableSpatialProvider: SpatialProvider = {
  id: 'not-configured',
  async canMapInBrowser() { return false },
  async createMap() { throw new Error('Room mapping provider has not been configured.') },
  async localize() { return { status: 'unavailable', reason: 'Spatial localization has not been integrated.' } },
  async stop() {},
}
