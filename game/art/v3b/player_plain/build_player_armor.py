#!/usr/bin/env python3
"""AFK Slayer - armor overlays (legs / body / helm) for the plain starter.

Run:  /workspace/.venv-art/bin/python art/v3b/player_plain/build_player_armor.py

Pixel-perfect alignment: LEGS and BODY are painted procedurally onto the keyed
body sheet's own region masks (no image generation), in body-sheet space, then
warped with EXACTLY the same per-frame transforms (M_body, scale 0.29668, same
anchors) as the shipped player_plain_body_* strips. HELMS are keyed from
_gen/helms_sheet_gs.png, fitted once to the head (deterministic geometric fit, per-pose tilt),
and warped with the same transforms.

Writes ONLY: anim/sprites/player_gear_{legs,body,helm}_{metal}_{idle,walk,attack}.png,
player_plain/_masters/*, player_plain/preview_gear.png, README.md section,
_qa_summary.txt (armor section appended by rewriting the armor block).
Never rewrites the already-shipped player_plain*/player_gear_weapon_* strips.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
from scipy.signal import fftconvolve
from skimage.color import rgb2lab
from skimage.filters import sobel
from skimage.segmentation import watershed

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_player_plain as P  # noqa: E402
from build_player_plain import (FW, FH, GEN, OUT, SPRITES, WORK, POSES, METALS,  # noqa: E402
                                STRIPS, apply, blobs, checker, load_font)

MASTERS = OUT / "_masters"
MASTERS.mkdir(parents=True, exist_ok=True)
HAIR, FACE, TUNIC, SKIN, TROUS, SHOE = 1, 2, 3, 4, 5, 6
LABELS = {HAIR: "hair", FACE: "face", TUNIC: "tunic", SKIN: "skin", TROUS: "trousers", SHOE: "shoes"}


# ----------------------------------------------------------- segmentation ---
def segment_body():
    """Seeded watershed on the keyed body sheet: colour seeds + pose-relative
    height bands, boundaries follow the painted facet edges (Lab gradient)."""
    rgb, fg, alpha, dsp = P.key_sheet(GEN / "plain_body_gs.png")
    lab_, ids = blobs(fg, 3, 5000)
    H, W = fg.shape
    r, g, b = [rgb[:, :, i].astype(int) for i in range(3)]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    lab = rgb2lab(rgb)
    grad = sobel(lab[:, :, 0] / 100) + 0.5 * (sobel(lab[:, :, 1] / 60) + sobel(lab[:, :, 2] / 60))
    yy = np.mgrid[0:H, 0:W][0]
    V = np.zeros((H, W)); pose_of = np.zeros((H, W), np.int8) - 1
    for k, i in enumerate(ids):
        m = lab_ == i; ys, _ = np.where(m); t, bb = ys.min(), ys.max()
        V[m] = (yy[m] - t) / (bb - t); pose_of[m] = k
    skin_s = (r > 185) & (r - g > 48) & (g - b > 28)
    skin_l = (r > 160) & (r - g > 40) & (g - b > 22)
    mk = np.zeros((H, W), np.int32)
    body = pose_of >= 0
    mk[body & (V < 0.20) & (lum < 115) & ~skin_l] = HAIR
    mk[body & (V < 0.30) & skin_l & (V > 0.08)] = FACE
    mk[body & (V > 0.27) & (V < 0.62) & (lum > 175) & ((r - b) < 85)] = TUNIC
    mk[body & (V > 0.30) & (V < 0.72) & skin_s] = SKIN
    mk[body & (V > 0.66) & (V < 0.84) & (lum < 110) & ~skin_l] = TROUS
    mk[body & (V > 0.93) & (lum < 140)] = SHOE
    mk[body & (V > 0.85) & (lum > 125) & ~skin_s] = SHOE
    seg = watershed(grad, mk, mask=body)
    # clean-ups: per pose keep the main hair blob (eyes/brows -> face) and the
    # main trousers blob (belt knot etc. -> tunic)
    for k in range(3):
        pm = pose_of == k
        for cls, other in ((HAIR, FACE), (TROUS, TUNIC)):
            m = (seg == cls) & pm
            l, n = ndimage.label(m)
            if n > 1:
                sz = ndimage.sum(m, l, range(1, n + 1))
                frac = 1.0 if cls == HAIR else 0.15    # trousers: both legs may be split by the hem
                keep = [j + 1 for j in range(n) if sz[j] >= frac * sz.max()]
                seg[m & ~np.isin(l, keep)] = other
    # light ankle wraps that the watershed gave to the trousers belong to the footwear
    seg[(seg == TROUS) & (V > 0.74) & (lum > 118)] = SHOE
    return dict(rgb=rgb, dsp=dsp, fg=body, alpha=alpha, seg=seg, V=V, pose_of=pose_of, lum=lum)


def pose_masks(S, k):
    pm = S["pose_of"] == k
    return {name: (S["seg"] == cls) & pm for cls, name in LABELS.items()} | {"all": pm}


# ------------------------------------------------------------------ helms ---
HELM_TYPES = ["med", "full", "dragon"]          # left, middle, right on the sheet
HELM_FOR = {"bronze": "med", "iron": "med", "steel": "med", "mithril": "full",
            "adamant": "full", "rune": "full", "dragon": "dragon"}


def key_helms():
    rgb, fg, alpha, dsp = P.key_sheet(GEN / "helms_sheet_gs.png")
    lab, ids = blobs(fg, 3, 5000)
    r, g, b = [rgb[:, :, i].astype(int) for i in range(3)]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    out = {}
    for name, i in zip(HELM_TYPES, ids):
        m = lab == i
        ys, xs = np.where(m)
        x0, x1, y0, y1 = xs.min() - 3, xs.max() + 4, ys.min() - 3, ys.max() + 4
        mm = m[y0:y1, x0:x1]; L = lum[y0:y1, x0:x1]
        cav = np.zeros_like(mm)
        if name in ("med", "dragon"):
            # open face: the dark interior seen through the face opening
            dark = mm & (L < (48 if name == "med" else 40))
            dark = ndimage.binary_opening(dark, iterations=2)
            dl, n = ndimage.label(dark)
            if n:
                sz = ndimage.sum(dark, dl, range(1, n + 1))
                big = [j + 1 for j in range(n) if sz[j] > 0.25 * sz.max()]
                cav = np.isin(dl, big)
                cav = ndimage.binary_fill_holes(ndimage.binary_closing(cav, iterations=3)) & mm
                cav = ndimage.binary_dilation(cav, iterations=1) & mm   # eat the dark AA ring
        a = alpha[y0:y1, x0:x1].copy(); a[~mm] = 0; a[cav] = 0
        # soften cavity edge a touch (1px) so the rim edge is not jaggy
        rgba = np.dstack([dsp[y0:y1, x0:x1], a]).astype(np.uint8)
        out[name] = dict(rgba=rgba, opaque=mm & ~cav, cavity=cav, origin=(int(x0), int(y0)))
    out["dragon"] = squash_crest(out["dragon"])
    return out


DRAGON_DOME_Y = 100      # crop row of the dome top (gold band); crest lives above
CREST_F = 0.22           # crest vertical squash


def squash_crest(h):
    """Rows above the dome are remapped y' = D - (D - y) * f, rows below shift up
    to stay attached. Crop is then trimmed at the top."""
    rgba = h["rgba"]; Hc, Wc = rgba.shape[:2]
    D, f = DRAGON_DOME_Y, CREST_F
    top_new = D - D * f                                   # where row 0 lands
    newH = int(math.ceil(Hc - top_new))
    ys_new = np.arange(newH) + top_new                    # position in the old "virtual" space
    src_y = np.where(ys_new < D, D - (D - ys_new) / f, ys_new)
    def remap(a, order):
        yy, xx = np.meshgrid(src_y, np.arange(Wc), indexing="ij")
        return ndimage.map_coordinates(a, [yy, xx], order=order, mode="constant")
    a = rgba[:, :, 3].astype(float) / 255
    chans = [remap(rgba[:, :, i].astype(float) / 255 * a, 1) for i in range(3)] + [remap(a, 1)]
    al = np.clip(chans[3], 0, 1); safe = np.where(al > 1e-4, al, 1)
    rgb = np.dstack([np.clip(c / safe, 0, 1) for c in chans[:3]])
    out = np.dstack([rgb, al])
    new = dict(rgba=(out * 255 + 0.5).astype(np.uint8),
               opaque=remap(h["opaque"].astype(float), 0) > 0.5,
               cavity=remap(h["cavity"].astype(float), 0) > 0.5,
               origin=h["origin"], dome_y=float(D - top_new), crest_f=f)
    new["rgba"][:, :, 3] = np.where(new["cavity"], 0, new["rgba"][:, :, 3])
    return new


def head_regions(S, k):
    M = pose_masks(S, k)
    return M["hair"], M["face"], M["all"] & ~(M["hair"] | M["face"])


def warp_mask(mask, A, shape):
    """Forward affine A (src->dst) nearest/bilinear warp of a bool mask into dst shape."""
    inv = np.linalg.inv(A)
    im = Image.fromarray(mask.astype(np.uint8) * 255).transform(
        (shape[1], shape[0]), Image.Transform.AFFINE, tuple(inv[0]) + tuple(inv[1]),
        resample=Image.Resampling.BILINEAR)
    return np.array(im) > 127


def fit_helm(S, helm, kind, scales, rots=(-4, -2, 0, 2, 4)):
    """Correlation search per pose. Returns {pose: (score, s, rot, A)} per scale."""
    res = {}
    hh, hw = helm["opaque"].shape
    for k, pose in enumerate(POSES):
        hair, face, rest = head_regions(S, k)
        ys, xs = np.where(hair | face)
        cx0, cx1, cy0, cy1 = xs.min() - 120, xs.max() + 120, ys.min() - 120, ys.max() + 100
        PADW = 200
        def cut(m):
            mp = np.pad(m, PADW)
            return mp[cy0 + PADW:cy1 + PADW, cx0 + PADW:cx1 + PADW].astype(float)
        hr, fc, rs = cut(hair), cut(face), cut(rest)
        bg = 1.0 - np.clip(hr + fc + rs, 0, 1)
        if kind == "full":
            S_op = 1.0 * hr + 0.9 * fc - 0.12 * bg - 0.35 * rs
            S_cv = np.zeros_like(hr)
        else:
            S_op = 1.0 * hr - 0.6 * fc - 0.12 * bg - 0.35 * rs
            S_cv = 0.9 * fc - 0.6 * hr - 0.15 * bg - 0.6 * rs
        best = {}
        for s_, asp in scales:
            for rot in rots:
                # helm crop -> window coords, helm centre at window origin
                A = P.rot(rot) @ P.scl(s_, s_ * asp) @ P.trans(-hw / 2, -hh / 2)
                corners = apply(A, np.array([[0, 0], [hw, 0], [0, hh], [hw, hh]], float))
                ox, oy = corners.min(0)
                A2 = P.trans(-ox, -oy) @ A
                bw, bh = int(math.ceil(corners[:, 0].max() - ox)) + 1, int(math.ceil(corners[:, 1].max() - oy)) + 1
                op = warp_mask(helm["opaque"], A2, (bh, bw)).astype(float)
                cv = warp_mask(helm["cavity"], A2, (bh, bw)).astype(float)
                sc = fftconvolve(S_op, op[::-1, ::-1], mode="valid")
                if cv.any():
                    sc = sc + fftconvolve(S_cv, cv[::-1, ::-1], mode="valid")
                j = np.unravel_index(np.argmax(sc), sc.shape)
                v = float(sc[j])
                if (s_, asp) not in best or v > best[(s_, asp)][0]:
                    # placement: helm box top-left at window (j[1], j[0])
                    Afull = P.trans(cx0 + j[1], cy0 + j[0]) @ A2
                    best[(s_, asp)] = (v, (s_, asp), rot, Afull)
        res[pose] = best
    return res


def choose_helm_fit(S, helms):
    fits = {}
    for kind in HELM_TYPES:
        h = helms[kind]
        scales = [(round(x, 3), a) for x in np.arange(0.44, 0.62, 0.02) for a in (0.84, 0.92, 1.0)]
        res = fit_helm(S, h, "full" if kind == "full" else "open", scales)
        tot = {s_: sum(res[p][s_][0] for p in POSES) for s_ in scales}
        s_best = max(tot, key=tot.get)
        fits[kind] = {p: dict(score=res[p][s_best][0], scale=s_best, rot=res[p][s_best][2],
                              A=res[p][s_best][3].tolist()) for p in POSES}
    return fits


# Deterministic helm fit (chosen over the correlation search: the painted
# helms are taller than the chibi head, so the search kept shrinking them).
# Scale = hair-bbox width / helm width * k, vertical squash `asp`; the helm
# back edge sits `back` px behind the hair's back spikes; vertical placement
# by top (dome top vs hair top) or by bottom (helm bottom vs chin).
HELM_PARAMS = {
    "med":    dict(k=1.04, asp=0.88, back=6, top=-4, anchor="top"),
    "full":   dict(k=1.05, asp=0.88, back=6, top=-4, anchor="top"),
    # dragon: crest rows above the dome (crop y < DOME_Y) are squashed into a low
    # fin (frame headroom above the head is only ~4 px); placed like the med helm
    "dragon": dict(k=1.02, asp=0.88, back=6, top=-2, anchor="dome"),
}


def head_tilt(S):
    """Head tilt per pose relative to idle: angle of hair-centroid -> face-centroid."""
    ang = {}
    for k, pose in enumerate(POSES):
        hair, face, _ = head_regions(S, k)
        hc = np.argwhere(hair).mean(0); fcn = np.argwhere(face).mean(0)
        ang[pose] = math.degrees(math.atan2(fcn[0] - hc[0], fcn[1] - hc[1]))
    return {p: ang[p] - ang["idle"] for p in POSES}


def geometric_helm_fit(S, helms):
    tilt = head_tilt(S)
    fits = {}
    for kind in HELM_TYPES:
        h = helms[kind]; pr = HELM_PARAMS[kind]
        ys, xs = np.where(h["opaque"] | h["cavity"])
        hx0, hx1, hy0, hy1 = xs.min(), xs.max(), ys.min(), ys.max()
        fits[kind] = {}
        ih = np.where(head_regions(S, 0)[0])[1]
        s_ = (ih.max() - ih.min()) / float(hx1 - hx0) * pr["k"]   # one helm size for all poses
        for k, pose in enumerate(POSES):
            hair, face, _ = head_regions(S, k)
            ay, ax = np.where(hair)
            fy, fx = np.where(face)
            sy = s_ * pr["asp"]
            rot = tilt[pose]
            # rotate about the head centre after placing
            if pr["anchor"] == "dome":
                tx = ax.min() - pr["back"] - hx0 * s_
                ty = ay.min() + pr["top"] - h["dome_y"] * sy
            elif pr["anchor"] == "top":
                tx = ax.min() - pr["back"] - hx0 * s_
                ty = ay.min() + pr["top"] - hy0 * sy
            else:
                tx = ax.min() - pr["back"] - hx0 * s_
                ty = fy.max() + pr["bottom"] - hy1 * sy
            A = P.trans(tx, ty) @ P.scl(s_, sy)
            c = np.array([(ax.min() + ax.max()) / 2, (ay.min() + fy.max()) / 2])
            A = P.trans(*c) @ P.rot(rot) @ P.trans(*(-c)) @ A
            # hair coverage (opaque helm over hair pixels)
            op = warp_mask(h["opaque"], A, hair.shape)
            cov = float((op & hair).sum() / hair.sum())
            fits[kind][pose] = dict(scale=[s_, sy], rot=rot, A=A.tolist(), hair_covered=cov)
    return fits


# ------------------------------------------------------- metal painting ---
def norm_lum(L, m, lo=3, hi=97):
    """Rank-normalise luminance inside the region (histogram equalisation), so
    bright linen and dark trousers produce the same metal tone distribution
    while keeping every painted facet edge (monotone mapping)."""
    from scipy.stats import rankdata
    from scipy.ndimage import median_filter
    out = np.zeros(L.shape)
    Ls = median_filter(L.astype(np.float32), size=5)
    v = Ls[m]
    r = (rankdata(v) - 0.5) / len(v)
    out[m] = 0.22 + 0.62 * r
    return out


def shade_metal(n, dt):
    """Cloth luminance (0..1, painterly facets) -> neutral metal grey (0..255).
    Contrast boost, crisp speculars on the brightest facets, rim occlusion."""
    c = np.clip(0.5 + (n - 0.5) * 1.25, 0, 1)
    c = c * c * (3 - 2 * c)                                  # S-curve
    c = c ** 1.35                                            # metal: darker mids
    grey = 62 + c * 130
    spec = np.clip((n - 0.92) / 0.07, 0, 1)
    grey = grey + spec * (240 - grey)
    grey = grey * (0.72 + 0.28 * np.clip((dt - 2) / 7.0, 0, 1))   # soft rim occlusion
    return grey


OUTLINE_W = 3.2       # sheet px (~1 frame px)
SEAM_DARK, SEAM_LIGHT = 26.0, 222.0


def finish_layer(grey, region, seam_d, seam_l, extra_trim=None):
    """Apply seams, outline; return RGBA master (grey in RGB) + trim masks."""
    dt = ndimage.distance_transform_edt(region)
    g = grey.copy()
    g[seam_l & region] = np.maximum(g[seam_l & region], SEAM_LIGHT * 0.85)
    g[seam_d & region] = SEAM_DARK
    outline = region & (dt <= OUTLINE_W)
    g[outline] = 22.0
    g[~region] = 22.0
    edge_band = region & (dt > OUTLINE_W) & (dt <= OUTLINE_W + 3.5)
    a = region.astype(np.float32)
    # 1px soft outer edge
    a = np.maximum(a, ndimage.gaussian_filter(a, 0.7) * (ndimage.binary_dilation(region) & ~region))
    rgba = np.zeros(region.shape + (4,), np.uint8)
    gg = np.clip(g, 0, 255).astype(np.uint8)
    rgba[:, :, 0] = rgba[:, :, 1] = rgba[:, :, 2] = gg
    rgba[:, :, 3] = (np.clip(a, 0, 1) * 255).astype(np.uint8)
    seam_trim = (seam_l | ndimage.binary_dilation(seam_d)) & region & ~outline
    if extra_trim is not None:
        seam_trim |= extra_trim & region & ~outline
    return rgba, edge_band, seam_trim


def line_mask(shape, pts, width):
    im = Image.new("L", (shape[1], shape[0]), 0)
    d = ImageDraw.Draw(im)
    d.line([tuple(map(float, p)) for p in pts], fill=255, width=max(1, int(round(width))), joint="curve")
    return np.array(im) > 127


def ellipse_mask(shape, c, rx, ry, ang_deg):
    H, W = shape
    yy, xx = np.mgrid[0:H, 0:W]
    t = math.radians(ang_deg)
    dx, dy = xx - c[0], yy - c[1]
    u = dx * math.cos(t) + dy * math.sin(t); v = -dx * math.sin(t) + dy * math.cos(t)
    return (u / rx) ** 2 + (v / ry) ** 2, u, v


# ------------------------------------------------------------------ legs ---
def split_legs(T):
    l, n = ndimage.label(T)
    if n >= 2:
        sz = ndimage.sum(T, l, range(1, n + 1))
        top2 = [int(i) + 1 for i in np.argsort(sz)[::-1][:2]]
        if sz[top2[1] - 1] > 0.15 * sz[top2[0] - 1]:
            legs = [l == i for i in top2]
            legs.sort(key=lambda m: np.argwhere(m)[:, 1].mean())
            return legs
    rows = np.where(T.any(1))[0]
    split = np.zeros_like(T)
    for y in rows:
        xs = np.where(T[y])[0]
        runs = np.split(xs, np.where(np.diff(xs) > 1)[0] + 1)
        if sum(len(r) >= 8 for r in runs) >= 2:
            split[y] = T[y]
    l, n = ndimage.label(split)
    sz = ndimage.sum(split, l, range(1, n + 1))
    top2 = [int(i) + 1 for i in np.argsort(sz)[::-1][:2]]
    legs = [l == i for i in top2]
    legs.sort(key=lambda m: np.argwhere(m)[:, 1].mean())
    return legs


def paint_legs(S, k):
    M = pose_masks(S, k)
    T = M["trousers"]; fgall = S["fg"]
    legs = split_legs(T)
    thick = T | (ndimage.binary_dilation(T, iterations=5) & ~fgall)
    # assign every thick pixel to the nearest leg core
    d0 = ndimage.distance_transform_edt(~legs[0]); d1 = ndimage.distance_transform_edt(~legs[1])
    leg_of = np.where(d0 <= d1, 0, 1)
    n = norm_lum(S["lum"], T)
    n = np.where(T, n, ndimage.grey_dilation(np.where(T, n, 0), size=7))  # extend into thickness
    dt = ndimage.distance_transform_edt(thick)
    grey = shade_metal(n, dt)
    seam_d = np.zeros_like(T); seam_l = np.zeros_like(T); extra = np.zeros_like(T)
    H, W = T.shape
    info = []
    for li in (0, 1):
        m = thick & (leg_of == li)
        pts = np.argwhere(m)[:, ::-1].astype(float)
        c = pts.mean(0); _, _, vt = np.linalg.svd(pts - c, full_matrices=False); ax = vt[0]
        if ax[1] < 0:
            ax = -ax
        nrm = np.array([-ax[1], ax[0]])
        if nrm[0] < 0:
            nrm = -nrm                        # nrm points to the front (+x, facing right)
        t = (pts - c) @ ax; q = (pts - c) @ nrm
        t0, t1 = t.min(), t.max(); L = t1 - t0
        w = np.percentile(q, 95) - np.percentile(q, 5)
        yy, xx = np.mgrid[0:H, 0:W]
        tt = ((xx - c[0]) * ax[0] + (yy - c[1]) * ax[1] - t0) / L
        qq = ((xx - c[0]) * nrm[0] + (yy - c[1]) * nrm[1])
        # plate seams (dark 1 frame px, light edge just below)
        # cylindrical plate shading: highlight band slightly toward the lit back-left
        cyl = np.cos(np.clip((qq + 0.18 * w) / (0.62 * w), -1, 1) * math.pi / 2)
        grey = np.where(m, grey * (0.78 + 0.34 * cyl), grey)
        for f, wd in ((0.30, 3.0), (0.46, 3.0), (0.70, 3.0)):
            sd = m & (np.abs(tt - f) * L < wd / 2 + 0.2)
            sl = m & ((tt - f) * L > wd / 2) & ((tt - f) * L < wd / 2 + 2.6)
            seam_d |= sd; seam_l |= sl
        # knee cop: domed plate between the knee seams, toward the front
        kc = c + ax * (t0 + 0.575 * L) + nrm * (0.12 * w)
        e, u, v = ellipse_mask((H, W), kc, 0.40 * w, 0.12 * L, math.degrees(math.atan2(nrm[1], nrm[0])))
        cop = (e <= 1.0) & m
        dome = np.clip(1 - e, 0, 1)
        lit = np.clip(0.55 + 0.45 * (-(u / (0.40 * w)) * 0.3 - (v / (0.12 * L)) * 0.7), 0, 1)
        grey = np.where(cop, 80 + 120 * np.clip(0.35 * dome + 0.65 * lit, 0, 1), grey)
        ring = cop & (e > 0.72)
        seam_d |= ring & (e > 0.86)
        spec = cop & (e < 0.05)
        grey = np.where(spec, 228, grey)
        extra |= ring & (e <= 0.86)
        # ankle rim: bright line just above the bottom edge of the plate
        rim = m & (tt > 0.965)
        seam_l |= rim & (tt < 0.985)
        info.append(dict(axis=ax.tolist(), len=float(L), width=float(w)))
    return finish_layer(grey, thick, seam_d, seam_l, extra) + (thick, info)


# ------------------------------------------------------------------ arms ---
def arm_parts(S, k, known_fists):
    """Arm skin (neck excluded), hand masks, and shoulder attach points."""
    M = pose_masks(S, k)
    skin, tunic, face = M["skin"], M["tunic"], M["face"]
    l, n = ndimage.label(skin)
    arms = np.zeros_like(skin)
    near_face = ndimage.binary_dilation(face, iterations=4)
    for j in range(1, n + 1):
        c = l == j
        if c.sum() < 300 or (c & near_face).any():
            continue                                   # neck / specks stay bare
        arms |= c
    H, W = skin.shape
    yy, xx = np.mgrid[0:H, 0:W]
    known = [np.array(f, float) for f in known_fists]
    centers, attach = [], []
    al, an = ndimage.label(arms)
    for j in range(1, an + 1):
        c = al == j
        pts = np.argwhere(c)[:, ::-1].astype(float)
        ys = pts[:, 1]
        top = pts[ys <= np.percentile(ys, 8)].mean(0)            # proximal: sleeve hem
        far = pts[np.argmax(np.linalg.norm(pts - top, axis=1))]  # distal: the hand
        mine = [f for f in known if np.min(np.linalg.norm(pts - f, axis=1)) < 20]
        if mine:
            hs = mine
        else:
            u = (top - far) / (np.linalg.norm(top - far) + 1e-6)
            q = far + u * 14
            for _ in range(4):
                sel = np.linalg.norm(pts - q, axis=1) < 22
                q = pts[sel].mean(0)
            hs = [q]
        centers += hs
        attach.append((top, np.mean(hs, 0)))
    hands = np.zeros_like(skin)
    for c in centers:
        hands |= arms & ((xx - c[0]) ** 2 + (yy - c[1]) ** 2 < 24 ** 2)
    return arms, hands, centers, attach


def torso_frame(tunic):
    cols = np.where(tunic.any(0))[0]
    top = np.full(tunic.shape[1], -1.0); hem = np.full(tunic.shape[1], -1.0)
    for x in cols:
        ys = np.where(tunic[:, x])[0]; top[x] = ys.min(); hem[x] = ys.max()
    span = hem - top
    core = span >= 0.72 * span.max()
    cx = np.where(core)[0]
    hem_s = hem.copy()
    hem_s[cx] = ndimage.median_filter(hem[cx], 9)
    y0 = float(np.percentile(top[cx], 20))
    return dict(core_cols=cx, hem=hem_s, y0=y0)


def paint_body_plate(S, k, known_fists):
    M = pose_masks(S, k)
    tunic, fgall = M["tunic"], S["fg"]
    arms, hands, centers, attach = arm_parts(S, k, known_fists)
    H, W = tunic.shape
    yy, xx = np.mgrid[0:H, 0:W]
    tf = torso_frame(tunic)
    # skirt: extend the hem 10 sheet px (~3 frame px) down over the legs
    skirt_ext = np.zeros_like(tunic)
    for x in tf["core_cols"]:
        h = int(tf["hem"][x])
        skirt_ext[h + 1:h + 11, x] = True
    plate_arm = arms & ~hands
    region = tunic | plate_arm | skirt_ext
    # pauldrons: the sleeve cap around each shoulder, grown a few px outward
    paul = np.zeros_like(tunic); paul_info = []; pmask_e = []
    headzone = ndimage.binary_dilation(M["face"] | M["hair"], iterations=3)
    core_cols_mask = np.zeros_like(tunic); core_cols_mask[:, tf["core_cols"]] = True
    for a, hc in attach:
        u = a - hc; u = u / (np.linalg.norm(u) + 1e-6)
        s_top = a + u * 34                                      # top of the shoulder
        d = np.sqrt((xx - s_top[0]) ** 2 + (yy - s_top[1]) ** 2)
        R = 44.0
        sleeve = tunic & ~core_cols_mask
        cap = (sleeve | plate_arm) & (d < R)
        cap = ndimage.binary_dilation(cap, iterations=6) & (d < R + 6) & ~headzone & ~hands
        paul |= cap
        pmask_e.append((cap, d, R, u))
        paul_info.append(dict(shoulder=s_top.tolist(), axis=u.tolist()))
    region |= paul
    region |= ndimage.binary_dilation(region, iterations=3) & ~fgall & ~ndimage.binary_dilation(hands, iterations=2)
    region = ndimage.binary_opening(region, iterations=1) | tunic
    # base shading from the cloth / skin luminance (each normalised separately)
    L = S["lum"]
    n = np.zeros((H, W))
    n = np.where(tunic, norm_lum(L, tunic), n)
    if plate_arm.any():
        n = np.where(plate_arm, norm_lum(L, plate_arm), n)
    n = np.where(region & ~(tunic | plate_arm), ndimage.grey_dilation(n, size=9), n)
    dt = ndimage.distance_transform_edt(region)
    grey = shade_metal(n, dt)
    seam_d = np.zeros_like(tunic); seam_l = np.zeros_like(tunic); extra = np.zeros_like(tunic)
    # torso bands following the hem: waist band, belly band, 2 skirt lames
    hem = tf["hem"]; y0 = tf["y0"]
    colok = np.zeros(W, bool); colok[tf["core_cols"]] = True
    hgt = np.where(colok, hem - y0, 1.0)
    f = (yy - y0) / hgt[None, :]
    torso = (tunic | skirt_ext) & colok[None, :]
    for fb, wd in ((0.50, 4.0), (0.63, 3.0), (0.79, 3.0), (0.90, 3.0)):
        dpx = (f - fb) * hgt[None, :]
        seam_d |= torso & (np.abs(dpx) < wd / 2)
        seam_l |= torso & (dpx >= wd / 2) & (dpx < wd / 2 + 2.6)
    # the waist band is a raised belt plate: brighten between waist and belly band
    belt = torso & (f > 0.505) & (f < 0.625)
    grey = np.where(belt, grey * 1.08 + 8, grey)
    # breastplate ridge (3/4 view: 60% across the torso toward the facing side)
    ridge = []
    for y in range(int(y0 + 0.06 * np.median(hgt[colok])), int(y0 + 0.48 * np.median(hgt[colok]))):
        xs = np.where(tunic[y] & colok)[0]
        if len(xs) > 10:
            ridge.append((xs.min() + 0.60 * (xs.max() - xs.min()), y))
    if len(ridge) > 5:
        rp = np.array(ridge); rp[:, 0] = ndimage.uniform_filter1d(rp[:, 0], 9)
        seam_l |= line_mask((H, W), rp, 2.4) & tunic
        seam_d |= line_mask((H, W), rp + [3.0, 0], 2.4) & tunic
        # chest plates: lighter on the lit side of the ridge
        for x_r, y in rp:
            y = int(y); x_r = int(x_r)
            grey[y, max(0, x_r - 28):x_r] = np.minimum(grey[y, max(0, x_r - 28):x_r] * 1.07 + 6, 236)
    # vambrace: elbow seam halfway between attach and hand, bright cuff at the wrist
    for a, hc in attach:
        u = hc - a; Ln = np.linalg.norm(u); u = u / (Ln + 1e-6)
        tt = ((xx - a[0]) * u[0] + (yy - a[1]) * u[1]) / (Ln + 1e-6)
        near = plate_arm & (np.abs((xx - a[0]) * -u[1] + (yy - a[1]) * u[0]) < 40)
        seam_d |= near & (np.abs(tt - 0.42) * Ln < 1.6)
        seam_l |= near & ((tt - 0.42) * Ln >= 1.6) & ((tt - 0.42) * Ln < 4.0)
    cuff = plate_arm & ndimage.binary_dilation(hands, iterations=5)
    seam_l |= cuff & ~ndimage.binary_dilation(hands, iterations=2)
    # pauldron shading: domed cap lit from the upper-left, two overlapping lames
    for cap, d, R, u in pmask_e:
        rr = np.clip(d / (R + 6), 0, 1)
        lit = np.clip(0.62 - 0.30 * ((xx - (xx[cap].mean())) / 40.0) - 0.30 * ((yy - yy[cap].min()) / 50.0), 0, 1)
        g2 = 80 + 125 * np.clip(0.5 * (1 - rr ** 2) + 0.5 * lit, 0, 1)
        grey = np.where(cap, g2, grey)
        for r0 in (0.52, 0.78):
            dd = (rr - r0) * (R + 6)
            seam_d |= cap & (np.abs(dd) < 1.6)
            seam_l |= cap & (dd >= 1.6) & (dd < 4.2)
        hl = cap & (rr < 0.16)
        grey = np.where(hl, np.maximum(grey, 225), grey)
    rgba, edge, trim = finish_layer(grey, region, seam_d, seam_l, extra)
    return rgba, edge, trim, region, dict(pauldrons=paul_info, hands=[c.tolist() for c in centers])


# ------------------------------------------------------- dragon chainbody ---
DR_DEEP, DR_MID, DR_HI = np.array([0x6E, 0x0F, 0x14]), np.array([0xB0, 0x1E, 0x24]), np.array([0xE8, 0x47, 0x4A])
GOLD_D, GOLD_M, GOLD_H = np.array([0x5E, 0x46, 0x12]), np.array([0x8E, 0x6C, 0x22]), np.array([0xC9, 0xA4, 0x3A])


def ramp3(t, c0, c1, c2):
    t = np.clip(t, 0, 1)[..., None]
    lo = c0 + (c1 - c0) * np.clip(t / 0.5, 0, 1)
    hi = c1 + (c2 - c1) * np.clip((t - 0.5) / 0.5, 0, 1)
    return np.where(t < 0.5, lo, hi)


def paint_chainbody(S, k):
    """Dragon chainbody: tunic region only (short sleeves), red scale pattern,
    dark-gold collar and hem trim. Painted in final colour (not palette-swapped)."""
    M = pose_masks(S, k)
    tunic, fgall = M["tunic"], S["fg"]
    H, W = tunic.shape
    region = tunic | (ndimage.binary_dilation(tunic, iterations=2) & ~fgall)
    yy, xx = np.mgrid[0:H, 0:W]
    n = norm_lum(S["lum"], tunic)
    n = np.where(tunic, n, ndimage.grey_dilation(n, size=5))
    # staggered scale grid: 13 x 9 sheet px scales (~4 x 3 frame px)
    sw, sh = 13.0, 9.0
    row = np.floor(yy / sh); xo = xx + (row % 2) * sw / 2
    cxs = (np.floor(xo / sw) + 0.5) * sw; cys = row * sh
    du = (xo - cxs) / (sw / 2); dv = (yy - cys) / sh            # dv 0 (top) .. 1 (bottom edge)
    rad = np.sqrt(du ** 2 + (dv * 1.1) ** 2)
    scale_hi = np.clip(1.0 - rad, 0, 1) * (dv < 0.7)
    edge_dark = np.clip((dv - 0.72) / 0.28, 0, 1) + np.clip((np.abs(du) - 0.85) / 0.15, 0, 1) * 0.6
    t = 0.18 + 0.55 * n + 0.32 * scale_hi - 0.45 * edge_dark
    rgb = ramp3(t, DR_DEEP * 0.55, DR_MID, DR_HI)
    rgb = np.where((t > 0.90)[..., None], np.minimum(rgb + 30, 255), rgb)
    dt = ndimage.distance_transform_edt(region)
    rgb = rgb * (0.72 + 0.28 * np.clip((dt - 2) / 6, 0, 1))[..., None]
    # dark-gold collar (around neck/face) and hem trims (sleeves + bottom)
    neck = ndimage.binary_dilation(M["skin"] & ndimage.binary_dilation(M["face"], iterations=40) | M["face"] | M["hair"], iterations=1)
    collar = region & (ndimage.distance_transform_edt(~neck) < 10)
    hem = region & (ndimage.distance_transform_edt(~(M["trousers"] | M["skin"] & ~neck)) < 6) & ~collar
    gold = collar | hem
    gt = 0.35 + 0.55 * n + 0.25 * np.clip(1 - np.abs(((yy + xx) % 7) - 3) / 3, 0, 1)
    grgb = ramp3(gt, GOLD_D, GOLD_M, GOLD_H)
    rgb = np.where(gold[..., None], grgb, rgb)
    gl = gold & ~ndimage.binary_erosion(gold, iterations=1)
    rgb = np.where(gl[..., None], rgb * 0.6, rgb)                 # trim edge line
    outline = region & (dt <= OUTLINE_W)
    rgb = np.where(outline[..., None], np.array([30, 6, 8]), rgb)
    a = region.astype(np.float32)
    a = np.maximum(a, ndimage.gaussian_filter(a, 0.7) * (ndimage.binary_dilation(region) & ~region))
    rgba = np.dstack([np.clip(rgb, 0, 255), a * 255]).astype(np.uint8)
    return rgba, region


# ------------------------------------------------------------ palette swap ---
def hexc(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)


RAMPS = {
    "bronze":  ("#5A3316", "#A8652A", "#E0A060"),
    "iron":    ("#2E3034", "#5E6168", "#9A9EA6"),
    "steel":   ("#6F747C", "#B4B9C0", "#EEF1F4"),
    "mithril": ("#2E2A5E", "#5E58B0", "#A7A2F0"),
    "adamant": ("#173826", "#2F6E4A", "#6FB58A"),
    "rune":    ("#0F4A5A", "#2AA6C0", "#8FE6F5"),
    "dragon":  ("#5A0C10", "#B01E24", "#F05A5A"),
}
RUNE_GOLD = [(0, (46, 32, 4)), (55, (112, 80, 10)), (125, (196, 150, 22)), (205, (240, 192, 32)), (255, (255, 238, 160))]
DRAGON_GOLD = [(0, (40, 26, 6)), (55, (96, 66, 14)), (125, (170, 126, 34)), (205, (222, 176, 64)), (255, (250, 226, 150))]
GREY_X = [0, 55, 125, 205, 255]    # master grey levels mapped to the ramp stops


def ramp_stops(metal):
    d, m, l = (hexc(h) for h in RAMPS[metal])
    return [(0, d * 0.30), (55, d), (125, m), (205, l), (255, l + (255 - l) * 0.55)]


def interp_stops(g, stops):
    xs = [s[0] for s in stops]
    return np.dstack([np.interp(g, xs, [s[1][c] for s in stops]) for c in range(3)])


def palette_swap(master, edge, seam, metal):
    """Luminance-preserving ramp: master grey level -> metal colour; rune gets
    gold on outer edge band + seams, dragon gets gold seam accents."""
    g = master[:, :, 0].astype(float)
    rgb = interp_stops(g, ramp_stops(metal))
    if metal == "rune":
        t = edge | seam
        rgb = np.where(t[..., None], interp_stops(g, RUNE_GOLD), rgb)
    elif metal == "dragon":
        rgb = np.where(seam[..., None], interp_stops(g, DRAGON_GOLD), rgb)
    return np.dstack([np.clip(rgb + 0.5, 0, 255), master[:, :, 3]]).astype(np.uint8)


# --------------------------------------------------------------- masters ---
def helm_grey(h):
    """Grey helm crop -> neutral master grey (levels stretched to the plate range)."""
    rgb = h["rgba"][:, :, :3].astype(float)
    L = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    op = h["opaque"]
    lo, hi = np.percentile(L[op], 3), np.percentile(L[op], 97)
    g = np.clip(50 + (L - lo) / (hi - lo) * 165, 12, 250)
    out = h["rgba"].copy()
    out[:, :, 0] = out[:, :, 1] = out[:, :, 2] = g.astype(np.uint8)
    return out


def helm_trim(h, s_):
    """Outer edge band ~1 frame px wide (just inside the painted outline), crop px."""
    solid = h["opaque"] | h["cavity"]
    d = ndimage.distance_transform_edt(solid)
    fpx = 1.0 / (P_S * s_)                     # one frame px in helm-crop px
    return solid & (d > 0.9 * fpx) & (d <= 2.0 * fpx) & h["opaque"]


P_S = 0.29668


def build_masters(S, C):
    H, W = S["fg"].shape
    legs = {}; body = {}; chain = {}
    for k, p in enumerate(POSES):
        rgba, edge, trim, reg, info = paint_legs(S, k)
        legs[p] = dict(rgba=rgba, edge=edge, trim=trim, region=reg, info=info)
        rgba, edge, trim, reg, info = paint_body_plate(S, k, C["geo"][p]["fists_body_sheet"])
        body[p] = dict(rgba=rgba, edge=edge, trim=trim, region=reg, info=info)
        rgba, reg = paint_chainbody(S, k)
        chain[p] = dict(rgba=rgba, region=reg)
    helms = key_helms()
    fits = geometric_helm_fit(S, helms)
    return legs, body, chain, helms, fits


def zero_outside(rgba, region, grow=3):
    keep = ndimage.binary_dilation(region, iterations=grow)
    out = rgba.copy(); out[~keep] = 0
    return out


def save_masters(S, legs, body, chain, helms, fits, C):
    H, W = S["fg"].shape
    def combine(D, key="rgba"):
        acc = np.zeros((H, W, 4), np.uint8)
        for p in POSES:
            m = ndimage.binary_dilation(D[p]["region"], iterations=3)
            acc[m] = D[p][key][m]
        return acc
    def combine_mask(D, key):
        acc = np.zeros((H, W), bool)
        for p in POSES:
            acc |= D[p][key]
        return acc
    Image.fromarray(combine(legs)).save(MASTERS / "legs_plate_grey.png")
    Image.fromarray(combine(body)).save(MASTERS / "body_plate_grey.png")
    Image.fromarray(combine(chain)).save(MASTERS / "body_chain_dragon.png")
    for name, D in (("legs_plate", legs), ("body_plate", body)):
        e, t = combine_mask(D, "edge"), combine_mask(D, "trim")
        Image.fromarray(np.dstack([e * 255, t * 255, np.zeros_like(e)]).astype(np.uint8)).save(MASTERS / f"{name}_trim.png")
    for kind in HELM_TYPES:
        h = helms[kind]
        if kind == "dragon":
            Image.fromarray(h["rgba"]).save(MASTERS / "helm_dragon.png")
        else:
            Image.fromarray(h["grey"]).save(MASTERS / f"helm_{kind}_grey.png")
            Image.fromarray((h["trim"] * 255).astype(np.uint8)).save(MASTERS / f"helm_{kind}_trim.png")
        Image.fromarray((h["cavity"] * 255).astype(np.uint8)).save(MASTERS / f"helm_{kind}_cavity.png")
    meta = {
        "note": "Neutral grey masters in BODY-SHEET space (plain_body_gs.png keyed, 1280x720, 3 poses "
                "left->right idle/walk/attack). Render a strip frame with build_player_plain.M_body(C, frame, FX) "
                "exactly like player_plain_body_*. Helm crops render with M_body @ A[pose] (A = helm crop -> body sheet). "
                "Palette: master grey level g -> ramp stops at g=0,55,125,205,255 = dark*0.3, dark, mid, light, light+55% to white. "
                "*_trim.png: R = outer edge band, G = seam band (rune gold on R|G, dragon gold on G).",
        "grey_stops": GREY_X,
        "ramps": RAMPS,
        "helm_for_metal": HELM_FOR,
        "helm_fits": {k: {p: dict(A=v["A"], scale=v["scale"], rot=v["rot"], hair_covered=round(v["hair_covered"], 4))
                          for p, v in fits[k].items()} for k in fits},
        "helm_params": HELM_PARAMS,
        "legs_info": {p: legs[p]["info"] for p in POSES},
        "body_info": {p: body[p]["info"] for p in POSES},
    }
    (MASTERS / "armor_masters.json").write_text(json.dumps(meta, indent=1, default=float))


# ---------------------------------------------------------------- render ---
def render_rgba(rgba, M):
    ch, _ = P.render_layer(rgba, M)
    return P.to_u8(P.downsample(ch))


def helm_pose_rgba(h, rgba, A, S, k, lining):
    """Per-pose cavity: transparent only where the face/neck skin shows through;
    elsewhere (hair or nothing beneath) an opaque helmet-lining shadow, a touch
    lighter than black so it reads as the helm interior, not a hole."""
    Mk = pose_masks(S, k)
    face = ndimage.binary_erosion(Mk["face"] | Mk["skin"], iterations=1)
    face_c = warp_mask(face, np.linalg.inv(A), h["cavity"].shape)
    out = rgba.copy()
    cav_open = h["cavity"] & face_c
    cav_fill = h["cavity"] & ~face_c
    out[:, :, 3] = np.where(cav_open, 0, out[:, :, 3])
    out[:, :, 3] = np.where(cav_fill, 255, out[:, :, 3])
    out[cav_fill, :3] = np.array(lining, np.uint8)
    return out


def lining_for(metal):
    if metal == "grey":
        return (40, 40, 40)
    if HELM_FOR[metal] == "dragon":
        return (64, 10, 14)
    return tuple(interp_stops(np.array([[40.0]]), ramp_stops(metal))[0, 0].astype(int))


def render_armor(S, C, L, legs, body, chain, helms, fits):
    R = {}   # R[(slot, metal, strip)] = [frames]
    grey = {}  # neutral grey strips for _masters/strips
    sw_legs = {m: {p: zero_outside(palette_swap(legs[p]["rgba"], legs[p]["edge"], legs[p]["trim"], m), legs[p]["region"])
                   for p in POSES} for m in METALS}
    sw_body = {m: {p: zero_outside(palette_swap(body[p]["rgba"], body[p]["edge"], body[p]["trim"], m), body[p]["region"])
                   for p in POSES} for m in METALS if m != "dragon"}
    sw_body["dragon"] = {p: zero_outside(chain[p]["rgba"], chain[p]["region"]) for p in POSES}
    helm_src = {}
    for m in METALS:
        kind = HELM_FOR[m]; h = helms[kind]
        base = h["rgba"] if kind == "dragon" else palette_swap(h["grey"], h["trim"], np.zeros_like(h["trim"]), m)
        helm_src[m] = {p: helm_pose_rgba(h, base, np.array(fits[kind][p]["A"]), S, k, lining_for(m))
                       for k, p in enumerate(POSES)}
    grey_src = {"legs_plate_grey": {p: zero_outside(legs[p]["rgba"], legs[p]["region"]) for p in POSES},
                "body_plate_grey": {p: zero_outside(body[p]["rgba"], body[p]["region"]) for p in POSES}}
    for kind in ("med", "full"):
        h = helms[kind]
        grey_src[f"helm_{kind}_grey"] = {p: helm_pose_rgba(h, h["grey"], np.array(fits[kind][p]["A"]), S, k, lining_for("grey"))
                                         for k, p in enumerate(POSES)}
    for sn, spec in STRIPS.items():
        FX = L["FX"][sn]
        for fr in spec["frames"]:
            Mb = P.M_body(C, fr, FX); p = fr["pose"]
            for m in METALS:
                kind = HELM_FOR[m]
                fx = (lambda f: P.despill_frame(f, 6, all_px=True)) if m == "rune" else (lambda f: f)
                R.setdefault(("legs", m, sn), []).append(fx(render_rgba(sw_legs[m][p], Mb)))
                R.setdefault(("body", m, sn), []).append(fx(render_rgba(sw_body[m][p], Mb)))
                hf = fx(render_rgba(helm_src[m][p], Mb @ np.array(fits[kind][p]["A"])))
                if kind == "dragon":
                    hf = P.despill_frame(hf, 6)
                R.setdefault(("helm", m, sn), []).append(hf)
            for gname, src in grey_src.items():
                A = np.eye(3)
                if gname.startswith("helm"):
                    A = np.array(fits[gname.split("_")[1]][p]["A"])
                grey.setdefault((gname, sn), []).append(render_rgba(src[p], Mb @ A))
    return R, grey


def fname(slot, metal, sn):
    return f"player_gear_{slot}_{metal}_{sn}.png"


def write_armor(R, grey):
    files = []
    for (slot, m, sn), frames in R.items():
        fn = fname(slot, m, sn)
        P.strip_img(frames).save(SPRITES / fn); files.append(fn)
    sd = MASTERS / "strips"; sd.mkdir(exist_ok=True)
    for (g, sn), frames in grey.items():
        P.strip_img(frames).save(sd / f"{g}_{sn}.png")
    return sorted(files)


# -------------------------------------------------------------------- QA ---
def qa_armor(files, fits):
    lines = ["", "=" * 72, "ARMOR OVERLAYS (build_player_armor.py)", "=" * 72,
             "checks per strip: size 852x156, frame corners alpha 0, lime residue, alpha px on frame edge,",
             "alignment = overlay px (a>8) outside body alpha (a>8) dilated 4 px [helm: rows above the body",
             "head top / behind the head exempt only for the dragon crest], bbox vs body bbox+4, floating",
             "components (a>32 blobs of >=2 px not touching the dilated body)", ""]
    issues = []
    body = {sn: P.load_frames(f"player_plain_body_{sn}.png") for sn in STRIPS}
    for fn in files:
        slot, m, sn = fn[:-4].split("_")[2:5]
        fr = P.load_frames(fn); arr = np.concatenate(fr, 1); a = arr[:, :, 3]
        fc = max(int(max(f[0, 0, 3], f[0, -1, 3], f[-1, 0, 3], f[-1, -1, 3])) for f in fr)
        lime = int(P.lime_residue(arr, m == "adamant").sum())
        greenish = int((P.scrub_green(arr) & (a > 8)).sum()) if m != "adamant" else 0
        edge_touch = int(sum((f[:, 0, 3] > 0).sum() + (f[:, -1, 3] > 0).sum() + (f[0, :, 3] > 0).sum() + (f[-1, :, 3] > 0).sum() for f in fr))
        outside = 0; crest = 0; bbox_over = 0; floating = 0
        for f, b in zip(fr, body[sn]):
            ba = b[:, :, 3] > 8
            ba_d = ndimage.binary_dilation(ba, iterations=4)
            oa = f[:, :, 3] > 8
            out = oa & ~ba_d
            if slot == "helm" and m == "dragon":
                rows = np.where(ba.any(1))[0]
                ys, xs = np.where(out)
                ex = ys < rows.min() + 22      # crest zone (top of the head)
                crest += int(ex.sum()); out_n = int((~ex).sum())
            else:
                out_n = int(out.sum())
            outside += out_n
            bb = Image.fromarray(b).getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
            ob = Image.fromarray(f).getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
            if ob:
                over = max(bb[0] - 4 - ob[0], ob[2] - (bb[2] + 4), (bb[1] - 4 - ob[1]) if not (slot == "helm" and m == "dragon") else 0,
                           ob[3] - (bb[3] + 4), 0)
                bbox_over = max(bbox_over, over)
            lab, n = ndimage.label(f[:, :, 3] > 32)
            for j in range(1, n + 1):
                c = lab == j
                if c.sum() >= 2 and not (c & ba_d).any():
                    floating += 1
        lines.append(f"{fn}: {arr.shape[1]}x{arr.shape[0]} corner={fc} lime={lime} greenish(info)={greenish} "
                     f"edge_px={edge_touch} outside_body_dil4{"(info)" if slot == "helm" else ""}={outside} crest_exempt={crest} bbox_over={bbox_over} floating={floating}")
        if arr.shape != (P.FH, P.FW * 6, 4): issues.append(f"{fn}: size")
        if fc: issues.append(f"{fn}: corner alpha")
        if lime: issues.append(f"{fn}: lime {lime}")
        if edge_touch: issues.append(f"{fn}: edge px {edge_touch}")
        if outside and slot != "helm": issues.append(f"{fn}: {outside} px outside body+4")
        if bbox_over: issues.append(f"{fn}: bbox over by {bbox_over}")
        if floating: issues.append(f"{fn}: {floating} floating blobs")
    lines.append("")
    for k in fits:
        lines.append(f"helm fit {k}: " + ", ".join(f"{p} scale={np.round(v['scale'], 4).tolist()} rot={v['rot']:.2f}deg "
                                                  f"hair_covered={v['hair_covered']:.3f}" for p, v in fits[k].items()))
    lines += ["", "armor issues=" + ("; ".join(issues) if issues else "CLEAN")]
    qa = OUT / "_qa_summary.txt"
    txt = qa.read_text() if qa.exists() else ""
    mark = "\n" + "=" * 72 + "\nARMOR OVERLAYS"
    if mark in txt:
        txt = txt[:txt.index(mark)]
    qa.write_text(txt.rstrip("\n") + "\n" + "\n".join(lines) + "\n")
    print("\n".join(lines[-12:]))
    return issues


# --------------------------------------------------------------- preview ---
def stack(sn, fi, layers):
    """layers: list of strip filenames, back to front."""
    im = None
    for fn in layers:
        f = Image.fromarray(P.load_frames(fn)[fi])
        im = f if im is None else Image.alpha_composite(im, f)
    return im


def kit(metal, sn, fi, legs=True, bodyp=True, helm=True, weapon=None, glint=True):
    ls = [f"player_plain_body_{sn}.png"]
    if legs: ls.append(fname("legs", legs if isinstance(legs, str) else metal, sn))
    if bodyp: ls.append(fname("body", bodyp if isinstance(bodyp, str) else metal, sn))
    if helm: ls.append(fname("helm", helm if isinstance(helm, str) else metal, sn))
    ls.append(f"player_gear_weapon_{weapon or metal}_{sn}.png")
    if glint: ls.append(f"player_gear_weapon_glint_{sn}.png")
    return stack(sn, fi, ls)


def floor_bg(w, h):
    """Dark arena floor: the locked floor_tile.png tiled (the arena mock has
    pilot sprites baked in, which clutter the lineup)."""
    fp = P.ROOT / "env" / "floor_tile.png"
    if not fp.exists():
        return checker((w, h))
    t = Image.open(fp).convert("RGBA")
    out = Image.new("RGBA", (w, h))
    for y in range(0, h, t.height):
        for x in range(0, w, t.width):
            out.paste(t, (x, y))
    return out


def preview(L):
    font = load_font(14); small = load_font(12)
    Z = 2; tw, th = FW * Z, FH * Z; gap = 6; pad = 12; lab_h = 22
    def row_panel(items, title):
        w = pad * 2 + len(items) * tw + (len(items) - 1) * gap
        h = lab_h + th + 26
        pan = floor_bg(w, h)
        d = ImageDraw.Draw(pan)
        d.text((pad, 4), title, font=font, fill=(255, 246, 206, 255))
        for i, (lab, im) in enumerate(items):
            x = pad + i * (tw + gap)
            pan.alpha_composite(im.resize((tw, th), Image.Resampling.LANCZOS), (x, lab_h))
            d.text((x + 4, lab_h + th + 4), lab, font=small, fill=(255, 230, 160, 255))
        return pan
    tiers = [(m, kit(m, "idle", 0)) for m in METALS]
    A = row_panel(tiers, "full kit per tier (legs + body + helm + weapon), idle frame 0 @2x  "
                         "[helm: med = bronze/iron/steel, full = mithril/adamant/rune, dragon med+fin; dragon body = chainbody]")
    prog = [("plain + bronze", kit("bronze", "idle", 0, legs=False, bodyp=False, helm=False)),
            ("+ legs (SL3, iron)", kit("iron", "idle", 0, legs="iron", bodyp=False, helm=False)),
            ("+ body (SL5, steel)", kit("steel", "idle", 0, legs="iron", bodyp="steel", helm=False)),
            ("+ helm (SL7, steel)", kit("steel", "idle", 0, legs="iron", bodyp="steel", helm="steel"))]
    B = row_panel(prog, "progression (idle frame 0 @2x): plain -> + iron platelegs -> + steel platebody -> + steel med helm")
    att = [(f"{m} attack f3", kit(m, "attack", 3)) for m in ("bronze", "rune", "dragon")]
    att += [(f"{m} walk f0", kit(m, "walk", 0)) for m in ("steel",)]
    Cc = row_panel(att, "attack frame 3 (thrust + lunge) for bronze / rune / dragon kits, + steel walk f0 @2x")
    # game-size (1x) strips for a sanity look
    strips = []
    for m in ("iron", "rune", "dragon"):
        for sn in STRIPS:
            fr = [kit(m, sn, i) for i in range(6)]
            st = Image.new("RGBA", (FW * 6, FH))
            for i, f in enumerate(fr): st.alpha_composite(f, (i * FW, 0))
            strips.append((f"{m} {sn} @1x (game size)", st))
    sw = FW * 6
    Dw = pad * 2 + 3 * sw + 2 * gap; Dh = 3 * (FH + 22) + 30
    D = floor_bg(Dw, Dh); dd = ImageDraw.Draw(D)
    dd.text((pad, 4), "full kits, all strips at 1x (game size)", font=font, fill=(255, 246, 206, 255))
    for i, (lab, st) in enumerate(strips):
        col, rw = i // 3, i % 3
        x = pad + col * (sw + gap); y = 24 + rw * (FH + 22)
        D.alpha_composite(st, (x, y)); dd.text((x + 4, y + FH + 2), lab, font=small, fill=(255, 230, 160, 255))
    W = max(p.width for p in (A, B, Cc, D)) + 20
    H = A.height + B.height + Cc.height + D.height + 50
    out = Image.new("RGBA", (W, H), (18, 20, 26, 255)); y = 10
    for pnl in (A, B, Cc, D):
        out.alpha_composite(pnl, (10, y)); y += pnl.height + 10
    out.convert("RGB").save(OUT / "preview_gear.png")
    print("wrote", OUT / "preview_gear.png", out.size)


# ------------------------------------------------------------------ main ---
def main():
    C = P.setup(); L = P.solve_layout(C)
    assert abs(C["s"] - P_S) < 5e-5, C["s"]
    S = segment_body()
    legs, body, chain, helms, fits = build_masters(S, C)
    for kind in HELM_TYPES:
        h = helms[kind]
        s_ = fits[kind]["idle"]["scale"][0]
        if kind != "dragon":
            h["grey"] = helm_grey(h)
        h["trim"] = helm_trim(h, s_)
    save_masters(S, legs, body, chain, helms, fits, C)
    R, grey = render_armor(S, C, L, legs, body, chain, helms, fits)
    files = write_armor(R, grey)
    print(len(files), "armor strips written")
    issues = qa_armor(files, fits)
    preview(L)
    return files, issues


if __name__ == "__main__":
    main()
