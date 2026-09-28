# Design Brief — Loot sink (Scraps + signature mats)

**Status:** Locked for implement (Alex 2026-09-23) — New Bot  
**Mat labels:** superseded by `design/forge-mat-retarget.md` (Level family mats; same costs/effects)  
**Date:** 2026-09-23  
**Game:** AFK Slayer (folder `contract-board`)  
**Owner:** Game Designer → New Bot implements · Game Artist: small Camp icons optional  

---

## 1. Goal (player feeling)

Loot from kills should be **spendable**, not a dead counter. Specializing on a monster (Hands / Banshees / Mages) should unlock a small fantasy craft that gold alone can’t buy. Gold stays the main upgrade currency; scraps/mats are the side path that makes mastery and signature drops matter.

---

## 2. Rules / numbers

### Currencies (already in save)
| Currency | Source | UI now | After this brief |
|---|---|---|---|
| **Scraps** | Kill rolls (`scrapChance`) | Hidden / “for later” | Show in header when `scraps ≥ 1` (or always after first Hands task finish) |
| **Grip Scrap / Wail Shard / Ember Core** | `signatureDrop` | Inventoriable in `state.mats` | Spend in **Forge** recipes |

No new soft currencies. Points stay for Progress unlocks as today.

### Unlock
- **Scrapwork** (Camp): visible when `scraps ≥ 1` OR Intro step “Spend scraps” (optional; can wait until scraps earned).
- **Forge** (Camp sub-panel): visible when any `state.mats[*] ≥ 1`.

### A · Scrapwork (Camp) — permanent upgrades, scraps only

Weaker than gold Camp line on purpose (side path).

| id | Name | Base cost (scraps) | costMult | Max | Effect / level | One-line desc |
|---|---|---|---|---|---|---|
| `scrap_magnet` | Scrap Magnet | 30 | 1.60 | 10 | **+4%** scrap chance | Pulls more scraps from every kill. |
| `scrap_larder` | Scrap Larder | 25 | 1.55 | 12 | **+20** food cap · **+0.2**/min refill | Junk metal shelves for more Food. |
| `scrap_wick` | Wick Wire | 45 | 1.65 | 8 | **+5 min** offline cap | Wire the lanterns for longer Away time. |
| `scrap_gild` | Gild Dust | 60 | 1.70 | 6 | **+3%** gold loot | Polish scraps into a little extra gold. |

**Pace check (Hands, early):** ~28% scrap/kill · ~4–8 kills/min combat → ~1–2 scraps/min. First Scrap Magnet (30) ≈ **15–30 min** of Hands — fine. Maxing Scrap Magnet is a long side goal, not required.

### B · Forge — signature mats

#### Permanents (buy once each)

| id | Name | Cost | Effect | Fantasy |
|---|---|---|---|---|
| `forge_knuckle` | Knuckle Guard | **10 Grip Scrap** | **+6%** global scrap chance (permanent) | Hands specialist |
| `forge_echo` | Echo Charm | **10 Wail Shard** | **+12 min** offline cap (permanent) | Banshee specialist |
| `forge_cinder` | Cinder Tip | **10 Ember Core** | **+4%** bolt `killMult` (permanent) | Mage specialist |

First permanent ≈ **80–100 kills** on that monster at 10–12% sig drop (~10–25 min active on that contract). Intentional specialty, not an accident.

#### Repeatable timed boosts (consume mats · reuse Loot Casket boost pattern)

Duration **10 min**. Stack rule: same as existing timed boosts (one boost slot / replace — New Bot match current Frenzy rules).

| id | Name | Cost | Effect for 10 min |
|---|---|---|---|
| `forge_grip_rush` | Grip Rush | **3 Grip Scrap** | **+25%** scrap chance |
| `forge_wail_focus` | Wail Focus | **3 Wail Shard** | **+15%** contract points |
| `forge_ember_barrage` | Ember Barrage | **3 Ember Core** | **+10%** bolt `killMult` |

### Prestige
Scrapwork levels + Forge permanents **persist** across Charter Rewrite (same as relics / bestiary). Timed boosts do not. Mats and scraps **keep** (side loot identity).

### Balance guardrails
- Scrapwork total gold-equivalent power **&lt;** gold Camp at same playtime (budgets: scrap track “support”).
- Forge permanents **do not** exceed a single mid Camp upgrade in raw power.
- Cinder Tip + Ember Barrage must not outpace Bolt Pierce teaching (boost is short; permanent is small).
- Hands mastery scrap% + Scrap Magnet + Knuckle Guard can stack — soft-cap scrap chance at **95%** (already in kill formula).

---

## 3. Plain-language names + one-line descs

**Scrapwork** — “Spend Scraps on Camp junk that still helps.”  
**Forge** — “Turn monster trophies into charms and short hunts.”

(See tables above for item names/descs.)

Header tooltip scraps: `Scraps — spend in Camp → Scrapwork.`  
Codex **Scraps** body replace: `Secondary loot from kills. Spend in Camp → Scrapwork. Signature mats (Grip Scrap, Wail Shard, Ember Core) craft in Camp → Forge.`

---

## 4. What New Bot should implement

1. Header: show scraps when unlocked rule hits; mats count in Camp Forge (not clutter header).
2. Progress → **Camp**: two sub-blocks or nodes — **Scrapwork** + **Forge** (data-driven like other upgrades).
3. New upgrade defs with `costCurrency: 'scraps'` and Forge recipes with `costMats: { grip_scrap: 10 }` (or equivalent).
4. Wire effects into existing `getBonuses` / boost pipeline (`scrapChance`, `foodCap`, `foodRegen`, `offlineCapMin`, `lootLuck`, `killMult`, points mult).
5. Purchase spend: decrement scraps/mats; refuse if short; toast with plain name + %.
6. Codex scraps entry + short Camp tip.
7. QA: `CB_GAME` helpers to grant scraps/mats; verify soft-cap 95%; prestige keeps permanents.
8. **Do not** invent mat spends for Fenwatch+ until those monsters get signature drops.

---

## 5. What Game Artist needs

Optional small icons (32px): Scrap Magnet, Scrap Larder, Wick Wire, Gild Dust, Knuckle Guard, Echo Charm, Cinder Tip, three boosts. Placeholder emoji is fine for first ship.

---

## 6. Out of scope

- Scraps → gold instant convert shop spam  
- Trading mats between types  
- Signature mats for Fenwatch / Bonevault / Ash Warrens  
- Changing gold upgrade prices  
- New combat verbs  
- Audio (Game Audio)  

**Rejected alternate (for the record):** scraps-only shop with no Forge — cheaper to build but wastes signature drop fantasy already in data.

---

## Approval

Alex: lock tables as written, or list deltas (costs / effects / persist-on-prestige). On lock → update DESIGN.md “Scraps” + new Scrapwork/Forge section; message New Bot to implement.
