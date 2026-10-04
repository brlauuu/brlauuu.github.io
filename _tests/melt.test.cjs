const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../assets/js/melt.js'), 'utf8');

function load() {
  const module = { exports: {} };
  vm.runInNewContext(script, { module, Object });
  return module.exports;
}

test('meltState runs only with color on, smooth style, motion allowed, not on a phone and the tab visible', () => {
  const { meltState } = load();
  const on = { color: 'on', style: 'smooth', reduced: false, phone: false, hidden: false };
  assert.equal(meltState(on), 'run');
  assert.equal(meltState({ ...on, style: undefined }), 'run');
  assert.equal(meltState({ ...on, color: 'off' }), 'pause');
  assert.equal(meltState({ ...on, color: undefined }), 'pause');
  assert.equal(meltState({ ...on, style: 'pixel' }), 'pause');
  assert.equal(meltState({ ...on, reduced: true }), 'pause');
  assert.equal(meltState({ ...on, phone: true }), 'pause');
  assert.equal(meltState({ ...on, hidden: true }), 'pause');
});

test('the phone query matches the CSS that leaves phones unmelted and holds the cycle', () => {
  const { PHONE } = load();
  const css = fs.readFileSync(path.join(__dirname, '../assets/css/theme.css'), 'utf8');
  const [coarse, narrow] = PHONE.split(', ');
  assert.ok(css.includes(`@media not (${coarse} or ${narrow}) {`), 'melt rules are gated on the phone query');
  assert.ok(css.includes(`@media ${PHONE} {\n  [data-color="on"] {\n    --rainbow-play: paused;`), 'phones pause the hue cycle');
});
