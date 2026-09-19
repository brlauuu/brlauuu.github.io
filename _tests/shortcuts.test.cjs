const test = require('node:test');
// Loose assert: objects built inside the vm sandbox have their own Object.prototype,
// and strict deepEqual would reject them on that alone.
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../assets/js/shortcuts.js'), 'utf8');

function load(context = {}) {
  const module = { exports: {} };
  vm.runInNewContext(script, { module, Object, ...context });
  return module.exports;
}

const bindings = {
  t: { toggle: 'theme' }, c: { toggle: 'color' }, p: { toggle: 'style' },
  'g h': { href: '/' }, 'g a': { href: '/about' }, 'g r': { href: '/archive' }, 'g t': { href: '/tags' }
};

test('single keys resolve to their binding and clear the state', () => {
  const { step } = load();
  assert.deepEqual(step(bindings, null, 't'), { action: { toggle: 'theme' }, pending: null });
  assert.deepEqual(step(bindings, null, 'p'), { action: { toggle: 'style' }, pending: null });
});

test('g arms a sequence, and the second key resolves it', () => {
  const { step } = load();
  assert.deepEqual(step(bindings, null, 'g'), { action: null, pending: 'g' });
  assert.deepEqual(step(bindings, 'g', 't'), { action: { href: '/tags' }, pending: null });
  assert.deepEqual(step(bindings, 'g', 'h'), { action: { href: '/' }, pending: null });
});

test('an unknown second key cancels the sequence without acting', () => {
  const { step } = load();
  assert.deepEqual(step(bindings, 'g', 'x'), { action: null, pending: null });
  assert.deepEqual(step(bindings, 'g', 'g'), { action: null, pending: 'g' });
});

test('? asks for the help dialog and unknown keys do nothing', () => {
  const { step } = load();
  assert.deepEqual(step(bindings, null, '?'), { action: { help: true }, pending: null });
  assert.deepEqual(step(bindings, null, 'z'), { action: null, pending: null });
});

test('keystrokes with modifiers or inside editable fields are ignored', () => {
  const { ignores } = load();
  const plain = { key: 't', ctrlKey: false, metaKey: false, altKey: false, target: { tagName: 'BODY', isContentEditable: false } };
  assert.equal(ignores(plain), false);
  assert.equal(ignores({ ...plain, ctrlKey: true }), true);
  assert.equal(ignores({ ...plain, metaKey: true }), true);
  assert.equal(ignores({ ...plain, altKey: true }), true);
  assert.equal(ignores({ ...plain, target: { tagName: 'INPUT', isContentEditable: false } }), true);
  assert.equal(ignores({ ...plain, target: { tagName: 'TEXTAREA', isContentEditable: false } }), true);
  assert.equal(ignores({ ...plain, target: { tagName: 'DIV', isContentEditable: true } }), true);
});

test('bindings are read from the dialog rows', () => {
  const { readBindings } = load();
  const rows = [
    { dataset: { shortcut: 't', toggle: 'theme' } },
    { dataset: { shortcut: 'g h', href: '/' } },
    { dataset: { shortcut: 'g a', href: '/about' } }
  ];
  assert.deepEqual(readBindings(rows), { t: { toggle: 'theme' }, 'g h': { href: '/' }, 'g a': { href: '/about' } });
});
