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

// Everything on brlauuu.github.io is also on brlauuu.dev: a path the Vercel
// build has no file for is proxied to github.io, which also serves every
// repository's GitHub Pages site under /<repository>/ (podlog, cardak,
// inbox-mcp, and any added later). Vercel checks the build's files before
// rewrites, so the blog itself is still served from the Vercel build.
test('brlauuu.dev falls back to brlauuu.github.io for every path', () => {
  assert.deepEqual(config.rewrites, [{ source: '/(.*)', destination: 'https://brlauuu.github.io/$1' }]);
  const source = new RegExp(`^${config.rewrites[0].source}$`);
  for (const p of ['/', '/podlog/', '/cardak/app.js', '/inbox-mcp/']) assert.ok(source.test(p), p);
});

// A bare /<repository> on github.io answers with a redirect to
// https://brlauuu.github.io/<repository>/, which would take the visitor off
// brlauuu.dev, so the Pages sites get their trailing slash here first. Their
// assets are relative, so the slash is needed anyway.
test('bare project paths redirect to their trailing slash on brlauuu.dev', () => {
  const rule = config.redirects.find((r) => r.destination === '/:project/');
  assert.equal(rule?.source, '/:project(podlog|cardak|inbox-mcp)');
  assert.equal(rule.permanent, true);
});
