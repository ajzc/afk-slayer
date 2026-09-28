# Design Brief — Player term: monster (kill “quarry”)

**Status:** Locked & shipped (New Bot 2026-09-23, `?v=monsters1`)  
**Date:** 2026-09-23  
**Owner:** Game Designer → New Bot implements  
**Save key:** `contractBoard_v1` (internal ids stay stable)

---

## 1. Goal (player feeling)

Players always know what they’re hunting. Slayer Master and Intro Tasks sound like a guild board, not a clone glossary. No “quarry” ever appears in UI, toasts, intro, Codex, or tips.

---

## 2. Rules / glossary

| Context | Player-facing term | Notes |
|---|---|---|
| Creature on a contract | **monster** | Default noun |
| Slayer Master list / pick | **hunt target** | Subtitle / collective |
| Accepted job | **contract** or **task** | Task bar stays `Task · N / Q kills` |
| Mastery spend | **Improve bounty** | Keep; not “improve quarry” |
| Unlock reveal | **New monster unlocked** | Toast + modal title |
| Locked silhouette card | **??? Locked monster** | Not “Locked quarry” |
| Area Boss copy | never implies new area monsters from claim | Overseer claim → relic + next area only |

**Allowed internal (never shown):**
- Save / contract ids: `cave_rats`, `tunnel_bats`, `drain_leeches`, …
- Intro step id: `unlock_quarry` (keep for save migration; change title/instr only)
- CSS class `.locked-quarry` — **retire** once `.locked-monster` is sole class (or keep as alias one release)

**Never say to players:** quarry, quarries, prey (except historical Area Boss internal `markedPrey` / `prey_chip` ids).

---

## 3. Plain-language strings to lock

### Slayer Master
- Title: `Slayer Master`
- Subtitle: `Hunt targets — pick your next slayer task.`
- Locked card: `??? Locked monster`
- Card body: always show `miniDesc` (one line). Fallback if missing: `Hunt target.`
- Unlock toast: `{emoji} New monster unlocked: {name}`
- Unlock modal title: `New monster unlocked` · body: `{name} — {miniDesc}`

### Intro Tasks (titles + instr only)
| Step (internal id) | Title | Instr |
|---|---|---|
| `open_board` | Open the Slayer Master | Visit the Slayer Master tab to see available monsters. |
| improve step | Improve a monster bounty | Spend gold on Improve bounty on a Slayer Master card (or Bestiary mastery). |
| `unlock_quarry` | Unlock next monster | Finish enough Crawling Hands to unlock Banshees (Slayer Master silhouette reveal). |
| switch step | Switch contract at Slayer Master | Accept the new monster (Banshees) from the Slayer Master. |

Bolt tip stays: `hold toward a monster…` / Codex tip: Finish a Task to unlock the next monster.

### Codex / tips
- Monsters & mastery entry already correct — keep “monster,” never quarry.
- Undercroft Overseer: “Does not add new Undercroft monsters.”

---

## 4. What New Bot should implement

**Already largely shipped (verify, don’t redo):**
- Intro titles/instr using monster
- Slayer Master subtitle, locked card, unlock toast/modal + miniDesc
- Codex / tip copy

**Still do:**
1. Grep pass: zero player-visible `quarry` / `quarries` in `js/intro.js`, `js/ui.js`, `js/data.js` Codex bodies, `index.html`, any toast strings.
2. CSS: prefer `.locked-monster`; keep `.locked-quarry` as duplicate selector **or** delete after intro arrow sel drops it.
3. Intro arrow sel: can drop `.locked-quarry` once CSS class is gone.
4. Leave internal ids (`unlock_quarry`, contract ids) alone.
5. After ship: update DESIGN.md line that still said “Per-area quarry unlock” if any remain — player glossary section already notes monster.

**QA checklist:**
- Fresh save → every Intro step text has no quarry
- Slayer Master locked + unlocked cards
- Unlock toast + modal after finishing Crawling Hands Task
- Guild tip / Codex entries
- `rg -i quarry` on player strings = only internal id / optional CSS alias

---

## 5. What Game Artist needs

None for this pass (copy-only).

---

## 6. Out of scope

- Renaming Jagex-flavored **display names** (Banshees, Infernal Mages, Dust Devils, …) — separate original-IP pass when Alex asks
- Changing contract / bestiary save ids
- Undercroft fight/loot/mastery numbers — see `design/undercroft-monsters.md`
- Scraps spend sink

---

## Approval

Alex: skim glossary + Intro string table. Reply **lock** or list edits. On lock, Game Designer updates DESIGN.md glossary and New Bot closes remaining CSS/id cleanup.
