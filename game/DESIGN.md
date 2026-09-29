# AFK Slayer — Design Summary

Original AFK idle fantasy guild game (Slayer-adjacent vibe). **Not affiliated with Jagex/RuneScape or Idle Obelisk Miner.**

## Naming

- **App Store / player-facing name (locked):** AFK Slayer
- **Original IP only** — no Jagex assets or names in art, audio, or copy
- Working folder `contract-board` is internal only; save key `contractBoard_v1` stays

## Systems implemented

### Core loop
Accept Task → hunt with directional bolts (solo at start) → hire hunters later → earn gold / scraps / **Slayer points** → Progress unlocks → fill Slayer-point boss meter → **Fight boss** → relic + **Level N+1** unlock → prestige (Charter Rewrite) for Sigils. Player chrome is **Level 1 / 2 / 3** (not Undercroft). Full briefs: `design/level-boss-progression.md`, `design/creature-boss-families.md`.

### Live Hunt arena
**Directional bolt combat:** hold finger/mouse → bolts fire from the player toward the hold direction. Hits the first monster along the aim ray (lateral width ~10.2% (+ soft ~16° aim assist)). One splat per bolt impact. No lock-on beam, track meter, on-target ring, or whiff-shake. Quill fires visible arrows; Briar/Moss swing arcs. Per-Level monster unlock + mastery 0–10 (bounty chest ~0.5%+ on finish). Level creature families (bears / wolves / spiders) have distinct combat, loot, and mastery perks — see locked briefs. Visual language: earthy stone/beige UI.

**Spawn park pool:** ~10 spread slots across the arena; living mobs pick free spots (avoid stacking). Walk-ins from sides still apply.

**Kill rewards:** each arena death awards a small coin burst (float + real gold). Scales lightly with contract gold range × `mult`.

**HUD:** monster name top-right only (no area-name / Undercroft banner strip); center hint for bolt controls; XP dock bottom-right; casket tubes left. Empty contract: **no full-screen CTA** — task dock pulses with “Pick a task at Slayer Master” + button. Ready caskets **jiggle every ~5s** (no ready toasts). Top feed slowed; no Food low / Auto hunting / casket % spam.

### Pacing constants (independent hunter combat)
| Constant | Value | Role |
|---|---|---|
| `GLOBAL_DMG_MULT` | `0.12` | Bolt chip scale ref (via `boltHpChip`) — **player only** |
| `ATTACK_SPEED_MULT` | `40` | Player bolt interval dampening — **player only** |
| `HUNTER_DMG_MULT` | `1.0` | Global hunter-chip scale — **hunter track only** |
| `BEAM_POWER_MULT` | `0.015` | Bolt power (legacy key; DPS ballpark of former beam) |
| `ACTIVE_MULT` | `1.4` | Holding economy boost |
| `PLAYER_BASE_IDLE` | `0.75` | Solo kill-rate contribution |
| `MONSTER_VISUAL_HP` | `150` | Arena HP pool (integer chips) |
| `HUNTER_COMBAT` | per hunter | Independent base `dmg` + `attackIntervalMs` |
| Bolt base interval | `120–135ms` | Before dampened `ATTACK_SPEED_MULT` (~1.19s early) |
| Walk-in duration | `2.0–3.0s` | Side enter lerp |

**Independent damage tracks:** Player bolt damage / fire rate come only from player gear, combat upgrades, and bolt boosts (`killMult`). Hunter chips / cadence come only from `HUNTER_COMBAT` bases + Company upgrades (`hunter_damage`, `hunter_atk_speed`, `hunter_power`). **Upgrading the player never changes hunter chips; upgrading hunters never changes bolt damage.** There is no live formula that sizes hunter DPS from player bolt DPS.

**`HUNTER_COMBAT` starting bases** (hire-time, no upgrades):

| Hunter | Base dmg / hit | Base attack interval | Notes |
|---|---|---|---|
| Briar | 11 | 1900 ms | Melee; real chase downtime (~72% uptime) |
| Quill | 4 | 1200 ms | Stationary turret (full uptime) |
| Moss | 13 | 2100 ms | Melee (same independent model when hired) |
| Ember | 5 | 1300 ms | Mage (same independent model when hired) |

**Splat honesty:** every real hit splat equals the integer HP removed (player bolts, hunters, specials). Soft/spark hits stay cosmetic only (pulse, no HP, no numeric splat); disabled during hold.

**Hunt contrib chips** (Briar/Quill/… under the arena): show **combat** estimate `N dmg · ~X k/m`, not AFK idle labor. Per hunter: sustained DPS = expected chip (`HUNTER_COMBAT.dmg` × hunter power/dmg mults) ÷ attack interval (`attackIntervalMs` ÷ hunterAtkSpeed) × chase uptime (melee ~72% at hire, scales mildly with move speed; ranged/mage 100%). Then `k/m ≈ (DPS / MONSTER_VISUAL_HP) × 60` for the active monster HP pool (`combat.hpMult`). Player bolts are never mixed into these chips. Economy `killRatePerMin` (gold/min, offline) still uses the separate idle labor formula.

**Early-game starting balance (one-time tune, not a live ratio):** Crawling Hands HP 150, fresh upgrades. Player bolt ~12/hit @ ~0.84/s (~10 DPS, ~15s solo). Briar ~11/hit @ ~0.53/s in-range (eff. ~4.2 DPS w/ ~72% chase uptime). Quill ~4/hit @ ~0.83/s (~3.3 DPS). Combined hunters ≈ **75% of early player DPS** as a starting ballpark only — after that the tracks diverge via separate upgrades. Party TTK ~8.5s vs player-alone ~15s.

### Bolt aesthetic tiers
`beamTier` / `beam_focus` upgrade still drives visual tier on player bolts (`bolt-tier-0`…`3`).

### Dual chest tubes (left of arena)
1. **Purple Relic Casket** — permanent upgrades (~10 min base fill).
2. **Teal Loot Casket** — timed boosts (~4 min fill).

When ready: bars jiggle ~every 5s — **no toast**. Crit bonuses from chests only apply after `features.crits` unlocked.

### Gear ladder (resource costs)
Bronze (starter/free) → Iron → Steel → Mithril → Adamant → Rune → Dragon. Former play-time targets are now gold/points costs (see `design/time-gates-to-costs.md`). `state.playMs` still increments but does **not** gate purchases.

### Company (hunters) — start with NONE
| Hire | Cost (resource) | Former time target |
|---|---|---|
| Briar | 140 gold | 15 min |
| Quill | 900 gold | 1.5 h |
| Moss | 2000 gold | 3 h |
| Ember | 4200 gold | 5 h |

**Hunter combat upgrades** (Progress → Company; hunter track only — labels make independence obvious):
| Upgrade id | Label | Effect |
|---|---|---|
| `hunter_power` | Hunter Power | **+30%/lv** overall hunter output (live chips × AFK idle) |
| `hunter_damage` | Bigger Hits | **+40%/lv** per-hit damage only (swings/arrows) |
| `hunter_atk_speed` | Faster Attacks | **+30%/lv** attack speed (not walk) |
| `hunter_swift_step` | Swift Walk | **+55%** melee walk/chase (Briar/Moss) |
| `hunter_pace` | Faster Chase | **+70%** melee walk/chase (stacks) |
| `hunter_charge` | Hard Charge | **+90%** melee walk/chase (stacks) |

Power × Bigger Hits both multiply live chips (`chip × hunterPower × hunterDmg`) — Power also scales AFK `hunterIdle`; Bigger Hits is hit-only. Faster Attacks shortens `attackIntervalMs`. Walk chain never changes attack rate. Map nodes show `upgrade.desc` (exact %). Purchase toasts name the %. Player bolts stay on Combat / Gear.

### Feature unlocks
`state.features = { crits:false, specials:false, beamTier:0 }`
- Crits start at 0; unlock via Progress → Combat `unlock_crits` (gold cost)
- Specials (heavy bolt pulse) via `unlock_specials` (gold cost)

### Progress tab (was Maps; Upgrades removed from nav)
Data-driven flowcharts in `js/data.js` → `progressionMaps` `{ combat, gear, company, camp }`. Rendered by `js/maps.js` with sub-toggles. Combat/Gear/Company unlock power; **Camp** is food/offline/luck + Sigil charter (not a second gear list).

### Idle / offline formula
- `KillRate/min = 2.5 × idlePower × (PLAYER_BASE_IDLE + hunterIdle) × areaMult × contractMult × boostKillMult` (× `ACTIVE_MULT` while holding).


### Food (Camp)
Hunters eat **Food** while AFK. Empty food slows/stops idle hunting — buy food or wait for refill. Camp upgrades grow stock (`food_cap`, UI: Bigger Food Stock) and efficiency (`food_eff`). HUD: `Refills: X / min` and `Efficiency: normal` or `−N% food per kill`. Internal ids (`food_cap`, `ca_larder`) kept for saves.

### Level boss (was Area Boss / Marked Prey) — LOCKED
Player chrome: **Level 1 / 2 / 3**. Earn **Slayer points** on that Level’s Tasks/kills toward a boss-access meter (costs 120 / 280 / 600). When full, tap **Fight boss** — live arena kill of the apex creature (Elder Thornpelt · Lv 30 / Ashfang Alpha · Lv 69 / Nightweave · Lv 720). Win → relic + next Level. Mid-fight leave resets boss HP; access stays unlocked once paid. Briefs: `design/level-boss-progression.md`, `design/creature-boss-families.md`. Internal `chip` / `prey_chip` / `points` keys may remain for saves.

### Bolt Pierce & Bounce (Progress → Combat)
- **Pierce** (`bolt_pierce`, max 2): bolt continues along the aim ray through foes. Damage falloff: 100% → 60% → 35%.
- **Bounce** (`bolt_bounce`, max 2): after the pierce chain ends, ricochet to nearest other living mob within range. Falloff: 50% → 25% of base.
- **Order:** pierce along ray first; bounce only when no further pierce targets remain on the ray.

### Timed boosts (live Hunt)
`killMult` on Frenzy / Crit Surge / Bomb Barrage scales **live bolt damage and fire rate**, not only AFK kill rate. Bomb Barrage also caps interval lower and can splash a nearby mob (~35% chip). Boost pill shows plain text like `Bomb Barrage · bolts +50% · 32s`.

### Arena figure scale
Hunter drones and monsters render at **72%** scale (`transform: scale(0.72)` on `.mob` / `.drone-scale` — 20% larger than the prior 0.6). Player figure unchanged. Melee hunters use ~11% arena radius and must walk into range before swinging.

### Melee chase pace (Briar / Moss)
Base walk speed is deliberately sluggish at hire (`MELEE_SPEED` 28%/s). Progress → Company: **Swift Walk** (+55%), **Faster Chase** (+70%), **Hard Charge** (+90%) stack additively on `hunterMoveSpeed` (soft cap ~92%/s so each buy stays visible). Approx chase: hire ~28%/s → Swift Walk ~43 → Faster Chase ~63 → Hard Charge ~88. **Quill** is stationary on a stone plinth/turret (no sway/walk); Ember keeps mild station sway. Tiny name tags under each hunter. **Faster Attacks** is attack rate only — not this walk chain.

### Task bar
Bottom gold bar is **strict kill count** toward the contract quota, labeled `Task · N / Q kills` (integers only). Advances only when monsters die (arena kills on Hunt, or whole idle kills while Hunt is not owning progress). Not a timer, points, or XP bar. Finish reward stays on the dock.

### Bolt-aim hint
Center tip “hold toward a monster…” teaches once, then fades after ~4 bolts or ~2s hold. Persists `state.hints.boltAim`.

### Kill-coin VFX
Kill coin floats last ~1.55–1.7s with slower rise/fade and larger "+N coins" text. Multi-kills stagger VFX (~90ms); gold is still awarded instantly.

### Persistence
`localStorage` key `contractBoard_v1`. Migrates `playMs`, `features`, hunter hire flags, `hints`. QA: `CB_GAME.simulateAway(min)`, `CB_GAME.setPlayMs(ms)`, `CB_GAME.fillChests()`.

### UI
SPA tabs: Hunt, Slayer Master, **Progress**, Guild, Codex. Stone/beige beveled panels.


### Intro Tasks (first-run only)
New saves get a 20-step Intro Tasks **dropdown on the Hunt arena** (`state.intro`) — Obelisk-style compact panel (gold border, dark translucent body, header chip `Intro Tasks (N/20)`, gem-ended progress bar). Collapsed = header only; expanded = objective + bar + Complete. Does **not** block the arena (no modal/popup/banner/arrow overlay). Light `intro-point` outline on target controls only. Existing/experienced saves (`playMs > 5m` or kills/contracts already) migrate with `intro.completed = true`. QA: `CB_GAME.resetIntro()`. Unlocks are resource-cost only (no play-time gates).


### Rank XP
Rank XP still accrues in the background while hunting (account milestones). **No Rank XP dock / floats on Hunt** — removed from the arena HUD.

### Hunt HUD (calm layout)
- **Top-right:** Monster name only (small)
- **Left:** Casket tubes (jiggle when ready)
- **Bottom:** Task · N / Q kills + finish reward
- No in-arena Gold/Food pills (header already shows them)
- No Rank XP dock
- Dense live-stat chips, gear strip, and slayer panel are sync-hidden; event ticker is quiet
- Melee: clean arm/sword swing only (no yellow slash-arc / neon swing glow)
- Quill arrows: ~24×6px, soft glow

### Longer Away Time (Loot Casket)
Timed boost: +45 min to how long offline progress can build up, for the next 10 min. (Formerly “Cap Stretch”.)

### Scraps + Forge (loot sink) — LOCKED
Full brief: `design/loot-sink.md`.

- **Scraps:** show in header when `scraps ≥ 1` (or after first Hands task). Spend in Camp → **Scrapwork**.
- **Scrapwork** (scraps currency, weaker than gold Camp): Scrap Magnet +4% scrap/lv · Scrap Larder +20 food cap +0.2/min · Wick Wire +5 min offline · Gild Dust +3% gold loot. Soft-cap scrap chance **95%**.
- **Forge** (signature mats in `state.mats`): permanents once each — **Pelt Guard** (10 Pelt Scrap, +6% scrap) · **Fang Charm** (10 Ashfang Fang, +12 min offline) · **Thread Tip** (10 Silk Thread, +4% bolt killMult). Prestige-keep. Brief: `design/forge-mat-retarget.md`.
- **Forge boosts** (10 min, 3 mats): **Claw Rush** (Dire Claw) +25% scrap · **Pack Focus** (Pack Hide) +15% Slayer points · **Venom Barrage** (Venom Sac) +10% killMult.
- Mats by Level: L1 Pelt Scrap / Dire Claw · L2 Ashfang Fang / Pack Hide · L3 Silk Thread / Venom Sac. Migrate grip→pelt, wail→dire_claw, ember→ashfang_fang.
- Codex Scraps body: spend in Scrapwork; mats craft in Forge.

### Level creature families — LOCKED
Player-facing term is **monster** (not quarry). Slayer Master: `Level N · Hunt targets`.

| Level | Family | Hunt ladder | Boss (display Lv) |
|---|---|---|---|
| 1 | Bears | Bristle Cub → Thornpelt Bear → Dire Thornpelt | **Elder Thornpelt · 30** |
| 2 | Wolves | Ashfang Pup → Ashfang Wolf → Dire Ashfang | **Ashfang Alpha · 69** |
| 3 | Spiders | Silkling → Webfen Widow → Brood Matron | **Nightweave · 720** |

Signature mats (ship): Pelt Scrap · Dire Claw · Ashfang Fang · Pack Hide · Silk Thread · Venom Sac. Combat fields on contract data (`combat.*`) via `arena.js`. Mastery perks via `getBonuses`. Old Undercroft Hands/Banshees/Mages identities are **superseded** (archive art; migrate mats where sensible). Details: `design/creature-boss-families.md`.

## IOM-style redesign (locked 2026-09-24)
See design/iom-style-redesign.md and design/benchmarks-not-timers.md. Supersedes the Level/bear ladder for the first portion: Slayer level is the main gate, Turael is the first master, Mazchna marks the World-2 equivalent at SL20. Helpers are muted in boss fights. OSRS names are for private playtest only; stand-ins are listed for the swap.

## Equip gear ladder (2026-09-24, revised)
See design/visual-gear-ladder.md. The visual is always what is equipped: visibleGear(state) reads equipped items, never Slayer level. Weapon is the existing ladder. Legs open at SL5 (weapon dmg), Body at SL7 (loot gold), Helm at SL9 (crit). Each slot goes Leather, then Bronze to Dragon, bought in Smithing with gold on the 1.3 curve (x1.3^3 per tier). Metal armor tier is at most the weapon tier. Earned items: Slayer cape on first prestige (offline cap, trims per prestige) and Slayer helm at the Mazchna gate (crit plus Slayer points). The hunter is plain through SL4.

## Early kill cut (locked 2026-09-24)
See design/early-quota-cut.md. Until Hire Warrior is owned, task kill quotas are x0.2 (floor 2) and per-kill gold and Slayer points are x5, so each task pays the same. That means 9 kills to SL4 instead of 44.

## Monsters on screen (2026-09-28)
See design/monster-count.md. On screen = 1 + hired helpers + 1 if any multi-hit bolt (pierce/bounce/multishot), capped at 3. Cannon does not count because it is single-target. Solo respawn is 150 ms plus a 0.6 s edge walk-in. Tier Tests stay at 1.

## Slayer XP (live as xp1 2026-09-28; retune proposed Sep 28)
See design/slayer-xp.md. Every task kill gives Slayer XP, round(10 x area.mult x contract.mult): 10-12 on L1, 17-20 on L2, 29-36 on L3. That's x5 in the early window and 50% for offline/idle kills, with at most 1 level per offline claim. A first clear gives one full task's worth of XP. A Tier Test win is a guaranteed +1 SL, and XP stops at 99% before a Tier Test's gateLevel (5/9/13) until it is won. The curve is 150 x 1.66^(L-1) to SL13, then x1.2 per level: 150 XP for SL2, 948,550 total for SL20, about 6.9 h in the sim. The HUD bar shows XP ("SL 4 · 120/690 XP"), and task progress stays on the task card. Migration keeps SL and starts XP at 0. **Retune Sep 28 (faster SL4):** toNext SL1-3 150/250/410 → 100/120/180 and Crawling Hand hpMult 0.70 → 0.40. In the sim that moves SL4 (Warrior) from 3.5 min to 69 s. SL2 lands at 18 s and SL3 at 46 s. Tier Test 1 is now the SL5 gate (3.8 min).
