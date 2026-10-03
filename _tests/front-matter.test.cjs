const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '../_posts');
const LANGS = ['en', 'yu', 'sr'];

// A mistyped lang makes a post vanish from every list, so check each one.
test('every post has no lang or one of en, yu, sr', () => {
  const bad = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const text = fs.readFileSync(path.join(dir, file), 'utf8').replace(/\r\n/g, '\n');
    const match = text.match(/^---\n([\s\S]*?)\n---/);
    if (!match) continue;
    const line = match[1].split('\n').find((l) => /^lang\s*:/.test(l));
    if (!line) continue;
    const value = line.replace(/^lang\s*:\s*/, '').replace(/\s+#.*$/, '').trim().replace(/^["']|["']$/g, '');
    if (!LANGS.includes(value)) bad.push(`${file}: lang "${value}"`);
  }
  assert.deepEqual(bad, []);
});
