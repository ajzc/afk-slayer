# Design Brief: Slayer XP (every kill counts toward Slayer level)

**Status:** Built as xp1 (`BUILD_ID: 'xp1'`, live in `js/` on 2026-09-28). **Retune Sep 28 (faster SL4) proposed below: design only, no game code changed.**
**Related:** `iom-style-redesign.md` (unlock ladder, pacing targets), `w1-progression-audit.md` (Fix A, C, F, G, I), `early-quota-cut.md`, `monster-count.md`, `benchmarks-not-timers.md`.
**Sim:** `design/sim/slayer_xp_sim.py`. Run `python3 xp_report.py` in `design/sim/` to rebuild every number here; the full output is in `design/sim/xp_report_out.txt`.

**Number tags:**
- **[code]** means as in `js/` today (re-read on 2026-09-28).
- **[doc]** means from a design doc.
- **[model]** means a sim output or assumption.
- **[proposed]** means new in this brief.

---

## Retune Sep 28: faster SL4 (proposed 2026-09-28, design only)
**Why:** Alex playtested xp1 and said reaching SL4 takes about 3× too long. This retune gets a new game to SL4 in about 1/3 of the time. It does that with two data values and no logic changes.

### What is live today (checked in `js/` on 2026-09-28)
- **Slayer XP is built (xp1)** [code].
  - `data.js` lines 1089-1111: `SLAYER_XP.toNext` = 150/250/410/690/…, per-contract `slayerXp` and `firstClearXp`, and `markedPrey[].gateLevel` 5/9/13.
  - `state.js` lines 341-455: `xpToNext`, `grantSlayerXp`, the Tier Test cap, and `grantKillXp` (×5 in the window, 50% idle).
  - `checkContractFinish` (line 1668) grants the first-clear XP chunk. `finishMarkedPrey` (lines 1972-1978) gives +1 SL and clamps XP.
  - Fix C is live: `cutQuotaTasks` and `effectiveQuota` (line 1391).
- **Early cut** [code]: `EARLY_QUOTA_MULT` 0.2, floor 2, and `EARLY_REWARD_MULT` 5 until `hunter_briar` is owned (`state.js` lines 1141-1154). The L1 quotas are 2 / 2 / 5.
- **Tier Test 1** (`sewer_king`, Crawling Hand Champion) [code]:
  - `hpMult` 4.0 = 600 HP; `bossCost` 120 Slayer points.
  - Helpers are muted, and the Cannon deals 0 (`arena.js` `maybeSpecialPulse`).
  - About 54-58 s of holding at start-of-game bolt DPS (~10-11 after hits).
- **Start-of-game kill** [code, model]:
  - Bolt chip = 10 × idlePower 1.08 (Bronze) × 600/1188 ≈ 5.45 per 0.6 s, which is 9.1 DPS.
  - Crawling Hand has 150 × 0.70 = 105 HP. At a 0.775 hit rate plus 0.8 s respawn/walk-in, one kill takes **15.7 s**.

### Real time to SL4 today and why it feels long
**Sim (typical engaged player): SL4 at 3.5 min (208 s)** [model]. Real play adds UI time on top: picking the next task, the intro checklist detours (food, Codex, casket, boost), and tapping Fight. So in real play it is ≥ 3.5 min.

| Segment (xp1 today) | Time | Note |
|---|---:|---|
| Crawling Hand, 2 kills × 15.7 s | 0 → 30 s | SL2 on the first clear (180 XP ≥ 150) |
| Cave Crawler, 2 kills × ~24 s + task switch | 30 → 83 s | SL3 on the first clear (422 cumulative ≥ 400) |
| Banshee kills only to fill the 120-point meter | 83 → 148 s | XP to SL4 needs 810 cumulative, but only 422 exist after the two cut tasks, so SL4 **has** to come from Tier Test 1 |
| Tier Test 1 fight (600 HP, bolt only) + setup | 148 → 208 s | 54 s fight + 6 s |

**Cause:** 60% of the time (about 125 s) is a Banshee meter farm plus a 54 s boss fight. That happens because the SL1-3 curve (150/250/410 = 810) is larger than all the XP the ×0.2 cut tasks pay out (422 after Crawling Hand and Cave Crawler). On top of that, the first monster takes 15.7 s per kill, which is slow for a "tiny early task".

### The change (2 data values, no logic)
| # | File / field | Old | New |
|---|---|---|---|
| 1 | `js/data.js` line 1094, `D.SLAYER_XP.toNext[0..2]` (SL1→2, 2→3, 3→4) | `150, 250, 410` | **`100, 120, 180`** (the rest of the array is unchanged: 690, 1150, 1900, …) |
| 2 | `js/data.js` line 184, `contracts` → `bristle_cub` (Crawling Hand) → `combat.hpMult` | `0.70` (105 HP) | **`0.40`** (60 HP; about 9.3 s per kill at start) |

**Unchanged:**
- per-kill XP and first-clear chunks
- the ×5 and quota cut
- `gateLevel`s 5/9/13, the 99% cap, and offline rules
- Tier Test 1 HP and cost
- Warrior cost (140 g)
- all `state.js` / `arena.js` logic

Only the toast example numbers move, so the HUD shows `SL 2 · 80/120 XP`.

**How it lands** (it's deterministic, because L1 tasks unlock in a fixed order and pay fixed XP):

| Kill | XP gained (×5) | Result |
|---|---|---|
| Crawling Hand kill 2 | 50 + 50 = 100 | **SL2** (100 ≥ 100); the first-clear +80 carries over |
| Cave Crawler kill 1 | +55 → 135 | **SL3** (≥ 120) |
| Cave Crawler kill 2 + first clear | +55 +132 → 202 | **SL4** (≥ 180; 22 XP margin) |

**Tier Test 1 becomes the SL5 gate**, which is what its `gateLevel` 5 already says (§3.3). The Warrior is unlocked by XP at SL4, and the Crawling Hand Champion win gives SL5 (Legs).

### New timeline (sim, 1.0× DPS; `design/sim/xp_report_out.txt`, "RETUNE SEP 28" block)
| SL | Gate | Before (xp1) | **After** | How it's reached after | Target |
|---:|---|---:|---:|---|---|
| 2 | Smithing | 0.50 min (30 s) | **0.30 (18 s)** | XP, Crawling Hand kill 2 | distinct beat; first weapon buy ≤ 1 min: **Iron at 9 s** |
| 3 | Cannon | 1.38 (83 s) | **0.77 (46 s)** | XP, Cave Crawler kill 1 (Cannon bought at 46 s) | distinct beat |
| 4 | Hire Warrior | 3.46 (208 s) | **1.14 (69 s)** | XP, Cave Crawler first clear | 60-80 s: **on target (0.33×)** |
| 5 | Legs armor | 5.00 | **3.81** | Tier Test 1 (58 s fight) | 4-8, OK slightly early |
| 6 | Prayer | 11.29 | **7.70** | XP (Ashfang Pup) | 8-15: early by 0.3 min |
| 7 | Crits + Body | 15.06 | **11.00** | XP, Ashfang Pup first clear | 12-25: early by 1.0 min |
| 8 | Hire Archer | 25.27 | **14.67** | Tier Test 2, Ashfang Alpha (51 s) | 15-30: early by 0.3 min |
| 9 | Helm armor | 32.12 | **26.66** | XP (Silkling) | 25-40: on target |
| 10 | (prestige soft-open) | 35.42 | 32.64 | Tier Test 3, Nightweave | 40-60: early (gates nothing in code) |
| 13 | Berserker + Mage | 81.08 | 79.32 | XP | 55-90: on target |
| 20 | Mazchna | 410 | 409 | XP | 4-8 h: on target |

**Between SL4 and SL5, no dead stretch:**
- Warrior hired at 1.95 min
- Auto-Accept and TT1 meter full at 2.7 min
- SL5 and Legs at 3.8 min
- SL5 → SL6 is 3.9 min (was 6.3), with Legs and Steel buys in between

The dead zones (10+ min with nothing new) are the same as before: none before SL13. XP lost to caps: 0, and 0 minutes at a cap.

**Why SL6-8 move earlier too:** TT1 now skips the 690-XP level (SL4→5) instead of the 410 one, and SL1-3 cost 400 instead of 810. That makes every later XP level about 700 XP (≈ 3.5 min at ~180 XP/min) closer.

**Sensitivity** [model]:

| DPS | SL4 before → after | SL5 before → after | SL8 before → after |
|---|---|---|---|
| 0.7× | 4.76 → **1.58** | 6.6 → 5.1 | 31.8 → 18.5 |
| 1.5× | 2.42 → **0.80** | 3.65 → 2.75 | 19.2 → 11.2 |

### Risks and notes
1. **Warrior hire lands about 48 s after SL4** (sim: 72 g at SL4, and the Warrior costs 140 g, so it takes 2 Banshee kills). Don't "fix" this by cutting the Warrior price:
   - Hiring ends the ×5 window. At 70 g the hire lands at SL4, the Tier Test 1 meter is stuck at 88/120 without ×5, and SL5 slips from 3.8 to 5.6 min.
   - The intro's gold top-up (`intro.js` line 44: gold ≥ 200 after the first Crawling Hand task) can pay for the Warrior at SL4 in real play. That bracket gives SL4 at 1.08 min, the hire at 69 s, SL5 at 5.3 and SL6 at 10.5. That is still inside the bands.
2. **The intro order is now stale.** `intro.js` puts "Defeat Crawling Hand Champion" before "Hire Warrior". With XP, the Warrior comes first, so the Hire step will just auto-complete. The optional steps (Codex, casket, boost, food) also sit on the SL4 path and add real time. Moving them after SL4 is a New Bot / UX follow-up; it is not part of this retune.
3. **SL6-8 run 0.3-1.0 min under their bands.** Optional one-number hold: `toNext[4]` (SL5→6) 1150 → **1400** gives SL6 9.0, SL7 12.2, SL8 14.8, and SL9 27.2, all on target, with no other change. It is not recommended by default, because Alex asked for faster and the rhythm is better without it.
4. **SL2 lands on the exact kill that fills the bar** (2 × 50 = 100). SL4 has a 22 XP margin. If `slayerXp`, `firstClearXp`, the early quotas or the ×5 change later, re-run the sim. Cave Crawler at 10 XP per kill would push SL4 to the first Banshee kill (+20 s).
5. **Tier Test 1 is now fought at SL4 for SL5.** Its 58 s fight is inside the 45-90 s benchmark, so it is left alone. If Alex wants the first boss shorter, set `sewer_king.combat.hpMult` 4.0 → 2.0 (~29 s): SL5 moves to about 3.4 min, and nothing else moves.
6. **Existing saves:** nobody is lowered. A save at SL1-3 with XP above the new need is clamped to need − 1 by `clampSlayerXp` on load (`state.js` line 233), so the excess XP is dropped but the SL stays. The next kill levels it up. Crawling Hand HP only affects that task.
7. **Offline:** SL4 now sits before Auto-Accept, so an absence at SL4 is tiny (the Banshee cut task, 150 XP). The "big first absence" case moves to SL5 (raw 7,537 XP, limited to 1 level → SL6), and the one-level limit still holds.
8. **Sim model changes** (applied to both before and after):
   - The player opens the shop on a level-up toast.
   - The player buys a pending new-system unlock the moment it's affordable.
   - These moved xp1's SL4 from 3.49 to 3.46 min and Iron from 35 s to 16 s.

**Sim:** `slayer_xp_sim.py` has `CURVE['early'] = (100, 120, 180)` and `TASK_HP_SEP28 = {'hand': 0.40}`. The pre-retune run is `XPSim(current_cfg(retune=False), curve=CURVE_PRE_SEP28)`. `xp_report.py` prints both.

*Sections below are the original xp1 brief. Where §3.4 (curve table), §3.9 (timeline) and §5.1 (toNext) differ from this section, this section wins.*

---

## 1. Goal (player feeling)
Every monster you kill pushes your Slayer level forward. The bar under "Slayer level" really is XP now, and it always pays out.
- Harder monsters are worth more.
- Your first clear of a task gives a big burst.
- Beating a Tier Test is always a level-up.

The game stays rewarding, like Idle Obelisk Miner World 1. Early levels come every minute or two. Later levels take longer, but the bar keeps moving, and you never get stuck at a level with nothing to earn. Today you can be stuck forever at SL13 [code].

## 2. What the code does today (checked 2026-09-28)

**What decides SL today**
- **First task clear** gives +1 SL: `state.js` `checkContractFinish`, lines 1524-1530 [code].
- **Tier Test win** gives +1 SL and +1 Prayer point: `finishMarkedPrey`, lines 1819-1820 [code].
- Nothing else changes SL. With 9 tasks and 3 Tier Tests, the highest reachable level is SL13 [code].

**The HUD bar** (`ui.js` `renderTop` lines 222-242; `index.html` tooltip "bar fills with current task kills") shows the current task's kills ÷ quota. It never pays out [code]. The task card already shows the same thing as `Task · k / q kills` (`arena.js` `#hp-label`) [code].

**Landed since the audit**
- **feel1:** a kill's gold is credited to the save right away, and the HUD counts it up when the coin lands after `COIN_FLIGHT_MS` = 650 ms. The boss death beat is `BOSS_MOMENT_MS` = 1,100 ms; the economy and save happen on the death frame, and the banner shows at 320 ms [code].
- **Early kill cut is live:** `EARLY_QUOTA_MULT` 0.2 with a floor of 2, and `EARLY_REWARD_MULT` 5 until the Warrior is hired. Finish bonuses are not ×5 [code].
- **Armor is live:** Legs SL5, Body SL7, Helm SL9 (`ARMOR_SLOTS`) [code].
- **Monster count is live:** `mobCountFor` = 1 + helpers + multi-hit, capped at 3 [code].
- **Slayer cape and helm hooks exist.** `onMazchnaGateCleared` exists, but no Mazchna gate is in `markedPrey` [code].

**Not landed from the audit**
- The SL ladder and extra Tier Tests (Fix A): `markedPrey` still has 3 tests plus the hidden `ash_tyrant`.
- L2/L3 quotas and HP (Fix B): quotas are still 80/120/150/140/180/220.
- Helper damage still multiplies (Fix D). Gear has no SL gate (Fix E).
- `SLAYER_UNLOCKS` still stops at SL8. Hires 3-4 unlock at SL13, and nothing is gated at SL10-12 or SL14-19 (Fix F).
- Prestige still resets `slayerLevel` to 1 and wipes prayers, and `canPrestige` opens after any Tier Test (Fix G).
- The crit quirk remains: the 8% base only applies while the crit bonus is 0 (`getBonuses` line 1181).
- The early-cut quota still snaps back mid-task when the Warrior is hired (Fix C).

## 3. Rules and numbers

### 3.1 XP per kill (repeat tasks included)
- **Formula [proposed]:** `slayerXp = round(10 × area.mult × contract.mult)`.
  - `area.mult` is 1.0 / 1.35 / 1.8 for L1/L2/L3 [code].
  - `contract.mult` is 1.0 to 2.0 up the task ladder [code].
  - Both fields already mean "harder, richer monster", and together they rise steadily through all 9 tasks.
- **Why not `displayLevel` or HP:**
  - `displayLevel` [code] goes down from Banshee (26) to Ashfang Pup (22), then jumps from 58 to 180-600 in L3.
  - Task HP (`hpMult` 0.55-1.5 [code]) is flat across Levels: L3 is no tougher than L1, so HP-based XP would pay Cave Crawler more than Brood Matron.
- Every task kill counts, including repeats of cleared tasks. Tier Test bosses give no per-kill XP; they give a level (§3.2).
- Store the value on each contract as `slayerXp`, so it can be tuned per monster without touching the formula.

| Task | Level | XP per kill [proposed] | Full task (killQuota [code] × XP) | During the cut: quota × XP × 5 | First-clear chunk [proposed] |
|---|---|---:|---:|---:|---:|
| Crawling Hand | 1 | 10 | 8 × 10 = 80 | 2 × 10 × 5 = 100 | 80 |
| Cave Crawler | 1 | 11 | 132 | 2 × 11 × 5 = 110 | 132 |
| Banshee | 1 | 12 | 288 | 5 × 12 × 5 = 300 | 288 |
| Ashfang Pup | 2 | 17 | 1,360 | - | 1,360 |
| Ashfang Wolf | 2 | 19 | 2,280 | - | 2,280 |
| Dire Ashfang | 2 | 20 | 3,000 | - | 3,000 |
| Silkling | 3 | 29 | 4,060 | - | 4,060 |
| Webfen Widow | 3 | 32 | 5,760 | - | 5,760 |
| Brood Matron | 3 | 36 | 7,920 | - | 7,920 |

### 3.2 First clears and Tier Tests
- **First clear of a task gives a large XP chunk, not a guaranteed level.**
  - Chunk = one full-size run of that task (`killQuota × slayerXp`, table above) [proposed]. Your first clear is worth double.
  - The chunk is not ×5 in the early window, the same as finish bonuses [code: finish bonus is not ×5].
  - **Why a chunk:**
    - If the 9 first clears plus 3 Tier Tests were all guaranteed levels, 12 of the 19 level-ups would be fixed and kills would barely matter.
    - It also bunches the middle game. In the sim with guaranteed first-clear levels, SL10 to SL14 land within 26 minutes (32 to 59 min) and SL13 comes at 52 min, before its 55-90 min target [model].
    - With the chunk, early levels still land on first clears (SL2 on Crawling Hand, SL3 on Cave Crawler), because the curve is sized so.
- **Tier Test win = guaranteed +1 SL**, whatever your XP [code already does +1].
  - After the win, XP inside the level is kept but clamped to `xpToNext(newSL) − 1`, so one win never gives two levels [proposed].
  - **Why:** it keeps Tier Tests meaningful, matches the redesign ("each Tier Test clear raises Slayer level" [doc]), and is exactly what the code already does, so there is less to change.

### 3.3 Tier Test gating: yes, XP stops at 99% before a Tier Test level
The redesign makes Tier Tests the Slayer-level gate [doc], and Tier Tests are what open Level 2 and Level 3 [code]. So XP alone must not jump past them.
- Each Tier Test gets a `gateLevel` [proposed]:

| Tier Test | gateLevel [proposed] | Also opens [code] |
|---|---:|---|
| Crawling Hand Champion (`sewer_king`) | 5 | Level 2 |
| Ashfang Alpha (`mist_wraith`) | 9 | Level 3 |
| Nightweave (`crypt_lord`) | 13 | - |

- **Rule:** while a test with `gateLevel = SL + 1` isn't won, XP caps at `floor(0.99 × xpToNext(SL))`. XP past that is dropped, not banked. Banking would let AFK or offline play store levels to cash in the moment the test falls.
- Winning the test gives the guaranteed +1, which lifts the cap.
- If you beat a test early (e.g. Crawling Hand Champion at SL3), you get +1 then, and its gate is gone.
- **How often it bites [model]:**
  - An engaged typical player never sits at the cap with today's 3 tests: 0 minutes at 0.7×, 1.0× and 1.5× weapon DPS, because each meter fills and the fight is winnable before XP gets there.
  - It bites for weak loadouts, which is intended. At 0.4× DPS the player waits 12 min at 99% of SL4 until Crawling Hand Champion is winnable.
  - It also bounds AFK and offline XP.
- When audit Fix A adds more tests, give each one a `gateLevel` and re-run the sim.

### 3.4 XP-to-next curve (tuned in the sim)
> **Retune Sep 28:** SL1-3 are now hand-set to 100 / 120 / 180 (cumulative 400 to SL4). See the Retune section at the top. SL4+ is unchanged.
**Formula [proposed], rounded to 10 below 1k, 50 below 10k, 500 below 100k, then 5,000:**
- SL1 to SL13: `xpToNext(L) = 150 × 1.66^(L−1)`
- SL14 to SL19: `xpToNext(L) = xpToNext(13) × 1.2^(L−13)`

**Why two phases:**
- Early XP per minute grows about 15× in the first hour as gear and helpers stack: about 160 at 1 min, 180 at 10, 590 at 30 and 1,130 at 60 [model].
- After about 90 min it goes flat at about 2,650 XP/min. Today's multiplying helper damage makes Brood Matron die at the kill-time floor, about 0.8 s overhead [model; audit problem 3].
- A single steep curve would make SL16 to SL20 take 1.5 to 3.5 h each. The gentler 1.2× tail keeps late levels at about 25-75 min.

Store the table in data (`SLAYER_XP.toNext`) so it can be tuned directly.

| SL | XP to next [proposed] | Total XP to reach next SL | Gate at the next SL [code] |
|---:|---:|---:|---|
| 1 | 150 | 150 | SL2 Smithing (Tempered Edge) |
| 2 | 250 | 400 | SL3 Cannon + Special Cadence |
| 3 | 410 | 810 | SL4 Hire Warrior |
| 4 | 690 | 1,500 | SL5 Legs armor · **Tier Test gate: Crawling Hand Champion** |
| 5 | 1,150 | 2,650 | SL6 Prayer board |
| 6 | 1,900 | 4,550 | SL7 Crits + Crit Power + Body armor |
| 7 | 3,150 | 7,700 | SL8 Hire Archer |
| 8 | 5,200 | 12,900 | SL9 Helm armor · **Tier Test gate: Ashfang Alpha** |
| 9 | 8,650 | 21,550 | SL10 (nothing in code; prestige soft-open per doc) |
| 10 | 14,500 | 36,050 | SL11 (nothing in code) |
| 11 | 24,000 | 60,050 | SL12 (nothing in code) |
| 12 | 39,500 | 99,550 | SL13 Hire Berserker + Hire Mage · **Tier Test gate: Nightweave** |
| 13 | 65,500 | 165,050 | SL14 (nothing in code) |
| 14 | 79,000 | 244,050 | SL15 (nothing in code) |
| 15 | 94,500 | 338,550 | SL16 (nothing in code) |
| 16 | 115,000 | 453,550 | SL17 (nothing in code) |
| 17 | 135,000 | 588,550 | SL18 (nothing in code) |
| 18 | 165,000 | 753,550 | SL19 (nothing in code) |
| 19 | 195,000 | 948,550 | SL20 Mazchna gate (only the `onMazchnaGateCleared` hook exists) |
| 20 | MAX | - | - |

### 3.5 Early kill cut: XP per kill also gets ×5
Yes [proposed]. Inside the window, XP per kill is × `EARLY_REWARD_MULT` (5) [code], just like gold and Slayer points, so a cut task gives about the same XP as the full-size task (100 / 110 / 300 vs 80 / 132 / 288, table in §3.1).
- **Without ×5 [model]:** SL2 at 1.4 min, SL3 at 3.6, SL4 at 4.3, SL5 at 8.1.
- **With ×5 [model]:** SL2 at 0.5, SL3 at 1.4, SL4 at 3.5, SL5 at 5.0.

The ×5 keeps Alex's fast start. The first-clear chunk stays un-multiplied.

**Required with this: audit Fix C** (`effectiveQuota`: a task started inside the window keeps its cut quota after the Warrior is hired). With XP, SL4 can now land mid-task, from kills or from beating Crawling Hand Champion early. The player hires the Warrior on the spot, and today the half-done Banshee jumps from 5 to 24 kills. Without Fix C the sim loses about 3 minutes: SL5 at 7.8 instead of 5.0, SL6 at 13.9 instead of 11.3 [model].

### 3.6 Offline and AFK kills: included at 50%, bounded
**Decision [proposed]:**
- Any kill credited by `applyIdle` (offline claims, and the idle ticks while you're on a non-Hunt tab) gives **50%** of that kill's XP. The ×5 still applies inside the early window.
- Kills from the arena give 100%.
- Offline XP is bounded three ways:
  1. **The offline cap:** 360 min [code] plus bonuses.
  2. **The Tier Test cap** in §3.3.
  3. **At most one Slayer level per claim:** XP earned in one `applyIdle` call is limited to `xpToNext(SL at the start of the claim)` [proposed].

**Why it's included:** it's an idle game, and coming back to a moved bar is the reward. **Why the one-level limit**, from the sim with one 360-min absence at each point [model]:

| Absence starts at | Raw offline XP at 50% | Same as | Without the 1-level limit | With it |
|---|---:|---|---|---|
| SL4 (min 3.5, Warrior hired) | 6,384 | 109 active min | SL4 → SL7 (Prayer, Crits, Body all at once) | SL4 → SL5 |
| SL5 (min 5) | 7,537 | 43 active min | SL5 → SL8 | SL5 → SL6 |
| SL8 (min 25) | 7,220 | 41 active min | SL8 → 99% of SL8 (Alpha gate) | same |
| SL12 (min 61) | 9,642 | 8 active min | 0.24 of a level | same |
| SL16-19 | 9,576 | 4 active min | 0.05-0.08 of a level | same |

- Offline kills are **limited by food in every case above**. Food is 100 stock + 1.2/min [code], so one 6 h absence is about 530-1,060 kills whatever the kill rate [model]. Food upgrades raise this, and the 1-level limit still holds.
- Late game, offline XP is small next to active play, which is correct for an "engaged" game. Early game, the limit stops one return from firing three unlock toasts at once and skipping the ladder.
- Before Auto-Accept (150 Slayer points [code]), `applyIdle` stops at the end of the current task [code]. So in the early window offline is naturally tiny (Banshee: 5 kills = 150 XP).

### 3.7 Save migration (never lowers anyone)
- Add `state.slayerXp` (a number, may be fractional). On load, if it's missing, set it to 0. Keep `slayerLevel` exactly as saved. **No retroactive XP** for old kills or old first clears.
- Clamp `slayerXp` to `[0, xpToNext(SL) − 1]`. If SL ≥ 20, show MAX; no current save can be above SL13 [code].
- A migrated save below a gate whose test isn't won (e.g. SL4 without Crawling Hand Champion) gets the 99% cap as normal. A save already at or above a gate level is never pulled back.
- Players stuck at the old SL13 cap start earning toward SL14 right away.
- One-shot flag `_slayerXpMigrated = true`. The existing `load()` SL derivation for very old saves (lines 208-224 [code]) stays.

### 3.8 Prestige
With XP, SL could be re-earned after a prestige, but the redesign treats SL as permanent. **`doPrestige` keeps `slayerLevel` and `slayerXp`** [proposed; same as audit Fix G]. Today it resets SL to 1 through `defaultState()` [code]. That conflict must be fixed in the same change.

### 3.9 Timeline (sim, typical engaged player)
> **Retune Sep 28:** this table is the xp1 (pre-retune) timeline. The current proposal is SL2 0.3 / SL3 0.8 / SL4 1.1 / SL5 3.8 / SL6 7.7 / SL8 14.7 min. See the Retune section.
Model assumptions are the same as the audit:
- Hit rate 0.75, and 0.8 s per kill overhead.
- The player fights a Tier Test as soon as its meter is full and the fight takes ≤ 90 s, even mid-task (code keeps task progress per target).
- Buy order as in the audit, plus armor as soon as each slot opens.
- Offline is not included.

Targets: audit Fix I where it has one [proposed], and the audit's per-SL bands otherwise. The doc's original targets are in the last column. Fix I's targets are used because the early cut is now live and Alex asked for a fast start; the doc's 5 / 10 / 20-40 min early targets predate the cut.

| SL | Minute [model] | How it was reached | Gate unlocked [code] | Target | vs target | Doc target [doc] |
|---:|---:|---|---|---|---|---|
| 2 | 0.5 | first-clear chunk, Crawling Hand | Smithing | ≤ 1.5 min | on target | first unlock ≤ 1 min: met (Iron at 0.6) |
| 3 | 1.4 | first-clear chunk, Cave Crawler | Cannon | 1.5-3 min | on target (6 s early) | ~5 min: early |
| 4 | 3.5 | **Tier Test** Crawling Hand Champion (54 s fight), won at SL3 | Hire Warrior (bought 3.5) | 3-5 min | on target | ~10 min: early |
| 5 | 5.0 | XP (Ashfang Pup) | Legs armor (bought 5.1) | 4-8 min | on target | first Tier Test 20-40 min: early (the test is at 3.5) |
| 6 | 11.3 | XP (Ashfang Pup) | Prayer | 8-15 min | on target | - |
| 7 | 15.1 | **Tier Test** Ashfang Alpha (49 s) | Crits + Body armor | 12-25 min | on target | - |
| 8 | 25.4 | XP (Ashfang Wolf) | Hire Archer (bought 30.9) | 15-30 min | on target | - |
| 9 | 32.2 | XP (Silkling) | Helm armor (bought 32.5) | 25-40 min | on target | - |
| 10 | 35.5 | **Tier Test** Nightweave (35 s) | nothing in code | 40-60 min (prestige soft-open) | early by 4.5 min | prestige 2-4 h |
| 11 | 49.4 | XP (Webfen Widow) | nothing | - | - | - |
| 12 | 60.4 | first-clear chunk, Brood Matron | nothing | - | - | - |
| 13 | 81.7 | XP (Brood Matron) | Berserker + Mage | 55-90 min | on target | - |
| 14 | 108 | XP | nothing | - | - | - |
| 15 | 139 | XP | nothing | - | - | - |
| 16 | 176 | XP | nothing | - | - | - |
| 17 | 220 | XP | nothing | - | - | - |
| 18 | 272 | XP | nothing | - | - | - |
| 19 | 336 | XP | nothing | - | - | - |
| 20 | **411 (6.9 h)** | XP | Mazchna gate (hook only) | 4-8 h | on target | 6-12 h: **on target** |

**Where the XP comes from:** 97% from kills, 3% from first-clear chunks. 0 XP is lost to Tier Test caps, and there are 0 minutes at a cap [model].

**Weapon DPS sensitivity** [model; `benchmarks-not-timers.md` asks for 0.7× / 1× / 1.5×]:

| SL | 0.7× | 1.0× | 1.5× |
|---:|---:|---:|---:|
| 4 | 4.8 | 3.5 | 2.4 |
| 7 | 19.0 | 15.1 | 11.5 |
| 8 | 31.9 | 25.4 | 19.2 |
| 9 | 40.7 | 32.2 | 24.6 |
| 13 | 95.2 | 81.7 | 70.5 |
| 20 | 425 (7.1 h) | 411 (6.9 h) | 400 (6.7 h) |

- Stronger loadouts are faster through SL13. At 0.7× the player is about 2 min late at SL8 and 1 min late at SL9. At 1.5×, SL3-4 land about 30 s early.
- **From SL14 to SL20, power barely matters**, because kills sit at the time floor with today's multiplying helper damage. That goes against the spirit of `benchmarks-not-timers.md`. Once audit Fix B and D land, late XP per minute will grow with power again, and the SL14+ tail (×1.2) must be re-tuned.

**Dead zones** (10+ min with nothing new) [model]:
- **Before SL13 (82 min): none.**
- After it: 13-17 min gaps between 83 and 176 min, then 44, 52, 64 and 75 min gaps (SL16→17 through SL19→20).
- XP makes SL14-20 reachable, but those levels unlock nothing in code. They need audit Fix F content, or new Tier Tests (audit Fix A) with `gateLevel`s, to feel like World 1 progress.

## 4. Names and copy
- **Name:** "Slayer XP". Add `NAMES.slayer_xp = { osrs: 'Slayer XP', standIn: 'Hunt XP' }` [proposed]. Don't reuse `guildXp` or "Rank XP", which is a separate hidden stat [code].
- **HUD pill** (replaces "Slayer level N" + the task bar); use `CB_FMT.num` for big numbers:
  - Normal: `SL 4 · 120/690 XP` → later `SL 16 · 42.1k/115k XP`
  - At a Tier Test cap: `SL 4 · XP full`. Tooltip and tap text: "Beat Crawling Hand Champion to reach SL 5."
  - At 20: `SL 20 · MAX`
  - Tooltip (replaces "bar fills with current task kills"): "Slayer XP: every kill counts. Harder monsters give more."
- **Tier Test card, while capped:** "Slayer XP is full. Win this Tier Test to reach SL 5."
- **Level-up toast** (celebrate style; shown when the coin of the levelling kill lands, see §5.6):

| SL | Toast |
|---:|---|
| 2 | "Slayer level 2! Smithing is open: Tempered Edge." |
| 3 | "Slayer level 3! Cannon unlocked (50 gold)." |
| 4 | "Slayer level 4! Hire your Warrior (140 gold)." |
| 5 | "Slayer level 5! Legs armor unlocked in Smithing." |
| 6 | "Slayer level 6! The Prayer board is open." |
| 7 | "Slayer level 7! Crits and Body armor unlocked." |
| 8 | "Slayer level 8! Hire your Archer (900 gold)." |
| 9 | "Slayer level 9! Helm armor unlocked in Smithing." |
| 13 | "Slayer level 13! Berserker and Mage can be hired." |
| 20 | "Slayer level 20! The Mazchna gate is open." |
| others | "Slayer level N! Stronger monsters give more Slayer XP." |

Costs quoted are [code]: Cannon 50g, Warrior 140g, Archer 900g.
- **First clear**, added to the existing task toast: `· +80 Slayer XP (first clear)`
- **Tier Test banner**, added to the existing sub-line: `· Slayer level 5`. The level toast follows after the 1.1 s boss moment.
- **Offline claim modal**, new line: "Slayer XP +690 (half rate while away, up to 1 level per return)". If capped by a test: "Slayer XP full: win Crawling Hand Champion to reach SL 5."
- **Task progress** lives only on the task card (`Task · 3 / 24 kills`, already in `arena.js`). Remove it from the HUD bar.
- **Copy fix:** `maps.js` line 443 "Locked — reach Slayer level 2 (finish a Slayer task)." becomes "Locked — reach Slayer level 2 (earn Slayer XP from kills)."

## 5. What New Bot implements
1. **Data (`js/data.js`):**
   - `contracts[].slayerXp` = 10, 11, 12, 17, 19, 20, 29, 32, 36 (§3.1).
   - `contracts[].firstClearXp` = 80, 132, 288, 1360, 2280, 3000, 4060, 5760, 7920.
   - `markedPrey[].gateLevel` = 5 / 9 / 13 (none on `ash_tyrant`).
   - (Retune Sep 28: toNext now starts `100, 120, 180, 690, …`, and Crawling Hand `hpMult` is 0.40.)
   - `SLAYER_XP = { toNext: [150, 250, 410, 690, 1150, 1900, 3150, 5200, 8650, 14500, 24000, 39500, 65500, 79000, 94500, 115000, 135000, 165000, 195000], maxLevel: 20, capFrac: 0.99, offlineMult: 0.5, offlineMaxLevels: 1 }`.
   - `NAMES.slayer_xp`.
2. **State (`js/state.js`):**
   - `defaultState.slayerXp = 0`.
   - `xpToNext(sl)`.
   - `slayerXpCap(state)`: an unfinished, non-hidden `markedPrey` with `gateLevel === SL + 1` gives `floor(0.99 × need)`.
   - `grantSlayerXp(state, amount, src)`: loops level-ups, respects the cap and SL20, and returns `{ gained, levels: [..], capped }`.
   - `gainSlayerLevel` clamps at 20.
3. **Kill hooks:**
   - `applyKillRewards` takes a source argument. `creditContractKills` (arena, both the skipGold path and the normal path) grants `slayerXp × kills × earlyRewardMult` at 100%. `applyIdle` grants the same × 0.5.
   - Inside one `applyIdle` call, total XP is at most `xpToNext(SL at start)`. Report it as `gains.slayerXp`.
4. **First clear:** in `checkContractFinish`, replace `gainSlayerLevel(state, 1)` (lines 1525-1530) with `grantSlayerXp(firstClearXp, 'first')`. Keep `gains.slayerLevelGained` filled from the result.
5. **Tier Test:** in `finishMarkedPrey`, keep `gainSlayerLevel(1)`, then `slayerXp = min(slayerXp, xpToNext(SL) − 1)`.
6. **HUD (`ui.js` `renderTop`, `index.html`):**
   - Label and fill come from `slayerXp / xpToNext`; add the capped and MAX states and the new tooltip; delete the task-progress fill.
   - For arena kills, move the bar (and fire the level-up toast) when that kill's coin lands (`COIN_FLIGHT_MS` 650), the same beat as the gold count-up. XP itself is credited to the save at the kill, like gold.
   - Tier Test level toasts wait until `BOSS_MOMENT_MS` (1,100) ends.
7. **Copy:** §4 (toasts, task toast suffix, boss banner suffix, claim modal line, Tier Test card line, `maps.js` line 443).
8. **Migration:** §3.7, one-shot `_slayerXpMigrated`.
9. **Prestige:** `doPrestige` keeps `slayerLevel` and `slayerXp` (§3.8).
10. **Early cut:** audit Fix C (§3.5), a task in progress keeps its cut quota after the Warrior is hired.
11. **Leave alone:** quotas, HP, meters, rewards, `killRatePerMin`, the offline cap, and Tier Test fights.

## 6. Game Artist (and Game Audio) needs
- **Game Artist:** no new PNGs required. CSS only on the existing `.hud-xp-bar` / `.hud-xp-fill`:
  - a short glow on the SL pill at level-up (about 600 ms; none under reduce-motion);
  - a "full" style for the capped bar (gold with a slow stripe);
  - a MAX style at SL20.
  - Optional: a 16 px XP glyph for the claim modal line.
- **Game Audio:** one new cue, `slayer_level_up` (about 1 s, reward-type, ducks the bed, clearly different from `task_complete`). Until it's delivered, reuse `task_complete`. No per-kill XP sound.

## 7. Out of scope
- New Tier Tests and the SL ladder (audit Fix A).
- Content for SL10-12 and SL14-19 (audit Fix F).
- Mazchna gate cost and fight.
- The rest of the prestige rework (audit Fix G beyond keeping SL and XP).
- Re-tuning quotas, HP or helper damage (audit Fix B/D).
- XP boost items, prayers or chest buffs.
- Per-kill "+XP" popups.
- XP on Tier Test boss kills.
- World 2.

## 8. Conflicts with current code (for review)
1. `checkContractFinish` gives +1 SL on first clear (lines 1524-1530). This brief replaces it with an XP chunk.
2. The HUD bar is task progress (`ui.js` 222-242, `index.html` tooltip). This brief makes it XP.
3. `doPrestige` resets SL to 1 (and wipes prayers). It must keep SL and XP.
4. The early cut still snaps a half-done task back to full quota when the Warrior is hired. XP makes SL4 land mid-task more often, so Fix C is required.
5. `killRatePerMin` multiplies by `area.mult × contract.mult`, so offline kill rate goes **up** on harder monsters (sim: Brood Matron about 350-4,200 kills/min offline at SL13-19). With tier-scaled XP that would square the effect. Today food (1 food per Brood kill [code]) is what actually bounds offline, and the 1-level-per-claim limit backs it up.
6. SL14-19 have no content in code, and SL20's Mazchna gate is only a hook. XP makes those levels reachable (6.9 h), but they are empty, with 44-75 min gaps from SL16 on.
7. Multiplying helper damage flattens late XP per minute at about 2,650 (kill-time floor). Late levels then ignore player power. Re-tune the ×1.2 tail after audit Fix B/D.
8. SL10 lands at 35.5 min from the Nightweave guaranteed level, before the doc's prestige soft-open band. SL10 gates nothing in code, and `canPrestige` is open after any Tier Test anyway.
9. Idle ticks on non-Hunt tabs use `applyIdle`, so those kills count as "away" XP (50%). That's intended, but it's worth knowing when testing.
