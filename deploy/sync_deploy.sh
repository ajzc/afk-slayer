#!/bin/bash
# Sync the game (../game) into deploy/public and deploy the Worker with wrangler.
#
# Repo version: paths are relative to this script, and the Cloudflare token must
# come from the environment. NEVER commit a token.
#
#   export CLOUDFLARE_API_TOKEN=...   # Workers + D1 + KV edit permissions
#   ./deploy/sync_deploy.sh
#
# (The original box copy hard-coded /workspace/contract-board,
#  /workspace/afk-slayer-cf, /workspace/.tools/node-v22... on PATH, and read the
#  token from a box-local secrets file. None of that is required here.)
set -euo pipefail
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GAME_DIR="${GAME_DIR:-$DEPLOY_DIR/../game}"
# Optional: point NODE_BIN at a specific node install (e.g. /workspace/.tools/node-v22.20.0-linux-x64/bin)
if [ -n "${NODE_BIN:-}" ]; then export PATH="$NODE_BIN:$PATH"; fi

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "CLOUDFLARE_API_TOKEN is not set. Export it in your shell (never commit it)." >&2
  exit 1
fi

GAME_DIR="$GAME_DIR" DEPLOY_DIR="$DEPLOY_DIR" python3 - << 'PY'
import os, shutil, json, re
from pathlib import Path
src = Path(os.environ['GAME_DIR']).resolve(); dst = Path(os.environ['DEPLOY_DIR']) / 'public'
dst.mkdir(exist_ok=True)
for name in ['index.html', 'css', 'js', 'art', 'audio', 'privacy.html', 'terms.html']:
    s = src / name; d = dst / name
    if not s.exists(): continue
    if s.is_file():
        shutil.copy2(s, d)
    else:
        if d.exists(): shutil.rmtree(d)
        shutil.copytree(s, d, ignore=lambda dp, names: [n for n in names if n == 'obelisk_gameplay.mp4' or n.endswith('.py') or n.startswith('_qa') or n in ('_frames', 'sprites_pre_clean', '_work', '__pycache__')])
# iom7: gear art manifest (armour strips swap in automatically once present)
for base in (src, dst):
    sp = base / 'art/v3b/anim/sprites'
    if sp.exists():
        files = sorted(p.name for p in sp.glob('player_gear_*.png'))
        (sp / 'gear_manifest.json').write_text(json.dumps({'files': files}, indent=0))
print('BUILD', re.search(r"BUILD_ID:\s*'([^']+)'", (dst/'js/data.js').read_text()).group(1))
PY

cd "$DEPLOY_DIR"
[ -d node_modules ] || npm ci
npx wrangler deploy 2>&1 | sed -E 's/[A-Za-z0-9_-]{40,}/[REDACTED]/g' | grep -v "^+ " | tail -12
