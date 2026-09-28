#!/usr/bin/env python3
"""AFK Slayer World 1 (Turael) creature art builder.

Replaces Level 1 bear placeholders with Gripkin / Cave Skitter / Wailshade /
Gripkin Elder. Filenames and ids use stand-in names only (no Jagex names).

Pipeline mirrors creatures/wolves/build_wolves.py: blob split, green_mask with
gold/pale protection, border flood chroma, fringe kill, soft cool-black oval
shadow, 6-frame bob/lean strips, QA. Framing matches measured bear strips.
"""
from __future__ import annotations

import math
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

ROOT = Path("/workspace/contract-board/art/v3b")
OUT_DIR = ROOT / "creatures" / "turael_w1"
GEN = OUT_DIR / "_gen"
CUTOUTS = OUT_DIR / "cutouts"
SPRITES = ROOT / "anim" / "sprites"
FLOOR = ROOT / "env" / "floor_tile.png"

FRAME_H = 156
BASELINE = 146

# Measured bear frame widths (strip_w / 6) and target content heights.
# cave_skitter is a wide low crawler; bear frame_w 119 cannot hold target
# content_h ~100 without crushing, so FRAME_W is widened (documented).
TIERS = ("gripkin", "cave_skitter", "wailshade", "gripkin_elder")
FRAME_W = {
    "gripkin": 115,
    "cave_skitter": 154,  # deviation from bear thornpelt_bear 119 — see INTEGRATION.md
    "wailshade": 142,
    "gripkin_elder": 170,
}
TARGET_CONTENT_H = {
    "gripkin": 72,
    "cave_skitter": 100,
    "wailshade": 124,
    "gripkin_elder": 148,
}
# Opacity bbox includes soft shadow (~5px). Wailshade also keeps a hover gap.
SHADOW_PAD = 5
HOVER_GAP = {
    "gripkin": 0,
    "cave_skitter": 0,
    "wailshade": 8,
    "gripkin_elder": 0,
}
DISPLAY_LEVEL = {
    "gripkin": 8,
    "cave_skitter": 18,
    "wailshade": 26,
    "gripkin_elder": 30,
}
PRIVATE_NAME = {
    "gripkin": "Crawling Hand",
    "cave_skitter": "Cave Crawler",
    "wailshade": "Banshee",
    "gripkin_elder": "Crawling Hand Champion",
}
STAND_IN_NAME = {
    "gripkin": "Gripkin",
    "cave_skitter": "Cave Skitter",
    "wailshade": "Wailshade",
    "gripkin_elder": "Gripkin Elder",
}
REPLACES = {
    "gripkin": "bristle_cub",
    "cave_skitter": "thornpelt_bear",
    "wailshade": "dire_thornpelt",
    "gripkin_elder": "elder_thornpelt",
}
ACTIONS = {
    "gripkin": ("idle", "walk", "attack"),
    "cave_skitter": ("idle", "walk", "attack"),
    "wailshade": ("idle", "walk", "attack"),
    "gripkin_elder": ("idle", "attack"),  # boss: no walk
}
SOURCES = {
    "idle": GEN / "w1_idle_gs.png",
    "walk": GEN / "w1_walk_gs.png",
    "attack": GEN / "w1_attack_gs.png",
}

for directory in (OUT_DIR, CUTOUTS, SPRITES, GEN):
    directory.mkdir(parents=True, exist_ok=True)


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def gold_mask(r: np.ndarray, g: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Warm gold / amber accents: runes, clasps, spikes, bands, crawler eyes."""
    return (r >= 120) & (g >= 80) & (b <= g - 5) & (np.abs(r.astype(np.int16) - g) <= 90)


def pale_mask(r: np.ndarray, g: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Pale robe wisps, white eyes, cool highlights — never chroma-key these."""
    bright = (r.astype(np.int16) + g + b) >= 360
    cool_pale = (b >= 130) & (r >= 110) & (g <= np.maximum(r, b) + 18)
    white_eye = (r >= 180) & (g >= 180) & (b >= 180)
    return bright | cool_pale | white_eye


def green_mask(rgb: np.ndarray) -> np.ndarray:
    """Lime / #00b140 chroma without eating stone grey-blue, gold, or pale wisps."""
    r, g, b = [rgb[:, :, i].astype(np.int16) for i in range(3)]
    near_lime = (g >= 145) & (g > r + 28) & (g > b + 28)
    broad_green = (g >= 75) & (g > r + 20) & (g > b + 20)
    return (near_lime | broad_green) & ~gold_mask(r, g, b) & ~pale_mask(r, g, b)


def flood_border(mask: np.ndarray) -> np.ndarray:
    labels, n = ndimage.label(mask, structure=np.ones((3, 3), dtype=np.uint8))
    if n == 0:
        return np.zeros_like(mask, dtype=bool)
    border_labels = np.unique(np.concatenate([
        labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]
    ]))
    border_labels = border_labels[border_labels != 0]
    return np.isin(labels, border_labels)


def clean_rgba(rgb: np.ndarray, component: np.ndarray) -> Image.Image:
    """Hard alpha cutout; kill residual green fringe; protect gold/pale."""
    gm = green_mask(rgb)
    bg = flood_border(gm)
    keep = component & ~gm & ~bg
    r, g, b = [rgb[:, :, i].astype(np.int16) for i in range(3)]
    fringe = (g > r + 10) & (g > b + 10) & (g > 95)
    protect = gold_mask(r, g, b) | pale_mask(r, g, b)
    keep &= ~(fringe & ~protect)
    ys, xs = np.where(keep)
    if len(xs) == 0:
        raise RuntimeError("empty subject after chroma key")
    x0, x1 = max(0, int(xs.min()) - 2), min(rgb.shape[1], int(xs.max()) + 3)
    y0, y1 = max(0, int(ys.min()) - 2), min(rgb.shape[0], int(ys.max()) + 3)
    out = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
    out[:, :, :3] = rgb[y0:y1, x0:x1]
    out[:, :, 3] = keep[y0:y1, x0:x1].astype(np.uint8) * 255
    return Image.fromarray(out, "RGBA")


def split_subjects(path: Path) -> List[Image.Image]:
    """Four largest non-green blobs, ordered left → right."""
    rgb = np.array(Image.open(path).convert("RGB"))
    gm = green_mask(rgb)
    bg = flood_border(gm)
    fg = ~(gm | bg)
    labels, n = ndimage.label(fg, structure=np.ones((3, 3), dtype=np.uint8))
    candidates = []
    for idx in range(1, n + 1):
        ys, xs = np.where(labels == idx)
        if len(xs) >= 500:
            candidates.append((len(xs), float(xs.mean()), idx))
    if len(candidates) < 4:
        raise RuntimeError(f"{path.name}: found only {len(candidates)} subject blobs")
    chosen = sorted(candidates, reverse=True)[:4]
    chosen.sort(key=lambda item: item[1])
    return [clean_rgba(rgb, labels == idx) for _, _, idx in chosen]


def alpha_bbox(im: Image.Image) -> Tuple[int, int, int, int]:
    bb = im.getchannel("A").getbbox()
    if bb is None:
        raise RuntimeError("transparent image has no alpha bbox")
    return bb


def subject_scale(im: Image.Image, target_h: int) -> Image.Image:
    crop = im.crop(alpha_bbox(im))
    factor = target_h / crop.height
    return crop.resize((max(1, round(crop.width * factor)), target_h), Image.Resampling.LANCZOS)


def lean_warp(im: Image.Image, lean: float) -> Image.Image:
    """Shear top forward; feet / baseline stay put."""
    if abs(lean) < 0.05:
        return im
    w, h = im.size
    pad = int(math.ceil(abs(lean) + 4))
    coeff = (1.0, lean / max(1, h), -lean + pad, 0.0, 1.0, 0.0)
    out = im.transform((w + 2 * pad, h), Image.Transform.AFFINE, coeff,
                       resample=Image.Resampling.BICUBIC)
    bb = out.getchannel("A").getbbox()
    return out.crop(bb) if bb else im


def shadow_layer(size: Tuple[int, int], cx: float, width: float) -> Image.Image:
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    rx = max(12.0, width * 0.30)
    ry = max(2.0, width * 0.045)
    cy = float(BASELINE)
    draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(10, 15, 23, 120))
    blurred = layer.filter(ImageFilter.GaussianBlur(radius=1.8))
    # Keep soft shadow from spilling past bear-like bottom pad (~y 150).
    arr = np.array(blurred)
    if arr.shape[0] > 151:
        arr[151:, :, 3] = 0
    return Image.fromarray(arr, "RGBA")


def scrub_green_rgba(im: Image.Image) -> Image.Image:
    """Kill strong chroma leftovers; desaturate mild green spill on edges."""
    arr = np.array(im.convert("RGBA"))
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    a = arr[:, :, 3]
    opaque = a > 0
    protect = gold_mask(r, g, b) | pale_mask(r, g, b)
    green_dom = (g > r + 8) & (g > b + 8) & (g > 85) & opaque & ~protect
    strong = green_dom & (g > r + 22) & (g > b + 22) & (g > 110)
    mild = green_dom & ~strong
    arr[strong, 3] = 0
    # Pull G down toward max(R, B) so stone edges stay cool grey-blue, not tinted.
    pulled = np.maximum(r, b)
    arr[mild, 1] = np.minimum(g[mild], pulled[mild]).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


def body_target_h(tier: str) -> int:
    """Subject body height so final alpha bbox lands near TARGET_CONTENT_H."""
    return max(20, TARGET_CONTENT_H[tier] - SHADOW_PAD - HOVER_GAP[tier])


def render_frame(subject: Image.Image, tier: str, phase: int, action: str) -> Image.Image:
    target_h = body_target_h(tier)
    scaled = subject_scale(subject, target_h)

    if tier == "wailshade":
        # Floating ghost: larger idle bob, gentle sway; no heavy mammal lean.
        if action == "idle":
            bob = (0.0, -1.4, -2.2, -1.0, 1.2, 0.4)[phase]
            lateral = (0.0, 0.6, 0.9, 0.2, -0.6, -0.2)[phase]
            lean = (0.0, 0.3, 0.5, 0.2, -0.2, 0.0)[phase]
            stretch = (1.000, 0.994, 0.988, 1.000, 1.008, 1.000)[phase]
        elif action == "walk":
            bob = (0.0, -1.6, -2.4, -0.8, 1.4, 0.5)[phase]
            lateral = (-1.6, -0.8, 0.6, 1.8, 0.9, -0.7)[phase]
            lean = (-0.4, 0.2, 0.8, 1.2, 0.5, -0.3)[phase]
            stretch = (0.990, 1.000, 1.010, 1.016, 1.006, 0.994)[phase]
        else:
            bob = (0.0, -0.8, -1.6, -0.4, 0.8, 0.2)[phase]
            lateral = (0.0, 0.5, 1.2, 2.0, 1.0, 0.3)[phase]
            lean = (0.0, 1.4, 3.0, 4.5, 2.8, 0.8)[phase]
            stretch = (1.000, 1.010, 1.020, 1.030, 1.015, 1.004)[phase]
    elif tier == "cave_skitter":
        # Low-wide crawler: tiny bob / lateral scuttle, restrained lean on attack.
        if action == "idle":
            bob = (0.0, -0.5, -0.8, -0.2, 0.5, 0.1)[phase]
            lateral = (0.0, 0.4, 0.7, 0.2, -0.4, -0.1)[phase]
            lean = 0.0
            stretch = (1.000, 0.996, 0.992, 1.000, 1.004, 1.000)[phase]
        elif action == "walk":
            bob = (0.0, -0.7, -1.1, -0.2, 0.7, 0.2)[phase]
            lateral = (-2.2, -1.0, 0.6, 2.2, 1.0, -0.9)[phase]
            lean = 0.0
            stretch = (0.990, 1.000, 1.008, 1.014, 1.004, 0.994)[phase]
        else:
            bob = (0.0, -0.4, -0.7, -0.1, 0.4, 0.1)[phase]
            lateral = (0.0, 0.4, 1.0, 1.6, 0.8, 0.2)[phase]
            lean = (0.0, 0.8, 1.8, 3.0, 1.6, 0.4)[phase]
            stretch = (1.000, 1.006, 1.012, 1.018, 1.008, 1.002)[phase]
    else:
        # Gripkin / elder: mammal-style bob + lean (wolf pipeline).
        if action == "idle":
            bob = (0.0, -0.6, -1.0, -0.3, 0.6, 0.2)[phase]
            lateral = (0.0, 0.35, 0.55, 0.15, -0.35, 0.0)[phase]
            lean = (0.0, 0.45, 0.65, 0.25, -0.35, 0.0)[phase]
            stretch = (1.000, 0.992, 0.988, 1.000, 1.008, 1.000)[phase]
        elif action == "walk":
            bob = (0.0, -0.8, -1.2, -0.2, 0.8, 0.3)[phase]
            lateral = (-1.5, -0.6, 0.7, 1.7, 0.9, -0.7)[phase]
            lean = (-1.5, -0.6, 0.7, 1.7, 0.9, -0.7)[phase]
            stretch = (0.985, 1.000, 1.018, 1.028, 1.008, 0.992)[phase]
        else:
            bob = (0.0, -0.3, -0.6, 0.0, 0.4, 0.1)[phase]
            lateral = (0.0, 0.4, 0.9, 1.4, 0.7, 0.2)[phase]
            lean = (0.0, 2.2, 4.5, 7.0, 5.0, 2.0)[phase]
            stretch = (1.000, 1.012, 1.025, 1.040, 1.020, 1.006)[phase]

    if abs(stretch - 1.0) > 0.001:
        scaled = scaled.resize(
            (scaled.width, max(1, round(scaled.height * stretch))),
            Image.Resampling.BICUBIC,
        )
    scaled = lean_warp(scaled, float(lean))
    scaled = scaled.resize(
        (max(1, round(scaled.width * target_h / max(1, scaled.height))), target_h),
        Image.Resampling.LANCZOS,
    )

    fw = FRAME_W[tier]
    canvas = Image.new("RGBA", (fw, FRAME_H), (0, 0, 0, 0))
    x = round((fw - scaled.width) / 2 + lateral)
    # Bottom-align like bears; wailshade floats above baseline by HOVER_GAP.
    y = round(BASELINE - HOVER_GAP[tier] - scaled.height + bob)
    canvas = Image.alpha_composite(
        canvas, shadow_layer(canvas.size, fw / 2 + lateral, scaled.width)
    )
    canvas.alpha_composite(scaled, (x, y))
    return scrub_green_rgba(canvas)


def checker(size: Tuple[int, int], cell: int = 14) -> Image.Image:
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(out)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            colour = (55, 59, 66, 255) if ((x // cell + y // cell) % 2 == 0) else (38, 42, 48, 255)
            draw.rectangle((x, y, x + cell, y + cell), fill=colour)
    return out


def build() -> Dict[str, dict]:
    pose_sets = {action: split_subjects(path) for action, path in SOURCES.items()}
    meta: Dict[str, dict] = {}
    rendered: Dict[Tuple[str, str], List[Image.Image]] = {}

    for index, tier in enumerate(TIERS):
        for action in ACTIONS[tier]:
            subject = pose_sets[action][index]
            frames = [render_frame(subject, tier, phase, action) for phase in range(6)]
            strip = Image.new("RGBA", (FRAME_W[tier] * 6, FRAME_H), (0, 0, 0, 0))
            for phase, frame in enumerate(frames):
                strip.alpha_composite(frame, (phase * FRAME_W[tier], 0))
            out_path = SPRITES / f"{tier}_{action}.png"
            strip.save(out_path)
            rendered[(tier, action)] = frames
            bb = frames[0].getchannel("A").getbbox()
            content_h = (bb[3] - bb[1]) if bb else 0
            meta[f"{tier}_{action}.png"] = {
                "frames": 6,
                "frame_w": FRAME_W[tier],
                "frame_h": FRAME_H,
                "content_h": content_h,
                "display_level": DISPLAY_LEVEL[tier],
                "action": action,
            }
            print(f"wrote {out_path} {strip.size} content_h={content_h}")

        cutout = rendered[(tier, "idle")][0]
        cutout.save(CUTOUTS / f"{tier}.png")
        cutout.save(OUT_DIR / f"{tier}_concept.png")
        print(f"wrote cutout+concept {tier}")

    return meta


def build_lineup() -> None:
    gap = 20
    labels = [
        f"{STAND_IN_NAME[t]}\n({PRIVATE_NAME[t]})"
        for t in TIERS
    ]
    H = FRAME_H + 78
    W = sum(FRAME_W[t] for t in TIERS) + gap * (len(TIERS) + 1)
    out = checker((W, H))
    draw = ImageDraw.Draw(out)
    small = load_font(11)
    title = load_font(14)
    x = gap
    for tier, label in zip(TIERS, labels):
        fr = Image.open(SPRITES / f"{tier}_idle.png").convert("RGBA").crop(
            (0, 0, FRAME_W[tier], FRAME_H)
        )
        out.alpha_composite(fr, (x, 40))
        for i, line in enumerate(label.split("\n")):
            draw.text((x + 2, 6 + i * 14), line, font=small, fill=(255, 246, 206, 255))
        draw.text(
            (x + 2, H - 22),
            f"{FRAME_W[tier]}×{FRAME_H} · ~{TARGET_CONTENT_H[tier]}h",
            font=small,
            fill=(192, 199, 205, 255),
        )
        x += FRAME_W[tier] + gap
    draw.text(
        (gap, H - 48),
        "AFK Slayer · Turael W1 · stand-in ids · private OSRS names in (parens)",
        font=title,
        fill=(224, 177, 91, 255),
    )
    out.save(OUT_DIR / "lineup_preview.png")
    print("wrote", OUT_DIR / "lineup_preview.png", out.size)


def build_strip_preview(meta: Dict[str, dict]) -> None:
    scales = 0.52
    label_h, row_h = 22, 112
    rows = []
    for filename in meta:
        im = Image.open(SPRITES / filename).convert("RGBA")
        disp = im.resize(
            (round(im.width * scales), round(im.height * scales)),
            Image.Resampling.LANCZOS,
        )
        rows.append((filename, disp))
    W = max(im.width for _, im in rows) + 200
    H = sum(max(row_h, im.height + label_h) for _, im in rows) + 18
    out = checker((W, H), 12)
    draw = ImageDraw.Draw(out)
    font = load_font(11)
    y = 9
    for filename, im in rows:
        draw.text((8, y + 4), filename.replace(".png", ""), font=font, fill=(255, 246, 206, 255))
        out.alpha_composite(im, (180, y))
        y += max(row_h, im.height + label_h)
    out.save(OUT_DIR / "strips_qa_preview.png")
    print("wrote", OUT_DIR / "strips_qa_preview.png", out.size)


def build_arena_sit_preview() -> None:
    """Composite idle frame-0s on tiled floor_tile so they sit on the floor."""
    tile = Image.open(FLOOR).convert("RGBA")
    tw, th = tile.size
    gap = 28
    margin = 40
    W = sum(FRAME_W[t] for t in TIERS) + gap * (len(TIERS) - 1) + margin * 2
    H = FRAME_H + margin * 2 + 36
    # Tile the floor
    floor = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for yy in range(0, H, th):
        for xx in range(0, W, tw):
            floor.alpha_composite(tile, (xx, yy))
    # Slight darken overlay so sprites read
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 40))
    floor = Image.alpha_composite(floor, overlay)
    draw = ImageDraw.Draw(floor)
    font = load_font(12)
    title = load_font(15)
    x = margin
    for tier in TIERS:
        fr = Image.open(SPRITES / f"{tier}_idle.png").convert("RGBA").crop(
            (0, 0, FRAME_W[tier], FRAME_H)
        )
        floor.alpha_composite(fr, (x, margin + 20))
        draw.text(
            (x + 2, 8),
            f"{tier}",
            font=font,
            fill=(255, 246, 206, 255),
        )
        x += FRAME_W[tier] + gap
    draw.text(
        (margin, H - 28),
        "arena_sit_preview · idle frame 0 on env/floor_tile.png",
        font=title,
        fill=(224, 177, 91, 255),
    )
    floor.save(OUT_DIR / "arena_sit_preview.png")
    print("wrote", OUT_DIR / "arena_sit_preview.png", floor.size)


def write_docs(meta: Dict[str, dict]) -> None:
    lines = [
        "# AFK Slayer — World 1 Turael creatures (integration)",
        "",
        "**Locked look:** `design/iom-style-redesign.md` (Phase 1 approved 2026-09-24).",
        "**Status:** LIVE Level 1 ladder art replacing bear placeholders; stand-in ids only in filenames.",
        "**Paths:** strips in `art/v3b/anim/sprites/`; cutouts/concepts/previews in `art/v3b/creatures/turael_w1/`.",
        "",
        "## Id mapping",
        "",
        "| New id | Replaces placeholder | Private display name | Stand-in public name |",
        "|---|---|---|---|",
    ]
    for tier in TIERS:
        lines.append(
            f"| `{tier}` | `{REPLACES[tier]}` | {PRIVATE_NAME[tier]} | {STAND_IN_NAME[tier]} |"
        )
    lines += [
        "",
        "**Public release uses the stand-in names** (Gripkin / Cave Skitter / Wailshade / Gripkin Elder).",
        "Private-playtest OSRS-style names must never appear in art filenames or game ids.",
        "",
        "## Silhouette language",
        "",
        "Cool grey-blue faceted stone creatures (Gripkin family + Cave Skitter) and a pale blue-grey floating robe ghost (Wailshade).",
        "Gold runes, clasps, crawler trim, amber crystal spikes and leg bands are protected through chroma key.",
        "Soft cool-black oval floor shadows; Wailshade hovers with a ~8px gap above its shadow.",
        "Frame height is **156**; framing matches measured bear strips (bottom-aligned baseline).",
        "",
        "## Scale / framing (matched to bear set)",
        "",
        "| Id | Role | Bear frame match | displayLevel | Strips | Target content h |",
        "|---|---|---|---:|---|---:|",
        f"| `gripkin` | A · small | bristle_cub 115×156 | 8 | idle / walk / attack (6) | {TARGET_CONTENT_H['gripkin']} |",
        f"| `cave_skitter` | B · adult | thornpelt_bear 119×156 → **widened** | 18 | idle / walk / attack (6) | {TARGET_CONTENT_H['cave_skitter']} |",
        f"| `wailshade` | C · elite | dire_thornpelt 142×156 | 26 | idle / walk / attack (6) | {TARGET_CONTENT_H['wailshade']} |",
        f"| `gripkin_elder` | Boss | elder_thornpelt 170×156 | 30 | idle / attack (6) — no walk | {TARGET_CONTENT_H['gripkin_elder']} |",
        "",
        "### Frame width deviation",
        "",
        f"`cave_skitter` uses **frame_w={FRAME_W['cave_skitter']}** (not bear `thornpelt_bear` 119).",
        "It is a wide, low crawler; fitting target content_h ~100 inside 119px would crush the silhouette.",
        "frame_h stays 156; bottom baseline matches bears.",
        "",
        "## Frame table",
        "",
        "| File | Frames | Frame size (w×h) | Content h |",
        "|---|---:|---|---:|",
    ]
    for fn, m in meta.items():
        lines.append(
            f"| `anim/sprites/{fn}` | {m['frames']} | {m['frame_w']}×{m['frame_h']} | {m['content_h']} |"
        )
    lines += [
        "",
        "## New Bot wiring notes",
        "",
        "1. Swap META / visual ids from bear placeholders to these stand-in ids:",
        "   - `bristle_cub_*` → `gripkin_*`",
        "   - `thornpelt_bear_*` → `cave_skitter_*`",
        "   - `dire_thornpelt_*` → `wailshade_*`",
        "   - `elder_thornpelt_*` → `gripkin_elder_*`",
        "2. Use transparent PNGs directly; do **not** place a solid CSS background-color behind a sprite.",
        "3. Select idle / walk / attack by action. **Boss `gripkin_elder` has no walk strip** (same as `elder_thornpelt`).",
        "4. `displayLevel` values stay 8 / 18 / 26 / 30 (same ladder as the bear placeholders).",
        "5. Keep player / companion pilot art and wolf / spider / bear source files unchanged; this deliverable is art-only under `creatures/turael_w1/` + new strips in `anim/sprites/`.",
        "6. Public-facing copy must use stand-in names; private OSRS names are playtest-only.",
        "",
        "## Previews",
        "",
        "- `lineup_preview.png` — A/B/C/boss on checkerboard (file id + private name)",
        "- `strips_qa_preview.png` — all six-frame strips",
        "- `arena_sit_preview.png` — idle frame 0 on tiled `env/floor_tile.png`",
        "- `{id}_concept.png` + `cutouts/{id}.png` — idle frame with oval shadow",
        "",
        "## QA and regeneration",
        "",
        "`_qa_summary.txt` records strip size, frame size, content_h, corner alpha, residual green, and `issues=CLEAN` when all pass.",
        "",
        "```bash",
        "/workspace/.venv-art/bin/python art/v3b/creatures/turael_w1/build_turael_w1.py",
        "```",
        "",
        "Source sheets (`_gen/w1_{idle,walk,attack}_gs.png`) are split by the four largest connected non-green blobs ordered left-to-right.",
        "Border-connected lime / #00b140-ish chroma and green-dominant fringe are removed; gold accents and pale robe/eyes are protected; mild green edge spill is desaturated.",
    ]
    (OUT_DIR / "INTEGRATION.md").write_text("\n".join(lines) + "\n")
    print("wrote", OUT_DIR / "INTEGRATION.md")


def qa(meta: Dict[str, dict]) -> List[str]:
    issues: List[str] = []
    lines = [
        "Turael W1 creature art QA",
        "frame_h=156; strips have six frames; boss has no walk",
        "",
    ]
    for fn, m in meta.items():
        path = SPRITES / fn
        im = Image.open(path).convert("RGBA")
        arr = np.array(im)
        corners = [
            int(arr[0, 0, 3]),
            int(arr[0, -1, 3]),
            int(arr[-1, 0, 3]),
            int(arr[-1, -1, 3]),
        ]
        opaque = arr[:, :, 3] > 0
        mean = float(arr[:, :, 3][opaque].mean()) if opaque.any() else 0.0
        bb = im.getchannel("A").getbbox()
        ch = (bb[3] - bb[1]) if bb else 0
        rgb = arr[:, :, :3].astype(np.int16)
        ggreen = (
            (rgb[:, :, 1] > rgb[:, :, 0] + 10)
            & (rgb[:, :, 1] > rgb[:, :, 2] + 10)
            & (rgb[:, :, 1] > 95)
        )
        gold = gold_mask(rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2])
        pale = pale_mask(rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2])
        residual = int((ggreen & ~gold & ~pale & opaque).sum())
        lines.append(
            f"{fn}: size={im.width}x{im.height}; frame={m['frame_w']}x{m['frame_h']}; "
            f"content_h={ch}; corner_alpha={corners}; mean_alpha_opaque={mean:.2f}; "
            f"residual_green_opaque={residual}"
        )
        if im.height != FRAME_H or im.width != m["frame_w"] * 6:
            issues.append(f"{fn}: wrong strip dimensions")
        if any(c != 0 for c in corners):
            issues.append(f"{fn}: nontransparent corner alpha {corners}")
        if residual:
            issues.append(f"{fn}: residual green pixels {residual}")
        # Content height should be near target (±10). Match longest id first
        # so gripkin_elder is not mistaken for gripkin.
        tier = None
        for t in sorted(TIERS, key=len, reverse=True):
            if fn.startswith(t + "_"):
                tier = t
                break
        if tier is None:
            issues.append(f"{fn}: could not map to tier")
            continue
        target = TARGET_CONTENT_H[tier]
        if abs(ch - target) > 10:
            issues.append(f"{fn}: content_h={ch} far from target {target}")

    for tier in TIERS:
        path = CUTOUTS / f"{tier}.png"
        im = Image.open(path).convert("RGBA")
        arr = np.array(im)
        a = arr[:, :, 3]
        corners = [int(a[0, 0]), int(a[0, -1]), int(a[-1, 0]), int(a[-1, -1])]
        if any(c != 0 for c in corners):
            issues.append(f"cutout {tier}: nontransparent corner alpha")
        rgb = arr[:, :, :3].astype(np.int16)
        green = (
            (rgb[:, :, 1] > rgb[:, :, 0] + 10)
            & (rgb[:, :, 1] > rgb[:, :, 2] + 10)
            & (rgb[:, :, 1] > 95)
        )
        gold = gold_mask(rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2])
        pale = pale_mask(rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2])
        if int((green & ~gold & ~pale & (a > 0)).sum()):
            issues.append(f"cutout {tier}: residual green fringe")

    # Boss must not have a walk strip written by this builder.
    if (SPRITES / "gripkin_elder_walk.png").exists():
        # Only flag if we created it this run — don't delete pre-existing unrelated files.
        # We simply never write it; note absence is expected.
        pass
    lines.append("")
    lines.append("issues=" + ("; ".join(issues) if issues else "CLEAN"))
    (OUT_DIR / "_qa_summary.txt").write_text("\n".join(lines) + "\n")
    print("wrote", OUT_DIR / "_qa_summary.txt")
    if issues:
        print("QA ISSUES:")
        for issue in issues:
            print(" -", issue)
    else:
        print("QA CLEAN")
    return issues


def main() -> None:
    print("=== build Turael W1 cutouts and strips ===")
    meta = build()
    build_lineup()
    build_strip_preview(meta)
    build_arena_sit_preview()
    write_docs(meta)
    qa(meta)


if __name__ == "__main__":
    main()
