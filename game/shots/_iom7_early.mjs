// Task 3 — fresh save, REAL input only: hold on mobs, accept tasks via taps; count kills to SL4.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/usr/local/lib/node_modules/playwright-core');
const BASE = process.argv[2] || 'http://127.0.0.1:8777/';
const TAG = process.argv[3] || 'local';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome-stable', headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push(String(e)));
p.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
await p.goto(BASE + '?fresh=' + Date.now(), { waitUntil: 'networkidle' });
const read = () => p.evaluate(() => {
  const S = window.CB_STATE; const st = window.CB_GAME.getState();
  const c = st.currentContractId ? S.getContract(st.currentContractId) : null;
  return { sl: S.getSlayerLevel(st), kills: st.totalKills | 0, gold: Math.floor(st.gold), points: Math.floor(st.points),
    cid: st.currentContractId, prog: st.contractProgress | 0, quota: c ? S.effectiveQuota(st, c) : null,
    early: S.inEarlyWindow(st), fins: st.totalContracts | 0, meter: st.tierMeter != null ? Math.floor(st.tierMeter) : undefined };
});
const s0 = await read();
const log = [['start', s0]];
let last = s0; const levelAt = {}; levelAt[s0.sl] = { kills: s0.kills, gold: s0.gold, points: s0.points };
const taps = [];
async function tap(sel) {
  const loc = p.locator(sel).first(); if (!(await loc.count())) return false;
  if (!(await loc.isVisible())) return false;
  await loc.evaluate((e) => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(120); const bb = await loc.boundingBox(); if (!bb) return false;
  await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); taps.push(sel); return true;
}
const t0 = Date.now(); let holding = false; let acceptFails = 0; let dbgShot = false; let repress = 0; const LIMIT = +(process.env.LIMIT || 170000);
while (Date.now() - t0 < LIMIT) {
  const s = await read();
  if (s.sl !== last.sl || s.cid !== last.cid || s.fins !== last.fins) log.push([Math.round((Date.now() - t0) / 1000) + 's', s]);
  if (s.sl !== last.sl && !levelAt[s.sl]) levelAt[s.sl] = { kills: s.kills, gold: s.gold, points: s.points, t: Math.round((Date.now() - t0) / 1000) };
  last = s;
  if (s.sl >= 4) break;
  // Need a task? → Master tab, accept the highest available target
  const onHunt = await p.evaluate(() => !!document.querySelector('.tab-btn.active[data-tab="hunt"]'));
  if (!s.cid || (s.quota && s.prog >= s.quota)) {
    if (holding) { await p.mouse.up(); holding = false; }
    await p.waitForTimeout(400);
    const s2 = await read();
    if (!s2.cid) {
      await tap('.tab-btn[data-tab="board"]'); await p.waitForTimeout(400);
      const ok = await p.evaluate(() => {
        const bs = [...document.querySelectorAll('[data-action="accept"]')].filter(e => !e.disabled && e.getBoundingClientRect().width > 0);
        if (!bs.length) return null; const e = bs[bs.length - 1]; e.setAttribute('data-qa-pick', '1'); return e.dataset.id;
      });
      if (ok) {
        await tap('[data-qa-pick="1"]'); await p.waitForTimeout(150);
        const toast = await p.locator('#toast').innerText().catch(() => '');
        const cidNow = (await read()).cid; log.push(['accept', ok, toast.slice(0, 60)]); if (cidNow !== ok) acceptFails++;
        if (acceptFails === 3) await p.screenshot({ path: '/workspace/_sim/early_fail.png' });
        if (acceptFails > 6) break;
        await p.waitForTimeout(300);
      }
      await tap('.tab-btn[data-tab="hunt"]'); await p.waitForTimeout(400);
    }
    continue;
  }
  if (!onHunt) { await tap('.tab-btn[data-tab="hunt"]'); await p.waitForTimeout(300); continue; }
  const m = await p.evaluate(() => {
    const ms = [...document.querySelectorAll('.mob:not(.dead):not(.dying)')].map(e => e.getBoundingClientRect()).filter(r => r.width > 0 && r.y > 90 && r.y < 760);
    if (!ms.length) return null; ms.sort((a, b) => b.y - a.y); const r = ms[0]; return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!dbgShot && Date.now() - t0 > 40000) { dbgShot = true; await p.screenshot({ path: '/workspace/_sim/early_dbg.png' });
    log.push(['dbg', m, await p.evaluate(() => [...document.querySelectorAll('.mob')].slice(0, 5).map(e => e.className + ' ' + Math.round(e.getBoundingClientRect().y)))]); }
  if (m) {
    await p.mouse.move(m.x, m.y);
    const firing = await p.evaluate(() => !!document.querySelector('#player-avatar.firing, #arena.holding'));
    if (holding && !firing) { await p.mouse.up(); holding = false; repress++; }
    if (!holding) { await p.mouse.down(); holding = true; }
  }
  await p.waitForTimeout(250);
}
if (holding) await p.mouse.up();
const end = await read();
await p.screenshot({ path: `/workspace/contract-board/shots/iom7_${TAG}_early_sl4.png` });
const shop = await p.evaluate(() => { const st = window.CB_GAME.getState(); const D = window.CB_DATA;
  const iron = D.upgrades.find(u => u.id === 'gear_iron'); const cannon = D.upgrades.find(u => /cannon/i.test(u.id + u.name));
  const briar = D.upgrades.find(u => u.id === 'hunter_briar');
  return { iron: iron && window.CB_STATE.upgradeCost(iron, 0), cannon: cannon && [cannon.id, window.CB_STATE.upgradeCost(cannon, 0)], briar: briar && window.CB_STATE.upgradeCost(briar, 0), ironOwned: st.upgrades.gear_iron | 0 }; });
console.log(JSON.stringify({ secs: Math.round((Date.now() - t0) / 1000), end, levelAt, shop, log, taps: taps.length, repress, errors }, null, 0));
await b.close();
