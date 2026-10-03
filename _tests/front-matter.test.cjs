const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '../_posts');
const LANGS = ['en', 'yu', 'sr'];
// _config.yml gives posts in these folders their language; elsewhere it is en.
const FOLDER_LANGS = { yu: 'yu', sr: 'sr' };

// Every post under _posts, with the language its folder implies.
function posts() {
  const found = [];
  (function walk(rel) {
    for (const entry of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      const file = path.join(rel, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith('.md')) found.push({ file, folderLang: FOLDER_LANGS[rel.split(path.sep)[0]] || 'en' });
    }
  })('');
  return found;
}

function frontMatterLang(file) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8').replace(/\r\n/g, '\n');
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const line = match[1].split('\n').find((l) => /^lang\s*:/.test(l));
  if (!line) return null;
  return line.replace(/^lang\s*:\s*/, '').replace(/\s+#.*$/, '').trim().replace(/^["']|["']$/g, '');
}

// A mistyped lang makes a post vanish from every list, so check each one.
test('every post has no lang or one of en, yu, sr', () => {
  const bad = [];
  for (const { file } of posts()) {
    const value = frontMatterLang(file);
    if (value !== null && !LANGS.includes(value)) bad.push(`${file}: lang "${value}"`);
  }
  assert.deepEqual(bad, []);
});

// A post in _posts/yu or _posts/sr that sets another lang would keep the
// folder's og:locale but list under the other language.
test('a post in a language folder does not set a different lang', () => {
  const bad = [];
  for (const { file, folderLang } of posts()) {
    const value = frontMatterLang(file);
    if (value !== null && value !== folderLang) bad.push(`${file}: lang "${value}" in a ${folderLang} folder`);
  }
  assert.deepEqual(bad, []);
});
