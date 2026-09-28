# Design Brief — Undercroft monster identities

**Status:** Locked & shipped (New Bot 2026-09-23, `?v=monsters1`; matches live `js/data.js`)  
**Date:** 2026-09-23  
**Owner:** Game Designer → New Bot implements · Game Artist for visual hooks  
**Area:** Undercroft (`sewers`) — three hunt targets only

---

## 1. Goal (player feeling)

Each Undercroft monster plays and pays differently within the first session. Hands teach “hold and soak.” Banshees teach “aim matters.” Mages teach “Pierce is worth buying.” Mastery feels like specializing in that monster’s fantasy, not a flat % on everything.

---

## 2. Rules / numbers (shippable now)

Shared arena: `MONSTER_VISUAL_HP` 150 × `combat.hpMult` (Mages: use `hpMultNoPierce` until player has Pierce ≥ 1).

| Monster | Contract id | Quota | Gold/kill | Scrap chance | Points/kill | Finish | Food/kill |
|---|---|---|---|---|---|---|
| Crawling Hands | `cave_rats` | 25 | 1–2 | 28% | 1 | 15 | 0.35 |
| Banshees | `tunnel_bats` | 60 | 2–4 | 12% | 1.8 | 35 | 0.45 |
| Infernal Mages | `drain_leeches` | 100 | 4–9 | 16% | 1.4 | 60 | 0.5 (+18% ×2 food drop) |

### Fight hooks (`contract.combat`)

| Monster | Identity | Key combat fields |
|---|---|---|
| **Crawling Hands** | Tanky, slow, easy to hit | `hpMult 1.4`, `moveMult 0.55`, `spawnMult 0.65`, `wanderAmp 0.55`, `aimAssistMod +2`, `hitWidthMult 1.15` |
| **Banshees** | Frail, fast, evasive | `hpMult 0.7`, `moveMult 1.5`, `spawnMult 1.45`, `wanderAmp 1.7`, `aimAssistMod -8`, `hitWidthMult 0.72` |
| **Infernal Mages** | Clumped; tougher until Pierce | `hpMult 1.0`, `hpMultNoPierce 1.35`, `moveMult 0.95`, `spawnMult 1.1`, `wanderAmp 0.8`, `clump: true` |

**Feel targets (solo, early):** Hands ~slow TTK / forgiving aim. Banshees ~faster deaths but more whiffs without tracking. Mages ~mid TTK that drops once Pierce 1 is owned (no new mechanic beyond existing pierce + clump packing).

### Loot bias + signature drops

| Monster | Loot fantasy | Signature mat | Drop chance |
|---|---|---|---|
| Crawling Hands | Scrap-heavy | **Grip Scrap** (`grip_scrap`) | 12% |
| Banshees | Points-leaning, low scrap | **Wail Shard** (`wail_shard`) | 10% |
| Infernal Mages | Gold + food drops + ember | **Ember Core** (`ember_core`) | 10% |

Signature mats: inventoriable chips (catalog in `signatureMats`). Spend sinks later — **out of scope** for this brief; still show name/emoji on drop / card.

### Mastery perks (Improve bounty → mastery 0–10; perks at 3 / 6 / 10)

**Crawling Hands** — scrap specialist  
- 3: +5% global scrap chance  
- 6: +8% global scrap chance  
- 10: +12% global scrap chance  

**Banshees** — points + offline  
- 3: +4% contract points  
- 6: +15 min offline cap  
- 10: +8% points · +20 min offline cap  

**Infernal Mages** — camp + bolt feel  
- 3: +5% food efficiency  
- 6: +4% bolt focus feel (`killMult`)  
- 10: +8% food efficiency · +6% bolt focus  

Bounty finish chest ~0.5%+ on Task finish stays global (existing); not re-tuned here.

### Unlock chain
Area starts with Hands unlocked. Finish Hands Task → unlock Banshees. Finish Banshees Task → unlock Infernal Mages. Area Boss (Undercroft Overseer) does **not** add a fourth Undercroft monster.

---

## 3. Plain-language names + one-line descs

| Name | `miniDesc` (Slayer Master / unlock / Bestiary) |
|---|---|
| Crawling Hands | Tanky scrap-crawlers that lumber in slow and soak bolts. |
| Banshees | Frail shriekers that dart fast and slip past lazy aim. |
| Infernal Mages | Clumped casters with a shield until Pierce; gold and ember loot. |

Mat one-liners:  
- Grip Scrap — Twitchy knuckle metal from Crawling Hands.  
- Wail Shard — Frozen scream crystal from Banshees.  
- Ember Core — Warm mage-heart ember from Infernal Mages.  

Player nouns: **monster** / **hunt target** only (see `design/quarry-rename.md`).

---

## 4. What New Bot should implement

Confirm / keep data-driven fields already in `js/data.js` (do not invent parallel systems):

1. `miniDesc` on all three + show on Slayer Master cards, unlock modal, Bestiary when unlocked.
2. Honor `combat.*` including `hpMultNoPierce` and `clump`.
3. Signature drop rolls + mat catalog UI (inventory chip ok even if unspendable).
4. Mastery perk application from `masteryPerks` texts + effect keys.
5. Codex entry `undercroft_identities` stays accurate to this brief.
6. Player copy: zero “quarry” (pair with quarry-rename brief).
7. **Do not** rename display names in this pass unless Alex locks original-IP replacements.

---

## 5. What Game Artist needs

| Monster | `visual` key | Art hook |
|---|---|---|
| Crawling Hands | `crawler` | Low, wide, knuckle/grip silhouette; slow crawl read |
| Banshees | `spectre` | Tall frail wail; fast drift / dart pose |
| Infernal Mages | `mage` | Robed caster; reads as cluster when several park close |

Signature mat icons (optional later): Grip Scrap / Wail Shard / Ember Core — small inventory glyphs matching emoji placeholders. Not blocking for combat ship.

---

## 6. Out of scope

- Fenwatch / Bonevault / Ash Warrens identity pass  
- Signature mat crafting / spend  
- Scraps shop  
- Original-IP rename of Jagex-flavored names (flagged below)  
- New combat verbs (stuns, fear, DoT) beyond existing bolt/pierce/clump/move/hp knobs  
- Production code from Game Designer  

---

## Flag — leftover Jagex-flavored names (original IP later)

**Undercroft (this brief):** Crawling Hands, Banshees, Infernal Mages — classic Slayer-adjacent; keep until Alex asks for originals.

**Later areas (do not rename in this brief):** Dust Devils, Gargoyles, Aberrant Spectres, Kurasks, Nechryarch Kin, Abyssal Demons.

When Alex wants originals: Game Designer files a naming brief; New Bot swaps `name` + Codex only; keep contract ids for saves.

---

## Approval

Alex: lock numbers + miniDescs + mastery themes, or list deltas. On lock → DESIGN.md “Undercroft identities” section updated from this file; New Bot treats `data.js` as matching source of truth.
