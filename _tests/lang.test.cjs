const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../assets/js/lang.js'), 'utf8');

function load(context = {}) {
  const module = { exports: {} };
  vm.runInNewContext(script, { module, Object, ...context });
  return module.exports;
}

test('resolveLang keeps en, yu and sr and falls back to English otherwise', () => {
  const { resolveLang } = load();
  assert.equal(resolveLang('yu'), 'yu');
  assert.equal(resolveLang('sr'), 'sr');
  assert.equal(resolveLang('en'), 'en');
  assert.equal(resolveLang(null), 'en');
  assert.equal(resolveLang('de'), 'en');
  assert.equal(resolveLang('YU'), 'en');
});

test('menuStep moves through the options and wraps at both ends', () => {
  const { menuStep } = load();
  assert.equal(menuStep(0, 'ArrowDown', 3), 1);
  assert.equal(menuStep(2, 'ArrowDown', 3), 0);
  assert.equal(menuStep(0, 'ArrowUp', 3), 2);
  assert.equal(menuStep(-1, 'ArrowDown', 3), 0);
  assert.equal(menuStep(-1, 'ArrowUp', 3), 2);
  assert.equal(menuStep(1, 'Home', 3), 0);
  assert.equal(menuStep(1, 'End', 3), 2);
  assert.equal(menuStep(1, 'x', 3), 1);
  assert.equal(menuStep(0, 'ArrowDown', 0), -1);
});

function fakeDom({ stored = {}, brokenStorage = false, contentLang = null } = {}) {
  const attrs = { 'data-theme': 'light', 'data-color': 'off', 'data-style': 'smooth', 'data-lang': 'en', lang: 'en' };
  if (contentLang) attrs['data-content-lang'] = contentLang;
  const html = {
    getAttribute: (n) => attrs[n] ?? null,
    setAttribute: (n, v) => { attrs[n] = v; },
    hasAttribute: (n) => n in attrs
  };
  const option = (key) => ({ dataset: { setLang: key }, attrs: {}, setAttribute(n, v) { this.attrs[n] = v; },
    getAttribute(n) { return this.attrs[n] ?? null; }, addEventListener(n, h) { this.onclick = h; }, focus() { focused = this; } });
  let focused = null;
  const options = ['en', 'yu', 'sr'].map(option);
  const summary = { attrs: {}, setAttribute(n, v) { this.attrs[n] = v; }, focus() { focused = this; } };
  const menu = { open: false, querySelector: () => summary, querySelectorAll: () => options,
    addEventListener() {}, contains: () => false };
  const events = [];
  const doc = {
    documentElement: html,
    querySelector: (s) => (s === '[data-lang-menu]' ? menu : null),
    addEventListener() {},
    dispatchEvent: (e) => events.push(e),
    get activeElement() { return focused; }
  };
  const storage = brokenStorage
    ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }
    : { getItem: (k) => stored[k] ?? null, setItem: (k, v) => { stored[k] = v; } };
  class CustomEvent { constructor(type, o) { this.type = type; this.detail = o.detail; } }
  const api = load({ CustomEvent });
  const controller = api.init(doc, storage);
  return { attrs, options, summary, menu, events, stored, controller, focused: () => focused };
}

test('init applies the stored language, marks its option and labels the button', () => {
  const { attrs, options, summary } = fakeDom({ stored: { lang: 'sr' } });
  assert.equal(attrs['data-lang'], 'sr');
  assert.equal(attrs.lang, 'sr-Cyrl');
  assert.deepEqual(options.map((o) => o.attrs['aria-current']), ['false', 'false', 'true']);
  assert.equal(summary.attrs['aria-label'], 'Language: Српски');
});

test('choosing sets the language, saves it, closes the menu and emits themechange once', () => {
  const { attrs, options, menu, events, stored, focused, summary } = fakeDom();
  menu.open = true;
  options[1].onclick();
  assert.equal(attrs['data-lang'], 'yu');
  assert.equal(attrs.lang, 'sh');
  assert.equal(stored.lang, 'yu');
  assert.equal(menu.open, false);
  assert.equal(focused(), summary);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'themechange');
  assert.deepEqual(events[0].detail, { theme: 'light', color: 'off', style: 'smooth', lang: 'yu' });
  options[1].onclick();
  assert.equal(events.length, 1, 'choosing the active language emits nothing');
});

test('a post keeps its own lang attribute whatever the choice', () => {
  const { attrs, options } = fakeDom({ contentLang: 'en' });
  options[2].onclick();
  assert.equal(attrs['data-lang'], 'sr');
  assert.equal(attrs.lang, 'en');
});

test('blocked storage still switches the language for the session', () => {
  const { attrs, options } = fakeDom({ brokenStorage: true });
  assert.equal(attrs['data-lang'], 'en');
  options[1].onclick();
  assert.equal(attrs['data-lang'], 'yu');
});
