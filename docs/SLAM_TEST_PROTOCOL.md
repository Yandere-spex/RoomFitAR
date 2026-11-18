# RoomFit SLAM Real-Device Experiment (8th Wall)

Status: experimental code, not proof of actual physical placement or accurate measurement.

## Page
Open \`https://<your-HTTPS-host>/slam-lab.html\` on the phone's main Chrome browser.
The working Camera Furniture Studio remains available at \`/\`.

## Requirements
- Phone with rear camera, good WebGL performance, browser camera permissions and working 8th Wall Distributed Engine support.
- HTTPS address (or localhost for local desktop browser experiments).
- Good lighting and textured floor; avoid shiny featureless floors in first test.
- Internet access to download external 8th Wall engine and auxiliary packages. Binary-only engine is loaded from the published CDN and is **not committed to this repository**.
- The engine is not the MIT-only 8th Wall open-source framework; the SLAM binary has a distinct license: https://8thwall.org/docs/engine/license

## Experiment steps
1. Open page, read the experimental accuracy warning and select **Start 8th Wall SLAM test**.
2. Accept rear-camera permission and move the phone slowly, keeping it upright/tilted toward the floor.
3. Move the phone forward and back for estimated metric scale initialization. Wait for status **Tracking NORMAL**. If no status, note errors and do not claim tracking.
4. Point the camera center at a visible patch of floor, press **Place sofa on floor**, and inspect the sofa.
5. Move left/right by 1–2 m and around the sofa, checking whether it remains visually fixed to the physical point and changes perspective correctly.
6. Record if the sofa drifts, rotates, resizes, or floats. Observe direct contact shadow and whether floor alignment survives camera movement.
7. Choose **Export tracking log** and preserve the JSON in a local place. The log collects session events, camera movement coordinates, status and user agent; no camera frames or room photographs are recorded.
8. Test in another room with different lighting, floor texture and distance. Compare a known 1–2 m dimension against AR scale and report results.

## Pass/fail gates
- G0: SLAM engine loads, receives camera permission, and emits pose & tracking NORMAL on the phone.
- G1: A sofa appears on estimated floor and remains world-anchored as camera moves.
- G2: A floor point remains stable during viewpoint changes with tolerable drift.
- G3: Evaluate distance scale vs. a real ruler/tape. No claim of accuracy before measurement.
- G4: Stable frame rate, camera permissions and heat/memory behavior on device.
- G5: Track loss is reported and placement disabled when no reliable pose is available.

## Caveats
- It estimates ONE horizontal plane; walls, obstacles and complete room geometry are not automatically reconstructed.
- It cannot restore a physical location across fresh sessions without separate localization technology.
- Sofa demo dimensions are unverified product metadata and should not guide purchases.
- No real-device tracking has yet been confirmed. A browser-mocked smoke test verifies only the page UI and engine-call wiring.

## Testing commands
\`\`\`powershell
npm run lint
npm run build
node scripts/smoke-slam-lab.mjs
node scripts/smoke-studio.mjs
node scripts/test-measurements.mjs
\`\`\`
