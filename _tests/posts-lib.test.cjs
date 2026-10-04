const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = () => import(pathToFileURL(path.join(__dirname, 'lib/posts.mjs')).href);
const post = (tags, body = 'Body.\n', ref = 'slug', aiTranslated = null) => ({ title: 't', author: 'a', tags, ref, aiTranslated, body });

test('isOldAiTag recognises the tag ai_translated replaced, in all three languages', async () => {
  const { isOldAiTag } = await load();
  assert.ok(isOldAiTag('AI translated (Claude Opus 5.5)'));
  assert.ok(isOldAiTag('Prevedeno pomoću VI (Claude Opus 5.5)'));
  assert.ok(isOldAiTag('Преведено помоћу ВИ (Claude Opus 5.5)'));
  assert.ok(!isOldAiTag('ai'));
  assert.ok(!isOldAiTag('AI translated'));
});

test('parsePost reads title, quoted tags, ref and ai_translated', async () => {
  const { parsePost } = await load();
  const p = parsePost('---\nlayout: post\ntitle: "A \\"quoted\\" title"\ntags: [tools, "a, b"]\nref: slug\nai_translated: Claude Opus 5.5\n---\n\nHello.\n');
  assert.equal(p.title, 'A "quoted" title');
  assert.deepEqual(p.tags, ['tools', 'a, b']);
  assert.equal(p.ref, 'slug');
  assert.equal(p.aiTranslated, 'Claude Opus 5.5');
  assert.equal(p.body, '\nHello.\n');
  assert.equal(parsePost('---\ntitle: x\n---\nHi\n').aiTranslated, null);
});

test('cyrToLat maps digraphs and keeps Latin names', async () => {
  const { cyrToLat } = await load();
  assert.equal(cyrToLat('Љубав, ЊЕГОШ и џеп у BLAT-у'), 'Ljubav, NJEGOŠ i džep u BLAT-u');
});

test('checkPost flags changed code, links, structure, refs and a sr text that is not yu', async () => {
  const { checkPost } = await load();
  const body = 'Text [link](https://x.org/a_(b)) and `code`.\n\n## References\n\n[^1]: note\n';
  const good = {
    en: post([], body),
    yu: post([], body.replace('Text', 'Tekst džep'), 'slug', 'M'),
    sr: post([], body.replace('Text', 'Текст џеп'), 'slug', 'M'),
  };
  assert.deepEqual(checkPost(good, 'en'), []);
  const bad = { ...good, yu: post(['Prevedeno pomoću VI (M)', 'x'], body.replace('`code`', '`kod`').replace('https://x.org', 'https://y.org'), 'other') };
  const problems = checkPost(bad, 'en').join('\n');
  for (const word of ['ref', 'ai_translated', 'code', 'links', 'not yu']) assert.match(problems, new RegExp(word));
});
