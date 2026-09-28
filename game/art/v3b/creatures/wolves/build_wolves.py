#!/usr/bin/env python3
"""AFK Slayer Level 2 Ashfang wolf art builder.

This is a self-contained, clean-cutout pipeline.  It reads the supplied
three greenscreen sheets, keys only border-connected/green-dominant pixels,
splits the four connected wolf blobs left-to-right, and writes only wolf art
under creatures/wolves plus the shared anim/sprites output directory.
"""
from __future__ import annotations

import math
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

ROOT = Path("/workspace/contract-board/art/v3b")
WOLF_DIR = ROOT / "creatures" / "wolves"
GEN = WOLF_DIR / "_gen"
CUTOUTS = WOLF_DIR / "cutouts"
SPRITES = ROOT / "anim" / "sprites"
FRAME_H = 156
BASELINE = 146
# Design lock: ratios are relative to Bristle Cub, not boss=1.0.
RATIOS = {
    "ashfang_pup": 0.85,
    "ashfang_wolf": 1.15,
    "dire_ashfang": 1.35,
    "ashfang_alpha": 1.70,
}
DISPLAY_LEVEL = {
    "ashfang_pup": 22,
    "ashfang_wolf": 42,
    "dire_ashfang": 58,
    "ashfang_alpha": 69,
}
# Wide enough for forward snouts/spikes while retaining compact phone sprites.
FRAME_W = {
    "ashfang_pup": 112,
    "ashfang_wolf": 148,
    "dire_ashfang": 174,
    "ashfang_alpha": 220,
}
ACTIONS = {
    "ashfang_pup": ("idle", "walk", "attack"),
    "ashfang_wolf": ("idle", "walk", "attack"),
    "dire_ashfang": ("idle", "walk", "attack"),
    "ashfang_alpha": ("idle", "attack"),
}
SOURCES = {
    "idle": GEN / "wolves_greenscreen_lineup.png",
    "walk": GEN / "wolves_walk_gs.png",
    "attack": GEN / "wolves_attack_gs.png",
}

for p in (WOLF_DIR, CUTOUTS, SPRITES):
    p.mkdir(parents=True, exist_ok=True)


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def green_mask(rgb: np.ndarray) -> np.ndarray:
    """Identify lime and #00b140-ish chroma without selecting cool gray fur."""
    r, g, b = [rgb[:, :, i].astype(np.int16) for i in range(3)]
    near_lime = (g >= 145) & (g > r + 28) & (g > b + 28)
    broad_green = (g >= 75) & (g > r + 20) & (g > b + 20)
    # Preserve warm gold/orange accents: high R and relatively close R/G.
    gold = (r >= 125) & (g >= 90) & (b <= g - 8) & (np.abs(r - g) <= 80)
    return (near_lime | broad_green) & ~gold


def flood_border(mask: np.ndarray) -> np.ndarray:
    """Return the portion of a green mask reachable from image borders."""
    labels, n = ndimage.label(mask, structure=np.ones((3, 3), dtype=np.uint8))
    if n == 0:
        return np.zeros_like(mask, dtype=bool)
    border_labels = np.unique(np.concatenate([
        labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1]
    ]))
    border_labels = border_labels[border_labels != 0]
    return np.isin(labels, border_labels)


def clean_rgba(rgb: np.ndarray, component: np.ndarray) -> Image.Image:
    """Make a hard clean alpha, killing residual chroma fringe and holes."""
    gm = green_mask(rgb)
    bg = flood_border(gm)
    # Interior green between legs/tails is also background; gold is protected
    # in green_mask before this point.
    keep = component & ~gm & ~bg
    # One-pixel green-dominant fringe can survive antialiasing; remove it.
    r, g, b = [rgb[:, :, i].astype(np.int16) for i in range(3)]
    fringe = (g > r + 10) & (g > b + 10) & (g > 95)
    gold = (r >= 125) & (g >= 90) & (b <= g - 8) & (np.abs(r - g) <= 80)
    keep &= ~(fringe & ~gold)
    ys, xs = np.where(keep)
    if len(xs) == 0:
        raise RuntimeError("empty subject after chroma key")
    x0, x1 = max(0, xs.min() - 2), min(rgb.shape[1], xs.max() + 3)
    y0, y1 = max(0, ys.min() - 2), min(rgb.shape[0], ys.max() + 3)
    out = np.zeros((y1 - y0, x1 - x0, 4), dtype=np.uint8)
    out[:, :, :3] = rgb[y0:y1, x0:x1]
    out[:, :, 3] = keep[y0:y1, x0:x1].astype(np.uint8) * 255
    return Image.fromarray(out, "RGBA")


def split_subjects(path: Path) -> List[Image.Image]:
    """Split four largest connected non-green blobs, ordered by x center."""
    rgb = np.array(Image.open(path).convert("RGB"))
    gm = green_mask(rgb)
    bg = flood_border(gm)
    # Treat every remaining green pixel as background, including enclosed holes.
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
    result = []
    for _, _, idx in chosen:
        result.append(clean_rgba(rgb, labels == idx))
    return result


def alpha_bbox(im: Image.Image) -> Tuple[int, int, int, int]:
    bb = im.getchannel("A").getbbox()
    if bb is None:
        raise RuntimeError("transparent image has no alpha bbox")
    return bb


def subject_scale(im: Image.Image, target_h: int) -> Image.Image:
    bb = alpha_bbox(im)
    crop = im.crop(bb)
    scale = target_h / crop.height
    return crop.resize((max(1, round(crop.width * scale)), target_h), Image.Resampling.LANCZOS)


def lean_warp(im: Image.Image, lean: float) -> Image.Image:
    """Shear top of a right-facing mammal forward; feet stay in place."""
    if abs(lean) < 0.05:
        return im
    w, h = im.size
    pad = int(math.ceil(abs(lean) + 4))
    # output x -> source x; top shifts right by lean, bottom remains fixed.
    out_w = w + 2 * pad
    coeff = (1.0, lean / max(1, h), -lean + pad, 0.0, 1.0, 0.0)
    out = im.transform((out_w, h), Image.Transform.AFFINE, coeff,
                       resample=Image.Resampling.BICUBIC)
    bb = out.getchannel("A").getbbox()
    return out.crop(bb) if bb else im


def shadow_layer(size: Tuple[int, int], cx: float, width: float) -> Image.Image:
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    rx = max(12.0, width * 0.31)
    ry = max(2.2, width * 0.055)
    cy = BASELINE + 1.0
    d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(10, 15, 23, 128))
    return layer.filter(ImageFilter.GaussianBlur(radius=2.2))


def scrub_green_rgba(im: Image.Image) -> Image.Image:
    """Remove resampling-created green edge pixels from an RGBA render."""
    arr = np.array(im.convert("RGBA"))
    rgb = arr[:, :, :3].astype(np.int16)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    green = (g > r + 9) & (g > b + 9) & (g > 90)
    gold = (r >= 125) & (g >= 90) & (b <= g - 8) & (np.abs(r - g) <= 80)
    arr[green & ~gold, 3] = 0
    return Image.fromarray(arr, "RGBA")


def render_frame(subject: Image.Image, tier: str, target_h: int,
                 phase: int, action: str) -> Image.Image:
    # Subject target height excludes the small floor shadow; total alpha content
    # is approximately target_h + 5, matching the pilot sprite convention.
    s = subject_scale(subject, target_h)
    if action == "idle":
        lean = (0.0, 0.45, 0.65, 0.25, -0.35, 0.0)[phase]
        stretch = (1.000, 0.992, 0.988, 1.000, 1.008, 1.000)[phase]
    elif action == "walk":
        lean = (-1.7, -0.7, 0.8, 1.9, 1.0, -0.8)[phase]
        stretch = (0.985, 1.000, 1.020, 1.030, 1.010, 0.992)[phase]
    else:  # wind-up -> strike -> recover, always subtly forward-leaning
        lean = (0.0, 2.5, 5.0, 8.0, 6.0, 2.5)[phase]
        stretch = (1.000, 1.015, 1.030, 1.045, 1.025, 1.008)[phase]
    if abs(stretch - 1.0) > 0.001:
        s = s.resize((s.width, max(1, round(s.height * stretch))), Image.Resampling.BICUBIC)
    s = lean_warp(s, lean)
    # Re-normalize height after motion warp while retaining proportions.
    s = s.resize((max(1, round(s.width * target_h / s.height)), target_h), Image.Resampling.LANCZOS)
    fw = FRAME_W[tier]
    canvas = Image.new("RGBA", (fw, FRAME_H), (0, 0, 0, 0))
    x = round((fw - s.width) / 2 + lean * 0.10)
    y = BASELINE - s.height
    # Shadow behind feet; it is oval, cool-black, and never a square floor.
    canvas = Image.alpha_composite(canvas, shadow_layer(canvas.size, fw / 2 + lean * 0.1, s.width))
    canvas.alpha_composite(s, (x, y))
    # Ensure accidental subpixel edge never carries a green fringe.
    return scrub_green_rgba(canvas)


def checker(size: Tuple[int, int], cell: int = 14) -> Image.Image:
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(out)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            c = (55, 59, 66, 255) if ((x // cell + y // cell) % 2 == 0) else (38, 42, 48, 255)
            d.rectangle((x, y, x + cell, y + cell), fill=c)
    return out


def build() -> Dict[str, dict]:
    pose_sets = {action: split_subjects(path) for action, path in SOURCES.items()}
    # Reference nominal is the measured pilot content target (~72 px).
    pilot = Image.open(ROOT / "anim" / "sprites" / "bristle_cub_idle.png").convert("RGBA")
    # First frame of the pilot strip; only alpha pixels, not transparent strip.
    pilot_frame = pilot.crop((0, 0, 115, FRAME_H))
    pilot_h = alpha_bbox(pilot_frame)[3] - alpha_bbox(pilot_frame)[1] + 2
    nominal = 72  # design lock rounds the measured pilot (~70 opaque / ~72 visual)
    target_total = {tier: round(nominal * ratio) for tier, ratio in RATIOS.items()}
    target_subject = {tier: max(20, target_total[tier] - 5) for tier in RATIOS}
    meta: Dict[str, dict] = {}
    rendered: Dict[Tuple[str, str], List[Image.Image]] = {}

    for tier_idx, tier in enumerate(RATIOS):
        idle = pose_sets["idle"][tier_idx]
        for action in ACTIONS[tier]:
            pose = pose_sets[action][tier_idx]
            frames = [render_frame(pose, tier, target_subject[tier], i, action) for i in range(6)]
            strip = Image.new("RGBA", (FRAME_W[tier] * 6, FRAME_H), (0, 0, 0, 0))
            for i, frame in enumerate(frames):
                strip.alpha_composite(frame, (i * FRAME_W[tier], 0))
            out_path = SPRITES / f"{tier}_{action}.png"
            strip.save(out_path)
            rendered[(tier, action)] = frames
            first_bb = frames[0].getchannel("A").getbbox()
            actual_content_h = (first_bb[3] - first_bb[1]) if first_bb else 0
            meta[f"{tier}_{action}.png"] = {
                "frames": 6, "frame_w": FRAME_W[tier], "frame_h": FRAME_H,
                "content_h": actual_content_h, "display_level": DISPLAY_LEVEL[tier],
                "action": action,
            }
            print(f"wrote {out_path} {strip.size}")
        # Idle cutout is a single transparent framed image with shadow.
        cut = rendered[(tier, "idle")][0]
        cut.save(CUTOUTS / f"{tier}.png")
        # Concept is intentionally the same idle cutout, preserving art fidelity.
        cut.save(WOLF_DIR / f"{tier}_concept.png")
        print(f"wrote {CUTOUTS / (tier + '.png')}")
    return meta


def build_lineup() -> None:
    tiers = list(RATIOS)
    labels = ["A · Ashfang Pup", "B · Ashfang Wolf", "C · Dire Ashfang", "Boss · Ashfang Alpha"]
    gap = 20
    H = FRAME_H + 66
    W = sum(FRAME_W[t] for t in tiers) + gap * (len(tiers) + 1)
    out = checker((W, H))
    d = ImageDraw.Draw(out)
    small = load_font(12)
    title = load_font(15)
    x = gap
    for tier, label in zip(tiers, labels):
        fr = Image.open(SPRITES / f"{tier}_idle.png").convert("RGBA").crop((0, 0, FRAME_W[tier], FRAME_H))
        out.alpha_composite(fr, (x, 31))
        d.text((x + 3, 8), label, font=small, fill=(255, 246, 206, 255))
        d.text((x + 3, H - 23), f"{FRAME_W[tier]}×{FRAME_H} · {round(72 * RATIOS[tier])}h",
               font=small, fill=(192, 199, 205, 255))
        x += FRAME_W[tier] + gap
    d.text((gap, H - 45), "AFK Slayer · Level 2 Ashfang family · Option C · transparent QA",
           font=title, fill=(224, 177, 91, 255))
    out.save(WOLF_DIR / "lineup_preview.png")
    print("wrote", WOLF_DIR / "lineup_preview.png", out.size)


def build_strip_preview(meta: Dict[str, dict]) -> None:
    entries = list(meta)
    label_h, row_h = 22, 112
    W = max(FRAME_W[e.split("_")[0] if False else "ashfang_alpha"] * 6 for e in []) if False else 0
    # Display each strip at 0.52 scale, preserving all six frames.
    scales = 0.52
    rows = []
    for filename in entries:
        im = Image.open(SPRITES / filename).convert("RGBA")
        disp = im.resize((round(im.width * scales), round(im.height * scales)), Image.Resampling.LANCZOS)
        rows.append((filename, disp))
    W = max(im.width for _, im in rows) + 180
    H = sum(max(row_h, im.height + label_h) for _, im in rows) + 18
    out = checker((W, H), 12)
    d = ImageDraw.Draw(out)
    font = load_font(11)
    y = 9
    for filename, im in rows:
        d.text((8, y + 4), filename.replace(".png", ""), font=font, fill=(255, 246, 206, 255))
        out.alpha_composite(im, (160, y))
        y += max(row_h, im.height + label_h)
    out.save(WOLF_DIR / "strips_qa_preview.png")
    print("wrote", WOLF_DIR / "strips_qa_preview.png", out.size)


def write_docs(meta: Dict[str, dict], pilot_h: int = 72) -> None:
    lines = [
        "# AFK Slayer — Level 2 Ashfang wolf family (integration)", "",
        "**Locked look:** `art/v3/target/option_c_locked.png` (Option C).",
        "**Status:** LIVE Level 2 ladder art; original-IP Ashfang names.",
        "**Paths:** strips in `art/v3b/anim/sprites/`; cutouts/concepts/previews in `art/v3b/creatures/wolves/`.", "",
        "## Silhouette language", "",
        "Cool ash-grey, faceted low-poly wolves with lean forward-facing mammal silhouettes, pointed ears, snouts, spikes and soft oval cool-black floor shadows.",
        "Burnt-orange ear-tip accents are retained; Ashfang Alpha adds ember eyes and mane fringe. No neon-green matte or square floor is baked in.",
        "Frame height is **156**; scale lock is relative to the measured Bristle Cub pilot (~72px visual content), not relative to the boss.", "",
        "## Scale ladder", "",
        "| Id | Role | Relative to Bristle Cub | displayLevel | Strips | Content h |",
        "|---|---|---:|---:|---|---:|",
        f"| `ashfang_pup` | A · pup | 0.85× | 22 | idle / walk / attack (6) | {meta['ashfang_pup_idle.png']['content_h']} |",
        f"| `ashfang_wolf` | B · adult | 1.15× | 42 | idle / walk / attack (6) | {meta['ashfang_wolf_idle.png']['content_h']} |",
        f"| `dire_ashfang` | C · elite | 1.35× | 58 | idle / walk / attack (6) | {meta['dire_ashfang_idle.png']['content_h']} |",
        f"| `ashfang_alpha` | Boss | 1.70× | 69 | idle / attack (6) — no walk | {meta['ashfang_alpha_idle.png']['content_h']} |", "",
        "## Frame table", "",
        "| File | Frames | Frame size (w×h) | Content h |", "|---|---:|---|---:|",
    ]
    for fn, m in meta.items():
        lines.append(f"| `anim/sprites/{fn}` | {m['frames']} | {m['frame_w']}×{m['frame_h']} | {m['content_h']} |")
    lines += [
        "", "## New Bot wiring notes", "",
        "1. Map visual ids directly: `ashfang_pup_*`, `ashfang_wolf_*`, `dire_ashfang_*`, and `ashfang_alpha_*`.",
        "2. `displayLevel` values are 22 / 42 / 58 / 69 in that order; boss is `ashfang_alpha`.",
        "3. Select idle, walk, or attack strips by action. The boss intentionally has no walk strip.",
        "4. Use transparent PNGs directly; do not place a solid CSS background behind a sprite.",
        "5. Keep player/companion pilot art and all other level systems wiring unchanged; this deliverable is art-only.",
        "6. Preserve these original-IP Ashfang identifiers and do not substitute archived creature names.", "",
        "## QA and regeneration", "",
        "`lineup_preview.png` shows A/B/C/boss on checkerboard; `strips_qa_preview.png` shows all six-frame strips.",
        "`_qa_summary.txt` records exact strip dimensions, corner alpha, opaque-region mean alpha, content heights, and residual green checks.",
        "", "```bash", "/workspace/.venv-art/bin/python art/v3b/creatures/wolves/build_wolves.py", "```", "",
        "The source sheets were split by the four largest connected non-green blobs ordered left-to-right. Border-connected lime and #00b140-ish chroma plus green-dominant fringe were removed; yellow/gold eyes, claws and accents were protected.",
    ]
    (WOLF_DIR / "INTEGRATION.md").write_text("\n".join(lines) + "\n")
    print("wrote", WOLF_DIR / "INTEGRATION.md")


def qa(meta: Dict[str, dict]) -> List[str]:
    issues: List[str] = []
    lines = ["Ashfang wolf art QA", "frame_h=156; all strips have six frames", ""]
    for fn, m in meta.items():
        path = SPRITES / fn
        im = Image.open(path).convert("RGBA")
        arr = np.array(im)
        corners = [int(arr[0, 0, 3]), int(arr[0, -1, 3]), int(arr[-1, 0, 3]), int(arr[-1, -1, 3])]
        opaque = arr[:, :, 3] > 0
        mean = float(arr[:, :, 3][opaque].mean()) if opaque.any() else 0.0
        bb = im.getchannel("A").getbbox()
        ch = (bb[3] - bb[1]) if bb else 0
        rgb = arr[:, :, :3].astype(np.int16)
        ggreen = (rgb[:, :, 1] > rgb[:, :, 0] + 10) & (rgb[:, :, 1] > rgb[:, :, 2] + 10) & (rgb[:, :, 1] > 95)
        gold = (rgb[:, :, 0] >= 125) & (rgb[:, :, 1] >= 90) & (rgb[:, :, 2] <= rgb[:, :, 1] - 8)
        residual = int((ggreen & ~gold & opaque).sum())
        lines.append(f"{fn}: size={im.width}x{im.height}; frame={m['frame_w']}x{m['frame_h']}; content_h={ch}; corner_alpha={corners}; mean_alpha_opaque={mean:.2f}; residual_green_opaque={residual}")
        if im.height != FRAME_H or im.width != m["frame_w"] * 6:
            issues.append(f"{fn}: wrong strip dimensions")
        if any(c != 0 for c in corners):
            issues.append(f"{fn}: nontransparent corner alpha {corners}")
        if residual:
            issues.append(f"{fn}: residual green pixels {residual}")
    # Cutouts/concepts should share the same clean transparent properties.
    for tier in RATIOS:
        path = CUTOUTS / f"{tier}.png"
        im = Image.open(path).convert("RGBA")
        arr = np.array(im)
        a = arr[:, :, 3]
        corners = [a[0, 0], a[0, -1], a[-1, 0], a[-1, -1]]
        if any(c != 0 for c in corners):
            issues.append(f"cutout {tier}: nontransparent corner alpha")
        rgb = arr[:, :, :3].astype(np.int16)
        green = (rgb[:, :, 1] > rgb[:, :, 0] + 10) & (rgb[:, :, 1] > rgb[:, :, 2] + 10) & (rgb[:, :, 1] > 95)
        gold = (rgb[:, :, 0] >= 125) & (rgb[:, :, 1] >= 90) & (rgb[:, :, 2] <= rgb[:, :, 1] - 8)
        if (green & ~gold & (a > 0)).sum():
            issues.append(f"cutout {tier}: residual green fringe")
    lines += ["", "issues=" + ("; ".join(issues) if issues else "CLEAN")]
    (WOLF_DIR / "_qa_summary.txt").write_text("\n".join(lines) + "\n")
    print("wrote", WOLF_DIR / "_qa_summary.txt")
    if issues:
        print("QA ISSUES:")
        for issue in issues:
            print(" -", issue)
    else:
        print("QA CLEAN")
    return issues


def main() -> None:
    print("=== build Ashfang wolf cutouts and strips ===")
    meta = build()
    build_lineup()
    build_strip_preview(meta)
    write_docs(meta)
    qa(meta)


if __name__ == "__main__":
    main()
