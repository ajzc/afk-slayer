# AFK Slayer — Option C anim pack (integration)

Working folder: `/workspace/contract-board/`.
Approved look: Option C board-matched under `art/v3b/anim/`.
**Do not use** `art/v3` Blender pack.

# art/v3b/anim — Production animation pack (Option C)

**Locked look:** `/workspace/contract-board/art/v3/target/option_c_locked.png`  
**Status:** CLEAN CUTOUTS READY — transparent PNG strips for pilot cast. Re-enable Option C sprites with no solid sprite-box backgrounds.

## Not approved

- `art/v3/` Blender EEVEE pack — **NOT approved** (toyish remakes; Alex rejected).
- `art/` v1 pixel pilot — superseded.
- `art/v2/` Blender pack — superseded.

## How these were built

Green-screen cutouts + flood-fill chroma key → transparent RGBA. Soft oval shadows re-baked (neutral, no green grass mats). Motion: multi-frame idle/walk/attack via bob/lean transforms on locked Option C silhouettes.

## Layout convention

All action strips are **horizontal left→right** frame sequences on **true transparent alpha** (no solid void / no floor mats). Soft oval contact shadows are baked in.

| File | Frames | Frame size (w×h) | Suggested FPS | Notes |
|---|---:|---|---:|---|
| `sprites/player_idle.png` | 6 | 142×156 | 6–8 | Subtle breathe |
| `sprites/player_attack.png` | 6 | 142×156 | 10–12 | Cast lean |
| `sprites/briar_idle.png` | 6 | 185×156 | 6–8 | Breathe |
| `sprites/briar_walk.png` | 8 | 185×156 | 8–10 | Walk bob |
| `sprites/briar_attack.png` | 6 | 185×156 | 10–12 | Sword lean |
| `sprites/quill_idle.png` | 6 | 140×156 | 6–8 | Archer only |
| `sprites/quill_shoot.png` | 6 | 140×156 | 10–12 | Draw lean |
| `sprites/quill_turret.png` | 1 | 119×156 | — | Static ivy stone turret |
| `sprites/crawling_hands_idle.png` | 6 | 254×156 | 6–8 | Twitch |
| `sprites/crawling_hands_walk.png` | 6 | 254×156 | 8–10 | Crawl |
| `sprites/crawling_hands_attack.png` | 6 | 254×156 | 10–12 | Lunge |
| `sprites/arrow.png` | 1 | 63×44 | — | Projectile |
| `sprites/bolt.png` | 1 | 78×43 | — | Projectile |

**CSS must not paint a background behind the sprite** — only `background-image` / `<img>` with transparent PNG. No solid `background-color` on the sprite box.

Canonical sizes also in `_meta.json`. Display characters at **~70–90px tall**.

## Wiring (replace CSS figs)

1. Point each combatant entity at the matching strip under `art/v3b/anim/sprites/`.
2. Use `background-image` + `background-size: {frame_w * N}px {frame_h}px` (or an `<img>` / canvas blit of one cell).
3. Advance frame index `0..N-1` on a tick:
   - idle / walk loops at suggested FPS
   - attack / shoot play once then return to idle
4. Quill: draw `quill_turret.png` as base, overlay `quill_idle` / `quill_shoot` at turret top.
5. Soft oval shadows are **baked into frames**; no separate shadow DOM needed unless you want ground-contact sorting.
6. Face **screen-right / slight 3/4** already — do not mirror unless team is left-facing.

Example CSS sketch:

```css
.cb-sprite {
  width: 72px;          /* display width ≈ one frame scaled */
  height: 90px;
  background-repeat: no-repeat;
  image-rendering: auto; /* keep painterly; avoid pixelated */
}
.cb-sprite.player-idle {
  background-image: url("./art/v3b/anim/sprites/player_idle.png");
  background-size: calc(126px * 6 * 90 / 156) 90px;
  /* offset x by -frameIndex * displayFrameWidth */
}
```

Prefer canvas/`requestAnimationFrame` if you already blit entities.

## Previews

- `preview_clean.png` — idle frames on checkerboard (proves alpha; no square mats)
- `preview_cutouts.png` — cutout sources on checkerboard
- `preview_sheet.png` / `preview_phone.png` — may be older; prefer `preview_clean.png`

## Weak spots (honest)

1. **No GenerateImage** this pass — cannot paint brand-new articulated poses; attack/walk are transforms + idle↔attack crop blends.
2. **Matte leftovers:** some frames still show a scrap of warm floor puddle / gold ring / vignette from the board crop (style-correct, but not pure cutout).
3. **Quill split:** archer/turret separation is heuristic; archer may retain a small stone lip.
4. **Briar walk** is weighty bob/lean/squash, not unique leg contact art.
5. **Projectile** crops are board FX regions — tidy further if bolts need tighter hitboxes.
6. Contaminants (neighbor orb, damage “9”) scrubbed where detected; re-check after any re-crop.

## Regen

Build script: `art/v3b/anim/build_strips.py` (Pillow). Re-run after updating `art/v3b/sprites/` crops. When GenerateImage is available to the parent agent, prefer regenerating pose frames with `reference_image_paths` = locked board + cutout, then recompose strips.

## Undercroft monsters (AFK Slayer)

Original IP silhouettes for New Bot. Filenames are **neutral** (no OSRS/Jagex asset names).

| data.js mapping | visual id | idle strip | attack strip | frames | size (w×h) | FPS idle | FPS attack | CSS class suggestions |
|---|---|---|---|---:|---|---:|---:|---|
| `tunnel_bats` (display may still say Banshees) | `spectre` | `sprites/spectre_idle.png` | `sprites/spectre_attack.png` | 6 / 6 | 93×156 / 110×156 | 6–8 | 10–12 | `.cb-spectre-idle` / `.cb-spectre-attack` |
| `drain_leeches` (Infernal Mages) | `mage` → files `undercroft_mage_*` | `sprites/undercroft_mage_idle.png` | `sprites/undercroft_mage_attack.png` | 6 / 6 | 88×156 / 106×156 | 6–8 | 10–12 | `.cb-undercroft-mage-idle` / `.cb-undercroft-mage-attack` |
| `sewer_king` (Undercroft Overseer boss) | boss | `sprites/undercroft_overseer_idle.png` | `sprites/undercroft_overseer_attack.png` | 6 / 6 | 135×156 / 156×156 | 5–7 | 8–10 | `.cb-undercroft-overseer-idle` / `.cb-undercroft-overseer-attack` |
| `cave_rats` (Crawling Hands) | `crawler` | `sprites/crawling_hands_idle.png` | `sprites/crawling_hands_attack.png` | 6 / 6 | (existing) | 6–8 | 10–12 | `.cb-crawling-hands-*` |

**New Bot:** map `visual: 'spectre'|'mage'` and boss `sewer_king` / undercroft overseer to the `undercroft_*` / `spectre_*` files above. Prefer filename ids over display names.

Concept boards: `art/v3b/monsters/preview_undercroft.png`, `concepts_lineup.png`, `*_idle_concept.png`, `*_attack_concept.png`.

**Art method note:** GenerateImage was unavailable in the art executor; these three were drawn as Option-C-matched painterly low-poly sprites (board grit sampled) + the same transform strip method as the approved pack. Silhouettes are original. Quality bar vs board-cropped `crawling_hands` may read slightly more geometric until GenerateImage pass upgrades them.
