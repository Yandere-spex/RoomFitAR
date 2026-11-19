# RoomFit AR v0.8 — Floor-placement validation

**Status:** software-level safeguards and diagnostics. They do **not** prove real-world dimensional accuracy or guarantee surface anchoring on a phone.

## What changed

- In addition to the old center-camera ray intersection with a horizontal `Y=0` plane, RoomFit now samples optional `XR8.XrController.hitTest()` results at the center of the camera. Hit samples are only reused briefly, and become invalid if the phone has moved more than 12 cm or turned more than 0.18 radians.
- Some 8th Wall builds return **only** `FEATURE_POINT` data. These points are **not** confirmed floor planes. The software falls back to the previous ground-plane estimate and labels it `Estimated floor · size not calibrated`. We must not promise that a feature point is a detected physical floor.
- If actual `DETECTED_SURFACE` or `ESTIMATED_SURFACE` results are returned, RoomFit compares the closest one with its ground-plane estimate. It refuses placement if the reported surface height differs by more than 16 cm, or the horizontal intersection differs by more than 35 cm.
- Tracking status `NORMAL` without a valid 3D camera position is insufficient to place furniture.
- Placement also refuses implausible camera heights (under 35 cm or over 280 cm above the estimated plane) and ray intersections farther than 8 m from the camera.
- A **green** target means the current *software checks* pass; **amber** means the placement is refused. These are confidence checks, **not proof of centimeter-level accuracy**.
- The floor check's source, reason, and any disagreement are recorded in the existing tracking log export, without storing camera images.
- The quick **Place → Done → View from other angles** workflow is unchanged, as are existing furniture catalog, rotation and manual editing controls.

## Why this may help

A camera ray can intersect a virtual `Y=0` ground plane even if the user is actually pointing at a real table or the camera pose is unreliable. A properly reported engine surface that disagrees with the calculated plane is a warning; blocking that placement prevents an obvious error. Engine versions without surface hits retain the same estimated plane. The new code cannot repair scale drift or guarantee floor detection.

## Limits of this stage

- The 8th Wall World Tracking engine estimates one dynamically updated horizontal plane, not an ARCore-style multiple-plane room map.
- The optional hit-test API may not provide detected surface types on the user's phone.
- The `scale: 'absolute'` configuration returns SLAM-estimated meters; without a real reference it is **not independently calibrated**.
- The current camera initialization uses a nominal camera height of 1.6 m. This is not a measurement of the user's real phone height.
- Camera viewpoint change still relies on the 8th Wall tracking engine; we have **not** introduced stable real-world spatial anchors.
- These thresholds are provisional engineering guards, not experimentally validated accuracy tolerances.
- If the app displays `Estimated floor`, that means only the virtual ground-plane intersection was available.

## How to test on the phone

1. Open the permanent RoomFit link in the phone's browser; allow the rear camera.
2. Move slowly while aiming at a textured **physical floor** under steady light.
3. Choose the compact wooden stool and wait for a green floor target. The control no longer requires a manual hold gesture.
4. Notice whether the floor status says `Estimated floor`, `Surface agrees with floor`, or reports a rejected location. If the target turns amber, move to a better floor area before trying again.
5. Place the stool, press **Done**, and walk safely to the left, right and farther away. Record any drift, floating, changing proportions, or misplaced floor contact.
6. Compare the apparent stool width (original 3D model about 26.5 cm) to a physical ruler or tape measurement. Repeat at about 0.5, 1, 2 and 3 m viewing distances. This is a qualitative visual comparison, not a direct metric output from this app.
7. Use the existing **Export tracking log** button to preserve `floor-validation` and `camera-pose` records; it does not export camera imagery.
8. Do not use apparent AR scale for purchase or safety decisions until independent measurement has demonstrated a tolerable error over repeated trials.

## Automated tests

```powershell
node scripts/test-floor-placement.mjs
node scripts/smoke-floor-hit-test.mjs
node scripts/smoke-mobile-edit.mjs
node scripts/smoke-quick-place.mjs
node scripts/smoke-furniture-assets.mjs
npm run lint
npm run build
```

The simulated browser tests verify that contradictory surfaces and invalid poses block placement, feature-only SDKs fail safely to an *estimated* ground plane, and mobile object editing still functions. They do **not** simulate actual physical SLAM or prove positional drift error.

## Next accuracy research

Phase 2: independent scale calibration using a measured physical reference or a known-size marker, plus camera-intrinsics verification. Only a confirmed, repeatable on-device reference permits a scale correction. If repeated tests still show high drift, compare with a native ARCore implementation using real surface anchors and depth support.

**Relevant docs:**
- https://8thwall.org/docs/troubleshooting/world-tracking-issues
- https://8thwall.org/docs/api/engine/xrcontroller/configure
- https://8thwall.org/docs/api/engine/xrcontroller/pipelinemodule
- https://8thwall.org/docs/engine/license
