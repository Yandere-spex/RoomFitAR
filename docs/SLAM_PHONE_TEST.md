# RoomFit AR - Phone SLAM Test Protocol

Status: Experimental. This is not a feature-complete room scanner. Do not use estimates for purchasing furniture.

## Why this test matters
The current Camera Studio renders a 3D sofa over a video frame, but it does not track phone movement or hold furniture at a room coordinate. This test uses a separate 8th Wall SLAM engine to evaluate actual world tracking on a phone that could not start WebXR immersive-ar.

## Test 1: Engine and floor
1. Use a phone browser that allows camera access to a secure HTTPS website.
2. Open the RoomFit URL plus `/slam-lab.html` (on the same temporary preview host).
3. Tap **Start 8th Wall SLAM test**. Allow camera and motion permissions when prompted.
4. Stand in a well-lit room and point at a floor with distinct details. Move phone slowly.
5. Observe tracking status. **NORMAL** indicates the engine reports active tracking. **LIMITED** indicates it is not ready for placement.
6. If permission is denied, a loading issue appears, or the engine cannot initialize, record the message. Do not assume it is an ARCore/WebXR failure; this engine has a different compatibility path.

## Test 2: Physical position
1. Only when status is NORMAL, tap **Place sofa on floor** with the center of the camera aimed at a visible floor spot.
2. Move the phone about 0.5 m to the left, then to the right, while keeping that floor spot in view.
3. Check if sofa stays on the *same physical floor spot* as its angle on screen changes.
4. Carefully move about 1 m closer and farther away, monitoring whether size/perspective changes naturally.
5. If the sofa appears glued to the screen, floats, sinks, jumps, or drifts, the test has not passed.
6. Use **Recenter tracking** if the tracking state becomes inconsistent. Recenter clears the sofa position on purpose.

## Test 3: Evidence and metrics
1. Compare one physical 1 m or 2 m reference length using a real tape measure. Do not claim centimeter accuracy without repeated verification.
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
