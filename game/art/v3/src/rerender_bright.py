import sys
from pathlib import Path
SRC = Path(__file__).resolve().parent
sys.path.insert(0, str(SRC))
from render_all import (
    job_player, job_briar, job_quill, job_turret, job_hands, job_projectiles, job_arena_floor, POLY_REPORT, V2
)
import json
print("=== v3 bright re-render ===")
job_player()
job_briar()
job_quill()
job_turret()
job_hands()
job_projectiles()
job_arena_floor()
(V2 / "poly_report.json").write_text(json.dumps(POLY_REPORT, indent=2))
print("POLY", POLY_REPORT)
print("done")
