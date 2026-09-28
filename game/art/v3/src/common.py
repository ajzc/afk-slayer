"""Shared palette + mesh helpers — locked to Option C board colors/lighting."""
import math
import bpy
from mathutils import Vector, Euler

def hex_rgb(h):
    h = h.lstrip("#")
    r, g, b = int(h[0:2], 16) / 255.0, int(h[2:4], 16) / 255.0, int(h[4:6], 16) / 255.0
    def lin(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin(r), lin(g), lin(b), 1.0)

# Sampled / matched to option_c_locked.png
PAL = {
    "outline": hex_rgb("#0e1018"),
    "arena0": hex_rgb("#1c2028"),   # dark cracked floor
    "arena1": hex_rgb("#2a3038"),
    "slate": hex_rgb("#3a424c"),
    "slate2": hex_rgb("#4a5460"),
    "slate_lit": hex_rgb("#5a6470"),  # soft warm pool — NOT gold
    "gold": hex_rgb("#c9a227"),
    "gold2": hex_rgb("#e8c547"),
    "cream": hex_rgb("#ffffa0"),
    "skin": hex_rgb("#e8c090"),
    "skin_s": hex_rgb("#c49c74"),
    # Player — deep vibrant purple + gold
    "p0": hex_rgb("#1a0a38"),
    "p1": hex_rgb("#2a1460"),
    "p2": hex_rgb("#4a2088"),
    "p3": hex_rgb("#6a38b0"),
    "porb": hex_rgb("#c080ff"),
    "peye": hex_rgb("#ffc040"),   # glowing yellow-orange eyes (locked board)
    "bolt": hex_rgb("#ffff88"),
    # Briar — readable mid-grey plate
    "b0": hex_rgb("#2a3038"),
    "b1": hex_rgb("#4a5460"),
    "b2": hex_rgb("#7a8490"),
    "b3": hex_rgb("#b0b8c4"),
    "steel": hex_rgb("#c8d0dc"),
    "strap": hex_rgb("#5a3a28"),
    "plume": hex_rgb("#c02828"),
    # Quill
    "q0": hex_rgb("#0e2414"),
    "q1": hex_rgb("#1a4820"),
    "q2": hex_rgb("#2a8a28"),
    "q3": hex_rgb("#3aaa38"),
    "wood": hex_rgb("#6a4a28"),
    "wood2": hex_rgb("#a87848"),
    "fletch": hex_rgb("#d8b060"),
    "ivy": hex_rgb("#1a6828"),
    # Turret
    "t0": hex_rgb("#1a1e24"),
    "t1": hex_rgb("#2a3038"),
    "t2": hex_rgb("#3a4450"),
    "t3": hex_rgb("#5a6470"),
    "t4": hex_rgb("#7a8490"),
    # Stone golem hands (NOT flesh)
    "h0": hex_rgb("#3a3e44"),
    "h1": hex_rgb("#5a6068"),
    "h2": hex_rgb("#7a8088"),
    "h3": hex_rgb("#9aa0a8"),
    "h4": hex_rgb("#b8bec4"),
    "wound": hex_rgb("#602018"),
    "white": hex_rgb("#ffffff"),
}

_MAT_CACHE = {}

def clear_scene():
    global _MAT_CACHE
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
        for b in list(block):
            block.remove(b)
    _MAT_CACHE = {}

def mat(name, color_key, emission=0.0, roughness=0.72):
    key = (name, color_key, emission, roughness)
    if key in _MAT_CACHE:
        try:
            _ = _MAT_CACHE[key].name
            return _MAT_CACHE[key]
        except ReferenceError:
            _MAT_CACHE.pop(key, None)
    if name in bpy.data.materials:
        m = bpy.data.materials[name]
    else:
        m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    col = PAL[color_key]
    bsdf.inputs["Base Color"].default_value = col
    bsdf.inputs["Roughness"].default_value = roughness
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.15 if color_key in ("steel", "b3", "gold", "gold2") else 0.0
    if emission > 0:
        bsdf.inputs["Emission Color"].default_value = col
        bsdf.inputs["Emission Strength"].default_value = emission
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    _MAT_CACHE[key] = m
    return m

def assign(obj, color_key, emission=0.0, roughness=0.72):
    m = mat(f"M_{obj.name}_{color_key}", color_key, emission=emission, roughness=roughness)
    if obj.data.materials:
        obj.data.materials[0] = m
    else:
        obj.data.materials.append(m)
    for p in obj.data.polygons:
        p.use_smooth = False
    return obj

def cube(name, loc, scale, color_key, parent=None, emission=0.0, roughness=0.72):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(ob, color_key, emission, roughness)
    if parent:
        ob.parent = parent
    return ob

def cylinder(name, loc, radius, depth, color_key, parent=None, verts=8, rot=(0, 0, 0), emission=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    ob.rotation_euler = Euler(rot)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    assign(ob, color_key, emission)
    if parent:
        ob.parent = parent
    return ob

def sphere(name, loc, radius, color_key, parent=None, segments=8, rings=6, emission=0.0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=radius, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    assign(ob, color_key, emission)
    if parent:
        ob.parent = parent
    return ob

def cone(name, loc, radius, depth, color_key, parent=None, verts=8, emission=0.0):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=radius, depth=depth, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    assign(ob, color_key, emission)
    if parent:
        ob.parent = parent
    return ob

def torus(name, loc, major, minor, color_key, parent=None, major_seg=32, minor_seg=8):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major, minor_radius=minor, major_segments=major_seg,
        minor_segments=minor_seg, location=loc)
    ob = bpy.context.active_object
    ob.name = name
    assign(ob, color_key)
    if parent:
        ob.parent = parent
    return ob

def empty(name, loc=(0, 0, 0)):
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=loc)
    ob = bpy.context.active_object
    ob.name = name
    return ob

def count_tris(root):
    try:
        objs = [root] + list(root.children_recursive)
    except Exception:
        def kids(o):
            out = []
            for c in o.children:
                out.append(c)
                out.extend(kids(c))
            return out
        objs = [root] + kids(root)
    total = 0
    for o in objs:
        if o.type == "MESH" and o.data:
            o.data.calc_loop_triangles()
            total += len(o.data.loop_triangles)
    return total

def setup_world():
    world = bpy.data.worlds.new("World") if "World" not in bpy.data.worlds else bpy.data.worlds["World"]
    bpy.context.scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Color"].default_value = PAL["arena0"]
    bg.inputs["Strength"].default_value = 0.22
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])

def setup_lights():
    # Soft warm KEY spotlight from upper-left-front — characters pop
    bpy.ops.object.light_add(type="AREA", location=(-2.2, -2.0, 4.5))
    key = bpy.context.active_object
    key.name = "KeyLight"
    key.data.energy = 520
    key.data.size = 4.0
    key.data.color = (1.0, 0.95, 0.85)  # warm
    key.rotation_euler = Euler((math.radians(-48), math.radians(10), math.radians(-25)))

    # Center warm pool light (soft spotlight feel without gold disc)
    bpy.ops.object.light_add(type="AREA", location=(0.2, 0.0, 5.0))
    pool = bpy.context.active_object
    pool.name = "PoolLight"
    pool.data.energy = 200
    pool.data.size = 5.5
    pool.data.color = (1.0, 0.92, 0.78)
    pool.rotation_euler = Euler((math.radians(-5), 0, 0))

    # Cool rim behind-right
    bpy.ops.object.light_add(type="AREA", location=(2.6, 2.8, 2.8))
    rim = bpy.context.active_object
    rim.name = "RimLight"
    rim.data.energy = 160
    rim.data.size = 2.8
    rim.data.color = (0.55, 0.7, 1.0)
    rim.rotation_euler = Euler((math.radians(55), math.radians(-10), math.radians(140)))

    # Soft fill so faces don't crush to black
    bpy.ops.object.light_add(type="AREA", location=(0.8, -3.2, 2.0))
    fill = bpy.context.active_object
    fill.name = "FillLight"
    fill.data.energy = 110
    fill.data.size = 5.0
    fill.data.color = (0.75, 0.8, 0.95)

def setup_camera(ortho_scale=3.2, elev_deg=33, yaw_deg=32, target=(0, 0, 1.0)):
    elev = math.radians(elev_deg)
    yaw = math.radians(yaw_deg)
    dist = 8.0
    cx = target[0] - dist * math.cos(elev) * math.sin(yaw)
    cy = target[1] - dist * math.cos(elev) * math.cos(yaw)
    cz = target[2] + dist * math.sin(elev)
    bpy.ops.object.camera_add(location=(cx, cy, cz))
    cam = bpy.context.active_object
    cam.name = "HuntCam"
    direction = Vector(target) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = ortho_scale
    bpy.context.scene.camera = cam
    return cam

def setup_render(path, w=160, h=192, engine="BLENDER_EEVEE_NEXT"):
    sc = bpy.context.scene
    sc.render.engine = engine
    sc.render.resolution_x = w
    sc.render.resolution_y = h
    sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.filepath = path
    if hasattr(sc, "eevee"):
        ee = sc.eevee
        if hasattr(ee, "taa_render_samples"):
            ee.taa_render_samples = 28
        if hasattr(ee, "use_bloom"):
            ee.use_bloom = True
            ee.bloom_intensity = 0.08
    return sc

def contact_shadow(parent=None, loc=(0, 0, 0.01), scale=(0.9, 0.55, 1.0), alpha=0.5):
    bpy.ops.mesh.primitive_circle_add(vertices=28, radius=1.0, fill_type="NGON", location=loc)
    ob = bpy.context.active_object
    ob.name = "ContactShadow"
    ob.scale = (scale[0], scale[1], 1.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    m = bpy.data.materials.new("M_Shadow")
    m.use_nodes = True
    m.blend_method = "BLEND"
    if hasattr(m, "shadow_method"):
        m.shadow_method = "NONE"
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (0.02, 0.025, 0.04, 1)
    bsdf.inputs["Roughness"].default_value = 1.0
    if "Alpha" in bsdf.inputs:
        bsdf.inputs["Alpha"].default_value = alpha
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    ob.data.materials.append(m)
    if parent:
        ob.parent = parent
    return ob
