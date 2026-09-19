// Usage: node _tests/perf.cjs <url> [seconds]. Reports frames per second and long
// tasks with the backdrop on. Headless Chromium renders GL in software (SwiftShader),
// so fps here is a floor, not what a GPU does; the long-task count is the number that
// must hold.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const [url, seconds = '10'] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.addInitScript(() => localStorage.setItem('color', 'on'));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const result = await page.evaluate((secs) => new Promise((resolve) => {
    const longTasks = [];
    try { new PerformanceObserver((list) => longTasks.push(...list.getEntries().map((e) => e.duration))).observe({ type: 'longtask', buffered: true }); } catch {}
    let frames = 0;
    const t0 = performance.now();
    const tick = (now) => {
      frames++;
      if (now - t0 < secs * 1000) requestAnimationFrame(tick);
      else resolve({ fps: frames / secs, longTasks: longTasks.filter((d) => d > 50).length });
    };
    requestAnimationFrame(tick);
  }), Number(seconds));
  const longAnimationFrames = await page.evaluate(() =>
    performance.getEntriesByType ? performance.getEntriesByType('long-animation-frame').length : -1);
  console.log(JSON.stringify({ ...result, longAnimationFrames }));
  await browser.close();
})();
