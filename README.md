# AFK Slayer

AFK Slayer is an original idle / AFK fantasy monster-hunting game for phone and desktop browsers
(internal working name: **contract-board**). You pick Slayer tasks, fight with directional bolts
(hold to aim and fire), hire AFK hunters, earn gold, scraps and Slayer points, fill a boss meter,
beat the Level boss, and unlock the next Level. There's also prestige (Charter Rewrite → Sigils).
It's plain HTML/CSS/JS with no build step. Progress saves in `localStorage` (`contractBoard_v1`).
You can also sign in with Google to get a cloud save, which the Cloudflare Worker in `deploy/` provides.

Live build: https://afk-slayer.ajchapman20.workers.dev

> Not affiliated with Jagex / RuneScape or Idle Obelisk Miner. All art, audio and names are original.

## Folder map

```
game/                      The game source (the source of truth)
  index.html, privacy.html, terms.html
  css/styles.css
  js/                      data.js (areas, tasks, upgrades, BUILD_ID), state.js (save/idle math),
                           arena.js (live hunt combat), ui.js, game.js (tick loop), audio.js,
                           sprites.js, gearvis.js, chests.js, maps.js, intro.js, auth.js (Google sign-in client)
  art/                     Sprites and art generation scripts (ART_BIBLE.md, INTEGRATION.md, v2/ v3/ v3b/ …)
  audio/                   SFX, loops, synth scripts, AUDIO_BIBLE.md, CUE_SHEET.md
  design/                  Design briefs (.md), tuning spreadsheets (.xlsx) + the python that builds them, sim/
  playtest/                Playtest notes and snapshots
  shots/                   Playwright QA scripts (*.mjs). The screenshots are not committed.
  DESIGN.md                Design summary (start here)
  README.md                Original play/debug notes (localStorage tricks, simulateAway, etc.)
deploy/                    Cloudflare Worker deployment
  wrangler.jsonc           Worker config: name, assets dir, D1 + KV bindings, public GOOGLE_CLIENT_ID
  src/worker.js            API: /api/auth/google (Google ID-token verify), /api/save (cloud save), sessions
  public/                  Static assets the Worker serves. A synced COPY of game/ (made by sync_deploy.sh)
  sync_deploy.sh           Copies game/ → deploy/public, then runs `wrangler deploy`
  package.json / package-lock.json   Pins wrangler (run `npm ci`)
  GOOGLE_CLIENT_ID_FLIP.md How Google sign-in gets enabled
```

## Run locally

```bash
cd game
python3 -m http.server 8765
# open http://localhost:8765
```

To play on a phone on the same Wi-Fi, go to `http://<your-LAN-IP>:8765`. Locally the game runs as a
guest with a localStorage save. The `/api/*` sign-in and cloud save only work when the Worker serves the game.

## How the deploy works

The game is hosted as a **Cloudflare Worker with static assets**:

- `wrangler.jsonc` points `assets.directory` at `./public` and runs the Worker first only for `/api/*`.
- The bindings are D1 database `afk-slayer-db` (`DB`: accounts and sessions) and KV namespace `SAVES` (cloud saves).
  The IDs in `wrangler.jsonc` are resource identifiers, not credentials.
- `GOOGLE_CLIENT_ID` is a public OAuth client ID, so it's safe to commit. There is **no** client secret, because the Worker verifies
  Google ID tokens against Google's public JWKS.

To deploy (you need access to the Cloudflare account):

```bash
cd deploy
npm ci                                   # installs wrangler locally
export CLOUDFLARE_API_TOKEN=...          # set in your shell env ONLY. Never commit it, never put it in a file in this repo
./sync_deploy.sh                         # game/ → deploy/public, then `npx wrangler deploy`
# or, if deploy/public is already up to date:
npx wrangler deploy
```

### Note on `sync_deploy.sh` paths

The original copy of `sync_deploy.sh` (on the dev box) **assumed hard-coded `/workspace` paths**:
`/workspace/contract-board` as the source, `/workspace/afk-slayer-cf/public` as the destination, and
`/workspace/.tools/node-v22.20.0-linux-x64/bin` added to PATH. It also read the Cloudflare token from a box-local
secrets file. The version in this repo was made portable:

- paths are relative to the script (`deploy/../game` → `deploy/public`). Set `GAME_DIR=...` to override
- the token must already be exported as `CLOUDFLARE_API_TOKEN`. The script exits if it isn't set
- set `NODE_BIN=/path/to/node/bin` if you need a specific Node install

Some QA scripts in `game/shots/*.mjs` and a few logs/docs still mention `/workspace/...` paths. Those are just
historical references.

## Design docs index

Start with **`game/DESIGN.md`** (the design summary).

| Doc | Topic |
|---|---|
| `game/design/iom-style-redesign.md` | IOM-style World 1 redesign (OSRS-style names) |
| `game/design/w1-progression-audit.md` | World 1 progression audit: new game → Slayer level 20 (+ `w1-progression-minutes-*.csv`, `sim/`) |
| `game/design/level-boss-progression.md` | Level progression + Slayer points → boss fight |
| `game/design/creature-boss-families.md` | Creature boss families (3 themes) |
| `game/design/undercroft-monsters.md` | Undercroft monster identities |
| `game/design/elder-thornpelt-tuning.md` | Elder Thornpelt fight tuning |
| `game/design/visual-gear-ladder.md` | Equip gear ladder (what you wear makes you stronger) |
| `game/design/loot-sink.md` | Loot sink (Scraps + signature mats) |
| `game/design/forge-mat-retarget.md` | Forge mat retarget (Levels families) |
| `game/design/time-gates-to-costs.md` | Time gates → resource costs |
| `game/design/benchmarks-not-timers.md` | Benchmarks are not timers |
| `game/design/early-quota-cut.md` | Early kill cut (until first AFK helper) |
| `game/design/quarry-rename.md` | Player term: "monster" |
| `game/design/audio-bed-only.md` | Bed-only audio (no SFX) brief |
| `game/design/overnight-levels-polish.md` | L2/L3 art confirm + Levels polish |
| `game/design/levels-migration.md`, `iom1-migration.md`, `iom3-notes.md` | Save migrations and notes |
| `game/design/signin-google.md`, `signin-email.md` | Sign-in flows (Google live; email OTP disabled) |
| `game/design/*.xlsx` + `build_*.py` | Tuning / balance spreadsheets and the scripts that build them |
| `game/art/ART_BIBLE.md`, `game/art/INTEGRATION.md` | Art direction and sprite integration |
| `game/audio/AUDIO_BIBLE.md`, `CUE_SHEET.md`, `core-pack*.md` | Audio direction and cue sheets |
| `game/playtest/*.md` | Playtest passes and retests |

## Not in this repo (on purpose)

- Secrets: Cloudflare API token, `.env` / `.dev.vars`, any OAuth client secrets or session keys
- `node_modules/`, `.wrangler/`, npm cache
- Large reference or scratch files: gameplay reference videos (`*.mp4`, ~70 MB each), the `contract-board-forge1.tgz`
  backup (~100 MB), QA screenshots (`game/shots/*.png`, ~54 MB), and art scratch folders (`_work/`, `*.npy`)
