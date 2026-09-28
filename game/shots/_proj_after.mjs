import { launch, freshHunt } from './_pw.mjs';
const BASE = process.argv[2] || 'http://127.0.0.1:8765/';
const TAG = process.argv[3] || 'proj_after';
const b = await launch();
for (const [w, h, touch] of [[390, 844, true], [1024, 768, false]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await freshHunt(page, BASE + '?t=' + Date.now());
  const build = await page.evaluate(() => window.CB_DATA.BUILD_ID);
  const mob = await page.evaluate(() => { const r = document.querySelector('.mob .mob-body').getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 }; });
  // count rAF frames for fps
  await page.evaluate(() => { window.__fr = 0; const f = () => { window.__fr++; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await page.mouse.move(mob.x, mob.y);
  await page.mouse.down();
  // wait for the 2nd shot's flight, capture 3 sequential frames
  let shotInfo = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 3000) {
    const n = await page.evaluate(() => document.querySelectorAll('.pbolt').length);
    if (n && Date.now() - t0 > 700) break;
    await page.waitForTimeout(15);
  }
  for (let i = 0; i < 3; i++) {
    await page.screenshot({ path: `${TAG}_${w}_f${i}.png` });
    if (i === 0) shotInfo = await page.evaluate(() => {
      const bolt = document.querySelector('.pbolt');
      const core = bolt && bolt.querySelector('.pbolt-core');
      const cr = core && core.getBoundingClientRect();
      const body = document.querySelector('#player-avatar .cb-body').getBoundingClientRect();
      return { core: cr && { w: +cr.width.toFixed(1), h: +cr.height.toFixed(1) }, bg: core && getComputedStyle(core).backgroundImage.slice(-40),
        player: { w: +body.width.toFixed(1), h: +body.height.toFixed(1) },
        orb: { x: +(body.left + body.width * 0.205).toFixed(1), y: +(body.top + body.height * 0.121).toFixed(1) } };
    });
    await page.waitForTimeout(45);
  }
  // Measure where a new bolt starts vs orb: sample right after a shot begins
  const start = await page.evaluate(async () => {
    const seen = new WeakSet();
    for (let k = 0; k < 200; k++) {
      await new Promise(r => requestAnimationFrame(r));
      for (const el of document.querySelectorAll('.pbolt')) {
        if (seen.has(el)) continue;
        const an = el.getAnimations()[0];
        if (an && an.currentTime != null && an.currentTime < 40) {
          const core = el.querySelector('.pbolt-core').getBoundingClientRect();
          const body = document.querySelector('#player-avatar .cb-body').getBoundingClientRect();
          const mz = document.querySelector('.pbolt-muzzle');
          const mr = mz && mz.getBoundingClientRect();
          return { boltCenter: { x: +(core.left + core.width/2).toFixed(1), y: +(core.top + core.height/2).toFixed(1) },
            bodyCenter: { x: +(body.left + body.width/2).toFixed(1), y: +(body.top + body.height/2).toFixed(1) },
            orbApprox: { x: +(body.left + body.width*0.22).toFixed(1), y: +(body.top + body.height*0.121).toFixed(1) },
            muzzle: mr && { x: +mr.left.toFixed(1), y: +(mr.top + mr.height/2).toFixed(1) } };
        }
        seen.add(el);
      }
    }
    return null;
  });
  // Shot cadence + pool size over 4s hold
  const cad = await page.evaluate(async () => {
    const times = []; let last = 0;
    const mo = new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('pbolt')) times.push(performance.now()); });
    mo.observe(document.getElementById('proj-layer') || document.querySelector('.proj-layer'), { childList: true });
    const fr0 = window.__fr, t0 = performance.now();
    let maxNodes = 0;
    while (performance.now() - t0 < 4000) { await new Promise(r => setTimeout(r, 50)); maxNodes = Math.max(maxNodes, (document.getElementById('proj-layer') || document.querySelector('.proj-layer')).childElementCount); }
    mo.disconnect();
    const gaps = times.slice(1).map((t, i) => Math.round(t - times[i]));
    return { shots: times.length, gaps, fps: +((window.__fr - fr0) / ((performance.now() - t0)/1000)).toFixed(1), maxLayerNodes: maxNodes };
  });
  const splats = await page.evaluate(() => [...document.querySelectorAll('.float-txt, .hit-splat, [class*="splat"]')].slice(0,4).map(e => e.textContent.trim()).filter(Boolean));
  await page.mouse.up();
  await page.screenshot({ path: `${TAG}_${w}.png` });
  console.log(JSON.stringify({ w, build, shotInfo, start, cad, splats, errs }, null, 1));
  await ctx.close();
}
await b.close();
