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

test('laneFor maps the column rect to canvas pixels with a soft edge', () => {
  const { laneFor } = load();
  assert.deepEqual(laneFor({ left: 340, right: 940, width: 600 }, 1280, 0.25), [85, 235, 15]);
  assert.deepEqual(laneFor({ left: 100, right: 500, width: 400 }, 1280, 1), [100, 500, 60]);
});

test('laneFor falls back to the full width without a usable rect', () => {
  const { laneFor } = load();
  assert.deepEqual(laneFor(null, 1280, 0.25), [0, 320, 15]);
  assert.deepEqual(laneFor({ left: 0, right: 0, width: 0 }, 390, 1), [0, 390, 60]);
  assert.deepEqual(laneFor({ left: NaN, right: NaN, width: NaN }, 390, 1), [0, 390, 60]);
});

test('laneFor clamps the column to the viewport', () => {
  const { laneFor } = load();
  assert.deepEqual(laneFor({ left: -20, right: 420, width: 440 }, 390, 1), [0, 390, 60]);
});
