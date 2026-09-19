// Usage: node _tests/tools/backdrop-check.cjs [url]. Drives the color button and
// asserts the backdrop canvas is created and removed with it, and that the letters'
// hue cycle is 12 s. Headless Chromium needs SwiftShader for WebGL; the launch args
// below provide it. Prints PASS/FAIL per line and exits non-zero on any FAIL.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const url = process.argv[2] ?? 'http://localhost:4132/';

let failed = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : ` (expected ${expected}, got ${actual})`}`);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript(() => localStorage.setItem('color', 'off'));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const count = () => page.evaluate(() => document.querySelectorAll('.backdrop').length);
  const onCount = () => page.evaluate(() => document.querySelectorAll('.backdrop.is-on').length);
  const click = async () => {
    await page.click('button[data-toggle="color"]');
    await page.waitForTimeout(1000);
  };

  check('color off: no canvas in the DOM', await count(), 0);
  await click();
  check('color on: exactly one canvas', await count(), 1);
  check('color on: the canvas is faded in', await onCount(), 1);
  await click();
  check('color off again: the canvas is gone', await count(), 0);
  await click();
  check('color on again: exactly one canvas, not two', await count(), 1);
  // The home page's only h1 is .catalogue-title, which the rainbow rule excludes;
  // .nav-title carries the same 12 s keyframe on every page.
  check('hue cycle is 12 s', await page.evaluate(
    () => getComputedStyle(document.querySelector('.nav-title')).animationDuration), '12s');

  await browser.close();
  process.exit(failed ? 1 : 0);
})();
