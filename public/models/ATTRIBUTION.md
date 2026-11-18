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
- In RoomFit, catalog ID is \`velvet-sofa\`. Sample dimensions are not measured, validated or certified against a particular product configuration.

## Poly Haven furniture collection (CC0, 1K textures, packed glTF Binary)

The following public-domain-equivalent **CC0** assets were retrieved from the [Poly Haven library](https://polyhaven.com/models/furniture) using its official [public API](https://polyhaven.com/our-api). Their original model data and textures were repackaged *losslessly* into single GLB files by \`scripts/pack-polyhaven-glb.mjs\`. No mesh simplification or material retouching was performed; texture resolution is the original published 1K variant.

Poly Haven API dimensions are published in **millimeters** as (Blender X, Y, Z); RoomFit renders them as (width=X, depth=Y, height=Z) in meters. **These are model-creator approximate dimensions, not certified product specifications.** The engine's real-world meter scale must be independently checked with a tape measure.

| RoomFit name | Original model / creator | Model dimensions, W × D × H | Repo asset |
|---|---|---|---|
| Compact Wooden Stool | [Wooden Stool 02](https://polyhaven.com/a/wooden_stool_02), Kuutti Siitonen | 0.265 × 0.183 × 0.182 m | \`polyhaven/wooden_stool_02.glb\` |
| Monobloc Chair | [Plastic Monobloc Chair 01](https://polyhaven.com/a/plastic_monobloc_chair_01), Kuutti Siitonen | 0.642 × 0.628 × 0.880 m | \`polyhaven/plastic_monobloc_chair_01.glb\` |
| Leather Lounge Chair | [Mid Century Lounge Chair](https://polyhaven.com/a/mid_century_lounge_chair), Kuutti Siitonen | 1.009 × 1.190 × 1.169 m | \`polyhaven/mid_century_lounge_chair.glb\` |
| Small Wooden Table | [Small Wooden Table 01](https://polyhaven.com/a/small_wooden_table_01), Ulan Cabanilla | 0.916 × 0.440 × 0.533 m | \`polyhaven/small_wooden_table_01.glb\` |
| Round Coffee Table | [Coffee Table Round 01](https://polyhaven.com/a/coffee_table_round_01), Ulan Cabanilla | 1.301 × 1.301 × 0.491 m | \`polyhaven/coffee_table_round_01.glb\` |

Poly Haven license: https://polyhaven.com/license (CC0). API source: https://api.polyhaven.com/info/<asset_id> and https://api.polyhaven.com/files/<asset_id>. Author credit is voluntary under CC0 and retained here for provenance.

The existing **Sheen Chair**, **Glam Velvet Sofa**, and **Sheen Wood Leather Sofa** are third-party showcase demos with provisional physical sizing and should not be presented as exact purchasable products. The app shows their actual rendered bounding-box dimensions when loaded.
