# AFK Slayer: plain starter player + blade and armor overlays

This folder holds the empty-handed starter body plus 7 blade overlay layers and an edge-glint layer.
The body is a linen tunic, rope belt, brown trousers and bare head. Strips are drop-in 142×156,
6 frames each, on transparent RGBA with a baked soft oval contact shadow (shadow is on the body layer only).

Build (idempotent; writes only the files listed below):

```bash
/workspace/.venv-art/bin/python art/v3b/player_plain/build_player_plain.py
```

Inputs are in `_gen/`: `plain_body_gs.png` (base layer), `plain_with_weapon_gs.png` (used only to measure the wooden sword) and `blades_sheet_gs.png`.
The sheets are **1280×720** (not 1024×576), pure-lime greenscreen, with 3 poses: idle, stride, thrust.

## Files (all in `art/v3b/anim/sprites/`)

| File | Frames | Frame (w×h) | FPS | Anchor feet_x | Notes |
|---|---:|---|---:|---:|---|
| `player_plain_idle.png` | 6 | 142×156 | 7 (6–8) | 44 | body + bronze composite (default starter look) |
| `player_plain_walk.png` | 6 | 142×156 | 9 (8–10) | **68** | body + bronze composite |
| `player_plain_attack.png` | 6 | 142×156 | 11 (10–12), play once | 44 | body + bronze composite |
| `player_plain_body_{idle,walk,attack}.png` | 6 | 142×156 | as above | as above | base layer: empty hands + baked shadow |
| `player_gear_weapon_{bronze,iron,steel,mithril,adamant,rune,dragon}_{idle,walk,attack}.png` | 6 | 142×156 | as above | as above | blade only, transparent, same per-frame transforms as the body |
| `player_gear_weapon_glint_{idle,walk,attack}.png` | 6 | 142×156 | as above | as above | 3-step sparkle on the blade axis (frames 2,3,4; the others are empty) |

That makes 30 strips; each is 852×156 (6 × 142).

Frame sequences, with the same transform on every layer:

- **idle**: idle pose with a breathe stretch about the feet (1.000→1.010→1.000) and a sway of 0.4 px or less.
- **walk**: stride, idle, stride, idle, stride, idle. The idle-pose "passing" frames are raised 1–1.5 px, the stride frames sit on the ground (+0–1 px), with an alternating 0.6–1.4 px forward lean. This is an approximate step cycle with only two painted poses.
- **attack**: idle → wind-up (lean back 4 px, −2 px) → thrust → thrust + lunge (+3 px, lean +2) → recover (thrust pose, −1.5 px) → idle.

## Anchor, baseline, scale (matched to the current mage)

The current `player_idle.png` frame 0 measures as follows:

- alpha bbox `[11,0,133,155]`
- feet baseline row **151** (lowest opaque boot row)
- hood top row **9**, so hood-top→feet is **142 px** (the staff/orb columns x<48 are excluded)
- feet_x **82.1**, the midpoint of the boot centres 64.4 and 99.8

The starter matches like this:

- **Baseline:** row 151 in all strips. QA measures 151 on frame 0 of idle, walk and attack.
- **Height:** head-top→feet uses one uniform scale **s = 0.29668** sheet→frame px for every pose and layer. The pixel-edge span of the idle pose's hair-top..feet rows (96..577 in the sheet) maps onto the mage's rows 9..151. At alpha>200, QA measures head_top 10 / 141 px, because the soft hair spikes lose ~1 px to the threshold.
- **Feet_x: shifted left, and documented.** idle + attack use feet_x = **44** (the mage uses 82). The thrust pose plus a blade does not fit in 142 px at mage feet_x: the wooden sword tip alone would land at x≈172. So the body is shifted −38 px, identically in the body strip, all blade strips and the composite. Idle and attack share the anchor, so swapping between them in the same box never jumps.
- **Walk uses feet_x = 68.** In the stride pose the sword hangs back-and-down to the left of the body, so at x=44 it would leave the frame on the left. **Draw walk frames 24 px further left than idle/attack** (`x_offset = 44 − 68 = −24` frame px, times the display scale) so the feet stay planted when you switch walk↔idle. The current game has no player walk strip, so wiring it needs new code anyway. The same value is in `_meta_player_plain.json → anchor_note`.
- Shadow: a soft neutral cool-black oval (rx 26, ry 2.1, peak α≈0.47, blur 1.3) centred at the feet on row ~151.4. It follows the lunge dx but not the bob, and it is kept off the last frame rows.

## Layer order (back → front)

1. `player_plain_body_*` (base, with shadow)
2. legs: `player_gear_legs_{metal}_*`
3. body armour: `player_gear_body_{metal}_*`
4. helm: `player_gear_helm_{metal}_*`
5. weapon: `player_gear_weapon_{metal}_*`
6. glint: `player_gear_weapon_glint_*`

Draw every layer with the same frame index and the same box position (for walk, use the walk offset on all layers).

## Item id → layer

| Item id | Layer files |
|---|---|
| `gear_bronze` | `player_gear_weapon_bronze_{idle,walk,attack}.png` |
| `gear_iron` | `player_gear_weapon_iron_*` |
| `gear_steel` | `player_gear_weapon_steel_*` |
| `gear_mithril` | `player_gear_weapon_mithril_*` |
| `gear_adamant` | `player_gear_weapon_adamant_*` |
| `gear_rune` | `player_gear_weapon_rune_*` |
| `gear_dragon` | `player_gear_weapon_dragon_*` |
| `legs_*`, `body_*`, `helm_*` | see **Armor overlays → Item id → file** below |

With no weapon equipped, draw only the body. `player_plain_*` is exactly body + bronze. QA measures a mean abs diff of **0.0000** on all three strips.

## How the blades were fitted

1. **Keying:** the blade sheet uses a stricter key (green excess g−max(r,b) > 70) because the adamant blade is itself green. Lime background has an excess of ~225, adamant ≤ ~50. Semi-transparent edge pixels are despilled afterwards (adamant keeps its own green).
2. **Blade grip:** every blade has the same left grip alignment. For each one the script measures the pommel end, the handle and the cross-guard from the thickness of the top run in each column, so the dragon's knuckle-bow loop is ignored. The grip point is the middle of the handle. Handle pixels that land on the fist are removed per frame (handle ∩ fist skin), so the fist shows between the pommel and the guard.
3. **Wooden sword (measurement only):** the two sheets register at dx=dy=0 on head and torso (search ±8 px). The sword is the with-weapon sheet minus the body sheet, and its axis comes from a robust PCA fit (y-down angles):

   | pose | angle | wooden length (sheet px) | grip used (body sheet) |
   |---|---:|---:|---|
   | idle | 44.2° (tip down-right) | 222 | (137.8, 384.0): the empty fist, 4.6 px from the wooden grip |
   | walk | 141.4° (tip down-left) | 201 (foreshortened/occluded) | (514.6, 386.1): the empty fist |
   | attack | −12.9° (thrust, slightly up) | 223 | (1077.4, 331.3): midpoint of the two empty fists. The wooden sheet clasps the hands lower and closer, so its grip sits 15/−24 px away. The two-handed axis passes within ~2 frame px of both fists. |

4. **Blade length:** blade-sheet→body-sheet scale k = 222/518 = 0.4286, so the **Bronze total length equals the wooden sword (median 222 px)**. Its grip→tip is 51.2 frame px.
5. **Frame-fit rule (important):** at their natural relative sizes, iron…dragon would reach 83–97 px from the grip. That clips the 142 px frame by 30–40 px in the thrust, and at the bottom in idle, whatever feet_x you pick. The script keeps every hilt (pommel + handle + guard) at native scale and **shortens only the blade section beyond the guard**, as much as needed to stay ≥3 px inside the frame. It solves for this by bisection per blade:

   | blade | natural grip→tip | shipped grip→tip | blade-section factor |
   |---|---:|---:|---:|
   | bronze | 51.2 | 51.2 | 1.000 |
   | iron | 83.5 | 50.6 | 0.467 |
   | steel | 87.2 | 50.6 | 0.437 |
   | mithril | 87.7 | 50.6 | 0.442 |
   | adamant | 87.9 | 50.6 | 0.440 |
   | rune | 87.9 | 50.6 | 0.445 |
   | dragon | 97.1 | 51.9 | 0.427 |

   So in the shipped strips **all blades are about as long as bronze**. Tiers read by colour and hilt, not by length. If you want visible length progression, widen the frame (e.g. 180 px) and re-run with `FW` changed. Shrinking bronze below the wooden sword is the other option.

## Edge glint

`player_gear_weapon_glint_*` holds a small warm-white 4-point sparkle in 3 steps (arm radius 2.2 → 3.6 → 2.4 px). It sits at 30% / 58% / 86% of the **bronze** guard→tip axis in frames 2, 3 and 4 of each strip; the other frames are empty. Every blade shares the grip point, the angle and (after fitting) roughly the bronze length, so the glint lands on every blade as-is. For custom placement, `_meta_player_plain.json` has `bronze_axis_per_frame` (guard-end → tip, frame px) and `glint.positions`. Put a sparkle anywhere on that segment. On the curved dragon blade the 86% point can sit a pixel or two off the edge.

## QA

`_qa_summary.txt` covers strip sizes, corner alpha, lime residue, pixels touching the frame edge, the layer diff and the baseline/height/feet-x numbers. Current result: **issues=CLEAN**.
- Corners are 0 on every frame, and no alpha touches any frame edge.
- Lime residue is 0. The "greenish" counts reported for adamant and rune are their real blade colours.
- `preview_plain.png` shows the current mage beside the starter at the same 2× scale on `env/arena_floor_mock.png`, the three composite strips (+glint) at 2×, and all 7 blades on idle frame 0 and attack frame 3.
- `_work/` holds debug images: `blades_geom.png` (handle/guard/grip detection), `skin_grip.png` (wooden-sword grip fit), `grip_zoom2.png` (close-ups of the grip).

## Caveats

- **Feet_x is not 82 like the mage.** It is 44 for idle/attack and 68 for walk, because the attack reach does not fit otherwise. With a plain PNG swap, the character sits ~38 frame px (~22 display px at 90 px tall) left of where the mage stood inside its box. Health bars or labels centred on the box will look off-centre, so offset them by the anchor.
- The walk is two painted poses alternating plus bob and lean. It is not a real leg cycle.
- Attack grip: the empty-hand sheet draws the two fists apart and higher than the wooden-sword sheet. The blade goes through the midpoint of both fists at the wooden angle, so the handle shows between the fists, which reads as a two-handed grip.
- Dragon: the large knuckle-bow hilt sits over the wrist and fist rather than wrapping the fingers. It reads as held but busy, and it is the most "stuck-on" of the seven.
- Steel's pommel is low contrast, so its detected handle starts ~20 sheet px early and the grip sits ~1 frame px toward the pommel. Not visible at display size.
- The long blades are shortened with their facets squeezed ~2.2× along the length. At display size they still look like faceted low-poly blades.

---

# Armor overlays (legs / body / helm)

Build (writes only the 63 armor strips, `_masters/`, `preview_gear.png` and the ARMOR block of `_qa_summary.txt`; it never rewrites the 30 shipped strips above):

```bash
/workspace/.venv-art/bin/python art/v3b/player_plain/build_player_armor.py
```

`build_player_armor.py` imports `build_player_plain` and renders every armor layer with **the same per-frame transform `M_body`** as `player_plain_body_*`: same frames, uniform scale **s = 0.29668**, baseline 151, anchors feet_x 44 (idle/attack) / 68 (walk), and the same breathe/bob/lean/lunge. Frame-by-frame the armor sits exactly on the body. Draw it at the same box position as the body, and for walk use the same −24 px offset on every layer.

## Armor files (all in `art/v3b/anim/sprites/`, 852×156 = 6 × 142×156, same fps as the body)

| File pattern | Count | Content |
|---|---:|---|
| `player_gear_legs_{metal}_{idle,walk,attack}.png` | 21 | Platelegs over the trousers (tunic hem stays on top, shoes visible), thigh / knee-cop / shin plates |
| `player_gear_body_{metal}_{idle,walk,attack}.png` | 21 | Platebody: breastplate ridge, belly bands, short plate skirt, pauldrons, forearm plates to the wrist (hands bare). **dragon = Dragon chainbody** (tunic only, short sleeves, red scales, dark-gold collar/hem) |
| `player_gear_helm_{metal}_{idle,walk,attack}.png` | 21 | bronze/iron/steel = **med helm** (open face); mithril/adamant/rune = **full helm** (closed visor); dragon = **Dragon med helm with crest fin** |

`{metal}` is one of `bronze, iron, steel, mithril, adamant, rune, dragon`. There are no cape, shield, boots or glove layers.

## Layer order (back → front)

1. `player_plain_body_*` (base + shadow)
2. `player_gear_legs_*`
3. `player_gear_body_*` (its plate skirt overlaps the top of the platelegs)
4. `player_gear_helm_*`
5. `player_gear_weapon_*`
6. `player_gear_weapon_glint_*`

Every layer is optional and independent. Any combination of tiers stacks cleanly: e.g. iron legs + steel body + steel helm, as in the progression row of `preview_gear.png`.

## Item id → file

| Item id | Files |
|---|---|
| `legs_bronze` | `player_gear_legs_bronze_{idle,walk,attack}.png` |
| `legs_iron` | `player_gear_legs_iron_*` |
| `legs_steel` | `player_gear_legs_steel_*` |
| `legs_mithril` | `player_gear_legs_mithril_*` |
| `legs_adamant` | `player_gear_legs_adamant_*` |
| `legs_rune` | `player_gear_legs_rune_*` |
| `legs_dragon` | `player_gear_legs_dragon_*` |
| `body_bronze` | `player_gear_body_bronze_*` (platebody) |
| `body_iron` | `player_gear_body_iron_*` |
| `body_steel` | `player_gear_body_steel_*` |
| `body_mithril` | `player_gear_body_mithril_*` |
| `body_adamant` | `player_gear_body_adamant_*` |
| `body_rune` | `player_gear_body_rune_*` (gold trim) |
| `body_dragon` | `player_gear_body_dragon_*` (**chainbody**) |
| `helm_bronze` | `player_gear_helm_bronze_*` (med helm) |
| `helm_iron` | `player_gear_helm_iron_*` (med helm) |
| `helm_steel` | `player_gear_helm_steel_*` (med helm) |
| `helm_mithril` | `player_gear_helm_mithril_*` (full helm) |
| `helm_adamant` | `player_gear_helm_adamant_*` (full helm) |
| `helm_rune` | `player_gear_helm_rune_*` (full helm, gold trim) |
| `helm_dragon` | `player_gear_helm_dragon_*` (Dragon med helm + fin) |

General rule: `{slot}_{metal}` → `player_gear_{slot}_{metal}_{strip}.png`. **Not covered:** `legs_leather`, `body_leather`, `helm_leather`, `helm_slayer` and the capes in `design/visual-gear-ladder.md`. They need their own art. If one of those ids is equipped, draw nothing for that slot, or keep the previous tier.

## How they were made

- **Legs / body are painted procedurally on the body's own masks (no image generation, so no pose drift).** The keyed body sheet is segmented per pose into hair / face / tunic / skin / trousers / shoes with a seeded watershed on the Lab gradient: colour seeds plus pose-relative height bands, then clean-ups (largest hair blob, ankle wraps → shoes). The cloth luminance, which already carries the painterly facet shading, is rank-normalised per region and remapped to a neutral grey metal: contrast ×1.25, S-curve, darker mids, crisp speculars on the brightest facets, rim occlusion. Then come seams (dark ~1 frame-px line with a light edge below), a ~1 px dark outline, and a silhouette expansion of up to ~1.5 frame px (legs 5 sheet px, body 3 px plus pauldrons).
  - Platelegs: per-leg PCA axis, cylindrical shading, seams at 30 / 46 / 70 % of the leg (thigh, knee, shin), a domed knee cop, an ankle rim.
  - Platebody: tunic + upper/fore-arm skin minus the hands, plus a 10-sheet-px (~3 frame px) plate skirt below the hem. Waist band (raised belt plate), belly band, 2 skirt lames, a breastplate ridge at 60 % of the chest width, an elbow seam, a wrist cuff, and domed pauldrons with two lames at each shoulder.
  - Dragon chainbody: tunic region only, staggered scale pattern (#6E0F14 / #B01E24 / #E8474A) shaded by the cloth luminance, dark-gold collar and hem/sleeve trim, dark red outline. Painted in final colour, not palette-swapped.
- **Helms** are keyed from `_gen/helms_sheet_gs.png` (1280×720). Each is fitted **once**: one scale for all poses from the idle hair width (med 1.04×, full 1.05×, dragon 1.02×, vertical squash 0.88 because the painted helms are taller than the chibi head). The back edge sits 6 sheet px behind the hair spikes and the dome top just above the hair top, and the helm tilts with the head (walk −0.44°, attack +4.88°, measured from hair→face centroids). Render = `M_body @ A[pose]` (A is stored in `_masters/armor_masters.json`). In the open-face helms the dark interior is transparent **only where face/neck skin lies beneath** (computed per pose). Where hair or nothing lies beneath, it is an opaque lining shadow, so no hair shows through the helm. Opaque hair coverage: med 0.98, full 0.99–1.00, dragon 0.85; the dragon's remaining hair is under the lining fill or below the rim. The Dragon helm's tall crest is **squashed to 22 % height into a low fin**: there are only ~4 px of headroom above the head in the 156 px frame, and the full crest would clip the top edge.
- **Palette swap** (luminance preserving): master grey level g → ramp stops at g = 0 / 55 / 125 / 205 / 255 = dark×0.3 / dark / mid / light / light→white 55 %. Ramps: bronze #5A3316/#A8652A/#E0A060, iron #2E3034/#5E6168/#9A9EA6, steel #6F747C/#B4B9C0/#EEF1F4, mithril #2E2A5E/#5E58B0/#A7A2F0, adamant #173826/#2F6E4A/#6FB58A, rune #0F4A5A/#2AA6C0/#8FE6F5, dragon #5A0C10/#B01E24/#F05A5A. Rune gets gold (#F0C020 at the light end of a gold ramp) on the outer edge band and all seams, on legs, body and helm. Dragon platelegs get gold seam accents. The Dragon helm keeps its native red/gold paint. Rune frames get a final green clamp, because gold×cyan resampling makes a greenish fringe.

## Neutral masters (`player_plain/_masters/`) for future swaps

| File | What |
|---|---|
| `legs_plate_grey.png`, `body_plate_grey.png` | grey RGBA masters in **body-sheet space** (1280×720, the 3 poses side by side, exactly registered with `_gen/plain_body_gs.png`) |
| `legs_plate_trim.png`, `body_plate_trim.png` | R = outer edge band, G = seam band (for trims like rune gold) |
| `body_chain_dragon.png` | final-colour chainbody, body-sheet space |
| `helm_med_grey.png`, `helm_full_grey.png`, `helm_dragon.png` | helm crops (grey / native), plus `helm_*_trim.png` and `helm_*_cavity.png` (open-face interior) |
| `armor_masters.json` | ramps, grey stops, helm-per-metal, helm affine A per pose (crop → body sheet), fit params |
| `strips/{legs_plate,body_plate,helm_med,helm_full}_grey_{idle,walk,attack}.png` | already-rendered neutral grey strips (852×156). Apply any new ramp directly per pixel (grey level → colour, alpha unchanged) to get a new tier without re-rendering |

## Armor QA (`_qa_summary.txt`, ARMOR block)

Per strip: size 852×156, frame-corner alpha, lime residue, alpha touching the frame edge, alignment and floating blobs. Alignment means overlay pixels (a>8) outside the body alpha dilated 4 px, plus the overlay bbox against the body bbox +4 px (the Dragon crest is exempt at the top). Current result: **armor issues=CLEAN**. All 63 strips have corners 0, lime 0, edge px 0, bbox overflow 0 and floating blobs 0. Legs and body have 0 pixels outside body+4 px. Helms are reported for information only: 70–130 px per frame sit outside the *per-pixel* dilated body mask but inside the bbox +4. That area is the helm filling the gaps between hair spikes and the neck guard behind the nape, which is expected for a helmet.

`preview_gear.png` shows:
- the 7-tier full-kit lineup (idle f0, 2×, on the locked `env/floor_tile.png` arena floor; the arena mock has pilot sprites baked in, so it was not used)
- the progression row: plain → + iron legs (SL3) → + steel body (SL5) → + steel helm (SL7)
- attack f3 for the bronze / rune / dragon kits (+ steel walk f0)
- iron / rune / dragon full kits for all three strips at 1× (game size)

## Armor caveats

- The segmentation is heuristic: watershed on painted facets. It is checked visually on all 3 poses, but a regenerated body sheet would need re-checking (`_work/seg.png`).
- The walk strip reuses the two painted poses, so the armor animates exactly as coarsely as the body.
- At game size (~0.3×), seams read as bands and the knee cop as a light dot. The chainbody scales are ~4×3 frame px, so at 1× the chainbody reads as a red textured shirt rather than distinct scales.
