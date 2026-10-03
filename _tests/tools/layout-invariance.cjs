// Usage: node _tests/tools/layout-invariance.cjs <base url>
// Within one style, flipping theme or color must never move text. For every page,
// at 1280 and 390 px, in smooth and in pixel, records the client rects of every text
// node plus images, code blocks and the share button under light + color off, then
// under the other three theme x color combinations, and fails on any difference over
// 0.5 px. Smooth vs pixel is never compared (the font changes on purpose).
// The constellation is skipped (it animates) and GitHub API calls are aborted so the
// home sidebar renders the same fallback on every load.
// Prints PASS/FAIL per combination and exits non-zero on any FAIL.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = (process.argv[2] ?? 'http://localhost:4132').replace(/\/$/, '');

const PAGES = [
  '/', '/archive', '/tags', '/about',
  '/2026-01-28/industrialized-gambling', '/2026-10-03/the-bottleneck-moved',
  '/2020-12-09/Peculiar-case-of-BLAT-output', '/2021-02-02/motevowrapper',
];
const WIDTHS = [1280, 390];
const STYLES = ['smooth', 'pixel'];
const COMBOS = [['dark', 'off'], ['light', 'on'], ['dark', 'on']];
const TOLERANCE = 0.5;

function collect() {
  const out = [];
  const skip = 'script, style, .backdrop, .constellation, .melt-filters, dialog:not([open])';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.textContent.trim() && !n.parentElement.closest(skip)
      ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const range = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      out.push({ key: JSON.stringify(n.textContent.trim().slice(0, 30)), x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height });
    }
  }
  for (const el of document.querySelectorAll('img, pre, .share-button')) {
    const r = el.getBoundingClientRect();
    out.push({ key: el.tagName.toLowerCase() + (el.className ? '.' + el.className : ''), x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height });
  }
  return out;
}

async function measure(browser, url, width, theme, color, style) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  await ctx.route('https://api.github.com/**', (route) => route.abort());
  const page = await ctx.newPage();
  await page.addInitScript((axes) => {
    for (const [k, v] of Object.entries(axes)) localStorage.setItem(k, v);
  }, { theme, color, style });
  await page.goto(base + url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const rects = await page.evaluate(collect);
  await ctx.close();
  return rects;
}

function diff(a, b) {
  const problems = [];
  if (a.length !== b.length) problems.push(`rect count ${a.length} -> ${b.length}`);
  for (let i = 0; i < Math.min(a.length, b.length) && problems.length < 3; i++) {
    const p = a[i], q = b[i];
    const d = Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y), Math.abs(p.w - q.w), Math.abs(p.h - q.h));
    if (p.key !== q.key || d > TOLERANCE) problems.push(`${p.key} moved ${d.toFixed(1)}px (${p.x.toFixed(1)},${p.y.toFixed(1)} -> ${q.x.toFixed(1)},${q.y.toFixed(1)})`);
  }
  return problems;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  let failed = 0;
  for (const url of PAGES) for (const width of WIDTHS) for (const style of STYLES) {
    const baseline = await measure(browser, url, width, 'light', 'off', style);
    for (const [theme, color] of COMBOS) {
      const problems = diff(baseline, await measure(browser, url, width, theme, color, style));
      if (problems.length) failed++;
      console.log(`${problems.length ? 'FAIL' : 'PASS'}  ${url} ${width}px ${style} ${theme}/${color}${problems.length ? ' :: ' + problems.join(' | ') : ''}`);
    }
  }
  // The halo must never paint through transparent gradient headings.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('color', 'on'));
    await page.goto(base + '/about', { waitUntil: 'networkidle' });
    const shadows = await page.evaluate(() => ({
      h1: getComputedStyle(document.querySelector('h1')).textShadow,
      p: getComputedStyle(document.querySelector('main p')).textShadow,
    }));
    const ok = shadows.h1 === 'none' && shadows.p !== 'none';
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  halo on body text only :: ${JSON.stringify(shadows)}`);
    await ctx.close();
  }
  // The hue cycle must actually run, with the mood's keyframes.
  for (const [theme, expected] of [['light', 'rainbow-cycle'], ['dark', 'dread-pulse-glow']]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript((t) => { localStorage.setItem('theme', t); localStorage.setItem('color', 'on'); }, theme);
    await page.goto(base + '/2026-01-28/industrialized-gambling', { waitUntil: 'networkidle' });
    const name = await page.evaluate(() => getComputedStyle(document.querySelector('main h2')).animationName);
    const ok = name === expected;
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${theme} heading animation is ${expected} :: ${name}`);
    await ctx.close();
  }
  // --melt reaches headings only; strips and rings keep the plain hue cycle.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('color', 'on'));
    await page.goto(base + '/2026-01-28/industrialized-gambling', { waitUntil: 'networkidle' });
    const filters = await page.evaluate(() => ({
      title: getComputedStyle(document.querySelector('.post-title')).filter,
      line: getComputedStyle(document.querySelector('.post-line') || document.querySelector('footer'), '::after').filter,
      lineEl: document.querySelector('.post-line') ? '.post-line' : 'footer',
    }));
    const ok = filters.title.includes('url(') && !filters.line.includes('url(');
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  melt on headings only :: ${JSON.stringify(filters)}`);
    await ctx.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
