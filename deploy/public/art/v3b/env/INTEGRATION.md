# AFK Slayer — Hunt arena floor + oval shadows (Option C)

**Locked look:** `/workspace/contract-board/art/v3/target/option_c_locked.png`  
**Polish reference (shadows + tile cohesion only — do NOT copy drones/IP):** `art/ref/obelisk_screenshot.png`  
**Status:** Floor tile pack ready for New Bot CSS. Cool muted slate — **not** muddy green Undercroft CSS.

## Deliverables

| File | Size | Role |
|---|---|---|
| `floor_tile.png` | 256×256 | Seamless (near) rocky cavern tile — Option C cool slate |
| `floor_tile_alt.png` | 256×256 | Second variant (same palette) for variety |
| `floor_sheet.png` | 1024×1024 | 4×4 tiled preview (seam QA) |
| `arena_floor_mock.png` | 780×480 | Phone-width mock: tiled floor + soft oval shadows + pilot sprites |
| `shadow_oval.png` | 80×28 | Soft cool-black oval, **true alpha** — reusable under any combatant |
| `INTEGRATION.md` | — | This file |

Working folder: `/workspace/contract-board/art/v3b/env/`

## Tile palette (locked)

Cool charcoal / slate greys only. Subtle cracks, painterly faceted low-poly feel.  
**No olive sludge. No characters. No UI.** Thin gold ring is optional arena accent (shown in mock), not baked into the tile.

## CSS — floor on `#arena` / `.arena`

```css
#arena,
.arena {
  /* exact path from contract-board root / site root — adjust if New Bot serves art elsewhere */
  background-image: url("./art/v3b/env/floor_tile.png");
  background-repeat: repeat;
  background-size: 256px 256px; /* or 64px 64px if you want denser phone tiles */
  background-position: center bottom;
  /* kill old muddy green / solid Undercroft fill */
  background-color: #1c2228; /* cool slate fallback only */
}
```

Optional variety (checker / random via two layers or JS swap):

```css
.arena.alt-floor {
  background-image: url("./art/v3b/env/floor_tile_alt.png");
}
```

Level 1 **“bear den”** can reuse the **same** `floor_tile.png`. Optional cooler tint later:

```css
.arena.level-bear-den {
  background-image: url("./art/v3b/env/floor_tile.png");
  /* optional cool wash — do NOT go olive */
  filter: brightness(0.95) saturate(0.9) hue-rotate(-8deg);
}
```

Prefer a CSS overlay/`background-blend-mode` over hue-rotate if filter affects child sprites.

## CSS — oval shadow under `.mob` / `.drone` / combatants

Sprites should **sit** on the floor: place `shadow_oval.png` **under** the sprite (z-order below), centered on the feet.

```css
.mob,
.drone,
.combatant {
  position: absolute;
  background-color: transparent !important; /* NO solid sprite boxes */
  image-rendering: auto;
}

.mob::before,
.drone::before,
.combatant::before {
  content: "";
  position: absolute;
  left: 50%;
  bottom: 2px;           /* tweak to feet */
  transform: translateX(-50%);
  width: 72px;           /* scale per entity size; source is 80×28 */
  height: 26px;
  background: url("./art/v3b/env/shadow_oval.png") center / contain no-repeat;
  z-index: 0;            /* under sprite art */
  pointer-events: none;
}

.mob > img,
.mob .sprite,
.drone > img,
.combatant .sprite {
  position: relative;
  z-index: 1;            /* above shadow */
  background: transparent !important;
  display: block;
}
```

If entities are canvas-blit instead of DOM:

1. Draw floor (tiled).
2. Draw `shadow_oval` at foot anchor (below sprite).
3. Draw sprite frame on top.

Pilot strips under `art/v3b/anim/sprites/` already bake a soft contact shadow; the reusable `shadow_oval.png` is still useful for **mobs without baked shadows** and for consistent ground-contact sorting. Do **not** double-stack heavy shadows — if a strip is already shadowed, either skip `::before` or use a lighter opacity (~0.45).

## Z-order summary

1. Arena floor (`background-image` repeat) — bottom  
2. Optional gold ring / FX  
3. `shadow_oval` under each combatant  
4. Combatant sprite (transparent PNG, no box fill)  
5. Projectiles / UI chrome — top  

## Do not

- Do **not** change player / briar / quill sprites (owned elsewhere).  
- Do **not** use muddy green Undercroft CSS fills.  
- Do **not** put solid `background-color` behind Option C sprites.  
- Do **not** start bears/wolves/spiders art here (other workers).

## Seam notes

Tiles were offset-blended for near-seamless repeat. `floor_sheet.png` is the QA proof — minor low-contrast plate edges may remain at 100% zoom; at phone arena scale they read as natural stone variation. If a hard seam appears in CSS, set `background-size` slightly off integer scale or prefer the 256px tile at 50% (`128px`).

## Build

`python3 art/v3b/env/build_floor.py`  
(GenerateImage was not callable in this executor; tiles painted procedurally to Option C cool slate from `option_c_locked.png` + Obelisk shadow/tile cohesion language.)
