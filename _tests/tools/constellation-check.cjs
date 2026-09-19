// Usage: node _tests/tools/constellation-check.cjs <base url>
// Drives the tags page constellation in headless Chromium and checks the DOM
// contract theme.css and constellation.js are supposed to uphold: node/link
// counts, hover highlighting, click-to-hash, drag movement, the color-on
// gradient stroke, the pixel-on rect shapes, and the sub-600px teardown.
// Headless Chromium needs SwiftShader for WebGL (the backdrop canvas only
// paints while color is on); the launch args below provide it.
// Prints PASS/FAIL per line and exits non-zero on any FAIL.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = process.argv[2] ?? 'http://localhost:4132';
const url = base.replace(/\/$/, '') + '/tags';

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail !== undefined && !ok ? ` :: ${detail}` : ''}`);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });

  // --- Base DOM: node/link counts at 1280x900 -----------------------------
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const counts = await page.evaluate(() => ({
    nodes: document.querySelectorAll('.constellation .node').length,
    links: document.querySelectorAll('.constellation .link').length,
  }));
  check('node count is 11', counts.nodes === 11, `nodes=${counts.nodes}`);
  check('link count is 10', counts.links === 10, `links=${counts.links}`);

  // --- Hover tag:tools lights its posts, dims the rest --------------------
  const toolsBox = await page.locator('[data-id="tag:tools"] .shape').boundingBox();
  await page.mouse.move(toolsBox.x + toolsBox.width / 2, toolsBox.y + toolsBox.height / 2);
  await page.waitForTimeout(250);
  const hover = await page.evaluate(() => {
    const lit = [...document.querySelectorAll('.constellation .node.is-lit')].map((a) => a.dataset.id).sort();
    const dim = [...document.querySelectorAll('.constellation .node.is-dim')].map((a) => a.dataset.id).sort();
    const expectedPosts = [...document.querySelectorAll('.constellation .node--post')]
      .filter((a) => {
        const lines = document.querySelectorAll(`.constellation .link[data-source="${a.dataset.id}"][data-target="tag:tools"], .constellation .link[data-target="${a.dataset.id}"][data-source="tag:tools"]`);
        return lines.length > 0;
      })
      .map((a) => a.dataset.id)
      .sort();
    return { lit, dim, expectedPosts, total: document.querySelectorAll('.constellation .node').length };
  });
  const expectedLit = ['tag:tools', ...hover.expectedPosts].sort();
  check(
    'hover tag:tools lights its posts and dims the rest',
    JSON.stringify(hover.lit) === JSON.stringify(expectedLit) && hover.dim.length === hover.total - hover.lit.length,
    `lit=${JSON.stringify(hover.lit)} expected=${JSON.stringify(expectedLit)} dim=${hover.dim.length}`,
  );
  await page.mouse.move(5, 5);
  await page.waitForTimeout(200);

  // --- Drag tag:tools by 120px moves its transform by more than 60 SVG units
  const before = await page.evaluate(() => document.querySelector('[data-id="tag:tools"]').getAttribute('transform'));
  const dragBox = await page.locator('[data-id="tag:tools"] .shape').boundingBox();
  await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    await page.mouse.move(dragBox.x + dragBox.width / 2 + i * 10, dragBox.y + dragBox.height / 2);
    await page.waitForTimeout(16);
  }
  const after = await page.evaluate(() => document.querySelector('[data-id="tag:tools"]').getAttribute('transform'));
  await page.mouse.up();
  const parse = (s) => s.match(/translate\(([-\d.]+) ([-\d.]+)\)/).slice(1).map(Number);
  const dist = Math.hypot(parse(after)[0] - parse(before)[0], parse(after)[1] - parse(before)[1]);
  check('dragging tag:tools by 120px moves its transform more than 60 SVG units', dist > 60, `dist=${dist.toFixed(1)} before=${before} after=${after}`);
  await page.waitForTimeout(300);

  // --- Click tag:python sets hash #python ----------------------------------
  await page.evaluate(() => { location.hash = ''; });
  const pyBox = await page.locator('[data-id="tag:python"] .shape').boundingBox();
  await page.mouse.move(pyBox.x + pyBox.width / 2, pyBox.y + pyBox.height / 2);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(400);
  const hash = await page.evaluate(() => location.hash);
  check("click tag:python sets hash '#python'", hash === '#python', `hash=${hash}`);

  await page.close();

  // --- Color on: .link computed stroke starts with url( -------------------
  const colorPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await colorPage.addInitScript(() => { localStorage.setItem('color', 'on'); });
  await colorPage.goto(url, { waitUntil: 'networkidle' });
  await colorPage.waitForTimeout(1500);
  const linkStroke = await colorPage.evaluate(() => {
    const line = document.querySelector('.constellation .link');
    return line ? getComputedStyle(line).stroke : null;
  });
  check("color on: .link computed stroke starts with 'url('", !!linkStroke && linkStroke.startsWith('url('), `stroke=${linkStroke}`);
  await colorPage.close();

  // --- Pixel on: shapes are <rect> elements --------------------------------
  const pixelPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await pixelPage.addInitScript(() => { localStorage.setItem('style', 'pixel'); });
  await pixelPage.goto(url, { waitUntil: 'networkidle' });
  await pixelPage.waitForTimeout(1500);
  const shapeTags = await pixelPage.evaluate(() =>
    [...document.querySelectorAll('.constellation .node .shape')].map((s) => s.tagName.toLowerCase()));
  check(
    'pixel on: shapes are <rect> elements',
    shapeTags.length > 0 && shapeTags.every((t) => t === 'rect'),
    `shapes=${JSON.stringify(shapeTags)}`,
  );
  await pixelPage.close();

  // --- Under 600px: container display none, no nodes ----------------------
  const mobilePage = await browser.newPage({ viewport: { width: 375, height: 800 } });
  await mobilePage.goto(url, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);
  const mobile = await mobilePage.evaluate(() => ({
    display: getComputedStyle(document.getElementById('constellation')).display,
    nodes: document.querySelectorAll('.constellation .node').length,
  }));
  check('375px: container is display none and there are no nodes', mobile.display === 'none' && mobile.nodes === 0, JSON.stringify(mobile));
  await mobilePage.close();

  await browser.close();
  process.exit(failed ? 1 : 0);
})();
