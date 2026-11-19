# RoomFit AR

**Browser-based furniture placement prototype with tracked AR experimentation**

The **latest phone experience (v0.8)** opens from the published website at https://yandere-spex.github.io/RoomFitAR/ and immediately goes to the **8th Wall SLAM furniture tracker** (`slam-lab.html`). It includes 12 textured furniture models, one-tap estimated floor placement, rotation and repositioning, and **Done → View from other angles**. The older manual Camera Studio remains accessible at https://yandere-spex.github.io/RoomFitAR/?studio=1 as an explicitly untracked fallback. Local Vite development keeps the original React home screen for testing.

SLAM tracking and the estimated world meter scale still require testing against a real device and measuring tape; this is **not yet a guaranteed accurate room-fitting tool**.

## Implemented
- Camera-first home screen (React, TypeScript, Vite)
- **Camera Furniture Studio:** rear-camera feed with a modern textured Glam Velvet Sofa (new default), vintage sofa and chair, touch move, 360° rotation, apparent-size adjustment, multiple items, browser-local visual save, and composite PNG capture. This works without immersive WebXR on camera/WebGL-capable browsers. Previously saved v1 compositions are retained as backup; newly saved compositions use v2.
- Explicit camera preview using `getUserMedia` (real room only; no 3D tracking)
- WebXR `immersive-ar` prototype with required hit testing and optional DOM overlay; session is only usable for our controls when overlay actually enables. Browser/device support required; errors offer the camera furniture fallback.
- Floor reticle, place/rotate/remove controls, session-only virtual furniture
- **Measure Room** in a tracked WebXR session: two-point horizontal distance, 3–12 corner floor-outline perimeter and area, measurement markers and lines, undo/reset, JSON export
- Tape/laser reference comparison for user-verified distances; never silently calibrates or changes AR pose scale
- Two demo glTF/GLB furniture models and license attribution in `public/models/ATTRIBUTION.md`
- Digital Draft editor: room-relative position, rotation, overlapping-object checks, browser storage, JSON export and PNG screenshot
- Device compatibility check, camera permission/error handling and mobile-responsive UI
- Automated mobile smoke test in `scripts/smoke.mjs` using synthetic camera (not a physical-device AR test)

## Not implemented
- Cross-session visual room recognition, map construction, reliable physical furniture restoration
- Automatic wall detection or fully automatic room dimensions; the user must aim at and record floor points
- Certified or independently validated metric accuracy on real devices
- Production photorealistic furniture catalog with verified measurements and collision meshes
- Full room geometry scanning, occlusion, lighting estimation, native Android ARCore support
- Server-side accounts, PostgreSQL storage, spatial map provider integration, production PWA install/updates

**Important:** Do not assume saved Digital Draft coordinates are physical spatial anchors. WebXR virtual furniture currently exists only within its active AR session.

## Experimental browser SLAM test (separate from the camera filter)

The latest tracked AR workflow is the **default entry on GitHub Pages** at `/RoomFitAR/` (redirects to `/RoomFitAR/slam-lab.html`), with the old manual Camera Studio available only at `/RoomFitAR/?studio=1`. The 8th Wall Distributed Engine Binary is loaded from its official public CDN under its separate binary license. This is still a tracking experiment, **not independently validated physical room measurement**. See `docs/SLAM_TEST_PROTOCOL.md` for acceptance tests. New development continues on `main`.

## v0.9 — Simple mobile furniture preview interface

The public RoomFit link opens a new welcome experience with familiar **Start Camera**, **Choose Furniture**, **Place Furniture**, **Done · View My Room**, and **Adjust Furniture** actions. The 12-model catalog (including the Filipino furniture group) shows picture cards, category tabs and dimensions in centimeters. Placement, rotation, touch movement, adding another piece, undo, removal and Done / camera walkaround still use the v0.8 tracking code.

The primary camera screen hides technical terms, pose diagnostics, meters of camera travel and developer controls. **Help** explains the three-step workflow and warns that furniture size is an estimate. **Help & Settings** inside the furniture panel keeps the existing scan reset, exportable troubleshooting logs, floor-check information, license link and manual camera fallback. These functions were moved, not deleted.

The layout is optimized for small Android phone viewports (320, 360 and 390 px), respects safe-area insets and scrolls panels internally. Controls remain keyboard-focusable and use labels in addition to any status colors. This is a usability update; the physical absolute-scale accuracy is **not** independently verified. Refer to `docs/ACCURACY_PHASE1.md` for floor-validation notes and run `node scripts/smoke-mobile-edit.mjs` before shipping UI changes.

## Floor-placement validation (v0.8)

The latest tracked AR screen compares the original center-camera ground-plane ray with optional 8th Wall engine hit-test results. It **rejects** conflicting detected surfaces, implausible camera heights, uninitialized tracking, and missing camera positions. When the engine provides only feature points, RoomFit continues with an explicitly **estimated** floor plane rather than pretending that a physical surface was recognized.

A green reticle means the current software checks passed, not that physical meter accuracy is verified. The `Floor` readout and JSON tracking log explain whether the candidate came from a ground-plane estimate or a consistent engine surface. Existing one-tap placement, 12 furniture models, rotation, **Done → View**, and mobile editing remain.

Read [the Phase 1 accuracy notes](docs/ACCURACY_PHASE1.md), and test against a real measured reference on the phone before making furniture fit claims.

## Twelve-model spatial testing collection

The SLAM experiment at `/slam-lab.html` now has 12 textured 3D furniture models, with a **small wooden stool as its default**. The collection includes the Filipino Gallinera Chair and Gallinera Table from Poly Haven, two CC0 woven furniture models from Innerscene, three existing showcase assets, and five other Poly Haven pieces. Source-model dimensions are approximate, not certified retail specifications. The loaded models' actual rendered dimensions are displayed when selected.

Users can filter categories, switch models, place up to eight objects at tracked floor targets, rotate or remove the last object, and export the tracking log. **Accurate world scale and physical floor anchoring are still device-test requirements.** See `docs/SLAM_TEST_PROTOCOL.md` and `public/models/ATTRIBUTION.md`.

Reproduce Poly Haven source assets when needed on a Windows workstation:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/fetch-polyhaven-assets.ps1
node scripts/pack-polyhaven-glb.mjs
```
The published application only requires the packed `public/models/polyhaven/*.glb` files; it does not require the downloaded loose textures.

## Fast tracked AR placement (v0.5)

The experimental browser SLAM screen now favors one-handed use:
1. Select an item from the **12-piece catalog**, including two genuine Filipino Gallinera references (CC0) and two Filipino-inspired CC0 woven/rattan styles.
2. Aim the phone at the estimated floor. When tracking is **NORMAL** and a green floor target is visible, **tap once** to place the first furniture item. No additional half-second hold is required.
3. A compact panel appears. After the object looks right, tap **Done · View from other angles** to lock editing and hide the placement target.
4. Walk around or step farther back to inspect it. Furniture stays at its saved 3D world position with unchanged model scale. Camera perspective naturally makes distant furniture appear smaller; there is **no pinch-to-resize or fake zoom**.
5. Tap **Edit placement** to restore rotation and positioning. To add more furniture use the explicit **Place furniture** button; blank camera taps cannot repeatedly duplicate objects.
6. The most recently selected catalog model is remembered locally, and textured GLBs are loaded on demand.

The tracker estimates **one horizontal ground plane**; floor detection and meter scale depend on SLAM conditions. Absolute-scale mode estimates meters, but real-world sizes and placement drift still require comparison with a tape or laser measure. These changes improve the workflow; they **do not certify physical measurement accuracy**.

Tests:
```powershell
node scripts/smoke-mobile-edit.mjs
node scripts/smoke-quick-place.mjs
node scripts/smoke-furniture-assets.mjs
```
The quick placement test uses a mock camera pose, **not** the actual device's SLAM tracking. See `docs/SLAM_PHONE_TEST.md` for real phone checks.


## v0.6: mobile furniture editing (tracked AR experiment)

- The 12-model catalog remains accessible from the **Change furniture** panel.
- In compact view, **Rotate -15°**, **Rotate +15°**, **Move selected to target**, **Remove selected**, **Undo last**, and **Select next** are directly available.
- Tap a previously placed 3D model to select it, or press **Select next** to cycle through multiple placed models.
- Drag a selected model directly in the camera view to edit its horizontal position on the estimated ground plane. This interaction requires NORMAL SLAM tracking and a valid floor intersection; no arbitrary 3D scale or height adjustments are made.
- To reposition, aim at the green floor target and tap **Move selected to target**; a holding delay is no longer required when tracking reports NORMAL.
- An aqua outline highlights the selected furniture floor position.
- Both compact and full editing controls are available on narrow mobile viewports; large panels scroll internally so buttons remain reachable while the camera is visible.
- Both camera placement and existing objects remain limited by the accuracy and drift of the device's visual tracking. The geometry and UI can be verified by automated tests; **correct real-world physical location and absolute scale still need on-device testing**.

Mobile test: `node scripts/smoke-mobile-edit.mjs` simulates a world-tracked camera and checks rotation, drag, reposition, removal and accessibility at 320×568, 360×640 and 390×844 viewport sizes.

## Desktop development

```bat
cd C:\Users\NASHER1596\Documents\RoomFit-AR
npm install
npm run dev
```

Then open `http://127.0.0.1:5173/` on the same computer.

Quality checks:

```bat
npm run lint
npm run build
node scripts\smoke.mjs
node scripts\test-measurements.mjs
node scripts\smoke-studio.mjs
node scripts\smoke-ar-entry.mjs
```

The smoke script expects Vite on port 5173 and Chrome installed at its standard Windows path.

## Testing on Android Chrome (phone-first)

**Normal phone users should use a public HTTPS URL. They should not connect by USB or rely on the laptop camera.** The phone's own rear camera is the input.

For the current test, a temporary Cloudflare Quick Tunnel exposes the **built production preview** (not Vite's source-serving development server) through a random HTTPS `trycloudflare.com` URL. The link changes between tunnel sessions and stops working when the PC or tunnel stops. Anyone with the URL can open the preview; do not enter private room information. Cloudflare documents this as a development-only tool: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/

When recreating the test, build with `npm run build`, serve `dist` on loopback port 4173, tunnel the preview via `cloudflared tunnel --url http://127.0.0.1:4173`, and allow **only the exact assigned hostname** in the preview server's host configuration. Do not use `allowedHosts: true` on Vite.

On a phone:
1. Open the HTTPS link in Android Chrome (Wi-Fi or mobile data).
2. Tap **Open Furniture Camera** to grant permission and see the existing textured sofa/chair on the live rear-camera view. Move/rotate, add models, visually resize, save, or capture. This mode does not detect floor or make accurate measurements. **Preview real camera** remains a separate video-only tool.
3. Open **Device compatibility**. If immersive WebXR is supported, choose **Tracked AR / Measure**. For measurement, select **Measure room**, choose **Two-point distance** or **Floor outline**, aim at each physical floor point and tap **Record tracked floor point**. A floor outline needs at least 3 valid corners; estimates are shown in meters / m². Use **Undo**, **Clear**, or **Export** as needed. For furniture, switch to **Furniture**, scan a clear floor and place one of the demo models.
4. If immersive AR is unsupported or Chrome reports **The specified session configuration is not supported**, use **Open Furniture Camera** instead. Real-world anchoring, floor measurement and walking around anchored furniture will remain unavailable. Chrome in-app webviews may have stricter camera/WebXR limitations; use regular Android Chrome where possible.
5. Test hit-test reliability, phone performance and orientation, and behavior when the session ends.

**Production delivery:** Deploy the static `dist` build to a stable HTTPS hosting service (e.g., Cloudflare Pages, Netlify, or Vercel), then supply a permanent domain. Users should never need the developer's laptop to stay online.

USB port forwarding is only a developer debugging alternative. Plain HTTP LAN URLs generally are not secure contexts, so they cannot be relied on for camera access or WebXR.

WebXR source: https://developers.google.com/ar/develop/webxr/requirements

## Architecture

- `src/components/CameraHome.tsx` -- main real camera and AR entry point
- `src/ar/WebXRRoom.tsx` -- immersive AR hit testing and session-only placement
- `src/ar/furnitureModels.ts` -- licensed GLB loader and demo sizing
- `docs/REAL_AR_ARCHITECTURE.md` -- real floor-tracking, browser SLAM feasibility experiment, pose and ray-plane placement algorithm, measurement accuracy gates, and realistic-model sources
- `src/ar/SpatialProvider.ts` -- provider interface for future cross-session localization
- `src/ar/capabilities.ts` -- browser capability detection
- `src/components/RoomScene.tsx` -- separate 3D Digital Draft editor
- `src/domain` -- furniture catalog, sample room layout, validation, local save and export

## Prototype limitations

The included GLB models are demonstration assets and were uniformly fitted into approximate catalog dimensions. The listed dimensions are NOT verified real-world dimensions from manufacturers. This prototype has not been tested on a physical Android ARCore device. Camera preview shows real video but must never be described as tracked AR.

A real device test and localization proof of concept must pass before claiming automatic physical layout restoration.

**Measurement status:** Computational geometry is unit tested in `scripts/test-measurements.mjs`. WebXR spatial tracking has **not** been tested on the user's actual phone. All numerical results are labelled **AR estimates**, and should be compared with tape/laser measurements before real-world use.

**No low-poly rooms in tracked AR:** The AR mode uses the phone's physical environment and licensed textured GLB demo furniture. The separate Digital Draft remains an optional non-AR preview.

## Experimental 8th Wall SLAM floor-tracking test

The separate `/slam-lab.html` entry point is a **work-in-progress phone experiment**, not an approved replacement for the working camera studio. The engine binary is loaded from 8th Wall's official CDN when the experiment page opens. The binary is not bundled into this Git repository.

Test on a real Android phone with HTTPS: open `https://<your-host>/slam-lab.html`, tap **Start 8th Wall SLAM test**, grant camera permission, and aim at a well-lit floor with visible texture. When tracking reads **NORMAL**, choose **Place selected furniture**, then slowly move left/right and record whether it remains stable. You can export a JSON log of tracking status, camera poses and manual placement coordinates. **The log does not include camera images.**

The tracking experiment assumes a single estimated horizontal ground plane and uses approximate source-model sizes for the furniture catalog. It does not automatically map walls, reconstruct the complete room, guarantee metric scale or restore furniture across browser sessions.

Build the two Vite HTML entry points with `npm run build`. Use `node scripts/smoke-slam-lab.mjs` for a desktop mocked-engine smoke test; it does NOT prove actual tracking. See `docs/REAL_AR_ARCHITECTURE.md` and the official source https://github.com/8thwall/threejs-world-effects-example.
