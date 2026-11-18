import assert from 'node:assert/strict'
// Node 22 strips TypeScript annotations for our self-contained math module.
const { floorDistance, floorArea, floorPerimeter, isSimpleFloorPolygon,
  checkNextFloorPoint, summarizeMeasurement } =
  await import('../src/ar/roomMeasurements.ts')

const P = (x, z, y = 0) => ({ x, y, z })
const square = [P(0, 0), P(4, 0), P(4, 3), P(0, 3)]
const near = (value, expected, label) =>
  assert.ok(Math.abs(value - expected) < 1e-9, label + ': ' + value + ' != ' + expected)

near(floorDistance(square[0], square[2]), 5, '5m diagonal')
near(floorArea(square), 12, 'rectangle area 12 m²')
near(floorPerimeter(square), 14, 'rectangle perimeter 14m')
near(floorArea([...square].reverse()), 12, 'area orientation invariant')
near(floorArea([P(0, 0), P(3, 0), P(0, 4)]), 6, 'triangle area')
assert.ok(isSimpleFloorPolygon(square), 'valid rectangle')
assert.equal(isSimpleFloorPolygon([P(0, 0), P(3, 3), P(0, 3), P(3, 0)]), false, 'self crossed')
assert.equal(checkNextFloorPoint([], P(0, 0), 'floor'), null, 'first point accepted')
assert.equal(checkNextFloorPoint([P(0, 0)], P(0.01, 0.01), 'distance') !== null, true, 'too near')
assert.equal(checkNextFloorPoint([P(0, 0)], P(1, 0, 0.3), 'distance') !== null, true, 'wrong level')
assert.equal(checkNextFloorPoint([P(0, 0), P(1, 0)], P(2, 0), 'distance') !== null, true, 'distance max points')
assert.equal(checkNextFloorPoint([P(0, 0), P(4, 0)], P(4, 3), 'floor'), null, '3rd valid corner')
assert.equal(checkNextFloorPoint([P(0, 0), P(4, 0), P(4, 3)], P(0, 3), 'floor'), null, '4th valid corner')
assert.equal(checkNextFloorPoint([P(0, 0), P(3, 3), P(0, 3)], P(3, 0), 'floor') !== null,
  true, 'reject new crossing edge')
near(summarizeMeasurement(square, 'floor').areaSquareMeters, 12, 'summary area')
near(summarizeMeasurement([P(0, 0), P(2.5, 0)], 'distance').segmentMeters, 2.5, 'distance summary')
assert.equal(summarizeMeasurement([P(0, 0)], 'distance').segmentMeters, null, 'no invented value')
assert.equal(summarizeMeasurement([P(0, 0), P(3, 3), P(0, 3), P(3, 0)], 'floor').areaSquareMeters,
  null, 'self intersecting area cannot be shown')
console.log('RoomFit: 18 floor measurement geometry and validation checks passed.')
