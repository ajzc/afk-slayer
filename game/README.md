# AFK Slayer

AFK idle guild-hunter game (working folder: `contract-board`). Pure client HTML/CSS/JS — no accounts, ads, or network play. Progress saves in `localStorage` under `contractBoard_v1`.

## Play locally (desktop)

```bash
cd contract-board
python3 -m http.server 8765
```

Open [http://localhost:8765](http://localhost:8765).

Or:

```bash
npx --yes serve -l 8765
```

You can also open `index.html` as a file in some browsers; a local server is more reliable on mobile.

## Open on iPhone (same Wi‑Fi)

1. On your computer, start the server in this folder (port `8765`).
2. Find your computer’s LAN IP:
   - macOS/Linux: `ipconfig getifaddr en0` or `hostname -I`
   - Windows: `ipconfig` → IPv4 address
3. On the iPhone (Safari), go to `http://YOUR_LAN_IP:8765`
4. Optional: Share → **Add to Home Screen** for an app-like feel.

Safari tip: keep the tab open or pinned; offline progress applies when you return (based on `lastTickAt`).

## How to play

1. **Board** — Accept a contract (start with Cave Rats in the Sewers).
2. **Hunt** — Hired hunters kill while you have food. Watch kills/hour tick up.
3. Claim loot live, or leave and come back for the **While you were away…** modal.
4. **Upgrades** — Spend gold / contract points on idle power, food, hunters, auto-accept, etc.
5. Fill **Area Boss** Progress via matching-area kills; **Claim** when the bar is full for a relic + next area.
6. **Guild** — Rank, bestiary, relics, and **Charter Rewrite** (prestige) for Sigils.

## Simulate offline (debug)

In Safari/desktop DevTools console:

```js
CB_GAME.simulateAway(60)  // pretend 60 minutes passed
```

Or rewind the save clock:

```js
const s = JSON.parse(localStorage.getItem('contractBoard_v1'));
s.lastTickAt = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
localStorage.setItem('contractBoard_v1', JSON.stringify(s));
location.reload();
```

## Reset

Guild tab → **Reset all progress**, or:

```js
localStorage.removeItem('contractBoard_v1'); location.reload();
```

## Project layout

```
contract-board/
  index.html
  css/styles.css
  js/data.js      # areas, contracts, upgrades, prey
  js/format.js    # number / time suffixes
  js/state.js     # save, idle formula, actions
  js/ui.js        # SPA tabs & claim modal
  js/game.js      # tick loop & visibility
  DESIGN.md
  README.md
```
