# AFK Slayer — Live overnight playtest (draft → finalize after browser wrap)

**URL:** https://afk-slayer.ajchapman20.workers.dev/?v=livepass1  
**Build footer (Settings):** `AFK Slayer · build levels1`  
**Audio:** `AUDIO_CACHE=20260924chillhop1`, combat/UI SFX hard-off (`sfxEnabled=false`), bed loop on  
**Sprites:** `ENABLED=true`  
**First-run reset:** localStorage clear + reload — Intro Tasks (1/23) shown  
**Mac local:** unreachable during this pass  
**Boss path to Level 2:** not fully completed in-browser (120 Sp grind timeboxed); code + UI copy reviewed  

## Intro (observed)
- First task: Kill 15 Bristle Cubs; dock shows 0/15 while Task dock shows 0/25 kills — dual counters confuse.
- Hold-to-fire tip appears twice (intro instr + arena tip).
- Intro dock large overlay; minimize chevron present; **no Skip Intro** on first-run.
- Initial HTML comment/label residue “1 of 20” but live TOTAL=23 (label updates to n/23).
- Green gem icons in intro bar look like ✕/close (read as cancel, not progress chrome).

## Level 1 bears / Elder (UI + code)
- Hunt shows **LEVEL BOSSES → Elder Thornpelt · Lv 30** meter **0 / 120** from minute one, with copy to fill then Fight boss for relic + next Level.
- Intro order teaches **Defeat Elder** *before* unlock/switch to Thornpelt Bear — fights the Codex ladder (Cub → Thornpelt → Dire → Elder).
- `watch_boss` intro check can soft-pass via `preyViews && points >= 10` without a full meter.
- Unlocking Level 2 is via `finishMarkedPrey` → `unlockAreaId` after Elder kill (not verified live this pass).

## Briar / Quill / aim
- Fresh run: “No hunters hired”; Briar hire is late intro step (after boss block in task list).
- Quill not in intro at all.
- Aim: hold-toward works; assist present in data; **no combat SFX** so hit feedback is visual-only (bed-only mix).

## Top 5 (severity ordered) — for New Bot tasks

### 1. MAJOR — Intro dual kill counters (15 vs 25)
- **Steps:** Fresh load → Hunt → read Intro “0/15” and Task “0/25”.
- **Expected:** One clear kill goal.
- **Actual:** Two different quotas at once.
- **Owner:** Designer + New Bot (intro progress should mirror task quota or hide task dock until intro kill done).

### 2. MAJOR — Intro teaches Elder before mid-tier bears
- **Steps:** Read intro task order after early tasks (earn Sp → fill meter → unlock boss → Defeat Elder → *then* Unlock Thornpelt Bear).
- **Expected:** Ladder matches Codex (Cub → Thornpelt → Dire → Elder → Level 2).
- **Actual:** Boss fight intro steps precede unlocking Thornpelt Bear.
- **Owner:** Designer (reorder) + New Bot.

### 3. MAJOR — No Skip on a 23-step first-run intro
- **Steps:** Fresh load → look for Skip; only minimize/restore dock.
- **Expected:** Skip / “I’m experienced” for returning testers; or shorter core path.
- **Actual:** Must walk 23 tasks; experienced-only migrate skip in code, not a button.
- **Owner:** Designer + New Bot.

### 4. MAJOR — Combat SFX hard-off while teaching aim/kills
- **Steps:** Fresh hunt; fire bolts / kill cubs.
- **Expected:** Hear bolt fire/hit / mob death (or settings can turn SFX on).
- **Actual:** `sfxEnabled=false` early-outs all `play()`; bed only. Slider cannot restore without `setSfxEnabled(true)`.
- **Owner:** Audio + New Bot (flip flag or wire Settings Mute/SFX to the gate).

### 5. MINOR — Intro chrome reads as “close” + duplicate hold tips
- **Steps:** Look at intro bar gems + tips.
- **Expected:** Progress gems / single hold tip.
- **Actual:** Green ✕-like gems; two hold instructions.
- **Owner:** Artist (gem art) + New Bot / Designer (copy).

## Also flag (not top 5)
- Soft intro check on “Fill Level 1 boss meter” (`preyViews && points>=10`).
- Long 120 Sp boss gate after intro only asked for 15 Sp held — expect drop-off / “am I stuck?” feeling.
- Settings footer `levels1` OK; confirm deploy matches intended mix.

## Screenshots
- `/workspace/screenshots/shot-call_ZyllYIdfExwPZEC8TNATeNwefc_0b9c16cb27055e18.png`
- `/home/box/agent-data/agents/b6b91a35-5bb2-429c-b7ab-fa467a4bda1f/assets/521680667155872c4db3bc49c23e720f48a7a962a3c42c5445d7070554dce02b.webp`


---

## Browser wrap addendum (computerUse finished)

First-run after localStorage clear confirmed. Elder/Level 2 not reached (only ~3–4/120 Sp).

### New / sharpened findings
1. **MAJOR — Hold-to-aim often shows no bolts / no immediate kill feedback** (idle later advances). Screenshot: `shot-call_ZYBhYYyteOVQYhUzSWLyYSGafc_0de625101b65a5be.png`
2. **MAJOR — Below 120 Sp, Hunt boss card has no Fight boss control at all** (not even disabled); copy truncates (“Then Fight boss for …”). Screenshot: `shot-call_stPLv3CccOIVuh3extl1JNsPfc_0de625101b65a5be.png`
3. Intro dock min/restore **PASS**; still **no Skip**.
4. Dual counters reconfirmed (intro 0/15 while task advanced to 3/25 + Sp rose).
5. Company: Briar “Hire Briar (15m)” time gate; Quill cards deep/gated. Screenshot: `shot-call_JU3Cb8mWKc8go1ePMSsUgz2yfc_0de625101b65a5be.png`
6. Settings: SFX labeled “off for now” at 0%; wipe is two-tap with no explicit Cancel (leaving cancels). Screenshots: `shot-call_HR6NajcFZIhnFdpcrN94vobvfc_0de625101b65a5be.png`, `shot-call_KT8dgUh2R2OUnUxNOHvZhZbOfc_0de625101b65a5be.png`

