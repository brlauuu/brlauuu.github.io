const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../assets/js/theme.js'), 'utf8');

function load(context = {}) {
  const module = { exports: {} };
  vm.runInNewContext(script, { module, ...context });
  return module.exports;
}

test('resolve returns the stored value when valid and the default otherwise', () => {
  const { resolve } = load();
  assert.equal(resolve('theme', 'dark', false), 'dark');
  assert.equal(resolve('theme', 'light', true), 'light');
  assert.equal(resolve('theme', null, true), 'dark');
  assert.equal(resolve('theme', null, false), 'light');
  assert.equal(resolve('theme', 'blue', true), 'dark');
  assert.equal(resolve('color', null, true), 'off');
  assert.equal(resolve('color', 'on', false), 'on');
  assert.equal(resolve('color', 'yes', false), 'off');
  assert.equal(resolve('style', undefined, false), 'smooth');
  assert.equal(resolve('style', 'pixel', false), 'pixel');
});

test('next flips each axis between its two values', () => {
  const { next } = load();
  assert.equal(next('theme', 'light'), 'dark');
  assert.equal(next('theme', 'dark'), 'light');
  assert.equal(next('color', 'off'), 'on');
  assert.equal(next('color', 'on'), 'off');
  assert.equal(next('style', 'smooth'), 'pixel');
  assert.equal(next('style', 'pixel'), 'smooth');
  assert.equal(next('theme', 'garbage'), 'dark');
});

test('label describes the action for the current value', () => {
  const { label } = load();
  assert.equal(label('theme', 'light'), 'Switch to dark');
  assert.equal(label('theme', 'dark'), 'Switch to light');
  assert.equal(label('color', 'off'), 'Turn color on');
  assert.equal(label('color', 'on'), 'Turn color off');
  assert.equal(label('style', 'smooth'), 'Switch to pixel style');
  assert.equal(label('style', 'pixel'), 'Switch to smooth style');
});
