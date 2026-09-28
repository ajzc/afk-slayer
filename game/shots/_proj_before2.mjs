import puppeteer from '/tmp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
const OUT = '/workspace/contract-board/shots';
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:8765/?b2=' + Date.now(), { waitUntil: 'networkidle0' });
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
await new Promise(r => setTimeout(r, 500));

const hz = await page.evaluate(() => {
  const z = document.getElementById('hold-zone');
  const r = z.getBoundingClientRect();
  const mob = document.querySelector('.mob');
  const mr = mob ? mob.getBoundingClientRect() : null;
  return {
    zx: r.left + r.width/2, zy: r.top + r.height * 0.35,
    mx: mr ? mr.left+mr.width/2 : r.left+r.width/2,
    my: mr ? mr.top+mr.height/2 : r.top+r.height*0.3,
  };
});
console.log('aim', hz);
await page.mouse.move(hz.mx, hz.my);
await page.mouse.down();

// Poll for bolts up to 3s
let found = null;
for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 100));
  const snap = await page.evaluate(() => {
    const bolts = [...document.querySelectorAll('.proj')];
    const holding = document.getElementById('player-avatar')?.classList.contains('beaming')
      || document.getElementById('player-avatar')?.classList.contains('firing');
    const b = bolts.find(el => el.classList.contains('player-bolt') || el.className.includes('bolt')) || bolts[0];
    if (!b) return { n: bolts.length, holding, classes: bolts.map(x => x.className) };
    const r = b.getBoundingClientRect();
    const p = document.getElementById('player-avatar').getBoundingClientRect();
    const cs = getComputedStyle(b);
    return {
      n: bolts.length, holding,
      className: b.className,
      w: +r.width.toFixed(1), h: +r.height.toFixed(1),
      bolt: { x: +(r.left+r.width/2).toFixed(1), y: +(r.top+r.height/2).toFixed(1) },
      player: { x: +(p.left+p.width/2).toFixed(1), y: +(p.top+p.height/2).toFixed(1), top: +p.top.toFixed(1), bottom: +p.bottom.toFixed(1) },
      dx: +((r.left+r.width/2) - (p.left+p.width/2)).toFixed(1),
      dy: +((r.top+r.height/2) - (p.top+p.height/2)).toFixed(1),
      bg: cs.backgroundImage.slice(0,100),
      bgCol: cs.background,
      radius: cs.borderRadius,
      transform: cs.transform,
    };
  });
  if (snap.n > 0) {
    found = snap;
    await page.screenshot({ path: `${OUT}/proj_before_390.png` });
    await page.screenshot({ path: `${OUT}/proj_before_390_f0.png` });
    await new Promise(r => setTimeout(r, 120));
    await page.screenshot({ path: `${OUT}/proj_before_390_f1.png` });
    await new Promise(r => setTimeout(r, 120));
    await page.screenshot({ path: `${OUT}/proj_before_390_f2.png` });
    console.log('FOUND', JSON.stringify(snap, null, 2));
    break;
  }
  if (i === 5) console.log('tick5', snap);
}
if (!found) console.log('NO BOLTS');

await page.mouse.up();

// 1024
await page.setViewport({ width: 1024, height: 768, deviceScaleFactor: 1 });
await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => {
  const st = window.CB_GAME.getState();
  window.CB_INTRO.skipIntro(st);
  st.hints = { boltAim: true };
  window.CB_UI.renderAll(st, 'hunt');
  window.CB_ARENA.render(st);
});
await new Promise(r => setTimeout(r, 400));
const hz2 = await page.evaluate(() => {
  const mob = document.querySelector('.mob');
  const r = (mob || document.getElementById('hold-zone')).getBoundingClientRect();
  return { x: r.left+r.width/2, y: r.top+r.height/2 };
});
await page.mouse.move(hz2.x, hz2.y);
await page.mouse.down();
for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 100));
  const n = await page.evaluate(() => document.querySelectorAll('.proj').length);
  if (n > 0) {
    await page.screenshot({ path: `${OUT}/proj_before_1024.png` });
    await page.screenshot({ path: `${OUT}/proj_before_1024_f0.png` });
    const snap = await page.evaluate(() => {
      const b = document.querySelector('.proj');
      const r = b.getBoundingClientRect();
      const p = document.getElementById('player-avatar').getBoundingClientRect();
      const cs = getComputedStyle(b);
      return {
        n: document.querySelectorAll('.proj').length,
        className: b.className, w: r.width, h: r.height,
        dx: (r.left+r.width/2)-(p.left+p.width/2),
        dy: (r.top+r.height/2)-(p.top+p.height/2),
        bg: cs.backgroundImage.slice(0,80),
      };
    });
    console.log('1024', JSON.stringify(snap, null, 2));
    await new Promise(r => setTimeout(r, 100));
    await page.screenshot({ path: `${OUT}/proj_before_1024_f1.png` });
    break;
  }
}
await page.mouse.up();
await browser.close();
