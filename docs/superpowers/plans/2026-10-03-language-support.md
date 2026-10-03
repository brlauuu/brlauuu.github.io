# Language Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tag posts with a language (en / yu / sr) and add a nav dropdown that filters every post list to the chosen language and switches the site's own text.

**Architecture:** A fourth axis, `data-lang` on `<html>`, set before first paint like the three theme axes. Liquid writes every string and every language-specific note in all three languages, marked `data-t="<lang>"`; post entries and groups carry `data-langs="<langs>"`. CSS hides whatever does not match `html[data-lang]`; no JavaScript swaps text. `assets/js/lang.js` runs the menu and dispatches `themechange` with `lang` in the detail, which the constellation uses to rebuild itself from that language's posts.

**Tech Stack:** Jekyll 3.10 (github-pages gem, Liquid 4), plain ES2020 scripts, CSS custom properties, Node `node:test` for pure helpers, Playwright (local Chromium) for browser checks.

**Spec:** `docs/superpowers/specs/2026-10-03-language-support-design.md`

## Global Constraints

- Language keys `en`, `yu`, `sr`; `lang` attribute values `en`, `sh`, `sr-Cyrl`; menu names English, Naš, Српски; badges US, YU, СР.
- Default language `en`; the browser language is never consulted. Storage key `lang`.
- yu and sr strings say the same thing in Latin and Cyrillic script.
- Approved strings (do not reword): Archive/Arhiva/Архива; Tags/Kategorije/Категорије; About/O meni/О мени; Written by/Autor/Аутор; "N words, ~M min read" / "N reči, ~M min čitanja" / "N речи, ~M мин читања"; "Tags:"/"Kategorije:"/"Категорије:"; "No posts in this language yet." / "Još nema članaka na ovom jeziku." / "Још нема чланака на овом језику."; "Only available in:" / "Dostupno samo na:" / "Доступно само на:".
- Dates: en "October 03, 2026" (archive: "October 3"); yu "3. oktobar 2026." (archive "3. oktobar"); sr "3. октобар 2026." ("3. октобар"); "on" before the date only in English.
- Colors only through existing variables in `assets/css/theme.css`; no `!important`, no hard-coded colors in component rules (flag fills inside the SVGs are content, not theme colors).
- Never `npm install` in the repo. Browser tools use `PLAYWRIGHT_MODULE=/home/brlauuu/.npm/_npx/9833c18b2d85bc59/node_modules/playwright` and `PLAYWRIGHT_CHROMIUM=/home/brlauuu/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`.
- Serve `_site` with a static server that maps extensionless paths to `.html` (Python's `http.server` 404s on `/tags`). Kill it with `pkill -f '[s]erve.cjs'` in its own command.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Attribute contract (all tasks)

- `data-t="en|yu|sr"`: this element's content is in exactly that language; hidden unless that language is active (en counts as active when `data-lang` is absent, i.e. without JavaScript).
- `data-langs="en yu"`: space-separated languages a post entry or a group contains; hidden when the active language is not in the list.
- `data-content-lang="<key>"` on `<html>` of post pages: the post body's language. When present, `<html lang>` is fixed at build time and scripts never change it.
- `data-set-lang="<key>"` on each menu option; `data-lang-menu` on the `<details>`; `data-action-target="lang-menu"` on its `<summary>`.

## Review Focus

1. A stored `lang` value that is not en/yu/sr (old or hand-edited storage) must fall back to English in both the head script and `lang.js`. Test in Task 2 (`resolveLang`) and Task 7 (browser).
2. Without JavaScript, English text and only English posts show, and nothing is blank. Test in Task 7 (`javaScriptEnabled: false`).
3. At 375 px the open menu panel stays inside the viewport. Test in Task 7.
4. Blocked storage (private mode) still lets the menu switch language for the session. Test in Task 2.
5. A theme, color or style flip after a language switch must not reload the constellation or bring back other-language posts (only a `lang` change reloads). Test in Task 6 (`langChanged`) and Task 7.

---

### Task 1: Language data, the axis on `<html>`, and the hiding rules

**Files:**
- Create: `_data/languages.yml`, `_data/i18n.yml`
- Modify: `_config.yml`, the four files in `_posts/`, `_includes/head.html`, `_layouts/default.html`, `assets/js/theme.js`, `assets/css/theme.css`
- Test: `_tests/theme.test.cjs`

**Interfaces:**
- Produces: `site.data.languages` (list of `{key, name, badge, code}` in order en, yu, sr); `site.data.i18n.<key>.<lang>` strings and `site.data.i18n.months.<lang>` (12 names); `post.lang` on every post; `html[data-lang]`; `html[data-content-lang]` on posts; `themechange` detail `{ theme, color, style, lang }`.

- [ ] **Step 1: Write the failing test** — in `_tests/theme.test.cjs`, make `fakeDom` seed the language attribute the head script would have set, and expect `lang` in the event detail and in `current()`:

```js
// in fakeDom(), replace `const attrs = {};` with:
  const attrs = { 'data-lang': 'en' };
```

```js
// 'init sets all three attributes ...' test: expected attrs become
  assert.deepEqual(attrs, { 'data-lang': 'en', 'data-theme': 'dark', 'data-color': 'off', 'data-style': 'pixel' });
// 'clicking a button flips only its axis ...' test:
  assert.deepEqual(events[0].detail, { theme: 'light', color: 'on', style: 'smooth', lang: 'en' });
// 'a blocked storage still lets the buttons work ...' test:
  assert.deepEqual(controller.current(), { theme: 'dark', color: 'off', style: 'pixel', lang: 'en' });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test _tests/theme.test.cjs`
Expected: FAIL on the two `deepEqual`s that now include `lang`.

- [ ] **Step 3: Implement `lang` in the detail** — in `assets/js/theme.js`, replace the `current` line:

```js
    // The language axis is owned by lang.js; it rides along so every listener
    // sees all four axes in one detail.
    const current = () => ({
      ...Object.fromEntries(Object.keys(axes).map((axis) => [axis, html.getAttribute(`data-${axis}`)])),
      lang: html.getAttribute('data-lang')
    });
```

Update the header comment's first line to: `// Three independent theme axes on <html>: data-theme, data-color, data-style (data-lang is lang.js's).`

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test _tests/theme.test.cjs`
Expected: PASS.

- [ ] **Step 5: Add the language data** — create `_data/languages.yml`:

```yaml
# The site's languages, in menu order. key: front matter and data-lang value;
# code: the HTML lang attribute; badge: short label in the menu.
- key: en
  name: English
  badge: US
  code: en
- key: yu
  name: Naš
  badge: YU
  code: sh
- key: sr
  name: Српски
  badge: СР
  code: sr-Cyrl
```

Create `_data/i18n.yml` (yu and sr always say the same thing):

```yaml
# Site text in every language, read by _includes/t.html and the list pages.
# {a}…{/a} marks a link the caller supplies.
archive:       { en: "Archive", yu: "Arhiva", sr: "Архива" }
tags:          { en: "Tags", yu: "Kategorije", sr: "Категорије" }
about:         { en: "About", yu: "O meni", sr: "О мени" }
written_by:    { en: "Written by", yu: "Autor", sr: "Аутор" }
"on":          { en: "on&nbsp;", yu: "", sr: "" }
words:         { en: "&nbsp;words, ~", yu: "&nbsp;reči, ~", sr: "&nbsp;речи, ~" }
min_read:      { en: "&nbsp;min read", yu: "&nbsp;min čitanja", sr: "&nbsp;мин читања" }
tags_label:    { en: "Tags: ", yu: "Kategorije: ", sr: "Категорије: " }
tag_index:     { en: "Tag index", yu: "Indeks kategorija", sr: "Индекс категорија" }
pinned:        { en: "Pinned", yu: "Prikačeno", sr: "Прикачено" }
no_posts:      { en: "No posts in this language yet.", yu: "Još nema članaka na ovom jeziku.", sr: "Још нема чланака на овом језику." }
no_recent:     { en: "No recent posts. Check out the {a}archive{/a} for older articles.", yu: "Nema novih članaka. Starije potražite u {a}arhivi{/a}.", sr: "Нема нових чланака. Старије потражите у {a}архиви{/a}." }
archive_empty: { en: "No archived posts yet. Posts older than one year will appear here.", yu: "Arhiva je još prazna. Članci stariji od godinu dana pojaviće se ovde.", sr: "Архива је још празна. Чланци старији од годину дана појавиће се овде." }
only_in:       { en: "Only available in:", yu: "Dostupno samo na:", sr: "Доступно само на:" }
months:
  en: [January, February, March, April, May, June, July, August, September, October, November, December]
  yu: [januar, februar, mart, april, maj, jun, jul, avgust, septembar, oktobar, novembar, decembar]
  sr: [јануар, фебруар, март, април, мај, јун, јул, август, септембар, октобар, новембар, децембар]
```

(`"on"` is quoted because YAML 1.1 reads a bare `on` key as `true`.)

- [ ] **Step 6: Tag the posts** — add `lang: en` on its own line after `author:` in the front matter of each of `_posts/2020-12-09-*.md`, `_posts/2021-02-02-*.md`, `_posts/2026-01-28-*.md`, `_posts/2026-10-03-*.md`. In `_config.yml`, before `# Social links`, add:

```yaml
# Posts default to English; set lang: yu or lang: sr in front matter otherwise.
defaults:
  - scope:
      type: posts
    values:
      lang: en
```

- [ ] **Step 7: Set the axis before first paint** — in `_layouts/default.html`, replace `<html lang="en">` with:

```liquid
{%- if page.collection == "posts" -%}
{%- assign content_lang = site.data.languages | where: "key", page.lang | first -%}
<html lang="{{ content_lang.code }}" data-content-lang="{{ page.lang }}">
{%- else -%}
<html lang="en">
{%- endif %}
```

In `_includes/head.html`, inside the inline script, after `set('style', 'smooth', 'pixel', 'smooth');` add:

```js
      // Language: en, yu or sr, English unless chosen. Posts keep their own lang
      // attribute (data-content-lang); other pages take the chosen language's.
      var lang = null;
      try { lang = storage && storage.getItem('lang'); } catch (e) {}
      if (lang !== 'yu' && lang !== 'sr') lang = 'en';
      html.setAttribute('data-lang', lang);
      if (!html.hasAttribute('data-content-lang')) html.setAttribute('lang', { en: 'en', yu: 'sh', sr: 'sr-Cyrl' }[lang]);
```

Update the comment above the script to say "four axes" and "Keep in sync with assets/js/theme.js and assets/js/lang.js".

- [ ] **Step 8: Add the hiding rules** — in `assets/css/theme.css`, directly after the `[data-style="pixel"] .theme-toggle[data-toggle="style"] [data-when="pixel"] { display: block; }` block, add:

```css
/* Language axis (lang.js). [data-t] marks content in exactly one language;
   [data-langs] lists the languages a post or a group holds. Hiding rules only,
   so every element keeps its own display. Without JavaScript nothing sets
   data-lang, and English shows. */
:root:not([data-lang="yu"]) [data-t="yu"],
:root:not([data-lang="sr"]) [data-t="sr"],
[data-lang="yu"] [data-t="en"],
[data-lang="sr"] [data-t="en"],
:root:not([data-lang="yu"]):not([data-lang="sr"]) [data-langs]:not([data-langs~="en"]),
[data-lang="yu"] [data-langs]:not([data-langs~="yu"]),
[data-lang="sr"] [data-langs]:not([data-langs~="sr"]) {
  display: none;
}
```

- [ ] **Step 9: Build and check**

Run: `bundle exec jekyll build -q 2>&1 | grep -v faraday; grep -o '<html[^>]*>' _site/2026-10-03/the-bottleneck-moved.html _site/tags.html; node --test _tests/*.test.cjs 2>&1 | grep -E '^# (pass|fail)'`
Expected: post page `<html lang="en" data-content-lang="en">`, tags page `<html lang="en">`, all tests pass.

- [ ] **Step 10: Commit**

```bash
git add _data/languages.yml _data/i18n.yml _config.yml _posts _includes/head.html _layouts/default.html assets/js/theme.js assets/css/theme.css _tests/theme.test.cjs
git commit -m "Add the language axis: data, post lang, head script, hiding rules (#34)"
```

---

### Task 2: The language menu

**Files:**
- Create: `_includes/flag.html`, `_includes/lang-menu.html`, `assets/js/lang.js`, `_tests/lang.test.cjs`
- Modify: `_includes/navigation.html`, `_layouts/default.html`, `assets/css/theme.css`

**Interfaces:**
- Consumes: `site.data.languages`, the `data-t` hiding rules (Task 1), `html[data-content-lang]`.
- Produces: `{% include flag.html lang="yu" t=true %}` (an SVG with class `flag`; `t=true` adds `data-t`); `lang.js` exports `{ LANGS, CODES, NAMES, resolveLang, menuStep, init }`; `init(doc, storage)` returns `{ choose(lang), current() }`; `<summary data-action-target="lang-menu">` (Task 3 clicks it).

- [ ] **Step 1: Write the failing tests** — create `_tests/lang.test.cjs`:

```js
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
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test _tests/lang.test.cjs`
Expected: FAIL, `ENOENT` for `assets/js/lang.js`.

- [ ] **Step 3: Implement `assets/js/lang.js`**

```js
// Language axis: data-lang on <html> is en, yu or sr. The inline script in
// _includes/head.html sets it before first paint; this file wires the nav menu
// (_includes/lang-menu.html), persists the choice and emits `themechange`.
// Text in every language is already in the page; CSS shows the active one.
(() => {
  const LANGS = ['en', 'yu', 'sr'];
  const CODES = { en: 'en', yu: 'sh', sr: 'sr-Cyrl' };
  const NAMES = { en: 'English', yu: 'Naš', sr: 'Српски' };

  function resolveLang(stored) {
    return LANGS.includes(stored) ? stored : 'en';
  }

  // Next focused option index for a key; -1 when there are no options.
  function menuStep(index, key, count) {
    if (!count) return -1;
    if (key === 'ArrowDown') return index < 0 ? 0 : (index + 1) % count;
    if (key === 'ArrowUp') return index < 0 ? count - 1 : (index - 1 + count) % count;
    if (key === 'Home') return 0;
    if (key === 'End') return count - 1;
    return index;
  }

  function init(doc, storage) {
    const html = doc.documentElement;
    const read = (key) => { try { return storage.getItem(key); } catch { return null; } };
    const write = (key, value) => { try { storage.setItem(key, value); } catch { /* private mode or blocked storage */ } };
    const menu = doc.querySelector('[data-lang-menu]');
    const summary = menu ? menu.querySelector('summary') : null;
    const options = menu ? Array.from(menu.querySelectorAll('[data-set-lang]')) : [];

    const current = () => ({
      theme: html.getAttribute('data-theme'),
      color: html.getAttribute('data-color'),
      style: html.getAttribute('data-style'),
      lang: html.getAttribute('data-lang')
    });

    function apply(lang) {
      html.setAttribute('data-lang', lang);
      if (!html.hasAttribute('data-content-lang')) html.setAttribute('lang', CODES[lang]);
      options.forEach((o) => o.setAttribute('aria-current', String(o.dataset.setLang === lang)));
      if (summary) summary.setAttribute('aria-label', `Language: ${NAMES[lang]}`);
    }

    function close(refocus) {
      if (!menu || !menu.open) return;
      menu.open = false;
      if (refocus && summary) summary.focus();
    }

    function choose(lang) {
      const changed = html.getAttribute('data-lang') !== lang;
      apply(lang);
      write('lang', lang);
      close(true);
      if (changed) doc.dispatchEvent(new CustomEvent('themechange', { detail: current() }));
    }

    apply(resolveLang(read('lang')));
    if (!menu) return { choose, current };

    options.forEach((o) => o.addEventListener('click', () => choose(o.dataset.setLang)));
    // Opening moves focus to the active option so the arrows start from it.
    menu.addEventListener('toggle', () => {
      if (!menu.open) return;
      (options.find((o) => o.getAttribute('aria-current') === 'true') || options[0]).focus();
    });
    menu.addEventListener('keydown', (event) => {
      if (!menu.open) return;
      if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
      const at = options.indexOf(doc.activeElement);
      const to = menuStep(at, event.key, options.length);
      if (to !== at && to >= 0) { event.preventDefault(); options[to].focus(); }
    });
    doc.addEventListener('click', (event) => {
      if (menu.open && !menu.contains(event.target)) close(false);
    });
    return { choose, current };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LANGS, CODES, NAMES, resolveLang, menuStep, init };
  } else if (typeof document !== 'undefined') {
    let storage = null;
    try { storage = window.localStorage; } catch { /* storage access denied */ }
    init(document, storage ?? { getItem() { return null; }, setItem() {} });
  }
})();
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test _tests/lang.test.cjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Add the flags and the menu markup** — create `_includes/flag.html`:

```liquid
{%- comment -%}
A 24×16 flag for one language, simplified to read at 16 px. include.lang is
en, yu or sr; include.t adds data-t so CSS shows it only for that language.
{%- endcomment -%}
{%- capture t -%}{% if include.t %} data-t="{{ include.lang }}"{% endif %}{%- endcapture -%}
{%- case include.lang -%}
{%- when "en" -%}
<svg class="flag"{{ t }} width="24" height="16" viewBox="0 0 24 16" aria-hidden="true" focusable="false"><rect width="24" height="16" fill="#fff"/><path fill="#b22234" d="M0 0h24v2.286H0zM0 4.571h24v2.286H0zM0 9.143h24v2.286H0zM0 13.714h24V16H0z"/><rect width="10" height="8.571" fill="#3c3b6e"/></svg>
{%- when "yu" -%}
<svg class="flag"{{ t }} width="24" height="16" viewBox="0 0 24 16" aria-hidden="true" focusable="false"><rect width="24" height="5.334" fill="#003893"/><rect y="5.333" width="24" height="5.334" fill="#fff"/><rect y="10.666" width="24" height="5.334" fill="#de0000"/><path d="M12 2.8l1.234 3.501 3.711.092-2.948 2.256 1.06 3.558L12 10.1l-3.057 2.107 1.06-3.558-2.948-2.256 3.711-.092z" fill="#de0000" stroke="#fcd116" stroke-width="0.7" stroke-linejoin="round"/></svg>
{%- when "sr" -%}
<svg class="flag"{{ t }} width="24" height="16" viewBox="0 0 24 16" aria-hidden="true" focusable="false"><rect width="24" height="5.334" fill="#c6363c"/><rect y="5.333" width="24" height="5.334" fill="#0c4076"/><rect y="10.666" width="24" height="5.334" fill="#fff"/></svg>
{%- endcase -%}
```

Create `_includes/lang-menu.html`:

```liquid
{%- comment -%}
Language menu in the nav (assets/js/lang.js). The button shows the active
language's flag; the panel lists every language. Without JavaScript the
<details> still opens but choosing does nothing and the site stays English.
{%- endcomment -%}
<details class="lang-menu" data-lang-menu>
  <summary class="lang-menu-button" aria-label="Language" data-action-target="lang-menu">
    {%- for l in site.data.languages %}{% include flag.html lang=l.key t=true %}{% endfor -%}
  </summary>
  <ul class="lang-menu-list">
    {%- for l in site.data.languages %}
    <li><button type="button" class="lang-option" data-set-lang="{{ l.key }}" aria-current="{% if l.key == 'en' %}true{% else %}false{% endif %}">{% include flag.html lang=l.key %}<span class="lang-badge">{{ l.badge }}</span><span class="lang-name" lang="{{ l.code }}">{{ l.name }}</span></button></li>
    {%- endfor %}
  </ul>
</details>
```

In `_includes/navigation.html`, make the menu the first child of `.nav-toggles`:

```liquid
      <li class="nav-toggles">
        {% include lang-menu.html %}
        {% include theme-toggle.html axis="color" %}
```

In `_layouts/default.html`, after the `theme.js` script tag, add:

```html
    <script src="{{ "/assets/js/lang.js" | relative_url }}" defer></script>
```

- [ ] **Step 6: Style the menu** — in `assets/css/theme.css`, after the language hiding rules from Task 1, add:

```css
/* Language menu (lang.js): a flag button and a panel under it. */
.lang-menu {
  position: relative;
  display: inline-flex;
}

.lang-menu-button {
  display: inline-flex;
  list-style: none;
  cursor: pointer;
  line-height: 0;
  transition: transform 0.2s ease;
}

.lang-menu-button::-webkit-details-marker {
  display: none;
}

.lang-menu-button:hover {
  transform: scale(1.15);
}

.flag {
  display: block;
  border-radius: 2px;
  box-shadow: 0 0 0 1px var(--border-color);
}

.lang-menu-list {
  position: absolute;
  top: calc(100% + 0.6rem);
  right: 0;
  z-index: 20;
  min-width: 10.5rem;
  margin: 0;
  padding: 0.35rem;
  list-style: none;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-color);
  box-shadow: 0 8px 30px var(--share-shadow);
}

.nav .lang-menu-list li {
  display: block;
}

.lang-option {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: none;
  border-radius: 4px;
  background: none;
  color: var(--text-color);
  font: inherit;
  font-size: 0.9rem;
  text-align: left;
  cursor: pointer;
}

.lang-option:hover,
.lang-option:focus-visible {
  background: var(--code-bg);
}

.lang-option[aria-current="true"] {
  color: var(--heading-color);
  font-weight: bold;
}

.lang-badge {
  min-width: 1.6rem;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  color: var(--catalogue-date-color);
}
```

At the end of the file (after the shortcut dialog's pixel and color rules), add:

```css
/* Language menu under the other axes. */
[data-color="on"] .lang-menu-list {
  border-color: transparent;
}

[data-color="on"] .lang-menu-list::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: var(--rainbow-border);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  filter: var(--melt) hue-rotate(var(--hue));
  animation: var(--cycle-name) var(--cycle-duration) var(--rainbow-timing) infinite;
  animation-play-state: var(--rainbow-play);
}

[data-style="pixel"] .lang-menu-list,
[data-style="pixel"] .lang-option,
[data-style="pixel"] .flag {
  border-radius: 0;
}

[data-style="pixel"] .lang-menu-list {
  border-width: 2px;
  box-shadow: 4px 4px 0 var(--heading-color);
}

[data-style="pixel"] .lang-badge,
[data-style="pixel"] .lang-name {
  font-family: var(--pixel-font);
  font-size: 0.75rem;
}

[data-style="pixel"] .flag {
  shape-rendering: crispEdges;
}

[data-style="pixel"] .lang-menu-button {
  transition: none;
}

[data-style="pixel"] .lang-menu-button:hover {
  transform: translate(1px, 1px);
}

[data-style="pixel"][data-color="on"] .lang-menu-list::before {
  padding: 2px;
}
```

- [ ] **Step 7: Build and check in a browser** — build, serve `_site` on port 4141, and with the Playwright environment run a short script that loads `/`, clicks `.lang-menu summary`, then `[data-set-lang="yu"]`, and prints `document.documentElement.dataset.lang`, `document.documentElement.lang`, and the visible flag inside the summary (`[...document.querySelectorAll('.lang-menu-button .flag')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.dataset.t)`).
Expected: `yu`, `sh`, `["yu"]`. Take screenshots of the open menu at 1280 and 375 px, smooth and pixel, and look at them.

- [ ] **Step 8: Commit**

```bash
git add _includes/flag.html _includes/lang-menu.html _includes/navigation.html _layouts/default.html assets/js/lang.js assets/css/theme.css _tests/lang.test.cjs
git commit -m "Add the language menu with flags (#34)"
```

---

### Task 3: The `l` shortcut

**Files:**
- Modify: `assets/js/shortcuts.js`, `_includes/shortcuts.html`
- Test: `_tests/shortcuts.test.cjs`

**Interfaces:**
- Consumes: `<summary data-action-target="lang-menu">` (Task 2).
- Produces: dialog rows may carry `data-action="<name>"`; the binding is `{ action: '<name>' }` and acting clicks `[data-action-target="<name>"]`.

- [ ] **Step 1: Write the failing tests** — append to `_tests/shortcuts.test.cjs`:

```js
test('rows with data-action bind to that action', () => {
  const { readBindings, step } = load();
  const read = readBindings([{ dataset: { shortcut: 'l', action: 'lang-menu' } }, { dataset: { shortcut: 't', toggle: 'theme' } }]);
  assert.deepEqual(read, { l: { action: 'lang-menu' }, t: { toggle: 'theme' } });
  assert.deepEqual(step(read, null, 'l'), { action: { action: 'lang-menu' }, pending: null });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test _tests/shortcuts.test.cjs`
Expected: FAIL, `l` reads as `{ href: undefined }`.

- [ ] **Step 3: Implement** — in `assets/js/shortcuts.js`, `readBindings`:

```js
      const { shortcut, toggle, href, action } = row.dataset;
      if (!shortcut) continue;
      bindings[shortcut] = toggle ? { toggle } : action ? { action } : { href };
```

and `act` (rename the parameter to `binding`):

```js
    function act(binding) {
      if (binding.help) toggleHelp();
      else if (binding.toggle) doc.querySelector(`[data-toggle="${binding.toggle}"]`)?.click();
      else if (binding.action) doc.querySelector(`[data-action-target="${binding.action}"]`)?.click();
      else if (binding.href) win.location.assign(binding.href);
    }
```

Update the header comment: `data-toggle (a theme axis button to click), data-action (clicks the element whose data-action-target matches) or data-href (a page to open)`. In `_includes/shortcuts.html`, add after the `p` row:

```html
          <div data-shortcut="l" data-action="lang-menu"><dt><kbd>l</kbd></dt><dd>Language menu</dd></div>
```

and update its comment to mention `data-action`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test _tests/shortcuts.test.cjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add assets/js/shortcuts.js _includes/shortcuts.html _tests/shortcuts.test.cjs
git commit -m "Open the language menu with l (#34)"
```

---

### Task 4: Translated site text and the post language note

**Files:**
- Create: `_includes/t.html`, `_includes/date.html`
- Modify: `_includes/navigation.html`, `_layouts/post.html`, `_includes/catalogue_item.html`, `_pages/about.md`, `_pages/archive.md` (front matter only), `_pages/tags.md` (front matter only), `assets/css/theme.css`

**Interfaces:**
- Consumes: `site.data.i18n`, `site.data.languages`, `flag.html` (Task 2), hiding rules (Task 1).
- Produces: `{% include t.html key="<key>" href="<url>" %}` (three `<span lang data-t>`; `href` turns `{a}…{/a}` into a link); `{% include date.html date=<date> format="full|month_day" class="<class>" %}` (three `<time data-t>`); front matter `title_key` on pages.

- [ ] **Step 1: Create the includes** — `_includes/t.html`:

```liquid
{%- comment -%}
One string from _data/i18n.yml in every language; CSS shows the active one.
include.href turns {a}…{/a} in the string into a link to that address.
{%- endcomment -%}
{%- assign strings = site.data.i18n[include.key] -%}
{%- for l in site.data.languages -%}
{%- assign text = strings[l.key] -%}
{%- if include.href -%}
{%- capture open -%}<a href="{{ include.href }}">{%- endcapture -%}
{%- assign text = text | replace: "{a}", open | replace: "{/a}", "</a>" -%}
{%- endif -%}
<span lang="{{ l.code }}" data-t="{{ l.key }}">{{ text }}</span>
{%- endfor -%}
```

`_includes/date.html`:

```liquid
{%- comment -%}
A date in every language; CSS shows the active one. include.format is "full"
(October 03, 2026 / 3. oktobar 2026.) or "month_day" (October 3 / 3. oktobar).
{%- endcomment -%}
{%- assign d = include.date -%}
{%- assign month_index = d | date: "%-m" | minus: 1 -%}
{%- for l in site.data.languages -%}
{%- if l.key == "en" -%}
{%- if include.format == "month_day" -%}{%- assign text = d | date: "%B %-d" -%}{%- else -%}{%- assign text = d | date: "%B %d, %Y" -%}{%- endif -%}
{%- else -%}
{%- assign month = site.data.i18n.months[l.key][month_index] -%}
{%- capture text -%}{{ d | date: "%-d" }}. {{ month }}{% unless include.format == "month_day" %} {{ d | date: "%Y" }}.{% endunless %}{%- endcapture -%}
{%- endif -%}
<time{% if include.class %} class="{{ include.class }}"{% endif %} datetime="{{ d | date_to_xmlschema }}" lang="{{ l.code }}" data-t="{{ l.key }}">{{ text }}</time>
{%- endfor -%}
```

- [ ] **Step 2: Nav and page titles** — in `_includes/navigation.html` replace the three link texts:

```liquid
      <li><a href="{{ "/archive" | prepend: site.baseurl }}">{% include t.html key="archive" %}</a></li>
      <li><a href="{{ "/tags" | prepend: site.baseurl }}">{% include t.html key="tags" %}</a></li>
      <li><a href="{{ "/about" | prepend: site.baseurl }}">{% include t.html key="about" %}</a></li>
```

Add `title_key: about`, `title_key: archive`, `title_key: tags` to the front matter of `_pages/about.md`, `_pages/archive.md`, `_pages/tags.md`.

- [ ] **Step 3: Post header** — in `_layouts/post.html`, replace the `.post-info` contents, the title, the tags label and add the language note:

```liquid
  <div class="post-info">
    {% include t.html key="written_by" %}
    {% if page.author %}
        {{ page.author }}
    {% else %}
        {{ site.author.name }}
    {% endif %}

    {% if page.date %}
      <br>
      {% include t.html key="on" %}{% include date.html date=page.date %}
    {% endif %}

    {% if page.collection == "posts" %}
      {% comment %} Body words only: the footnote list is references, not reading. 200 words per minute. {% endcomment %}
      {% assign words = content | split: '<div class="footnotes"' | first | strip_html | number_of_words %}
      {% assign minutes = words | divided_by: 200.0 | ceil | at_least: 1 %}
      <br>
      {{ words }}{% include t.html key="words" %}{{ minutes }}{% include t.html key="min_read" %}
    {% endif %}
  </div>

  <h1 class="post-title">{% if page.title_key %}{% include t.html key=page.title_key %}{% else %}{{ page.title }}{% endif %}</h1>

  {% if page.tags and page.tags.size > 0 %}
  <div class="post-tags" style="margin: 1rem 0; font-size: 0.9rem;">
    {% include t.html key="tags_label" %}
    {% for tag in page.tags %}
      <a href="{{ site.baseurl }}/tags#{{ tag | slugify }}" style="margin-right: 0.5rem;">{{ tag }}</a>
    {% endfor %}
  </div>
  {% endif %}

  {% if page.collection == "posts" %}
  {% comment %}
  When the chosen language is not the post's: a note naming the post's language,
  or a link to the version in the chosen language (same `ref`) once one exists.
  {% endcomment %}
  {% assign here = site.data.languages | where: "key", page.lang | first %}
  {% for l in site.data.languages %}{% unless l.key == page.lang %}
    {% assign other = nil %}
    {% if page.ref %}{% assign other = site.posts | where: "ref", page.ref | where: "lang", l.key | first %}{% endif %}
  <p class="post-lang-note" data-t="{{ l.key }}" lang="{{ l.code }}">
    {%- if other -%}
    <a href="{{ other.url | relative_url }}">{% include flag.html lang=l.key %} {{ l.name }}</a>
    {%- else -%}
    {{ site.data.i18n.only_in[l.key] }} <span lang="{{ here.code }}">{% include flag.html lang=page.lang %} {{ here.name }}</span>
    {%- endif -%}
  </p>
  {% endunless %}{% endfor %}
  {% endif %}
```

(The rest of `post.html` — `.post-line`, content, pagination — is unchanged.)

- [ ] **Step 4: Home list item** — in `_includes/catalogue_item.html`, change the opening tag, the pinned label and the date:

```liquid
<article class="catalogue-item" data-langs="{{ post.lang }}">
  <div>
    {% if include.sticky == 'true' %}
    <span class="catalogue-pinned">{% include t.html key="pinned" %} &middot;</span>
    {% endif %}
    {% include date.html date=post.date class="catalogue-time" %}
```

- [ ] **Step 5: Note styles** — in `assets/css/theme.css`, after the `.footnote.is-active` block, add:

```css
/* Post language note (post.html): shown when the chosen language is not the post's. */
.post-lang-note {
  margin: 0.5rem 0;
  font-size: 0.85rem;
  color: var(--catalogue-date-color);
}

.post-lang-note .flag {
  display: inline-block;
  width: 18px;
  height: 12px;
  vertical-align: -1px;
}
```

- [ ] **Step 6: Build and check**

Run: `bundle exec jekyll build -q 2>&1 | grep -v faraday; grep -c 'data-t="yu"' _site/index.html _site/about.html _site/2026-10-03/the-bottleneck-moved.html; grep -o 'post-lang-note[^<]*<' _site/2026-10-03/the-bottleneck-moved.html | head; node --test _tests/*.test.cjs 2>&1 | grep -E '^# (pass|fail)'`
Expected: non-zero counts; two notes (yu "Dostupno samo na:", sr "Доступно само на:"); all tests pass. Then serve and screenshot a post and the home page in English at 1280 px, smooth, and compare with the same shots from master (`git worktree add <scratch>/site-master-src master`, build there): text must be identical; only the nav gains the flag.

- [ ] **Step 7: Commit**

```bash
git add _includes/t.html _includes/date.html _includes/navigation.html _includes/catalogue_item.html _layouts/post.html _pages assets/css/theme.css
git commit -m "Translate the site text and note a post's language (#34)"
```

---

### Task 5: Filtered lists and empty notes (home, Archive, Tags)

**Files:**
- Modify: `_layouts/home.html`, `_pages/archive.md`, `_pages/tags.md`, `assets/css/theme.css`
- Create: `_includes/lang-counts.html`, `_includes/lang-empty.html`

**Interfaces:**
- Consumes: `data-langs` / `data-t` rules (Task 1), `t.html`, `date.html` (Task 4), `catalogue_item.html` carrying `data-langs` (Task 4).
- Produces: `#constellation-data` posts carry `"lang"` (Task 6 reads it); `.lang-empty` notes.

- [ ] **Step 1: Shared includes** — `_includes/lang-counts.html`:

```liquid
{%- comment -%} The size of include.posts per language, as a .tag-count; CSS shows the active one. {%- endcomment -%}
<span class="tag-count">{%- for l in site.data.languages -%}<span data-t="{{ l.key }}">{{ include.posts | where: "lang", l.key | size }}</span>{%- endfor -%}</span>
```

`_includes/lang-empty.html`:

```liquid
{%- comment -%}
One note per language whose list is empty. include.all: every post the page
could list (no_posts when a language has none); include.shown: what the page
lists; include.key: the note when a language has posts but none listed here;
include.href: link target for {a}…{/a} in that note.
{%- endcomment -%}
{%- for l in site.data.languages -%}
{%- assign total = include.all | where: "lang", l.key | size -%}
{%- assign shown = include.shown | where: "lang", l.key | size -%}
{%- if total == 0 -%}
<p class="lang-empty" data-t="{{ l.key }}" lang="{{ l.code }}"><em>{{ site.data.i18n.no_posts[l.key] }}</em></p>
{%- elsif shown == 0 and include.key -%}
{%- capture open -%}<a href="{{ include.href }}">{%- endcapture -%}
<p class="lang-empty" data-t="{{ l.key }}" lang="{{ l.code }}"><em>{{ site.data.i18n[include.key][l.key] | replace: "{a}", open | replace: "{/a}", "</a>" }}</em></p>
{%- endif -%}
{%- endfor -%}
```

- [ ] **Step 2: Home** — in `_layouts/home.html`, replace everything from `{% comment %} Count recent posts {% endcomment %}` through the closing `{% endfor %}` of that counting loop with a collected list:

```liquid
{% comment %} Posts from the last year, for the per-language empty notes. {% endcomment %}
{% assign recent_posts = "" | split: "" %}
{% for post in site.posts %}
  {% assign post_time = post.date | date: "%s" | plus: 0 %}
  {% if post_time >= one_year_ago %}{% assign recent_posts = recent_posts | push: post %}{% endif %}
{% endfor %}
{% capture archive_url %}{{ "/archive" | relative_url }}{% endcapture %}
```

Keep the sticky and recent loops as they are. Replace the whole `{% if recent_post_count == 0 %} … {% endif %}` block with:

```liquid
  <div class="lang-empty-home">
    {% include lang-empty.html all=site.posts shown=recent_posts key="no_recent" href=archive_url %}
  </div>
```

In `assets/css/theme.css`, after the `.post-lang-note .flag` block, add (the old message was upright, centred, with 2rem padding; the padding sits on the notes so the wrapper has no height when every note is hidden):

```css
/* Per-language empty notes on list pages (lang-empty.html). */
.lang-empty-home .lang-empty {
  padding: 2rem 0;
  text-align: center;
}

.lang-empty-home .lang-empty em {
  font-style: normal;
}
```

- [ ] **Step 3: Archive** — replace the body of `_pages/archive.md` (below the front matter) with:

```liquid
{%- assign one_year_ago = site.time | date: "%s" | plus: 0 | minus: 31536000 -%}
{%- assign old_posts = "" | split: "" -%}
{%- for post in site.posts -%}
{%- assign post_time = post.date | date: "%s" | plus: 0 -%}
{%- if post_time < one_year_ago -%}{%- assign old_posts = old_posts | push: post -%}{%- endif -%}
{%- endfor -%}
{%- assign posts_by_year = old_posts | group_by_exp: "post", "post.date | date: '%Y'" -%}
<div class="archive">
{%- for year_group in posts_by_year -%}
{%- assign year_langs = year_group.items | map: "lang" | uniq | join: " " %}
<section class="archive-year" data-langs="{{ year_langs }}">
<h2 id="{{ year_group.name }}">{{ year_group.name }}</h2>
<ul>
{%- for post in year_group.items %}
<li data-langs="{{ post.lang }}">{% include date.html date=post.date format="month_day" %} » <a href="{{ post.url | relative_url }}">{{ post.title }}</a></li>
{%- endfor %}
</ul>
</section>
{%- endfor %}
{% include lang-empty.html all=site.posts shown=old_posts key="archive_empty" %}
</div>
```

Keep no line indented by four spaces (kramdown would read it as code).

- [ ] **Step 4: Tags** — in `_pages/tags.md`:
  1. In the `#constellation-data` script, add `"lang":{{ post.lang | jsonify }},` after the `"title"` member of each post.
  2. After `{% include constellation.html %}`, add `{% include lang-empty.html all=tagged_posts shown=tagged_posts %}`.
  3. Wrap: `<div class="tags-page" data-langs="{{ tagged_posts | map: 'lang' | uniq | join: ' ' }}">`.
  4. Replace `<h2>Tag index</h2>` with `<h2>{% include t.html key="tag_index" %}</h2>`.
  5. In both tag loops, after `{% assign tag_posts = tag[1] %}` add `{% assign tag_langs = tag_posts | map: "lang" | uniq | join: " " %}`; give the chip's `<li>` and the `<section class="tag-section">` the attribute `data-langs="{{ tag_langs }}"`; replace both `<span class="tag-count">{{ tag_posts | size }}</span>` with `{% include lang-counts.html posts=tag_posts %}`.
  6. Give each post `<li>` in `.tag-posts` the attribute `data-langs="{{ post.lang }}"`.

- [ ] **Step 5: Build and check**

Run: `bundle exec jekyll build -q 2>&1 | grep -v faraday; grep -c 'data-langs="en"' _site/archive.html _site/tags.html _site/index.html; grep -o '"lang":"en"' _site/tags.html | wc -l; grep -o 'class="lang-empty"[^>]*>' _site/index.html _site/archive.html _site/tags.html`
Expected: non-zero `data-langs` counts; four `"lang":"en"` (one per tagged post); `lang-empty` notes for `yu` and `sr` on each page and none for `en`. Then serve and compare English screenshots of `/`, `/archive`, `/tags` with master (nav cropped): identical outside the constellation box.

- [ ] **Step 6: Commit**

```bash
git add _layouts/home.html _pages/archive.md _pages/tags.md _includes/lang-counts.html _includes/lang-empty.html assets/css/theme.css
git commit -m "Filter post lists by language, with empty notes (#34)"
```

---

### Task 6: Constellation per language

**Files:**
- Modify: `assets/js/constellation.js`, `assets/css/theme.css`
- Test: `_tests/constellation.test.cjs`

**Interfaces:**
- Consumes: `#constellation-data` posts with `lang` (Task 5); `themechange` detail `lang` (Tasks 1, 2).
- Produces: exports `forLang(data, lang)` → `{ tags, posts }` and `langChanged(current, detail)` → boolean; `.constellation[data-empty="true"]` when the language has no tagged posts.

- [ ] **Step 1: Write the failing tests** — append to `_tests/constellation.test.cjs`:

```js
test('forLang keeps one language and recounts its tags', () => {
  const { forLang } = load();
  const data = {
    tags: [{ name: 'python', slug: 'python', count: 2 }, { name: 'tools', slug: 'tools', count: 2 }],
    posts: [
      { url: '/a', title: 'A', lang: 'en', tags: ['python', 'tools'] },
      { url: '/b', title: 'B', lang: 'yu', tags: ['tools'] },
      { url: '/c', title: 'C', tags: ['python'] }
    ]
  };
  const en = forLang(data, 'en');
  assert.deepEqual(en.posts.map((p) => p.url), ['/a', '/c']);
  assert.deepEqual(en.tags.map((t) => [t.slug, t.count]), [['python', 2], ['tools', 1]]);
  const yu = forLang(data, 'yu');
  assert.deepEqual(yu.tags.map((t) => [t.slug, t.count]), [['tools', 1]]);
  assert.deepEqual(forLang(data, 'sr'), { tags: [], posts: [] });
});

test('langChanged is true only for a themechange that switches language', () => {
  const { langChanged } = load();
  assert.equal(langChanged('en', { lang: 'yu' }), true);
  assert.equal(langChanged('en', { lang: 'en', color: 'on' }), false);
  assert.equal(langChanged('en', { theme: 'dark' }), false);
  assert.equal(langChanged('en', undefined), false);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test _tests/constellation.test.cjs`
Expected: FAIL, `forLang is not a function`.

- [ ] **Step 3: Implement the helpers** — in `assets/js/constellation.js`, after `isClick`:

```js
  // The posts of one language and the tags they use, counted for that language.
  // A post without lang is English, like the front matter default.
  function forLang(data, lang) {
    const posts = (data.posts || []).filter((p) => (p.lang || 'en') === lang);
    const counts = new Map();
    for (const p of posts) for (const slug of p.tags || []) counts.set(slug, (counts.get(slug) || 0) + 1);
    const tags = (data.tags || []).filter((t) => counts.has(t.slug)).map((t) => ({ ...t, count: counts.get(t.slug) }));
    return { tags, posts };
  }

  function langChanged(current, detail) {
    return Boolean(detail && detail.lang && detail.lang !== current);
  }
```

and add both to `module.exports`: `{ C, radiusFor, seed, step, highlightSet, isClick, forLang, langChanged }`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test _tests/constellation.test.cjs`
Expected: PASS.

- [ ] **Step 5: Rebuild the graph on a language change** — in `init`:
  1. Replace `const { nodes, links } = seed(parsed.tags, parsed.posts || [], box);` and `const byId = new Map(nodes.map((n) => [n.id, n]));` with:

```js
    // The graph of the active language. Arrays are refilled in place on a
    // language change so every closure below keeps reading the current graph.
    const nodes = [], links = [];
    const byId = new Map();
    let lang = null;
    function load(next) {
      lang = next;
      const data = forLang(parsed, lang);
      const graph = seed(data.tags, data.posts, box);
      nodes.splice(0, nodes.length, ...graph.nodes);
      links.splice(0, links.length, ...graph.links);
      byId.clear();
      nodes.forEach((n, i) => { byId.set(n.id, n); n.phase = i * 1.7; });
      container.dataset.empty = nodes.length ? 'false' : 'true';
    }
    load(html.dataset.lang || 'en');
```

  2. Delete the later line `nodes.forEach((n, i) => { n.phase = i * 1.7; });`.
  3. In `start()`, change the guard to `if (running || !wide.matches || !nodes.length) return;`.
  4. Before the `themechange` listener, add:

```js
    // A language switch swaps the whole graph; everything else only restyles it.
    function relang(next) {
      stop();
      drag = null; hoverId = null; litId = null;
      linksG.replaceChildren(); nodesG.replaceChildren();
      el.clear(); lineEl.length = 0;
      built = false; settled = false; atRest = false;
      load(next);
      start();
    }
```

  5. Replace the `themechange` listener with:

```js
    doc.addEventListener('themechange', (event) => {
      if (langChanged(lang, event.detail)) { relang(event.detail.lang); return; }
      if (!built) return; reshape(); if (!running) { render(0); start(); }
    });
```

In `assets/css/theme.css`, after the `.constellation svg` block, add:

```css
/* No tagged posts in the chosen language: the list's empty note says so. */
.constellation[data-empty="true"] {
  display: none;
}
```

- [ ] **Step 6: Check** — run `node --test _tests/*.test.cjs` (all pass), build, serve, and run `node _tests/tools/constellation-check.cjs http://localhost:4141` (passes in English).

- [ ] **Step 7: Commit**

```bash
git add assets/js/constellation.js assets/css/theme.css _tests/constellation.test.cjs
git commit -m "Build the tags constellation from the chosen language (#34)"
```

---

### Task 7: Browser check tool, full verification, docs

**Files:**
- Create: `_tests/tools/lang-check.cjs`
- Modify: `CLAUDE.md`
- Temporary (never committed): `_posts/2026-10-01-proba.md`

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Write the tool** — `_tests/tools/lang-check.cjs`:

```js
// Usage: node _tests/tools/lang-check.cjs <base url> <path of a yu post>
// Needs at least one yu post with tags in the build (add a throwaway one locally).
// Drives the language menu and checks filtering, translated text, <html lang>,
// persistence, the keyboard, no-JS English and the menu at 375 px.
// Prints ok/FAIL per check and exits non-zero on any FAIL.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = (process.argv[2] ?? 'http://localhost:4141').replace(/\/$/, '');
const yuPost = process.argv[3];
let failed = 0;
const ok = (name, cond, extra = '') => { if (!cond) failed++; console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${extra ? ` (${extra})` : ''}`); };
const shown = (page, sel) => page.$$eval(sel, (els) => els.filter((e) => e.getClientRects().length > 0).map((e) => e.innerText.trim()));
const shownLangs = (page, sel) => page.$$eval(sel, (els) => els.filter((e) => e.getClientRects().length > 0).map((e) => e.dataset.langs));

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const attr = (name) => page.getAttribute('html', name);

  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  ok('default language is en', (await attr('data-lang')) === 'en');
  ok('home lang attribute is en', (await attr('lang')) === 'en');
  ok('nav reads Archive', (await shown(page, '.nav ul li a')).includes('Archive'));
  ok('home lists only en posts', (await shownLangs(page, '.catalogue-item')).every((l) => l === 'en'));

  await page.click('.lang-menu summary');
  await page.click('[data-set-lang="yu"]');
  ok('menu sets yu', (await attr('data-lang')) === 'yu');
  ok('home lang attribute is sh', (await attr('lang')) === 'sh');
  ok('nav reads Arhiva', (await shown(page, '.nav ul li a')).includes('Arhiva'));
  const yuItems = await shownLangs(page, '.catalogue-item');
  ok('home lists only yu posts', yuItems.length > 0 && yuItems.every((l) => l === 'yu'), yuItems.join(','));
  ok('button shows the yu flag', (await page.$$eval('.lang-menu-button .flag', (els) => els.filter((e) => e.getClientRects().length).map((e) => e.dataset.t))).join() === 'yu');

  await page.reload({ waitUntil: 'networkidle' });
  ok('choice survives reload', (await attr('data-lang')) === 'yu');

  await page.goto(`${base}/archive`, { waitUntil: 'networkidle' });
  ok('archive hides en years', (await shownLangs(page, '.archive-year')).every((l) => l.split(' ').includes('yu')));
  ok('archive shows the yu note', (await shown(page, '.lang-empty')).join().includes('Arhiva je još prazna'));

  await page.goto(`${base}/tags`, { waitUntil: 'networkidle' });
  ok('tags list only yu posts', (await shownLangs(page, '.tag-posts li')).every((l) => l === 'yu'));
  const nodeHrefs = await page.$$eval('.constellation .node--post', (els) => els.map((e) => e.getAttribute('href')));
  ok('constellation holds only yu posts', nodeHrefs.length > 0 && nodeHrefs.every((h) => h === yuPost), nodeHrefs.join(','));
  await page.click('[data-toggle="theme"]');
  await page.waitForTimeout(300);
  const afterFlip = await page.$$eval('.constellation .node--post', (els) => els.map((e) => e.getAttribute('href')));
  ok('a theme flip keeps the yu graph', afterFlip.length === nodeHrefs.length && afterFlip.every((h) => h === yuPost));

  await page.goto(`${base}/2026-10-03/the-bottleneck-moved`, { waitUntil: 'networkidle' });
  ok('an en post keeps lang en', (await attr('lang')) === 'en');
  ok('the post notes its language', (await shown(page, '.post-lang-note')).join().includes('Dostupno samo na'));

  await page.keyboard.press('l');
  ok('l opens the menu', await page.$eval('.lang-menu', (d) => d.open));
  ok('focus starts on the active option', await page.evaluate(() => document.activeElement.dataset.setLang === 'yu'));
  await page.keyboard.press('ArrowDown');
  ok('ArrowDown moves to sr', await page.evaluate(() => document.activeElement.dataset.setLang === 'sr'));
  await page.keyboard.press('Escape');
  ok('Esc closes', !(await page.$eval('.lang-menu', (d) => d.open)));
  ok('focus returns to the button', await page.evaluate(() => document.activeElement.matches('.lang-menu summary')));
  await page.keyboard.press('l');
  await page.mouse.click(5, 600);
  ok('an outside click closes', !(await page.$eval('.lang-menu', (d) => d.open)));
  await page.keyboard.press('l');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  ok('Enter chooses sr', (await attr('data-lang')) === 'sr');
  ok('the note switches to Cyrillic', (await shown(page, '.post-lang-note')).join().includes('Доступно само на'));

  await page.evaluate(() => localStorage.setItem('lang', 'klingon'));
  await page.reload({ waitUntil: 'networkidle' });
  ok('an unknown stored value falls back to en', (await attr('data-lang')) === 'en');

  const phone = await browser.newPage({ viewport: { width: 375, height: 800 } });
  await phone.goto(`${base}/`, { waitUntil: 'networkidle' });
  await phone.click('.lang-menu summary');
  const r = await phone.$eval('.lang-menu-list', (e) => e.getBoundingClientRect().toJSON());
  ok('menu fits at 375 px', r.left >= 0 && r.right <= 375, `${Math.round(r.left)}..${Math.round(r.right)}`);

  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const plain = await noJs.newPage();
  await plain.goto(`${base}/`, { waitUntil: 'networkidle' });
  ok('no JS: nav reads Archive', (await shown(plain, '.nav ul li a')).includes('Archive'));
  ok('no JS: only en posts', (await shownLangs(plain, '.catalogue-item')).every((l) => l === 'en'));

  await browser.close();
  console.log(failed ? `${failed} FAILED` : 'ALL OK');
  process.exit(failed ? 1 : 0);
})();
```

- [ ] **Step 2: Add a throwaway yu post and run it** — create `_posts/2026-10-01-proba.md`:

```markdown
---
layout: post
title: "Proba"
author: "Đorđe Relić"
lang: yu
tags: [proba, ai]
---

Ovo je probni članak.
```

Build, serve `_site` on 4141, run `node _tests/tools/lang-check.cjs http://localhost:4141 /2026-10-01/proba`.
Expected: `ALL OK`. Fix any FAIL in the task that owns it, rebuild, rerun.

- [ ] **Step 3: Delete the throwaway post** — `rm _posts/2026-10-01-proba.md`, rebuild. `git status` must not list it.

- [ ] **Step 4: Regression and invariance** — with the master build served on another port, screenshot `/`, `/archive`, `/tags`, `/about`, and both 2026 posts in English with `_tests/screenshot.cjs` (nav cropped), light and dark, smooth and pixel, at 1280 px; compare byte for byte with this branch. Only the home page (live GitHub sidebar) and the tags constellation box may differ. Then run `node _tests/tools/layout-invariance.cjs http://localhost:4141` (PASS) and look at screenshots of the open menu and a yu-selected home page at 1280 and 375 px in smooth, pixel, light, dark and color on.

- [ ] **Step 5: Document** — in `CLAUDE.md`: add `lang.js` to the `assets/js` list and `lang-menu, flag, t, date, lang-counts, lang-empty` to the `_includes` list in Directory Structure; add `lang: en` to the required front matter example with a note "(`en`, `yu` or `sr`; defaults to `en`)"; add a "### Language" section after "Theme axes":

```markdown
### Language

A fourth switch, `data-lang` on `<html>` (`en`, `yu` Naš in Latin, `sr` Српски in Cyrillic;
storage key `lang`, default `en`, never the browser language), set before first paint by
`_includes/head.html` and changed by the nav menu (`_includes/lang-menu.html`,
`assets/js/lang.js`, shortcut `l`). Posts carry `lang:` in front matter (default `en` from
`_config.yml`); post pages fix `<html lang>` to the post's (`data-content-lang`), other pages
follow the choice (`en`, `sh`, `sr-Cyrl`).

Nothing is swapped by script. Liquid writes every string in all three languages
(`_data/i18n.yml` through `{% include t.html key="..." %}`, dates through `date.html`), each
marked `data-t="<lang>"`; post entries and groups carry `data-langs="<langs>"`; CSS hides
what does not match. Lists write a `lang-empty` note for each language they have nothing
for. The tags constellation rebuilds from the chosen language's posts on a `themechange`
whose `lang` changed. A post page in another language than the chosen one shows a note; a
translation is linked when posts share `ref:` in front matter.

To add a string: add a key to `_data/i18n.yml` with `en`, `yu` and `sr` (yu and sr say the
same thing in two scripts) and use `t.html`. `_tests/lang.test.cjs` tests `resolveLang`,
`menuStep` and the menu; `node _tests/tools/lang-check.cjs <base> <yu post path>` drives
it in a browser and needs a throwaway yu post in the build.
```

Also in "Keyboard shortcuts", mention `l` and `data-action`.

- [ ] **Step 6: Commit**

```bash
git add _tests/tools/lang-check.cjs CLAUDE.md
git commit -m "Add the language browser check and document language support (#34)"
```
