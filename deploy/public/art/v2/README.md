# Hunt art v2 — low-poly 3D pack

## Regenerate

```bash
# full pack (Blender headless)
blender -b -P art/v2/src/render_all.py

# optional targeted fixes
blender -b -P art/v2/src/rerender_fixes.py

# compose strips + previews (Pillow venv)
/workspace/.venv-art/bin/python art/v2/src/compose.py
```

Sources: `src/common.py`, `src/models.py`, `src/render_all.py`, `src/rerender_fixes.py`, `src/compose.py`.
