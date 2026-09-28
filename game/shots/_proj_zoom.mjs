import { launch, freshHunt } from './_pw.mjs';
const b = await launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
await freshHunt(page, 'https://afk-slayer.ajchapman20.workers.dev/?z=' + Date.now(), "st.features = Object.assign({}, st.features, { crits: true });");
const mob = await page.evaluate(() => { const r = document.querySelector('.mob .mob-body').getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height/2 }; });
const pl = await page.evaluate(() => { const r = document.getElementById('player-avatar').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
const clip = { x: Math.max(0, Math.min(mob.x, pl.x) - 40), y: Math.max(0, mob.y - 50) };
clip.width = Math.min(390 - clip.x, Math.abs(pl.x + pl.w - mob.x) + 120); clip.height = pl.y + pl.h - clip.y + 10;
await page.mouse.move(mob.x, mob.y);
// tap-and-hold via mouse (pointer events path)
await page.mouse.down();
await page.waitForTimeout(650);
// Wait for a fresh bolt to be launched, then grab 3 sequential frames through its flight
await page.evaluate(async () => { for (let i = 0; i < 120; i++) { await new Promise(r => requestAnimationFrame(r)); const el = [...document.querySelectorAll('.pbolt')].find(e => { const a = e.getAnimations()[0]; return a && a.currentTime < 30; }); if (el) return; } });
for (let i = 0; i < 3; i++) { await page.screenshot({ path: `proj_after_seq_f${i}.png`, clip }); }
// impact frame
await page.evaluate(async () => { for (let i = 0; i < 120; i++) { await new Promise(r => requestAnimationFrame(r)); if (document.querySelector('.pbolt-impact')) return; } });
await page.screenshot({ path: 'proj_after_impact.png', clip });
const impactInfo = await page.evaluate(() => { const b = document.querySelector('.mob .mob-body'); return { flash: b && b.style.filter, knock: b && b.style.translate, sparks: document.querySelectorAll('.pbolt-spark').length }; });
await page.mouse.up();
// real tap emulation at 390
await page.waitForTimeout(700);
const before = await page.evaluate(() => document.querySelectorAll('.pbolt').length);
await page.touchscreen.tap(mob.x, mob.y);
await page.waitForTimeout(120);
const afterTap = await page.evaluate(() => document.querySelectorAll('.pbolt, .pbolt-impact').length);
console.log(JSON.stringify({ clip, impactInfo, tapFiredBolt: afterTap > before }));
await b.close();
