"""Original low-poly character builders (primitives only)."""
import math
import bpy
from mathutils import Euler
from common import (
    cube, cylinder, sphere, cone, empty, assign, contact_shadow, count_tris, mat
)


def _root(name):
    return empty(name, (0, 0, 0))


def build_player():
    root = _root("player")
    # pelvis / robe body — chunky cone-ish robe
    robe = cone("robe", (0, 0, 0.95), 0.55, 1.7, "p1", root, verts=8)
    robe.scale = (1.0, 0.85, 1.0)
    bpy.context.view_layer.objects.active = robe
    # torso block
    torso = cube("torso", (0, 0, 1.55), (0.55, 0.4, 0.55), "p2", root)
    # hood
    hood = sphere("hood", (0.05, 0, 2.15), 0.42, "p0", root, segments=10, rings=7)
    hood.scale = (1.05, 1.1, 0.95)
    # face opening
    face = cube("face", (0.28, 0, 2.05), (0.12, 0.22, 0.2), "skin", root)
    # big hands
    hand_l = sphere("hand_l", (-0.55, 0.15, 1.35), 0.18, "skin", root, segments=8, rings=6)
    hand_r = sphere("hand_r", (0.55, 0.1, 1.4), 0.18, "skin", root, segments=8, rings=6)
    # arms
    arm_l = cylinder("arm_l", (-0.4, 0.05, 1.55), 0.1, 0.55, "p2", root, verts=6, rot=(0, math.radians(25), 0))
    arm_r = cylinder("arm_r", (0.4, 0.05, 1.55), 0.1, 0.55, "p2", root, verts=6, rot=(0, math.radians(-20), 0))
    # staff parented to right hand pivot
    staff_pivot = empty("staff_pivot", (0.55, 0.1, 1.4))
    staff_pivot.parent = root
    staff = cylinder("staff", (0, 0, 0.3), 0.06, 2.4, "wood", staff_pivot, verts=6)
    tip = sphere("staff_tip", (0, 0, 1.55), 0.12, "gold2", staff_pivot, segments=8, rings=6, emission=0.3)
    tip2 = sphere("staff_glow", (0, 0, 1.55), 0.06, "bolt", staff_pivot, segments=6, rings=4, emission=2.0)
    # gold trim belt
    belt = cylinder("belt", (0, 0, 1.25), 0.5, 0.08, "gold", root, verts=8)
    # big feet
    foot_l = cube("foot_l", (-0.22, 0.15, 0.12), (0.28, 0.45, 0.16), "b0", root)
    foot_r = cube("foot_r", (0.22, 0.15, 0.12), (0.28, 0.45, 0.16), "b0", root)
    contact_shadow(root, loc=(0, 0.05, 0.02), scale=(0.9, 0.55, 1))
    # face +X
    root.rotation_euler = Euler((0, 0, math.radians(-90)))
    return root, {
        "staff_pivot": staff_pivot,
        "hand_r": hand_r,
        "torso": torso,
        "hood": hood,
        "tip2": tip2,
    }


def build_briar():
    root = _root("briar")
    # stocky legs
    leg_l = cube("leg_l", (-0.22, 0, 0.45), (0.28, 0.32, 0.7), "b1", root)
    leg_r = cube("leg_r", (0.22, 0, 0.45), (0.28, 0.32, 0.7), "b1", root)
    boot_l = cube("boot_l", (-0.22, 0.12, 0.12), (0.32, 0.5, 0.2), "b0", root)
    boot_r = cube("boot_r", (0.22, 0.12, 0.12), (0.32, 0.5, 0.2), "b0", root)
    # torso armor
    torso = cube("torso", (0, 0, 1.25), (0.7, 0.45, 0.75), "b2", root)
    chest = cube("chest", (0.05, -0.05, 1.35), (0.55, 0.2, 0.5), "b3", root)
    # big pauldrons
    paul_l = sphere("paul_l", (-0.55, 0, 1.55), 0.28, "b3", root, segments=8, rings=6)
    paul_r = sphere("paul_r", (0.55, 0, 1.55), 0.28, "b3", root, segments=8, rings=6)
    # helmet
    helm = cube("helm", (0.05, 0, 1.95), (0.45, 0.45, 0.4), "b2", root)
    crest = cube("crest", (0, 0, 2.2), (0.08, 0.12, 0.2), "gold2", root)
    visor = cube("visor", (0.28, 0, 1.95), (0.08, 0.35, 0.12), "b0", root)
    face = cube("face", (0.22, 0, 1.92), (0.06, 0.2, 0.1), "skin", root)
    # belt
    belt = cube("belt", (0, 0, 0.9), (0.72, 0.4, 0.12), "strap", root)
    buckle = cube("buckle", (0.35, -0.2, 0.9), (0.1, 0.08, 0.1), "gold2", root)
    # shield on left
    shield = cylinder("shield", (-0.75, 0.05, 1.2), 0.4, 0.1, "b1", root, verts=8, rot=(0, math.radians(90), math.radians(15)))
    boss = sphere("boss", (-0.8, 0.05, 1.2), 0.1, "gold", root, segments=6, rings=4)
    # sword pivot (right)
    sword_pivot = empty("sword_pivot", (0.7, 0.1, 1.35))
    sword_pivot.parent = root
    blade = cube("blade", (0, 0, 0.55), (0.08, 0.12, 1.1), "b3", sword_pivot)
    edge = cube("edge", (0.05, 0, 0.55), (0.03, 0.04, 1.0), "cream", sword_pivot)
    guard = cube("guard", (0, 0, 0.05), (0.35, 0.12, 0.08), "strap", sword_pivot)
    grip = cylinder("grip", (0, 0, -0.15), 0.06, 0.3, "strap", sword_pivot, verts=6)
    hand = sphere("hand_r", (0, 0, 0.0), 0.16, "skin", sword_pivot, segments=8, rings=6)
    contact_shadow(root, loc=(0, 0.05, 0.02), scale=(1.0, 0.6, 1))
    root.rotation_euler = Euler((0, 0, math.radians(-90)))
    return root, {
        "sword_pivot": sword_pivot,
        "torso": torso,
        "paul_l": paul_l,
        "paul_r": paul_r,
        "leg_l": leg_l,
        "leg_r": leg_r,
    }


def build_quill():
    root = _root("quill")
    # slim legs
    leg_l = cube("leg_l", (-0.14, 0, 0.45), (0.18, 0.22, 0.7), "q0", root)
    leg_r = cube("leg_r", (0.14, 0, 0.45), (0.18, 0.22, 0.7), "q0", root)
    boot_l = cube("boot_l", (-0.14, 0.1, 0.1), (0.22, 0.38, 0.14), "wood", root)
    boot_r = cube("boot_r", (0.14, 0.1, 0.1), (0.22, 0.38, 0.14), "wood", root)
    # tunic
    torso = cube("torso", (0, 0, 1.2), (0.4, 0.32, 0.7), "q1", root)
    # hood cloak
    hood = sphere("hood", (0.05, 0, 1.85), 0.35, "q0", root, segments=10, rings=7)
    hood.scale = (1.0, 1.15, 1.0)
    face = cube("face", (0.25, 0, 1.8), (0.1, 0.18, 0.16), "skin", root)
    # arms
    arm_l = cylinder("arm_l", (-0.35, 0.05, 1.3), 0.08, 0.5, "q1", root, verts=6, rot=(0, math.radians(20), 0))
    arm_r = cylinder("arm_r", (0.35, 0.05, 1.3), 0.08, 0.5, "q1", root, verts=6, rot=(0, math.radians(-15), 0))
    hand_l = sphere("hand_l", (-0.5, 0.15, 1.15), 0.12, "skin", root)
    hand_r = sphere("hand_r", (0.5, 0.1, 1.2), 0.12, "skin", root)
    belt = cube("belt", (0, 0, 0.9), (0.42, 0.3, 0.08), "wood", root)
    buckle = cube("buckle", (0.2, -0.15, 0.9), (0.08, 0.06, 0.08), "gold", root)
    # bow pivot
    bow_pivot = empty("bow_pivot", (0.55, 0.2, 1.25))
    bow_pivot.parent = root
    # longbow as thin scaled torus section approximation — use bent cubes
    bow_u = cylinder("bow_u", (0, 0, 0.55), 0.05, 1.1, "wood2", bow_pivot, verts=6, rot=(0, math.radians(12), 0))
    bow_d = cylinder("bow_d", (0, 0, -0.55), 0.05, 1.1, "wood2", bow_pivot, verts=6, rot=(0, math.radians(-12), 0))
    # string (thin)
    string = cylinder("string", (-0.25, 0, 0), 0.015, 2.0, "cream", bow_pivot, verts=4)
    # arrow rest empty for anim
    arrow_hold = empty("arrow_hold", (-0.1, 0, 0))
    arrow_hold.parent = bow_pivot
    contact_shadow(root, loc=(0, 0.05, 0.02), scale=(0.7, 0.45, 1))
    root.rotation_euler = Euler((0, 0, math.radians(-90)))
    return root, {
        "bow_pivot": bow_pivot,
        "arm_r": arm_r,
        "hand_r": hand_r,
        "string": string,
        "arrow_hold": arrow_hold,
        "torso": torso,
        "hood": hood,
    }


def build_turret():
    root = _root("quill_turret")
    # stacked stone blocks
    base = cube("base", (0, 0, 0.15), (1.4, 1.1, 0.3), "t0", root)
    mid = cube("mid", (0, 0, 0.55), (1.15, 0.95, 0.5), "t2", root)
    top = cube("top", (0, 0, 1.0), (1.25, 1.05, 0.25), "t3", root)
    lip = cube("lip", (0, 0, 1.18), (1.3, 1.1, 0.08), "t4", root)
    # rivets / gold studs
    for i, x in enumerate((-0.4, 0, 0.4)):
        sphere(f"rivet_{i}", (x, -0.5, 0.55), 0.06, "gold" if i == 1 else "t4", root, segments=6, rings=4)
    # brick grooves as darker inset strips
    groove = cube("groove", (0, 0.48, 0.55), (1.0, 0.04, 0.02), "t1", root)
    contact_shadow(root, loc=(0, 0.05, 0.01), scale=(1.2, 0.85, 1), alpha=0.5)
    root.rotation_euler = Euler((0, 0, math.radians(-90)))
    return root, {"top": top, "lip": lip}


def build_hand_unit(name, parent, loc, scale=1.0):
    """One oversized grasping hand built from primitives."""
    pivot = empty(name, loc)
    pivot.parent = parent
    palm = cube("palm", (0, 0, 0.15 * scale), (0.45 * scale, 0.28 * scale, 0.2 * scale), "h3", pivot)
    # wrist stump with wound
    stump = cylinder("stump", (0, -0.2 * scale, 0.1 * scale), 0.16 * scale, 0.2 * scale, "h1", pivot, verts=6, rot=(math.radians(90), 0, 0))
    wound = cylinder("wound", (0, -0.28 * scale, 0.1 * scale), 0.12 * scale, 0.06 * scale, "wound", pivot, verts=6, rot=(math.radians(90), 0, 0))
    # fingers — big
    for i, ox in enumerate((-0.18, -0.06, 0.06, 0.18)):
        finger = cube(f"f{i}", (ox * scale, 0.25 * scale, 0.25 * scale), (0.1 * scale, 0.35 * scale, 0.1 * scale), "h4" if i % 2 == 0 else "h3", pivot)
        tip = sphere(f"t{i}", (ox * scale, 0.45 * scale, 0.28 * scale), 0.07 * scale, "h2", pivot, segments=6, rings=4)
    # thumb
    thumb = cube("thumb", (0.28 * scale, 0.05 * scale, 0.2 * scale), (0.12 * scale, 0.22 * scale, 0.1 * scale), "h3", pivot)
    return pivot


def build_crawling_hands():
    root = _root("crawling_hands")
    hands = []
    layout = [
        (-0.55, 0.2, 0.0, 1.0),
        (0.15, -0.15, 0.05, 1.15),
        (0.65, 0.25, 0.0, 0.95),
        (-0.15, 0.55, 0.08, 0.85),
        (0.4, 0.6, 0.02, 0.9),
    ]
    for i, (x, y, z, s) in enumerate(layout):
        h = build_hand_unit(f"hand_{i}", root, (x, y, z), scale=s)
        hands.append(h)
    contact_shadow(root, loc=(0.1, 0.2, 0.01), scale=(1.3, 0.9, 1), alpha=0.5)
    root.rotation_euler = Euler((0, 0, math.radians(-60)))
    return root, {"hands": hands}


def build_bolt():
    root = _root("bolt")
    # arcane shard
    core = cube("core", (0.3, 0, 0), (0.7, 0.12, 0.12), "bolt", root, emission=3.0)
    mid = cube("mid", (0.1, 0, 0), (0.5, 0.18, 0.18), "p3", root, emission=0.8)
    tip = cone("tip", (0.85, 0, 0), 0.12, 0.35, "gold2", root, verts=6)
    tip.rotation_euler = Euler((0, math.radians(90), 0))
    glow = sphere("glow", (0.3, 0, 0), 0.15, "white", root, segments=6, rings=4, emission=4.0)
    root.rotation_euler = Euler((0, 0, 0))
    return root, {}


def build_arrow():
    root = _root("arrow")
    shaft = cylinder("shaft", (0.2, 0, 0), 0.04, 1.4, "wood", root, verts=6, rot=(0, math.radians(90), 0))
    head = cone("head", (0.95, 0, 0), 0.08, 0.25, "t4", root, verts=6)
    head.rotation_euler = Euler((0, math.radians(90), 0))
    # fletch
    f1 = cube("f1", (-0.45, 0, 0.08), (0.25, 0.04, 0.12), "q2", root)
    f2 = cube("f2", (-0.45, 0, -0.08), (0.25, 0.04, 0.12), "q2", root)
    nock = cube("nock", (-0.55, 0, 0), (0.08, 0.06, 0.06), "wood2", root)
    return root, {}
