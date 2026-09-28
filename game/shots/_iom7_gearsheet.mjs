// Visual review sheet of placeholder overlays (state set directly — art review only, not verification).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/usr/local/lib/node_modules/playwright-core');
const BASE = process.argv[2] || 'http://127.0.0.1:8777/';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome-stable', headless: true, args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
await p.goto(BASE + '?g=' + Date.now(), { waitUntil: 'networkidle' });
await p.evaluate(() => { const st = window.CB_GAME.getState(); window.CB_INTRO.skipIntro(st); st.hints={boltAim:true}; window.CB_UI.renderAll(st,'hunt'); window.CB_ARENA.markDirty(); window.CB_ARENA.render(st); });
const sets = [
  ['plain', {}, []],
  ['leather', { legs: 'legs_leather', body: 'body_leather', helm: 'helm_leather' }, []],
  ['iron', { legs: 'legs_iron', body: 'body_iron', helm: 'helm_iron' }, ['gear_iron']],
  ['mithril', { legs: 'legs_mithril', body: 'body_mithril', helm: 'helm_mithril' }, ['gear_iron','gear_steel','gear_mithril']],
  ['rune', { legs: 'legs_rune', body: 'body_rune', helm: 'helm_rune', cape: 'cape_slayer' }, ['gear_iron','gear_steel','gear_mithril','gear_adamant','gear_rune']],
  ['dragon', { legs: 'legs_dragon', body: 'body_dragon', helm: 'helm_dragon', cape: 'cape_slayer' }, ['gear_iron','gear_steel','gear_mithril','gear_adamant','gear_rune','gear_dragon']],
  ['slayer', { legs: 'legs_dragon', body: 'body_dragon', helm: 'helm_slayer', cape: 'cape_slayer' }, ['gear_iron','gear_steel','gear_mithril','gear_adamant','gear_rune','gear_dragon']],
];
for (const [name, eq, weps] of sets) {
  await p.evaluate(([eq, weps]) => {
    const st = window.CB_GAME.getState();
    st.gear = { owned: {}, equipped: { legs: null, body: null, helm: null, cape: null }, capeTrim: eq.cape ? 3 : 0 };
    Object.values(eq).forEach(id => { st.gear.owned[id] = true; });
    Object.assign(st.gear.equipped, eq);
    ['gear_iron','gear_steel','gear_mithril','gear_adamant','gear_rune','gear_dragon'].forEach(g => st.upgrades[g] = weps.includes(g) ? 1 : 0);
  }, [eq, weps]);
  await p.waitForTimeout(250);
  const bb = await p.locator('#player-avatar').boundingBox();
  await p.screenshot({ path: `/workspace/_sim/gs_${name}.png`, clip: { x: bb.x - 20, y: bb.y - 16, width: bb.width + 40, height: bb.height + 24 } });
}
await b.close();
