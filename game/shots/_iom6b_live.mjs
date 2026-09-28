import puppeteer from '/tmp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const URL = 'https://afk-slayer.ajchapman20.workers.dev/?iom6b=' + Date.now();
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true });
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });

const build = await page.evaluate(() => window.CB_DATA?.BUILD_ID);
console.log('LIVE BUILD', build);

await page.evaluate(() => {
  const st = window.CB_GAME.getState();
  window.CB_INTRO.skipIntro(st);
  st.hints = { boltAim: true };
  Object.keys(st.areas||{}).forEach(a => { st.areas[a].unlocked = true; });
  (window.CB_DATA.contracts||[]).forEach(c => {
    window.CB_STATE.ensureBestiaryEntry(st, c.id).unlocked = true;
  });
  window.CB_STATE.switchHuntTarget(st, 'bristle_cub');
  st.targetAuto = false;
  window.CB_STATE.save(st);
  window.CB_UI.renderAll(st, 'hunt');
  window.CB_ARENA.render(st);
});
await new Promise(r => setTimeout(r, 500));

for (const sel of ['#ts-up','#ts-down','#ts-auto']) {
  const info = await page.evaluate((s) => {
    const el = document.querySelector(s);
    const r = el.getBoundingClientRect();
    const x = r.left+r.width/2, y = r.top+r.height/2;
    const top = document.elementFromPoint(x,y);
    return { sel: s, x, y, topId: top?.id, topAction: top?.getAttribute('data-action') };
  }, sel);
  console.log('EFP', info);
}

const before = await page.evaluate(() => ({
  id: window.CB_GAME.getState().currentContractId,
  chip: document.getElementById('ts-chip')?.textContent,
}));
const cup = await page.evaluate(() => {
  const r = document.getElementById('ts-up').getBoundingClientRect();
  return { x: r.left+r.width/2, y: r.top+r.height/2 };
});
await page.mouse.click(cup.x, cup.y);
await new Promise(r => setTimeout(r, 500));
const after = await page.evaluate(() => ({
  id: window.CB_GAME.getState().currentContractId,
  chip: document.getElementById('ts-chip')?.textContent,
  visual: window.CB_DATA.contracts.find(c => c.id === window.CB_GAME.getState().currentContractId)?.visual,
}));
console.log('live multi', before, '=>', after);
await page.screenshot({ path: '/workspace/contract-board/shots/iom6b_live_multi_up.png' });

// tap
await page.touchscreen.tap(cup.x, cup.y); // may go further up
await new Promise(r => setTimeout(r, 400));
console.log('after tap', await page.evaluate(() => window.CB_GAME.getState().currentContractId));

// Auto
const ca = await page.evaluate(() => {
  const r = document.getElementById('ts-auto').getBoundingClientRect();
  return { x: r.left+r.width/2, y: r.top+r.height/2 };
});
await page.mouse.click(ca.x, ca.y);
await new Promise(r => setTimeout(r, 400));
console.log('auto', await page.evaluate(() => ({
  auto: window.CB_GAME.getState().targetAuto,
  toast: document.querySelector('#toast')?.textContent,
})));

// Fresh locked
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => {
  const st = window.CB_GAME.getState();
  window.CB_INTRO.skipIntro(st);
  st.hints = { boltAim: true };
  Object.keys(st.bestiary).forEach(id => { st.bestiary[id].unlocked = (id === 'bristle_cub'); });
  window.CB_STATE.switchHuntTarget(st, 'bristle_cub');
  window.CB_STATE.save(st);
  window.CB_UI.renderAll(st, 'hunt');
  window.CB_ARENA.render(st);
});
await new Promise(r => setTimeout(r, 400));
const c2 = await page.evaluate(() => {
  const r = document.getElementById('ts-up').getBoundingClientRect();
  return { x: r.left+r.width/2, y: r.top+r.height/2 };
});
await page.mouse.click(c2.x, c2.y);
await new Promise(r => setTimeout(r, 250));
console.log('live locked', await page.evaluate(() => ({
  id: window.CB_GAME.getState().currentContractId,
  chip: document.getElementById('ts-chip')?.textContent,
  toast: document.querySelector('#toast.show')?.textContent,
})));
await page.screenshot({ path: '/workspace/contract-board/shots/iom6b_live_locked.png' });

await browser.close();
