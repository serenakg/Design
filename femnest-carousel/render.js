const { chromium } = require('playwright');
const path = require('path');

const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const DIR = __dirname;

(async () => {
  const browser = await chromium.launch({ executablePath: EXECUTABLE });
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 2,
  });
  await page.goto('file://' + path.join(DIR, 'FemNEST_TheWhy_source.html'));
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(600);

  for (let i = 1; i <= 4; i++) {
    const el = await page.$('#slide' + i);
    const out = path.join(DIR, 'FemNEST_TheWhy_' + i + '.png');
    await el.screenshot({ path: out });
    console.log('rendered', out);
  }
  await browser.close();
})();
