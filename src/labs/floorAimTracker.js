/**
 * A spatial placement gate, not a scale correction.
 * Repeated camera-ray intersections must agree on the same floor position
 * before a tap can place a real-size model.
 */
export function createFloorAimTracker({
  toleranceMeters = 0.08,
  holdMilliseconds = 400,
  sampleWindowMilliseconds = 900,
  gapMilliseconds = 180,
  minSamples = 5,
} = {}) {
  let samples = []
  const clear = () => { samples = [] }
  const update = (point, nowMilliseconds, trackingIsNormal) => {
    if (!trackingIsNormal || !point || !Number.isFinite(nowMilliseconds) ||
      ![point.x, point.y, point.z].every(Number.isFinite)) {
      clear()
      return null
    }
    const last = samples.at(-1)
    if (last && (nowMilliseconds < last.t || nowMilliseconds - last.t > gapMilliseconds)) clear()
    samples.push({ x: point.x, y: point.y, z: point.z, t: nowMilliseconds })
    samples = samples.filter(p => nowMilliseconds - p.t <= sampleWindowMilliseconds).slice(-65)
    if (samples.length < minSamples || nowMilliseconds - samples[0].t < holdMilliseconds) return null

    const centroid = samples.reduce((p, item) => ({
      x: p.x + item.x / samples.length,
      y: p.y + item.y / samples.length,
      z: p.z + item.z / samples.length,
    }), { x: 0, y: 0, z: 0 })
    const worst = Math.max(...samples.map(p =>
      Math.hypot(p.x - centroid.x, p.z - centroid.z)))
    if (worst > toleranceMeters) {
      // Keep only the most recent sample when the aim moves to another floor spot.
      samples = [samples.at(-1)]
      return null
    }
    return centroid
  }
  return { update, clear }
}
