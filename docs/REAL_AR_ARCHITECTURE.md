# RoomFit AR: Real Spatial Placement Architecture and Feasibility Gates

Date: 2026-11-19
Status: architecture / measured verification plan; does NOT claim browser SLAM is integrated.
Source goal: the user's RoomFit AR image (real room + detected floor + realistic 3D sofa) and subsequent accuracy requirements.

## 1. Current prototype, verified limitations
- CameraFurnitureStudio.tsx uses a normal getUserMedia video plus a separate fixed-position Three.js camera.
- Furniture is placed by manual screen offsets and arbitrary apparent-size scaling; 3D geometry is genuine GLB, but **furniture is not a tracked physical world object**.
- WebXRRoom.tsx tries an immersive-ar session with hit-test and displays a floor reticle/estimate only on supported phones.
- The user reports immersive WebXR session configuration unsupported on the target phone.
- Metric measurement math exists and passed geometry tests; **no real phone has validated its spatial poses or accuracy**.
- Existing GLB filenames and catalog dimensions are not manufacturer-verified. createFurnitureAsset() fits model bounds uniformly, but this does not prove actual furniture sizes.

## 2. Spatial-tracking provider candidates
### Option A: WebXR + ARCore (existing tracked path)
- Camera pose, hit testing, anchors and some light/depth capabilities on certified devices.
- Browser/device combination currently rejected on the user's test phone.
- Keep as high-confidence optional engine for certified devices.

### Option B: 8th Wall Distributed Engine Binary with SLAM (first next proof of concept)
- January 2026 binary includes proprietary WebAR SLAM. Open-source framework ALONE does **not** include SLAM.
- Integrates with Three.js and supports browser camera/motion-based world tracking.
- Official starting point: https://github.com/8thwall/threejs-world-effects-example
- Official demo declared at https://8thwall.org/threejs-world-effects-example/
- Installation: https://8thwall.org/docs/engine/overview
- Licensing: https://8thwall.org/docs/engine/license. Binary-only restrictions, copyright attribution and distribution terms apply.
- Documented world tracking maintains ONE dynamically updated horizontal floor plane, can drift on plain/repeating/reflective floors, does not return full room geometry, and does **not** provide VPS/Maps/cross-session localization.
- Before integration into the main app, run official sample on the target phone and confirm live camera, trackingStatus NORMAL and camera pose changes with physical movement.
- Do not claim SLAM solves accurate whole-room size automatically. Scale handling must be tested and independently calibrated.

## 3. Tracking runtime state machine
UNINITIALIZED -> PERMISSION -> INITIALIZING -> TRACKING -> FLOOR_READY -> PLACEMENT
  |              |               |          |                |
  +---- errors / compatibility information ----------- tracking lost => hide or freeze with explicit warning
For a provider, surface: canTrack, cameraPose, projectionMatrix, floorPlane, trackingQuality, onTrackingLost(), stop().

## 4. How actual floor placement works
1. Acquire an XR-managed camera stream and tracking orientation+position (not an independent 2D overlay camera).
2. Retrieve 6DoF camera pose T_world_camera (world coordinates) and calibrated projection/intrinsics K.
3. Detect ground plane (normal approximately upward, point y=0 in the world-tracker's coordinate system); require stable tracking quality before enabling selection.
4. User taps screen pixel (u,v); produce a 3D camera ray d_camera ~ inverse(K) * [u,v,1].
5. Transform to d_world using camera rotation R. Camera center is C.
6. For ground plane n·X+d=0 solve t = -(n·C+d)/(n·d_world). Only accept finite t>0 with non-grazing angle and valid stable plane. Placement point P=C+t*d_world.
7. Model pivot must be centered at footprint on the model's base; add at P with yaw-only orientation. **Real size uses source dimensions in meters; no manual scale slider in tracked mode**.
8. On subsequent frames, update camera pose (not model's screen x/y) so the model remains in the same physical point.
9. If tracking becomes LIMITED or lost, warn; when the floor plane is redefined, prompt to reconfirm placements rather than quietly moving them.

This is algorithm design, not yet implemented. Provider APIs may have direct hit testing that is preferable to manual ray-plane math.

## 5. Authentic furniture pipeline
- Primary model files: GLB 2.0, physically based materials, normal/roughness maps, correct pivot and orientation, baked natural scale and realistic textures.
- Metadata: id, original source+license, attribution, category, verified dimensions and units, bounding box, model path, optimized variants/LODs, optional thumbnails.
- Validate that bounding box actually matches known width/depth/height, preserving correct mesh proportions. Imported demonstration assets do not yet qualify as accurate product representations.
- Choose model without requiring full catalog download; compress textures (e.g. KTX2), use LOD or decimation that preserves visual realism, test frame rate on the user's phone.
- Frontend shows dimensions as 'unverified demo' until official product dimensions have been checked.
- Never apply scene-scale manipulations to a metric-tracked placement without clearly marking the resulting scale as unverified.

## 6. Room measurements and what is/ isn't automatic
- Automatic FLOOR PLANE: feasible with working SLAM/ARCore, subject to tracking.
- Automatic room WIDTH and WALLS: not assured from single-plane SLAM. Requires reliable vertical planes, depth/mesh sensor, or user-guided floor corners.
- User-guided measure mode: select floor corners with tracked ray-plane intersection; calculate segments, area and perimeter. Values remain AR estimates until validated against physical tape/laser readings.
- Scale validation: collect repeated measures of 1 m, 2 m, 3 m reference lengths; compare against tape, estimate systematic scale bias only if linear, track confidence, and record device/session.
- For unsupported phones, offer honest 'Manual room dimensions' using tape-entered width/depth and visual composition. Do not label this as automatic or camera-measured.

## 7. Occlusion / realistic rendering
- Place soft contact shadow underneath the model only after floor plane/pose is known.
- Match ambient illumination via optional light estimation/exposure correction.
- Occlusion (an actual person, table or wall blocking the sofa) requires depth mesh or a validated segmentation pipeline; not inferred just because SLAM works.
- Surface collisions/clearance require floor polygon plus footprint geometry and orientation, not just visually overlapping screen regions.

## 8. Persistence
- Save placed furniture transforms relative to the current mapped origin with trackingProvider, sessionId, modelId, yaw, and source-dimension provenance.
- A new browser session does NOT share the previous origin automatically. 8th Wall's distributed binary excludes VPS/Maps; do not promise automatic room recognition.
- To restore physically, validate a separate relocalization provider, or require explicit reference re-alignment. Otherwise restore only Digital Draft.

## 9. Acceptance gates
G0: Official 8th Wall sample obtains usable 6DoF pose on the actual unsupported-WebXR test phone.
G1: One model remains anchored when the phone moves 1–2 m; record drift under multiple lighting/floor conditions.
G2: Accept hit test on flat, patterned and tile floors; no placement when tracking unavailable.
G3: Imported model scale compared against a physical 1m/2m tape baseline; do not claim centimetre accuracy without evidence.
G4: Furniture remains correctly oriented and grounded when phone moves around it (at least front, side, opposite side).
G5: Multiple furniture objects, selection, rotation and movement work through ground-plane intersection. Motion/performance checked at target device frame rate.
G6: Save a screenshot and expose a persistent digital layout, with physical restoration marked experimental.
G7: Camera-only mode never calls itself metric AR or claims accurate room measurement.

Suggested **initial experimental targets** (not yet demonstrated): less than 10 cm pose drift over a short walk, and less than 5–10% measurement error for a 2 m baseline in good lighting; refine targets after baseline testing.

## 10. Asset candidates
In project:
- modern GlamVelvetSofa (new default, CC BY 4.0, approx 3.15MB GLB)
- SheenWoodLeatherSofa (existing textured ornate sofa, CC BY 4.0/CC0 upstream)
- SheenChair (existing chair, CC0)

Candidates not yet imported:
- Poly Haven Sofa 02 (CC0): https://polyhaven.com/a/sofa_02 ; photographic quality, large texture payload (~24 MB on page).
- Poly Haven Sofa 03 (CC0): https://polyhaven.com/a/sofa_03 ; very dense scan, optimize before using on a phone.
- Poly Haven Sofa 01 (CC0): https://polyhaven.com/a/Sofa_01
- Poly Haven Painted Wooden Sofa (CC0): https://polyhaven.com/a/painted_wooden_sofa
- Sketchfab Modern 3-Seater Sofa, author FredTiger2024, CC BY: https://sketchfab.com/3d-models/modern-3-seater-sofa-high-quality-3d-model-8bfbe2c8bd8d4829b0c133c917e55b0f
- Khronos official model explorer: https://github.khronos.org/glTF-Assets/

Next real product milestone is not a fancier overlay: a separately tested browser SLAM world-tracking session on the user's actual phone, then a provider adapter into RoomFit's 3D furniture placement and measurement components.
