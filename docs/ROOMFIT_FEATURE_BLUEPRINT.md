# RoomFit AR — Reference-Image Feature Blueprint

Status: requirements reference, not a claim of completed features.
Source: the RoomFit AR infographic supplied in the current conversation (November 2026).
Additional requirement from the user: **realistic, accurate measurement of the physical room**, and **no low-poly furniture in the live camera experience**.

## Goal and scope
RoomFit AR is a **phone-first, markerless AR furniture visualizer**. A user looks at their real physical room using the phone's rear camera, detects a real-world floor, places detailed 3D furniture models, adjusts their layout, then walks around to inspect results from other angles. The goal is to assess fit before buying or moving furniture.

The infographic shows *real room*, *detected floor*, and *virtual sofa visible on screen*. It is not a requirement to render an artificial low-poly room as the main experience.

## Source image: five-step user journey
1. **Scan the room:** open camera and slowly move the phone to identify the floor.
2. **Choose furniture:** select a realistic virtual sofa, chair, table, or cabinet.
3. **Place the model:** tap a detected physical surface to position furniture.
4. **Adjust the layout:** drag to reposition furniture; rotate to try arrangements.
5. **Explore and save:** walk around to view furniture from different angles and save a screenshot.

The source calls this markerless tracking: no QR code, printed marker, or reference image is required. It expects the camera and motion/tracking system to keep virtual objects in place while moving the phone.

## Additional requirement: measurable room dimensions
- Floor footprint measured as a polygon with physical coordinates (meters), not made-up width/depth.
- Measure wall-to-wall distances and distances between chosen reference points when spatial tracking supports them.
- Calculate floor area from a measured polygon after validating its corners and scale.
- Show furniture dimensions from **verified product metadata**. Current sample catalog dimensions are provisional and must not be treated as accurate sizes.
- Allow measurements to be recorded or corrected using an independent tape or laser measure.
- Show provenance for every number: `AR estimated`, `manually verified`, or `not measured`, plus device/session data when available.
- Test accuracy with known physical baselines across representative rooms before making any accuracy claims.
- Do not infer exact dimensions from a plain video feed, single photograph, or a manually resized overlay.

The supplied infographic does **not** specify fully automated wall extraction or whole-room reconstruction. These are enhanced requirements and need separate feasibility testing.

## Interaction requirements
- Phone rear camera is the default input, not a laptop camera.
- Models use detailed textured GLB/glTF assets with realistic materials. No procedural low-poly sofa/chair in the primary experience.
- Furniture can be selected, moved, rotated, removed and captured.
- Model dimensions and rendering scale must be physically consistent in a tracked AR session. Do not allow arbitrary scaling while claiming metric size.
- Warn when tracking is unstable. Do not silently move furniture to a different location.
- Save layout and screenshot. Reopening a room at the same physical poses across sessions requires separate, validated room relocalization; saving JSON alone is insufficient.

## Technical capability boundary
- **Tracked AR mode:** supported Android device + Chrome WebXR/ARCore hit testing. Can use real-world hit-test poses in meters and track placed models *within a session*. Implement measured point pairs/corners as a separate measured-space feature.
- **Camera composition mode:** works with browser camera and 3D rendering on devices without WebXR, but *cannot* confidently infer actual room scale, floor plane or persist accurate physical placement. Must be clearly marked as untracked/manual; never label its dimensions as measured.
- **Unsupported camera or tracking:** explain compatibility instead of showing fake measurements or claiming actual room recognition.
- **Room relocalization:** experimental/unimplemented until a provider has demonstrated cross-session registration on the target device.
- **Lighting and reflective/featureless rooms:** source infographic notes tracking limitations and differences between virtual models and actual products.

## Implementation order
1. Confirm phone model, browser, WebXR and camera capabilities, including a second ARCore-certified test phone if needed.
2. Deliver tracked floor hit-test interaction and physically scaled textured furniture with a test rig on a supported phone.
3. Add **Measure Room**: measure reference segments, then 3+ floor corner points; label accuracy source.
4. Validate room distances, surface-tracking stability, furniture dimensions and model orientation against real measured samples.
5. Add layout adjustments, multi-item scene, capture/save; data schema distinguishes measured, estimated and manually-entered dimensions.
6. Prototype physical room map and repeated-session relocalization (not assumed).
7. Expand the furniture catalog using verified product dimensions, textures, licensed 3D assets.

## Initial acceptance checks
- Users can launch the rear camera directly from a mobile HTTPS site.
- On supported WebXR/ARCore phone, a user can find an actual floor with markerless hit testing.
- A realistic 3D furniture model sits on the floor and stays spatially aligned as the user physically changes viewing angle during the session.
- Selecting two tracked floor points produces a distance in meters from 3D poses; values are explicitly marked AR estimates until validated.
- Four selected room-floor corners generate a measured perimeter/floor area estimate (only if all corners have valid tracked poses).
- Product measurements are verified or clearly marked as unverified; no fictitious measurements.
- Unsupported phones display a clear explanation; untracked overlay is not presented as accurate AR.
- Screenshots capture the actual room plus furniture where the chosen browser/XR API permits capture, with separate handling for XR camera privacy limitations.

## Sources for implementation research
- https://developers.google.com/ar/develop/webxr/requirements
- https://developers.google.com/ar/develop/webxr/arcore-comparison
- https://immersive-web.github.io/hit-test/
- https://developers.google.com/ar/devices

No existing code is assumed to satisfy any untested item in this document.
