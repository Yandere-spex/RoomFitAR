import assert from 'node:assert/strict'
import { createFloorAimTracker } from '../src/labs/floorAimTracker.js'
const P = (x, z) => ({ x, y: 0, z })
const a = createFloorAimTracker()
for (const t of [0, 100, 200, 300]) {
  assert.equal(a.update(P(1, 2), t, true), null)
}
const ready = a.update(P(1, 2), 400, true)
assert.ok(ready && Math.abs(ready.x - 1) < .001 && Math.abs(ready.z - 2) < .001)
assert.equal(a.update(P(1, 2), 500, false), null, 'tracking loss clears prior target')
assert.equal(a.update(P(2, 3), 600, true), null, 'new floor position needs fresh hold')
const b = createFloorAimTracker()
for (const t of [0, 100, 200, 300]) b.update(P(1, 2), t, true)
assert.equal(b.update(P(1.8, 2), 400, true), null, 'rapid aim change rejected')
for (const t of [500, 600, 700, 800]) b.update(P(1.8, 2), t, true)
assert.ok(b.update(P(1.8, 2), 900, true), 'new stable point accepted after hold')
assert.equal(b.update(P(Infinity, 1), 1000, true), null, 'invalid hit rejected')
assert.equal(b.update(P(0, 0), 1100, true), null)
assert.equal(b.update(P(0, 0), 1400, true), null, 'stale frame gap resets hold')
const jitter = createFloorAimTracker()
for (const [i, t] of [0, 100, 200, 300, 400].entries()) {
  const p = P(1 + (i%2 ? .015 : -.015), 1 + (i%3 ? .01 : -.01))
  const result = jitter.update(p, t, true)
  if (i === 4) assert.ok(result, 'small floor jitter tolerated')
}
console.log('RoomFit floor target: stable hold, motion reset, tracking loss, stale frame, invalid hit and jitter tests passed.')
