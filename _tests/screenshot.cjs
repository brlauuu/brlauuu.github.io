// Usage: [COLOR=on] [STYLE=pixel] node _tests/screenshot.cjs <url> <light|dark> <out.png> [full]
// Requires Playwright's Chromium; set PLAYWRIGHT_CHROMIUM to the executable if
// the default download is missing. The nav is cropped unless "full" is given.
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const [url, theme, out, full] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript(({ theme, color, style }) => {
    localStorage.setItem('theme', theme);
    if (color) localStorage.setItem('color', color);
    if (style) localStorage.setItem('style', style);
  }, { theme, color: process.env.COLOR, style: process.env.STYLE });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const clip = full ? undefined : { x: 0, y: 70, width: 1280, height: 830 };
  await page.screenshot({ path: path.resolve(out), clip });
  await browser.close();
})();
