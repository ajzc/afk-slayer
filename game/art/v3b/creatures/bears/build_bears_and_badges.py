#!/usr/bin/env python3
"""AFK Slayer Option C — Level badges + Thornpelt bear family strips.

Pipeline: paint on flat chroma green (#00b140) → flood-fill chroma from borders
→ soft oval shadow → horizontal transparent strips (frame_h=156).
GenerateImage unavailable in this executor; painterly faceted low-poly drawn to
match option_c_locked + pilot cutouts. Original IP (no Jagex/OSRS names).
"""
from __future__ import annotations

import json
import math
import os
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path("/workspace/contract-board/art/v3b")
SPRITES = ROOT / "anim" / "sprites"
UI = ROOT / "ui"
BEARS = ROOT / "creatures" / "bears"
GEN = BEARS / "_gen"
FRAMES = ROOT / "anim" / "_frames" / "bears"
CHROMA = (0, 177, 64, 255)  # #00b140
FRAME_H = 156

for p in (SPRITES, UI, BEARS, GEN, FRAMES):
    p.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Chroma + shadow helpers
# ---------------------------------------------------------------------------

def flood_chroma(im: Image.Image, tol: int = 55) -> Image.Image:
    """Flood-fill chroma from borders → transparent. Keeps non-green subject."""
    im = im.convert("RGBA")
    arr = np.array(im)
    h, w = arr.shape[:2]
    cr, cg, cb = CHROMA[:3]
    # green-ish mask (tolerant)
    diff = (
        np.abs(arr[:, :, 0].astype(np.int16) - cr)
        + np.abs(arr[:, :, 1].astype(np.int16) - cg)
        + np.abs(arr[:, :, 2].astype(np.int16) - cb)
    )
    green = (diff <= tol * 3) & (arr[:, :, 1] > arr[:, :, 0] + 20) & (
        arr[:, :, 1] > arr[:, :, 2] + 20
    )
    # Also catch near-pure chroma regardless of tol
    green |= (diff <= 40)

    visited = np.zeros((h, w), dtype=bool)
    stack = []
    for x in range(w):
        stack.append((x, 0))
        stack.append((x, h - 1))
    for y in range(h):
        stack.append((0, y))
        stack.append((w - 1, y))

    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        if visited[y, x]:
            continue
        if not green[y, x]:
            continue
        visited[y, x] = True
        stack.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])

    out = arr.copy()
    out[visited, 3] = 0
    # Soften fringe: near-visited green-ish pixels get reduced alpha
    # erode one step of visited into green fringe
    from scipy import ndimage  # may miss — fallback below

    try:
        dil = ndimage.binary_dilation(visited, iterations=1)
        fringe = dil & ~visited & green
        out[fringe, 3] = (out[fringe, 3].astype(np.float32) * 0.15).astype(np.uint8)
    except Exception:
        pass

    # Kill remaining pure chroma islands that are mostly green (not connected to border:
    # leave interior holes only if they're truly enclosed AND small — actually we want
    # holes between limbs transparent too if they're chroma. Second pass: any remaining
    # strong green with high green dominance → transparent.
    rem = (
        (np.abs(out[:, :, 0].astype(np.int16) - cr)
         + np.abs(out[:, :, 1].astype(np.int16) - cg)
         + np.abs(out[:, :, 2].astype(np.int16) - cb))
        <= 50
    ) & (out[:, :, 1] > out[:, :, 0] + 25) & (out[:, :, 1] > out[:, :, 2] + 25)
    out[rem, 3] = 0

    return Image.fromarray(out, "RGBA")


def soft_oval_shadow(im: Image.Image, cx: float, cy: float, rx: float, ry: float,
                     alpha: int = 110) -> Image.Image:
    """Composite a soft dark oval under feet. cx,cy in image coords."""
    sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(sh)
    box = [cx - rx, cy - ry, cx + rx, cy + ry]
    d.ellipse(box, fill=(12, 14, 20, alpha))
    sh = sh.filter(ImageFilter.GaussianBlur(radius=max(2, int(rx * 0.12))))
    return Image.alpha_composite(sh, im)


def add_facet_noise(draw_target: Image.Image, poly, base_rgb, rng, amp=10):
    """Fill polygon with slight painterly shade variation (flat facet + grit)."""
    # Single flat fill with mild random offset for facet identity
    r = max(0, min(255, base_rgb[0] + rng.randint(-amp, amp)))
    g = max(0, min(255, base_rgb[1] + rng.randint(-amp // 2, amp // 2)))
    b = max(0, min(255, base_rgb[2] + rng.randint(-amp, amp)))
    ImageDraw.Draw(draw_target).polygon(poly, fill=(r, g, b, 255))


def poly(pts):
    return [(float(x), float(y)) for x, y in pts]


# ---------------------------------------------------------------------------
# Bear drawing (faceted low-poly)
# ---------------------------------------------------------------------------

# Brown-grey thornpelt palette (cool undertone + warm fur + gold tip accents sparingly)
PAL = {
    "fur_dark": (58, 48, 42),
    "fur_mid": (92, 74, 58),
    "fur_lit": (132, 108, 82),
    "fur_hi": (168, 140, 105),
    "grey": (78, 82, 88),
    "grey_lit": (118, 122, 128),
    "thorn": (48, 52, 58),
    "thorn_tip": (160, 150, 120),  # dull gold tip — gold accents over neon
    "snout": (150, 120, 95),
    "nose": (28, 24, 28),
    "eye": (220, 190, 90),  # cream-gold eye (readable, not neon purple)
    "claw": (200, 190, 170),
    "scar": (40, 32, 30),
}


def draw_thorn(draw_im, base, tip, width, rng, gold_tip=False):
    """Draw a faceted thorn spike from base→tip."""
    bx, by = base
    tx, ty = tip
    dx, dy = tx - bx, ty - by
    L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L * width, dx / L * width
    # two side facets
    left = poly([(bx + nx, by + ny), (bx - nx * 0.2, by - ny * 0.2), (tx, ty)])
    right = poly([(bx - nx, by - ny), (bx + nx * 0.2, by + ny * 0.2), (tx, ty)])
    add_facet_noise(draw_im, left, PAL["thorn"], rng, 8)
    add_facet_noise(draw_im, right, PAL["grey"], rng, 8)
    if gold_tip:
        mid = ((bx + tx * 2) / 3, (by + ty * 2) / 3)
        tip_poly = poly([mid, (tx + nx * 0.15, ty + ny * 0.15), (tx - nx * 0.15, ty - ny * 0.15)])
        add_facet_noise(draw_im, tip_poly, PAL["thorn_tip"], rng, 6)



def draw_bear_body(im: Image.Image, tier: str, pose: str, rng: random.Random) -> tuple:
    """Paint faceted thornpelt bear on chroma. Returns foot shadow anchors."""
    W, H = im.size
    scales = {
        "bristle_cub": 0.55,
        "thornpelt_bear": 0.75,
        "dire_thornpelt": 0.90,
        "elder_thornpelt": 1.00,
    }
    s = scales[tier]
    lean = bob = 0.0
    stretch = 1.0
    arm_raise = 0.0
    if pose == "idle":
        bob = rng.uniform(-1.2, 1.2)
    elif pose == "walk":
        bob = rng.uniform(-2.5, 2.5)
        lean = rng.uniform(-5, 5)
        stretch = rng.uniform(0.97, 1.04)
    elif pose == "attack":
        lean = rng.uniform(8, 16)
        arm_raise = rng.uniform(12, 24)
        stretch = rng.uniform(1.02, 1.1)

    foot_y = H - 20 + bob * 0.25
    cx = W * 0.46 + lean * 0.35
    # Chunky ursine proportions (wide torso, short legs, big head)
    body_w = (96 if tier != "bristle_cub" else 78) * s
    if tier == "elder_thornpelt":
        body_w *= 1.15
    elif tier == "dire_thornpelt":
        body_w *= 1.05
    body_h = 70 * s * stretch
    leg_h = 26 * s
    if tier == "bristle_cub":
        leg_h *= 0.9
        body_h *= 0.88

    # ---- hind / front legs (plantigrade blocks) ----
    stance = 18 * s
    for i, (sx, kick_sign) in enumerate(((-stance, -1), (stance * 0.2, 1), (stance * 0.95, 1))):
        # 3-leg read: left hind, mid, right fore — chunky bear
        if i == 1 and tier == "bristle_cub":
            continue  # cub: 2 legs only for cleaner small silhouette
        walk_kick = 0
        if pose == "walk":
            walk_kick = kick_sign * rng.uniform(-7, 7)
        lx = cx + sx + walk_kick + lean * 0.15
        top = foot_y - leg_h
        lw = 15 * s if i != 1 else 12 * s
        add_facet_noise(
            im,
            poly([(lx - lw / 2, top), (lx + lw / 2, top),
                  (lx + lw / 2 - 1, foot_y), (lx - lw / 2 + 2, foot_y)]),
            PAL["fur_dark"] if i == 0 else PAL["fur_mid"],
            rng, 8,
        )
        # paw pad
        add_facet_noise(
            im,
            poly([(lx - lw / 2 - 2, foot_y - 5), (lx + lw / 2 + 3, foot_y - 5),
                  (lx + lw / 2 + 2, foot_y + 2), (lx - lw / 2 - 1, foot_y + 2)]),
            PAL["fur_dark"], rng, 5,
        )
        if pose == "attack" or tier in ("dire_thornpelt", "elder_thornpelt"):
            for coff in (-5, 0, 5):
                add_facet_noise(
                    im,
                    poly([(lx + coff - 1.5, foot_y - 1), (lx + coff + 1.5, foot_y - 1),
                          (lx + coff + 2, foot_y + 6), (lx + coff - 1, foot_y + 5)]),
                    PAL["claw"], rng, 3,
                )

    # ---- heavy torso (rounded via facet fan) ----
    torso_bot = foot_y - leg_h + 6
    torso_top = torso_bot - body_h
    # belly oval approximated by stacked trapezoids
    add_facet_noise(
        im,
        poly([(cx - body_w * 0.42, torso_top + body_h * 0.2),
              (cx + body_w * 0.42, torso_top + body_h * 0.2),
              (cx + body_w * 0.5, torso_bot),
              (cx - body_w * 0.5, torso_bot)]),
        PAL["fur_lit"], rng, 10,
    )
    add_facet_noise(
        im,
        poly([(cx - body_w * 0.55, torso_top + 4),
              (cx - body_w * 0.1, torso_top - 6),
              (cx - body_w * 0.15, torso_bot - 4),
              (cx - body_w * 0.58, torso_bot - 10)]),
        PAL["fur_mid"], rng, 10,
    )
    add_facet_noise(
        im,
        poly([(cx + body_w * 0.55, torso_top + 4),
              (cx + body_w * 0.1, torso_top - 6),
              (cx + body_w * 0.15, torso_bot - 4),
              (cx + body_w * 0.58, torso_bot - 10)]),
        PAL["fur_dark"], rng, 10,
    )
    # chest highlight
    add_facet_noise(
        im,
        poly([(cx - body_w * 0.2, torso_top + 10),
              (cx + body_w * 0.22, torso_top + 8),
              (cx + body_w * 0.16, torso_top + body_h * 0.45),
              (cx - body_w * 0.16, torso_top + body_h * 0.48)]),
        PAL["fur_hi"], rng, 8,
    )
    # hump (bear shoulder)
    add_facet_noise(
        im,
        poly([(cx - body_w * 0.15, torso_top - 2),
              (cx + body_w * 0.05, torso_top - 14 * s),
              (cx + body_w * 0.25, torso_top - 2),
              (cx + body_w * 0.1, torso_top + 10)]),
        PAL["grey"] if tier != "bristle_cub" else PAL["fur_mid"], rng, 8,
    )

    # ---- forelimbs / swipe ----
    arm_y = torso_top + body_h * 0.18
    for side, sx in ((-1, cx - body_w * 0.48), (1, cx + body_w * 0.48)):
        arm_up = arm_raise if (pose == "attack" and side == 1) else arm_raise * 0.25
        ay = arm_y - arm_up
        aw, ah = 15 * s, 34 * s
        fwd = lean * 0.9 if (pose == "attack" and side == 1) else lean * 0.1 * side
        add_facet_noise(
            im,
            poly([(sx - aw / 2 + fwd, ay),
                  (sx + aw / 2 + fwd, ay),
                  (sx + aw / 2 + 3 + fwd * 1.5, ay + ah),
                  (sx - aw / 2 + fwd * 1.4, ay + ah)]),
            PAL["fur_mid"] if side < 0 else PAL["grey"], rng, 8,
        )
        if pose == "attack" and side == 1:
            for coff in (-7, -1, 5):
                tipx = sx + fwd * 1.7 + coff
                draw_thorn(im, (tipx, ay + ah - 2), (tipx + 12 * s, ay + ah + 10), 3.2 * s, rng, gold_tip=True)

    # ---- head (big round faceted) ----
    head_r = (32 if tier != "bristle_cub" else 30) * s
    if tier == "bristle_cub":
        head_r *= 1.2
    hx = cx + lean * 0.25 + body_w * 0.08
    hy = torso_top - head_r * 0.35
    head_cols = [PAL["fur_lit"], PAL["fur_mid"], PAL["fur_dark"], PAL["grey_lit"], PAL["fur_mid"], PAL["grey"]]
    for i, ang0 in enumerate(range(0, 360, 60)):
        a0 = math.radians(ang0 - 15)
        a1 = math.radians(ang0 + 45)
        add_facet_noise(
            im,
            poly([(hx, hy),
                  (hx + head_r * math.cos(a0), hy + head_r * 0.9 * math.sin(a0)),
                  (hx + head_r * math.cos(a1), hy + head_r * 0.9 * math.sin(a1))]),
            head_cols[i % len(head_cols)], rng, 9,
        )
    # muzzle block protruding
    sn_w = 20 * s
    sn_h = 14 * s
    if tier == "bristle_cub":
        sn_w *= 0.8
        sn_h *= 0.85
    add_facet_noise(
        im,
        poly([(hx + 2, hy - 2),
              (hx + sn_w + 6, hy + 2),
              (hx + sn_w + 4, hy + sn_h),
              (hx + 4, hy + sn_h + 2)]),
        PAL["snout"], rng, 6,
    )
    ImageDraw.Draw(im).ellipse(
        [hx + sn_w * 0.55, hy + sn_h * 0.25, hx + sn_w * 0.85, hy + sn_h * 0.65],
        fill=(*PAL["nose"], 255),
    )
    # eyes
    for ex, eyoff in ((-6 * s, -2 * s), (8 * s, -3 * s)):
        ey = hy + eyoff
        ImageDraw.Draw(im).ellipse([hx + ex - 3.5, ey - 3.5, hx + ex + 3.5, ey + 3.5], fill=(14, 12, 16, 255))
        ImageDraw.Draw(im).ellipse([hx + ex - 2.2, ey - 2.2, hx + ex + 2.2, ey + 2.2], fill=(*PAL["eye"], 255))
    # round ears
    for side in (-1, 1):
        ex = hx + side * head_r * 0.72
        ey = hy - head_r * 0.7
        add_facet_noise(
            im,
            poly([(ex, ey - 10 * s), (ex - 8 * s, ey + 5 * s), (ex + 8 * s, ey + 5 * s)]),
            PAL["fur_mid"] if side < 0 else PAL["fur_dark"], rng, 6,
        )
        # inner ear
        add_facet_noise(
            im,
            poly([(ex, ey - 4 * s), (ex - 4 * s, ey + 2 * s), (ex + 4 * s, ey + 2 * s)]),
            PAL["snout"], rng, 4,
        )

    # ---- thorn / bristle crown + back ----
    spike_n = {"bristle_cub": 7, "thornpelt_bear": 12, "dire_thornpelt": 18, "elder_thornpelt": 24}[tier]
    spike_len = {"bristle_cub": 9, "thornpelt_bear": 15, "dire_thornpelt": 22, "elder_thornpelt": 30}[tier]
    for i in range(spike_n):
        t = i / max(1, spike_n - 1)
        ang = math.radians(-160 + 130 * t + rng.uniform(-10, 10))
        base_r = body_w * 0.28 + head_r * 0.45
        bx = hx + math.cos(ang) * base_r * 0.85
        by = hy + math.sin(ang) * base_r * 0.7
        L = spike_len * s * rng.uniform(0.65, 1.2)
        if tier == "bristle_cub":
            L *= 0.75
        tip = (bx + math.cos(ang) * L, by + math.sin(ang) * L - 3)
        gold = tier in ("dire_thornpelt", "elder_thornpelt") and (i % 3 == 0)
        wth = (2.0 + 1.4 * s) * (1.35 if tier == "elder_thornpelt" else 1.0)
        draw_thorn(im, (bx, by), tip, wth, rng, gold_tip=gold)

    if tier in ("dire_thornpelt", "elder_thornpelt"):
        # charger mane / shoulder thorns pointing forward
        for i in range(5):
            bx = cx + body_w * 0.28 + i * 4
            by = torso_top + 6 + i * 6
            tip = (bx + (20 + i * 2) * s + lean * 0.4, by - 10 * s)
            draw_thorn(im, (bx, by), tip, 3.8 * s, rng, gold_tip=True)

    if tier == "elder_thornpelt":
        for (x0, y0, x1, y1) in (
            (cx - 14, torso_top + 18, cx + 12, torso_top + 42),
            (hx - 4, hy + 2, hx + 14, hy + 8),
        ):
            ImageDraw.Draw(im).line([(x0, y0), (x1, y1)], fill=(*PAL["scar"], 210), width=2)
        # mean brow
        ImageDraw.Draw(im).polygon(
            poly([(hx - 16 * s, hy - 8 * s), (hx + 14 * s, hy - 11 * s),
                  (hx + 12 * s, hy - 4 * s), (hx - 14 * s, hy - 2 * s)]),
            fill=(*PAL["fur_dark"], 255),
        )
    elif tier == "dire_thornpelt":
        ImageDraw.Draw(im).polygon(
            poly([(hx - 12 * s, hy - 7 * s), (hx + 12 * s, hy - 9 * s),
                  (hx + 10 * s, hy - 3 * s), (hx - 10 * s, hy - 2 * s)]),
            fill=(*PAL["fur_dark"], 255),
        )

    return cx, foot_y + 2, body_w * 0.55 + 10


def make_cutout(tier: str, pose: str = "idle", seed: int = 0, canvas: tuple = (320, 360)) -> Image.Image:
    rng = random.Random(seed)
    im = Image.new("RGBA", canvas, CHROMA)
    # slight canvas centering
    foot_cx, foot_cy, foot_rx = draw_bear_body(im, tier, pose, rng)
    keyed = flood_chroma(im)
    # shrink foot_rx a bit for soft oval
    shadowed = soft_oval_shadow(keyed, foot_cx, foot_cy + 2, foot_rx, max(5, foot_rx * 0.28), alpha=100)
    return shadowed


SCALES = {
    "bristle_cub": 0.55,
    "thornpelt_bear": 0.75,
    "dire_thornpelt": 0.90,
    "elder_thornpelt": 1.00,
}

def fit_to_frame(cut: Image.Image, frame_w: int, frame_h: int = FRAME_H,
                 tier: str = "elder_thornpelt") -> Image.Image:
    """Scale cutout so boss fills frame; others sit on the locked scale ladder."""
    bbox = cut.getbbox()
    if not bbox:
        return Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    cropped = cut.crop(bbox)
    # Elder target content height; others = scale * elder target
    elder_h = frame_h - 10
    target_h = max(24, int(elder_h * SCALES[tier]))
    cw, ch = cropped.size
    scale = target_h / ch
    # also clamp width
    if cw * scale > frame_w - 6:
        scale = (frame_w - 6) / cw
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    resized = cropped.resize((nw, nh), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    x = (frame_w - nw) // 2
    y = frame_h - nh - 2
    out.paste(resized, (x, y), resized)
    return out


def build_strip(tier: str, action: str, frame_w: int, n: int = 6, seed0: int = 1) -> Image.Image:
    frames = []
    for i in range(n):
        # Vary pose params via seed
        cut = make_cutout(tier, pose=action, seed=seed0 + i * 17 + hash(action) % 97)
        # Extra micro-transform for motion read
        fr = fit_to_frame(cut, frame_w, FRAME_H, tier=tier)
        # bob / lean via affine-ish paste offset
        bob = int(math.sin(i / n * math.pi * 2) * (2 if action == "idle" else 4 if action == "walk" else 3))
        lean = 0
        if action == "walk":
            lean = int(math.sin(i / n * math.pi * 2) * 3)
        elif action == "attack":
            # wind-up then strike
            phase = [0, 1, 3, 5, 2, 0][i]
            lean = phase * 2
        canvas = Image.new("RGBA", (frame_w, FRAME_H), (0, 0, 0, 0))
        canvas.paste(fr, (lean, bob), fr)
        frames.append(canvas)
    strip = Image.new("RGBA", (frame_w * n, FRAME_H), (0, 0, 0, 0))
    for i, fr in enumerate(frames):
        strip.paste(fr, (i * frame_w, 0), fr)
    return strip


# Frame widths sized for spikes + readability
FRAME_W = {
    "bristle_cub": 120,
    "thornpelt_bear": 148,
    "dire_thornpelt": 170,
    "elder_thornpelt": 196,
}


def build_all_bears():
    meta = {}
    specs = [
        ("bristle_cub", ["idle", "walk", "attack"]),
        ("thornpelt_bear", ["idle", "walk", "attack"]),
        ("dire_thornpelt", ["idle", "walk", "attack"]),
        ("elder_thornpelt", ["idle", "attack"]),
    ]
    for tier, actions in specs:
        fw = FRAME_W[tier]
        # concept cutout
        concept = make_cutout(tier, "idle", seed=42)
        concept.save(GEN / f"{tier}_concept_green.png")
        keyed = flood_chroma(Image.open(GEN / f"{tier}_concept_green.png"))
        # re-add shadow properly from concept already shadowed
        concept.save(BEARS / f"{tier}_concept.png")
        for act in actions:
            strip = build_strip(tier, act, fw, n=6, seed0=100 + abs(hash(tier)) % 50)
            name = f"{tier}_{act}.png"
            path = SPRITES / name
            strip.save(path)
            meta[name] = {"frames": 6, "frame_w": fw, "frame_h": FRAME_H, "transparent": True}
            print("wrote", path, strip.size)
            # save f0 for QA
            strip.crop((0, 0, fw, FRAME_H)).save(FRAMES / f"{tier}_{act}_f0.png")
    return meta


# ---------------------------------------------------------------------------
# Level badge chips
# ---------------------------------------------------------------------------

def load_font(size: int):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def make_level_badge(n: int, out_h: int = 64) -> Image.Image:
    """Stone/beige carved pill chip — AFK Slayer chrome. Transparent outside."""
    text = f"Level {n}"
    font = load_font(28)
    # measure
    tmp = Image.new("RGBA", (1, 1))
    td = ImageDraw.Draw(tmp)
    bbox = td.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad_x, pad_y = 18, 10
    W = tw + pad_x * 2
    H = max(out_h, th + pad_y * 2)
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # pill / tablet shape
    radius = H // 2 - 1
    # outer dark outline
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=radius, fill=(14, 12, 10, 255))
    # stone body gradient via stacked rounded rects
    inset = 3
    d.rounded_rectangle(
        [inset, inset, W - 1 - inset, H - 1 - inset],
        radius=radius - 2,
        fill=(90, 82, 58, 255),
    )
    # beige face
    d.rounded_rectangle(
        [inset + 2, inset + 2, W - 3 - inset, H - 3 - inset],
        radius=radius - 3,
        fill=(184, 168, 120, 255),
    )
    # top highlight facet
    d.rounded_rectangle(
        [inset + 3, inset + 3, W - 4 - inset, H // 2],
        radius=radius - 4,
        fill=(210, 196, 150, 220),
    )
    # carved inset panel
    d.rounded_rectangle(
        [inset + 5, inset + 5, W - 6 - inset, H - 6 - inset],
        radius=radius - 5,
        outline=(60, 52, 36, 255),
        width=2,
    )
    # gold edge accent (thin)
    d.rounded_rectangle(
        [inset + 1, inset + 1, W - 2 - inset, H - 2 - inset],
        radius=radius - 2,
        outline=(201, 162, 39, 180),
        width=1,
    )
    # cream/gold text with dark outline for readability
    tx = (W - tw) // 2 - bbox[0]
    ty = (H - th) // 2 - bbox[1] - 1
    for ox, oy in [(-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1)]:
        d.text((tx + ox, ty + oy), text, font=font, fill=(26, 22, 14, 255))
    d.text((tx, ty), text, font=font, fill=(255, 250, 200, 255))
    # tiny gold underline sparkle for Level 3
    if n == 3:
        d.line([(W // 4, H - 8), (3 * W // 4, H - 8)], fill=(232, 197, 71, 200), width=2)
    return im


def build_badges():
    chips = []
    for n in (1, 2, 3):
        chip = make_level_badge(n)
        path = UI / f"level_badge_{n}.png"
        chip.save(path)
        print("wrote", path, chip.size, "corner", chip.getpixel((0, 0)))
        chips.append(chip)
    # preview sheet
    gap = 16
    total_w = sum(c.size[0] for c in chips) + gap * (len(chips) + 1)
    total_h = max(c.size[1] for c in chips) + 40
    # checkerboard bg for QA
    prev = Image.new("RGBA", (total_w, total_h), (0, 0, 0, 0))
    # draw checker
    cell = 12
    for y in range(0, total_h, cell):
        for x in range(0, total_w, cell):
            col = (55, 55, 60, 255) if ((x // cell) + (y // cell)) % 2 == 0 else (40, 40, 44, 255)
            ImageDraw.Draw(prev).rectangle([x, y, x + cell, y + cell], fill=col)
    x = gap
    for c in chips:
        y = (total_h - c.size[1]) // 2
        prev.paste(c, (x, y), c)
        x += c.size[0] + gap
    prev.save(UI / "level_badges_preview.png")
    print("wrote", UI / "level_badges_preview.png")


def build_lineup(meta):
    """A/B/C/boss on checkerboard with clear scale."""
    tiers = ["bristle_cub", "thornpelt_bear", "dire_thornpelt", "elder_thornpelt"]
    labels = ["A · Bristle Cub", "B · Thornpelt Bear", "C · Dire Thornpelt", "Boss · Elder Thornpelt"]
    cuts = []
    for t in tiers:
        # use idle f0 from strip
        fw = FRAME_W[t]
        strip = Image.open(SPRITES / f"{t}_idle.png")
        fr = strip.crop((0, 0, fw, FRAME_H))
        cuts.append(fr)

    gap = 24
    # scale display: keep native frame sizes side by side so progression is clear
    W = sum(c.size[0] for c in cuts) + gap * (len(cuts) + 1)
    H = FRAME_H + 70
    prev = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    cell = 14
    for y in range(0, H, cell):
        for x in range(0, W, cell):
            col = (48, 52, 58, 255) if ((x // cell) + (y // cell)) % 2 == 0 else (34, 36, 40, 255)
            ImageDraw.Draw(prev).rectangle([x, y, x + cell, y + cell], fill=col)

    font = load_font(14)
    font_sm = load_font(11)
    x = gap
    d = ImageDraw.Draw(prev)
    for fr, lab, t in zip(cuts, labels, tiers):
        y = 28
        prev.paste(fr, (x, y), fr)
        # label
        d.text((x + 4, 6), lab, font=font_sm, fill=(255, 250, 200, 255))
        # height tick
        d.text((x + 4, H - 22), f"{FRAME_W[t]}×{FRAME_H} · scale ladder", font=font_sm, fill=(180, 180, 160, 255))
        x += fr.size[0] + gap

    d.text((gap, H - 40), "AFK Slayer · Level 1 Bear family · Option C · transparent QA", font=font, fill=(201, 162, 39, 255))
    out = BEARS / "lineup_preview.png"
    prev.save(out)
    print("wrote", out, prev.size)
    return out


def write_docs(bear_meta):
    # INTEGRATION.md
    lines = [
        "# AFK Slayer — Level 1 Bear family (integration)",
        "",
        "**Locked look:** `art/v3/target/option_c_locked.png` (Option C)",
        "**Status:** LIVE ladder for Level 1 hunt (replaces Undercroft hands/spectres/mages as active targets).",
        "**Path:** `art/v3b/anim/sprites/` (strips) · concepts `art/v3b/creatures/bears/`",
        "",
        "## Silhouette language",
        "",
        "Original IP thorned / bristled brown-grey bears (painterly faceted low-poly).",
        "Soft oval floor shadows baked in. Gold tip accents on dire/elder thorns — not neon.",
        "Readable ~48–72px tall on phone. `frame_h` = **156** (matches pilot strips).",
        "",
        "## Scale ladder (boss = 100%)",
        "",
        "| Id | Role | Scale | displayLevel | Strips |",
        "|---|---|---:|---:|---|",
        "| `bristle_cub` | A · cub | ~55% | 8 | idle / walk / attack (6) |",
        "| `thornpelt_bear` | B · adult | ~75% | 18 | idle / walk / attack (6) |",
        "| `dire_thornpelt` | C · elite | ~90% | 26 | idle / walk / attack (6) |",
        "| `elder_thornpelt` | Boss | 100% | 30 | idle / attack (6) — no walk |",
        "",
        "## Frame table",
        "",
        "| File | Frames | Frame size (w×h) | FPS idle | FPS walk | FPS attack |",
        "|---|---:|---|---:|---:|---:|",
    ]
    for name, m in bear_meta.items():
        lines.append(
            f"| `sprites/{name}` | {m['frames']} | {m['frame_w']}×{m['frame_h']} | 6–8 | 8–10 | 10–12 |"
        )
    lines += [
        "",
        "## New Bot wiring notes",
        "",
        "1. Map contracts / visual ids:",
        "   - Bristle Cub → `bristle_cub_*`",
        "   - Thornpelt Bear → `thornpelt_bear_*`",
        "   - Dire Thornpelt → `dire_thornpelt_*`",
        "   - Elder Thornpelt (boss fight) → `elder_thornpelt_*`",
        "2. Do **not** use archived Undercroft ladder sprites (`spectre_*`, `undercroft_mage_*`, `undercroft_overseer_*`, `crawling_hands_*`) for Level 1–3 hunt.",
        "3. Player / Briar / Quill pilot strips stay live unchanged.",
        "4. CSS: no solid `background-color` behind sprite; use transparent PNG only.",
        "5. Level chrome chips: `art/v3b/ui/level_badge_{1,2,3}.png` — text exactly `Level N`.",
        "6. Boss access via Slayer points → Fight boss (see `design/level-boss-progression.md`).",
        "",
        "## Previews",
        "",
        "- `creatures/bears/lineup_preview.png` — A/B/C/boss scale on checkerboard",
        "- `ui/level_badges_preview.png` — Level chips QA",
        "- Per-tier concepts under `creatures/bears/` and `_gen/`",
        "",
        "## Art method",
        "",
        "Flat chroma green (#00b140) paint → border flood-fill chroma key → soft oval shadow → strips.",
        "GenerateImage was not callable in this executor session; faceted Option-C silhouettes were painted procedurally to match locked board + pilot grit. Re-run with GenerateImage pose frames when available for articulated upgrades.",
        "",
        "## Regen",
        "",
        "```bash",
        "/workspace/.venv-art/bin/python art/v3b/creatures/bears/build_bears_and_badges.py",
        "```",
    ]
    (BEARS / "INTEGRATION.md").write_text("\n".join(lines) + "\n")
    print("wrote INTEGRATION.md")

    archive = """# ARCHIVE — Undercroft ladder (not live for Level 1–3)

**Date:** 2026-09-23  
**Decision:** Locked with `design/creature-boss-families.md` — Level 1 = Bears, Level 2 = Wolves, Level 3 = Spiders.

## ARCHIVED as live hunt ladder

These visual ids / strips must **not** be used for Level 1–3 hunt targets going forward.
Files may remain on disk under `art/v3b/anim/sprites/` and `art/v3b/monsters/` for reference or rollback.

| Visual id | Files (examples) | Old role |
|---|---|---|
| `spectre` | `spectre_idle.png`, `spectre_attack.png` | tunnel_bats / banshee stand-in |
| `undercroft_mage` | `undercroft_mage_idle.png`, `undercroft_mage_attack.png` | drain_leeches / mage |
| `undercroft_overseer` | `undercroft_overseer_idle.png`, `undercroft_overseer_attack.png` | sewer_king boss |
| `crawling_hands` | `crawling_hands_idle.png`, `crawling_hands_walk.png`, `crawling_hands_attack.png` | cave_rats / hands |

Concept boards under `art/v3b/monsters/` are likewise archived as live ladder art.

## STILL LIVE

| Id | Notes |
|---|---|
| `player_*` | Pilot mage — keep |
| `briar_*` | Melee companion — keep |
| `quill_*` / `quill_turret` | Archer + turret — keep |
| `arrow.png` / `bolt.png` | Projectiles — keep |
| **Bear family** | `bristle_cub_*`, `thornpelt_bear_*`, `dire_thornpelt_*`, `elder_thornpelt_*` — **Level 1 live** |

## Player chrome

Show **Level 1 / Level 2 / Level 3** (badge chips in `art/v3b/ui/`). Do not surface Undercroft / Fenwatch dens as primary chrome.
"""
    (ROOT / "ARCHIVE_UNDERCROFT.md").write_text(archive)
    print("wrote ARCHIVE_UNDERCROFT.md")


def update_meta(bear_meta):
    meta_path = ROOT / "anim" / "_meta.json"
    data = json.loads(meta_path.read_text())
    # keep existing pilot entries; add bears; leave archived undercroft entries if present
    for k, v in bear_meta.items():
        data["sprites"][k] = v
    data["pack"] = "v3b-anim-clean-cutouts+bears"
    data["level1_bears"] = True
    data["archived_live_ladder"] = [
        "spectre",
        "undercroft_mage",
        "undercroft_overseer",
        "crawling_hands",
    ]
    meta_path.write_text(json.dumps(data, indent=2) + "\n")
    print("updated", meta_path)


def qa_report(bear_meta):
    issues = []
    for name in list(bear_meta.keys()) + [
        "level_badge_1.png",
        "level_badge_2.png",
        "level_badge_3.png",
    ]:
        if name.startswith("level_"):
            path = UI / name
        else:
            path = SPRITES / name
        im = Image.open(path).convert("RGBA")
        c = im.getpixel((0, 0))
        if c[3] != 0:
            issues.append(f"{name}: corner alpha={c[3]} (want 0)")
        # opaque rectangular mat heuristic: if >40% of edge pixels opaque
        arr = np.array(im)
        edge = np.concatenate(
            [arr[0, :, 3], arr[-1, :, 3], arr[:, 0, 3], arr[:, -1, 3]]
        )
        if (edge > 200).mean() > 0.35:
            issues.append(f"{name}: edge opacity high — possible mat")
    # scale check: elder content bbox taller than cub
    def content_h(tier):
        fr = Image.open(SPRITES / f"{tier}_idle.png").crop((0, 0, FRAME_W[tier], FRAME_H))
        bb = fr.getbbox()
        return (bb[3] - bb[1]) if bb else 0

    hs = {t: content_h(t) for t in FRAME_W}
    print("content heights", hs)
    if not (hs["bristle_cub"] < hs["thornpelt_bear"] < hs["dire_thornpelt"] <= hs["elder_thornpelt"] + 2):
        issues.append(f"scale ladder weak: {hs}")
    return issues


def main():
    print("=== badges ===")
    build_badges()
    print("=== bears ===")
    bear_meta = build_all_bears()
    print("=== lineup ===")
    build_lineup(bear_meta)
    print("=== docs ===")
    write_docs(bear_meta)
    update_meta(bear_meta)
    print("=== QA ===")
    issues = qa_report(bear_meta)
    if issues:
        print("QA ISSUES:")
        for i in issues:
            print(" -", i)
    else:
        print("QA OK — corners transparent, scale ladder OK")
    # write qa summary
    (BEARS / "_qa_summary.txt").write_text(
        "issues:\n" + ("\n".join(issues) if issues else "none") + "\n"
    )


if __name__ == "__main__":
    main()
