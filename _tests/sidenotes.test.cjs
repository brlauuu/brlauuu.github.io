const test = require('node:test');
// Loose assert: objects built inside the vm sandbox have their own Object.prototype.
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../assets/js/sidenotes.js'), 'utf8');

function load() {
  const module = { exports: {} };
  vm.runInNewContext(script, { module, Object });
  return module.exports;
}

test('noteIdFor maps a footnote reference href to the footnote element id', () => {
  const { noteIdFor } = load();
  assert.equal(noteIdFor('#fn:1'), 'fn:1');
  assert.equal(noteIdFor('https://example.test/post#fn:12'), 'fn:12');
  assert.equal(noteIdFor('#fnref:1'), null);
  assert.equal(noteIdFor('#other'), null);
  assert.equal(noteIdFor(''), null);
});

test('placement is wide from 1200px and inline below', () => {
  const { placement } = load();
  assert.equal(placement(1200), 'wide');
  assert.equal(placement(1600), 'wide');
  assert.equal(placement(1199), 'inline');
  assert.equal(placement(375), 'inline');
});

test('citingBlock walks up from the reference to the paragraph or list item that cites it', () => {
  const { citingBlock } = load();
  const p = { tagName: 'P', parentElement: { tagName: 'DIV' } };
  const a = { tagName: 'A', parentElement: { tagName: 'SUP', parentElement: p } };
  assert.equal(citingBlock(a), p);
  const li = { tagName: 'LI', parentElement: { tagName: 'OL' } };
  const inLi = { tagName: 'A', parentElement: { tagName: 'SUP', parentElement: { tagName: 'EM', parentElement: li } } };
  assert.equal(citingBlock(inLi), li);
  assert.equal(citingBlock({ tagName: 'A', parentElement: null }), null);
});
