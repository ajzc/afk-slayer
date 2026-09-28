import puppeteer from '/tmp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, hasTouch: true, isMobile: true });
await page.goto('http://127.0.0.1:8765/?fresh=' + Date.now(), { waitUntil: 'networkidle0' });
await page.evaluate(() => {
  localStorage.clear();
  sessionStorage.clear();
});
await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => {
  // Force truly fresh in-memory state
  const S = window.CB_STATE;
  const st = S.defaultState();
  window.CB_INTRO.skipIntro(st);
  st.hints = { boltAim: true };
  // ensure only first unlocked
  Object.keys(st.bestiary).forEach(id => {
    st.bestiary[id].unlocked = (id === 'bristle_cub');
  });
  S.switchHuntTarget(st, 'bristle_cub');
  st.targetAuto = false;
  // poke game state
  if (window.CB_GAME.setState) window.CB_GAME.setState(st);
  else {
    // replace via save+reload path
    S.save(st);
  }
});
// If no setState, reload from save
const hasSet = await page.evaluate(() => typeof window.CB_GAME.setState === 'function' || typeof window.CB_GAME.replaceState === 'function');
if (!hasSet) {
  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const st = window.CB_GAME.getState();
    window.CB_INTRO.skipIntro(st);
    st.hints = { boltAim: true };
    window.CB_UI.renderAll(st, 'hunt');
    window.CB_ARENA.render(st);
  });
} else {
  await page.evaluate(() => {
    const st = window.CB_GAME.getState();
    window.CB_UI.renderAll(st, 'hunt');
    window.CB_ARENA.render(st);
  });
}
await new Promise(r => setTimeout(r, 400));

const before = await page.evaluate(() => {
  const st = window.CB_GAME.getState();
  const unlocked = Object.entries(st.bestiary).filter(([,b]) => b.unlocked).map(([id]) => id);
  return { id: st.currentContractId, unlocked, chip: document.getElementById('ts-chip')?.textContent };
});
console.log('fresh before', before);

const c = await page.evaluate(() => {
  const r = document.getElementById('ts-up').getBoundingClientRect();
  return { x: r.left + r.width/2, y: r.top + r.height/2 };
});
console.log('EFP', await page.evaluate((x,y) => {
  const el = document.elementFromPoint(x,y);
  return { id: el?.id, action: el?.getAttribute('data-action') };
}, c.x, c.y));

await page.mouse.click(c.x, c.y);
await new Promise(r => setTimeout(r, 700));

const after = await page.evaluate(() => {
  const st = window.CB_GAME.getState();
  const chip = document.getElementById('ts-chip');
  // find toast nodes
  const nodes = [...document.querySelectorAll('.toast, .toasts .item, #toast-host *, [class*="toast"]')];
  const visible = nodes.filter(n => n.textContent && n.offsetParent !== null).map(n => n.textContent.trim()).filter(Boolean);
  // also scan recently added
  const allText = [...document.querySelectorAll('body *')].filter(el => {
    const s = getComputedStyle(el);
    return el.textContent && el.textContent.includes('🔒') && s.opacity !== '0' && s.visibility !== 'hidden';
  }).slice(0,5).map(el => el.textContent.trim().slice(0,100));
  return {
    id: st.currentContractId,
    chip: chip?.textContent,
    chipLock: chip?.classList.contains('ts-locked'),
    visibleToasts: visible,
    lockTexts: allText,
  };
});
console.log('fresh after UP', after);
await page.screenshot({ path: '/workspace/contract-board/shots/iom6b_fresh_locked.png' });

// Also verify sprite/label change on multi with visual check
await page.evaluate(() => {
  localStorage.clear();
});
await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => {
  const st = window.CB_GAME.getState();
  window.CB_INTRO.skipIntro(st);
  st.hints = { boltAim: true };
  Object.keys(st.areas).forEach(a => st.areas[a].unlocked = true);
  (window.CB_DATA.contracts||[]).forEach(c => {
    window.CB_STATE.ensureBestiaryEntry(st, c.id).unlocked = true;
  });
  window.CB_STATE.switchHuntTarget(st, 'bristle_cub');
  window.CB_STATE.save(st);
  window.CB_UI.renderAll(st, 'hunt');
  window.CB_ARENA.render(st);
});
await new Promise(r => setTimeout(r, 400));
const visBefore = await page.evaluate(() => ({
  id: window.CB_GAME.getState().currentContractId,
  chip: document.getElementById('ts-chip')?.textContent,
  visual: window.CB_STATE.getContract?.(window.CB_GAME.getState().currentContractId)?.visual
    || window.CB_DATA.contracts.find(c => c.id === window.CB_GAME.getState().currentContractId)?.visual,
  mobEmoji: document.querySelector('.mob-emoji, .monster-emoji, .wave .emoji')?.textContent,
  canvasOrSprite: !!document.querySelector('canvas, .mob-sprite, .creature, .mob'),
}));
const cup = await page.evaluate(() => {
  const r = document.getElementById('ts-up').getBoundingClientRect();
  return { x: r.left+r.width/2, y: r.top+r.height/2 };
});
await page.mouse.click(cup.x, cup.y);
await new Promise(r => setTimeout(r, 500));
const visAfter = await page.evaluate(() => ({
  id: window.CB_GAME.getState().currentContractId,
  chip: document.getElementById('ts-chip')?.textContent,
  visual: window.CB_DATA.contracts.find(c => c.id === window.CB_GAME.getState().currentContractId)?.visual,
}));
console.log('sprite/label', visBefore, '=>', visAfter);
await page.screenshot({ path: '/workspace/contract-board/shots/iom6b_sprite_change.png' });

await browser.close();
