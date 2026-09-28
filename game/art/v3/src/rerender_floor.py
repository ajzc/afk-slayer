import sys
from pathlib import Path
SRC = Path(__file__).resolve().parent
sys.path.insert(0, str(SRC))
from render_all import job_arena_floor
job_arena_floor()
print('floor done')
