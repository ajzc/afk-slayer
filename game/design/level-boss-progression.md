# Design Brief — Level progression + Slayer points → boss fight

**Status:** LOCKED (Alex 2026-09-23 — designer pick: structure + L2 wolves / L3 spiders)  
**Date:** 2026-09-23  
**Game:** AFK Slayer  
**Owner:** Game Designer → New Bot · Game Artist (boss arena read)

**Supersedes for progression UI:** area names as primary (Undercroft / Fenwatch / …).  
**Pairs with:** `design/creature-boss-families.md` (creature ladders + boss display levels 30 / 69 / 720).

---

## 1. Goal (player feeling)

The board is a **Slayer ladder**. You always know: *I’m on Level 1. I need Slayer points to open the boss. I fight it. I clear it. Level 2 unlocks.*  
No fantasy area title in the main chrome — just **Level N**. Creatures still theme the monsters inside that level.

---

## 2. Rules

### Levels (primary structure)

| Level | Player label | Boss display Lv | Creature family |
|---|---|---|---|
| **1** | **Level 1** | **30** | Bears — Bristle Cub → Thornpelt Bear → Dire Thornpelt → **Elder Thornpelt** |
| **2** | **Level 2** | **69** | Wolves — Ashfang Pup → Ashfang Wolf → Dire Ashfang → **Ashfang Alpha** |
| **3** | **Level 3** | **720** | Spiders — Silkling → Webfen Widow → Brood Matron → **Nightweave** |

- Slayer Master / Hunt / header: **Level 1** (not “Undercroft”).
- Optional small subtitle under Level only in Codex: “Bear den” — never replaces Level N in chrome.
- Internal `areaId`s may remain for saves; player-facing string = `Level ${n}`.

### Currencies (clarify)

| Name (player) | What it is | Role |
|---|---|---|
| **Slayer points** | Was “points” / contract points | Earn on kills + Task finish; spend/threshold to **open the Level boss** |
| Gold / scraps / mats | unchanged | Economy / Scrapwork / Forge |
| Rank XP | unchanged | Account ranks (background) |

Rename player copy: **Slayer points** everywhere “points” meant contract progress currency. Internal save key can stay `points` for migration.

### Path on a Level

1. **Hunt** Level N monsters (creature ladder A → B → C unlocks as today via Task finishes).
2. Each kill / Task finish grants **Slayer points** (use existing `pointsPerKill` + finishBonus as the rates).
3. Fill **Boss access** meter: `slayerPointsOnLevel` toward `bossCost` for that Level.
4. When full → **Boss unlocked** (not auto-claimed). Player taps **Fight boss** on Hunt / Slayer Master.
5. **Boss fight** = live Hunt arena encounter (same bolt combat), boss uses boss HP/combat kit. Task bar becomes boss HP or “Boss · damage/HP” — one clear kill.
6. On boss death → relic (keep), **Level N cleared**, unlock **Level N+1**, reset level Slayer-point meter for the new level.

### Boss access costs (Slayer points)

| Level | Boss | Access cost (Slayer points) | Notes |
|---|---|---|---|
| 1 | Elder Thornpelt · 30 | **120** | ~ a few Tasks on early bears |
| 2 | Ashfang Alpha · 69 | **280** | |
| 3 | Nightweave · 720 | **600** | |

Tune against `pointsPerKill` so Level 1 access ≈ **20–40 min** engaged for a new player (same spirit as old Area Boss fill).

**Replace** the old Area Boss “Progress chip bar from area kills → Claim.” That bar becomes **Slayer points toward boss** → **Fight**.

### Banking rule (locked)
- Slayer points are **per-level progress** toward that level’s boss.
- **Paying access unlocks the boss permanently for that level until beaten.** Meter cost is spent to open the fight; if you flee/fail, access stays unlocked.
- On boss kill / level-up, that level’s meter resets for bookkeeping; next level starts its own meter at 0.

### Fail / leave boss fight
- Leaving Hunt mid-boss: boss HP **resets** next entry (v1 fairness).
- Access stays unlocked once paid.

### After Level 3 boss
- Prestige / Charter hook or “more levels later” — out of scope beyond a clear end card.

### What players see

| Surface | Copy |
|---|---|
| Tab / chapter | `Level 1` |
| Slayer Master header | `Level 1 · Hunt targets` |
| Boss card (locked) | `Elder Thornpelt · Lv 30` · `Slayer points 45 / 120` |
| Boss card (ready) | `Fight boss` |
| After win | `Level 1 cleared — Level 2 unlocked` |

Monster cards: `Thornpelt Bear · Lv 18` (creature brief levels stand).

---

## 3. Plain-language names

- **Slayer points** — earned from hunting; open the Level boss.
- **Fight boss** — starts the apex creature fight for this Level.
- **Level cleared** — boss dead; next Level unlocks.

---

## 4. What New Bot should implement

1. Player-facing area title → `Level ${order+1}` (hide Undercroft/Fenwatch/Bonevault strings).
2. Rename UI “points” → **Slayer points**; keep save key `points` or migrate.
3. Replace Area Boss progress/claim with: per-level meter → unlock → **Fight boss** arena encounter → on kill unlock next level + relic.
4. Boss as fightable target: combat stats from creature brief budget; displayLevel 30/69/720.
5. Intro Tasks: “Earn Slayer points,” “Unlock the Level 1 boss,” “Defeat Elder Thornpelt.”
6. Codex / tips update; remove “Area Boss Progress” wording.
7. Levels 2–3 creature data: Ashfang line / Nightweave line per `creature-boss-families.md`.

---

## 5. What Game Artist needs

Boss should read as apex of the Level’s animals (scale up). Level badge UI chip (`Level 1`) in stone style.

---

## 6. Out of scope

- Levels 4+  
- Spending leftover Slayer points on a shop (meter is for boss access only in v1)  
- Multi-phase boss mechanics beyond HP + existing combat hooks  
- Reverting to named regions as primary chrome  

---

## Approval

**LOCKED** 2026-09-23 — Level N chrome · Slayer points → Fight boss → next Level · L1 bears · L2 wolves · L3 spiders.
