# Overnight — L2/L3 Artist confirm + Levels polish (no Alex needed)

**Status:** Ship overnight (2026-09-24)  
**Owner:** Game Designer → New Bot · Game Artist  
**Alex asleep:** implement within locked briefs; no new systems.

Pairs with: `level-boss-progression.md`, `creature-boss-families.md`

---

## A) L2 / L3 monster + boss specs — CONFIRMED for Artist

No name/id changes. Pack after bears. Same Option C low-poly cutouts, transparent RGBA, family silhouette language, boss largest.

### Scale ladder (relative arena height vs Bristle Cub = 1.0)

| Id | Display name | Lv | Scale | Anims | Palette / read |
|---|---|---|---|---|---|
| `ashfang_pup` | Ashfang Pup | 22 | **0.85** | idle · walk · attack | Ash-grey fur, burnt-orange ear tips, lean puppy |
| `ashfang_wolf` | Ashfang Wolf | 42 | **1.15** | idle · walk · attack | Same family grey/orange; longer muzzle, forward lean |
| `dire_ashfang` | Dire Ashfang | 58 | **1.35** | idle · walk · attack | Darker ash, scarred shoulder, heavier haunch |
| `ashfang_alpha` | Ashfang Alpha | **69** | **1.7** | idle · attack | Apex — mane fringe, glowing ember eyes; clearly boss |

| Id | Display name | Lv | Scale | Anims | Palette / read |
|---|---|---|---|---|---|
| `silkling` | Silkling | 180 | **0.7** | idle · walk · attack | Pale silk white/cream, tiny; low wide stance |
| `webfen_widow` | Webfen Widow | 420 | **1.1** | idle · walk · attack | Violet-grey abdomen, longer legs |
| `brood_matron` | Brood Matron | 600 | **1.4** | idle · walk · attack | Broader abdomen, egg-sack hint, darker violet |
| `nightweave` | Nightweave | **720** | **1.85** | idle · attack | Apex spider — near-black with violet web sheen; largest |

**Contrast vs bears (already shipping):** bears = bulk upright; wolves = lean forward-lean mammal; spiders = low wide arthropod. Do not make wolves look like skinny bears.

**File naming:** `ashfang_pup_idle.png` etc. (or whatever INTEGRATION pattern bears used — match that packing). Boss: idle + attack only.

**Combat hooks (New Bot wires with art or geometric interim):**

| Monster | `combat` intent |
|---|---|
| Ashfang Pup | `hpMult` ~0.55, fast move/spawn |
| Ashfang Wolf | mid HP; mild evade (`aimAssistMod` −4 to −6) |
| Dire Ashfang | `hpMult` ~1.3; short dash / burst move if easy |
| Ashfang Alpha | boss budget ~2.2–2.8× base HP; live fight |
| Silkling | low HP, `clump` park, scraps bias |
| Webfen Widow | evade (`aimAssistMod` −8), Slayer points bias |
| Brood Matron | `clump` + `hpMultNoPierce` ~1.25 until Pierce |
| Nightweave | boss budget ~3.2–4.0×; displayLevel 720 |

Signature mats (data labels): Ashfang Fang · Pack Hide · Silk Thread · Venom Sac.

---

## B) New Bot polish — ship without Alex (Levels clarity + early feel)

### B1. Boss card / meter copy (must match)

| State | Copy |
|---|---|
| Locked | `{BossName} · Lv {N}` + `Slayer points {cur} / {cost}` |
| Ready | Primary CTA **`Fight boss`** (not Claim / Progress) |
| In fight | Task dock → boss HP or `Boss · {hp}` |
| Win | `{Level N} cleared — Level {N+1} unlocked` |
| Header / Master | `Level {N} · Hunt targets` |

Kill leftover strings: Area Boss Progress, Undercroft, Marked Prey, “Claim” for boss.

### B2. Early-game feel (Level 1 only tonight)

| Knob | Target |
|---|---|
| L1 boss access cost | **120** Slayer points |
| Time to first Fight boss (engaged new save) | **~20–40 min** — if slower, bump early bear `pointsPerKill` / Task finishBonus, not the cost |
| Elder Thornpelt fight | Solo fresh TTK ballpark **45–90s**; with Briar later still under ~2 min |
| Bristle Cub | Frail/fast — teach aim; first Task ≤ ~3–5 min |
| Show `· Lv N` on every monster + boss card | Always |

### B3. Intro Tasks (wording)

Prefer these three early steps (order flexible with existing 20-step list):
1. Finish a Task on **Bristle Cub**
2. **Earn Slayer points** (show meter somewhere once)
3. **Defeat Elder Thornpelt** (after Fight boss unlock)

### B4. Soft polish if cheap
- One-line tip once: `Earn Slayer points to unlock the Level boss.`
- Boss leave → HP reset (already locked); no toast spam — quiet reset is fine.
- Geometric L2/L3 placeholders OK until packs; keep display names + Lv correct.

### Out of overnight scope
- Mastery perk number rewrite  
- Forge mat retarget (file next if Alex wants)  
- New SFX  
- Levels 4+  

---

## Hand-off checklist

- [ ] Artist: start wolf pack with specs in §A (after bears INTEGRATION done)  
- [ ] Artist: spider pack after wolves  
- [ ] New Bot: §B1–B3 copy + L1 pacing  
- [ ] New Bot: L2/L3 combat hooks per table (even on geometric sprites)  
