import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/usr/local/lib/node_modules/playwright-core');
const BASE = process.argv[2] || 'http://127.0.0.1:8777/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome-stable', headless: true, args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
await p.goto(BASE + '?t=' + Date.now(), { waitUntil: 'networkidle' });
const j = await p.evaluate(() => { const st = window.CB_STATE.defaultState(); window.CB_INTRO.skipIntro(st); st.hints = { boltAim: true };
  st.currentContractId = 'bristle_cub'; st.contractProgress = 6; delete st.earlyWindowDone; return JSON.stringify(st); });
await ctx.addInitScript((j) => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', '1'); localStorage.setItem('contractBoard_v1', j); } }, j);
await p.goto(BASE + '?seed=' + Date.now(), { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
const rd = () => p.evaluate(() => { const S = window.CB_STATE, st = window.CB_GAME.getState(); const c = st.currentContractId && S.getContract(st.currentContractId);
  return { cid: st.currentContractId, prog: st.contractProgress, quota: c ? S.effectiveQuota(st, c) : null, kills: st.totalKills | 0, fins: st.totalContracts | 0 }; });
const before = await rd(); let after = before; const t0 = Date.now(); let down = false;
while (Date.now() - t0 < 40000) {
  const m = await p.evaluate(() => { const e = document.querySelector('.mob:not(.dead):not(.dying)'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (m) { await p.mouse.move(m.x, m.y); if (!down) { await p.mouse.down(); down = true; } }
  after = await rd(); if (after.kills > before.kills) break;
  await p.waitForTimeout(200);
}
console.log(JSON.stringify({ before, after }));
await b.close();
