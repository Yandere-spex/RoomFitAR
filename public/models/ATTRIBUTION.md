# RoomFit AR - Prototype Furniture Assets

These demonstration assets are for the WebXR furniture-placement prototype. The names and dimensions in the RoomFit sample catalog are **illustrative** and should not be treated as verified manufacturer measurements.

## accent-chair.glb
- Original: **Sheen Chair** - Khronos glTF Sample Assets
- Author: Eric Chadwick / Wayfair LLC
- Source: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenChair
- License: Creative Commons Zero 1.0 Universal (CC0)
- Download: https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SheenChair/glTF-Binary/SheenChair.glb

## sofa-linen.glb
- Original: **Sheen Wood Leather Sofa** - Khronos glTF Sample Assets
- Original work: Fran Calvente (CC0); improvements: Eric Chadwick, Darmstadt Graphics Group GmbH (CC BY 4.0)
- Source: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenWoodLeatherSofa
- License: Creative Commons Attribution 4.0 International (CC BY 4.0), with upstream credits as shown on original model page
- License: https://creativecommons.org/licenses/by/4.0/
- Download: https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/SheenWoodLeatherSofa/glTF-Binary/SheenWoodLeatherSofa.glb
- Change: loaded into RoomFit AR and uniformly scaled to fit provisional catalog bounds. No other edits made to GLB bytes.

Model materials may require features supported by modern Three.js WebGLRenderer. License and attribution details must be maintained in any distribution of the models.

## velvet-sofa.glb (new default)
- Original: **Glam Velvet Sofa** - Khronos glTF Sample Assets
- Model by Eric Chadwick / Wayfair LLC
- Source: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/GlamVelvetSofa
- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- License URL: https://creativecommons.org/licenses/by/4.0/
- Download: https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/GlamVelvetSofa/glTF-Binary/GlamVelvetSofa.glb
- Change: unmodified GLB bytes; displayed in RoomFit using uniform preview scaling into **provisional** sample dimensions. Imported default material is used; bundled alternative fabric variants are not yet exposed as separate color choices.
- In RoomFit, catalog ID is `velvet-sofa`. Sample dimensions are not measured, validated or certified against a particular product configuration.

## Poly Haven furniture collection (CC0, 1K textures, packed glTF Binary)

The following public-domain-equivalent **CC0** assets were retrieved from the [Poly Haven library](https://polyhaven.com/models/furniture) using its official [public API](https://polyhaven.com/our-api). Their original model data and textures were repackaged *losslessly* into single GLB files by `scripts/pack-polyhaven-glb.mjs`. No mesh simplification or material retouching was performed; texture resolution is the original published 1K variant.

Poly Haven API dimensions are published in **millimeters** as (Blender X, Y, Z); RoomFit renders them as (width=X, depth=Y, height=Z) in meters. **These are model-creator approximate dimensions, not certified product specifications.** The engine's real-world meter scale must be independently checked with a tape measure.

| RoomFit name | Original model / creator | Model dimensions, W × D × H | Repo asset |
|---|---|---|---|
| Compact Wooden Stool | [Wooden Stool 02](https://polyhaven.com/a/wooden_stool_02), Kuutti Siitonen | 0.265 × 0.183 × 0.182 m | `polyhaven/wooden_stool_02.glb` |
| Monobloc Chair | [Plastic Monobloc Chair 01](https://polyhaven.com/a/plastic_monobloc_chair_01), Kuutti Siitonen | 0.642 × 0.628 × 0.880 m | `polyhaven/plastic_monobloc_chair_01.glb` |
| Leather Lounge Chair | [Mid Century Lounge Chair](https://polyhaven.com/a/mid_century_lounge_chair), Kuutti Siitonen | 1.009 × 1.190 × 1.169 m | `polyhaven/mid_century_lounge_chair.glb` |
| Small Wooden Table | [Small Wooden Table 01](https://polyhaven.com/a/small_wooden_table_01), Ulan Cabanilla | 0.916 × 0.440 × 0.533 m | `polyhaven/small_wooden_table_01.glb` |
| Round Coffee Table | [Coffee Table Round 01](https://polyhaven.com/a/coffee_table_round_01), Ulan Cabanilla | 1.301 × 1.301 × 0.491 m | `polyhaven/coffee_table_round_01.glb` |

Poly Haven license: https://polyhaven.com/license (CC0). API source: https://api.polyhaven.com/info/<asset_id> and https://api.polyhaven.com/files/<asset_id>. Author credit is voluntary under CC0 and retained here for provenance.

The existing **Sheen Chair**, **Glam Velvet Sofa**, and **Sheen Wood Leather Sofa** are third-party showcase demos with provisional physical sizing and should not be presented as exact purchasable products. The app shows their actual rendered bounding-box dimensions when loaded.

## Innerscene Free Parts Library — Filipino-inspired woven furnishings (CC0)

These are **generic woven/rattan-style furniture assets**, not representations of specific Philippine manufacturers or historical Filipino designs. They are included as a *Filipino-inspired aesthetic* and attributed to their original creator. They are **not manufacturer-certified dimensions**. The models are kept in their author-created meter scale, without automatic enlargement/shrinking.

| RoomFit catalog name | Original CC0 model | Authored size (W × D × H) | Download |
|---|---|---|---|
| Woven Papasan Chair | [Halo - Papasan Lounge Chair](https://www.innerscene.com/tools/library/3d-parts/halo-papasan-lounge-chair-85f105b2) | 1.18 × 1.18 × 0.71 m | https://www.innerscene.com/api/library/halo-papasan-lounge-chair-85f105b2/download |
| Woven Lounge Rocker | [Weave - Woven Lounge Rocker](https://www.innerscene.com/tools/library/3d-parts/weave-woven-lounge-rocker-fde80661) | 0.78 × 1.14 × 1.01 m | https://www.innerscene.com/api/library/weave-woven-lounge-rocker-fde80661/download |

- Original creator and source: Innerscene Free Parts Library, original CC0 models; source pages explicitly license copying, modifying and redistributing.
- Original binary GLB bytes are bundled without geometry/material modification.
- Downloaded bytes verified by repeating official downloads and comparing SHA256:
  - `papasan-chair.glb`: `577214b4d279d8726fc44809e84185a1f87f5810b8b74d614d192d05e7f357b2`
  - `woven-lounge-rocker.glb`: `94d91bddf8a4b2f99d1ea89740adf35c0f244360907c1d6f073ffe4e3111b493`
- The source pages' internal `fileHash` metadata does **not** equal the SHA256 of their downloaded GLB responses. These checksums are recorded from the reproducible downloads, not asserted to match that separate metadata field.
- Original GLB mesh dimensions were checked in a browser, with deviations under 1 cm of the source-stated approximate model sizes.
- The custom thumbnails are renders of these CC0 models generated by our `scripts/render-furniture-thumbs.mjs`, not copied from a furniture brand's catalog.

Potential future authentic Filipino pieces to investigate separately:
- [Solihiya Rattan Lounge Chair by A. Villamor A. — 3D Warehouse](https://3dwarehouse.sketchup.com/model/38e7d1ac-ab30-48a8-8237-e595ff6852db/SOLIHIYA-RATTAN-LOUNGE-CHAIR) (free to download, but **not** CC0 and the current 3D Warehouse general license restricts aggregating models for redistribution; therefore not embedded)
- [Rattan Dining Chair by Taufiq K — Sketchfab](https://sketchfab.com/3d-models/rattan-dining-chair-1f028b3d5f8b497d8c7e20149e6ef209) (CC BY, low detail, needs confirmed metric dimensions before importing)
- [Woven Rattan Sofa by italocris — Sketchfab](https://sketchfab.com/3d-models/woven-rattan-sofa-real-time-optimized-3d-asset-3b209fb52e104bd1b1371c627fb6ba26) (CC BY 4.0, 18 MB, requires size verification and mobile optimization first).

## Genuine Filipino heritage furniture — Poly Haven (CC0)

These two models are explicitly identified as **antique Filipino** in their Poly Haven asset descriptions and tagged for the Philippines, unlike the generic woven Papasan and rocker (Filipino-inspired rather than country-of-origin claims).

| Catalog name | CC0 source model | Artist | Original mesh dimensions W×D×H | Bundled GLB |
|---|---|---|---|---|
| Filipino Gallinera Chair | [Gallinera Chair](https://polyhaven.com/a/gallinera_chair) | Ulan Cabanilla | ~0.581×0.604×1.034 m | \`polyhaven/gallinera_chair.glb\` |
| Filipino Gallinera Table | [Gallinera Table](https://polyhaven.com/a/gallinera_table) | Ulan Cabanilla | ~0.830×0.518×0.488 m | \`polyhaven/gallinera_table.glb\` |

License: Poly Haven CC0 https://polyhaven.com/license. Source images and packed model files downloaded from https://api.polyhaven.com using published checksums. Textures from source 1K variant, packed into GLB without changing model geometry or normal/roughness textures. The dimensions are authored model size, **not validated measurements of a real manufacturer product**. Rendering placement depends on independent SLAM scale verification.
