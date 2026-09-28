import puppeteer from '/tmp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
await page.goto('http://127.0.0.1:8765/', { waitUntil: 'networkidle0' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => {
  const st = window.CB_GAME.getState();
  window.CB_INTRO.skipIntro(st);
  st.hints = { boltAim: true };
  window.CB_STATE.ensureBestiaryEntry(st, 'bristle_cub').unlocked = true;
  window.CB_STATE.ensureBestiaryEntry(st, 'thornpelt_bear').unlocked = true;
  window.CB_STATE.switchHuntTarget(st, 'bristle_cub');
  window.CB_STATE.save(st);
  window.CB_UI.renderAll(st, 'hunt');
  window.CB_ARENA.render(st);
});
await new Promise(r => setTimeout(r, 500));

const info = await page.evaluate(() => {
  const btn = document.getElementById('ts-up');
  const sw = document.getElementById('target-switcher');
  const zone = document.getElementById('hold-zone');
  const r = btn.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const top = document.elementFromPoint(cx, cy);
  const zs = (el) => el ? getComputedStyle(el).zIndex : null;
  return {
    btn: { x: cx, y: cy, w: r.width, h: r.height, disabled: btn.disabled, display: getComputedStyle(btn).display },
    sw: { z: zs(sw), pe: getComputedStyle(sw).pointerEvents, top: sw.getBoundingClientRect().top },
    zone: { z: zs(zone), pe: getComputedStyle(zone).pointerEvents },
    topTag: top && top.tagName,
    topId: top && top.id,
    topClass: top && top.className,
    topAction: top && (top.closest && top.closest('[data-action]') || {}).dataset?.action,
    beforeId: window.CB_GAME.getState().currentContractId,
  };
});
console.log('before click', JSON.stringify(info, null, 2));

// REAL mouse click at coordinates
await page.mouse.click(info.btn.x, info.btn.y);
await new Promise(r => setTimeout(r, 400));

const after = await page.evaluate(() => ({
  id: window.CB_GAME.getState().currentContractId,
  chip: document.getElementById('ts-chip')?.textContent,
  toast: document.getElementById('toast')?.textContent,
  toastShow: document.getElementById('toast')?.classList.contains('show'),
}));
console.log('after mouse.click', after);

// Also try clicking hold-zone center to see if hold starts
const zoneC = await page.evaluate(() => {
  const z = document.getElementById('hold-zone').getBoundingClientRect();
  return { x: z.left + z.width/2, y: z.top + z.height/2 };
});
await page.mouse.click(zoneC.x, zoneC.y);
await new Promise(r => setTimeout(r, 200));
console.log('holding after zone click?', await page.evaluate(() => document.body.classList.contains('arena-holding') || document.getElementById('arena')?.classList.contains('holding')));

await browser.close();
