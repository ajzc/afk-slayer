import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('/usr/local/lib/node_modules/playwright-core');
export async function launch() {
  return chromium.launch({ executablePath: '/usr/bin/google-chrome-stable', headless: true, args: ['--no-sandbox', '--disable-gpu'] });
}
export async function freshHunt(page, base, setup) {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate((setupSrc) => {
    const st = window.CB_GAME.getState();
    window.CB_INTRO.skipIntro(st);
    st.hints = Object.assign({}, st.hints, { boltAim: true });
    if (setupSrc) (new Function('st', setupSrc))(st);
    window.CB_STATE.save(st);
    window.CB_UI.renderAll(st, 'hunt');
    window.CB_ARENA.markDirty(); window.CB_ARENA.render(st);
  }, setup || '');
  await page.waitForTimeout(500);
}
