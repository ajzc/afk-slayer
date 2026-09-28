#!/usr/bin/env python3
"""Generate Option C player bolt projectile FX set for AFK Slayer.

Painterly faceted low-poly crystal bolt matching the mage staff orb palette.
Work product lives only in this folder.
"""
from __future__ import annotations

import math
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(__file__).resolve().parent

# Palette (locked Option C / staff orb)
LILAC = (233, 221, 255, 255)       # #E9DDFF
VIOLET = (155, 107, 224, 255)      # #9B6BE0
DEEP = (75, 42, 138, 255)          # #4B2A8A
CORE = (255, 246, 255, 255)        # #FFF6FF near-white core
GOLD = (240, 192, 32, 255)         # #F0C020
GOLD_HI = (255, 232, 160, 255)     # #FFE8A0
OUTLINE = (26, 20, 38, 255)        # #1A1426
DEEP_EDGE = (40, 22, 72, 255)
GOLD_DEEP = (160, 110, 20, 255)
SOFT_VIO = (180, 140, 240, 255)

SS = 4  # supersample factor for flat-shaded body


def hex_rgba(h: str, a: int = 255):
    h = h.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return (r, g, b, a)


def blank(w: int, h: int) -> Image.Image:
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


def down_ss(im: Image.Image, tw: int, th: int) -> Image.Image:
    """Downsample supersampled RGBA with LANCZOS; scrub grey/dark halos."""
    out = im.resize((tw, th), Image.Resampling.LANCZOS)
    a = np.array(out, dtype=np.float32)
    rgb = a[:, :, :3]
    alpha = a[:, :, 3]
    # Kill near-transparent fringe that looks like grey boxes
    low = alpha < 18
    a[low] = 0
    # Where alpha is weak and chroma is near-neutral dark, kill it
    luma = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]
    maxc = rgb.max(axis=2)
    minc = rgb.min(axis=2)
    chroma = maxc - minc
    fringe = (alpha > 0) & (alpha < 90) & (luma < 55) & (chroma < 28)
    a[fringe] = 0
    # Premultiply cleanup: if alpha tiny, zero
    a[a[:, :, 3] < 8] = 0
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def draw_poly(draw: ImageDraw.ImageDraw, pts, fill):
    draw.polygon(pts, fill=fill)


def soft_glow(w: int, h: int, cx: float, cy: float, rx: float, ry: float,
              color, peak_a: int = 110) -> Image.Image:
    """Elliptical soft glow, additive-looking on transparent."""
    img = blank(w, h)
    yy, xx = np.mgrid[0:h, 0:w]
    nx = (xx - cx) / max(rx, 1e-6)
    ny = (yy - cy) / max(ry, 1e-6)
    d = np.sqrt(nx * nx + ny * ny)
    fall = np.clip(1.0 - d, 0, 1)
    fall = fall ** 1.6
    a = (fall * peak_a).astype(np.uint8)
    arr = np.zeros((h, w, 4), dtype=np.uint8)
    arr[:, :, 0] = color[0]
    arr[:, :, 1] = color[1]
    arr[:, :, 2] = color[2]
    arr[:, :, 3] = a
    return Image.fromarray(arr, "RGBA")


def alpha_composite(base: Image.Image, overlay: Image.Image, xy=(0, 0)) -> Image.Image:
    b = base.copy()
    b.alpha_composite(overlay, dest=xy)
    return b


# ---------------------------------------------------------------------------
# BOLT body (supersampled)
# ---------------------------------------------------------------------------

def draw_bolt_ss(shimmer: float = 0.0) -> Image.Image:
    """Draw bolt at 48*SS x 16*SS facing right. Tip near right edge.
    shimmer in [0,1] shifts highlight facet slightly for anim frame 1.
    """
    W, H = 48 * SS, 16 * SS
    img = blank(W, H)
    draw = ImageDraw.Draw(img)

    # Coordinate system in SS pixels. Tip at ~x=W-2*SS, center y=H/2
    tip_x = W - 2 * SS
    tail_x = 3 * SS
    cy = H / 2
    # Crystal head occupies roughly right 55% of bolt; gold band + short shaft left
    # Head base (where facets meet shaft) around x = tip - 22*SS
    head_base = tip_x - 22 * SS
    # Half-height of head at base
    head_h = 5.2 * SS
    # Tip is sharp diamond point

    # Soft violet halo behind body (drawn first, under outline)
    halo = soft_glow(W, H, tip_x - 10 * SS, cy, 19 * SS, 7.0 * SS,
                     (160, 120, 230), peak_a=int(110 + 30 * shimmer))
    img = alpha_composite(img, halo)
    # Slight core glow
    core_g = soft_glow(W, H, tip_x - 7 * SS, cy, 8 * SS, 3.6 * SS,
                       (255, 246, 255), peak_a=int(95 + 35 * shimmer))
    img = alpha_composite(img, core_g)
    draw = ImageDraw.Draw(img)

    # --- Outline silhouette (slightly larger) ---
    # Full silhouette: tapered diamond head + thin shaft + gold fletch wedge at tail
    sil = [
        (tip_x + 1.2 * SS, cy),                          # tip
        (head_base + 2 * SS, cy - head_h - 1.1 * SS),    # upper head corner
        (tail_x + 4 * SS, cy - 2.4 * SS),                # upper shaft
        (tail_x - 0.5 * SS, cy),                         # tail point / fletch tip
        (tail_x + 4 * SS, cy + 2.4 * SS),                # lower shaft
        (head_base + 2 * SS, cy + head_h + 1.1 * SS),    # lower head corner
    ]
    draw_poly(draw, sil, OUTLINE)

    # --- Shaft (deep violet thin body behind gold band) ---
    shaft = [
        (head_base + 1 * SS, cy - 1.6 * SS),
        (tail_x + 5 * SS, cy - 1.35 * SS),
        (tail_x + 5 * SS, cy + 1.35 * SS),
        (head_base + 1 * SS, cy + 1.6 * SS),
    ]
    draw_poly(draw, shaft, DEEP)

    # Shaft top highlight stripe
    shaft_hi = [
        (head_base + 1 * SS, cy - 1.6 * SS),
        (tail_x + 5 * SS, cy - 1.35 * SS),
        (tail_x + 5 * SS, cy - 0.15 * SS),
        (head_base + 1 * SS, cy - 0.2 * SS),
    ]
    draw_poly(draw, shaft_hi, (95, 55, 160, 255))

    # --- Gold band / fletch accent near head_base ---
    band_w = 4.0 * SS
    band_x0 = head_base - 0.6 * SS
    band = [
        (band_x0 + band_w, cy - head_h * 0.72),
        (band_x0, cy - 2.0 * SS),
        (band_x0, cy + 2.0 * SS),
        (band_x0 + band_w, cy + head_h * 0.72),
    ]
    draw_poly(draw, band, GOLD)
    # Gold highlight top
    band_hi = [
        (band_x0 + band_w, cy - head_h * 0.72),
        (band_x0, cy - 2.0 * SS),
        (band_x0, cy - 0.35 * SS),
        (band_x0 + band_w * 0.85, cy - 0.3 * SS),
    ]
    draw_poly(draw, band_hi, GOLD_HI)
    # Gold deep underside
    band_lo = [
        (band_x0, cy + 0.4 * SS),
        (band_x0 + band_w * 0.9, cy + 0.35 * SS),
        (band_x0 + band_w, cy + head_h * 0.72),
        (band_x0, cy + 2.0 * SS),
    ]
    draw_poly(draw, band_lo, GOLD_DEEP)

    # Small gold fletch chevron at tail
    fletch = [
        (tail_x + 0.5 * SS, cy),
        (tail_x + 6.5 * SS, cy - 2.8 * SS),
        (tail_x + 5.0 * SS, cy - 0.9 * SS),
        (tail_x + 5.0 * SS, cy + 0.9 * SS),
        (tail_x + 6.5 * SS, cy + 2.8 * SS),
    ]
    draw_poly(draw, fletch, GOLD)
    fletch_hi = [
        (tail_x + 0.5 * SS, cy),
        (tail_x + 6.5 * SS, cy - 2.8 * SS),
        (tail_x + 5.0 * SS, cy - 0.9 * SS),
    ]
    draw_poly(draw, fletch_hi, GOLD_HI)

    # --- Crystal head facets (flat shaded polygons) ---
    # Mid ridge line along center; tip/top/bottom/side facets
    mid_hi_y = cy - 0.15 * SS - shimmer * 0.4 * SS
    ridge_x = tip_x - 9 * SS  # bright core facet center

    # Top-front facet (lilac highlight) — main readable plane
    top_front = [
        (tip_x, cy),
        (ridge_x, mid_hi_y - 0.8 * SS),
        (head_base + 2.5 * SS, cy - head_h),
        (head_base + 3.5 * SS, cy - 0.4 * SS),
    ]
    # Shift slightly with shimmer
    top_front_col = LILAC if shimmer < 0.5 else (245, 238, 255, 255)
    draw_poly(draw, top_front, top_front_col)

    # Top-rear facet (mid violet)
    top_rear = [
        (ridge_x, mid_hi_y - 0.8 * SS),
        (head_base + 2.5 * SS, cy - head_h),
        (band_x0 + band_w + 0.5 * SS, cy - head_h * 0.55),
        (head_base + 3.5 * SS, cy - 0.4 * SS),
    ]
    draw_poly(draw, top_rear, VIOLET)

    # Bottom-front facet (deep, shadowed)
    bot_front = [
        (tip_x, cy),
        (head_base + 3.5 * SS, cy + 0.5 * SS),
        (head_base + 2.5 * SS, cy + head_h),
        (ridge_x + 1 * SS, cy + 2.4 * SS),
    ]
    draw_poly(draw, bot_front, DEEP)

    # Bottom-rear facet (mid-deep)
    bot_rear = [
        (head_base + 3.5 * SS, cy + 0.5 * SS),
        (band_x0 + band_w + 0.5 * SS, cy + head_h * 0.55),
        (head_base + 2.5 * SS, cy + head_h),
    ]
    draw_poly(draw, bot_rear, (90, 50, 155, 255))

    # Center bright core diamond (near-white) — key for instant read at small size
    # Large enough to survive 48x16 downsample as a clear hot spot
    core_size = 4.6 * SS + shimmer * 0.8 * SS
    core = [
        (tip_x - 1.8 * SS, cy),
        (ridge_x + 2.2 * SS, cy - core_size * 0.62),
        (ridge_x - 2.8 * SS - shimmer * 0.5 * SS, cy),
        (ridge_x + 2.2 * SS, cy + core_size * 0.50),
    ]
    draw_poly(draw, core, CORE)
    # Inner hotter speck
    hot = [
        (tip_x - 3.0 * SS, cy),
        (tip_x - 6.5 * SS, cy - 1.6 * SS),
        (tip_x - 7.5 * SS, cy),
        (tip_x - 6.5 * SS, cy + 1.3 * SS),
    ]
    draw_poly(draw, hot, (255, 255, 255, 255))
    # Tiny specular chip on top facet
    chip = [
        (tip_x - 4.0 * SS, cy - 1.0 * SS),
        (tip_x - 7.0 * SS, cy - 2.2 * SS),
        (tip_x - 5.8 * SS, cy - 0.3 * SS),
    ]
    draw_poly(draw, chip, (255, 255, 255, 240))

    # Side edge facet (narrow mid violet for 3D read)
    side = [
        (tip_x, cy),
        (ridge_x + 1 * SS, cy + 2.4 * SS),
        (head_base + 3.5 * SS, cy + 0.5 * SS),
        (ridge_x - 0.5 * SS, cy + 0.2 * SS),
    ]
    # Soften by drawing a slightly translucent mid
    side_img = blank(W, H)
    ImageDraw.Draw(side_img).polygon(side, fill=(130, 85, 200, 180))
    img = alpha_composite(img, side_img)
    draw = ImageDraw.Draw(img)

    # Re-draw tip point crisp on top for silhouette
    tip_cap = [
        (tip_x, cy),
        (tip_x - 4.5 * SS, cy - 1.8 * SS),
        (tip_x - 4.5 * SS, cy + 1.8 * SS),
    ]
    # outline tip only
    tip_out = [
        (tip_x + 0.6 * SS, cy),
        (tip_x - 4.8 * SS, cy - 2.1 * SS),
        (tip_x - 4.8 * SS, cy + 2.1 * SS),
    ]
    # Don't cover core — just ensure outline at tip edge via thin stroke
    draw.line([(tip_x, cy), (tip_x - 5 * SS, cy - 2.0 * SS)], fill=OUTLINE, width=max(1, SS // 2))
    draw.line([(tip_x, cy), (tip_x - 5 * SS, cy + 2.0 * SS)], fill=OUTLINE, width=max(1, SS // 2))

    # Inner rim highlight along top edge of crystal for crisp read
    draw.line(
        [(tip_x - 1 * SS, cy - 0.3 * SS), (head_base + 3 * SS, cy - head_h + 0.8 * SS)],
        fill=(245, 235, 255, 200),
        width=max(1, SS // 3),
    )

    return img


def make_bolt(shimmer: float = 0.0) -> Image.Image:
    ss = draw_bolt_ss(shimmer=shimmer)
    return down_ss(ss, 48, 16)


def make_bolt_2x(shimmer: float = 0.0) -> Image.Image:
    ss = draw_bolt_ss(shimmer=shimmer)
    return down_ss(ss, 96, 32)


def make_bolt_anim() -> Image.Image:
    f0 = make_bolt(0.0)
    f1 = make_bolt(1.0)
    strip = blank(96, 16)
    strip.paste(f0, (0, 0), f0)
    strip.paste(f1, (48, 0), f1)
    return strip


# ---------------------------------------------------------------------------
# TRAIL — 4 frames x 48x16, right edge meets bolt tail
# ---------------------------------------------------------------------------

def make_trail_frame(frame: int, scale: int = 1) -> Image.Image:
    """frame 0 = strongest/longest, frame 3 = faintest.
    Right edge of trail aligns with bolt tail (left of bolt).
    """
    W, H = 48 * scale, 16 * scale
    img = blank(W, H)
    # Strength / length falloff
    strengths = [1.0, 0.78, 0.50, 0.28]
    lengths = [1.0, 0.85, 0.62, 0.40]
    s = strengths[frame]
    L = lengths[frame]
    # Trail tapers leftward; right edge at x=W-1 is attachment to bolt tail
    # Draw as layered soft streaks + a few faceted shard chevrons
    cy = H / 2
    # Main violet streak
    streak_w = int(44 * L * scale)
    x1 = W - 1
    x0 = x1 - streak_w
    glow = soft_glow(W, H, (x0 + x1) / 2, cy,
                     streak_w * 0.55, (4.2 + 1.4 * s) * scale,
                     (155, 107, 224), peak_a=int(175 * s))
    img = alpha_composite(img, glow)
    # Gold warm core nearer the bolt (right side)
    gold_g = soft_glow(W, H, x1 - 8 * scale, cy,
                       11 * scale * L, 2.5 * scale,
                       (255, 232, 160), peak_a=int(140 * s))
    img = alpha_composite(img, gold_g)
    # Thin bright ribbon
    ribbon = soft_glow(W, H, x1 - 14 * scale * L, cy,
                       17 * scale * L, 1.35 * scale,
                       (233, 221, 255), peak_a=int(190 * s))
    img = alpha_composite(img, ribbon)

    # Faceted shard chevrons along trail (flat polys, fading)
    draw = ImageDraw.Draw(img)
    n = 4
    for i in range(n):
        t = i / max(n - 1, 1)
        # from right (near bolt) to left (tail of trail)
        x = x1 - (4 + t * streak_w * 0.92)
        hh = (2.6 - t * 1.6) * scale * s
        alpha = int((210 - t * 130) * s)
        if alpha < 18:
            continue
        col_v = (155, 107, 224, alpha)
        col_g = (240, 192, 32, int(alpha * 0.7))
        # small chevron pointing right (motion)
        chev = [
            (x + 3.5 * scale, cy),
            (x - 1.5 * scale, cy - hh),
            (x - 0.2 * scale, cy),
            (x - 1.5 * scale, cy + hh),
        ]
        draw.polygon(chev, fill=col_v if i % 2 == 0 else col_g)

    # Scrub fringe
    a = np.array(img, dtype=np.float32)
    a[a[:, :, 3] < 6] = 0
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def make_trail(scale: int = 1) -> Image.Image:
    fw, fh = 48 * scale, 16 * scale
    strip = blank(fw * 4, fh)
    for i in range(4):
        fr = make_trail_frame(i, scale=scale)
        strip.paste(fr, (i * fw, 0), fr)
    return strip


# ---------------------------------------------------------------------------
# IMPACT — 4 frames x 48x48 centered
# ---------------------------------------------------------------------------

def make_impact_frame(frame: int, scale: int = 1) -> Image.Image:
    S = 48 * scale
    img = blank(S, S)
    cx = cy = S / 2
    draw = ImageDraw.Draw(img)

    if frame == 0:
        # Small bright core burst
        g = soft_glow(S, S, cx, cy, 7 * scale, 7 * scale, (255, 246, 255), peak_a=220)
        img = alpha_composite(img, g)
        g2 = soft_glow(S, S, cx, cy, 12 * scale, 12 * scale, (180, 140, 240), peak_a=120)
        img = alpha_composite(img, g2)
        # Tiny faceted diamond core
        d = 4.5 * scale
        core = [(cx, cy - d), (cx + d, cy), (cx, cy + d), (cx - d, cy)]
        ImageDraw.Draw(img).polygon(core, fill=CORE)
        # gold spark dots
        for ang in (0.2, 1.3, 2.5, 4.0, 5.2):
            px = cx + math.cos(ang) * 8 * scale
            py = cy + math.sin(ang) * 8 * scale
            r = 1.2 * scale
            ImageDraw.Draw(img).ellipse([px - r, py - r, px + r, py + r], fill=GOLD_HI)

    elif frame == 1:
        # Faceted star / shard burst with gold sparks
        g = soft_glow(S, S, cx, cy, 14 * scale, 14 * scale, (155, 107, 224), peak_a=100)
        img = alpha_composite(img, g)
        draw = ImageDraw.Draw(img)
        # 8-point faceted star
        pts_outer = []
        for i in range(8):
            ang = -math.pi / 2 + i * math.pi / 4
            r = (17 if i % 2 == 0 else 8) * scale
            pts_outer.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
        # Draw as overlapping diamond shards
        cols = [LILAC, VIOLET, DEEP, GOLD, LILAC, VIOLET, GOLD_HI, DEEP]
        for i in range(8):
            ang = -math.pi / 2 + i * math.pi / 4
            r1, r2 = 18 * scale, 6 * scale
            p0 = (cx, cy)
            p1 = (cx + math.cos(ang - 0.18) * r2, cy + math.sin(ang - 0.18) * r2)
            p2 = (cx + math.cos(ang) * r1, cy + math.sin(ang) * r1)
            p3 = (cx + math.cos(ang + 0.18) * r2, cy + math.sin(ang + 0.18) * r2)
            draw.polygon([p0, p1, p2, p3], fill=cols[i])
        # Center core
        d = 3.5 * scale
        draw.polygon([(cx, cy - d), (cx + d, cy), (cx, cy + d), (cx - d, cy)], fill=CORE)
        # Gold sparks
        for i, ang in enumerate(np.linspace(0, 2 * math.pi, 10, endpoint=False)):
            dist = (14 + (i % 3) * 3) * scale
            px = cx + math.cos(ang + 0.3) * dist
            py = cy + math.sin(ang + 0.3) * dist
            s = (1.0 + (i % 2) * 0.6) * scale
            spark = [
                (px, py - 2.2 * s),
                (px + 0.7 * s, py),
                (px, py + 2.2 * s),
                (px - 0.7 * s, py),
            ]
            draw.polygon(spark, fill=GOLD_HI if i % 2 == 0 else GOLD)

    elif frame == 2:
        # Expanding ring breaking into shards
        g = soft_glow(S, S, cx, cy, 18 * scale, 18 * scale, (120, 80, 200), peak_a=55)
        img = alpha_composite(img, g)
        draw = ImageDraw.Draw(img)
        # Ring as arc segments (faceted)
        R = 16 * scale
        for i in range(12):
            a0 = i * (2 * math.pi / 12)
            a1 = a0 + 0.35
            p_in0 = (cx + math.cos(a0) * (R - 2.2 * scale), cy + math.sin(a0) * (R - 2.2 * scale))
            p_in1 = (cx + math.cos(a1) * (R - 2.2 * scale), cy + math.sin(a1) * (R - 2.2 * scale))
            p_out0 = (cx + math.cos(a0) * (R + 1.5 * scale), cy + math.sin(a0) * (R + 1.5 * scale))
            p_out1 = (cx + math.cos(a1) * (R + 1.5 * scale), cy + math.sin(a1) * (R + 1.5 * scale))
            col = VIOLET if i % 3 else (LILAC if i % 2 == 0 else GOLD)
            # fade alpha via separate layer
            frag = blank(S, S)
            ImageDraw.Draw(frag).polygon([p_out0, p_out1, p_in1, p_in0], fill=col)
            # reduce alpha
            fa = np.array(frag)
            fa[:, :, 3] = (fa[:, :, 3].astype(np.float32) * 0.85).astype(np.uint8)
            img = alpha_composite(img, Image.fromarray(fa, "RGBA"))
        # Flying shards outward
        draw = ImageDraw.Draw(img)
        for i in range(8):
            ang = i * (2 * math.pi / 8) + 0.2
            dist = 20 * scale
            px = cx + math.cos(ang) * dist
            py = cy + math.sin(ang) * dist
            sx, sy = math.cos(ang), math.sin(ang)
            shard = [
                (px + sx * 4 * scale, py + sy * 4 * scale),
                (px - sy * 1.4 * scale, py + sx * 1.4 * scale),
                (px - sx * 2 * scale, py - sy * 2 * scale),
                (px + sy * 1.4 * scale, py - sx * 1.4 * scale),
            ]
            draw.polygon(shard, fill=LILAC if i % 2 == 0 else GOLD)

    else:  # frame 3 — faint fading shards
        g = soft_glow(S, S, cx, cy, 10 * scale, 10 * scale, (155, 107, 224), peak_a=30)
        img = alpha_composite(img, g)
        draw = ImageDraw.Draw(img)
        for i in range(7):
            ang = i * (2 * math.pi / 7) + 0.5
            dist = 18 * scale
            px = cx + math.cos(ang) * dist
            py = cy + math.sin(ang) * dist
            sx, sy = math.cos(ang), math.sin(ang)
            shard = [
                (px + sx * 3 * scale, py + sy * 3 * scale),
                (px - sy * 1.0 * scale, py + sx * 1.0 * scale),
                (px - sx * 1.5 * scale, py - sy * 1.5 * scale),
                (px + sy * 1.0 * scale, py - sx * 1.0 * scale),
            ]
            col = (233, 221, 255, 90) if i % 2 == 0 else (240, 192, 32, 70)
            draw.polygon(shard, fill=col)
        # faint center
        d = 2 * scale
        draw.polygon([(cx, cy - d), (cx + d, cy), (cx, cy + d), (cx - d, cy)],
                     fill=(255, 246, 255, 60))

    a = np.array(img, dtype=np.float32)
    a[a[:, :, 3] < 8] = 0
    # kill dark neutral fringe
    rgb = a[:, :, :3]
    alpha = a[:, :, 3]
    luma = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    fringe = (alpha > 0) & (alpha < 70) & (luma < 40) & (chroma < 25)
    a[fringe] = 0
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def make_impact(scale: int = 1) -> Image.Image:
    fw = fh = 48 * scale
    strip = blank(fw * 4, fh)
    for i in range(4):
        fr = make_impact_frame(i, scale=scale)
        strip.paste(fr, (i * fw, 0), fr)
    return strip


# ---------------------------------------------------------------------------
# MUZZLE — 3 frames x 32x32, facing right, flash/peak/fade
# ---------------------------------------------------------------------------

def make_muzzle_frame(frame: int, scale: int = 1) -> Image.Image:
    S = 32 * scale
    img = blank(S, S)
    # Anchor conceptually at left-center (staff orb); flash bursts to the right
    ax, ay = 6 * scale, S / 2  # origin near left

    if frame == 0:
        # Flash — small bright kick
        g = soft_glow(S, S, ax + 4 * scale, ay, 8 * scale, 7 * scale, (255, 246, 255), peak_a=200)
        img = alpha_composite(img, g)
        g2 = soft_glow(S, S, ax + 6 * scale, ay, 11 * scale, 8 * scale, (180, 130, 240), peak_a=110)
        img = alpha_composite(img, g2)
        draw = ImageDraw.Draw(img)
        # Small gold flare wedge facing right
        wedge = [
            (ax, ay),
            (ax + 10 * scale, ay - 5 * scale),
            (ax + 12 * scale, ay),
            (ax + 10 * scale, ay + 5 * scale),
        ]
        draw.polygon(wedge, fill=GOLD_HI)
        # Tiny violet shards
        for ang, rr in ((-0.5, 9), (0.0, 12), (0.5, 9)):
            px = ax + math.cos(ang) * rr * scale
            py = ay + math.sin(ang) * rr * scale
            draw.polygon([
                (px, py - 1.5 * scale), (px + 2 * scale, py),
                (px, py + 1.5 * scale), (px - 1 * scale, py),
            ], fill=LILAC)

    elif frame == 1:
        # Peak — bigger violet/gold burst
        g = soft_glow(S, S, ax + 8 * scale, ay, 13 * scale, 10 * scale, (155, 107, 224), peak_a=130)
        img = alpha_composite(img, g)
        g2 = soft_glow(S, S, ax + 5 * scale, ay, 7 * scale, 6 * scale, (255, 246, 255), peak_a=180)
        img = alpha_composite(img, g2)
        draw = ImageDraw.Draw(img)
        # Faceted burst star biased right
        for i, ang in enumerate(np.linspace(-1.0, 1.0, 7)):
            r = (14 if i % 2 == 0 else 9) * scale
            p0 = (ax + 2 * scale, ay)
            p1 = (ax + 2 * scale + math.cos(ang - 0.15) * 4 * scale,
                  ay + math.sin(ang - 0.15) * 4 * scale)
            p2 = (ax + 2 * scale + math.cos(ang) * r,
                  ay + math.sin(ang) * r)
            p3 = (ax + 2 * scale + math.cos(ang + 0.15) * 4 * scale,
                  ay + math.sin(ang + 0.15) * 4 * scale)
            col = GOLD_HI if i % 3 == 0 else (LILAC if i % 2 == 0 else VIOLET)
            draw.polygon([p0, p1, p2, p3], fill=col)
        # Core
        d = 3 * scale
        draw.polygon([
            (ax + 3 * scale, ay - d), (ax + 3 * scale + d, ay),
            (ax + 3 * scale, ay + d), (ax + 3 * scale - d * 0.6, ay),
        ], fill=CORE)

    else:
        # Fade — soft residual glow + few sparks
        g = soft_glow(S, S, ax + 6 * scale, ay, 10 * scale, 8 * scale, (155, 107, 224), peak_a=55)
        img = alpha_composite(img, g)
        g2 = soft_glow(S, S, ax + 4 * scale, ay, 5 * scale, 4 * scale, (255, 232, 160), peak_a=70)
        img = alpha_composite(img, g2)
        draw = ImageDraw.Draw(img)
        for ang, rr in ((-0.7, 11), (0.15, 13), (0.8, 10)):
            px = ax + math.cos(ang) * rr * scale
            py = ay + math.sin(ang) * rr * scale
            draw.polygon([
                (px, py - 1.2 * scale), (px + 1.5 * scale, py),
                (px, py + 1.2 * scale), (px - 0.8 * scale, py),
            ], fill=(240, 192, 32, 110))

    a = np.array(img, dtype=np.float32)
    a[a[:, :, 3] < 8] = 0
    rgb = a[:, :, :3]
    alpha = a[:, :, 3]
    luma = 0.2126 * rgb[:, :, 0] + 0.7152 * rgb[:, :, 1] + 0.0722 * rgb[:, :, 2]
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    fringe = (alpha > 0) & (alpha < 65) & (luma < 40) & (chroma < 25)
    a[fringe] = 0
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def make_muzzle(scale: int = 1) -> Image.Image:
    fw = fh = 32 * scale
    strip = blank(fw * 3, fh)
    for i in range(3):
        fr = make_muzzle_frame(i, scale=scale)
        strip.paste(fr, (i * fw, 0), fr)
    return strip


# ---------------------------------------------------------------------------
# QA
# ---------------------------------------------------------------------------

def qa_corners(im: Image.Image, name: str, issues: list):
    a = np.array(im)
    h, w = a.shape[:2]
    for (y, x, label) in [(0, 0, "TL"), (0, w - 1, "TR"), (h - 1, 0, "BL"), (h - 1, w - 1, "BR")]:
        if a[y, x, 3] > 5:
            issues.append(f"{name}: corner {label} not transparent (a={a[y,x,3]})")


def qa_no_box(im: Image.Image, name: str, issues: list, frame_w: int | None = None):
    """Check that there isn't a near-opaque rectangular matte."""
    a = np.array(im)
    alpha = a[:, :, 3]
    # If >40% of pixels are near-opaque AND corners are opaque-ish, flag
    if frame_w:
        n = a.shape[1] // frame_w
        for i in range(n):
            fr = a[:, i * frame_w:(i + 1) * frame_w]
            qa_corners(Image.fromarray(fr, "RGBA"), f"{name}[f{i}]", issues)
            qa_fringe_box(fr, f"{name}[f{i}]", issues)
    else:
        qa_fringe_box(a, name, issues)


def qa_fringe_box(a: np.ndarray, name: str, issues: list):
    alpha = a[:, :, 3]
    h, w = alpha.shape
    # Check border ring: if many border pixels are mid/high alpha dark, flag
    border = np.zeros_like(alpha, dtype=bool)
    border[0, :] = True
    border[-1, :] = True
    border[:, 0] = True
    border[:, -1] = True
    dark = (a[:, :, 0] < 50) & (a[:, :, 1] < 50) & (a[:, :, 2] < 50) & (alpha > 80)
    if (border & dark).sum() > max(4, (2 * (h + w)) * 0.15):
        issues.append(f"{name}: dark fringe box on border")


def contrast_visible(im: Image.Image, bg_rgb, name: str, issues: list):
    """Ensure some opaque pixels differ from bg by enough luma/chroma."""
    a = np.array(im)
    mask = a[:, :, 3] > 160
    if not mask.any():
        issues.append(f"{name}: no solid pixels for contrast check vs {bg_rgb}")
        return
    rgb = a[mask][:, :3].astype(np.float32)
    bg = np.array(bg_rgb, dtype=np.float32)
    diff = np.abs(rgb - bg).sum(axis=1)
    if diff.max() < 80:
        issues.append(f"{name}: poor contrast vs {bg_rgb} (max channel-sum diff {diff.max():.0f})")


# ---------------------------------------------------------------------------
# PREVIEW
# ---------------------------------------------------------------------------

def checker(w, h, c0=(40, 44, 52, 255), c1=(55, 60, 70, 255), cell=8):
    img = blank(w, h)
    a = np.zeros((h, w, 4), dtype=np.uint8)
    for y in range(h):
        for x in range(w):
            col = c0 if ((x // cell) + (y // cell)) % 2 == 0 else c1
            a[y, x] = col
    return Image.fromarray(a, "RGBA")


def label(draw, xy, text, fill=(220, 220, 230, 255)):
    draw.text(xy, text, fill=fill)


def make_preview(assets: dict) -> Image.Image:
    W, H = 780, 920
    canvas = Image.new("RGBA", (W, H), (18, 22, 30, 255))
    draw = ImageDraw.Draw(canvas)
    y = 16
    label(draw, (16, y), "AFK Slayer — Player Bolt FX (Option C)", fill=(255, 232, 160, 255))
    y += 28

    # --- Bolt 1x and 3x ---
    label(draw, (16, y), "bolt.png 48x16 (1x) and 3x scale")
    y += 20
    bg = checker(200, 40)
    canvas.paste(bg, (16, y), bg)
    bolt = assets["bolt"]
    canvas.paste(bolt, (24, y + 12), bolt)
    bolt3 = bolt.resize((48 * 3, 16 * 3), Image.Resampling.NEAREST)
    canvas.paste(bolt3, (100, y + 4), bolt3)
    # also on light beige
    beige = Image.new("RGBA", (200, 40), (205, 190, 156, 255))
    canvas.paste(beige, (360, y), beige)
    canvas.paste(bolt, (368, y + 12), bolt)
    canvas.paste(bolt3, (430, y + 4), bolt3)
    label(draw, (360, y - 14), "vs #CDBE9C", fill=(200, 190, 170, 255))
    y += 52

    # shimmer strip
    label(draw, (16, y), "bolt_anim.png 96x16 (2-frame shimmer)")
    y += 18
    bg = checker(120, 24)
    canvas.paste(bg, (16, y), bg)
    canvas.paste(assets["bolt_anim"], (20, y + 4), assets["bolt_anim"])
    y += 36

    # trail frames
    label(draw, (16, y), "bolt_trail.png — 4 frames x 48x16 (strong → gone)")
    y += 18
    trail = assets["trail"]
    bg = checker(trail.width + 8, trail.height + 8)
    canvas.paste(bg, (16, y), bg)
    canvas.paste(trail, (20, y + 4), trail)
    # show with bolt attached at right of frame0
    y += 32
    label(draw, (16, y), "trail f0 + bolt (right edge of trail = bolt tail)")
    y += 18
    combo_bg = checker(120, 28)
    canvas.paste(combo_bg, (16, y), combo_bg)
    t0 = assets["trail"].crop((0, 0, 48, 16))
    canvas.paste(t0, (20, y + 6), t0)
    canvas.paste(bolt, (20 + 48 - 2, y + 6), bolt)  # slight overlap at join
    y += 40

    # impact
    label(draw, (16, y), "bolt_impact.png — 4 frames x 48x48")
    y += 18
    impact = assets["impact"]
    bg = checker(impact.width + 8, impact.height + 8, cell=12)
    canvas.paste(bg, (16, y), bg)
    canvas.paste(impact, (20, y + 4), impact)
    y += 64

    # muzzle
    label(draw, (16, y), "muzzle.png — 3 frames x 32x32 (flash / peak / fade)")
    y += 18
    muzzle = assets["muzzle"]
    bg = checker(muzzle.width + 8, muzzle.height + 8, cell=8)
    canvas.paste(bg, (16, y), bg)
    canvas.paste(muzzle, (20, y + 4), muzzle)
    y += 48

    # Old vs new
    label(draw, (16, y), "OLD bolt (anim/sprites) vs NEW bolt (1x and 3x)")
    y += 18
    old = Image.open(OUT / "_old_bolt_ref.png").convert("RGBA")
    # fit old into ~78-wide slot scaled down to comparable height
    old_h = 32
    old_sc = old.resize((int(old.width * old_h / old.height), old_h), Image.Resampling.NEAREST)
    bg = checker(320, 44)
    canvas.paste(bg, (16, y), bg)
    canvas.paste(old_sc, (24, y + 6), old_sc)
    label(draw, (24, y + 36), "old", fill=(180, 100, 100, 255))
    canvas.paste(bolt3, (160, y + 6), bolt3)
    label(draw, (160, y + 36), "new x3", fill=(140, 220, 140, 255))
    y += 56

    # Phone mockup 390 wide
    label(draw, (16, y), "Phone mockup 390px — bolt+trail in flight + impact on target")
    y += 20
    phone_w, phone_h = 390, 260
    phone = Image.new("RGBA", (phone_w, phone_h), (27, 35, 48, 255))  # #1B2330
    pd = ImageDraw.Draw(phone)
    # stone floor tone band
    for i in range(8):
        tone = 35 + (i % 3) * 6
        pd.rectangle([0, 160 + i * 12, phone_w, 172 + i * 12],
                     fill=(tone, tone + 4, tone + 10, 255))
    # irregular stone-ish blocks
    rng = np.random.default_rng(3)
    for _ in range(40):
        x0 = int(rng.integers(0, phone_w - 40))
        y0 = int(rng.integers(170, phone_h - 20))
        ww = int(rng.integers(28, 70))
        hh = int(rng.integers(10, 22))
        c = int(rng.integers(38, 58))
        pd.rectangle([x0, y0, x0 + ww, y0 + hh], fill=(c, c + 3, c + 8, 255),
                     outline=(22, 26, 34, 255))
    # gold arena ring hint
    pd.ellipse([40, 30, 350, 200], outline=(200, 160, 50, 90), width=2)

    # Fake mage (left) — simple faceted stand-in orb+robe
    mx, my = 70, 120
    pd.polygon([(mx, my - 28), (mx + 14, my + 20), (mx - 14, my + 20)], fill=(70, 40, 110, 255))
    pd.ellipse([mx - 6, my - 36, mx + 6, my - 24], fill=(40, 30, 60, 255))
    # staff orb
    ox, oy = mx + 18, my - 10
    pd.ellipse([ox - 5, oy - 5, ox + 5, oy + 5], fill=(155, 107, 224, 255))
    pd.ellipse([ox - 2, oy - 2, ox + 2, oy + 2], fill=(255, 246, 255, 255))
    # gold cage ticks
    pd.arc([ox - 6, oy - 6, ox + 6, oy + 6], 0, 180, fill=GOLD[:3], width=1)

    # muzzle at orb
    m1 = assets["muzzle"].crop((32, 0, 64, 32))
    phone.alpha_composite(m1, (ox - 4, oy - 16))

    # Target (right)
    tx, ty = 300, 115
    pd.ellipse([tx - 18, ty - 22, tx + 18, ty + 22], fill=(70, 78, 88, 255), outline=(30, 34, 42, 255))
    pd.polygon([(tx - 8, ty - 10), (tx + 10, ty), (tx - 8, ty + 10)], fill=(90, 70, 60, 255))

    # Bolt + trail in flight
    bx, by = 160, 108
    t0 = assets["trail"].crop((0, 0, 48, 16))
    phone.alpha_composite(t0, (bx - 46, by))
    phone.alpha_composite(bolt, (bx, by))

    # Impact on target
    imp = assets["impact"].crop((48, 0, 96, 48))  # frame 1 peak
    phone.alpha_composite(imp, (tx - 24, ty - 24))

    # Damage number hint
    pd.text((tx + 10, ty - 36), "12", fill=(255, 232, 160, 220))

    # Phone chrome
    frame = Image.new("RGBA", (phone_w + 16, phone_h + 40), (12, 14, 18, 255))
    ImageDraw.Draw(frame).rounded_rectangle([0, 0, phone_w + 15, phone_h + 39],
                                            radius=18, outline=(60, 66, 78, 255), width=2)
    frame.paste(phone, (8, 24), phone)
    ImageDraw.Draw(frame).ellipse([phone_w // 2, 8, phone_w // 2 + 8, 16], fill=(40, 44, 52, 255))

    canvas.paste(frame, (16, y), frame)
    y += phone_h + 50
    label(draw, (16, min(y, H - 24)),
          "Anchors: bolt pivot=TIP (right); trail right-edge→bolt tail; impact centered; muzzle left-center→orb",
          fill=(160, 170, 190, 255))

    return canvas.convert("RGB")


# ---------------------------------------------------------------------------
# README
# ---------------------------------------------------------------------------

README = """# Player Bolt Projectile FX — AFK Slayer (Option C)

Original faceted crystal/arcane bolt set matching the mage's gold-caged purple staff orb.
Painterly flat-shaded facet polygons, soft restrained violet glow (not neon slash spam),
true transparent RGBA.

## Files

| File | Size | Frames | Notes |
|------|------|--------|-------|
| `bolt.png` | 48×16 | 1 | Facing right, tip at right edge |
| `bolt@2x.png` | 96×32 | 1 | Retina |
| `bolt_anim.png` | 96×16 | 2× (48×16) | Optional shimmer (core/halo pulse) |
| `bolt_trail.png` | 192×16 | 4× (48×16) | Strong → gone; sits behind bolt |
| `bolt_trail@2x.png` | 384×32 | 4× (96×32) | Retina |
| `bolt_impact.png` | 192×48 | 4× (48×48) | Core → star → ring/shards → fade |
| `bolt_impact@2x.png` | 384×96 | 4× (96×96) | Retina |
| `muzzle.png` | 96×32 | 3× (32×32) | Flash → peak → fade from staff orb |
| `muzzle@2x.png` | 192×64 | 3× (64×64) | Retina |
| `fx_preview.png` | — | — | 1x/3x bolt, strips, phone mockup, old vs new |
| `_qa_summary.txt` | — | — | QA result |

Generated by `gen_bolt_fx.py` (PIL/numpy, 4× supersample then downsample on bolt body).

## Anchors

- **Bolt pivot = TIP** (rightmost point of the crystal). Place the tip on the projectile
  position; the body trails to the left at 0°.
- **Trail**: right edge of each trail frame aligns to the bolt's **tail** (left end of bolt).
  Draw trail first, then bolt on top.
- **Impact**: centered on the hit point (frame center = impact position).
- **Muzzle**: **left-center** of each 32×32 frame sits on the staff orb; burst reads to the right.

## Timing (suggested)

| Clip | FPS | Duration | Notes |
|------|-----|----------|-------|
| Trail | ~20 fps | loop / match flight | 4 frames; bolt fires ~1.7/s and moves fast — keep trail short |
| Impact | 18–24 fps | ~200 ms total | 4 frames ≈ 45–55 ms each |
| Muzzle | ~50–60 fps | ~50–60 ms total | 3 frames ≈ 18–20 ms each |
| Shimmer | ~8–12 fps | optional idle pulse on long flights | |

## Rotation

`bolt.png` faces **right at 0°**. Rotate with `atan2(dy, dx)` toward the target
(CSS `transform: rotate(θ)` / canvas `rotate`). Trail and muzzle share the same angle;
impact is usually unrotated (radial).

## CSS / rendering

```css
.proj-bolt, .proj-trail, .proj-impact, .proj-muzzle {
  image-rendering: auto; /* smooth is fine for this painterly style */
}
/* Prefer @2x assets on retina / devicePixelRatio >= 2 */
```

Palette: core `#FFF6FF`, lilac `#E9DDFF`, violet `#9B6BE0`, deep `#4B2A8A`,
gold `#F0C020` / `#FFE8A0`, outline `#1A1426`.
"""


def main():
    OUT.mkdir(parents=True, exist_ok=True)

    bolt = make_bolt(0.0)
    bolt_2x = make_bolt_2x(0.0)
    bolt_anim = make_bolt_anim()
    trail = make_trail(1)
    trail_2x = make_trail(2)
    impact = make_impact(1)
    impact_2x = make_impact(2)
    muzzle = make_muzzle(1)
    muzzle_2x = make_muzzle(2)

    bolt.save(OUT / "bolt.png")
    bolt_2x.save(OUT / "bolt@2x.png")
    bolt_anim.save(OUT / "bolt_anim.png")
    trail.save(OUT / "bolt_trail.png")
    trail_2x.save(OUT / "bolt_trail@2x.png")
    impact.save(OUT / "bolt_impact.png")
    impact_2x.save(OUT / "bolt_impact@2x.png")
    muzzle.save(OUT / "muzzle.png")
    muzzle_2x.save(OUT / "muzzle@2x.png")

    assets = {
        "bolt": bolt,
        "bolt_anim": bolt_anim,
        "trail": trail,
        "impact": impact,
        "muzzle": muzzle,
    }
    preview = make_preview(assets)
    preview.save(OUT / "fx_preview.png", optimize=True)

    (OUT / "README.md").write_text(README)

    # QA
    issues: list[str] = []
    for name, im, fw in [
        ("bolt.png", bolt, None),
        ("bolt@2x.png", bolt_2x, None),
        ("bolt_anim.png", bolt_anim, 48),
        ("bolt_trail.png", trail, 48),
        ("bolt_trail@2x.png", trail_2x, 96),
        ("bolt_impact.png", impact, 48),
        ("bolt_impact@2x.png", impact_2x, 96),
        ("muzzle.png", muzzle, 32),
        ("muzzle@2x.png", muzzle_2x, 64),
    ]:
        qa_corners(im if fw is None else im, name, issues)
        qa_no_box(im, name, issues, frame_w=fw)

    contrast_visible(bolt, (27, 35, 48), "bolt vs #1B2330", issues)
    contrast_visible(bolt, (205, 190, 156), "bolt vs #CDBE9C", issues)

    # Size checks
    expected = {
        "bolt.png": (48, 16),
        "bolt@2x.png": (96, 32),
        "bolt_anim.png": (96, 16),
        "bolt_trail.png": (192, 16),
        "bolt_trail@2x.png": (384, 32),
        "bolt_impact.png": (192, 48),
        "bolt_impact@2x.png": (384, 96),
        "muzzle.png": (96, 32),
        "muzzle@2x.png": (192, 64),
    }
    for fn, wh in expected.items():
        im = Image.open(OUT / fn)
        if im.size != wh:
            issues.append(f"{fn}: size {im.size} != {wh}")
        if im.mode != "RGBA":
            issues.append(f"{fn}: mode {im.mode} != RGBA")

    summary = "issues=CLEAN\n" if not issues else "issues=\n- " + "\n- ".join(issues) + "\n"
    # Also list file sizes
    summary += "\nfiles:\n"
    for fn in expected:
        p = OUT / fn
        summary += f"  {fn}: {Image.open(p).size}  {p.stat().st_size} bytes\n"
    (OUT / "_qa_summary.txt").write_text(summary)
    print(summary)


if __name__ == "__main__":
    main()
