const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../assets/js/theme.js'), 'utf8');

function load(context = {}) {
  const module = { exports: {} };
  // Object is forwarded explicitly so objects init() builds (e.g. via
  // Object.fromEntries) share this realm's Object.prototype; otherwise
  // assert.deepEqual (strict) fails on structurally-identical objects
  // purely because they come from vm's separate context/realm.
  vm.runInNewContext(script, { module, Object, ...context });
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

function fakeDom({ stored = {}, systemDark = false, brokenStorage = false } = {}) {
  const attrs = {};
  const html = {
    getAttribute: (name) => attrs[name] ?? null,
    setAttribute: (name, value) => { attrs[name] = value; }
  };
  const buttons = ['theme', 'color', 'style'].map((axis) => ({
    dataset: { toggle: axis }, attrs: {},
    setAttribute(name, value) { this.attrs[name] = value; },
    addEventListener(name, handler) { this.onclick = handler; }
  }));
  const events = [];
  const doc = {
    documentElement: html,
    querySelectorAll: (selector) => selector === '[data-toggle]' ? buttons : [],
    addEventListener() {},
    dispatchEvent: (event) => events.push(event)
  };
  const storage = brokenStorage
    ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }
    : { getItem: (key) => stored[key] ?? null, setItem: (key, value) => { stored[key] = value; } };
  let mediaListener;
  const matchMedia = (query) => ({
    matches: query === '(prefers-color-scheme: dark)' && systemDark,
    addEventListener: (name, handler) => { mediaListener = handler; }
  });
  class CustomEvent { constructor(type, options) { this.type = type; this.detail = options.detail; } }
  const api = load({ CustomEvent });
  const controller = api.init(doc, storage, matchMedia);
  return { attrs, buttons, events, stored, controller, media: (dark) => mediaListener({ matches: dark }) };
}

test('init sets all three attributes from storage or defaults and labels the buttons', () => {
  const { attrs, buttons } = fakeDom({ stored: { theme: 'dark', style: 'pixel' } });
  assert.deepEqual(attrs, { 'data-theme': 'dark', 'data-color': 'off', 'data-style': 'pixel' });
  assert.equal(buttons[0].attrs['aria-label'], 'Switch to light');
  assert.equal(buttons[1].attrs['aria-label'], 'Turn color on');
  assert.equal(buttons[2].attrs['aria-label'], 'Switch to smooth style');
});

test('clicking a button flips only its axis, persists it, relabels it and emits themechange', () => {
  const { attrs, buttons, events, stored } = fakeDom();
  buttons[1].onclick();
  assert.equal(attrs['data-color'], 'on');
  assert.equal(attrs['data-theme'], 'light');
  assert.equal(stored.color, 'on');
  assert.equal(stored.theme, undefined);
  assert.equal(buttons[1].attrs['aria-label'], 'Turn color off');
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'themechange');
  assert.deepEqual(events[0].detail, { theme: 'light', color: 'on', style: 'smooth' });
});

test('system theme changes apply only until the visitor chooses a theme', () => {
  const { attrs, buttons, media } = fakeDom();
  media(true);
  assert.equal(attrs['data-theme'], 'dark');
  buttons[0].onclick();
  assert.equal(attrs['data-theme'], 'light');
  media(true);
  assert.equal(attrs['data-theme'], 'light');
});

test('a blocked storage still lets the buttons work for the session', () => {
  const { attrs, buttons, controller } = fakeDom({ brokenStorage: true, systemDark: true });
  assert.equal(attrs['data-theme'], 'dark');
  buttons[2].onclick();
  assert.equal(attrs['data-style'], 'pixel');
  assert.deepEqual(controller.current(), { theme: 'dark', color: 'off', style: 'pixel' });
});

test('an explicit theme choice survives system changes even when storage is blocked', () => {
  const { attrs, buttons, media } = fakeDom({ brokenStorage: true, systemDark: false });
  buttons[0].onclick();
  assert.equal(attrs['data-theme'], 'dark');
  media(false);
  assert.equal(attrs['data-theme'], 'dark');
});
