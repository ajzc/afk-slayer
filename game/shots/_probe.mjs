import { launch, freshHunt } from './_pw.mjs';
const b = await launch(); const page = await b.newPage({ viewport: { width: 390, height: 844 } });
await freshHunt(page, 'https://afk-slayer.ajchapman20.workers.dev/?p=' + Date.now());
await page.evaluate(() => { window.__p = { flash: 0, knock: 0, impact: 0, sparks: 0, muzzle: 0, maxNodes: 0, created: 0 };
  const L = document.getElementById('proj-layer') || document.querySelector('.proj-layer');
  const seen = new WeakSet();
  const f = () => { const p = window.__p; document.querySelectorAll('.mob-body').forEach(b => { if (b.style.filter.includes('brightness')) p.flash++; if (b.style.translate) p.knock++; });
    for (const n of L.children) { if (!seen.has(n)) { seen.add(n); p.created++; } if (n.classList.contains('pbolt-impact')) p.impact++; if (n.classList.contains('pbolt-spark')) p.sparks++; if (n.classList.contains('pbolt-muzzle')) p.muzzle++; }
    p.maxNodes = Math.max(p.maxNodes, L.childElementCount); requestAnimationFrame(f); }; requestAnimationFrame(f); });
const mob = await page.evaluate(() => { const r = document.querySelector('.mob .mob-body').getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 }; });
await page.mouse.move(mob.x, mob.y); await page.mouse.down(); await page.waitForTimeout(6000); await page.mouse.up();
console.log(JSON.stringify(await page.evaluate(() => window.__p)));
await b.close();
