/**
 * Metric floor measurements from tracked WebXR hit-test poses.
 * The X/Z plane is horizontal; Y is retained for level consistency checks.
 * These are AR estimates, NOT independently verified tape/laser measurements.
 */
export type FloorPoint = Readonly<{ x: number; y: number; z: number }>
export type MeasurementKind = 'distance' | 'floor'

const MIN_GAP_METERS = 0.08
const MAX_LEVEL_DIFFERENCE_METERS = 0.15
const EPSILON = 1e-8

export function floorDistance(a: FloorPoint, b: FloorPoint): number {
  return Math.hypot(b.x - a.x, b.z - a.z)
}

export function floorPerimeter(points: readonly FloorPoint[]): number {
  if (points.length < 3) return 0
  return points.reduce((sum, point, i) =>
    sum + floorDistance(point, points[(i + 1) % points.length]), 0)
}

/** Shoelace area for the XZ floor polygon. Units are square meters. */
export function floorArea(points: readonly FloorPoint[]): number {
  if (points.length < 3) return 0
  let twiceArea = 0
  for (let i = 0; i < points.length; i++) {
    const current = points[i]
    const next = points[(i + 1) % points.length]
    twiceArea += current.x * next.z - next.x * current.z
  }
  return Math.abs(twiceArea) / 2
}

function cross(a: FloorPoint, b: FloorPoint, c: FloorPoint): number {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x)
}

function onSegment(a: FloorPoint, b: FloorPoint, p: FloorPoint): boolean {
  return Math.min(a.x, b.x) - EPSILON <= p.x &&
    p.x <= Math.max(a.x, b.x) + EPSILON &&
    Math.min(a.z, b.z) - EPSILON <= p.z &&
    p.z <= Math.max(a.z, b.z) + EPSILON
}

function segmentsIntersect(a: FloorPoint, b: FloorPoint, c: FloorPoint, d: FloorPoint): boolean {
  const p = cross(a, b, c)
  const q = cross(a, b, d)
  const r = cross(c, d, a)
  const s = cross(c, d, b)
  if (((p > EPSILON && q < -EPSILON) || (p < -EPSILON && q > EPSILON)) &&
      ((r > EPSILON && s < -EPSILON) || (r < -EPSILON && s > EPSILON))) {
    return true
  }
  return (Math.abs(p) <= EPSILON && onSegment(a, b, c)) ||
    (Math.abs(q) <= EPSILON && onSegment(a, b, d)) ||
    (Math.abs(r) <= EPSILON && onSegment(c, d, a)) ||
    (Math.abs(s) <= EPSILON && onSegment(c, d, b))
}

/** Reject overlapping/self-crossing outlines before reporting an area. */
export function isSimpleFloorPolygon(points: readonly FloorPoint[]): boolean {
  const count = points.length
  if (count < 3 || floorArea(points) < 0.01) return false
  for (let i = 0; i < count; i++) {
    if (floorDistance(points[i], points[(i + 1) % count]) < MIN_GAP_METERS) return false
    for (let j = i + 1; j < count; j++) {
      if (j === i + 1 || (i === 0 && j === count - 1)) continue
      if (segmentsIntersect(points[i], points[(i + 1) % count],
        points[j], points[(j + 1) % count])) return false
    }
  }
  return true
}

export function checkNextFloorPoint(
  points: readonly FloorPoint[],
  candidate: FloorPoint,
  mode: MeasurementKind,
): string | null {
  if (![candidate.x, candidate.y, candidate.z].every(Number.isFinite)) {
    return 'Invalid tracking coordinates. Try scanning the floor again.'
  }
  if (mode === 'distance' && points.length >= 2) return 'Distance needs two points. Undo or Clear first.'
  if (mode === 'floor' && points.length >= 12) return 'Maximum 12 floor corners. Finish or clear the outline.'
  if (points.length > 0) {
    if (Math.abs(points[0].y - candidate.y) > MAX_LEVEL_DIFFERENCE_METERS) {
      return 'This point is at a different height. Aim at the same floor.'
    }
    if (floorDistance(points.at(-1)!, candidate) < MIN_GAP_METERS) {
      return 'Move at least 8 cm from the previous point.'
    }
    if (mode === 'floor' && points.length >= 2 &&
      floorDistance(points[0], candidate) < MIN_GAP_METERS) {
      return 'Do not tap the first point again. The outline closes automatically.'
    }
    if (mode === 'floor' && points.length >= 2) {
      const next = [...points, candidate]
      if (!isSimpleFloorPolygon(next)) {
        return 'Corners would make a crossed or invalid floor outline. Choose a different point.'
      }
    }
  }
  return null
}

export type MeasurementSummary = {
  segmentMeters: number | null
  perimeterMeters: number | null
  areaSquareMeters: number | null
  edgeMeters: number[]
}

export function summarizeMeasurement(points: readonly FloorPoint[], mode: MeasurementKind): MeasurementSummary {
  const segments = points.slice(1).map((point, i) => floorDistance(points[i], point))
  if (mode === 'distance') {
    return {
      segmentMeters: points.length === 2 ? segments[0] : null,
      perimeterMeters: null, areaSquareMeters: null, edgeMeters: segments,
    }
  }
  const isValid = isSimpleFloorPolygon(points)
  return {
    segmentMeters: null,
    perimeterMeters: isValid ? floorPerimeter(points) : null,
    areaSquareMeters: isValid ? floorArea(points) : null,
    edgeMeters: isValid ? [...segments, floorDistance(points.at(-1)!, points[0])] : segments,
  }
}
