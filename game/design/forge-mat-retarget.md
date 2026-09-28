# Design Brief — Forge mat retarget (Levels families)

**Status:** LOCKED overnight for New Bot (2026-09-24) — keeps `loot-sink.md` structure  
**Game:** AFK Slayer  
**Owner:** Game Designer → New Bot  
**Supersedes:** Grip Scrap / Wail Shard / Ember Core in player-facing Forge + Codex  
**Does not replace:** Scrapwork scraps table (unchanged)

---

## 1. Goal

Forge spends **Level creature trophies**, not Undercroft leftovers. Same sink fantasy: permanents once + 10‑min boosts. All six locked signature mats are spendable.

---

## 2. Mat catalog (locked)

| Level | Slot | Mat id | Player name | Drops from |
|---|---|---|---|---|
| 1 | B | `pelt_scrap` | **Pelt Scrap** | Thornpelt Bear |
| 1 | C | `dire_claw` | **Dire Claw** | Dire Thornpelt |
| 2 | B | `ashfang_fang` | **Ashfang Fang** | Ashfang Wolf |
| 2 | C | `pack_hide` | **Pack Hide** | Dire Ashfang |
| 3 | B | `silk_thread` | **Silk Thread** | Webfen Widow |
| 3 | C | `venom_sac` | **Venom Sac** | Brood Matron |

Bosses still drop relic only (no signature mat required).

### Save migration (1:1)

| Old key | → New key |
|---|---|
| `grip_scrap` | `pelt_scrap` |
| `wail_shard` | `dire_claw` |
| `ember_core` | `ashfang_fang` |

If new keys already exist, sum counts then drop old keys. Hide old names in UI.

---

## 3. Forge recipes (same power as loot-sink)

### Permanents (once each · prestige-keep)

| id | Name | Cost | Effect | Was |
|---|---|---|---|---|
| `forge_pelt_guard` | **Pelt Guard** | **10 Pelt Scrap** | **+6%** global scrap chance | Knuckle Guard |
| `forge_fang_charm` | **Fang Charm** | **10 Ashfang Fang** | **+12 min** offline cap | Echo Charm |
| `forge_thread_tip` | **Thread Tip** | **10 Silk Thread** | **+4%** bolt `killMult` | Cinder Tip |

Internal: map old `forge_knuckle` / `forge_echo` / `forge_cinder` → new ids (or keep ids, swap `costMats` + labels). Purchased flags migrate with the remap.

### Timed boosts (3 mats · **10 min** · same boost-slot rules)

| id | Name | Cost | Effect 10 min | Was |
|---|---|---|---|---|
| `forge_claw_rush` | **Claw Rush** | **3 Dire Claw** | **+25%** scrap chance | Grip Rush |
| `forge_pack_focus` | **Pack Focus** | **3 Pack Hide** | **+15%** Slayer points | Wail Focus |
| `forge_venom_barrage` | **Venom Barrage** | **3 Venom Sac** | **+10%** bolt `killMult` | Ember Barrage |

Soft-cap scrap chance **95%** unchanged. Scrapwork table unchanged.

---

## 4. Copy

- Codex Scraps: `Secondary loot from kills. Spend in Camp → Scrapwork. Signature mats craft in Camp → Forge.`
- List mats: Pelt Scrap, Dire Claw, Ashfang Fang, Pack Hide, Silk Thread, Venom Sac.
- Header scraps tooltip unchanged.

---

## 5. What New Bot implements tonight

1. Signature drops on contracts use new mat ids (table §2).  
2. Migrate old mat keys 1:1.  
3. Forge UI/recipes use §3 names + costs; effects identical to loot-sink.  
4. Strip Grip Scrap / Wail Shard / Ember Core / Knuckle Guard / Echo Charm / Cinder Tip / Grip Rush / Wail Focus / Ember Barrage from player copy.  
5. QA: grant each mat; buy each permanent + boost; prestige keeps permanents.

---

## 6. Out of scope

- Changing Scrapwork costs/effects  
- Converting mats between types  
- Boss signature mats  
- Artist icons (placeholders fine)

---

**LOCKED** — loot-sink stays; mats + Forge labels retarget to Level families.
