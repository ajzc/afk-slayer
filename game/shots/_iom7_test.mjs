// iom7 armor verification — REAL input only (page.mouse.click at on-screen coords).
// Setup (test save at SL5) is written to localStorage, then everything else is clicked.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/usr/local/lib/node_modules/playwright-core');
const BASE = process.argv[2] || 'http://127.0.0.1:8777/';
const TAG = process.argv[3] || 'local';
const OUT = '/workspace/contract-board/shots';

async function clickEl(page, sel, label) {
  const loc = page.locator(sel).first();
  await loc.scrollIntoViewIfNeeded();
  const bb = await loc.boundingBox();
  if (!bb) throw new Error('no box for ' + (label || sel));
  const x = bb.x + bb.width / 2, y = bb.y + bb.height / 2;
  await page.mouse.click(x, y);
  return { x: Math.round(x), y: Math.round(y) };
}

async function run(w, h, mobile) {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome-stable', headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: mobile, isMobile: mobile });
  const page = await ctx.newPage();
  const errors = []; const bad = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !/\/api\//.test(r.url())) bad.push(r.status() + ' ' + r.url()); });
  await page.goto(BASE + '?t=' + Date.now(), { waitUntil: 'networkidle' });
  const build = await page.evaluate(() => window.CB_DATA.BUILD_ID);
  // ---- test save: SL5, 200 gold, intro done, on a Crawling Hand task.
  // Built with the game's own defaultState, then seeded BEFORE boot via an init script
  // (the running game would otherwise re-persist its in-memory save on unload).
  const saveJson = await page.evaluate(() => {
    const st = window.CB_STATE.defaultState();
    window.CB_INTRO.skipIntro(st);
    st.hints = { boltAim: true };
    st.slayerLevel = 5; st.gold = 200; st.playMs = 600000; st.totalKills = 50; st.totalContracts = 4;
    st.upgrades.hunter_briar = 1; st.hunters.briar = { unlocked: true };
    window.CB_STATE.switchHuntTarget(st, 'bristle_cub');
    return JSON.stringify(st);
  });
  await ctx.addInitScript((j) => {
    if (!sessionStorage.getItem('iom7_seeded')) {
      sessionStorage.setItem('iom7_seeded', '1');
      localStorage.setItem('contractBoard_v1', j);
    }
  }, saveJson);
  await page.goto(BASE + '?seed=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const plainLayers = await page.evaluate(() => [...document.querySelectorAll('#player-avatar .gv-layer')].map(e => e.dataset.slot));
  const r = { build, w, plainLayers, clicks: [] };
  await page.screenshot({ path: `${OUT}/iom7_${TAG}_${w}_before.png` });
  // ---- Progress tab (real tap)
  r.clicks.push(['nav progress', await clickEl(page, '[data-tab="maps"]')]);
  await page.waitForTimeout(300);
  r.clicks.push(['strip smithing', await clickEl(page, '[data-prog-strip="smithing"]')]);
  await page.waitForTimeout(300);
  r.activeStrip = await page.evaluate(() => window.CB_MAPS.getStrip());
  r.statsBefore = await page.locator('#armor-stats').innerText({timeout:3000}).catch(e=>'MISSING');
  if (r.statsBefore==='MISSING') { r.bad=bad; r.errors=errors; console.log(JSON.stringify(r)); process.exit(1); }
  r.legsRowBefore = await page.locator('[data-armor-slot="legs"]').innerText();
  r.bodyRow = await page.locator('[data-armor-slot="body"]').innerText();
  await page.screenshot({ path: `${OUT}/iom7_${TAG}_${w}_smithing_before.png`, fullPage: false });
  r.clicks.push(['buy legs_leather', await clickEl(page, '[data-action="buy-armor"][data-id="legs_leather"]')]);
  await page.waitForTimeout(250);
  r.toast = await page.locator('#toast').innerText().catch(() => '');
  r.statsAfter = await page.locator('#armor-stats').innerText();
  r.legsRowAfter = await page.locator('[data-armor-slot="legs"]').innerText();
  r.goldAfter = await page.evaluate(() => window.CB_GAME.getState().gold);
  await page.screenshot({ path: `${OUT}/iom7_${TAG}_${w}_smithing_after.png` });
  // ---- back to Hunt (real tap), overlay present
  r.clicks.push(['nav hunt', await clickEl(page, '[data-tab="hunt"]')]);
  await page.waitForTimeout(800);
  r.layersAfter = await page.evaluate(() => [...document.querySelectorAll('#player-avatar .gv-layer')].map(e => e.dataset.slot + ':' + e.dataset.id));
  await page.screenshot({ path: `${OUT}/iom7_${TAG}_${w}_hunt_after.png` });
  const pb = await page.locator('#player-avatar').boundingBox();
  await page.screenshot({ path: `${OUT}/iom7_${TAG}_${w}_player_zoom.png`, clip: { x: pb.x - 40, y: pb.y - 30, width: pb.width + 80, height: pb.height + 50 } });
  // ---- reload → persists
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  r.layersReload = await page.evaluate(() => [...document.querySelectorAll('#player-avatar .gv-layer')].map(e => e.dataset.slot + ':' + e.dataset.id));
  r.savedGear = await page.evaluate(() => JSON.parse(localStorage.getItem('contractBoard_v1')).gear);
  await clickEl(page, '[data-tab="maps"]'); await page.waitForTimeout(250);
  await clickEl(page, '[data-prog-strip="smithing"]'); await page.waitForTimeout(250);
  r.statsReload = await page.locator('#armor-stats').innerText();
  r.errors = errors; r.bad = bad;
  await browser.close();
  return r;
}
const res = [];
res.push(await run(390, 844, true));
res.push(await run(1024, 768, false));
console.log(JSON.stringify(res, null, 1));
