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

test('meltState runs only with color on, smooth style, motion allowed and the tab visible', () => {
  const { meltState } = load();
  const on = { color: 'on', style: 'smooth', reduced: false, hidden: false };
  assert.equal(meltState(on), 'run');
  assert.equal(meltState({ ...on, style: undefined }), 'run');
  assert.equal(meltState({ ...on, color: 'off' }), 'pause');
  assert.equal(meltState({ ...on, color: undefined }), 'pause');
  assert.equal(meltState({ ...on, style: 'pixel' }), 'pause');
  assert.equal(meltState({ ...on, reduced: true }), 'pause');
  assert.equal(meltState({ ...on, hidden: true }), 'pause');
});
