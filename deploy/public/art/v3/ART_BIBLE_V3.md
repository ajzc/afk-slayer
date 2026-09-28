# Contract Board — Hunt Art Bible v3 (Option C — Low-Poly Sprite)

> **Locked to Option C board:** `art/v3/target/option_c_locked.png`  
> Production direction is pre-rendered chunky low-poly 3D sprites (not pixel). Compare with `preview_vs_target.png`.

Original IP only — no Jagex/Obelisk models. Style matches the locked board: visible facets, soft oval shadows, thin gold ring floor, warm center spotlight, dark vignette.

## Mood & lighting (from locked board)

- Floor: muted **cool-slate** irregular cracked slabs (never olive; never a filled mustard disc).
- Boundary: **thin gold torus ring only**.
- Soft **warm spotlight** on center; heavy **vignette** at edges.
- Soft blurry **oval drop-shadows** under every unit.
- Characters stay vibrant so they pop against the dark arena.

## Palette (board-matched)

| Ramp | Notes / hex |
|---|---|
| Floor slate | `#1c2028` `#2a3038` `#3a424c` `#4a5460` `#5a6470` (lit pool) |
| Gold | `#c9a227` `#e8c547` |
| Player purple | `#1a0a38` `#2a1460` `#4a2088` `#6a38b0` + orb `#c080ff` + eyes `#ffc040` |
| Briar steel | `#2a3038`…`#c8d0dc` + plume `#c02828` + gold accents |
| Quill / ivy | greens `#0e2414`→`#3aaa38` + wood + ivy `#1a6828` |
| Stone hands | masonry greys `#3a3e44`→`#b8bec4` (not flesh) |

## Models

- **Player:** deep purple robes, thick gold hem/collar, hood with glowing yellow-orange eyes only, staff with **large purple orb in gold claw cage**.
- **Briar:** stout grey plate knight, vertical-slit helm + red plume, broadsword, kite shield with gold border + **star/cross emblem**.
- **Crawling Hands:** four **stone golem fists**, segmented knuckles.
- **Quill:** green ranger on **cylindrical stone turret with ivy + crenellations**; shoot strip with glowing-tip arrow.

## Render / display

- Blender 4.x EEVEE · orthographic ~32° elev / ~50° yaw (front 3/4) · canvas **160×192**
- Idle **8** · attack/shoot **6** · briar walk **8**
- Phone display ~64–80px via **smooth** downscale
- Hit sparkles + floating damage **preview/engine only**

## Poly counts (current)

| Model | Tris |
|---|---|
| player | 878 |
| briar | 880 |
| quill | 554 |
| quill_turret | 430 |
| crawling_hands | 826 |

## Pipeline

```bash
blender -b -P art/v3/src/render_all.py
/workspace/.venv-art/bin/python art/v3/src/compose.py
```
