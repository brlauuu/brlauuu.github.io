const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../vercel.json'), 'utf8'));

// brlauuu.dev/<project> pages (#43). Vercel runs redirects before rewrites.
test('brlauuu.dev/flatpare redirects to flatpare.com, keeping the path', () => {
  assert.deepEqual(config.redirects.filter((r) => r.source.startsWith('/flatpare')).map((r) => [r.source, r.destination]), [
    ['/flatpare', 'https://flatpare.com'],
    ['/flatpare/:path*', 'https://flatpare.com/:path*'],
  ]);
});

// The podlog landing page is the repository's GitHub Pages site, proxied so the
// address stays brlauuu.dev/podlog/. Its assets are relative, hence the slash.
// The source is a regex because Vercel's /podlog/:path* does not match /podlog/
// itself (it served NOT_FOUND there while the assets proxied fine).
test('brlauuu.dev/podlog/ shows the podlog GitHub Pages site', () => {
  assert.ok(config.redirects.some((r) => r.source === '/podlog' && r.destination === '/podlog/'));
  const rule = config.rewrites.find((r) => r.source === '/podlog/(.*)');
  assert.equal(rule?.destination, 'https://brlauuu.github.io/podlog/$1');
  assert.ok(new RegExp(`^${rule.source}$`).test('/podlog/'));
});
