"""Option C locked-board models — gold-cage orb, knight, stone fists, ivy turret."""
import math
import bpy
from mathutils import Euler
from common import cube, cylinder, sphere, cone, empty, contact_shadow, torus


def _root(name):
    return empty(name, (0, 0, 0))


def face_eyes(parent, loc, eye_color="peye"):
    """Glowing eyes only in hood void (locked board: yellow-orange)."""
    eye_l = sphere("eye_l", (loc[0], loc[1] - 0.08, loc[2]), 0.04, eye_color, parent, segments=6, rings=4, emission=3.5)
    eye_r = sphere("eye_r", (loc[0], loc[1] + 0.08, loc[2]), 0.04, eye_color, parent, segments=6, rings=4, emission=3.5)
    return eye_l, eye_r


def build_player():
    root = _root("player")
    # Deep purple robe with thick gold hem
    robe = cone("robe", (0, 0, 0.85), 0.62, 1.6, "p2", root, verts=8)
    hem = cylinder("hem", (0, 0, 0.12), 0.68, 0.1, "gold2", root, verts=8)
    torso = cube("torso", (0, 0, 1.45), (0.55, 0.4, 0.55), "p3", root)
    # Thick gold trim sleeves / collar
    collar = cylinder("collar", (0, 0, 1.72), 0.4, 0.14, "gold2", root, verts=8)
    belt = cylinder("belt", (0, 0, 1.12), 0.52, 0.12, "strap", root, verts=8)
    buckle = cube("buckle", (0.38, -0.22, 1.12), (0.14, 0.1, 0.12), "gold2", root)
    # Large pointed hood
    hood = sphere("hood", (0.0, 0, 2.15), 0.45, "p1", root, segments=10, rings=7)
    hood.scale = (1.0, 1.2, 1.05)
    peak = cone("hood_peak", (0, 0, 2.55), 0.18, 0.35, "p0", root, verts=6)
    face_eyes(root, (0.28, 0, 2.05), eye_color="peye")
    # Arms with gold cuff
    cylinder("arm_l", (-0.45, 0.05, 1.48), 0.12, 0.55, "p2", root, verts=6, rot=(0, math.radians(20), 0))
    cylinder("arm_r", (0.45, 0.05, 1.48), 0.12, 0.55, "p2", root, verts=6, rot=(0, math.radians(-18), 0))
    cylinder("cuff_l", (-0.58, 0.1, 1.28), 0.13, 0.08, "gold2", root, verts=6)
    cylinder("cuff_r", (0.58, 0.1, 1.32), 0.13, 0.08, "gold2", root, verts=6)
    sphere("hand_l", (-0.6, 0.12, 1.22), 0.16, "skin", root)
    hand_r = sphere("hand_r", (0.6, 0.1, 1.28), 0.16, "skin", root)
    # Staff + LARGE purple orb in GOLD CAGE
    staff_pivot = empty("staff_pivot", (0.6, 0.1, 1.28))
    staff_pivot.parent = root
    cylinder("staff", (0, 0, 0.2), 0.055, 2.2, "wood", staff_pivot, verts=6)
    # gold cage prongs
    cage_base = cylinder("cage_base", (0, 0, 1.32), 0.16, 0.08, "gold2", staff_pivot, verts=8)
    tip2 = sphere("staff_glow", (0, 0, 1.58), 0.24, "porb", staff_pivot, segments=10, rings=7, emission=5.0)
    # 4 thick gold claw prongs wrapping the orb
    for i, ang in enumerate((45, 135, 225, 315)):
        rad = 0.2
        px = math.cos(math.radians(ang)) * rad
        py = math.sin(math.radians(ang)) * rad
        prong = cube(f"prong_{i}", (px, py, 1.58), (0.07, 0.07, 0.42), "gold2", staff_pivot)
        # tip claw inward
        claw = cube(f"claw_{i}", (px * 0.55, py * 0.55, 1.82), (0.06, 0.06, 0.12), "gold", staff_pivot)
    # big feet
    cube("foot_l", (-0.22, 0.2, 0.1), (0.3, 0.5, 0.16), "b0", root)
    cube("foot_r", (0.22, 0.2, 0.1), (0.3, 0.5, 0.16), "b0", root)
    contact_shadow(root, loc=(0, 0.08, 0.012), scale=(1.0, 0.58, 1), alpha=0.55)
    root.rotation_euler = Euler((0, 0, math.radians(-90)))
    return root, {"staff_pivot": staff_pivot, "hood": hood, "torso": torso, "tip2": tip2, "hand_r": hand_r, "robe": robe}


def build_briar():
    root = _root("briar")
    # Humanoid legs — mid-grey plate
    thigh_l = cube("thigh_l", (-0.24, 0, 0.72), (0.28, 0.3, 0.48), "b2", root)
    thigh_r = cube("thigh_r", (0.24, 0, 0.72), (0.28, 0.3, 0.48), "b2", root)
    shin_l = cube("shin_l", (-0.24, 0.02, 0.32), (0.26, 0.28, 0.42), "b1", root)
    shin_r = cube("shin_r", (0.24, 0.02, 0.32), (0.26, 0.28, 0.42), "b1", root)
    boot_l = cube("boot_l", (-0.24, 0.2, 0.1), (0.34, 0.52, 0.18), "b0", root)
    boot_r = cube("boot_r", (0.24, 0.2, 0.1), (0.34, 0.52, 0.18), "b0", root)
    pelvis = cube("pelvis", (0, 0, 1.02), (0.58, 0.4, 0.28), "b2", root)
    torso = cube("torso", (0, 0, 1.42), (0.7, 0.45, 0.7), "b3", root)
    chest = cube("chest", (0.06, -0.15, 1.48), (0.52, 0.16, 0.5), "steel", root)
    # gold accents on edges
    cube("trim_l", (-0.38, -0.2, 1.5), (0.06, 0.08, 0.45), "gold2", root)
    cube("trim_r", (0.38, -0.2, 1.5), (0.06, 0.08, 0.45), "gold2", root)
    belt = cube("belt", (0, 0, 1.05), (0.72, 0.42, 0.14), "strap", root)
    buckle = cube("buckle", (0.35, -0.24, 1.05), (0.14, 0.1, 0.12), "gold2", root)
    paul_l = sphere("paul_l", (-0.55, 0, 1.68), 0.28, "steel", root, segments=8, rings=6)
    paul_r = sphere("paul_r", (0.55, 0, 1.68), 0.28, "steel", root, segments=8, rings=6)
    # gold pauldron rims
    cylinder("paul_rim_l", (-0.55, 0, 1.68), 0.3, 0.05, "gold", root, verts=8, rot=(math.radians(90), 0, 0))
    cylinder("paul_rim_r", (0.55, 0, 1.68), 0.3, 0.05, "gold", root, verts=8, rot=(math.radians(90), 0, 0))
    arm_l = cylinder("arm_l", (-0.58, 0.05, 1.35), 0.12, 0.52, "b2", root, verts=6, rot=(0, math.radians(12), 0))
    arm_r = cylinder("arm_r", (0.58, 0.05, 1.35), 0.12, 0.52, "b2", root, verts=6, rot=(0, math.radians(-10), 0))
    sphere("hand_l", (-0.68, 0.1, 1.12), 0.14, "b3", root)
    cylinder("neck", (0, 0, 1.82), 0.13, 0.16, "skin", root, verts=6)
    # Great helm — vertical slit + red plume
    helm = cube("helm", (0.02, 0, 2.1), (0.44, 0.44, 0.42), "b2", root)
    helm_top = cube("helm_top", (0, 0, 2.35), (0.4, 0.4, 0.12), "b1", root)
    # vertical breathing slit
    slit = cube("slit", (0.24, 0, 2.08), (0.05, 0.08, 0.28), "b0", root)
    # eye glints
    sphere("eye_l", (0.22, -0.06, 2.12), 0.025, "cream", root, segments=5, rings=3, emission=1.2)
    sphere("eye_r", (0.22, 0.06, 2.12), 0.025, "cream", root, segments=5, rings=3, emission=1.2)
    plume = cone("plume", (0, -0.05, 2.6), 0.09, 0.4, "plume", root, verts=6)
    # Kite shield — grey + thick gold border + PROMINENT gold STAR
    shield_piv = empty("shield_piv", (-0.9, -0.1, 1.3))
    shield_piv.parent = root
    shield = cube("shield", (0, 0, 0), (0.12, 0.7, 1.0), "b2", shield_piv)
    shield_bot = cube("shield_bot", (0, 0, -0.6), (0.1, 0.4, 0.35), "b1", shield_piv)
    # gold border frame
    cube("border_t", (0.07, 0, 0.48), (0.04, 0.72, 0.08), "gold2", shield_piv)
    cube("border_b", (0.07, 0, -0.48), (0.04, 0.55, 0.08), "gold2", shield_piv)
    cube("border_l", (0.07, -0.34, 0), (0.04, 0.08, 0.95), "gold2", shield_piv)
    cube("border_r", (0.07, 0.34, 0), (0.04, 0.08, 0.95), "gold2", shield_piv)
    # 4-point star emblem
    star_v = cube("star_v", (0.09, 0, 0.1), (0.05, 0.12, 0.55), "gold2", shield_piv)
    star_h = cube("star_h", (0.09, 0, 0.1), (0.05, 0.55, 0.12), "gold2", shield_piv)
    star_d1 = cube("star_d1", (0.09, 0, 0.1), (0.05, 0.35, 0.1), "gold2", shield_piv)
    star_d1.rotation_euler = Euler((math.radians(45), 0, 0))
    star_d2 = cube("star_d2", (0.09, 0, 0.1), (0.05, 0.35, 0.1), "gold2", shield_piv)
    star_d2.rotation_euler = Euler((math.radians(-45), 0, 0))
    # Broadsword
    sword_pivot = empty("sword_pivot", (0.75, 0.15, 1.32))
    sword_pivot.parent = root
    sphere("hand_r", (0, 0, 0), 0.15, "skin", sword_pivot)
    cylinder("grip", (0, 0, -0.12), 0.055, 0.28, "strap", sword_pivot, verts=6)
    cube("guard", (0, 0, 0.06), (0.38, 0.12, 0.1), "gold2", sword_pivot)
    cube("blade", (0, 0, 0.6), (0.1, 0.14, 1.15), "steel", sword_pivot)
    cube("edge", (0.05, 0, 0.6), (0.03, 0.05, 1.05), "cream", sword_pivot)
    contact_shadow(root, loc=(0, 0.08, 0.012), scale=(1.1, 0.62, 1), alpha=0.55)
    root.rotation_euler = Euler((0, 0, math.radians(-90)))
    return root, {
        "sword_pivot": sword_pivot, "shield_piv": shield_piv, "torso": torso,
        "thigh_l": thigh_l, "thigh_r": thigh_r, "shin_l": shin_l, "shin_r": shin_r,
        "boot_l": boot_l, "boot_r": boot_r, "paul_l": paul_l, "paul_r": paul_r,
        "helm": helm, "arm_l": arm_l, "arm_r": arm_r,
    }


def build_quill():
    root = _root("quill")
    cube("leg_l", (-0.14, 0, 0.45), (0.18, 0.22, 0.7), "q0", root)
    cube("leg_r", (0.14, 0, 0.45), (0.18, 0.22, 0.7), "q0", root)
    cube("boot_l", (-0.14, 0.14, 0.1), (0.22, 0.42, 0.14), "wood", root)
    cube("boot_r", (0.14, 0.14, 0.1), (0.22, 0.42, 0.14), "wood", root)
    torso = cube("torso", (0, 0, 1.2), (0.42, 0.34, 0.72), "q2", root)
    cube("belt", (0, 0, 0.88), (0.44, 0.32, 0.1), "wood", root)
    cube("buckle", (0.22, -0.16, 0.88), (0.1, 0.08, 0.1), "gold2", root)
    hood = sphere("hood", (0.04, 0, 1.88), 0.36, "q0", root, segments=10, rings=7)
    hood.scale = (1.0, 1.15, 1.0)
    face_eyes(root, (0.26, 0, 1.82), eye_color="peye")
    cylinder("arm_l", (-0.36, 0.05, 1.3), 0.09, 0.5, "q1", root, verts=6, rot=(0, math.radians(18), 0))
    arm_r = cylinder("arm_r", (0.36, 0.05, 1.3), 0.09, 0.5, "q1", root, verts=6, rot=(0, math.radians(-12), 0))
    sphere("hand_l", (-0.52, 0.15, 1.15), 0.12, "skin", root)
    hand_r = sphere("hand_r", (0.52, 0.1, 1.2), 0.12, "skin", root)
    bow_pivot = empty("bow_pivot", (0.58, 0.22, 1.25))
    bow_pivot.parent = root
    cylinder("bow_u", (0, 0, 0.55), 0.055, 1.15, "wood2", bow_pivot, verts=6, rot=(0, math.radians(14), 0))
    cylinder("bow_d", (0, 0, -0.55), 0.055, 1.15, "wood2", bow_pivot, verts=6, rot=(0, math.radians(-14), 0))
    string = cylinder("string", (-0.28, 0, 0), 0.015, 2.1, "cream", bow_pivot, verts=4)
    arrow_hold = empty("arrow_hold", (-0.1, 0, 0))
    arrow_hold.parent = bow_pivot
    contact_shadow(root, loc=(0, 0.06, 0.012), scale=(0.72, 0.45, 1), alpha=0.5)
    root.rotation_euler = Euler((0, 0, math.radians(-90)))
    return root, {
        "bow_pivot": bow_pivot, "arm_r": arm_r, "hand_r": hand_r,
        "string": string, "arrow_hold": arrow_hold, "torso": torso, "hood": hood,
    }


def build_turret():
    """Cylindrical stone turret with crenellations + vibrant ivy."""
    root = _root("quill_turret")
    base = cylinder("base", (0, 0, 0.22), 0.9, 0.44, "t0", root, verts=12)
    mid = cylinder("mid", (0, 0, 0.7), 0.78, 0.55, "t2", root, verts=12)
    # brick-ish bands
    cylinder("band", (0, 0, 0.7), 0.8, 0.08, "t1", root, verts=12)
    top = cylinder("top", (0, 0, 1.12), 0.85, 0.2, "t3", root, verts=12)
    # crenellations
    for i, ang in enumerate(range(0, 360, 45)):
        rad = 0.72
        x, y = math.cos(math.radians(ang)) * rad, math.sin(math.radians(ang)) * rad
        cube(f"cren_{i}", (x, y, 1.32), (0.18, 0.18, 0.22), "t4", root)
    # vibrant ivy patches climbing
    for i, (x, y, z, sx, sy, sz) in enumerate([
        (-0.55, -0.5, 0.55, 0.3, 0.15, 0.55),
        (0.5, -0.45, 0.75, 0.28, 0.14, 0.5),
        (-0.2, 0.6, 0.45, 0.35, 0.14, 0.6),
        (0.35, 0.55, 0.9, 0.22, 0.12, 0.4),
        (-0.65, 0.1, 0.85, 0.15, 0.25, 0.45),
    ]):
        cube(f"ivy_{i}", (x, y, z), (sx, sy, sz), "ivy" if i % 2 == 0 else "q2", root)
    sphere("leaf_1", (-0.5, -0.55, 0.9), 0.1, "q3", root, segments=6, rings=4)
    sphere("leaf_2", (0.45, 0.55, 1.05), 0.09, "q3", root, segments=6, rings=4)
    contact_shadow(root, loc=(0, 0.05, 0.01), scale=(1.15, 0.95, 1), alpha=0.55)
    root.rotation_euler = Euler((0, 0, math.radians(-90)))
    return root, {"top": top}


def build_hand_unit(name, parent, loc, scale=1.0):
    """STONE golem fist — clear fingers + knuckles, low-poly facets."""
    pivot = empty(name, loc)
    pivot.parent = parent
    # slightly rotate fist to read as hand from camera
    pivot.rotation_euler = Euler((math.radians(-15), math.radians(10), math.radians(25)))
    # forearm stump
    cylinder("stump", (0, -0.22 * scale, 0.15 * scale), 0.16 * scale, 0.28 * scale, "h1", pivot, verts=6, rot=(math.radians(80), 0, 0))
    # palm
    cube("palm", (0, 0.05 * scale, 0.2 * scale), (0.48 * scale, 0.32 * scale, 0.26 * scale), "h3", pivot)
    # four fingers curling forward (knuckle segments)
    for i, ox in enumerate((-0.18, -0.06, 0.06, 0.18)):
        # proximal
        cube(f"f{i}a", (ox * scale, 0.28 * scale, 0.32 * scale), (0.11 * scale, 0.16 * scale, 0.14 * scale), "h2", pivot)
        # mid
        cube(f"f{i}b", (ox * scale, 0.42 * scale, 0.38 * scale), (0.1 * scale, 0.14 * scale, 0.13 * scale), "h3", pivot)
        # distal tip
        cube(f"f{i}c", (ox * scale, 0.54 * scale, 0.34 * scale), (0.09 * scale, 0.12 * scale, 0.11 * scale), "h4", pivot)
    # thumb
    cube("th1", (-0.28 * scale, 0.05 * scale, 0.28 * scale), (0.12 * scale, 0.18 * scale, 0.11 * scale), "h2", pivot)
    cube("th2", (-0.34 * scale, 0.18 * scale, 0.34 * scale), (0.1 * scale, 0.14 * scale, 0.1 * scale), "h3", pivot)
    return pivot


def build_crawling_hands():
    root = _root("crawling_hands")
    hands = []
    layout = [
        (-0.7, 0.1, 0.0, 1.15),
        (0.0, -0.35, 0.04, 1.3),
        (0.75, 0.15, 0.0, 1.1),
        (0.15, 0.55, 0.08, 1.0),
    ]
    for i, (x, y, z, s) in enumerate(layout):
        hands.append(build_hand_unit(f"hand_{i}", root, (x, y, z), scale=s))
    contact_shadow(root, loc=(0.1, 0.15, 0.01), scale=(1.4, 1.0, 1), alpha=0.55)
    root.rotation_euler = Euler((0, 0, math.radians(-55)))
    return root, {"hands": hands}


def build_bolt():
    root = _root("bolt")
    cube("core", (0.3, 0, 0), (0.75, 0.14, 0.14), "bolt", root, emission=4.0)
    cube("mid", (0.05, 0, 0), (0.55, 0.2, 0.2), "p3", root, emission=1.2)
    tip = cone("tip", (0.9, 0, 0), 0.14, 0.38, "gold2", root, verts=6)
    tip.rotation_euler = Euler((0, math.radians(90), 0))
    sphere("glow", (0.35, 0, 0), 0.18, "white", root, segments=6, rings=4, emission=5.0)
    return root, {}


def build_arrow():
    root = _root("arrow")
    cylinder("shaft", (0.15, 0, 0), 0.04, 1.35, "wood", root, verts=6, rot=(0, math.radians(90), 0))
    tip = cone("head", (0.95, 0, 0), 0.09, 0.28, "porb", root, verts=6, emission=3.0)
    tip.rotation_euler = Euler((0, math.radians(90), 0))
    cube("f1", (-0.48, 0, 0.09), (0.28, 0.04, 0.14), "p3", root)
    cube("f2", (-0.48, 0, -0.09), (0.28, 0.04, 0.14), "q2", root)
    cube("nock", (-0.58, 0, 0), (0.08, 0.06, 0.06), "wood2", root)
    return root, {}
