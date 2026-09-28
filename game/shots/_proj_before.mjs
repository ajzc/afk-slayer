import puppeteer from '/tmp/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';
import fs from 'fs';
const OUT = '/workspace/contract-board/shots';
fs.mkdirSync(OUT, { recursive: true });

async function midShot(w, h, name) {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome-stable',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', `--window-size=${w},${h}`],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:8765/?before=' + Date.now(), { waitUntil: 'networkidle0' });
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
  await new Promise(r => setTimeout(r, 600));
  // Aim at a mob center and hold
  const aim = await page.evaluate(() => {
    const mob = document.querySelector('.mob');
    const arena = document.getElementById('arena') || document.querySelector('.arena');
    const hz = document.getElementById('hold-zone');
    const r = (mob || hz).getBoundingClientRect();
    const ar = arena.getBoundingClientRect();
    return {
      x: r.left + r.width/2,
      y: r.top + r.height/2,
      player: (() => {
        const p = document.getElementById('player-avatar');
        const pr = p.getBoundingClientRect();
        return { x: pr.left+pr.width/2, y: pr.top+pr.height/2, w: pr.width, h: pr.height };
      })(),
    };
  });
  await page.mouse.move(aim.x, aim.y);
  await page.mouse.down();
  // Capture 3 frames while bolts fly
  for (let i = 0; i < 3; i++) {
    await new Promise(r => setTimeout(r, 180));
    await page.screenshot({ path: `${OUT}/${name}_f${i}.png` });
  }
  // Inspect live bolt DOM
  const info = await page.evaluate(() => {
    const bolts = [...document.querySelectorAll('.proj.player-bolt, .proj.cb-proj')];
    const b = bolts[0];
    if (!b) return { n: 0 };
    const cs = getComputedStyle(b);
    const r = b.getBoundingClientRect();
    const p = document.getElementById('player-avatar').getBoundingClientRect();
    return {
      n: bolts.length,
      w: r.width, h: r.height,
      left: r.left, top: r.top,
      bg: cs.backgroundImage.slice(0, 80),
      bgColor: cs.backgroundColor,
      borderRadius: cs.borderRadius,
      className: b.className,
      playerCenter: { x: p.left+p.width/2, y: p.top+p.height/2 },
      boltCenter: { x: r.left+r.width/2, y: r.top+r.height/2 },
      offsetFromPlayer: {
        dx: (r.left+r.width/2) - (p.left+p.width/2),
        dy: (r.top+r.height/2) - (p.top+p.height/2),
      },
    };
  });
  await page.mouse.up();
  console.log(name, JSON.stringify(info, null, 2));
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await browser.close();
}

await midShot(390, 844, 'proj_before_390');
await midShot(1024, 768, 'proj_before_1024');
console.log('done before');
