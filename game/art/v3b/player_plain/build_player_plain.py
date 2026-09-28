#!/usr/bin/env python3
"""AFK Slayer - PLAIN STARTER player strips + blade overlay layers.

Run:  /workspace/.venv-art/bin/python art/v3b/player_plain/build_player_plain.py

Pipeline (reuses creatures/wolves/build_wolves.py conventions):
  blob split -> border flood-fill chroma key -> despill/fringe scrub ->
  uniform scale -> 6-frame bob/lean strips -> soft neutral oval shadow -> QA.

Writes ONLY:
  art/v3b/player_plain/{README.md,_qa_summary.txt,preview_plain.png,_work/*}
  art/v3b/anim/sprites/player_plain*.png, player_gear_weapon_*.png
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

ROOT = Path("/workspace/contract-board/art/v3b")
OUT = ROOT / "player_plain"
GEN = OUT / "_gen"
WORK = OUT / "_work"
SPRITES = ROOT / "anim" / "sprites"
FW, FH = 142, 156
METALS = ["bronze", "iron", "steel", "mithril", "adamant", "rune", "dragon"]
POSES = ["idle", "walk", "attack"]
WORK.mkdir(parents=True, exist_ok=True)


# ----------------------------------------------------------------- keying ---
def green_mask(rgb):
    r, g, b = [rgb[:, :, i].astype(np.int16) for i in range(3)]
    near_lime = (g >= 145) & (g > r + 28) & (g > b + 28)
    broad_green = (g >= 75) & (g > r + 20) & (g > b + 20)
    gold = (r >= 125) & (g >= 90) & (b <= g - 8) & (np.abs(r - g) <= 80)
    return (near_lime | broad_green) & ~gold


def flood_border(mask):
    labels, n = ndimage.label(mask, structure=np.ones((3, 3), np.uint8))
    if n == 0:
        return np.zeros_like(mask, bool)
    bl = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    return np.isin(labels, bl[bl != 0])


def key_sheet(path):
    """Return (rgb, fg_mask, soft_alpha, despilled_rgb) for a greenscreen sheet."""
    rgb = np.array(Image.open(path).convert("RGB"))
    gm = green_mask(rgb)
    bg = flood_border(gm)
    fg = ~(gm | bg)
    r, g, b = [rgb[:, :, i].astype(np.int16) for i in range(3)]
    gold = (r >= 125) & (g >= 90) & (b <= g - 8) & (np.abs(r - g) <= 80)
    fringe = (g > r + 10) & (g > b + 10) & (g > 95) & ~gold
    fg &= ~fringe
    fg = ndimage.binary_opening(fg, iterations=1) | (fg & ndimage.binary_erosion(fg, iterations=1))
    # despill: clamp green to max(r,b)+small margin on edge pixels
    out = rgb.astype(np.int16).copy()
    edge = fg & ~ndimage.binary_erosion(fg, iterations=2)
    lim = np.maximum(r, b) + 6
    spill = edge & (g > lim) & ~gold
    out[:, :, 1][spill] = lim[spill]
    # soft alpha: 1px feather on the hard edge (keeps painterly edge smooth)
    a = fg.astype(np.float32)
    soft = ndimage.gaussian_filter(a, 0.6)
    soft = np.where(fg, np.maximum(soft, 0.55), soft * 0.0)
    alpha = (np.clip(soft, 0, 1) * 255).astype(np.uint8)
    return rgb, fg, alpha, np.clip(out, 0, 255).astype(np.uint8)


def blobs(fg, n, min_px=400, axis=1):
    """n largest connected components ordered along axis (1=x, 0=y)."""
    lab, k = ndimage.label(fg, structure=np.ones((3, 3), np.uint8))
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, k + 1))
    idx = [i + 1 for i in np.argsort(sizes)[::-1][:n] if sizes[i] >= min_px]
    cents = ndimage.center_of_mass(np.ones_like(lab), lab, idx)
    order = sorted(zip(idx, cents), key=lambda t: t[1][axis])
    return lab, [i for i, _ in order]


def to_rgba(rgb, alpha, mask=None):
    arr = np.dstack([rgb, alpha if mask is None else np.where(mask, alpha, 0)]).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


def load_font(size):
    try:
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size)
    except OSError:
        return ImageFont.load_default()


def checker(size, cell=12):
    out = Image.new("RGBA", size, (0, 0, 0, 255))
    d = ImageDraw.Draw(out)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            c = (55, 59, 66, 255) if ((x // cell + y // cell) % 2 == 0) else (38, 42, 48, 255)
            d.rectangle((x, y, x + cell, y + cell), fill=c)
    return out


# ------------------------------------------------------ current player ---
def measure_current():
    """Frame-0 metrics of the shipped mage strip (never modified)."""
    im = Image.open(SPRITES / "player_idle.png").convert("RGBA")
    a = np.array(im.crop((0, 0, FW, FH)))[:, :, 3]
    bbox = im.crop((0, 0, FW, FH)).getchannel("A").getbbox()
    solid = a > 200
    staff_cols = 48  # staff shaft occupies x<48; excluded from hood/feet metrics
    body = solid.copy(); body[:, :staff_cols] = False
    rows = np.where(body.any(1))[0]
    baseline = int(rows.max())                     # lowest opaque boot row
    # hood top: topmost opaque row in the hood columns (staff/orb excluded)
    hood_top = int(rows.min())
    feet_band = body[baseline - 12:baseline + 1]
    ys, xs = np.where(feet_band)
    # two boots: split at largest x gap, feet x = midpoint of the two boot centres
    ux = np.unique(xs); gaps = np.diff(ux); cut = ux[np.argmax(gaps)]
    bl, br = xs[xs <= cut].mean(), xs[xs > cut].mean()
    shadow = (a > 3) & (a < 140); shadow[:baseline + 1] = False
    sy, sx = np.where(shadow)
    return dict(bbox=list(bbox), baseline=baseline, hood_top=hood_top,
                height=baseline - hood_top, feet_x=round(float((bl + br) / 2), 1),
                boot_centres=[round(float(bl), 1), round(float(br), 1)],
                shadow_cx=round(float(sx.mean()), 1) if len(sx) else None)


# ------------------------------------------------------------ body poses ---
def skin_mask(rgb, fg):
    r, g, b = [rgb[:, :, i].astype(np.int16) for i in range(3)]
    return fg & (r > 150) & (r - g > 45) & (g - b > 25)


def pose_metrics(fg_blob):
    ys, xs = np.where(fg_blob)
    top, base = int(ys.min()), int(ys.max())
    band = fg_blob[base - 40:base + 1]
    by, bx = np.where(band)
    ux = np.unique(bx); gaps = np.diff(ux)
    if len(gaps) and gaps.max() > 6:
        cut = ux[np.argmax(gaps)]
        feet_x = (bx[bx <= cut].mean() + bx[bx > cut].mean()) / 2
    else:
        feet_x = bx.mean()
    return dict(top=top, base=base, feet_x=float(feet_x), x0=int(xs.min()), x1=int(xs.max()))


def load_body():
    rgb, fg, alpha, dsp = key_sheet(GEN / "plain_body_gs.png")
    lab, ids = blobs(fg, 3, 5000)
    poses = {}
    skin = skin_mask(rgb, fg)
    for name, i in zip(POSES, ids):
        m = lab == i
        # keep enclosed body pixels only (drop specks), alpha restricted to blob
        m = ndimage.binary_fill_holes(m) & fg | m
        poses[name] = dict(mask=m, metrics=pose_metrics(m))
    rgba = np.dstack([dsp, alpha]).astype(np.uint8)
    return rgb, fg, rgba, skin, poses


# ------------------------------------------------------ wooden-sword fit ---
TIP_HINT = {"idle": (1, 1), "walk": (-1, 1), "attack": (1, -0.1)}


def measure_weapon(body_rgb, body_fg, body_skin, poses):
    rw, fw, _, _ = key_sheet(GEN / "plain_with_weapon_gs.png")
    # registration on head/upper torso (translation search +-8px)
    reg = {}
    for name, P in poses.items():
        m = P["mask"]; mt = P["metrics"]
        y0 = mt["top"]; y1 = y0 + int((mt["base"] - mt["top"]) * 0.42)
        x0, x1 = mt["x0"], mt["x1"]
        A = body_rgb[y0:y1, x0:x1].astype(int); M = body_fg[y0:y1, x0:x1]
        best = None
        for dy in range(-8, 9):
            for dx in range(-8, 9):
                B = rw[y0 - dy:y1 - dy, x0 - dx:x1 - dx].astype(int)
                e = np.abs(A - B).sum(2)[M].mean()
                if best is None or e < best[0]:
                    best = (e, dx, dy)
        reg[name] = best
    geo = {}
    for name, P in poses.items():
        _, dx, dy = reg[name]
        rws = np.roll(np.roll(rw, dy, 0), dx, 1); fws = np.roll(np.roll(fw, dy, 0), dx, 1)
        d = ndimage.median_filter(np.abs(body_rgb.astype(int) - rws.astype(int)).sum(2), 3)
        cand = fws & ((~ndimage.binary_dilation(body_fg, iterations=1)) | (d > 90))
        cand = ndimage.binary_opening(cand, iterations=2)
        mt = P["metrics"]
        win = np.zeros_like(cand); win[:, max(0, mt["x0"] - 150):mt["x1"] + 150] = True
        cand &= win
        lab, n = ndimage.label(cand)
        sizes = ndimage.sum(cand, lab, range(1, n + 1))
        pts = np.argwhere(lab == (np.argmax(sizes) + 1))[:, ::-1].astype(float)
        allp = np.argwhere(cand)[:, ::-1].astype(float)
        for _ in range(3):  # robust PCA: refit on pixels near the line
            c = pts.mean(0); _, _, vt = np.linalg.svd(pts - c, full_matrices=False); ax = vt[0]
            if np.dot(ax, TIP_HINT[name]) < 0:
                ax = -ax
            nrm = np.array([-ax[1], ax[0]])
            pts = allp[np.abs((allp - c) @ nrm) < 14]
        t = (pts - c) @ ax; p = (pts - c) @ nrm
        tb = np.round(t).astype(int); t0, t1 = int(tb.min()), int(tb.max())
        widths = np.array([(np.ptp(p[tb == k]) + 1) if (tb == k).any() else 0 for k in range(t0, t1 + 1)])
        tg = t0 + int(np.argmax(widths[:int(len(widths) * 0.45)]))  # cross-guard
        # grip = centroid of the gripping hand (skin) on the handle, weapon sheet
        r_, g_, b_ = [rws[:, :, i].astype(np.int16) for i in range(3)]
        wskin = fws & (r_ > 150) & (r_ - g_ > 45) & (g_ - b_ > 25)
        sp = np.argwhere(wskin)[:, ::-1].astype(float)
        st = (sp - c) @ ax; spp = (sp - c) @ nrm
        sel = (np.abs(spp) < 16) & (st >= t0 - 5) & (st <= tg - 4)
        grip_w = c + ax * float(((sp[sel].mean(0) - c) @ ax))
        # fist(s) on the EMPTY-HAND body sheet: mean-shift on skin near the grip
        bsp = np.argwhere(body_skin)[:, ::-1].astype(float)

        def meanshift(seed, R=18, it=6):
            q = np.array(seed, float)
            for _ in range(it):
                s_ = np.linalg.norm(bsp - q, axis=1) < R
                q = bsp[s_].mean(0)
            return q
        fists = [meanshift(grip_w)]
        if name == "attack":
            # two-handed thrust: second (leading) fist sits up/right of the first
            fists.append(meanshift(grip_w + np.array([30.0, -28.0])))
            if np.linalg.norm(fists[1] - fists[0]) < 12:
                fists = fists[:1]
        fist_c = np.mean(fists, 0)
        geo[name] = dict(
            reg_dx=dx, reg_dy=dy, reg_err=round(reg[name][0], 2),
            angle_deg=round(math.degrees(math.atan2(ax[1], ax[0])), 2),
            axis=[float(ax[0]), float(ax[1])], length=int(t1 - t0),
            pommel=(c + ax * t0).tolist(), tip=(c + ax * t1).tolist(), guard=(c + ax * tg).tolist(),
            grip_weapon_sheet=grip_w.tolist(), fists_body_sheet=[f.tolist() for f in fists],
            grip=fist_c.tolist(), grip_offset_body_vs_weapon=(fist_c - grip_w).tolist())
    return geo


# ---------------------------------------------------------------- blades ---
def key_blades():
    """Blade sheet needs a tighter key: the adamant blade is itself green.

    Background is lime (~15,241,17): chroma excess g-max(r,b) ~225. Adamant
    blade pixels have excess <= ~50, so key on excess > 70 (+ border flood
    for the outer field; enclosed lime holes such as the dragon knuckle-bow
    loop are removed too because they are true screen colour).
    """
    rgb = np.array(Image.open(GEN / "blades_sheet_gs.png").convert("RGB"))
    r, g, b = [rgb[:, :, i].astype(np.int16) for i in range(3)]
    exc = g - np.maximum(r, b)
    gm = (exc > 70) & (g > 110)
    fg = ~gm
    fg = ndimage.binary_opening(fg, iterations=1)
    lab, ids = blobs(fg, 7, 2000, axis=0)
    out = {}
    for metal, i in zip(METALS, ids):
        m = lab == i
        m = ndimage.binary_fill_holes(m) & fg
        # partial-coverage edge pixels: alpha from chroma excess (unmix vs lime)
        ring = ndimage.binary_dilation(m, iterations=2) & ~ndimage.binary_erosion(m, iterations=1)
        interior = ndimage.binary_erosion(m, iterations=2)
        base_exc = float(np.median(exc[interior]))
        a = np.zeros(m.shape, np.float32); a[m] = 1.0
        mix = np.clip((exc - base_exc - 8) / (225.0 - base_exc), 0, 1)
        a[ring] = np.where(m[ring], 1.0 - mix[ring], (1.0 - mix[ring]) * (exc[ring] < 200)) * 1.0
        a[ring & ~m] = 0.0  # keep outer ring out; only soften the inside edge
        # despill edges: clamp green excess to the blade's own typical excess
        dsp = rgb.astype(np.int16).copy()
        lim = np.maximum(r, b) + int(max(6, np.percentile(exc[interior], 75) + 6))
        edge = m & ~interior
        dsp[:, :, 1][edge] = np.minimum(g[edge], lim[edge])
        ys, xs = np.where(m)
        x0, x1, y0, y1 = xs.min() - 2, xs.max() + 3, ys.min() - 2, ys.max() + 3
        crop_rgb = np.clip(dsp[y0:y1, x0:x1], 0, 255).astype(np.uint8)
        crop_a = (np.clip(a[y0:y1, x0:x1], 0, 1) * 255).astype(np.uint8)
        crop_m = m[y0:y1, x0:x1]
        out[metal] = dict(rgba=np.dstack([crop_rgb, crop_a]), mask=crop_m, origin=(int(x0), int(y0)),
                          base_exc=base_exc)
    return out


def blade_geometry(b):
    """Pommel end, handle span, cross-guard and grip point on a horizontal blade.

    Uses the TOP-RUN thickness per column (first contiguous opaque run from the
    top) so the dragon's knuckle-bow loop below its grip does not look like a
    fat handle.
    """
    m = b["mask"]; H, W = m.shape
    cols = np.where(m.any(0))[0]; x0, x1 = int(cols.min()), int(cols.max())
    top = np.full(W, -1); runh = np.zeros(W, int); mid = np.zeros(W)
    for x in range(x0, x1 + 1):
        ys = np.where(m[:, x])[0]
        brk = np.where(np.diff(ys) > 1)[0]
        end = ys[brk[0]] if len(brk) else ys[-1]
        top[x] = ys[0]; runh[x] = end - ys[0] + 1; mid[x] = (ys[0] + end) / 2
    L = x1 - x0 + 1
    rs = ndimage.median_filter(runh.astype(float), 5)
    # All seven blades share a left grip alignment: x0+120 is always mid-handle.
    seed = x0 + 120
    hh = float(np.median(rs[seed - 40:seed + 40]))
    h0 = seed
    while h0 > x0 and rs[h0 - 1] <= hh * 1.10:
        h0 -= 1                      # walk left to the pommel
    h1 = seed
    while h1 < x1 and rs[h1 + 1] <= hh * 1.60:
        h1 += 1                      # walk right to the cross-guard
    h1 += 1
    gx = (h0 + h1) / 2.0
    gy = float(np.median(mid[h0:h1]))
    k = h1
    while k < x1 and rs[k] > hh * 1.30:
        k += 1                       # guard end
    hmed = hh
    return dict(x0=x0, x1=x1, length=L, handle=(h0, h1), guard_end=int(k), grip=(gx, gy),
                handle_thick=hmed, tip_from_grip=float(x1 - gx))


# ------------------------------------------------------------ transforms ---
SS = 4               # supersample factor for rendering
BASE = 151           # measured current-player feet baseline (row)
LEAN_H = 142.0       # shear reference height (px)


def mat(a, b, c, d, e, f):
    return np.array([[a, b, c], [d, e, f], [0, 0, 1]], float)


def rot(deg):
    t = math.radians(deg); c, s_ = math.cos(t), math.sin(t)
    return mat(c, -s_, 0, s_, c, 0)


def trans(x, y):
    return mat(1, 0, x, 0, 1, y)


def scl(k, ky=None):
    return mat(k, 0, 0, 0, k if ky is None else ky, 0)


def motion(fr, FX):
    """Per-frame motion (identical for body + every overlay layer)."""
    dx, dy, lean, stretch = fr["dx"], fr["dy"], fr["lean"], fr["stretch"]
    # shear about baseline (top leans by `lean` px per LEAN_H), stretch about baseline
    return trans(dx, dy) @ trans(0, BASE) @ mat(1, -lean / LEAN_H, 0, 0, stretch, 0) @ trans(0, -BASE)


def body_to_frame(pm, s, FX):
    return trans(FX, BASE + 1) @ scl(s) @ trans(-pm["feet_x"], -(pm["base"] + 1))


def blade_to_body(bg, g, kb):
    gx, gy = bg["grip"]
    return trans(*g["grip"]) @ rot(g["angle_deg"]) @ scl(kb) @ trans(-gx, -gy)


def apply(M, pts):
    p = np.c_[pts, np.ones(len(pts))] @ M.T
    return p[:, :2]


def render_layer(rgba, M, extra_masks=()):
    """Warp an RGBA numpy image with forward affine M (src px -> frame px).

    Premultiplied float per-channel warp at SSx then Lanczos downsample, so
    edges never pick up dark/green halos. Returns (frame RGBA float [0..1],
    list of warped extra masks at SS resolution).
    """
    Mss = scl(SS) @ M
    inv = np.linalg.inv(Mss)
    coeffs = tuple(inv[0]) + tuple(inv[1])
    size = (FW * SS, FH * SS)
    a = rgba[:, :, 3].astype(np.float32) / 255.0
    chans = [rgba[:, :, i].astype(np.float32) / 255.0 * a for i in range(3)] + [a]
    warped = []
    for ch in chans:
        im = Image.fromarray(ch, "F").transform(size, Image.Transform.AFFINE, coeffs,
                                                resample=Image.Resampling.BICUBIC)
        warped.append(np.clip(np.array(im), 0, 1))
    wm = []
    for m in extra_masks:
        im = Image.fromarray(m.astype(np.float32), "F").transform(
            size, Image.Transform.AFFINE, coeffs, resample=Image.Resampling.BILINEAR)
        wm.append(np.clip(np.array(im), 0, 1))
    return warped, wm


def downsample(chs):
    out = []
    for ch in chs:
        im = Image.fromarray(ch.astype(np.float32), "F").resize((FW, FH), Image.Resampling.LANCZOS)
        out.append(np.clip(np.array(im), 0, 1))
    pr, pg, pb, a = out
    safe = np.where(a > 1e-4, a, 1)
    rgb = np.dstack([pr / safe, pg / safe, pb / safe])
    return np.dstack([np.clip(rgb, 0, 1), a])


def to_u8(fr):
    return (np.clip(fr, 0, 1) * 255 + 0.5).astype(np.uint8)


# ------------------------------------------------------------ frame specs ---
def F(pose, dx=0.0, dy=0.0, lean=0.0, stretch=1.0):
    return dict(pose=pose, dx=dx, dy=dy, lean=lean, stretch=stretch)


STRIPS = {
    # subtle breathe: chest rises (stretch about the feet), tiny forward sway
    "idle": dict(fps=7, frames=[F("idle"), F("idle", stretch=1.004, lean=0.2),
                                F("idle", stretch=1.008, lean=0.4), F("idle", stretch=1.010, lean=0.3),
                                F("idle", stretch=1.006, lean=0.1), F("idle", stretch=1.002)]),
    # approximate step cycle: alternate passing (idle pose, body high) and
    # stride (contact, body low) with a small forward lean that alternates
    "walk": dict(fps=9, frames=[F("walk", dy=0.0, lean=1.2), F("idle", dy=-1.5, lean=0.8),
                                F("walk", dy=1.0, lean=1.4, stretch=0.994), F("idle", dy=-1.0, lean=0.6),
                                F("walk", dy=0.5, lean=1.0), F("idle", dy=-1.5, lean=0.8)]),
    # idle -> wind-up lean back -> thrust -> thrust + lunge -> recover -> idle
    "attack": dict(fps=11, frames=[F("idle"), F("idle", dx=-2.0, lean=-4.0, stretch=0.994),
                                   F("attack"), F("attack", dx=3.0, lean=2.0, stretch=1.004),
                                   F("attack", dx=-1.5, lean=-1.5, stretch=0.996), F("idle")]),
}


# ------------------------------------------------------ blade fitting ---
def compress_blade(b, bg, c):
    """Keep pommel+handle+guard at native size; shorten only the blade part
    (beyond guard) along its length by factor c (c=1 -> unchanged)."""
    rgba = b["rgba"]; m = b["mask"]
    xs = int(min(bg["handle"][1] + 85, bg["x1"] - 20))
    H, W = m.shape
    handle = np.zeros((H, W), bool)
    h0, h1 = bg["handle"]
    # handle band = rows of the grip wrap (top-run) between pommel and guard
    gy = bg["grip"][1]; half = bg["handle_thick"] / 2 + 2
    handle[int(max(0, gy - half)):int(gy + half + 1), h0:h1] = True
    handle &= m
    if c >= 0.999:
        return dict(rgba=rgba, mask=m, handle=handle, split=xs, c=1.0,
                    grip=bg["grip"], x1=bg["x1"])
    left = rgba[:, :xs]; right = rgba[:, xs:]
    nw = max(4, int(round(right.shape[1] * c)))
    ra = right[:, :, 3:4].astype(np.float32) / 255
    prem = np.dstack([right[:, :, :3].astype(np.float32) * ra, ra[:, :, 0] * 255])
    chans = [np.array(Image.fromarray(prem[:, :, i], "F").resize((nw, H), Image.Resampling.LANCZOS))
             for i in range(4)]
    a = np.clip(chans[3], 0, 255); sa = np.where(a > 0.5, a / 255, 1)
    rr = np.dstack([np.clip(chans[i] / sa, 0, 255) for i in range(3)] + [a]).astype(np.uint8)
    new = np.concatenate([left, rr], 1)
    rm = np.array(Image.fromarray(m[:, xs:].astype(np.uint8) * 255).resize((nw, H), Image.Resampling.BILINEAR)) > 127
    newm = np.concatenate([m[:, :xs], rm], 1)
    return dict(rgba=new, mask=newm, handle=np.concatenate([handle[:, :xs], np.zeros((H, nw), bool)], 1),
                split=xs, c=float(nw / right.shape[1]), grip=bg["grip"], x1=xs + nw - 1 - 2)


def tip_len(bg, c):
    xs = min(bg["handle"][1] + 85, bg["x1"] - 20)
    return (xs - bg["grip"][0]) + (bg["x1"] - xs) * c


def extents(pts_src, M_of_frame, strips, FXs):
    """Max extents of transformed points across listed strips."""
    x0 = y0 = 1e9; x1 = y1 = -1e9
    for sn in strips:
        for fr in STRIPS[sn]["frames"]:
            q = apply(M_of_frame(fr, FXs[sn]), pts_src)
            x0 = min(x0, q[:, 0].min()); x1 = max(x1, q[:, 0].max())
            y0 = min(y0, q[:, 1].min()); y1 = max(y1, q[:, 1].max())
    return x0, x1, y0, y1


# ----------------------------------------------------------------- build ---
EDGE = 2.5          # keep every opaque pixel this far inside the frame
SHADOW = dict(rx=26.0, ry=2.1, alpha=0.47, blur=1.3)
EDGE_BODY = 2.5     # body silhouette margin (blades use EDGE)


def setup():
    cur = measure_current()
    body_rgb, body_fg, body_rgba, body_skin, poses = load_body()
    geo = measure_weapon(body_rgb, body_fg, body_skin, poses)
    bl = key_blades()
    bgeo = {m: blade_geometry(bl[m]) for m in METALS}
    im = poses["idle"]["metrics"]
    # ONE uniform scale: pixel-edge span of head-top..feet rows == mage hood-top..feet rows
    s = (cur["height"] + 1) / float(im["base"] - im["top"] + 1)
    Lw = float(np.median([geo[p]["length"] for p in POSES]))   # wooden sword length
    kb = Lw / bgeo["bronze"]["length"]                          # blade-sheet -> body-sheet
    return dict(cur=cur, body_rgba=body_rgba, body_skin=body_skin, poses=poses, geo=geo,
                bl=bl, bgeo=bgeo, s=s, Lw=Lw, kb=kb)


def M_body(C, fr, FX):
    return motion(fr, FX) @ body_to_frame(C["poses"][fr["pose"]]["metrics"], C["s"], FX)


def M_blade(C, metal, fr, FX):
    return M_body(C, fr, FX) @ blade_to_body(C["bgeo"][metal], C["geo"][fr["pose"]], C["kb"])


def solve_layout(C):
    """Pick feet-x anchors and per-blade blade-length factors so nothing clips."""
    poses = C["poses"]

    def body_ext(strips, FX):
        return extents_multi(C, strips, FX, None)
    # idle + attack share one anchor (the game swaps them in the same box):
    # smallest FX that keeps the attack wind-up body inside -> max room for tips.
    x0_body, _, _, _ = extents_multi(C, ["idle", "attack"], 0.0, None)
    x0 = 1e9
    for m in METALS:  # hilts/pommels (unaffected by blade shortening) behind the fist
        fb = compress_blade(C["bl"][m], C["bgeo"][m], 0.05)
        pts = boundary_pts(fb["mask"])
        x0 = min(x0, extents_pts(C, m, pts, ["idle", "attack"], 0.0)[0])
    FX_A = int(math.ceil(max(EDGE_BODY - x0_body, EDGE_BODY - x0)))  # pommels: body margin
    fits = {}
    for m in METALS:
        lo, hi = 0.05, 1.0
        def ok(c):
            fb = compress_blade(C["bl"][m], C["bgeo"][m], c)
            pts = boundary_pts(fb["mask"])
            ex = extents_pts(C, m, pts, ["idle", "attack"], FX_A)
            ew = extents_pts(C, m, pts, ["walk"], 0.0)
            # bronze (the reference length) fits at EDGE; shortened blades get +0.7px
            # extra margin because their squeezed tips resample a little wider
            e = EDGE if m == "bronze" else EDGE + 0.7
            return (ex[0] >= EDGE_BODY and ex[1] <= FW - e and ex[3] <= FH - e and ex[2] >= e
                    and ew[3] <= FH - EDGE), ew
        good, _ = ok(1.0)
        if good:
            c = 1.0
        else:
            for _ in range(18):
                mid = (lo + hi) / 2
                if ok(mid)[0]:
                    lo = mid
                else:
                    hi = mid
            c = lo
        fits[m] = c
    # walk gets its own anchor: the stride pose swings the blade back/down-left.
    need = []
    for m in METALS:
        fb = compress_blade(C["bl"][m], C["bgeo"][m], fits[m])
        pts = boundary_pts(fb["mask"])
        need.append(extents_pts(C, m, pts, ["walk"], 0.0)[0])
    bx0, bx1, _, _ = extents_multi(C, ["walk"], 0.0, None)
    FX_W = int(math.ceil(max(EDGE - min(need), EDGE_BODY - bx0)))
    if FX_W + bx1 > FW - EDGE:
        raise RuntimeError("walk strip cannot fit body + blades")
    return dict(FX={"idle": FX_A, "attack": FX_A, "walk": FX_W}, c=fits)


def boundary_pts(m):
    b = m & ~ndimage.binary_erosion(m)
    return np.argwhere(b)[:, ::-1].astype(float) + 0.5


def extents_multi(C, strips, FX, _):
    x0 = y0 = 1e9; x1 = y1 = -1e9
    for sn in strips:
        for fr in STRIPS[sn]["frames"]:
            pts = boundary_pts(C["poses"][fr["pose"]]["mask"])
            q = apply(M_body(C, fr, FX), pts)
            x0 = min(x0, q[:, 0].min()); x1 = max(x1, q[:, 0].max())
            y0 = min(y0, q[:, 1].min()); y1 = max(y1, q[:, 1].max())
    return x0, x1, y0, y1


def extents_pts(C, metal, pts, strips, FX):
    x0 = y0 = 1e9; x1 = y1 = -1e9
    for sn in strips:
        for fr in STRIPS[sn]["frames"]:
            q = apply(M_blade(C, metal, fr, FX), pts)
            x0 = min(x0, q[:, 0].min()); x1 = max(x1, q[:, 0].max())
            y0 = min(y0, q[:, 1].min()); y1 = max(y1, q[:, 1].max())
    return x0, x1, y0, y1


def shadow_ss(cx):
    """Soft neutral oval contact shadow at SS resolution (float alpha)."""
    im = Image.new("L", (FW * SS, FH * SS), 0)
    d = ImageDraw.Draw(im)
    rx, ry = SHADOW["rx"] * SS, SHADOW["ry"] * SS
    cy = (BASE + 0.4) * SS; cxs = cx * SS
    d.ellipse((cxs - rx, cy - ry, cxs + rx, cy + ry), fill=255)
    im = im.filter(ImageFilter.GaussianBlur(SHADOW["blur"] * SS))
    a = np.array(im).astype(np.float32) / 255.0 * SHADOW["alpha"]
    # keep the shadow off the last frame rows (no alpha may touch the frame edge)
    ramp = np.ones(FH * SS, np.float32)
    ramp[153 * SS:154 * SS] = 0.75; ramp[154 * SS:155 * SS] = 0.35; ramp[155 * SS:] = 0.0
    return a * ramp[:, None]


SH_RGB = (10 / 255, 15 / 255, 23 / 255)   # same cool-black as the wolves pack


def over(top, bot):
    """Premultiplied 'over' on 4 float channel lists."""
    ta = top[3]
    return [top[i] + bot[i] * (1 - ta) for i in range(4)]


def fist_mask_for(C, pose):
    sk = C["body_skin"]; H, W = sk.shape
    yy, xx = np.mgrid[0:H, 0:W]
    m = np.zeros((H, W), bool)
    for fx, fy in C["geo"][pose]["fists_body_sheet"]:
        m |= (xx - fx) ** 2 + (yy - fy) ** 2 < 24 ** 2
    return sk & m


def render_all(C, L):
    """Return {strip: {'body': [frames], metal: [frames], 'glint': [frames]}} (u8 RGBA)."""
    body = C["body_rgba"]
    fists = {p: fist_mask_for(C, p) for p in POSES}
    fitted = {m: compress_blade(C["bl"][m], C["bgeo"][m], L["c"][m]) for m in METALS}
    out = {}
    for sn, S in STRIPS.items():
        FX = L["FX"][sn]
        res = {"body": [], "glint": [], "bronze_axis": []}
        for m in METALS:
            res[m] = []
        for fi, fr in enumerate(S["frames"]):
            Mb = M_body(C, fr, FX)
            pm = C["poses"][fr["pose"]]
            pose_rgba = body.copy(); pose_rgba[:, :, 3] = np.where(pm["mask"], pose_rgba[:, :, 3], 0)
            bch, (fist_w,) = render_layer(pose_rgba, Mb, [fists[fr["pose"]]])
            sh = shadow_ss(FX + fr["dx"])
            shl = [sh * SH_RGB[0], sh * SH_RGB[1], sh * SH_RGB[2], sh]
            res["body"].append(to_u8(downsample(over(bch, shl))))
            for m in METALS:
                fb = fitted[m]
                Mbl = M_blade(C, m, fr, FX)
                bc, (hw,) = render_layer(fb["rgba"], Mbl, [fb["handle"]])
                keep = 1.0 - np.clip(hw * 1.2, 0, 1) * np.clip(fist_w * 1.5, 0, 1)
                bc = [ch * keep for ch in bc]
                res[m].append(despill_frame(to_u8(downsample(bc)), 40 if m == "adamant" else 6))
            # bronze axis in frame coords (guard end -> tip) for the glint
            fb = fitted["bronze"]; gy = C["bgeo"]["bronze"]["grip"][1]
            a0 = apply(M_blade(C, "bronze", fr, FX), np.array([[fb["split"], gy], [fb["x1"], gy]], float))
            res["bronze_axis"].append(a0.tolist())
        out[sn] = res
    return out, fitted


GLINT_FRAMES = {"idle": [2, 3, 4], "walk": [2, 3, 4], "attack": [2, 3, 4]}
GLINT_T = [0.30, 0.58, 0.86]          # fraction along bronze guard->tip axis
GLINT_R = [2.2, 3.6, 2.4]             # sparkle arm radius (frame px)


def glint_frame(p, r):
    """Small 4-point sparkle centred at p (frame px), rendered at SS."""
    im = Image.new("L", (FW * SS, FH * SS), 0)
    d = ImageDraw.Draw(im)
    cx, cy = p[0] * SS, p[1] * SS; R = r * SS; w = 0.55 * SS
    d.polygon([(cx - R, cy), (cx, cy - w), (cx + R, cy), (cx, cy + w)], fill=255)
    d.polygon([(cx, cy - R * 1.15), (cx + w, cy), (cx, cy + R * 1.15), (cx - w, cy)], fill=255)
    d.ellipse((cx - 1.1 * SS, cy - 1.1 * SS, cx + 1.1 * SS, cy + 1.1 * SS), fill=255)
    halo = im.filter(ImageFilter.GaussianBlur(1.3 * SS))
    core = np.array(im).astype(np.float32) / 255
    a = np.clip(core + np.array(halo).astype(np.float32) / 255 * 0.6, 0, 1)
    col = (1.0, 0.98, 0.88)
    fr = downsample([a * col[0], a * col[1], a * col[2], a])
    return to_u8(fr)


def add_glints(R):
    for sn in STRIPS:
        R[sn]["glint"] = []
        R[sn]["glint_pos"] = []
        for fi in range(len(STRIPS[sn]["frames"])):
            if fi in GLINT_FRAMES[sn]:
                k = GLINT_FRAMES[sn].index(fi)
                (x0, y0), (x1, y1) = R[sn]["bronze_axis"][fi]
                p = (x0 + (x1 - x0) * GLINT_T[k], y0 + (y1 - y0) * GLINT_T[k])
                R[sn]["glint"].append(glint_frame(p, GLINT_R[k]))
                R[sn]["glint_pos"].append([round(p[0], 2), round(p[1], 2)])
            else:
                R[sn]["glint"].append(np.zeros((FH, FW, 4), np.uint8))
                R[sn]["glint_pos"].append(None)


def despill_frame(f, allow, all_px=False):
    """Clamp green excess on semi-transparent edge pixels (lime bleed from the
    sheet). Opaque interior colours are untouched (adamant is legitimately green)."""
    rgb = f[:, :, :3].astype(np.int16); a = f[:, :, 3]
    lim = np.maximum(rgb[:, :, 0], rgb[:, :, 2]) + allow
    sel = ((a < 230) | all_px) & (rgb[:, :, 1] > lim)
    rgb[:, :, 1][sel] = lim[sel]
    out = f.copy(); out[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    out[(a < 3)] = 0
    return out


def lime_residue(arr, adamant=False):
    rgb = arr[:, :, :3].astype(np.int16)
    exc = rgb[:, :, 1] - np.maximum(rgb[:, :, 0], rgb[:, :, 2])
    return (exc > (60 if adamant else 40)) & (rgb[:, :, 1] > 100) & (arr[:, :, 3] > 8)


def strip_img(frames):
    st = Image.new("RGBA", (FW * len(frames), FH), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        st.paste(Image.fromarray(f, "RGBA"), (i * FW, 0))
    return st


def composite(body_frames, blade_frames):
    out = []
    for b, w in zip(body_frames, blade_frames):
        im = Image.fromarray(b, "RGBA"); im.alpha_composite(Image.fromarray(w, "RGBA"))
        out.append(np.array(im))
    return out


def scrub_green(arr):
    rgb = arr[:, :, :3].astype(np.int16)
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    green = (g > r + 9) & (g > b + 9) & (g > 90)
    gold = (r >= 125) & (g >= 90) & (b <= g - 8) & (np.abs(r - g) <= 80)
    return green & ~gold


def write_strips(R):
    files = {}
    for sn in STRIPS:
        body = R[sn]["body"]
        # body layer: safety scrub of any resampling-born green edge pixel
        # body has no legit green: clamp green to max(r,b)+2 on every pixel (despill)
        body = [despill_frame(f, 2, all_px=True) for f in body]
        R[sn]["body"] = body
        files[f"player_plain_body_{sn}.png"] = body
        for m in METALS:
            files[f"player_gear_weapon_{m}_{sn}.png"] = R[sn][m]
        files[f"player_gear_weapon_glint_{sn}.png"] = R[sn]["glint"]
        files[f"player_plain_{sn}.png"] = composite(body, R[sn]["bronze"])
    for fn, frames in files.items():
        strip_img(frames).save(SPRITES / fn)
        print("wrote", SPRITES / fn)
    return list(files)


# ---------------------------------------------------------------- verify ---
def load_frames(fn):
    im = np.array(Image.open(SPRITES / fn).convert("RGBA"))
    n = im.shape[1] // FW
    return [im[:, i * FW:(i + 1) * FW] for i in range(n)]


def verify(C, L, files):
    lines = ["AFK Slayer plain starter player - QA", ""]
    issues = []
    cur = C["cur"]
    lines.append(f"current mage frame0: alpha bbox={cur['bbox']} baseline_row={cur['baseline']} "
                 f"hood_top={cur['hood_top']} hood->feet={cur['height']}px feet_x={cur['feet_x']} "
                 f"(boot centres {cur['boot_centres']}, staff columns x<48 excluded)")
    for fn in sorted(files):
        fr = load_frames(fn)
        arr = np.concatenate(fr, 1)
        a = arr[:, :, 3]
        corners = [int(a[0, 0]), int(a[0, -1]), int(a[-1, 0]), int(a[-1, -1])]
        green = int(lime_residue(arr, "adamant" in fn).sum())
        greenish = int((scrub_green(arr) & (a > 8)).sum())
        edge_touch = int(sum((f[:, 0, 3] > 0).sum() + (f[:, -1, 3] > 0).sum() +
                             (f[0, :, 3] > 0).sum() + (f[-1, :, 3] > 0).sum() for f in fr))
        # per-frame corner alpha too
        fc = max(int(max(f[0, 0, 3], f[0, -1, 3], f[-1, 0, 3], f[-1, -1, 3])) for f in fr)
        lines.append(f"{fn}: {arr.shape[1]}x{arr.shape[0]} frames={len(fr)} corner_alpha={corners} "
                     f"max_frame_corner={fc} lime_residue_px={green} greenish_edge_px(info)={greenish} edge_px={edge_touch}")
        if arr.shape[0] != FH or arr.shape[1] != FW * 6:
            issues.append(f"{fn}: bad size")
        if fc:
            issues.append(f"{fn}: non-transparent frame corner")
        if green:
            issues.append(f"{fn}: residual green {green}")
        if edge_touch:
            issues.append(f"{fn}: {edge_touch} alpha px touch the frame edge")
    lines.append("")
    # layer diff: body + bronze overlay recomposited from the saved PNGs
    for sn in STRIPS:
        body = load_frames(f"player_plain_body_{sn}.png")
        br = load_frames(f"player_gear_weapon_bronze_{sn}.png")
        comp = load_frames(f"player_plain_{sn}.png")
        diffs = []
        for b, w, c in zip(body, br, comp):
            im = Image.fromarray(b, "RGBA"); im.alpha_composite(Image.fromarray(w, "RGBA"))
            diffs.append(np.abs(np.array(im).astype(int) - c.astype(int)).mean())
        md = float(np.mean(diffs))
        lines.append(f"layer check {sn}: mean |(body over bronze) - player_plain_{sn}| = {md:.4f} (max frame {max(diffs):.4f})")
        if md > 0.5:
            issues.append(f"layer diff {sn} {md}")
    lines.append("")
    # baseline / height / feet-x of the starter body (frame 0 of each strip)
    for sn in STRIPS:
        f0 = load_frames(f"player_plain_body_{sn}.png")[0]
        a = f0[:, :, 3] > 200
        rows = np.where(a.any(1))[0]
        base = int(rows.max()); top = int(rows.min())
        band = a[base - 12:base + 1]; ys, xs = np.where(band)
        ux = np.unique(xs); cut = ux[np.argmax(np.diff(ux))] if len(ux) > 1 else ux[0]
        fx = (xs[xs <= cut].mean() + xs[xs > cut].mean()) / 2 if (xs > cut).any() else xs.mean()
        bb = Image.fromarray(f0).getchannel("A").getbbox()
        lines.append(f"body_{sn} frame0: alpha bbox={list(bb)} baseline_row={base} head_top={top} "
                     f"head->feet={base - top}px measured feet_x={fx:.1f} anchor_feet_x={L['FX'][sn]}")
        if base != cur["baseline"]:
            issues.append(f"body_{sn} baseline {base} != {cur['baseline']}")
        if sn != "walk" and abs((base - top) - cur["height"]) > 1:
            issues.append(f"body_{sn} height {base - top} vs {cur['height']}")
    lines.append("")
    lines.append(f"uniform scale s={C['s']:.5f} (sheet px -> frame px), blade-sheet->body-sheet k={C['kb']:.5f} "
                 f"(bronze length {C['bgeo']['bronze']['length']}px == wooden sword {C['Lw']:.0f}px)")
    for m in METALS:
        bg = C["bgeo"][m]
        lines.append(f"  {m}: grip->tip natural {tip_len(bg, 1) * C['kb'] * C['s']:.1f}px, shipped "
                     f"{tip_len(bg, L['c'][m]) * C['kb'] * C['s']:.1f}px (blade section x{L['c'][m]:.3f})")
    lines += ["", "issues=" + ("; ".join(issues) if issues else "CLEAN")]
    (OUT / "_qa_summary.txt").write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    return issues


# --------------------------------------------------------------- preview ---
def preview(C, L):
    font = load_font(13); small = load_font(11)
    mage = Image.open(SPRITES / "player_idle.png").convert("RGBA").crop((0, 0, FW, FH))
    plain = [Image.fromarray(f) for f in load_frames("player_plain_idle.png")]
    # panel A: mage vs starter on the arena floor, same scale, feet on one ground line (2x)
    Z = 2
    floor_p = ROOT / "env" / "arena_floor_mock.png"
    pa_w, pa_h = 2 * FW * Z + 120, FH * Z + 60
    if floor_p.exists():
        fl = Image.open(floor_p).convert("RGBA")
        k = max(pa_w / fl.width, pa_h / fl.height)
        fl = fl.resize((int(fl.width * k) + 1, int(fl.height * k) + 1), Image.Resampling.LANCZOS)
        ox, oy = (fl.width - pa_w) // 2, (fl.height - pa_h) // 2
        panelA = fl.crop((ox, oy, ox + pa_w, oy + pa_h))
    else:
        panelA = checker((pa_w, pa_h))
    ground = 30 + BASE * Z
    # align by feet x: mage feet_x vs starter anchor
    for i, (im, fx) in enumerate(((mage, C["cur"]["feet_x"]), (plain[0], L["FX"]["idle"]))):
        cx = 60 + FW * Z // 2 + i * (FW * Z) + 0
        big = im.resize((FW * Z, FH * Z), Image.Resampling.LANCZOS)
        panelA.alpha_composite(big, (int(cx - fx * Z), ground - BASE * Z))
    dA = ImageDraw.Draw(panelA)
    dA.text((10, 8), "current mage  vs  plain starter + bronze (same scale, 2x, feet on one line)",
            font=font, fill=(255, 246, 206, 255))
    # panel B: strips at 2x (composite + glint)
    strips = []
    for sn in STRIPS:
        im = Image.open(SPRITES / f"player_plain_{sn}.png").convert("RGBA")
        im.alpha_composite(Image.open(SPRITES / f"player_gear_weapon_glint_{sn}.png").convert("RGBA"))
        strips.append((sn, im.resize((im.width * 2, im.height * 2), Image.Resampling.LANCZOS)))
    # panel C: all 7 blades on idle frame 0 and attack frame 3 (widest reach), 1.5x with frame boxes
    tiles = []
    for sn, fi in (("idle", 0), ("attack", 3)):
        body = load_frames(f"player_plain_body_{sn}.png")[fi]
        row = []
        for m in METALS:
            im = Image.fromarray(body.copy()); im.alpha_composite(Image.fromarray(load_frames(f"player_gear_weapon_{m}_{sn}.png")[fi]))
            row.append((m, im))
        tiles.append((sn, fi, row))
    Wc = 7 * (FW * 3 // 2 + 8) + 20
    W = max(pa_w, strips[0][1].width, Wc) + 20
    H = pa_h + 20 + sum(s.height + 24 for _, s in strips) + 2 * (FH * 3 // 2 + 30) + 40
    out = checker((W, H), 14)
    out.alpha_composite(panelA, (10, 10))
    d = ImageDraw.Draw(out)
    y = pa_h + 30
    for sn, im in strips:
        d.text((12, y), f"player_plain_{sn}.png + glint  (6 x {FW}x{FH}, fps {STRIPS[sn]['fps']}, anchor feet_x={L['FX'][sn]}) @2x",
               font=font, fill=(255, 246, 206, 255))
        out.alpha_composite(im, (10, y + 18)); y += im.height + 24
    for sn, fi, row in tiles:
        d.text((12, y), f"all 7 blades, {sn} frame {fi} (1.5x, frame box outlined)", font=font, fill=(255, 246, 206, 255))
        x = 10
        for m, im in row:
            big = im.resize((FW * 3 // 2, FH * 3 // 2), Image.Resampling.LANCZOS)
            out.alpha_composite(big, (x, y + 18))
            d.rectangle((x, y + 18, x + big.width - 1, y + 18 + big.height - 1), outline=(120, 130, 140, 255))
            d.text((x + 4, y + 20), m, font=small, fill=(255, 230, 160, 255))
            x += big.width + 8
        y += FH * 3 // 2 + 30
    out.convert("RGB").save(OUT / "preview_plain.png")
    print("wrote", OUT / "preview_plain.png", out.size)


# ------------------------------------------------------------------ main ---
def write_meta(C, L, R, fitted):
    meta = {"frame_w": FW, "frame_h": FH, "frames": 6, "baseline_row": BASE,
            "scale_sheet_to_frame": C["s"], "anchor_feet_x": L["FX"],
            "anchor_note": "idle+attack share feet_x; walk feet_x differs -> draw walk frames at "
                           f"x offset {L['FX']['idle'] - L['FX']['walk']} px (frame units) to keep feet planted",
            "fps": {sn: STRIPS[sn]["fps"] for sn in STRIPS},
            "frames_spec": STRIPS, "current_player": C["cur"],
            "wooden_sword": C["geo"], "blade_sheet_to_body_sheet": C["kb"],
            "blades": {m: dict(grip_in_sheet_crop=C["bgeo"][m]["grip"], handle=C["bgeo"][m]["handle"],
                               natural_len=C["bgeo"][m]["length"], blade_section_factor=L["c"][m],
                               grip_to_tip_frame_px=round(tip_len(C["bgeo"][m], L["c"][m]) * C["kb"] * C["s"], 2))
                       for m in METALS},
            "bronze_axis_per_frame": {sn: R[sn]["bronze_axis"] for sn in STRIPS},
            "glint": {"frames": GLINT_FRAMES, "t_along_bronze_blade": GLINT_T,
                      "positions": {sn: R[sn]["glint_pos"] for sn in STRIPS}}}
    (OUT / "_meta_player_plain.json").write_text(json.dumps(meta, indent=1, default=float))
    print("wrote", OUT / "_meta_player_plain.json")


def main():
    C = setup()
    L = solve_layout(C)
    print("layout", L)
    R, fitted = render_all(C, L)
    add_glints(R)
    files = write_strips(R)
    write_meta(C, L, R, fitted)
    issues = verify(C, L, files)
    preview(C, L)
    return C, L, issues


if __name__ == "__main__":
    main()
