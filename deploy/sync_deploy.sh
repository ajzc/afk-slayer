#!/bin/bash
set -e
export PATH=/workspace/.tools/node-v22.20.0-linux-x64/bin:$PATH
python3 - << 'PY'
import shutil
from pathlib import Path
src = Path('/workspace/contract-board'); dst = Path('/workspace/afk-slayer-cf/public')
for name in ['index.html', 'favicon.ico', 'css', 'js', 'art', 'audio', 'privacy.html', 'terms.html']:
    s = src / name; d = dst / name
    if not s.exists(): continue
    if s.is_file():
        shutil.copy2(s, d)
    else:
        if d.exists(): shutil.rmtree(d)
        shutil.copytree(s, d, ignore=lambda dp, names: [n for n in names if n == 'obelisk_gameplay.mp4' or n.endswith('.py') or n.startswith('_qa') or n in ('_frames', 'sprites_pre_clean')])
# iom7: gear art manifest (armour strips swap in automatically once present)
import json
for base in (src, dst):
    sp = base / 'art/v3b/anim/sprites'
    if sp.exists():
        files = sorted(p.name for p in sp.glob('player_gear_*.png'))
        (sp / 'gear_manifest.json').write_text(json.dumps({'files': files}, indent=0))
import re
print('BUILD', re.search(r"BUILD_ID:\s*'([^']+)'", (dst/'js/data.js').read_text()).group(1))
PY
export CLOUDFLARE_API_TOKEN="$(python3 -c "import json; print(json.load(open('/home/box/agent-data/box-secrets.json'))['card']['CLOUDFLARE_API_TOKEN'])")"
cd /workspace/afk-slayer-cf
npx wrangler deploy 2>&1 | sed -E 's/[A-Za-z0-9_-]{40,}/[REDACTED]/g' | grep -v "^+ " | tail -12
