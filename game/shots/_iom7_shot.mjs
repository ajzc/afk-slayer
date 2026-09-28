// iom7 — 390 mid-shot screenshots of the plain hunter (bronze) and with iron equipped.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/usr/local/lib/node_modules/playwright-core');
const BASE = process.argv[2] || 'http://127.0.0.1:8777/';
const TAG = process.argv[3] || 'local';
const OUT = '/workspace/contract-board/shots';
const variants = (process.argv[4] || 'plain,iron').split(',');

async function one(variant) {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome-stable', headless: true, args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: false });
  const page = await ctx.newPage();
  const errors = []; const bad = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !/\/api\//.test(r.url())) bad.push(r.status() + ' ' + r.url()); });
  await page.goto(BASE + '?t=' + Date.now(), { waitUntil: 'networkidle' });
  const saveJson = await page.evaluate((variant) => {
    const st = window.CB_STATE.defaultState();
    window.CB_INTRO.skipIntro(st);
    st.hints = { boltAim: true };
    st.slayerLevel = 3; st.gold = 120; st.playMs = 300000; st.totalKills = 20; st.totalContracts = 2;
    if (variant === 'iron') st.upgrades.gear_iron = 1;
    if (variant === 'armor') {
      ['gear_iron','gear_steel','gear_mithril'].forEach((u) => { st.upgrades[u] = 1; });
      st.slayerLevel = 12;
      st.gear = { owned: { legs_mithril: true, body_steel: true, helm_rune: true, cape_slayer: true },
        equipped: { legs: 'legs_mithril', body: 'body_steel', helm: 'helm_rune', cape: 'cape_slayer' }, capeTrim: 2 };
    }
    return JSON.stringify(st);
  }, variant);
  await ctx.addInitScript((j) => {
    if (!sessionStorage.getItem('iom7_seeded')) { sessionStorage.setItem('iom7_seeded', '1'); localStorage.setItem('contractBoard_v1', j); }
  }, saveJson);
  await page.goto(BASE + '?seed=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const ab = await page.locator('#arena').boundingBox();
  const pb = await page.locator('#player-avatar').boundingBox();
  // aim at a mob if there is one, else up-right of the player
  const target = await page.evaluate(() => {
    const m = document.querySelector('.mob:not(.dead)');
    if (!m) return null; const r = m.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  const tx = target ? target.x : pb.x + pb.width + 60, ty = target ? target.y : pb.y - 120;
  await page.mouse.move(tx, ty);
  await page.evaluate(() => {
    window.__muz = [];
    const layer = document.querySelector('.proj-layer') || document.querySelector('#arena');
    new MutationObserver((ms) => { ms.forEach((m) => m.addedNodes.forEach((n) => {
      if (n.classList && n.classList.contains('pbolt-muzzle')) {
        const b = document.querySelector('#player-avatar .cb-body');
        const br = b.getBoundingClientRect(); const ar = document.querySelector('#arena').getBoundingClientRect();
        const f = +b.dataset.frame; const tip = window.CB_GEARVIS ? window.CB_GEARVIS.bladeTip(b.dataset.anim, f) : [0,0];
        window.__muz.push({ f, anim: b.dataset.anim, muzzle: [parseFloat(n.style.left), parseFloat(n.style.top)].map(Math.round),
          tip: [br.left - ar.left + br.width * tip[0] / 142, br.top - ar.top + br.height * tip[1] / 156].map(Math.round) });
      }
    })); }).observe(layer, { childList: true, subtree: true });
  });
  await page.mouse.down();
  const info = { variant, frames: [] };
  // sample the anim over ~1.3s to check cadence (fire → thrust)
  const t0 = Date.now();
  let shot = false;
  while (Date.now() - t0 < 2600) {
    const s = await page.evaluate(() => {
      const b = document.querySelector('#player-avatar .cb-body');
      if (window.__freezeWhen && b.dataset.anim.endsWith('attack') && +b.dataset.frame === 2 && document.querySelector('.pbolt')) {
        // freeze this exact frame for the screenshot (sprite ticks + WAAPI bolt flight)
        window.__tick = window.CB_SPRITES.tick; window.CB_SPRITES.tick = () => {};
        if (window.CB_GEARVIS) { window.__gvtick = window.CB_GEARVIS.tick; window.CB_GEARVIS.tick = () => {}; }
        document.getAnimations().forEach((a) => a.pause());
        window.__freezeWhen = false; window.__frozen = true;
      }
      return { frozen: !!window.__frozen, anim: b.dataset.anim, f: +b.dataset.frame, t: Math.round(performance.now()), bolts: document.querySelectorAll('.pbolt').length };
    });
    info.frames.push(s.anim.replace('player_plain_body_', '')[0] + s.f);
    if (!shot && Date.now() - t0 > 1300 && !s.frozen) await page.evaluate(() => { window.__freezeWhen = true; });
    if (!shot && s.frozen) {
      await page.screenshot({ path: `${OUT}/iom7_${TAG}_390_midshot_${variant}.png` });
      info.afterShotFrame = await page.evaluate(() => document.querySelector('#player-avatar .cb-body').dataset.frame);
      info.geo = await page.evaluate(() => {
        const b = document.querySelector('#player-avatar .cb-body').getBoundingClientRect();
        const p = document.querySelector('#player-avatar').getBoundingClientRect();
        const w = [...document.querySelectorAll('#player-avatar .gv-layer')].map(e => e.dataset.slot + ':' + e.dataset.id + ':' + (e.dataset.src || '').split('/').pop());
        const hp = document.querySelector('#player-avatar .player-hp, #player-hp, .player-hp');
        const h = hp ? hp.getBoundingClientRect() : null;
        return { body: [b.x, b.width].map(Math.round), avatarCenter: Math.round(p.x + p.width / 2),
          feetX: Math.round(b.x + b.width * 44 / 142), tipX: Math.round(b.x + b.width * 135 / 142), tipY: Math.round(b.y + b.height * 68 / 156),
          hpCenter: h ? Math.round(h.x + h.width / 2) : null, layers: w };
      });
      shot = true;
      await page.evaluate(() => { window.CB_SPRITES.tick = window.__tick; if (window.CB_GEARVIS) window.CB_GEARVIS.tick = window.__gvtick; document.getAnimations().forEach((a) => a.play()); window.__frozen = false; });
    }
    await page.waitForTimeout(40);
  }
  await page.mouse.up();
  info.muzzle = await page.evaluate(() => window.__muz.slice(0, 4));
  info.errors = errors.filter(e => !/404/.test(e)); info.errCount404 = errors.length - info.errors.length; info.bad = bad;
  console.log(JSON.stringify(info));
  await browser.close();
}
for (const v of variants) await one(v);
