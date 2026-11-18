# RoomFit AR - Phone SLAM Test Protocol

Status: Experimental. This is not a feature-complete room scanner. Do not use estimates for purchasing furniture.

## Why this test matters
The current Camera Studio renders a 3D sofa over a video frame, but it does not track phone movement or hold furniture at a room coordinate. This test uses a separate 8th Wall SLAM engine with eight physically sized demonstration 3D models to evaluate world tracking on a phone that could not start WebXR immersive-ar.

## Test 1: Engine and floor
1. Use a phone browser that allows camera access to a secure HTTPS website.
2. Open the RoomFit URL plus `/slam-lab.html` (on the same temporary preview host).
3. Tap **Start 8th Wall SLAM test**. Allow camera and motion permissions when prompted.
4. Stand in a well-lit room and point at a floor with distinct details. Move phone slowly.
5. Observe tracking status. **NORMAL** indicates the engine reports active tracking. **LIMITED** indicates it is not ready for placement.
6. If permission is denied, a loading issue appears, or the engine cannot initialize, record the message. Do not assume it is an ARCore/WebXR failure; this engine has a different compatibility path.
7. The small wooden stool should be preselected as the first test item; wait until the model status reads **Ready**.

## Test 2: Physical position
1. Only when status is **NORMAL** and the green floor target is visible, select **Compact Wooden Stool** (approximately 27 cm wide), then tap **Place selected furniture**. This is an easier first test than the full-size sofa.
2. Move the phone about 0.5 m to the left, then to the right, while keeping that floor spot in view.
3. Check if the stool stays on the *same physical floor spot* as its angle on screen changes.
4. Carefully move about 1 m closer and farther away, monitoring whether size/perspective changes naturally.
5. If the furniture appears glued to the screen, floats, sinks, jumps, or drifts, the test has not passed.
6. Test a plastic chair, small table, lounge chair, or sofa using the horizontally scrolling furniture catalog. Filter by category if desired. The **Rotate -15°**, **Rotate +15°**, and **Remove last** controls operate on the most recently placed object. Up to eight objects can be placed in the current session.
7. Use **Recenter tracking** if the tracking state becomes inconsistent. Recenter clears all placements on purpose.

## Test 3: Evidence and metrics
1. Compare a physical reference with a real tape measure. Start by verifying the approximately 27 cm width of the default model against an actual 27 cm length and evaluate whether the *visual* AR size matches. The object's model dimensions are sourced from Poly Haven, but the phone's absolute world scale is not independently calibrated. Do not claim centimeter accuracy without repeated verification.
2. Record device model, browser/version, floor texture, lighting and tracking outcome.
3. Tap **Export tracking log** and save the JSON. It logs statuses and estimated camera coordinates, not photographs.
4. Note whether the camera status was NORMAL or LIMITED during the placement.
5. Try a second lighting condition and compare stability.

## Gate for integrating into RoomFit
- Camera feed opens on target phone.
- 6DoF camera position changes when device moves.
- Engine reaches NORMAL for a textured floor.
- Textured sofa remains at one world-space point while phone moves.
- The interface detects and reports problems rather than claiming accurate tracking.
- Multiple trials show tolerable, documented drift.
- Independent tape/laser tests validate scale before exposing metric measurements or fit assertions.

## Safety and privacy
- Do not test while walking near stairs or obstacles. Maintain awareness of surroundings.
- The test should not send room imagery to RoomFit's own backend; verify third-party engine data processing and permissions separately before a production release.
- Demo furniture dimensions are provisional; the trial is not proof that a sofa will fit the room.
- Session-only SLAM is not cross-session physical room relocalization.

## Related source
- https://github.com/8thwall/threejs-world-effects-example
- https://8thwall.org/docs/api/engine/xrcontroller/pipelinemodule
- https://8thwall.org/docs/engine/license

## Fast placement check (new)
- Choose **Woven Papasan Chair** or **Woven Lounge Rocker** in the **Filipino styles** filter to try the new CC0 woven designs. These are *Filipino-inspired aesthetics*, not proven Philippine-origin furniture; source-model sizes are displayed.
- When floor-tracking status is NORMAL, the target should be **amber** during movement and **green** after the phone aims steadily at a fixed floor spot for about 0.4 s. Green does NOT guarantee absolute metric accuracy.
- Tap **Place selected furniture** or an unoccupied camera area while it is green; a scanning swipe should never place an object.
- After placement, confirm the **compact Place / Undo / Change furniture bar** appears so the real room is easier to see.
- Tap **Undo last** and **Change furniture** to verify you can recover without reopening the camera.
- Compare an actual known-length object in the room with the visual furniture size. If there is drift, wrong scale or objects floating, record the problem before making any purchase decision.


- **Filipino heritage source examples:** Select Filipino Gallinera Chair or Gallinera Table under **Filipino styles**. Both models are explicit Philippine furniture references from Poly Haven CC0; approximate source-model dimensions are available. Compare on-screen apparent scale with a physical reference before claiming real-world size.

## Mobile object-editing test (v0.6)

Once a piece is placed, the compact bottom toolbar must show **Rotate -15°**, **Rotate +15°**, **Move selected to target**, **Remove selected**, and **Undo last**. Use **Change furniture** to open the complete model catalog and advanced controls. Buttons inside either panel should be scrollable and accessible on a small phone.

1. Place one wooden stool on a floor target after tracking reports NORMAL.
2. Tap the stool to select it; an aqua floor selection circle should indicate the selected object.
3. Tap **Rotate +15°**, then **Rotate -15°**; only the yaw/orientation should change.
4. Press and drag the stool sideways on the camera view. It should move on the same tracked floor, without changing vertical size or stretching geometry.
5. Aim at a different floor position, hold until the target turns green, and tap **Move selected to target**. Confirm that only the selected object moves.
6. Add a second piece; use **Select next** to cycle between objects. Test **Remove selected** and **Undo last** separately.
7. If tracking is lost, moving to a new point must be disabled. **No physical dimension or metric accuracy is certified by these UI tests.**
