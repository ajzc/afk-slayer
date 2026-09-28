# Design Brief — Creature boss families (3 themes)

**Status:** LOCKED (Alex 2026-09-23 — with `level-boss-progression.md`)  
**Date:** 2026-09-23  
**Game:** AFK Slayer  
**Owner:** Game Designer → New Bot (data/UI levels) · Game Artist (creature sprites)

**Progression chrome:** Levels show as **Level 1 / 2 / 3** (not named dens). Boss access = Slayer points → **Fight boss**. See `design/level-boss-progression.md`.

---

## 1. Goal (player feeling)

Every **Level** is a **creature family**: small → big → apex boss. The boss is the scariest adult of that animal line — not a random undead overseer. Players know the rung via **monster level** and **boss level** (30 → 69 → 720).

OSRS *energy* only in design notes. **Player-facing names are original.**

---

## 2. Rules / structure

### Levels (replace first three areas; named dens are Codex flavor only)

| # | Player chrome | Theme | Boss level | Codex subtitle (optional) |
|---|---|---|---|---|
| **1** | **Level 1** | Bears | **30** | Bear den |
| **2** | **Level 2** | Wolves | **69** | Ashfang pack |
| **3** | **Level 3** | Spiders | **720** | Nightweave |

Internal `areaId`s may keep old keys for saves; player never sees Undercroft / Fenwatch / etc. after ship.

### Per Level ladder (3 hunt monsters + 1 fightable boss)

| Slot | Role | Level rule |
|---|---|---|
| Monster A | Cub / pup / hatchling — tutorial-easy | ~25–40% of boss level |
| Monster B | Adult common | ~55–70% of boss level |
| Monster C | Elite / dire — unlocks before boss push | ~80–95% of boss level |
| **Boss** | Biggest, scariest of the family | **Exactly 30 / 69 / 720** |

Unlock chain: finish Task on A → unlock B → finish B → unlock C. Boss opens via **Slayer points** meter → **Fight boss** (not Progress→Claim). Boss is **not** a fourth idle hunt target until unlocked for the fight.

### Player-facing level chip
- Slayer Master / Hunt HUD: `Name · Lv N`
- Boss card: `Name · Lv 30` (etc.)
- `displayLevel` is fantasy pacing; combat uses `combat.*` / HP mults (see budget).

### Locked level numbers

**Level 1 — Bears (boss 30)**

| Name | Slot | Lv | Fight hook | Loot bias | Signature mat |
|---|---|---|---|---|---|
| Bristle Cub | A | **8** | Tiny, fast, frail — teach aim | scraps↑ | — |
| Thornpelt Bear | B | **18** | Tanky, slow, wide hit | gold mid · scraps | **Pelt Scrap** |
| Dire Thornpelt | C | **26** | Charger — short rush | Slayer points↑ | **Dire Claw** |
| **Elder Thornpelt** | Boss | **30** | Apex bear — live fight | relic | — |

**Level 2 — Wolves (boss 69)**

| Name | Slot | Lv | Fight hook | Loot bias | Signature |
|---|---|---|---|---|---|
| Ashfang Pup | A | **22** | Fast packling, low HP | scraps | — |
| Ashfang Wolf | B | **42** | Flanking strafe (aim pressure) | Slayer points↑ | **Ashfang Fang** |
| Dire Ashfang | C | **58** | Pack rush; short burst move | gold↑ | **Pack Hide** |
| **Ashfang Alpha** | Boss | **69** | Apex wolf — live fight | relic | — |

**Level 3 — Spiders (boss 720)**

| Name | Slot | Lv | Fight hook | Loot bias | Signature |
|---|---|---|---|---|---|
| Silkling | A | **180** | Swarm/clump small hits | scraps | — |
| Webfen Widow | B | **420** | Evasive strafe | Slayer points↑ | **Silk Thread** |
| Brood Matron | C | **600** | Clump nest; Pierce teaches | gold↑ | **Venom Sac** |
| **Nightweave** | Boss | **720** | Apex spider — live fight | relic | — |

*720 is display fantasy. Combat budget below keeps TTK fair.*

### Combat budget (so 720 doesn’t mean 24× grind)

| Boss Lv | Eff HP mult (vs base 150) | Gold avg band | Quota band |
|---|---|---|---|
| 30 | ~1.6–2.0 | low–mid | 25–80 |
| 69 | ~2.2–2.8 | mid–high | 80–150 |
| 720 | ~3.2–4.0 (not 24×) | high | 150–250 |

### Mastery themes (3 / 6 / 10)
- Bears: scrap / food-cap-ish  
- Wolves: Slayer points / gold  
- Spiders: offline / evade payoff / bolt focus  

Concrete perk lines can mirror old Undercroft math in a follow-up.

### Boss access (Slayer points) — see progression brief

| Level | Boss | Access cost |
|---|---|---|
| 1 | Elder Thornpelt · 30 | **120** |
| 2 | Ashfang Alpha · 69 | **280** |
| 3 | Nightweave · 720 | **600** |

---

## 3. Plain-language names (locked)

| Level | Monsters | Boss |
|---|---|---|
| Level 1 | Bristle Cub · Thornpelt Bear · Dire Thornpelt | **Elder Thornpelt · Lv 30** |
| Level 2 | Ashfang Pup · Ashfang Wolf · Dire Ashfang | **Ashfang Alpha · Lv 69** |
| Level 3 | Silkling · Webfen Widow · Brood Matron | **Nightweave · Lv 720** |

miniDesc examples:
- Bristle Cub — `Soft-furred cubs that tumble in fast and fold quick. · Lv 8`
- Elder Thornpelt — `Apex of the den — the bear every hunter measures against. · Lv 30`
- Ashfang Alpha — `Pack leader. Earn Slayer points, then fight it. · Lv 69`

---

## 4. What New Bot should implement

1. Player chrome = Level N; migrate old Undercroft contracts → bear line (prefer migration table).
2. `displayLevel` on contracts + bosses; show `· Lv N`.
3. Retune `combat.*`, gold, quotas per budget; independent hunter track stays.
4. Signature mats: Pelt Scrap / Dire Claw / Ashfang Fang / Pack Hide / Silk Thread / Venom Sac (Hands-era mats migrate 1:1 where sensible).
5. Boss = fightable arena target after Slayer-point unlock (not Progress→Claim only).
6. Strip Jagex-flavored leftover names from player copy.
7. Intro Tasks: Bristle Cub / Earn Slayer points / Defeat Elder Thornpelt.

---

## 5. What Game Artist needs

Full creature sheet per family (A/B/C/boss), same silhouette language within a family, boss clearly largest. Priority: **Level 1 bears**, then wolves, then spiders. Archive Undercroft hands/spectres/mages art. Stone **Level N** badge chip.

---

## 6. Out of scope

- Level 4+ / drake family (parked)  
- Literal OSRS names on player UI  
- Rewriting Scrapwork/Forge beyond mat id retarget  
- Making displayLevel drive live DPS formulas  

---

**LOCKED** with `level-boss-progression.md` — bears → wolves → spiders · bosses 30 / 69 / 720 · fight via Slayer points.
