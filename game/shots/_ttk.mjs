import { launch } from './_pw.mjs';
const b = await launch(); const page = await b.newPage();
await page.goto('http://127.0.0.1:8765/?ttk=' + Date.now(), { waitUntil: 'networkidle' });
const out = await page.evaluate(() => {
  const D = window.CB_DATA, S = window.CB_STATE, A = window.CB_ARENA_DEBUG;
  const boss = D.markedPrey.find(p => p.id === 'sewer_king');
  const hp = Math.round((D.MONSTER_VISUAL_HP || 150) * boss.combat.hpMult);
  const game = window.CB_GAME.getState();
  const saved = JSON.parse(JSON.stringify(game));
  let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const configs = {
    'Bronze (starter)': ['gear_bronze'],
    'Iron': ['gear_bronze', 'gear_iron'],
    'Steel': ['gear_bronze', 'gear_iron', 'gear_steel'],
  };
  const res = [];
  for (const [name, ups] of Object.entries(configs)) {
    ups.forEach(u => { game.upgrades[u] = 1; });
    const newI = A.boltIntervalMs(), oldI = A.legacyBoltIntervalMs();
    const sim = (mode) => {
      const runs = []; 
      for (let r = 0; r < 400; r++) {
        let h = hp, t = 0;
        while (h > 0) {
          const raw = 1 + (rnd() < 0.25 ? 1 : 0);
          const v = A.boltHpChipRaw(raw);
          let d;
          if (mode === 'old') d = Math.max(1, Math.round(v * oldI / newI));
          else { const f = Math.floor(v); d = Math.max(1, f + (rnd() < v - f ? 1 : 0)); }
          h -= d; if (h <= 0) break; t += (mode === 'old' ? oldI : newI);
        }
        runs.push(t / 1000);
      }
      return +(runs.reduce((a, c) => a + c, 0) / runs.length).toFixed(1);
    };
    const chipNew = A.boltHpChipRaw(1.25), chipOld = chipNew * oldI / newI;
    res.push({ config: name, idlePower: S.getBonuses(game).idlePower, oldIntervalMs: oldI, newIntervalMs: newI,
      oldDmgPerShot: +chipOld.toFixed(2), newDmgPerShot: +chipNew.toFixed(2),
      oldDPS: +(chipOld / oldI * 1000).toFixed(2), newDPS: +(chipNew / newI * 1000).toFixed(2),
      ttkOld: sim('old'), ttkNew: sim('new') });
  }
  Object.keys(game.upgrades).forEach(k => { game.upgrades[k] = saved.upgrades[k]; });
  return { bossHp: hp, res };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
