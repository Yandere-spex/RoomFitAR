# RoomFit AR

**Camera-first browser-based augmented reality furniture placement prototype**

The application opens into the camera-first flow. On Android phones that support immersive WebXR with ARCore and hit testing, users can start a live immersive AR session, find a horizontal surface, and place a textured demo sofa or chair in the real room. The separate **Digital Draft** mode remains available as a 3D editor.

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

A new **SLAM test page** is available at `/slam-lab.html`, linked from the camera-first home screen. It uses the 8th Wall Distributed Engine Binary (loaded from its public CDN under its separate binary license), a textured sofa, an estimated ground plane and world-tracking status. This is a proof of concept: **no physical device tracking, floor anchoring or absolute-scale accuracy has been confirmed yet**. See `docs/SLAM_TEST_PROTOCOL.md` for the procedure and acceptance gates. Working Camera Furniture Studio remains unchanged at the home page. New development continues on `main`.

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

The separate \`/slam-lab.html\` entry point is a **work-in-progress phone experiment**, not an approved replacement for the working camera studio. The engine binary is loaded from 8th Wall's official CDN when the experiment page opens. The binary is not bundled into this Git repository.

Test on a real Android phone with HTTPS: open \`https://<your-host>/slam-lab.html\`, tap **Start 8th Wall SLAM test**, grant camera permission, and aim at a well-lit floor with visible texture. When tracking reads **NORMAL**, choose **Place sofa on floor**, then slowly move left/right and record whether it remains stable. You can export a JSON log of tracking status, camera poses and manual placement coordinates. **The log does not include camera images.**

The tracked demonstration assumes a single estimated horizontal ground plane and uses provisional sofa dimensions. It does not automatically map walls, reconstruct the complete room, guarantee metric scale or restore furniture across browser sessions.

Build the two Vite HTML entry points with \`npm run build\`. Use \`node scripts/smoke-slam-lab.mjs\` for a desktop mocked-engine smoke test; it does NOT prove actual tracking. See \`docs/REAL_AR_ARCHITECTURE.md\` and the official source https://github.com/8thwall/threejs-world-effects-example.
