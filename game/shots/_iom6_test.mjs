import puppeteer from '/tmp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import path from 'path';
const SHOTS = '/workspace/contract-board/shots';
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});
const errors = [];

async function boot(page) {
  await page.goto('http://127.0.0.1:8765/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  page.on('pageerror', e => errors.push(e.message));
  await page.evaluate(() => {
    const st = window.CB_GAME.getState();
    window.CB_INTRO.skipIntro(st);
    st.hints = { boltAim: true };
    window.CB_STATE.ensureBestiaryEntry(st, 'bristle_cub').unlocked = true;
    window.CB_STATE.ensureBestiaryEntry(st, 'thornpelt_bear').unlocked = true;
    window.CB_STATE.switchHuntTarget(st, 'bristle_cub');
    st.contractProgress = 5;
    st.contractProgressById.bristle_cub = 5;
    window.CB_STATE.save(st);
    window.CB_UI.renderAll(st, 'hunt');
    window.CB_ARENA?.render?.(st);
  });
  await new Promise(r => setTimeout(r, 400));
}

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844 });
await boot(page);

let r = await page.evaluate(() => {
  const st = window.CB_GAME.getState();
  const up = window.CB_STATE.stepHuntTarget(st, +1);
  window.CB_STATE.save(st);
  window.CB_ARENA.markDirty();
  window.CB_UI.renderAll(st, 'hunt');
  window.CB_ARENA.render(st);
  return {
    upOk: up.ok, id: st.currentContractId, prog: st.contractProgress,
    storedHand: st.contractProgressById.bristle_cub,
    chip: document.getElementById('ts-chip')?.textContent,
    swVisible: !document.getElementById('target-switcher')?.classList.contains('hidden'),
  };
});
console.log('switch up', JSON.stringify(r));

r = await page.evaluate(() => {
  const st = window.CB_GAME.getState();
  st.contractProgress = 9;
  st.contractProgressById.thornpelt_bear = 9;
  const down = window.CB_STATE.stepHuntTarget(st, -1);
  window.CB_STATE.save(st);
  window.CB_ARENA.markDirty();
  window.CB_UI.renderAll(st, 'hunt');
  window.CB_ARENA.render(st);
  return { downOk: down.ok, id: st.currentContractId, prog: st.contractProgress, storedCrawler: st.contractProgressById.thornpelt_bear };
});
console.log('switch down', JSON.stringify(r));

r = await page.evaluate(() => {
  const st = window.CB_GAME.getState();
  window.CB_STATE.switchHuntTarget(st, 'thornpelt_bear');
  const up = window.CB_STATE.stepHuntTarget(st, +1);
  return { locked: !!up.locked, need: up.need || up.reason, ok: up.ok };
});
console.log('locked', JSON.stringify(r));

await page.evaluate(() => {
  const st = window.CB_GAME.getState();
  window.CB_STATE.switchHuntTarget(st, 'bristle_cub');
  window.CB_STATE.save(st);
});
await page.reload({ waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 500));
r = await page.evaluate(() => {
  const st = window.CB_GAME.getState();
  return { id: st.currentContractId, prog: st.contractProgress, byId: st.contractProgressById };
});
console.log('reload', JSON.stringify(r));

r = await page.evaluate(() => {
  const st = window.CB_GAME.getState();
  window.CB_STATE.ensureBestiaryEntry(st, 'dire_thornpelt').unlocked = true;
  window.CB_STATE.switchHuntTarget(st, 'bristle_cub');
  window.CB_STATE.setTargetAuto(st, true);
  const up = window.CB_STATE.evaluateTargetAuto(st, 3000, 8);
  const id1 = st.currentContractId;
  const down = window.CB_STATE.evaluateTargetAuto(st, 20000, 8);
  return { upOk: up.ok, upAction: up.action, id1, downOk: down.ok, downAction: down.action, id2: st.currentContractId };
});
console.log('auto', JSON.stringify(r));

r = await page.evaluate(() => {
  const st = window.CB_GAME.getState();
  const preyId = window.CB_DATA.markedPrey[0].id;
  st.prey = st.prey || {};
  st.prey[preyId] = { meter: 999, accessUnlocked: true, finished: false, chip: 0 };
  window.CB_STATE.startBossFight(st, preyId);
  window.CB_UI.renderAll(st, 'hunt');
  window.CB_ARENA.render(st);
  return { hidden: document.getElementById('target-switcher')?.classList.contains('hidden') };
});
console.log('boss', JSON.stringify(r));
await page.close();

for (const [w, h] of [[390, 844], [1024, 929]]) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h });
  await boot(p);
  await p.evaluate(() => {
    const st = window.CB_GAME.getState();
    window.CB_STATE.ensureBestiaryEntry(st, 'thornpelt_bear').unlocked = true;
    window.CB_STATE.switchHuntTarget(st, 'thornpelt_bear');
    st.gold = 1250;
    window.CB_STATE.save(st);
    window.CB_UI.renderAll(st, 'hunt');
    window.CB_ARENA.render(st);
  });
  await new Promise(r => setTimeout(r, 400));
  await p.screenshot({ path: path.join(SHOTS, `iom6_switcher_${w}.png`) });
  console.log('saved', w);
  await p.close();
}
console.log('errors', errors.filter(e => !/api\/|favicon/.test(String(e))).slice(0, 5));
await browser.close();
console.log('DONE');
