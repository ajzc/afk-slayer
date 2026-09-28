import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/usr/local/lib/node_modules/playwright-core');
const BASE = process.argv[2] || 'http://127.0.0.1:8777/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome-stable', headless: true, args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
await p.goto(BASE + '?f=' + Date.now(), { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await p.screenshot({ path: '/workspace/_sim/ex0.png' });
const s = await p.evaluate(() => {
  const st = window.CB_GAME.getState();
  const vis = [...document.querySelectorAll('button,[data-action]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; })
    .map(e => (e.dataset.action || e.id || e.className).toString().slice(0, 30) + ':' + e.innerText.trim().slice(0, 25));
  return { sl: window.CB_STATE.getSlayerLevel(st), cid: st.currentContractId, prog: st.contractProgress, gold: st.gold, intro: st.intro && JSON.stringify(st.intro).slice(0, 200), vis };
});
console.log(JSON.stringify(s, null, 1));
await b.close();
