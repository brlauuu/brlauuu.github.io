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

test('shouldCloseOnFocusOut closes only for a target outside an open menu', () => {
  const { shouldCloseOnFocusOut } = load();
  const inside = {};
  const menu = { open: true, contains: (n) => n === inside };
  assert.equal(shouldCloseOnFocusOut(menu, {}), true);
  assert.equal(shouldCloseOnFocusOut(menu, inside), false);
  assert.equal(shouldCloseOnFocusOut(menu, null), false);
  assert.equal(shouldCloseOnFocusOut({ ...menu, open: false }, {}), false);
  assert.equal(shouldCloseOnFocusOut(null, {}), false);
});

test('versionFor returns the path of another language version, else null', () => {
  const { versionFor } = load();
  const versions = { en: '/en/x', yu: '/yu/x', sr: '/sr/x' };
  assert.equal(versionFor('sr', 'en', versions), '/sr/x');
  assert.equal(versionFor('en', 'yu', versions), '/en/x');
  assert.equal(versionFor('en', 'en', versions), null, 'already on it');
  assert.equal(versionFor('sr', 'en', { en: '/en/x' }), null, 'no such version');
  assert.equal(versionFor('sr', null, {}), null, 'not a post');
});

function fakeDom({ stored = {}, brokenStorage = false, contentLang = null, versions = {}, hash = '' } = {}) {
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
  const links = Object.entries(versions).map(([key, p]) => ({ dataset: { langVersion: key, path: p } }));
  const doc = {
    documentElement: html,
    querySelector: (s) => (s === '[data-lang-menu]' ? menu : null),
    querySelectorAll: (s) => (s === 'link[data-lang-version]' ? links : []),
    addEventListener() {},
    dispatchEvent: (e) => events.push(e),
    get activeElement() { return focused; }
  };
  const storage = brokenStorage
    ? { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } }
    : { getItem: (k) => stored[k] ?? null, setItem: (k, v) => { stored[k] = v; } };
  class CustomEvent { constructor(type, o) { this.type = type; this.detail = o.detail; } }
  const api = load({ CustomEvent });
  const replaced = [];
  const location = { search: '', hash, replace: (u) => replaced.push(u) };
  const controller = api.init(doc, storage, location);
  return { attrs, options, summary, menu, events, stored, replaced, controller, focused: () => focused };
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

test('choosing another language on a post opens that version in place of this one', () => {
  const { attrs, options, menu, events, stored, replaced } = fakeDom({
    contentLang: 'en', versions: { en: '/en/x', yu: '/yu/x', sr: '/sr/x' }, hash: '#fn:1'
  });
  menu.open = true;
  options[2].onclick();
  assert.deepEqual(replaced, ['/sr/x#fn:1']);
  assert.equal(stored.lang, 'sr');
  assert.equal(menu.open, false);
  assert.equal(attrs['data-lang'], 'en', 'the page leaving is not switched');
  assert.equal(events.length, 0);
});

test('choosing the post\'s own language stays and switches in place', () => {
  const { attrs, options, events, stored, replaced } = fakeDom({
    contentLang: 'sr', versions: { en: '/en/x', yu: '/yu/x', sr: '/sr/x' }
  });
  options[2].onclick();
  assert.deepEqual(replaced, []);
  assert.equal(stored.lang, 'sr');
  assert.equal(attrs['data-lang'], 'sr');
  assert.equal(events.length, 1);
});

test('a page without versions (About, lists) switches in place', () => {
  const { attrs, options, replaced } = fakeDom({ contentLang: 'en' });
  options[1].onclick();
  assert.deepEqual(replaced, []);
  assert.equal(attrs['data-lang'], 'yu');
});
