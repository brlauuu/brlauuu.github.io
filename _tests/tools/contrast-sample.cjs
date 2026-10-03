// Usage: node _tests/tools/contrast-sample.cjs <base url>
// Body text must stay at or above 3:1 against what is behind it (backdrop lane plus
// halo). For the first three paragraphs of a post, light and dark color-on, it
// screenshots the paragraph with its glyphs made transparent (halo kept), takes the
// 10th-percentile-worst contrast between the text color and those pixels, and fails
// under 3:1. Headings are exempt by design.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = (process.argv[2] ?? 'http://localhost:4132').replace(/\/$/, '');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  let failed = 0;
  for (const theme of ['light', 'dark']) for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.addInitScript((t) => { localStorage.setItem('theme', t); localStorage.setItem('color', 'on'); }, theme);
    await page.emulateMedia({ reducedMotion: 'reduce' });   // a still frame: stable pixels
    await page.goto(base + '/2026-01-28/industrialized-gambling', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const textRgb = await page.evaluate(() => getComputedStyle(document.querySelector('.post p')).color);
    await page.addStyleTag({ content: '.post p, .post p * { color: transparent !important; }' });
    for (let i = 0; i < 3; i++) {
      const box = await page.locator('.post p').nth(i).boundingBox();
      const png = await page.screenshot({ clip: box });
      const ratio = await page.evaluate(async ({ data, text }) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + data;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const px = ctx.getImageData(0, 0, c.width, c.height).data;
        const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        const [tr, tg, tb] = text.match(/\d+/g).map(Number);
        const lt = lum(tr, tg, tb);
        const ratios = [];
        for (let k = 0; k < px.length; k += 16) {
          const lb = lum(px[k], px[k + 1], px[k + 2]);
          ratios.push((Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05));
        }
        ratios.sort((a, b) => a - b);
        return ratios[Math.floor(ratios.length * 0.1)];
      }, { data: png.toString('base64'), text: textRgb });
      const ok = ratio >= 3;
      if (!ok) failed++;
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${theme} ${width}px paragraph ${i + 1}: ${ratio.toFixed(2)}:1`);
    }
    await page.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
