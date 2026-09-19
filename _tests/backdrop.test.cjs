const test = require('node:test');
// Loose assert: objects built inside the vm sandbox have their own Object.prototype.
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../assets/js/backdrop.js'), 'utf8');

function load(context = {}) {
  const module = { exports: {} };
  vm.runInNewContext(script, { module, Object, Math, ...context });
  return module.exports;
}

test('uniformsFor maps the theme to the light band and the style to the grid', () => {
  const { uniformsFor } = load();
  assert.deepEqual(uniformsFor({ theme: 'light', style: 'smooth' }), { light: 1, grid: 0 });
  assert.deepEqual(uniformsFor({ theme: 'dark', style: 'pixel' }), { light: 0, grid: 4 });
  assert.deepEqual(uniformsFor({ theme: 'garbage', style: undefined }), { light: 1, grid: 0 });
});

test('decide starts, stops, updates or idles from the color value and the running state', () => {
  const { decide } = load();
  assert.equal(decide({ color: 'on' }, false), 'start');
  assert.equal(decide({ color: 'on' }, true), 'update');
  assert.equal(decide({ color: 'off' }, true), 'stop');
  assert.equal(decide({ color: 'off' }, false), 'idle');
});

test('ease moves toward the target and converges', () => {
  const { ease } = load();
  const mid = ease(0, 10, 0.1, 0.1);
  assert.ok(mid > 5 && mid < 8, `one tau should cover about 63%, got ${mid}`);
  let v = 0;
  for (let i = 0; i < 100; i++) v = ease(v, 10, 0.1, 0.1);
  assert.ok(Math.abs(v - 10) < 1e-3);
  assert.equal(ease(3, 3, 1, 0.1), 3);
});
