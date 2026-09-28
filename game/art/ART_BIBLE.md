# Contract Board — Hunt Art Bible

> **Superseded by v2.** The 32×48 pixel pilot is retired for production. See [`art/v2/ART_BIBLE_V2.md`](v2/ART_BIBLE_V2.md) for the OSRS-flavored chunky low-poly 3D direction. Files under `art/sprites/` are kept for archive only.


**Original IP.** OSRS-flavored idle combat mood — cool, crisp, readable on phone. No Jagex sprites, logos, or trademarked asset reuse. Display names in `data.js` are placeholders; silhouette language stays ours.

## Mood

Darker **cool** arena floors (slate / deep teal-ink, not olive sludge). Clean **gold** UI accents (`#c9a227`, `#e8c547`, cream `#ffffa0`) — never pure neon `#ffff00`. Characters pop with mid-value chroma against near-black outlines. Light from **top-left**; one cool shadow step (hue-shift toward blue-violet, not muddy brown).

## Current rendering (found in code)

Hunt draws **DOM CSS stick/chunky figures**, not canvas sprites.

| Piece | Where | What |
|---|---|---|
| Shell build | `js/arena.js` → `buildShell`, `ensureShell` | `#arena.arena`, `#drone-layer`, `#wave-column`, `#player-avatar`, `#proj-layer` |
| Hunters | `hunterFigHtml` → `.fig.fig-hunter` parts `.fh-*` | Inside `.drone` / `.drone-scale` (`scale(0.864)`) |
| Monsters | `mobFigHtml` → `.fig.fig-mob.fig-mob-{visual}` parts `.fm-*` | Inside `.mob` / `.mob-body` (box 64×44, fig 36×40, same 0.864 scale) |
| Player | inline in `buildShell` → `.fig.fig-hunter.fig-player` | `.player-avatar` / `.player-emoji.player-fig` at `scale(1.5)` |
| Quill stand | `.drone-stand` / `.ds-plinth` / `.ds-post` when stationed | Quill is stationary turret (`drone-stationed`) |
| Player bolts | `fireBolt` → `.proj.player-bolt.bolt-tier-N` | ~18×6px (tier 2–3: 22×7) |
| Quill arrows | `spawnProjectile` → `.proj.arrow` | ~24×6px |
| Themes | `AREA_THEMES` + `.arena.area-{id}` | Undercroft greens currently muddy; art target is cooler |
| Layout | `.app` max-width **520px**; `.arena` `height: min(62dvh, 460px)`, `min-height: 320px` | Phone-first column |

CSS figure sizes today (~28×36 hunter, ~36×40 mob) read small on iPhone after 0.864 scale (~24–35px tall). Pixel pack targets **readable 48–72px** on device.

## Silhouette / canvas

| Spec | Value | Why |
|---|---|---|
| Native frame | **32×48** px | Tall enough for weapon clearance; maps to hunter/mob proportions |
| Display | Integer **×2** (64×96) or ×3 | Matches 48–72px+ readable height on ~390px-wide phones inside the 520px app |
| Outline | **1px** shared near-black `#0e1018` on all opaque silhouette edges | Matches CSS `border: 1px solid #000` language without pure void crush |
| Shadow | One soft blob + one shade step on form; light **top-left**; cool hue-shift (`#1a2438` family) | Replaces flat `rgba(0,0,0,.3)` `.fh-shadow` / `.fm-shadow` |
| Anchor | Feet at bottom center of 32×48 | Drop-in for `transform-origin: 50% 100%` |

Projectiles are separate tiny canvases (not character frames): **arrow 24×8**, **bolt 16×8** (draw at ×2).

## Master palette

Shared outline: `#0e1018`. Arena/UI: floor `#141820` `#1c2430`, accent gold `#c9a227` `#e8c547`, text cream `#ffffa0`, panel stone `#3e3e34` (UI only). **No pure `#ffff00`.**

| Ramp | Hex (dark → light / accent) |
|---|---|
| **Player** (mage violet + gold bolt) | `#2a1a48` `#3d2a6a` `#5a4a8a` `#8a78c0` `#e8c090` `#ffff66` |
| **Briar** (cool steel + gold accent) | `#1e2230` `#3a4258` `#66708a` `#a8b2c8` + strap `#5a3a28` + skin `#e8c090` + accent `#e8c547` |
| **Quill** (ranger greens + wood) | `#142818` `#1a4820` `#2a8a28` `#6a4a28` `#a87848` `#d8b060` |
| **Crawling Hands** (corpse grey-green) | `#2a3028` `#4a5646` `#7a8a70` `#b0bca0` `#d8dcc8` + wound `#802020` |
| **Turret / plinth** (cool blue-gray stone) | `#1a1e28` `#2a3040` `#434c60` `#6a7488` `#9aa4b8` |
| **Arrow** | `#1a1008` `#2a8a28` `#8a5a28` `#9aa4b8` `#d8b060` |
| **Bolt** | `#5a4a8a` `#8a78c0` `#ffff66` `#ffffff` `#c9a227` |

Shadows: mix toward `#1a2438` / `#243048` one step — never olive.

## Animation budget

| Subject | Anims | Frames |
|---|---|---|
| Player | idle, attack | idle **2–4** breathe; attack **3–4** |
| Briar | idle, walk, attack | idle **2–4**; walk **4**; attack **3–4** |
| Quill | idle, shoot | idle **2–4**; shoot **3–4** (no walk — turret) |
| Crawling Hands | idle, walk, die (optional) | idle **2–4**; walk **4**; die **3–4** if shipped |
| Quill turret | static | `quill_turret.png` single frame (plinth under Quill) |
| Arrow / bolt | static | single PNG each; rotate in engine via CSS `--proj-angle` |

Strip layout: **horizontal** left→right, frame size **32×48** (characters) unless noted.

## File naming (`art/sprites/`)

Lowercase `snake_case`. Horizontal strips; state frame size in filename comment or pack manifest later.

```
art/sprites/player_idle.png          # 32×48 × N
art/sprites/player_attack.png
art/sprites/briar_idle.png
art/sprites/briar_walk.png
art/sprites/briar_attack.png
art/sprites/quill_idle.png
art/sprites/quill_shoot.png
art/sprites/quill_turret.png         # static plinth; Quill sits on top
art/sprites/crawling_hands_idle.png
art/sprites/crawling_hands_walk.png
art/sprites/crawling_hands_die.png   # optional
art/sprites/arrow.png                # 24×8
art/sprites/bolt.png                 # 16×8
```

Later hunters/mobs: `{visual_or_name}_{anim}.png` using **neutral ids** (e.g. `moss_walk.png`, `spectre_idle.png`, `beast_idle.png`) — see Naming.

## Cast table (silhouette one-liners)

### Company / player
| ID | Role | Silhouette |
|---|---|---|
| **Player** | Mage, staff, bottom-center | Compact robe + upright staff; gold bolt read |
| **Briar** | Melee sword | Broad pauldrons + shield, short sword, gold crest accent |
| **Quill** | Stationary bow on turret | Narrow archer atop stone plinth; green arrow trail |
| **Moss** | Melee axe (later) | Stockier, wide axe head |
| **Ember** | Mage staff / fire (later) | Robe + ember orb; orange projectile |

### Undercroft (`areaId: sewers`, visual keys)
| Contract / boss | visual | Silhouette |
|---|---|---|
| **Crawling Hands** | `crawler` | Low cluster of severed grasping hands, wound-red wrists |
| **Banshees** | `spectre` | Tall soft ghost column, no legs |
| **Infernal Mages** | `mage` | Robed caster + staff limb |
| **Undercroft Overseer** | Area Boss | Crown/authority bulk (boss pass later) |

### Other areas (pack later; same rules)
| Area | Monsters (visual) |
|---|---|
| **Fenwatch** (`mistwood`) | Dust Devils (`swirl`), Gargoyles (`gargoyle`), Aberrant Spectres (`aberrant`); boss Fenwatch Wraith |
| **Bonevault** (`crypt`) | Kurasks (`beast`), Gargantuan Boneguards (`boneguard`); boss Bonevault Warden |
| **Ash Warrens** (`ashrim`) | Nechryarch Kin (`imp`), Abyssal Demons (`demon`); boss Ash Abyssal |

## Naming

Filenames and art use **original names / neutral visual ids only** (`player`, `briar`, `quill`, `crawling_hands`, `crawler`, `spectre`, `mage`, `swirl`, `gargoyle`, `aberrant`, `beast`, `boneguard`, `imp`, `demon`).

Several **display names in `js/data.js`** sound like OSRS monster names (e.g. Kurasks, Nechryarch Kin, Abyssal Demons, Aberrant Spectres, Dust Devils, Gargoyles, Banshees, Crawling Hands). Renaming game text is **Alex's call**; sprite files must stay on neutral ids so art never ships trademarked strings.

## Integration notes (for later — do not change game code now)

See `art/INTEGRATION.md` for ready-to-paste CSS `steps()` classes and wiring against `hunterFigHtml` / `mobFigHtml` / `.proj.*` / `.drone-stand`.

## Open choices

None blocking the pilot pack. Cool arena vs current olive `AREA_THEMES.sewers` is intentional art direction; code theme can catch up when sprites land.
