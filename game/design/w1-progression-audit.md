# World 1 progression audit: new game to Slayer level 20

**Status:** design audit, no code changed. **Author:** Game Designer. **Date:** 2026-09-24.
**Why:** Alex's feedback was that the first few levels took far too long and meant killing the same monsters over and over. He wants World 1 to feel like Idle Obelisk Miner World 1: rewarding but challenging, with always something new to work on.

**How to read the numbers.** Every number has a tag:
- **[code]** comes from `js/data.js`, `js/state.js` or `js/arena.js` as they are today.
- **[doc]** comes from a locked or proposed design doc (`iom-style-redesign.md`, `early-quota-cut.md`, `visual-gear-ladder.md`, `elder-thornpelt-tuning.md`).
- **[model]** is an assumption or output of the simulation.
- **[proposed]** is a new number put forward in this audit.

---

## 1. Method

The model is `design/sim/w1_progression_sim.py` (today's game) plus `design/sim/w1_proposed.py` (the fixed game). `design/sim/report.py` rebuilds every table below and writes per-minute CSVs to `design/w1-progression-minutes-current.csv` and `design/w1-progression-minutes-proposed.csv`. Run it with `python3 report.py` from `design/sim/`. The sim only reads a copy of the numbers; it never touches the game code.

It uses the same approach as `AFK_Slayer_Play_Sheet.xlsx`: kill time = monster HP ÷ effective DPS, plus a fixed overhead. It runs in 1-second steps and logs one row per minute.

- **Monster HP.** Monster HP = 150 × `hpMult` [code]. Tier Test HP = 150 × the boss `hpMult` [code].
- **Bolt damage** [code, arena.js]. Each 0.6 s shot does 10 × idlePower × killMult × 600/1188 chip, so perfect-aim bolt DPS is about 8.42 × idlePower × killMult.
  - idlePower = 1 + 0.08 (Bronze) + gear + 0.12 per Idle Power level + relics.
  - killMult = 1 + 3% per Tempered Edge level, and × 1.2 with Thick Hide.
  - Crits, bounce and pierce are applied as they are in code.
- **Aim.** Hit rate 0.75 [model], adjusted per monster by `aimAssist`, `hitWidth` and `moveMult` [code], and +0.08 on bosses [model]. Sensitivity runs at 0.73× and 1.25× are in section 8.
- **Cannon** [code]. 4× chip every 30 s, on tasks only.
- **Helpers** [code]. Chip = dmg × hunterPower × hunterDmg × own bonus. Attack interval × 0.85 while holding; melee uptime min(0.95, 0.72 × √move). Helpers are muted in Tier Tests.
- **Overheads** [model]. 0.8 s per kill (walk and retarget), 4 s to switch task, 6 s to set up a boss.
- **Tier Test meter** [code]. Fills with (`pointsPerKill` + `finishBonus`) × preyChip in that area. A Tier Test is fought only when the expected fight time is 90 s or less [model: patience, from the doc's 45-90 s target]. Otherwise the player keeps farming and buying damage.
- **Early quota cut** [doc, early-quota-cut.md], applied as if live. Until Hire Warrior is owned, quota × 0.2 with a floor of 2, and gold and Slayer points per kill × 5.
- **Scope.** Only engaged, active play is modelled. AFK and offline use a different formula (`killRatePerMin`, 360-min cap [code]) and are out of scope.

### Buy order the model player follows (documented rule)
1. **Unlocks come first**, as soon as they are affordable. The player saves for a pending unlock if it is under 4 min of income away.
   - Order: Iron → Unlock Specials (Cannon) → Hire Warrior → Swift Step → Unlock Crits → Hire Archer → Steel → Moss → Ember.
   - The proposed game adds the armor slots right after they open.
2. **Slayer points go to**: auto-accept → Mithril → Hard Charge → Adamant → Archer multishot → Rune → Dragon.
3. **Every other gold** goes to the upgrade with the best damage gain per gold. When a Tier Test is the blocker, "damage" means bolt damage on the boss, because helpers are muted there.
4. **Prayers**: Thick Hide at SL6, then Sharp Eye once Crits are owned. The proposed game adds Easy Assignments (3 PP) and Restful Sleep (5 PP).
5. **Tasks**: take the next uncleared task with the shortest clear time. If none is left, fill the Tier Test meter. If that is done too, farm the best gold per minute. The current task is always finished before a boss fight.

Actual first-purchase times in today's game (code + cut) [model]:
- 0.6 min: Iron, Idle Power
- 1.5 min: Cannon
- 3.2 min: Warrior, auto-accept
- 4.2 min: Swift Step
- 8.3 min: Steel
- 11.8 min: Thick Hide, Mithril
- 17.3 min: Tempered Edge
- 26.4 min: Crits
- 27.2 min: Sharp Eye, Adamant
- 28.2 min: Archer
- 42.6 min: Rune
- 47.3 min: Moss
- 48.9 min: Ember
- 53.1 min: Dragon (the whole weapon ladder is done)
- 122 min: Crit Power

---

## 2. Current timeline (today's code + early quota cut applied)

"Can afford" lists what is affordable the moment the level lands (g = gold, Sp = Slayer points). "Bottleneck" is what held the level back: the monster count and seconds per kill, or the boss.

| SL | Minute | How SL was earned | What unlocked [code] | Can afford then | Bottleneck | vs target [doc] |
|---:|---:|---|---|---|---|---|
| 1 | 0.0 | start | Hunt, Bronze, Idle Power, Iron | 50g start [code] | - | - |
| 2 | 0.5 | first clear Crawling Hand (quota 2 after cut) | Smithing (Tempered Edge) | Idle Power 25g, Iron 55g, Tempered Edge 60g | kills (2 × 15.7 s) | first buy ≤ 1 min: **on target** (Iron 0.6) |
| 3 | 1.4 | first clear Cave Crawler (2) | Cannon + Special Cadence | Unlock Specials 50g, Idle Power 50g | kills (2 × 24.4 s) | Cannon ~5 min: **early by ~3.5 min** |
| 4 | 3.2 | first clear Banshee (5) | Hire Warrior | Idle Power 75g, Special Cadence 80g, Pierce 180g | kills (5 × 20.5 s) | Warrior ~10 min: **early by ~7 min** |
| 5 | 4.2 | Tier Test Crawling Hand Champion (fight 54 s) | **nothing** | same as above | meter was already full | first Tier Test 20-40 min: **early by 16+ min**; fight 54 s on target |
| 6 | 11.7 | first clear Ashfang Pup | Prayer board | Mithril 320Sp, Prey Chip 100Sp | kills (**80** × 4.8 s) | - |
| 7 | 26.4 | first clear Ashfang Wolf | Crits + Crit Power | Unlock Crits 250g, Idle Power 150g | kills (**120** × 6.0 s = **~15 min on one monster**) | - |
| 8 | 27.2 | Tier Test Ashfang Alpha (39 s) | Hire Archer | Adamant 700Sp, Crit Power 300g | meter already full | fight 39 s: **too short** (target 45-90) |
| 9 | 32.9 | first clear Silkling | **nothing** | Crit Power 300g, Pierce 396g | kills (140 × 1.8 s) | - |
| 10 | 33.8 | Tier Test Nightweave (45 s) | **nothing** (prestige is already open, since TT1) | same | meter already full | prestige 2-4 h: prestige is open from **4 min** and is broken (problem 4) |
| 11 | 38.3 | first clear Dire Ashfang | **nothing** | same | kills (150 × 1.7 s) | - |
| 12 | 42.6 | first clear Webfen Widow | **nothing** | Rune 1500Sp | kills (180 × 1.3 s) | - |
| 13 | 46.8 | first clear Brood Matron | Hire Berserker + Mage (Moss, Ember) | same | kills (220 × 1.0 s, at the overhead floor) | - |
| 14-20 | **never** | no source of SL exists | - | - | **no content** | SL20 6-12 h: **never** |

**Summary of today's game, with the cut applied:**
- **First 5 min are very fast.** SL5 lands at 4.2 min with Iron, Cannon and Warrior already bought.
- **Then two walls on one monster each:** Pup 80 kills (7.5 min) and Wolf 120 kills (15 min). SL6→SL7 takes **14.7 min** with nothing new in between.
- **SL7-13 then rushes by in 20 min.** Helper damage snowballs (over 1,000 DPS by about 50 min), so L2 and L3 kills drop to the 1-second overhead floor.
- **The game runs out at SL13 (46.8 min).** Dragon, the last weapon, is bought at 53 min.
- **After that, 11+ hours with nothing new:** only repeat levels of existing upgrades, and some of those gaps last 25-100 min.
- **Without the cut** (today's live game): SL4 takes about 15 min, or about 20 min with weaker aim. That matches Alex's complaint, and the locked cut fixes that part (SL4 at 3-4 min).

### Does SL rise fast enough after SL4?
- **SL4→SL6: fast, then slower.** SL4→5 takes 1 min (the TT1 meter is already full). SL5→6 takes 7.5 min of Pup (80 kills).
- **SL6→SL7: no.** 14.7 min of Wolf (120 kills), about 7.5× longer than any earlier level. This is the "killing the same monsters" wall moved from L1 into L2. It lands right after the cut ends, so the player notices the drop.
- **SL8→SL13: too fast, and empty.** A level every 1-6 min, but SL9, 10, 11 and 12 unlock nothing [code], so levels feel like counters rather than rewards.
- **SL13+: SL never rises again.** 9 tasks + 3 Tier Tests = 12 sources [code], so the maximum is SL13.

### Where the SL1-20 ladder in the redesign has no content in code
| SL | Redesign says [doc] | In code today |
|---:|---|---|
| 5 | Chain Cannon, bonus loot mark | nothing (no SL5 gate) |
| 8 | Archer + Smithing tier 2 | Archer only |
| 9 | Offline-loot prayer | nothing |
| 10 | First prestige soft-open + artifact shop | nothing at SL10. Prestige opens after any Tier Test (TT1 at SL5) and is broken |
| 11 | Special damage % ladder | nothing |
| 12 | Challenges-lite | nothing |
| 13 | Hire Berserker | Moss **and** Ember both open here |
| 14-20 | Artifact T2, Task Cards-lite, Cannon recharge ladder, helper food, World-2 prep, Mazchna gate | **cannot be reached**: no task or Tier Test gives SL beyond 13. The hidden `ash_tyrant` (bossCost 99999 [code]) is out of reach |
| also | Weapon % bands at SL7/11/14, attack speed SL12, armor slots SL5/7/9 (visual-gear-ladder) | none in code |

### Dead zones (10+ minutes with nothing new to buy or unlock) [model]
"New" means a Slayer level, an unlock, a prayer, a first level of any upgrade, or a new gear or armor tier.
- **53 min → 122 min (69 min):** Dragon bought, nothing left but repeat levels.
- **122 → 136 min (14 min):** only Crit Power lv1 happens here, and because of the crit bug it lowers crit chance.
- **136 min → end of the 12 h run (584 min):** nothing new, ever.
- Before 53 min there is no gap of 10+ min, but **SL6→7 (14.7 min)** is felt as one: only repeat Idle Power and helper levels.

---

## 3. Top 5 problems (ranked)

1. **SL stops at 13 and World 1 ends at about 47 minutes.**
   - Only 12 sources of SL exist [code]: 9 first clears + 3 Tier Tests.
   - SL14-20 of the redesign ladder, including Task Cards, the recharge ladder and the Mazchna gate, can never happen.
   - After about 53 min there are hours with nothing new. This is the opposite of "always something new to work on".
2. **The L2 quota wall right after the cut ends is Alex's complaint moved one step later.**
   - Pup 80 and Wolf 120 kills [code] = about 22 min on two monsters. SL6→7 alone takes 14.7 min.
   - The cut window also ends the instant the Warrior is hired (`effectiveQuota` in state.js). A half-done task snaps back to full quota (e.g. Banshee 3/5 → 3/24).
3. **Power runs away, so the mid game is trivial and fights are too short.**
   - Helper damage multiplies Hunter Power × Bigger Hits × each helper's own bonus [code].
   - L2 and L3 task HP (105-202) is no higher than L1 [code].
   - By about 40 min every kill is at the 1-second floor. Alpha dies in 39 s, below the 45-90 s target. Quotas of 140-220 turn into "hold the button".
   - Gear has no SL gate [code], so the whole weapon ladder is done by 53 min.
4. **Prestige is broken.**
   - `canPrestige` is true after any Tier Test (4 min in), not at SL10.
   - `doPrestige` resets `slayerLevel` to 1 but keeps bestiary completions and finished bosses. SL can never be earned back, which soft-locks the Cannon, Crits and Prayer gates.
   - It also wipes prayers and prayer points, although the redesign says Prayer is permanent.
   - A curious player who presses Prestige at minute 5 ruins the save.
5. **Missing unlocks and bugs in the middle of the ladder.**
   - Nothing unlocks at SL5 or SL9-12 [code]. Armor, Chain Cannon, weapon % bands, attack speed and the special ladders are not built.
   - **Crit bug** (state.js getBonuses): buying Crit Power level 1 lowers crit chance from 8% to 4%, because the 8% base only applies while the bonus is 0. Sharp Eye (5%) does the same.
   - **Targets out of step.** With the locked cut, Cannon (1.5 min), Warrior (3.2) and TT1 (4.2) land far earlier than the doc targets of 5 / 10 / 20-40 min. Either the cut or the targets must move. Recommendation: **re-baseline the targets** to Cannon ~1.5 min, Warrior ~3-4 min, first Tier Test ~4-5 min. The fast start is exactly what Alex asked for.

---

## 4. Fixes (exact numbers, each tagged with where it goes)

### Fix A: SL ladder to 20 (fixes problem 1). Tag: `js/data.js` markedPrey, `js/state.js` getMarkedPrey / addBossMeter / finishMarkedPrey
Keep "+1 SL per first task clear" and "+1 SL per Tier Test win" [code]. Add Tier Tests so there are 19 sources plus the gate. Each area gets a list of tests fought in order. A test only appears once its `after` task or test is done, and the meter feeds the next unfinished test in that area.

| # | Tier Test | Area | Appears after | Meter (Sp) | hpMult (HP) | Reward: Slayer points / gold | Status |
|---:|---|---|---|---:|---:|---|---|
| 1 | Crawling Hand Champion | L1 | L1 tasks | 120 [code] | 4.0 (600) [code] | 100 / 200 [proposed] | existing |
| 2 | **Ashfang Packleader** | L2 | Wolf | 400 | 9 (1,350) | 150 / 400 | **new** [proposed] |
| 3 | Ashfang Alpha | L2 | Dire Ashfang | 900 (was 280) | 16 (2,400) (was 5.6) | 250 / 500 | retuned [proposed] |
| 4 | **Webfen Matriarch** | L3 | Widow | 1,400 | 20 (3,000) | 300 / 800 | **new** [proposed] |
| 5 | Nightweave | L3 | Brood Matron | 2,400 (was 600) | 28 (4,200) (was 7.8) | 500 / 1,200 | retuned [proposed] |
| 6 | **Gauntlet I**: Hand Champion rematch | L3 | Nightweave | 5,000 | 80 (12,000) | 600 / 2,000 | **new** [proposed] |
| 7 | **Gauntlet II**: Alpha rematch | L3 | Gauntlet I | 9,000 | 140 (21,000) | 800 / 3,000 | **new** [proposed] |
| 8 | **Gauntlet III**: Nightweave rematch | L3 | Gauntlet II | 14,000 | 220 (33,000) | 1,000 / 4,500 | **new** [proposed] |
| 9 | **Gauntlet IV**: Screaming Banshee | L3 | Gauntlet III | 20,000 | 330 (49,500) | 1,200 / 6,000 | **new** [proposed] |
| - | **Mazchna gate** (SL20, World-2 marker) | - | SL19 | pay **50,000 Slayer points** | - | World-2 marker | [proposed]; replaces the doc's 2,000 Sp, which a player banks by about 20 min |

- Gauntlet reuses existing art and names (NAMES in data.js).
- SL sources: 9 tasks + 9 Tests = 18, so SL19 comes from the last Test and SL20 from the gate.
- Each Test still gives +1 prayer point [code]. The new Tests give no relic [proposed].
- Bolts stay sized from the boss's HP (`elder-thornpelt-tuning.md`). The HP above is what makes TTK 45-90 s at the power the model player has at that time.

### Fix B: L2/L3 quotas and task HP (fixes problems 2 and 3). Tag: `js/data.js` contracts[].killQuota and contracts[].combat.hpMult
| Task | Quota now [code] | Quota [proposed] | hpMult now [code] | hpMult [proposed] |
|---|---:|---:|---:|---:|
| Ashfang Pup | 80 | **40** | 0.55 | 1.0 |
| Ashfang Wolf | 120 | **50** | 1.2 | 1.4 |
| Dire Ashfang | 150 | **60** | 1.35 | 2.2 |
| Silkling | 140 | **60** | 0.70 | 2.4 |
| Webfen Widow | 180 | **70** | 1.25 | 3.2 |
| Brood Matron | 220 | **80** | 1.35 (1.25 no-pierce) | 4.0 |

L1 quotas stay 8/12/24 [code] with the cut (2/2/5) [doc].
- Result: no L2 or L3 task takes more than about 10 min [model]. The longest is Wolf, 50 × 10.7 s ≈ 9 min.
- Higher HP keeps kills at about 6-11 s instead of the 1 s floor, so each monster still reads as a fight.
- Drop Brood Matron `hpMultNoPierce` (1.25 [code]) or re-scale it to 3.7 [proposed].

### Fix C: end the early cut cleanly (problem 2). Tag: `js/state.js` effectiveQuota
Keep the cut quota for any task **already in progress** when the Warrior is hired. The full quota applies only from the next task accepted. [proposed]

### Fix D: helper damage adds instead of multiplying (problem 3). Tag: `js/arena.js` hunterExpectedChip / hunterHpChip, `js/state.js` getBonuses
Helper chip = base dmg × (1 + 0.30 × Hunter Power level + 0.40 × Bigger Hits level + own damage %) [proposed]. Today these three multiply each other [code].

### Fix E: gate gear by Slayer level (problem 3). Tag: `js/data.js` upgrades gear_*.minSlayerLevel
| Gear | Steel | Mithril | Adamant | Rune | Dragon |
|---|---:|---:|---:|---:|---:|
| minSlayerLevel [proposed] | 5 | 8 | 11 | 14 | 17 |
Costs stay as in code (e.g. Mithril 320 Sp, Adamant 700 Sp, Rune 1,500 Sp, Dragon 3,500 Sp [code]).

### Fix F: fill SL5 and SL9-18 with unlocks (problem 5). Tag: `js/data.js` SLAYER_UNLOCKS + upgrades; `js/state.js` getBonuses
| SL | Unlock [proposed unless marked] | Numbers |
|---:|---|---|
| 5 | **Chain Cannon** [doc] + **Legs armor slot** [doc] | Chain: 2.2× chip per pulse, 4 pulses per 60 s, tasks only [proposed]. Legs cost 40/90/190/420/930/2,050/4,500/9,900g, killMult +2%…+36% [doc visual-gear-ladder] |
| 7 | Crits [code] + **Body armor slot** [doc] + **Weapon % band 1** [doc] | Body 90…22,200g, loot gold +3%…+50% [doc]. Weapon % 1: base **400g**, ×1.3 per level, 16 levels, +10% per level [proposed cost] |
| 8 | Archer [code] | - |
| 9 | **Helm armor slot** [doc] + **Easy Assignments** prayer | Helm 150…37,100g, crit +1%…+12% [doc]. Easy Assignments: 3 PP, quotas × 0.9 and Tier Test meter +20% [proposed] |
| 10 | Prestige soft-open [doc] (Fix G) | - |
| 11 | **Special damage ladder** [doc] + **Weapon % band 2** [doc] | Special damage 800g base, +20% Cannon per level, 16 levels. Weapon % 2: **5,000g** base, +15% per level [proposed] |
| 12 | **Attack speed ladder** [doc] + Challenges-lite [doc, not in model] | Attack speed 2,500g base, +2% bolt rate per level, 16 levels [proposed] |
| 13 | Hire Berserker (Moss) [code] | Moss 2,000g [code]. **Ember moves from SL13 to SL16** [proposed] |
| 14 | **Weapon % band 3** [doc] + Smithing cap bump [doc] | 40,000g base, +20% per level [proposed] |
| 15 | Task Cards-lite [doc, not in model] | - |
| 16 | Hire Mage (Ember) + **Cannon recharge ladder** [doc] | Ember 4,200g [code]. Recharge 6,000g base, +1% per level, 16 levels [proposed] |
| 17 | **Restful Sleep** prayer + Dragon gear | 5 PP, offline cap 360 → 480 min [proposed] |
| 18 | Helper food bump [doc] | - |
| 19-20 | World-2 prep and Mazchna gate (Fix A) | 50,000 Sp |

### Fix G: prestige (problem 4). Tag: `js/state.js` canPrestige / doPrestige
- `canPrestige` only when slayerLevel ≥ 10 [doc] and at least 1 Tier Test is won.
- `doPrestige` **keeps** slayerLevel, bestiary completions, finished Tier Tests, prayers and prayer points, hires, Tempered Edge and relics.
- It resets gold, Slayer points, run upgrade levels (Idle Power, gear, armor, bounce, pierce, crit, the weapon % bands) and the area meters.
- Reward: **Slayer reward points = SL − 9** (SL15 gives 6) [proposed]. The first artifact gives **+10% weapon damage per point** [proposed].
- A player who is blocked for about 5 min with a gap of 3+ SL is prompted to prestige. That is the model trigger, and it could also be a UI hint.

### Fix H: crit bug (problem 5). Tag: `js/state.js` getBonuses
Crit chance = 0.08 base + every bonus, always [proposed]. So Crit Power lv1 gives 8% + its bonus, not 4%.

### Fix I: re-baseline the early targets (problem 5). Tag: `design/iom-style-redesign.md` §"Pacing targets"
- Change them to: first buy ≤ 1 min, Cannon ~1.5-3 min, first helper ~3-5 min, first Tier Test ~4-8 min (fight 45-90 s), SL10 ~40-60 min, first prestige ~1.5-2.5 h, SL20 marker ~4-8 h. [proposed]
- The locked cut already delivers the fast start Alex asked for. The old 20-40 min first-Test target would re-create the grind.

---

## 5. Projected timeline after fixes A-I [model, from `w1_proposed.py` FINAL]

| SL | Minute | How SL was earned | What unlocks [proposed] | Can afford then | Bottleneck | vs proposed target (Fix I) |
|---:|---:|---|---|---|---|---|
| 2 | 0.5 | Crawling Hand | Smithing | Idle Power 25g, Iron 55g | kills (2 × 15.7 s) | on target |
| 3 | 1.4 | Cave Crawler | Cannon | Unlock Specials 50g | kills (2 × 24.4 s) | on target |
| 4 | 3.1 | Banshee | Hire Warrior | Idle Power 100g, Pierce 180g | kills (5 × 19 s) | on target |
| 5 | 4.1 | TT Hand Champion (49 s) | Chain Cannon + Legs armor | Legs 40g, Idle Power 100g | meter full | on target |
| 6 | 9.9 | Pup (40) | Prayer board | Bounce 250g | kills (40 × 8.7 s) | on target |
| 7 | 19.3 | Wolf (50) | Crits + Body armor + Weapon % 1 | Unlock Crits 250g | kills (50 × 10.7 s) | on target |
| 8 | 20.8 | **TT Packleader** (81 s) | Hire Archer | Mithril 320Sp, Crits 250g | meter full | on target |
| 9 | 29.9 | Dire Ashfang (60) | Helm armor + Easy Assignments | Prey Chip 100Sp | kills (60 × 7.9 s) | on target |
| 10 | 41.7 | TT Alpha (78 s) | Prestige soft-open | Crit Power 300g | Slayer points (meter 900) | on target (40-60) |
| 11 | 48.0 | Silkling (60) | Special damage + Weapon % 2 | Adamant 700Sp | kills (60 × 6.3 s) | on target |
| 12 | 56.5 | Widow (70) | Attack speed (+ Challenges-lite) | Crit Power 300g | kills (70 × 5.8 s) | on target |
| 13 | 64.9 | Brood Matron (80) | Hire Berserker | - | kills (80 × 6.2 s) | on target |
| 14 | 66.4 | **TT Matriarch** (79 s) | Weapon % 3, Rune | Rune 1500Sp | meter full | on target |
| 15 | 84.9 | TT Nightweave (79 s) | (Task Cards-lite) | - | Slayer points (meter 2,400) | on target |
| - | **112 (1.9 h)** | **first prestige** at SL15, 6 reward points (+60% weapon dmg) | re-buy run | - | Gauntlet I too tough before prestige | on target (1.5-2.5 h) |
| 16 | 153 (2.6 h) | **Gauntlet I** (87 s) | Hire Mage + Cannon recharge | Idle Power 507g, Crit Power 600g | boss TTK: ~40 min buying damage, including the prestige re-buy | on target |
| 17 | 195 (3.2 h) | **Gauntlet II** (90 s) | Restful Sleep + Dragon | Dragon 3500Sp, Idle Power 1,930g | boss TTK (9 min) | on target |
| 18 | 225 (3.8 h) | **Gauntlet III** (81 s) | Helper food | Loot Luck 3,845g | Slayer points (meter 14,000) | on target |
| 19 | 261 (4.4 h) | **Gauntlet IV** (73 s) | World-2 prep | Idle Power 9,408g | Slayer points (meter 20,000) | on target |
| 20 | 265 (4.4 h) | Mazchna gate (50,000 Sp) | World-2 marker | - | Slayer points | 4-8 h (proposed) on target. **Old doc 6-12 h: early by ~1.6 h** |

**What changes:**
- Something new arrives every 1-10 min up to SL15.
- Every Tier Test is a 49-90 s fight (all 9 inside the doc's 45-90 s window).
- No task needs more than 80 kills.
- The first prestige lands at 1.9 h and is a real choice, because it is what beats Gauntlet I.

**Remaining dead zones (10+ min, nothing new) [model]:**
- 100-112 min (12 min), before the first prestige.
- 198-211 min (14 min)
- 232-249 min (16 min)
- 249-261 min (13 min)

These late gaps are where the player farms meter or power for the Gauntlet. They are also exactly the slots the redesign gives to **Challenges-lite (SL12)** and **Task Cards-lite (SL15)**. Neither system is in the model, and they need to be built (3 short goals each, with a permanent reward) to close these gaps. Rushing out a 60-120 s Relic Casket or Loot Casket helps a little but does not count as new content. **Do not close the gaps by raising Gauntlet numbers**: the sweep below shows that makes them longer and more frequent.

---

## 6. Why not stretch to 6-12 h right now [model]
Multiplying Gauntlet HP by 1.4-1.8 and meters/gate by 1.5 does push SL20 to 4.8-7.5 h. But dead zones grow from 4 to 6-9, and up to **40 min** each, because the only thing left to do late is buy repeat levels. Until Challenges-lite and Task Cards-lite exist, **about 4-5 h is the honest length of World 1** for an engaged player, and weaker players land nearer 7-8 h (section 8). Recommendation: keep the proposed 4-8 h marker, then stretch toward 6-12 h once those two systems are live.

| Gauntlet HP × | meters/gate × | SL20 at | dead zones (count, longest) |
|---:|---:|---:|---|
| 1.0 | 1.0 | 4.4-4.5 h | 4, 16 min |
| 1.0 | 1.5 | 5.3 h | 4, 43 min |
| 1.4 | 1.0 | 4.8 h | 3, 34 min |
| 1.8 | 1.0 | 7.5 h | 9, 40 min |
| 1.8 | 1.5 | 5.6 h | 7, 33 min |

## 7. Other things the model noticed
- **Slayer points pile up.** From SL8 on, Slayer points are rarely the blocker except for meters. The doc's 2,000 Sp Mazchna gate would be paid instantly, hence 50,000 [proposed].
- **Loot Luck and Prey Chip stay affordable all game.** They are fine sinks but not new.
- **Crit Power is ignored until about 2 h** in today's game, because of the crit bug. It is bought normally once Fix H is in.

## 8. Sensitivity to aim [model]
| Run | SL5 | SL7 | SL10 | SL13 | SL15 | SL20 | dead zones |
|---|---:|---:|---:|---:|---:|---:|---:|
| Today, weaker aim (0.73×) | 6 min | 31 | 40 | 53 | never | never | 3 (one lasting 11 h) |
| Today, 1.0× | 4.2 | 26.4 | 33.8 | 46.8 | never | never | 3 |
| Today, stronger aim (1.25×) | 4 | 23 | 30 | 43 | never | never | 3 |
| Proposed, 0.73× | 5 | 23 | 76 | 95 | 152 | **461 (7.7 h)** | 8 |
| Proposed, 1.0× | 4.1 | 19.3 | 41.7 | 64.9 | 84.9 | **265 (4.4 h)** | 4 |
| Proposed, 1.25× | 4 | 17 | 37 | 58 | 77 | **250 (4.2 h)** | 3 |

The proposed game spans roughly 4-8 h depending on skill. Weaker aim hurts mostly at the Tier Tests, because bolts are the only damage there. That is intended ("challenging"), but watch the SL9→10 Alpha step for weak aimers (40 → 76 min).

## 9. Files
- `design/sim/w1_progression_sim.py`: model of today's game (+ cut); `python3 w1_progression_sim.py`
- `design/sim/w1_proposed.py`: the fixes (`FINAL` holds every proposed number)
- `design/sim/report.py`: rebuilds the tables and writes the CSVs
- `design/w1-progression-minutes-current.csv`, `design/w1-progression-minutes-proposed.csv`: one row per minute (SL, gold, Slayer points, target, DPS, kill time, boss bolt DPS, meter)
- `design/sim/try.py`, `sweep.py`: parameter probes. `tune.py` and `tune2.py` are abandoned, ignore them.
