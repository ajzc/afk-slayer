import puppeteer from '/tmp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import fs from 'fs';
import path from 'path';

const OUT = '/workspace/contract-board/shots';
fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  const p = path.join(OUT, name);
  await page.screenshot({ path: p, fullPage: false });
  console.log('shot', name);
}

function centerOf(page, sel) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, id: el.id, disabled: el.disabled };
  }, sel);
}

async function efp(page, x, y) {
  return page.evaluate((x, y) => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    return { id: el.id, cls: el.className, tag: el.tagName, action: el.getAttribute('data-action') };
  }, x, y);
}

async function stateSnap(page) {
  return page.evaluate(() => {
    const st = window.CB_GAME.getState();
    const chip = document.getElementById('ts-chip');
    const toast = document.querySelector('.toast, .cb-toast, #toast, [class*="toast"]');
    const toasts = [...document.querySelectorAll('.toast, .ui-toast, .cb-toast, #toasts .toast, .toast-msg')].map(t => t.textContent.trim());
    // also check arena monster visual
    const mob = document.querySelector('.mob, .monster, .wave-mob, [data-mob], .arena-mob, .prey-sprite, .mob-sprite');
    const arenaHtml = (document.getElementById('arena-stage') || document.getElementById('hold-zone') || document.querySelector('.arena'))?.innerHTML?.slice(0, 200);
    return {
      build: window.CB_DATA?.BUILD_ID,
      id: st.currentContractId,
      auto: !!st.targetAuto,
      chip: chip ? chip.textContent.trim() : null,
      toasts,
      toastText: document.body.innerText.includes('🔒') ? 'has-lock-char' : 'no-lock',
      // find visible toast via CB_UI last or DOM
      toastEls: [...document.querySelectorAll('*')].filter(e => {
        const c = (e.className || '').toString();
        return /toast/i.test(c) && e.offsetParent !== null;
      }).slice(0, 5).map(e => ({ cls: e.className.toString().slice(0,60), text: e.textContent.trim().slice(0,80) })),
    };
  });
}

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--window-size=390,844'],
});

async function setupMulti(page) {
  await page.goto('http://127.0.0.1:8765/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const st = window.CB_GAME.getState();
    window.CB_INTRO.skipIntro(st);
    st.hints = { boltAim: true };
    // unlock several targets + areas
    const ladder = window.CB_STATE.huntTargetLadder ? window.CB_STATE.huntTargetLadder() :
      window.CB_DATA.contracts;
    // unlock areas
    Object.keys(st.areas || {}).forEach(a => { st.areas[a].unlocked = true; });
    (window.CB_DATA.contracts || []).forEach(c => {
      const e = window.CB_STATE.ensureBestiaryEntry(st, c.id);
      e.unlocked = true;
    });
    window.CB_STATE.switchHuntTarget(st, 'bristle_cub');
    st.targetAuto = false;
    window.CB_STATE.save(st);
    window.CB_UI.renderAll(st, 'hunt');
    window.CB_ARENA.render(st);
  });
  await new Promise(r => setTimeout(r, 400));
}

async function setupFresh(page) {
  await page.goto('http://127.0.0.1:8765/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const st = window.CB_GAME.getState();
    window.CB_INTRO.skipIntro(st);
    st.hints = { boltAim: true };
    window.CB_STATE.save(st);
    window.CB_UI.renderAll(st, 'hunt');
    window.CB_ARENA.render(st);
  });
  await new Promise(r => setTimeout(r, 400));
}

// ========== MULTI UNLOCK @ 390 ==========
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true });
await setupMulti(page);

const build = await page.evaluate(() => window.CB_DATA.BUILD_ID);
console.log('BUILD', build);

const sels = ['#ts-up', '#ts-down', '#ts-auto'];
for (const sel of sels) {
  const c = await centerOf(page, sel);
  const top = c ? await efp(page, c.x, c.y) : null;
  console.log('EFP', sel, c, top);
}

await shot(page, 'iom6b_multi_before.png');
let before = await stateSnap(page);
console.log('before', before);

// Real mouse click UP
{
  const c = await centerOf(page, '#ts-up');
  await page.mouse.click(c.x, c.y);
  await new Promise(r => setTimeout(r, 500));
}
let afterUp = await stateSnap(page);
console.log('after mouse UP', afterUp);
await shot(page, 'iom6b_multi_after_up.png');

// Real mouse click DOWN back
{
  const c = await centerOf(page, '#ts-down');
  await page.mouse.click(c.x, c.y);
  await new Promise(r => setTimeout(r, 500));
}
let afterDown = await stateSnap(page);
console.log('after mouse DOWN', afterDown);

// Tap emulation UP (touch)
{
  const c = await centerOf(page, '#ts-up');
  await page.touchscreen.tap(c.x, c.y);
  await new Promise(r => setTimeout(r, 500));
}
let afterTap = await stateSnap(page);
console.log('after TAP UP', afterTap);
await shot(page, 'iom6b_multi_after_tap.png');

// Auto toggle
{
  const c = await centerOf(page, '#ts-auto');
  await page.mouse.click(c.x, c.y);
  await new Promise(r => setTimeout(r, 500));
}
let afterAuto = await stateSnap(page);
console.log('after AUTO', afterAuto);
await shot(page, 'iom6b_multi_auto.png');

// ========== FRESH SAVE — locked toast ==========
await setupFresh(page);
await shot(page, 'iom6b_fresh_before.png');
const freshBefore = await stateSnap(page);
console.log('fresh before', freshBefore);

// Try UP — should lock if only starter unlocked
{
  const c = await centerOf(page, '#ts-up');
  const top = await efp(page, c.x, c.y);
  console.log('fresh EFP up', top);
  await page.mouse.click(c.x, c.y);
  await new Promise(r => setTimeout(r, 600));
}
const freshAfter = await stateSnap(page);
console.log('fresh after UP (expect locked toast)', freshAfter);
await shot(page, 'iom6b_fresh_locked.png');

// Also try at 1024 desktop
await page.setViewport({ width: 1024, height: 768 });
await setupMulti(page);
{
  const c = await centerOf(page, '#ts-up');
  console.log('1024 EFP', await efp(page, c.x, c.y));
  const before1024 = await stateSnap(page);
  await page.mouse.click(c.x, c.y);
  await new Promise(r => setTimeout(r, 500));
  const after1024 = await stateSnap(page);
  console.log('1024 before/after', before1024.id, '->', after1024.id, 'chip', after1024.chip);
  await shot(page, 'iom6b_desktop_after_up.png');
}

await browser.close();
console.log('DONE');
