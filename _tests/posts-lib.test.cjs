const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const load = () => import(pathToFileURL(path.join(__dirname, 'lib/posts.mjs')).href);
const post = (tags, body = 'Body.\n', ref = 'slug') => ({ title: 't', author: 'a', tags, ref, body });

test('aiTag names the model in each language and isAiTag recognises all three', async () => {
  const { aiTag, isAiTag } = await load();
  assert.equal(aiTag('en', 'Claude Opus 5.5'), 'AI translated (Claude Opus 5.5)');
  assert.equal(aiTag('yu', 'Claude Opus 5.5'), 'Prevedeno pomoću VI (Claude Opus 5.5)');
  assert.equal(aiTag('sr', 'Claude Opus 5.5'), 'Преведено помоћу ВИ (Claude Opus 5.5)');
  for (const lang of ['en', 'yu', 'sr']) assert.ok(isAiTag(aiTag(lang, 'Claude Sonnet 5.5')));
  assert.ok(!isAiTag('ai'));
  assert.ok(!isAiTag('AI translated'));
});







test('parsePost reads title, quoted tags and ref', async () => {
  const { parsePost } = await load();
  const p = parsePost('---\nlayout: post\ntitle: "A \\"quoted\\" title"\ntags: [tools, "AI translated (Claude Opus 5.5)", "a, b"]\nref: slug\n---\n\nHello.\n');
  assert.equal(p.title, 'A "quoted" title');
  assert.deepEqual(p.tags, ['tools', 'AI translated (Claude Opus 5.5)', 'a, b']);
  assert.equal(p.ref, 'slug');
  assert.equal(p.body, '\nHello.\n');
});

test('cyrToLat maps digraphs and keeps Latin names', async () => {
  const { cyrToLat } = await load();
  assert.equal(cyrToLat('Љубав, ЊЕГОШ и џеп у BLAT-у'), 'Ljubav, NJEGOŠ i džep u BLAT-u');
});

test('checkPost flags changed code, links, structure, refs and a sr text that is not yu', async () => {
  const { checkPost, aiTag } = await load();
  const body = 'Text [link](https://x.org/a_(b)) and `code`.\n\n## References\n\n[^1]: note\n';
  const good = {
    en: post([], body),
    yu: post([aiTag('yu', 'M')], body.replace('Text', 'Tekst džep')),
    sr: post([aiTag('sr', 'M')], body.replace('Text', 'Текст џеп')),
  };
  assert.deepEqual(checkPost(good, 'en'), []);
  const bad = { ...good, yu: post([aiTag('yu', 'M'), 'x'], body.replace('`code`', '`kod`').replace('https://x.org', 'https://y.org'), 'other') };
  const problems = checkPost(bad, 'en').join('\n');
  for (const word of ['ref', 'AI tag', 'code', 'links', 'not yu']) assert.match(problems, new RegExp(word));
});
