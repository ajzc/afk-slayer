# Contract Board — Hunt Art Bible v2 (Low-Poly 3D)

**Original IP.** OSRS-*flavored* chunky low-poly 3D — not Jagex assets. No Jagex models, textures, logos, or recognizable OSRS monsters/characters. Every mesh is built from primitives in `art/v2/src/`.

Supersedes the retired 32×48 pixel pilot (`art/ART_BIBLE.md` / `art/sprites/`).

## Mood

Cool, darker arena (`#141820` family). Clean gold accents (`#c9a227`, `#e8c547`, cream `#ffffa0`). No olive sludge. Characters read as charming blocky fantasy with modern lighting (key + rim + contact shadow).

## Master palette (tightened v1 ramps)

| Ramp | Hex |
|---|---|
| Outline / deep | `#0e1018` |
| Arena floor | `#141820` `#1c2430` `#243048` |
| Gold | `#c9a227` `#e8c547` `#ffffa0` |
| Player violet | `#2a1a48` `#3d2a6a` `#5a4a8a` `#8a78c0` + skin `#e8c090` + bolt `#ffff66` |
| Briar steel | `#1e2230` `#3a4258` `#66708a` `#a8b2c8` + strap `#5a3a28` + accent `#e8c547` |
| Quill | `#142818` `#1a4820` `#2a8a28` + wood `#6a4a28` `#a87848` `#d8b060` |
| Turret stone | `#1a1e28` `#2a3040` `#434c60` `#6a7488` `#9aa4b8` |
| Crawling Hands | `#2a3028` `#4a5646` `#7a8a70` `#b0bca0` `#d8dcc8` + wound `#802020` |

## Poly / material budget

- **~300–1500 tris** per character (flat-shaded faces).
- Materials: flat or two-step toon via lit diffuse (no texture maps; solid color materials only).
- Proportions: slightly large heads, **big hands and feet**, blocky limbs (OSRS-like charm, original designs).

## Shading & lights

- Flat / soft two-tone read (low roughness diffuse).
- **Key** upper-left, warm-neutral.
- **Rim** cool from behind-right.
- Low ambient / soft fill so forms stay chunky, not washed out.
- Soft **contact shadow** ellipse under each figure (baked into PNG or composited).
- Hit glow: temporary emissive / additive bloom on impacted mesh (engine later); preview may show a soft rim pulse.

## Camera

- **Orthographic**, slight 3/4 top-down.
- Elevation **~30–35°**, yaw **~30°**.
- Characters face **screen-right-ish**.
- Same camera for all character renders and arena preview floor.

## Render / display

| Spec | Value |
|---|---|
| Output | Transparent PNG, anti-aliased |
| Frame canvas | **160×192** (char ~192px tall) |
| Strips | Horizontal, no gaps |
| Display on phone | **~64–80px** tall → downscale **~2.4–3×**, **smooth** (NOT `pixelated`) |
| Projectiles | Smaller canvases (e.g. bolt 96×48, arrow 128×48) |

## Animation budget

| Anim | Frames |
|---|---|
| Idle | **6–8** (breathe / weight shift) — pilot may ship 1 idle frame + short strip |
| Walk | **8** (later) |
| Attack / shoot | **6–8** |

## File naming

```
art/v2/sprites/<id>_<anim>.png
art/v2/sprites/quill_turret.png
art/v2/sprites/bolt.png
art/v2/sprites/arrow.png
```

Neutral ids only (`player`, `briar`, `quill`, `crawling_hands`, …). Game display names in `data.js` are Alex’s call.

## Pipeline

- Renderer: **Blender 4.x** headless (`blender -b -P art/v2/src/render_all.py`).
- Sources: `art/v2/src/*.py` (regenerable, consistent).
- Previews: `preview_sheet.png`, `preview_phone.png`.


## Pilot pack stats (generated)

| Model | Tris |
|---|---|
| player | 568 |
| briar | 526 |
| quill | 490 |
| quill_turret | 190 |
| crawling_hands | 1302 |

Frame canvas: **160×192**, **6** frames per strip (idle / attack / shoot). Display ~64–80px via smooth downscale. Renderer: **Blender 4.3 EEVEE** headless.
