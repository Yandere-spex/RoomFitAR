/**
 * Compare the current 8th Wall world-plane ray with optional engine hitTest
 * results. A FEATURE_POINT is not a detected floor and must never be snapped
 * to floor height. The engine can return only FEATURE_POINT on some versions.
 *
 * This reduces obviously bad placements; it does NOT calibrate metric SLAM.
 */
const finitePoint = (point) => point && ['x', 'y', 'z']
  .every(axis => Number.isFinite(point[axis]))

const horizontalDistance = (a, b) =>
  Math.hypot(a.x - b.x, a.z - b.z)

export function evaluateFloorPlacement({
  trackingStatus,
  trackingReason,
  cameraPosition,
  planePoint,
  hitResults = [],
  minDistance = 0.25,
  maxDistance = 8,
  maxSurfaceHeight = 0.16,
  maxHorizontalDifference = 0.35,
}) {
  const blocked = (reason, details = {}) =>
    ({ ready: false, reason, source: 'none', position: null, ...details })

  if (trackingStatus !== 'NORMAL' || trackingReason === 'INITIALIZING') {
    return blocked('tracking-unreliable')
  }
  if (!finitePoint(cameraPosition) || !finitePoint(planePoint)) {
    return blocked('floor-not-visible')
  }
  // A camera at/below the estimated floor, or improbably far above it,
  // indicates a faulty world coordinate reference or unstable scale.
  if (cameraPosition.y < 0.35 || cameraPosition.y > 2.8) {
    return blocked('camera-height-suspect', { cameraHeight: cameraPosition.y })
  }
  const distance = Math.hypot(
    planePoint.x - cameraPosition.x,
    planePoint.y - cameraPosition.y,
    planePoint.z - cameraPosition.z,
  )
  if (distance < minDistance || distance > maxDistance) {
    return blocked('floor-out-of-range', { distance })
  }
  if (Math.abs(planePoint.y) > 0.035) return blocked('floor-not-horizontal')

  const surfaces = (Array.isArray(hitResults) ? hitResults : []).filter(hit =>
    hit && (hit.type === 'DETECTED_SURFACE' || hit.type === 'ESTIMATED_SURFACE') &&
    finitePoint(hit.position))

  if (surfaces.length > 0) {
    // We cannot interpret arbitrary FEATURE_POINTs as a physical floor.
    const closest = [...surfaces].sort((a, b) =>
      horizontalDistance(a.position, planePoint) -
      horizontalDistance(b.position, planePoint))[0]
    const disagreement = horizontalDistance(closest.position, planePoint)
    if (Math.abs(closest.position.y - planePoint.y) > maxSurfaceHeight) {
      return blocked('surface-is-not-floor', {
        surfaceHeight: closest.position.y,
        disagreement,
      })
    }
    if (disagreement > maxHorizontalDifference) {
      return blocked('surface-position-mismatch', { disagreement })
    }
    // Valid engine surface estimates may refine x/z, never physical model
    // scale. Keep the validated world plane as the surface height.
    return {
      ready: true,
      reason: 'engine-surface-consistent',
      source: closest.type,
      position: {
        x: closest.position.x,
        y: planePoint.y,
        z: closest.position.z,
      },
      disagreement,
    }
  }

  return {
    ready: true,
    reason: 'single-ground-plane-estimate',
    source: 'GROUND_PLANE_ESTIMATE',
    position: { x: planePoint.x, y: planePoint.y, z: planePoint.z },
    disagreement: null,
  }
}
