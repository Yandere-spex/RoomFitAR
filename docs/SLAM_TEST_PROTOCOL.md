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
4. With the small wooden stool selected, aim at the green floor target and tap **Place selected furniture**. Its authored model width is about 27 cm; start with this small model instead of a full-size sofa.
5. Move left/right by a safe distance and around the stool, checking whether it remains visually fixed to the physical point and changes perspective correctly.
6. Choose from the eight-item catalog (wooden stool, monobloc chair, accent chair, leather lounge chair, small wooden table, round coffee table, velvet sofa, vintage sofa). Place another model, rotate or remove the last placement. Note any drift, incorrect perspective, scale or floor contact.
7. Choose **Export tracking log** and preserve the JSON in a local place. The log collects session events, camera movement coordinates, status and user agent; no camera frames or room photographs are recorded.
8. Test in another room with different lighting, floor texture and distance. Compare a known 1–2 m dimension against AR scale and report results.

## Pass/fail gates
- G0: SLAM engine loads, receives camera permission, and emits pose & tracking NORMAL on the phone.
- G1: A small stool appears on the estimated floor and remains world-anchored as the camera moves; then repeat using a chair and table.
- G2: A floor point remains stable during viewpoint changes with tolerable drift.
- G3: Evaluate distance scale vs. a real ruler/tape. No claim of accuracy before measurement.
- G4: Stable frame rate, camera permissions and heat/memory behavior on device.
- G5: Track loss is reported and placement disabled when no reliable pose is available.

## Caveats
- It estimates ONE horizontal plane; walls, obstacles and complete room geometry are not automatically reconstructed.
- It cannot restore a physical location across fresh sessions without separate localization technology.
- Poly Haven assets use their source-model metric sizes (approximate, not product-certified); the three showcase models have provisional scale. A 1:1 physical appearance requires separate, validated world-scale tracking.
- No real-device tracking has yet been confirmed. A browser-mocked smoke test verifies only the page UI and engine-call wiring.

## Testing commands
\`\`\`powershell
npm run lint
npm run build
node scripts/smoke-slam-lab.mjs
node scripts/smoke-furniture-assets.mjs
node scripts/smoke-studio.mjs
node scripts/test-measurements.mjs
\`\`\`
