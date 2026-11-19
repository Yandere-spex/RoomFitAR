import assert from 'node:assert/strict'
import { evaluateFloorPlacement } from '../src/labs/floorPlacement.js'

const p = (x, y, z) => ({x,y,z})
const base = {
  trackingStatus: 'NORMAL',
  trackingReason: 'UNSPECIFIED',
  cameraPosition: p(0,1.6,2),
  planePoint: p(0,0,0),
}
const evaluate = extra => evaluateFloorPlacement({...base,...extra})
assert.deepEqual(evaluate({}).position, p(0,0,0))
assert.equal(evaluate({}).source, 'GROUND_PLANE_ESTIMATE')
assert.equal(evaluate({trackingStatus:'LIMITED'}).ready,false)
assert.equal(evaluate({trackingReason:'INITIALIZING'}).ready,false)
assert.equal(evaluate({planePoint:null}).reason,'floor-not-visible')
assert.equal(evaluate({cameraPosition:p(0,0.1,2)}).reason,'camera-height-suspect')
assert.equal(evaluate({cameraPosition:p(0,3.2,2)}).reason,'camera-height-suspect')
assert.equal(evaluate({planePoint:p(0,0,-20)}).reason,'floor-out-of-range')
const featurePoint = {type:'FEATURE_POINT',position:p(0,0.9,0.1)}
const feature = evaluate({hitResults:[featurePoint]})
assert.equal(feature.ready,true)
assert.equal(feature.source,'GROUND_PLANE_ESTIMATE')
assert.deepEqual(feature.position,base.planePoint,'feature point must not be ground contact')
const detected = evaluate({hitResults:[{type:'DETECTED_SURFACE',position:p(0.03,0.02,0.02)}]})
assert.equal(detected.ready,true)
assert.equal(detected.source,'DETECTED_SURFACE')
assert.deepEqual(detected.position,p(0.03,0,0.02))
const table = evaluate({hitResults:[{type:'ESTIMATED_SURFACE',position:p(0,0.72,0)}]})
assert.equal(table.ready,false)
assert.equal(table.reason,'surface-is-not-floor')
const mismatch = evaluate({hitResults:[{type:'DETECTED_SURFACE',position:p(1.1,0,0)}]})
assert.equal(mismatch.ready,false)
assert.equal(mismatch.reason,'surface-position-mismatch')
assert.equal(evaluate({hitResults:[{type:'ESTIMATED_SURFACE',position:p(0,0.08,0)}]}).ready,true)
assert.equal(evaluate({hitResults:[null,{type:'DETECTED_SURFACE',position:p(NaN,0,0)}]}).ready,true)
const far = evaluate({planePoint:p(0,0,-20)})
assert.equal(far.ready,false)
assert.equal(far.reason,'floor-out-of-range')
// The chosen surface must be the closest valid hit, never a feature point.
const multiple = evaluate({hitResults:[
  {type:'DETECTED_SURFACE',position:p(1.1,0,0)},
  {type:'ESTIMATED_SURFACE',position:p(.05,0,.02)},
  featurePoint,
]})
assert.equal(multiple.ready,true)
assert.equal(multiple.source,'ESTIMATED_SURFACE')
console.log('Floor placement: 15 safety tests passed, including feature-only fallback, camera height, table conflict, surface mismatch and tracking loss.')
