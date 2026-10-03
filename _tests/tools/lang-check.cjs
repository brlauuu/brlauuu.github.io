// Usage: node _tests/tools/lang-check.cjs <base url> <path of a yu post>
// Needs at least one yu post with tags in the build (add a throwaway one locally).
// Drives the language menu and checks filtering, translated text, <html lang>,
// persistence, the keyboard, no-JS English and the menu at 375 px.
// Prints ok/FAIL per check and exits non-zero on any FAIL.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = (process.argv[2] ?? 'http://localhost:4141').replace(/\/$/, '');
const yuPost = process.argv[3];
let failed = 0;
const ok = (name, cond, extra = '') => { if (!cond) failed++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${extra ? ` (${extra})` : ''}`); };
const shown = (page, sel) => page.$$eval(sel, (els) => els.filter((e) => e.getClientRects().length > 0).map((e) => e.innerText.trim()));
const shownLangs = (page, sel) => page.$$eval(sel, (els) => els.filter((e) => e.getClientRects().length > 0).map((e) => e.dataset.langs));

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const attr = (name) => page.getAttribute('html', name);

  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  ok('default language is en', (await attr('data-lang')) === 'en');
  ok('home lang attribute is en', (await attr('lang')) === 'en');
  ok('nav reads Archive', (await shown(page, '.nav ul li a')).includes('Archive'));
  ok('home lists only en posts', (await shownLangs(page, '.catalogue-item')).every((l) => l === 'en'));

  await page.click('.lang-menu summary');
  await page.click('[data-set-lang="yu"]');
  ok('menu sets yu', (await attr('data-lang')) === 'yu');
  ok('home lang attribute is sh', (await attr('lang')) === 'sh');
  ok('nav reads Arhiva', (await shown(page, '.nav ul li a')).includes('Arhiva'));
  const yuItems = await shownLangs(page, '.catalogue-item');
  ok('home lists only yu posts', yuItems.length > 0 && yuItems.every((l) => l === 'yu'), yuItems.join(','));
  ok('button shows the yu flag', (await page.$$eval('.lang-menu-button .flag', (els) => els.filter((e) => e.getClientRects().length).map((e) => e.dataset.t))).join() === 'yu');

  await page.reload({ waitUntil: 'networkidle' });
  ok('choice survives reload', (await attr('data-lang')) === 'yu');

  await page.goto(`${base}/archive`, { waitUntil: 'networkidle' });
  ok('archive hides en years', (await shownLangs(page, '.archive-year')).every((l) => l.split(' ').includes('yu')));
  ok('archive shows the yu note', (await shown(page, '.lang-empty')).join().includes('Arhiva je još prazna'));

  await page.goto(`${base}/tags`, { waitUntil: 'networkidle' });
  ok('tags list only yu posts', (await shownLangs(page, '.tag-posts li')).every((l) => l === 'yu'));
  const nodeHrefs = await page.$$eval('.constellation .node--post', (els) => els.map((e) => e.getAttribute('href')));
  ok('constellation holds only yu posts', nodeHrefs.length > 0 && nodeHrefs.every((h) => h === yuPost), nodeHrefs.join(','));
  await page.click('[data-toggle="theme"]');
  await page.waitForTimeout(300);
  const afterFlip = await page.$$eval('.constellation .node--post', (els) => els.map((e) => e.getAttribute('href')));
  ok('a theme flip keeps the yu graph', afterFlip.length === nodeHrefs.length && afterFlip.every((h) => h === yuPost));

  await page.goto(`${base}/2026-10-03/the-bottleneck-moved`, { waitUntil: 'networkidle' });
  ok('an en post keeps lang en', (await attr('lang')) === 'en');
  ok('the post notes its language', (await shown(page, '.post-lang-note')).join().includes('Dostupno samo na'));

  const focusOnOption = () => page.waitForFunction(() => document.activeElement?.dataset?.setLang);
  const isOpen = () => page.$eval('.lang-menu', (d) => d.open);
  await page.keyboard.press('l');
  await focusOnOption(); // the details toggle event, which moves focus, is async
  ok('l opens the menu', await isOpen());
  // Tale eases opacity, so wait for the transition to settle; a stuck .6 times out.
  const opaque = await page.waitForFunction(() => getComputedStyle(document.querySelector('.nav-toggles')).opacity === '1', null, { timeout: 3000 }).then(() => true, () => false);
  ok('keyboard-opened panel is fully opaque', opaque);
  ok('focus starts on the active option', await page.evaluate(() => document.activeElement.dataset.setLang === 'yu'));
  await page.keyboard.press('ArrowDown');
  ok('ArrowDown moves to sr', await page.evaluate(() => document.activeElement.dataset.setLang === 'sr'));
  await page.keyboard.press('Escape');
  ok('Esc closes', !(await isOpen()));
  ok('focus returns to the button', await page.evaluate(() => document.activeElement.matches('.lang-menu summary')));
  await page.keyboard.press('l');
  await focusOnOption();
  await page.keyboard.press('l');
  await page.waitForFunction(() => !document.querySelector('.lang-menu').open);
  ok('l with focus on an option closes the menu', !(await isOpen()));
  await page.waitForFunction(() => document.activeElement?.matches('.lang-menu summary'));
  ok('focus lands on the button after l', await page.evaluate(() => document.activeElement.matches('.lang-menu summary')));
  await page.keyboard.press('l');
  await focusOnOption();
  await page.keyboard.press('End');
  await page.keyboard.press('Tab');
  await page.waitForFunction(() => !document.querySelector('.lang-menu').open);
  ok('Tab past the last option closes the menu', !(await isOpen()));
  await page.keyboard.press('l');
  await focusOnOption();
  ok('menu is open before the outside click', await isOpen());
  await page.mouse.click(5, 600);
  await page.waitForFunction(() => !document.querySelector('.lang-menu').open);
  ok('an outside click closes', !(await isOpen()));
  ok('an outside click does not pull focus to the button', await page.evaluate(() => !document.activeElement.matches('.lang-menu summary')));
  await page.keyboard.press('l');
  await focusOnOption();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  ok('the note switches to Cyrillic', (await shown(page, '.post-lang-note')).join().includes('Доступно само на'));

  await page.evaluate(() => localStorage.setItem('lang', 'klingon'));
  await page.reload({ waitUntil: 'networkidle' });
  ok('an unknown stored value falls back to en', (await attr('data-lang')) === 'en');

  const phone = await browser.newPage({ viewport: { width: 375, height: 800 } });
  await phone.goto(`${base}/`, { waitUntil: 'networkidle' });
  await phone.click('.lang-menu summary');
  const r = await phone.$eval('.lang-menu-list', (e) => e.getBoundingClientRect().toJSON());
  ok('menu fits at 375 px', r.left >= 0 && r.right <= 375, `${Math.round(r.left)}..${Math.round(r.right)}`);

  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const plain = await noJs.newPage();
  await plain.goto(`${base}/`, { waitUntil: 'networkidle' });
  ok('no JS: nav reads Archive', (await shown(plain, '.nav ul li a')).includes('Archive'));
  ok('no JS: only en posts', (await shownLangs(plain, '.catalogue-item')).every((l) => l === 'en'));

  await browser.close();
  console.log(failed ? `${failed} FAILED` : 'ALL OK');
  process.exit(failed ? 1 : 0);
})();
