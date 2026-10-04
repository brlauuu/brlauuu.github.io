const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.join(__dirname, '..');
const load = () => import(pathToFileURL(path.join(root, '_tests/lib/posts.mjs')).href);

// Every post exists in en, yu and sr, and each version agrees with the original:
// same code, links, headings and footnotes, same ref, and sr is yu in Cyrillic.
test('every post exists in all three languages and its versions agree', async () => {
  const { LANGS, FOLDERS, parsePost, checkPost } = await load();
  const posts = {};
  for (const lang of LANGS) {
    for (const file of fs.readdirSync(path.join(root, FOLDERS[lang])).filter((f) => f.endsWith('.md'))) {
      (posts[file] ||= {})[lang] = parsePost(fs.readFileSync(path.join(root, FOLDERS[lang], file), 'utf8'));
    }
  }
  const problems = [];
  for (const [file, versions] of Object.entries(posts)) {
    const present = LANGS.filter((l) => versions[l]);
    const source = present.find((l) => !versions[l].aiTranslated) || present[0];
    for (const p of checkPost(versions, source)) problems.push(`${file}: ${p}`);
  }
  assert.deepEqual(problems, []);
});

test('no post sits directly in _posts (each language has its folder)', () => {
  const loose = fs.readdirSync(path.join(root, '_posts')).filter((f) => f.endsWith('.md'));
  assert.deepEqual(loose, []);
});
