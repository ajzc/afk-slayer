# Design Brief — IOM-style World 1 redesign (OSRS names)

> **LOCKED 2026-09-24 by Alex.** Phase 1 approved. Decisions: helpers muted on boss / Tier Test fights (weapon only); Level 1 monsters swap bears for the Turael set (Crawling Hand, Cave Crawler, Banshee); wolves and spiders parked for later Slayer masters. OSRS names are private-playtest only; swap to the stand-ins before any public release.

**Status:** LOCKED (Phase 1 approved 2026-09-24)  
**Date:** 2026-09-24  
**Game:** AFK Slayer (live https://afk-slayer.ajchapman20.workers.dev)  
**Owner:** Game Designer → Alex skim → New Bot implements  
**Scope (LOCKED):** Idle Obelisk Miner **World 1 only** — through the World 2 unlock marker. Expand later.

**Sources (do not invent IOM facts):**  
- Workbook `design/Idle_Obelisk_Miner_World1_vs_AFK_Slayer.xlsx` (tabs cited as *Sheet · row*)  
- Fan wiki https://shminer.miraheze.org/wiki/ (pages cited by name)  
- Live code: `js/data.js`, `js/state.js`, `js/arena.js` + prior briefs in `design/*.md`

**Hard keeps from live findings (Takeaways T1–T10):** bolts sized from the target being fought · L1 boss fight 45–90s · 360-min offline cap · no RPG attributes · resource costs not time gates · do **not** copy IOM Construct-length walls into the first area transition · never use the word **quarry**.

**Legal:** OSRS names are Jagex IP — fine for private build/playtest. Swap to the **Original stand-in** column before any public or paid release. Never copy IOM names, text, or art.

---

# ONE-SKIM SUMMARY (read this first)

**Goal:** Make the first portion feel like Idle Obelisk Miner World 1 — rewarding, always something new every 1–3 levels, challenging but fair — mapped onto hunting with OSRS vocabulary.

**System mapping (IOM → AFK hunting):**

| IOM (W1) | AFK Slayer |
|---|---|
| Floors / ore clear | Slayer **tasks** / monster tiers you clear |
| Obelisk level | **Slayer level** (main gate that unlocks systems) |
| Pickaxe | **Weapon** (Bronze→Dragon ladder) |
| Bombs (recharge) | **Specials** (Cannon / Burst) with recharge |
| Drones | **Hired helpers** (Warrior / Archer / …) |
| Workshop | **Smithing** (permanent forge upgrades) |
| Skill-Tree | **Prayer** (named permanent skills — not STR/AGI) |
| Prestige Points | **Slayer reward points** (reset currency → permanent shop) |
| World 2 monument | Next **Slayer master** (Mazchna) / new dungeon |

**Unlock ladder (Slayer level 1→~20):** something new every 1–3 levels early — Smithing @2 · Specials @3 · first Helper @4 · Prayer @6 · Crits @7 · 2nd helper suit @8 · first Prestige soft-open @10 · Challenges-lite @12 · Cards-lite @15 · World-2 gate systems @19 · World-2 end marker @20. Details §2.

**Pacing targets:** first unlock ≤1 min · first special ~5 min · first helper ~10 min · first boss ~20–40 min · first prestige **proposed ~2–4 h** · World-2 marker **proposed ~6–12 h engaged** (IOM W2 is APPROX “few days” after Construct — we compress; cite Early Pacing).

**10 most important names (OSRS → stand-in):** Slayer level · Slayer points · Slayer Master Turael (Ashen Tutor) · Crawling Hand (Gripkin) · Dwarf multicannon / Cannon (Bolt Battery) · Hire Warrior (Thornblade) · Prayer (Vow Board) · Smithing (Anvil) · Slayer reward points (Crest Marks) · Mazchna (Mist Warden) as World-2 master.

**Phase 1 (first 30 min feel like IOM):** Slayer-level gate + unlock ladder through helper · weapon buy that matters in ≤1 min · Cannon special ~5 min · hire Warrior ~10 min · first Tier Test boss 20–40 min / 45–90s fight · OSRS task names for L1 ladder · shared 1.3 cost curve on run upgrades · Prayer stub (2–3 skills) · keep bolt-from-target + 360 offline + gold-not-Sp hires.

---

## 1. Goal (player feeling)

You open the game and within a minute you’ve bought a better weapon and you’re clearing a **Slayer task**. Every few Slayer levels something new unlocks — Smithing, a Cannon special, a hired helper, Prayer skills — so there is always a next lever. Around 20–40 minutes you fight your first **Tier Test** (short sit-down boss). Prestige teaches the permanent-vs-run split inside World 1. Clearing the World-1 end marker unlocks the next Slayer master — not a multi-day softlock.

### Mapping to evaluate (refine in playtest)

| IOM piece | Hunting map | Why |
|---|---|---|
| Floors 1–42 / ore (*Obelisk & Floors* row “W1 floor range”; wiki Floors) | **Tasks** on monster tiers (clear quota → next tier) | Same “clear N of current → advance” rhythm. W1 clear req = floor×5 (wiki Floors) → we use kill quotas, not floor counts. |
| Obelisk 1…19 (*Obelisk & Floors* “W1 unlock milestones by OB”; wiki Obelisk) | **Slayer level** 1…~20 | Main content schedule. Each Tier Test clear raises Slayer level + unlocks menus. |
| Pickaxe base dmg + world ups (*Damage & Upgrades*; wiki Upgrades) | **Weapon** upgrade + % damage / speed / crit ladders | Absolute weapon power for Tier Tests; bolts still **sized from target HP** for fair TTK (Takeaway T2). |
| Bombs (*Bombs* tab; wiki Bombs) | **Specials** with charges + recharge | Basic ~30s / Chain ~60s cadence. **Do damage on tasks**; Tier Tests are **weapon+helpers only** (IOM: bombs deal 0 to Obelisk — wiki Bombs / Obelisk). |
| Drones @OB2 (*Damage* “Drones as labor DPS”; wiki Drones) | **Hired helpers** | First hire cheap (~10 min). Disabled or contribution muted during Tier Test if we mirror IOM strictly — **open decision #1**. |
| Workshop @OB1 (wiki Workshop / Obelisk unlocks) | **Smithing** | Permanent damage / special multis that survive prestige. |
| Skill-Tree @OB4 (*Skill Tree* tab; wiki Skill-Tree) | **Prayer** | Named permanent skills. **No STR/AGI/PER/INT/LCK** (*Skill Tree* “No STR/AGI…”). |
| Prestige min Lv20 (*Prestige* tab; wiki Prestige) | **Slayer reward points** after first prestige | Resets run upgrades; keeps Prayer / Smithing / helpers / relics. |
| World 2 monument (*Obelisk & Floors* “World 2 unlock”; wiki Construct) | **Mazchna unlock** | End of this brief. Cost is a real gate, but **not** a Construct-length multi-day wall for the first transition (Takeaway T6). |

---

## 2. Core loop and unlock ladder

### Core loop (World 1)

1. Take a **Slayer task** from **Turael** (monster tier A → B → C).  
2. Hunt with **weapon bolts** (hold to aim). Earn **coins** + **Slayer points**.  
3. Spend coins on **run upgrades** (weapon levels, crits, special recharge).  
4. Fill **Tier Test** meter with Slayer points → **Fight** (45–90s sit-down).  
5. Win → **Slayer level +1**, unlock the next system(s), next tasks feel fresh.  
6. Spend mats in **Smithing**; spend **Prayer points** on permanent skills.  
7. At the soft prestige open → reset run power for **Slayer reward points** → buy permanent artifacts.  
8. At Slayer level ~19–20 → pay the **Mazchna gate** → World 2 (out of implement scope beyond the marker).

### Unlock ladder — Slayer level 1…~20

Cadence mirrors IOM Obelisk unlocks (*Obelisk & Floors* “W1 unlock milestones by OB”; wiki Obelisk Unlocks), compressed so early game hits the pacing targets in §3.

| Slayer Lv | Unlocks (player-facing) | IOM twin (cite) |
|---:|---|---|
| **1** | Hunt · Bronze weapon · first task (Crawling Hands) · Idle Power buyable | Upgrade Pickaxe @ player Lv1 — wiki Upgrades; *Damage* row 1 |
| **2** | **Smithing** panel (permanent weapon % starter) | Workshop @OB1 — wiki Obelisk |
| **3** | **Cannon** special (Basic charge, ~30s recharge) | Basic Bomb CD 30s — wiki Bombs; *Bombs* row “Basic / Chain” |
| **4** | **Hire Warrior** (first helper) + helper power stub | Drones menu @OB2 — wiki Obelisk / Drones |
| **5** | **Chain Cannon** (2nd special, ~60s) · Craft Plenty-lite (bonus loot mark) | Chain Bomb 60s; Bomb of Plenty @OB1 Workshop — wiki Bombs / Workshop |
| **6** | **Prayer** board (first 3 skills) | Skill-Tree @OB4 — wiki Obelisk / Skill-Tree |
| **7** | **Unlock Crits** + Crit Power ladder | Pickaxe Crit Chance unlock player Lv8 — wiki Upgrades; *Damage* “Early W1 Pickaxe Crit” |
| **8** | **Hire Archer** · Smithing Tier-2 permanent | Drone suit Chain@OB4 / T2 Artifacts@OB8 — wiki Obelisk |
| **9** | Prayer: **Chronokeeper-twin** (offline loot boost) | Chronokeeper 5 SP — wiki Skill-Tree; *Skill Tree* row |
| **10** | **First prestige soft-open** (min combat rank 20 twin) · Artifact shop T1 | Prestige min level 20 — wiki Prestige; *Prestige* “First prestige is IN World 1” |
| **11** | Special damage % ladder opens | Bomb Damage +20% @ player Lv20 — wiki Upgrades; *Bombs* “Bomb Damage / Recharge” |
| **12** | **Challenges-lite** (3 short goals → permanent chips) | Challenges @OB10 — wiki Obelisk; *Side Systems* |
| **13** | Hire Berserker | Mid W1 drone depth — proposed |
| **14** | Artifact T2 / Smithing cap bump | T3 Artifacts @OB14 — wiki Prestige / Obelisk |
| **15** | **Task Cards-lite** (3 collectible task cards, gild later) | Cards @OB15 — wiki Obelisk; *Side Systems* |
| **16** | Cannon recharge % ladder | Bomb Recharge @Lv60 is late — early stub **proposed** |
| **17** | Skip pets for W1 min (IOM Pets@OB17) — optional 1 pet later | Pets @OB17 — *Side Systems*; out of Phase 1 |
| **18** | Helper “fuel” / food efficiency bump | Drone Fuel @OB18 — wiki Obelisk |
| **19** | **World-2 prep systems** (vein/statue-lite sinks → gate currency) | Construct @OB19 — wiki Construct; *Obelisk & Floors* “Construct wall” |
| **20** | **Mazchna gate** (World 2 end marker) + prestige encouraged | World 2 monument — wiki Construct; *Obelisk & Floors* “World 2 unlock” |

**First prestige point:** available from Slayer level **10** once combat rank ≥ 20 (IOM: min level 20 — wiki Prestige). Happens **inside** World 1 (*Prestige* tab; About sheet).

**World 2 end marker:** pay gate cost (exact numbers §3) after Slayer level 19 systems are visible. Unlocks Mazchna / next dungeon chrome. **Implement = marker + stub screen**; Mazchna content is out of scope.

---

## 3. Numbers

Legend: **IOM-sourced** = cite sheet/wiki. **Proposed** = tune in playtest.

### 3.1 Pacing targets

| Milestone | Target | Basis |
|---|---|---|
| First unlock (weapon / Idle Power) | **≤ 1 min** | Product ask; IOM Upgrade Pickaxe from Lv1 — wiki Upgrades |
| First special (Cannon) | **~ 5 min** | Product ask; Basic Bomb is default early tool — wiki Bombs |
| First helper (Warrior) | **~ 10 min** | Product ask; Drones @OB2 early — wiki Obelisk; live Briar ~140g ≈ 10–15 min (*Early Pacing* earn table; `hunter_briar`) |
| First boss (Tier Test 1) | **20–40 min** | Live L1 Elder meter design — *Early Pacing* “L1 meter fill”; `design/level-boss-progression.md` |
| First prestige | **Proposed ~2–4 h engaged** | IOM: first prestige inside W1, min Lv20 — wiki Prestige; community when-to is APPROX (*Prestige* “Community when-to-prestige”) — no authoritative hour figure |
| World 2 marker | **Proposed ~6–12 h engaged** (not multi-day) | IOM Construct@OB19 exact; time to W2 monument APPROX “few days” of grind after (*Early Pacing* “KEY: Time to World 2”; wiki Progression Guide). We **compress** per Takeaway T6 |

### 3.2 Keep (already good)

| Rule | Value | Cite |
|---|---|---|
| Bolt chip from **current target HP** | `boltHpChipRaw` uses boss HP in boss fights | `js/arena.js`; *Obelisk & Floors* “Boss bolt sizing”; `elder-thornpelt-tuning.md` |
| First boss TTK | **45–90s** (solo ~60s post-fix) | `elder-thornpelt-tuning.md`; Takeaway T1 |
| Offline cap base | **360 min** | `js/state.js` `offlineCapMin=360`; *Early Pacing* “Offline early W1” |
| No RPG attributes | Named Prayer skills only | *Skill Tree* “No STR/AGI…”; wiki Skill-Tree |
| Unlocks = resource costs | No `minPlayMs` gates | `design/time-gates-to-costs.md` |
| Hires on **gold**, not Sp | Protect boss meters | `time-gates-to-costs.md` boss1; Takeaway T3 |

### 3.3 HP scaling (monster tiers)

IOM Obelisk HP = `round(100k × 2.8^(L-1))` with armor gate (*Obelisk & Floors* “Obelisk HP”; wiki Obelisk) — **too absolute** for our bolt-sizing model. Keep AFK form:

`HP = MONSTER_VISUAL_HP × hpMult` with `MONSTER_VISUAL_HP = 150` (`js/data.js`).

| Tier (W1) | Role | hpMult | HP | Notes |
|---|---|---:|---:|---|
| Task A (Hands) | Tutorial frail | **0.70** | 105 | Keep live Cub band |
| Task B | Adult | **1.50** | 225 | Keep Thornpelt band |
| Task C | Elite | **1.20** | 180 | Dire band (fast) |
| Tier Test 1 | First boss | **1.85** | ≈278 | Keep Elder; TTK 45–90s |
| Tier Test 2–5 | Early tests | **Proposed 2.0 → 2.4** | 300–360 | Step +0.1–0.15 / test |
| Tier Test 6–10 | Mid W1 | **Proposed 2.5 → 3.0** | 375–450 | Still one-fight clears |
| Tier Test 11–19 | Late W1 | **Proposed 3.1 → 3.8** | 465–570 | Not 2.8^n — proposed |

**Armor gate:** IOM armor can zero damage (wiki Obelisk). **Proposed:** skip hard armor for W1; use soft “tough hide” (−10% chip) only if tests feel trivial. Label proposed.

### 3.4 Weapon damage & upgrades (run — reset on prestige)

| Item | Effect / formula | Max | Cost curve | Cite |
|---|---|---|---|---|
| **Weapon rank** (pickaxe twin) | Display rank R grants baseWeight = `(R+1)×(R+2)/2` fed into bolt sizing as a **multiplier bias**, not absolute rock DPS | **Proposed 40** in W1 (IOM pickaxe max 171 is late-game — wiki Upgrades) | See curve below | wiki Upgrades Damage Calculation; *Damage* row 1 |
| Idle Power | +12%/lv | 40 | 40g × 1.55^lv | Live `idle_power` — keep |
| Crit Chance unlock | Base 8% after unlock | 1 | 250g | Live `unlock_crits` |
| Crit Power | +4%/lv | 10 | 300g × 1.7 | Live `crit_power` |
| Weapon % (early ladders) | +10% / +15% / +20% bands unlock at SL 7 / 11 / 14 | 16 each | Shared curve | IOM +10%@32, +15%@48, +20%@62 — wiki Upgrades; *Damage* “Early W1 Pickaxe Damage %” — **gate by Slayer level not player Lv** |
| Attack speed | +2%/lv | 16 | Shared curve | IOM unlock Lv52 — wiki Upgrades; open at SL 12 **proposed** |

**Shared run-upgrade cost curve (IOM):**  
- Levels 1–10: `Cost = Base × N`  
- Levels 11+: `Cost = Base × 1.3^(N−10) × N`  
(*Damage & Upgrades* “World Upgrade cost curve”; wiki Upgrades).  
Replace today’s per-row ad-hoc `costMult` on run combat upgrades with this shared curve; keep one-shot unlocks (Crits, Specials, hires) as flat gold.

### 3.5 Specials (bombs twin)

| Special | Recharge | Role | Cite |
|---|---|---|---|
| **Cannon** (Basic) | **30s** base | AoE chip on tasks | wiki Bombs cooldown table; *Bombs* “Basic / Chain” |
| **Chain Cannon** | **60s** base (pulses 1.25s apart) | Multi-hit clear | wiki Bombs; Auto-Bomber fires every 1.25s — wiki Skill-Tree |
| **Loot Mark** (Plenty-lite) | **Proposed 110s** | Next kills +ore/gold mark | Bomb of Plenty 110s — wiki Bombs |
| Special damage ladder | +20%/lv | max **Proposed 16** | Bomb Damage +20% unlock Lv20 — wiki Upgrades |
| Special recharge ladder | +1%/lv | max **Proposed 16** | Bomb Recharge +1% unlock Lv60 — wiki Upgrades — open earlier at SL 11 **proposed** |
| Auto-Cannon (Prayer) | Auto-fire selected special every **1.25s** | Costs Prayer points (IOM Auto-Bomber **10 SP**) | wiki Skill-Tree; *Bombs* “Auto-Bomber” |

**Tier Test rule (IOM twin):** specials deal **0 damage** to Tier Tests; helpers **proposed muted** (open decision #1). Weapon bolts only for the sit-down fight — forces the pickaxe-only skill like Obelisk (wiki Bombs / Obelisk; *Bombs* “Bombs vs Obelisk”).

**Special chip vs tasks:** **Proposed** `specialChip = 4.0 × boltChip` (Cannon) / `2.2 × boltChip` per Chain pulse — tune so Cannon feels like a clear button, not a bypass.

### 3.6 Helpers (drones twin)

| Helper | Hire cost | Base dmg / interval | Cite / note |
|---|---:|---|---|
| Warrior (Briar) | **140g** | 11 / 1900ms | Live `HUNTER_COMBAT.briar`; *Damage* “Drones as labor DPS” |
| Archer (Quill) | **900g** | 4 / 1200ms | Live retune boss1 |
| Berserker (Moss) | **2000g** | 13 / 2100ms | Live |
| Mage (Ember) | **4200g** | 5 / 1300ms | Live |

Helper Power +30%/lv max20 · Bigger Hits +40%/lv max15 · Faster Attacks +30%/lv max12 — keep live (`hunter_*`).  
IOM Drone Damage = % of Pickaxe +20%/lv max10 (wiki Drones) — **proposed later** link helper chip to a fraction of weapon weight after Phase 1; until then keep independent tracks (`DESIGN.md`).

### 3.7 Income per kill (tasks)

Keep staged design rates (*Early Pacing* “AFK L1 earn calibration”; `time-gates-to-costs.md`):

| Window | gold/min | Sp/min |
|---|---:|---:|
| ~8–10 min solo | 7–8 | ~3 |
| ~15–25 min + Warrior | 10–16 | 4–6.5 |

**Tier Test 1 meter:** **120 Slayer points** (live `markedPrey.sewer_king.bossCost`) → ~20–40 min at those rates.  
**Later meters:** **Proposed** 120 × 1.35^(testIndex−1) (Test2≈162, Test3≈219, …) — tune so each test is a session goal, not a wall.

### 3.8 Smithing (Workshop twin) — permanent

| Upgrade | Effect | Max | Unlock | Cite |
|---|---|---|---|---|
| Tempered Edge | +3% weapon damage /lv | **42** | SL 2 | Workshop Pickaxe Damage +3%/lv max42 @OB6 — wiki Workshop; *Damage* “Workshop Pickaxe Damage” — open earlier for AFK pacing **proposed** |
| Packed Powder | +5% special damage /lv | **Proposed 20** | SL 5 | Workshop bomb line — proposed |
| Keep live forge one-shots | Pelt Guard / Fang Charm / Thread Tip | 1 each | mats | `forge_*`; `loot-sink.md` |

### 3.9 Prayer (Skill-Tree twin) — permanent

Currency: **Prayer points** (IOM Skill Points from bits/gems — wiki Skill-Tree). **Proposed earn:** 1 PP per Tier Test clear + rare task finish bonus. No gem shop in Phase 1.

| Skill | Cost PP | Effect | IOM twin |
|---|---:|---|---|
| Sharp Eye | 1 | +5% crit chance, +15% crit dmg | Lucky Strikes — wiki Skill-Tree |
| Thick Hide | 1 | +20% weapon damage | Swing Harder |
| Easy Assignments | 3 | Task quota −10%, +20% Sp gain | Easy Progressor (floor clear −10%, PP 1.2×) |
| Restful Sleep | 5 | Offline loot ×2, +1 casket bank | Chronokeeper |
| Auto-Cannon | 10 | Auto-fire special every 1.25s | Auto-Bomber |

### 3.10 Prestige

| Rule | Value | Cite |
|---|---|---|
| Soft-open | SL ≥ 10 and combat rank ≥ 20 | wiki Prestige min level 20 |
| PP / reward points formula (W1) | **Proposed** mirror `12 × 1.084^(rank−10)` | wiki Prestige below Lv200 |
| Resets | Rank progress, coins, run upgrades, task counters | wiki Prestige |
| Keeps | Prayer, Smithing, helpers, relics, mats, scraps, bestiary mastery, areas | Live `doPrestige` keep set + IOM persist list — *Prestige* “What resets / persists” |
| First artifact | +10%/lv weapon damage, max 32, cost 1 reward point | T1 Pickaxe Damage — wiki Prestige; *Damage* “Artifact T1” |

### 3.11 World 2 gate cost

IOM exact: **2,000 Gems + 2,000 Stone + 2,000 Magma + 2,000 Virtual Veins** (*Obelisk & Floors* “World 2 unlock”; wiki Construct).

**Proposed AFK twin (no gem IAP required):**  
`2,000 Slayer points banked` **or** `500g × SL` plus **3 signature mats × 50** crafted at Smithing monument. Tune so ready players spend ~1–2 focused sessions after SL 19 — **not** days of statue grinding (Takeaway T6).

---

## 4. Naming table

Columns: **OSRS-style name** | **Original stand-in** (swap before public) | **One-line player description**  
Never use **quarry**.

### Systems & currencies

| OSRS-style | Stand-in | Description |
|---|---|---|
| Slayer level | Hunt Rank | Main gate; rises when you clear a Tier Test. |
| Slayer points | Mark Chips | Earned on kills/tasks; open Tier Tests. |
| Slayer reward points | Crest Marks | Prestige currency for permanent artifacts. |
| Coins | Coins | Main spend for run upgrades and hires. |
| Prayer points | Vow Sparks | Buy permanent Prayer skills. |
| Scraps | Scraps | Side spend in Scrapwork (keep). |
| Slayer Master | Hunt Broker | Gives tasks and explains the ladder. |
| Turael | Ashen Tutor | World-1 master — easy assignments. |
| Mazchna | Mist Warden | World-2 master (end marker). |
| Vannaka | Iron Tutor | World-3+ (out of scope). |
| Tier Test | Apex Trial | Short boss fight that raises Slayer level. |
| Slayer task | Hunt Assignment | Kill quota on one monster tier. |
| Prayer | Vow Board | Permanent named skills. |
| Smithing | Anvil | Permanent weapon/special crafts. |
| Scrapwork | Scrap Bench | Spend scraps (keep). |
| Dwarf multicannon / Cannon | Bolt Battery | Recharging special ammo. |
| Chain Cannon | Ripple Battery | Multi-pulse special. |
| Auto-Cannon | Auto-Battery | Prayer that fires specials for you. |
| Hired helpers | Company | Auto attackers you hire. |
| Combat rank | Field Rank | Resets on prestige; gates first prestige. |
| Relic casket | Relic Casket | Permanent chest tube (keep). |
| Loot casket | Loot Casket | Boost chest tube (keep). |
| Challenges | Trials | Short goals → permanent chips. |
| Task Cards | Assignment Cards | Collectible task bonuses (SL 15). |

### Upgrades (player-facing)

| OSRS-style | Stand-in | Description |
|---|---|---|
| Bronze / Iron / Steel / Mithril / Adamant / Rune / Dragon weapon | same metal names OK short-term; stand-ins: Ash / Ember / Tide / Mist / Ironbark / Runemark / Drake | Gear ladder — keep costs. |
| Idle Power | Steady Hand | Faster AFK kills. |
| Unlock Crits | Lucky Hits | Turns crits on. |
| Crit Power | Heavy Crits | Bigger crits. |
| Special Cadence | Battery Tempo | Faster special recharge. |
| Bolt Pierce / Bounce | Pierce / Ricochet | Multi-target bolts (keep). |
| Hunter Power / Bigger Hits / Faster Attacks | Company Power / Heavier Swings / Quicker Strikes | Helper ladders (keep). |
| Offline Cap | Longer Watch | More offline minutes. |
| Boss Meter Focus | Trial Focus | Faster Tier Test meter fill. |
| Tempered Edge | Tempered Edge | Smithing permanent weapon %. |
| Sharp Eye / Thick Hide / Easy Assignments / Restful Sleep / Auto-Cannon | Keen Eye / Hard Swing / Soft Quotas / Deep Rest / Auto-Battery | First Prayer skills. |

### Helpers

| OSRS-style | Stand-in | Description |
|---|---|---|
| Hired Warrior | Thornblade | Melee helper; first hire. |
| Hired Archer | Quillshot | Ranged turret helper. |
| Hired Berserker | Mosshew | Heavy melee helper. |
| Hired Mage | Emberstaff | Magic helper. |

### Monsters & bosses (World 1 under Turael)

Replace bear-family chrome for W1 (pending approval — open decision #2). Wolves/spiders become Mazchna/Vannaka themes later.

| OSRS-style | Stand-in | Description |
|---|---|---|
| Crawling Hand | Gripkin | Tiny early task; teaches aim. |
| Cave Crawler | Cave Skitter | Adult mid task; tanky. |
| Banshee | Wailshade | Elite; points-heavy. |
| Rockslug | Stone Slug | Optional mid variant. |
| Infernal Mage (lite) | Cinder Adept | Optional late-W1 task. |
| **Tier Test 1 — Crawling Hand Champion** | Gripkin Elder | First boss; 45–90s. |
| Tier Test 2 — Cave Crawler Matron | Skitter Matron | Second test. |
| Tier Test 3 — Screaming Banshee | Wail Matron | Third test. |
| … Tests 4–19 | (theme from task tier) | Raise Slayer level each clear. |

*(Live Elder Thornpelt / Ashfang / Nightweave art can remap to champion skins until new art lands.)*

### Areas

| OSRS-style | Stand-in | Description |
|---|---|---|
| Turael’s Cave | Ashen Hollow | World-1 hunting grounds. |
| Mazchna’s Crypt | Mistvault | World-2 marker destination. |
| Level 1 / 2 / 3 chrome | Keep “Slayer level” as the number; area subtitle only in Codex | Avoid region-as-primary (already locked). |

---

## 5. What changes vs live today

| Verdict | System | Live today | After redesign | Cite |
|---|---|---|---|---|
| **KEEP** | Bolt sizing from target HP | `boltHpChipRaw` / boss HP in fights | Unchanged | `js/arena.js`; elder tuning |
| **KEEP** | Elder TTK band / hpMult 1.85 | 45–90s · HP≈278 | Tier Test 1 uses same band | `markedPrey.sewer_king`; elder tuning |
| **KEEP** | Offline cap 360 | `offlineCapMin=360` | Unchanged | `js/state.js` |
| **KEEP** | No attributes | bonuses via upgrades/relics/mastery | Prayer = named skills only | `getBonuses` |
| **KEEP** | Resource costs not time gates | no `minPlayMs` | Unchanged | `time-gates-to-costs.md` |
| **KEEP** | Hires on gold | Briar 140 / Quill 900 / Moss 2000 / Ember 4200 | Same prices; rename | `hunter_*` |
| **KEEP** | Independent helper damage track | `HUNTER_COMBAT` | Phase 1 keep; optional % link later | `DESIGN.md` |
| **KEEP** | Mastery 0–10 | `masteryGoldMult` etc. | Keep as per-task long-tail | `js/state.js` |
| **KEEP** | Scraps + Forge one-shots | `scrap_*` / `forge_*` | Fold under Smithing UI | `loot-sink.md` |
| **KEEP** | Dual caskets | chests.js | Keep (freebie twin) | *Side Systems* Freebies |
| **KEEP** | ACTIVE_MULT 1.4 / PLAYER_BASE_IDLE 0.75 | data.js | Keep | *Damage* “ACTIVE holding” |
| **CHANGE** | Progression gate | Level 1→2→3 via one boss each | **Slayer level 1…20** via many Tier Tests; Mazchna = W2 | New — modeled on OB ladder |
| **CHANGE** | Feature unlock schedule | Gold/Sp purchases anytime (affordability) | **Gated by Slayer level** cadence (still resource-priced) | wiki Obelisk unlocks |
| **CHANGE** | Specials | One pulse unlock 360g | Cannon + Chain + recharge/damage ladders; 0 dmg on Tier Tests | wiki Bombs |
| **CHANGE** | Run upgrade costs | Per-upgrade `costMult` | Shared IOM 1.3 curve on leveled run ups | wiki Upgrades |
| **CHANGE** | Skill depth | No skill tree | **Prayer** board @ SL 6 | wiki Skill-Tree |
| **CHANGE** | Prestige | Scaffolding `doPrestige` / Sigils; not L1–3 goal | Soft-open @ SL 10; teach permanent vs run | wiki Prestige; *Prestige* tab |
| **CHANGE** | Monster names (W1) | Bristle Cub / Thornpelt / Elder | OSRS task list §4 (or keep bears — decision #2) | creature-boss-families.md |
| **CHANGE** | Boss meter after L1 | 280 / 600 for L2/L3 only | Per Tier Test meters scaling §3.7 | level-boss-progression.md |
| **CHANGE** | Sigil Charter copy | Charter: Idle/Cap/Loot | Slayer reward artifacts (OSRS shop vibe) | `sigilShop` |
| **CUT / DEFER** | Pets / full Cards / full Construct statues | none / tiny forge | Defer past Phase 1; Cards-lite @15 only | *Side Systems*; Takeaway T10 |
| **CUT / DEFER** | RPG attribute sheet | none | Stay cut | *Skill Tree* |
| **CUT** | Time-gate UX | already cut | Stay cut | time-gates-to-costs.md |
| **CUT** | Word “quarry” | banned in copy | Stay banned | About sheet; quarry-rename.md |
| **CUT from W1 scope** | World 2+ floors, Fishing, Stargazing, Arcanist, etc. | n/a | Out of scope | About sheet; *Side Systems* “Later systems” |

---

## 6. What New Bot should implement (phases)

### Phase 1 — Minimum for first **30 minutes** to feel like IOM  
*(ship first; playtest before Phase 2)*

1. **Slayer level** state (1…) raised by Tier Test clears; chrome shows it.  
2. **Unlock ladder SL1–4:** Smithing panel stub · Cannon special @3 · Hire Warrior @4 (reuse Briar).  
3. **First buy ≤1 min:** ensure Iron or Idle Power affordable from first task coins (tune gold on Gripkin/Cub).  
4. **Cannon @ ~5 min:** 30s recharge; chip ≈4× bolt; gold unlock gated by SL3.  
5. **Warrior @ ~10 min:** keep 140g; gate visibility by SL4.  
6. **Tier Test 1 @ 20–40 min:** 120 Sp meter; 45–90s fight; bolts from boss HP; specials deal 0 to boss.  
7. **OSRS task names** for the three W1 hunt monsters + Test 1 boss (or flag if decision #2 keeps bears).  
8. **Shared 1.3 cost curve** on leveled run combat upgrades (`idle_power`, `crit_power`, `special_cadence`, helper ladders).  
9. **Prayer stub:** board unlocks SL6 with Sharp Eye + Thick Hide only (can sit locked until SL6 if playtest is <30 min).  
10. **Copy pass:** Slayer Master = Turael/Ashen Tutor; no “quarry”; Intro Tasks mention Slayer level / Cannon / hire.  
11. **Regression:** Elder/Test1 solo TTK still ~60s; offline cap 360; hires remain gold.

### Phase 2 — Rest of World 1 cadence (SL5–12)

- Chain Cannon · Loot Mark · full first 5 Prayer skills · Crits gated SL7 · Archer hire @8 · Challenges-lite @12 · prestige soft-open @10 with 1 artifact.  
- Tier Tests 2–10 with scaling meters/HP.  
- Specials mute on all Tier Tests.

### Phase 3 — Prestige readability + W1 end

- Full persist/reset messaging · Artifact T1–T2 · Cards-lite @15 · SL19 prep sinks · Mazchna gate marker + stub “World 2” screen.  
- Berserker/Mage hires on schedule.

### Phase 4 — Polish / art swap hooks

- Stand-in → OSRS string table behind a `USE_OSRS_NAMES` flag (default on for private).  
- Helper % of weapon weight experiment.  
- Pets deferred.

---

## 7. What Game Artist needs

- **Tier Test boss** read: apex of current task family (scale up); can remap Elder Thornpelt art short-term.  
- **Cannon / Battery** UI icon + muzzle flash (no new monster required for Phase 1).  
- **Prayer / Vow Board** panel frame (stone/beige, matches Progress).  
- **Slayer level badge** chip in header.  
- **Optional Phase 2:** Crawling Hand / Cave Crawler / Banshee cutouts if decision #2 replaces bears — else keep bear family art.  
- World-2 stub: Mazchna portrait silhouette.

## What Game Audio needs

**Nothing new.** Bed-only policy stands (`design/audio-bed-only.md`) — one AFK loop, no SFX. No IOM-style bomb stingers.

---

## 8. Out of scope

- World 2+ content (Mazchna tasks, floors 43+, monuments beyond the gate stub)  
- IOM side systems past W1 depth: Pets economy, full Cards/gilding, Construct statues/veins grind, Stargazing, Archaeology, Fishing, Arcanist, Lootfrogs, Black Hole  
- Monetization / gem IAP  
- Auto-Prestige (IOM skill needs OB30 — *Prestige* “Auto-Prestige”; out of W1 focus)  
- Copying IOM names, prose, or art  
- Public release under OSRS names (swap to stand-ins first)

---

## 9. Legal note

OSRS names (Slayer masters, monsters, Prayer, Smithing, cannon, metal tiers, etc.) are **Jagex IP**. Allowed for **private build / playtest** only. Before any **public or paid** release, switch every player-facing string to the **Original stand-in** column (and original creature art).  

AFK Slayer remains an **original** idle hunting game — **not affiliated** with Jagex or Checkbox Entertainment / Idle Obelisk Miner. Mechanics/structure may mirror IOM; names, text, and art must not.

---

## Open decisions (Alex)

**1. Helpers during Tier Tests?**  
- IOM: drones disabled on Obelisk (wiki Obelisk / Bombs).  
- **Recommendation:** mute helper damage on Tier Tests (weapon-only skill check); helpers still help on tasks. Matches IOM fantasy; keeps 45–90s tunable via weapon+Prayer+Smithing only.

**2. W1 monster roster?**  
- A) Swap L1 bears → OSRS Crawling Hand / Cave Crawler / Banshee ladder (names in §4).  
- B) Keep bear/wolf/spider families; only rename systems/masters.  
- **Recommendation:** **A for Turael’s Cave (W1)** so the OSRS ask is visible in the first session; park wolves → Mazchna, spiders → Vannaka. Remap existing bear art to champion skins until new sprites land.

---

## Approval

_Awaiting Alex skim. Once approved, New Bot starts Phase 1 only._
