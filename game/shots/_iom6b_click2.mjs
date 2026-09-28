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

// Hook handlers
await page.evaluateOnNewDocument(() => {});
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
  // spy
  window.__actions = [];
  const orig = window.CB_GAME; // can't easily spy onAction
  document.body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    window.__actions.push({
      type: 'click',
      action: b && b.dataset.action,
      target: e.target && e.target.id,
      defaultPrevented: e.defaultPrevented,
    });
  }, true);
});
await new Promise(r => setTimeout(r, 300));

// Direct step to prove logic works
console.log('direct step', await page.evaluate(() => {
  const st = window.CB_GAME.getState();
  const r = window.CB_STATE.stepHuntTarget(st, +1);
  // revert
  window.CB_STATE.switchHuntTarget(st, 'bristle_cub');
  return r;
}));

const box = await page.evaluate(() => {
  const r = document.getElementById('ts-up').getBoundingClientRect();
  return { x: r.left + r.width/2, y: r.top + r.height/2 };
});

await page.mouse.click(box.x, box.y);
await new Promise(r => setTimeout(r, 300));
console.log('after mouse', await page.evaluate(() => ({
  id: window.CB_GAME.getState().currentContractId,
  actions: window.__actions,
})));

// page.click selector
await page.evaluate(() => { window.__actions = []; window.CB_STATE.switchHuntTarget(window.CB_GAME.getState(), 'bristle_cub'); });
await page.click('#ts-up');
await new Promise(r => setTimeout(r, 300));
console.log('after page.click', await page.evaluate(() => ({
  id: window.CB_GAME.getState().currentContractId,
  actions: window.__actions,
})));

// Native click()
await page.evaluate(() => {
  window.__actions = [];
  window.CB_STATE.switchHuntTarget(window.CB_GAME.getState(), 'bristle_cub');
  document.getElementById('ts-up').click();
});
await new Promise(r => setTimeout(r, 300));
console.log('after el.click()', await page.evaluate(() => ({
  id: window.CB_GAME.getState().currentContractId,
  actions: window.__actions,
})));

await browser.close();
