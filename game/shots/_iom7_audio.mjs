// Task 4 — SFX v3 headless check: real gestures, 10s hold, tab switch; cue log + audio 404s.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/usr/local/lib/node_modules/playwright-core');
const BASE = process.argv[2] || 'http://127.0.0.1:8777/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome-stable', headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
const errors = []; const audio = []; const bad = [];
p.on('pageerror', e => errors.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
p.on('response', r => { const u = r.url(); if (/\/audio\//.test(u)) audio.push(r.status() + ' ' + u.split('/audio/')[1]); if (r.status() >= 400 && !/\/api\//.test(u)) bad.push(r.status() + ' ' + u); });
await p.goto(BASE + '?t=' + Date.now(), { waitUntil: 'networkidle' });
const saveJson = await p.evaluate(() => {
  const st = window.CB_STATE.defaultState(); window.CB_INTRO.skipIntro(st); st.hints = { boltAim: true };
  st.slayerLevel = 3; st.gold = 120; return JSON.stringify(st);
});
await ctx.addInitScript((j) => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', '1'); localStorage.setItem('contractBoard_v1', j); } }, saveJson);
await p.goto(BASE + '?seed=' + Date.now(), { waitUntil: 'networkidle' });
await p.waitForTimeout(800);
const settings = await p.evaluate(() => { const st = window.CB_GAME.getState(); return st.settings; });
// gesture: tap empty arena spot
const ab = await p.locator('#arena').boundingBox();
await p.mouse.click(ab.x + 40, ab.y + ab.height - 60);
await p.waitForTimeout(1200);
const m = await p.evaluate(() => { const e = document.querySelector('.mob:not(.dead)'); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await p.mouse.move(m.x, m.y); await p.mouse.down();
const t0 = Date.now();
while (Date.now() - t0 < 10000) {
  const mm = await p.evaluate(() => { const e = document.querySelector('.mob:not(.dead):not(.dying)'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (mm) await p.mouse.move(mm.x, mm.y);
  await p.waitForTimeout(300);
}
await p.mouse.up();
await p.waitForTimeout(400);
const bb = await p.locator('.tab-btn[data-tab="board"]').boundingBox();
await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
await p.waitForTimeout(500);
const bb2 = await p.locator('.tab-btn[data-tab="hunt"]').boundingBox();
await p.mouse.click(bb2.x + bb2.width / 2, bb2.y + bb2.height / 2);
await p.waitForTimeout(500);
const r = await p.evaluate(() => {
  const log = window.CB_AUDIO.cueLog ? window.CB_AUDIO.cueLog() : [];
  const counts = {}; log.forEach(c => counts[c.cue] = (counts[c.cue] || 0) + 1);
  const fires = log.filter(c => c.cue === 'bolt_fire').map(c => c.t);
  const gaps = fires.slice(1).map((t, i) => t - fires[i]);
  return { counts, fireGapsMs: gaps, ctxState: window.CB_AUDIO.ctxState ? window.CB_AUDIO.ctxState() : undefined };
});
console.log(JSON.stringify({ settingsSfx: settings && settings.sfxVol, ...r, audioResponses: [...new Set(audio)], bad, errors }, null, 0));
await b.close();
