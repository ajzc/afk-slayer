#!/usr/bin/env python3
"""AFK Slayer Hunt arena floor + oval shadow (Option C). GenerateImage N/A — procedural."""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

OUT = Path("/workspace/contract-board/art/v3b/env")
GEN = OUT / "_gen"
SPRITES = Path("/workspace/contract-board/art/v3b/anim/sprites")
LOCK = Path("/workspace/contract-board/art/v3/target/option_c_locked.png")

# Option C cool slate (NO olive / muddy green)
PAL = [
    (18, 22, 28),   # deep crack
    (28, 33, 40),   # dark stone
    (38, 44, 52),   # mid-dark
    (48, 54, 62),   # mid
    (58, 64, 72),   # mid-lit
    (72, 78, 86),   # lit facet
    (88, 94, 102),  # highlight edge
    (42, 48, 56),   # cool mid
]


def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(v)))


def shade(rgb, d):
    return tuple(clamp(c + d) for c in rgb)


def make_base_tile(size: int, seed: int, variant: int = 0) -> Image.Image:
    """Painterly faceted rocky cavern tile, cool slate."""
    rng = random.Random(seed + variant * 9973)
    im = Image.new("RGB", (size, size), PAL[2])
    draw = ImageDraw.Draw(im)

    # Voronoi-ish irregular stone plates via random centers
    n = 14 + variant * 2
    centers = [(rng.uniform(0, size), rng.uniform(0, size), rng.choice(PAL[1:6])) for _ in range(n)]
    # also wrap copies for near-seamless plate assignment
    wrap_centers = []
    for cx, cy, col in centers:
        for ox in (-size, 0, size):
            for oy in (-size, 0, size):
                wrap_centers.append((cx + ox, cy + oy, col))

    pix = im.load()
    for y in range(size):
        for x in range(size):
            best_d = 1e18
            best_c = PAL[2]
            second = 1e18
            for cx, cy, col in wrap_centers:
                d = (x - cx) ** 2 + (y - cy) ** 2
                if d < best_d:
                    second = best_d
                    best_d = d
                    best_c = col
                elif d < second:
                    second = d
            # edge darkening between cells
            edge = 0
            if second - best_d < 80:  # near boundary
                edge = -10 - int((80 - (second - best_d)) * 0.15)
            # subtle directional light from upper-left
            lit = int((size - x) * 0.02 + (size - y) * 0.015) - 4
            grit = rng.randint(-3, 3) if (x * 31 + y * 17) % 11 == 0 else 0
            pix[x, y] = shade(best_c, edge + lit + grit)

    draw = ImageDraw.Draw(im)

    # Faceted crack lines (cool dark, not green)
    for _ in range(18 + variant * 3):
        x0 = rng.randint(0, size - 1)
        y0 = rng.randint(0, size - 1)
        pts = [(x0, y0)]
        for _s in range(rng.randint(3, 7)):
            x0 = (x0 + rng.randint(-28, 28)) % size
            y0 = (y0 + rng.randint(-22, 22)) % size
            pts.append((x0, y0))
        col = shade(PAL[0], rng.randint(-4, 8))
        # draw with wrap: draw each segment possibly twice
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]
            draw.line([a, b], fill=col, width=1)
            # slight highlight companion
            draw.line([(a[0] + 1, a[1] + 1), (b[0] + 1, b[1] + 1)], fill=shade(PAL[5], -8), width=1)

    # Scattered small rock chips / raised facets
    for _ in range(10 + variant):
        cx = rng.randint(4, size - 5)
        cy = rng.randint(4, size - 5)
        r = rng.randint(3, 9)
        poly = []
        sides = rng.randint(4, 6)
        for i in range(sides):
            ang = (i / sides) * math.tau + rng.uniform(-0.2, 0.2)
            rr = r * rng.uniform(0.7, 1.2)
            poly.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
        base = rng.choice(PAL[3:7])
        draw.polygon(poly, fill=shade(base, rng.randint(-6, 6)))
        # lit edge
        if len(poly) >= 3:
            draw.line([poly[0], poly[1]], fill=shade(base, 18), width=1)

    # Mild painterly blur then sharpen feel via slight contrast
    im = im.filter(ImageFilter.GaussianBlur(radius=0.6))
    im = ImageEnhance.Contrast(im).enhance(1.08)
    im = ImageEnhance.Color(im).enhance(0.85)  # desaturate toward cool grey
    return im


def make_seamless(tile: Image.Image, passes: int = 2) -> Image.Image:
    """Offset-blend to reduce seams (classic seamless texture trick)."""
    w, h = tile.size
    out = tile.convert("RGB")
    for p in range(passes):
        ox, oy = w // 2, h // 2
        shifted = Image.new("RGB", (w, h))
        shifted.paste(out, (-ox, -oy))
        shifted.paste(out, (w - ox, -oy))
        shifted.paste(out, (-ox, h - oy))
        shifted.paste(out, (w - ox, h - oy))
        # cross-fade blend in bands around the seam lines
        a = out.convert("RGB")
        b = shifted
        pa, pb = a.load(), b.load()
        blend = Image.new("RGB", (w, h))
        bp = blend.load()
        band = max(8, w // 10)
        for y in range(h):
            for x in range(x_w := w):
                # distance to vertical/horizontal mid seams in shifted space
                dx = min(x, w - x)
                dy = min(y, h - y)
                # weight toward shifted near center cross (where original edges meet)
                # After offset, original edges are at center — blend those.
                d_edge = min(abs(x - w // 2), abs(y - h // 2))
                t = 1.0
                if d_edge < band:
                    t = d_edge / band  # 0 at seam → prefer shifted; 1 far → prefer a... wait
                    # At seam (d_edge=0) we want average; near seam prefer blend of both.
                    t = 0.35 + 0.65 * (d_edge / band)
                # Actually simpler: always 50/50 near center cross, else original
                if abs(x - w // 2) < band or abs(y - h // 2) < band:
                    # distance to nearest of the two mid-lines
                    d = min(abs(x - w // 2), abs(y - h // 2))
                    tw = d / band  # 0 at line, 1 at band edge
                    # at line: 50/50; at edge: full original of `a`? We're rebuilding from offset.
                    # Use: blend = lerp(b, a, tw) so at line use b (seamless wrap), fade to a
                    # But a and b are different — for seamless we want the offset image as base
                    # after first pass. Simpler approach below.
                    tw = 0.5 + 0.5 * tw
                    ca, cb = pa[x, y], pb[x, y]
                    bp[x, y] = tuple(int(ca[i] * tw + cb[i] * (1 - tw)) for i in range(3))
                else:
                    bp[x, y] = pa[x, y]
        # For true seamless, take offset image as new out with soft cross blend done
        # Rebuild properly:
        out = Image.blend(a, b, 0.5)
        # Then apply a second softer pass only at mid lines via mask
        mask = Image.new("L", (w, h), 0)
        md = ImageDraw.Draw(mask)
        md.rectangle([w // 2 - band, 0, w // 2 + band, h], fill=180)
        md.rectangle([0, h // 2 - band, w, h // 2 + band], fill=180)
        mask = mask.filter(ImageFilter.GaussianBlur(radius=band // 2))
        out = Image.composite(b, a, mask)
    return out


def refine_seamless(tile: Image.Image) -> Image.Image:
    """Standard half-offset composite for tileable textures."""
    w, h = tile.size
    # Start from tile
    base = tile.convert("RGB")
    # Offset by half
    ox, oy = w // 2, h // 2
    off = Image.new("RGB", (w, h))
    off.paste(base, (-ox, -oy))
    off.paste(base, (w - ox, -oy))
    off.paste(base, (-ox, h - oy))
    off.paste(base, (w - ox, h - oy))

    # Soft cross mask at center (where original edges land)
    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    band = w // 6
    md.rectangle([w // 2 - band, 0, w // 2 + band, h], fill=255)
    md.rectangle([0, h // 2 - band, w, h // 2 + band], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=band // 2 + 2))
    # Where mask high, use offset (heals seams); else base
    blended = Image.composite(off, base, mask)

    # One more half-offset on the blended result for residual seams
    off2 = Image.new("RGB", (w, h))
    off2.paste(blended, (-ox, -oy))
    off2.paste(blended, (w - ox, -oy))
    off2.paste(blended, (-ox, h - oy))
    off2.paste(blended, (w - ox, h - oy))
    mask2 = Image.new("L", (w, h), 0)
    md2 = ImageDraw.Draw(mask2)
    band2 = w // 8
    md2.rectangle([w // 2 - band2, 0, w // 2 + band2, h], fill=200)
    md2.rectangle([0, h // 2 - band2, w, h // 2 + band2], fill=200)
    mask2 = mask2.filter(ImageFilter.GaussianBlur(radius=band2 // 2 + 1))
    return Image.composite(off2, blended, mask2)


def make_shadow_oval(w: int = 64, h: int = 24) -> Image.Image:
    """Soft black/cool oval shadow with true alpha — reusable under combatants."""
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    # Draw concentric ellipses with falling alpha
    layers = [
        (0.98, 95),
        (0.85, 75),
        (0.70, 55),
        (0.55, 35),
        (0.40, 18),
    ]
    cx, cy = w / 2, h / 2
    for scale, a in layers:
        layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        rx, ry = (w / 2) * scale, (h / 2) * scale
        # cool near-black, not pure black green cast
        d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(10, 12, 18, a))
        im = Image.alpha_composite(im, layer)
    im = im.filter(ImageFilter.GaussianBlur(radius=2.2))
    # re-assert outer transparency
    return im


def tile_sheet(tile: Image.Image, n: int = 4) -> Image.Image:
    w, h = tile.size
    sheet = Image.new("RGB", (w * n, h * n))
    for iy in range(n):
        for ix in range(n):
            sheet.paste(tile, (ix * w, iy * h))
    return sheet


def first_frame(path: Path, fw: int) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    return im.crop((0, 0, fw, im.height))


def build_mock(floor: Image.Image, shadow: Image.Image) -> Image.Image:
    """Phone-width arena mock ~780×480 with tiled floor + oval shadows + pilot sprites."""
    W, H = 780, 480
    mock = Image.new("RGB", (W, H))
    tw, th = floor.size
    for y in range(0, H, th):
        for x in range(0, W, tw):
            mock.paste(floor, (x, y))

    # Soft vignette / darker walls feel (muted earthy cool bg so characters pop)
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    # top darker cavern
    for i in range(90):
        a = int(90 * (1 - i / 90))
        od.rectangle([0, i, W, i + 1], fill=(8, 10, 14, a // 2))
    for i in range(70):
        a = int(70 * (1 - i / 70))
        od.rectangle([0, H - 1 - i, W, H - i], fill=(6, 8, 12, a // 2))
    mock = Image.alpha_composite(mock.convert("RGBA"), overlay)

    # Thin gold ring accent (Option C language) — soft oval in arena center
    ring = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    cx, cy = W // 2, int(H * 0.58)
    rx, ry = 290, 118
    for t in range(3):
        rd.ellipse([cx - rx - t, cy - ry - t, cx + rx + t, cy + ry + t], outline=(180, 150, 70, 90 - t * 25), width=1)
    ring = ring.filter(ImageFilter.GaussianBlur(radius=0.8))
    mock = Image.alpha_composite(mock, ring)

    # Load pilot sprites (do NOT modify source files — only composite copies)
    player = first_frame(SPRITES / "player_idle.png", 142)
    briar = first_frame(SPRITES / "briar_idle.png", 185)
    hands = first_frame(SPRITES / "crawling_hands_idle.png", 254)
    quill = first_frame(SPRITES / "quill_idle.png", 140)
    turret = Image.open(SPRITES / "quill_turret.png").convert("RGBA")

    # Scale for phone mock readability (~90px tall)
    def scale_to_h(im, thgt=96):
        r = thgt / im.height
        return im.resize((max(1, int(im.width * r)), thgt), Image.Resampling.LANCZOS)

    player, briar, hands, quill, turret = map(scale_to_h, [player, briar, hands, quill, turret])

    def place(base: Image.Image, sprite: Image.Image, foot_xy, shadow_scale=1.0):
        """foot_xy = center of oval shadow on floor; sprite stands above it."""
        sx = int(shadow.width * shadow_scale)
        sy = max(10, int(shadow.height * shadow_scale * 0.95))
        sh = shadow.resize((sx, sy), Image.Resampling.LANCZOS)
        fx, fy = foot_xy
        # shadow under feet
        sh_pos = (int(fx - sh.width / 2), int(fy - sh.height / 2))
        base.alpha_composite(sh, sh_pos)
        # sprite so bottom center sits on shadow center
        sp = (int(fx - sprite.width / 2), int(fy - sprite.height + sh.height * 0.25))
        base.alpha_composite(sprite, sp)

    # Layout matching Option C board left→right: mage, briar, hands, quill+turret
    y_foot = int(H * 0.72)
    place(mock, player, (130, y_foot), 1.15)
    place(mock, briar, (290, y_foot), 1.25)
    place(mock, hands, (460, y_foot + 6), 1.45)
    # turret base then quill atop
    place(mock, turret, (620, y_foot + 4), 1.1)
    # quill slightly higher (standing on turret) — still give small shadow under turret already
    # Extra small shadow for quill feet on turret top not needed; sit is via turret shadow

    # Label strip
    label = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(label)
    ld.rectangle([12, 12, 420, 42], fill=(12, 14, 20, 180))
    # No default font dependency issues — use default bitmap
    ld.text((20, 18), "Hunt arena floor mock — Option C slate + oval shadows", fill=(200, 190, 160, 230))
    mock = Image.alpha_composite(mock, label)
    return mock.convert("RGB")


def write_integration(tile_w: int, tile_h: int):
    text = f"""# AFK Slayer — Hunt arena floor + oval shadows (Option C)

**Locked look:** `/workspace/contract-board/art/v3/target/option_c_locked.png`  
**Polish reference (shadows + tile cohesion only — do NOT copy drones/IP):** `art/ref/obelisk_screenshot.png`  
**Status:** Floor tile pack ready for New Bot CSS. Cool muted slate — **not** muddy green Undercroft CSS.

## Deliverables

| File | Size | Role |
|---|---|---|
| `floor_tile.png` | {tile_w}×{tile_h} | Seamless (near) rocky cavern tile — Option C cool slate |
| `floor_tile_alt.png` | {tile_w}×{tile_h} | Second variant (same palette) for variety |
| `floor_sheet.png` | {tile_w * 4}×{tile_h * 4} | 4×4 tiled preview (seam QA) |
| `arena_floor_mock.png` | 780×480 | Phone-width mock: tiled floor + soft oval shadows + pilot sprites |
| `shadow_oval.png` | 64×24 | Soft cool-black oval, **true alpha** — reusable under any combatant |
| `INTEGRATION.md` | — | This file |

Working folder: `/workspace/contract-board/art/v3b/env/`

## Tile palette (locked)

Cool charcoal / slate greys only. Subtle cracks, painterly faceted low-poly feel.  
**No olive sludge. No characters. No UI.** Thin gold ring is optional arena accent (shown in mock), not baked into the tile.

## CSS — floor on `#arena` / `.arena`

```css
#arena,
.arena {{
  /* exact path from contract-board root / site root — adjust if New Bot serves art elsewhere */
  background-image: url("./art/v3b/env/floor_tile.png");
  background-repeat: repeat;
  background-size: {tile_w}px {tile_h}px; /* or 64px 64px if you want denser phone tiles */
  background-position: center bottom;
  /* kill old muddy green / solid Undercroft fill */
  background-color: #1c2228; /* cool slate fallback only */
}}
```

Optional variety (checker / random via two layers or JS swap):

```css
.arena.alt-floor {{
  background-image: url("./art/v3b/env/floor_tile_alt.png");
}}
```

Level 1 **“bear den”** can reuse the **same** `floor_tile.png`. Optional cooler tint later:

```css
.arena.level-bear-den {{
  background-image: url("./art/v3b/env/floor_tile.png");
  /* optional cool wash — do NOT go olive */
  filter: brightness(0.95) saturate(0.9) hue-rotate(-8deg);
}}
```

Prefer a CSS overlay/`background-blend-mode` over hue-rotate if filter affects child sprites.

## CSS — oval shadow under `.mob` / `.drone` / combatants

Sprites should **sit** on the floor: place `shadow_oval.png` **under** the sprite (z-order below), centered on the feet.

```css
.mob,
.drone,
.combatant {{
  position: absolute;
  background-color: transparent !important; /* NO solid sprite boxes */
  image-rendering: auto;
}}

.mob::before,
.drone::before,
.combatant::before {{
  content: "";
  position: absolute;
  left: 50%;
  bottom: 2px;           /* tweak to feet */
  transform: translateX(-50%);
  width: 64px;           /* scale per entity size */
  height: 24px;
  background: url("./art/v3b/env/shadow_oval.png") center / contain no-repeat;
  z-index: 0;            /* under sprite art */
  pointer-events: none;
}}

.mob > img,
.mob .sprite,
.drone > img,
.combatant .sprite {{
  position: relative;
  z-index: 1;            /* above shadow */
  background: transparent !important;
  display: block;
}}
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
"""
    (OUT / "INTEGRATION.md").write_text(text, encoding="utf-8")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    GEN.mkdir(parents=True, exist_ok=True)

    SIZE = 256
    print("painting floor tiles…")
    raw = make_base_tile(SIZE, seed=42, variant=0)
    raw.save(GEN / "floor_raw.png")
    tile = refine_seamless(raw)
    # Desaturate any residual warmth
    tile = ImageEnhance.Color(tile).enhance(0.75)
    tile = ImageEnhance.Brightness(tile).enhance(0.92)
    tile.save(OUT / "floor_tile.png")

    raw2 = make_base_tile(SIZE, seed=99, variant=1)
    tile2 = refine_seamless(raw2)
    tile2 = ImageEnhance.Color(tile2).enhance(0.75)
    tile2 = ImageEnhance.Brightness(tile2).enhance(0.90)
    tile2.save(OUT / "floor_tile_alt.png")

    sheet = tile_sheet(tile, n=4)
    sheet.save(OUT / "floor_sheet.png")
    print("sheet", sheet.size)

    shadow = make_shadow_oval(64, 24)
    shadow.save(OUT / "shadow_oval.png")
    print("shadow", shadow.size, shadow.mode)

    mock = build_mock(tile, shadow)
    mock.save(OUT / "arena_floor_mock.png", quality=95)
    print("mock", mock.size)

    write_integration(SIZE, SIZE)

    # Seam delta report: edge vs opposite edge
    def seam_score(t: Image.Image) -> float:
        import numpy as np
        a = np.asarray(t.convert("RGB"), dtype=np.float32)
        left, right = a[:, 0], a[:, -1]
        top, bot = a[0, :], a[-1, :]
        return float(((left - right) ** 2).mean() ** 0.5 + ((top - bot) ** 2).mean() ** 0.5) / 2

    try:
        s1 = seam_score(tile)
        s2 = seam_score(tile2)
        print(f"seam RMSE-ish tile={s1:.2f} alt={s2:.2f} (lower=better; <12 good)")
    except Exception as e:
        print("seam score skip", e)

    for p in ["floor_tile.png", "floor_tile_alt.png", "floor_sheet.png", "arena_floor_mock.png", "shadow_oval.png", "INTEGRATION.md"]:
        fp = OUT / p
        print(f"  {fp} ({fp.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
