# Theme Axes Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single dark-mode switch with a generic three-axis theme system (theme, color, style) that produces no visible change yet, so the color and pixel axes can be added on top.

**Architecture:** The `html` element carries `data-theme`, `data-color` and `data-style`. An inline head script sets all three before first paint; `assets/js/theme.js` owns the toggle logic, persistence and a `themechange` event, with its pure functions exported for Node tests. `assets/css/theme.css` (renamed from `dark-mode.css`) holds every color as a variable so later axes only redefine variables.

**Tech Stack:** Jekyll 3.10 (github-pages gem) with the remote Tale theme, plain CSS and JS, Node 20 built-in test runner (`node --test`), headless Chromium via Playwright for screenshots.

**Spec:** `docs/superpowers/specs/2026-09-18-theme-axes-design.md`

## Global Constraints

- Storage keys are exactly `theme`, `color`, `style`; values are exactly `light|dark`, `off|on`, `smooth|pixel`. The existing `theme` key and values are kept so current visitors keep their choice.
- Defaults: theme from `prefers-color-scheme`, else `light`; color `off`; style `smooth`.
- Button `aria-label` text is exactly: `Switch to dark`, `Switch to light`, `Turn color on`, `Turn color off`, `Switch to pixel style`, `Switch to smooth style`.
- No `!important` in `theme.css`. No `@media (prefers-color-scheme)` block in `theme.css`.
- Light and dark must render pixel-identical to `master` below the nav on the home page and one post page (the nav changes because PNG bulbs become SVG).
- Every commit ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Work on branch `4-theme-axes-foundation`, created from `master` after the spec branch `4-theme-axes-spec` has been merged (or rebased onto it).

## File structure

| File | Responsibility |
|------|----------------|
| `assets/js/theme.js` (new, replaces `assets/js/dark-mode.js`) | Axis definitions, pure helpers (`resolve`, `next`, `label`), DOM wiring (`init`), `themechange` event. Exports the pure API when a CommonJS `module` exists. |
| `_tests/theme.test.cjs` (new) | Unit tests for the pure helpers and for `init` against a fake document and storage. |
| `_includes/head.html` | Inline pre-paint script that sets the three attributes. Stylesheet link renamed. |
| `_includes/theme-toggle.html` (new) | One button for one axis: `{% include theme-toggle.html axis="theme" %}`. Contains both icon states as inline SVG. |
| `_includes/navigation.html` | Uses the include instead of the inline PNG button. |
| `_includes/dark-mode-toggle.html` (delete) | Unused emoji toggle. |
| `assets/css/theme.css` (renamed from `dark-mode.css`) | Layer 1 tokens, layer 2 component rules. No axis-specific rule except the `[data-theme="dark"]` token block. |
| `assets/imgs/lightbulb-on.png`, `lightbulb-off.png`, `assets/imgs/README.md` (delete) | Replaced by SVG. |
| `_layouts/default.html` | Script tag renamed. |
| `README.md`, `CLAUDE.md`, `AGENTS.md` | Document the axes. |
| `_tests/screenshot.cjs` (new, dev tool) | Screenshots a URL in a given theme for the before/after comparison. |

---

### Task 1: Pure theme helpers with tests

**Files:**
- Create: `assets/js/theme.js`
- Test: `_tests/theme.test.cjs`

**Interfaces:**
- Produces: `axes` object; `resolve(axis, stored, systemDark) -> value`; `next(axis, current) -> value`; `label(axis, current) -> string`. Exported via `module.exports` when `module` is defined; the browser never defines it.

- [ ] **Step 1: Write the failing tests**

Create `_tests/theme.test.cjs`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test _tests/theme.test.cjs`
Expected: FAIL with `ENOENT` for `assets/js/theme.js`.

- [ ] **Step 3: Write the helpers**

Create `assets/js/theme.js`:

```js
// Three independent theme axes on <html>: data-theme, data-color, data-style.
// The inline script in _includes/head.html sets them before first paint;
// this file wires the nav buttons, persists choices and emits `themechange`.
(() => {
  const axes = {
    theme: { values: ['light', 'dark'], labels: { light: 'Switch to dark', dark: 'Switch to light' } },
    color: { values: ['off', 'on'], labels: { off: 'Turn color on', on: 'Turn color off' } },
    style: { values: ['smooth', 'pixel'], labels: { smooth: 'Switch to pixel style', pixel: 'Switch to smooth style' } }
  };

  function resolve(axis, stored, systemDark) {
    const { values } = axes[axis];
    if (values.includes(stored)) return stored;
    return axis === 'theme' && systemDark ? 'dark' : values[0];
  }

  function next(axis, current) {
    const { values } = axes[axis];
    return current === values[1] ? values[0] : values[1];
  }

  function label(axis, current) {
    return axes[axis].labels[current] ?? axes[axis].labels[axes[axis].values[0]];
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { axes, resolve, next, label };
  }
})();
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test _tests/theme.test.cjs`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add assets/js/theme.js _tests/theme.test.cjs
git commit -m "Add pure theme axis helpers with tests

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: DOM wiring, persistence and the themechange event

**Files:**
- Modify: `assets/js/theme.js`
- Test: `_tests/theme.test.cjs`

**Interfaces:**
- Consumes: `axes`, `resolve`, `next`, `label` from Task 1.
- Produces: `init(doc, storage, matchMedia) -> { current(), flip(axis) }`. `doc.documentElement` gets the three attributes; every element matching `[data-toggle]` becomes a button for the axis named in that attribute; `document` receives `CustomEvent('themechange', { detail: { theme, color, style } })` after each flip. When `module` is undefined and `document` exists, `init(document, localStorage, window.matchMedia)` runs on load.

- [ ] **Step 1: Write the failing tests**

Append to `_tests/theme.test.cjs`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test _tests/theme.test.cjs`
Expected: the 4 new tests FAIL with `api.init is not a function`.

- [ ] **Step 3: Implement init**

In `assets/js/theme.js`, replace the final `if (typeof module ...)` block with:

```js
  function init(doc, storage, matchMedia) {
    const html = doc.documentElement;
    const read = (key) => { try { return storage.getItem(key); } catch { return null; } };
    const write = (key, value) => { try { storage.setItem(key, value); } catch { /* private mode or blocked storage */ } };
    const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
    const buttons = Array.from(doc.querySelectorAll('[data-toggle]')).filter((button) => axes[button.dataset.toggle]);

    const current = () => Object.fromEntries(Object.keys(axes).map((axis) => [axis, html.getAttribute(`data-${axis}`)]));

    function apply(axis, value) {
      html.setAttribute(`data-${axis}`, value);
      buttons.filter((button) => button.dataset.toggle === axis)
        .forEach((button) => button.setAttribute('aria-label', label(axis, value)));
    }

    function flip(axis) {
      const value = next(axis, html.getAttribute(`data-${axis}`));
      apply(axis, value);
      write(axis, value);
      doc.dispatchEvent(new CustomEvent('themechange', { detail: current() }));
    }

    Object.keys(axes).forEach((axis) => apply(axis, resolve(axis, read(axis), Boolean(media?.matches))));
    buttons.forEach((button) => button.addEventListener('click', () => flip(button.dataset.toggle)));
    media?.addEventListener?.('change', (event) => {
      if (!axes.theme.values.includes(read('theme'))) apply('theme', event.matches ? 'dark' : 'light');
    });

    return { current, flip };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { axes, resolve, next, label, init };
  } else if (typeof document !== 'undefined') {
    init(document, window.localStorage, window.matchMedia);
  }
```

Note: in the browser, `window.localStorage` itself can throw in some privacy modes. Wrap the browser call:

```js
  } else if (typeof document !== 'undefined') {
    let storage = null;
    try { storage = window.localStorage; } catch { /* storage access denied */ }
    init(document, storage ?? { getItem() { return null; }, setItem() {} }, window.matchMedia);
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test _tests/`
Expected: theme tests 7 passed; project-stats tests still 14 passed.

- [ ] **Step 5: Commit**

```bash
git add assets/js/theme.js _tests/theme.test.cjs
git commit -m "Wire theme axes to buttons, storage and a themechange event

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Head script, stylesheet rename, script tag

**Files:**
- Modify: `_includes/head.html`
- Modify: `_layouts/default.html:17`
- Rename: `assets/css/dark-mode.css` -> `assets/css/theme.css`
- Delete: `assets/js/dark-mode.js`

**Interfaces:**
- Produces: `html[data-theme][data-color][data-style]` set before first paint on every page; `assets/css/theme.css` linked on every page; `assets/js/theme.js` loaded at the end of `body`.

- [ ] **Step 1: Rename and delete**

```bash
git mv assets/css/dark-mode.css assets/css/theme.css
git rm assets/js/dark-mode.js
```

- [ ] **Step 2: Update the head include**

In `_includes/head.html` replace the stylesheet line and the inline script:

```html
  <link rel="stylesheet" href="{{ "/assets/css/theme.css" | relative_url }}">
```

and

```html
  <!-- Set the three theme axes before first paint so the page never flashes the wrong look.
       Keep in sync with the defaults in assets/js/theme.js. -->
  <script>
    (function () {
      var html = document.documentElement, storage = null;
      try { storage = window.localStorage; } catch (e) {}
      function set(axis, first, second, fallback) {
        var value = null;
        try { value = storage && storage.getItem(axis); } catch (e) {}
        html.setAttribute('data-' + axis, value === first || value === second ? value : fallback);
      }
      var systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      set('theme', 'light', 'dark', systemDark ? 'dark' : 'light');
      set('color', 'off', 'on', 'off');
      set('style', 'smooth', 'pixel', 'smooth');
    })();
  </script>
```

- [ ] **Step 3: Update the layout**

In `_layouts/default.html` change line 17 to:

```html
    <script src="{{ "/assets/js/theme.js" | relative_url }}"></script>
```

- [ ] **Step 4: Build and check the attributes**

Run: `bundle exec jekyll build && grep -c 'data-theme' _site/index.html && grep -o 'assets/css/theme.css\|assets/js/theme.js' _site/index.html`
Expected: build succeeds, both asset paths printed. Open `_site/index.html` in the screenshot tool (Task 5) later; for now confirm no reference to `dark-mode` remains:

Run: `grep -rn "dark-mode\.\(css\|js\)" _includes _layouts`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add -A _includes/head.html _layouts/default.html assets/css assets/js
git commit -m "Set all three theme axes before paint and load theme.js

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Tokenize theme.css and drop !important and the media block

**Files:**
- Modify: `assets/css/theme.css`

**Interfaces:**
- Produces: variables `--nav-title-color`, `--nav-link-color`, `--nav-link-hover-color`, `--share-color`, `--share-shadow`, `--share-shadow-hover`, `--share-feedback-bg`, `--share-feedback-color`, `--title-color`, in addition to the existing ones. Later axes redefine these; nothing else.

- [ ] **Step 1: Add the new tokens**

In `:root` (light) add after `--catalogue-date-color: #aaa;`:

```css
  --title-color: #333;
  --nav-title-color: #000;
  --nav-link-color: #000;
  --nav-link-hover-color: #444;
  --share-color: #000;
  --share-shadow: rgba(0, 0, 0, 0.2);
  --share-shadow-hover: rgba(0, 0, 0, 0.3);
  --share-feedback-bg: #333;
  --share-feedback-color: #fff;
```

In `[data-theme="dark"]` add after `--catalogue-date-color: #888;`:

```css
  --title-color: #fff;
  --nav-title-color: #fff;
  --nav-link-color: #fff;
  --nav-link-hover-color: #e8e8e8;
  --share-color: #fff;
  --share-shadow: rgba(255, 255, 255, 0.1);
  --share-shadow-hover: rgba(255, 255, 255, 0.2);
  --share-feedback-bg: #555;
  --share-feedback-color: #fff;
```

Also add `--code-text-color: #bf616a;` to `:root` (Tale's light code color) so the code rules below can be axis-free.

- [ ] **Step 2: Replace the dark-only code rules**

Delete the three `[data-theme="dark"] code`, `[data-theme="dark"] pre`, `[data-theme="dark"] pre code` blocks. Change the existing light rules to:

```css
code {
  background-color: var(--code-bg);
  border: 1px solid var(--code-border);
  color: var(--code-text-color);
}

pre {
  background-color: var(--code-bg);
  border: 1px solid var(--code-border);
}

pre code {
  color: var(--code-text-color);
  background-color: transparent;
  border: none;
}
```

Check against master: in light mode Tale sets `code { color: #bf616a }` and `pre code { color: inherit }`. Setting `--code-text-color: #bf616a` for light keeps inline code identical; `pre code` in light was `inherit` (body #555). To stay pixel-identical, use a second token: add `--pre-text-color: inherit;` to `:root` and `--pre-text-color: #9a9a9a;` to `[data-theme="dark"]`, and write `pre code { color: var(--pre-text-color); ... }`.

- [ ] **Step 3: Replace the !important title and nav rules**

Delete the two blocks `/* Ensure page and post titles are white in dark mode */` and `/* Navigation title colors ... */` plus their `[data-theme="dark"]` twins, and the `.nav a` / `[data-theme="dark"] .nav a` blocks. Replace with:

```css
/* Page and post titles. Same specificity as Tale's rules; this sheet loads later. */
.post-title,
.page-title,
.tags-header-title,
h1.post-title {
  color: var(--title-color);
}

/* Navigation title and links */
.nav-title,
.nav-container h2 {
  color: var(--nav-title-color);
}

.nav a {
  color: var(--nav-link-color);
}

.nav a:hover {
  color: var(--nav-link-hover-color);
}
```

The old rule also forced every `h1` white in dark mode. `h1` already gets `var(--heading-color)` (#fff in dark) from the generic heading rule, so no extra rule is needed. Verify with the screenshot diff in Task 6.

- [ ] **Step 4: Tokenize the share button**

In `.share-button` change `box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);` to `box-shadow: 0 2px 10px var(--share-shadow);` and `color: #000000;` to `color: var(--share-color);`. In `.share-button:hover` change the shadow to `0 4px 15px var(--share-shadow-hover)`. Delete the `[data-theme="dark"] .share-button` and `[data-theme="dark"] .share-button:hover` blocks. In `.share-feedback` change `background-color: #333;` to `var(--share-feedback-bg)` and `color: #fff;` to `var(--share-feedback-color)`. Delete `[data-theme="dark"] .share-feedback`.

- [ ] **Step 5: Delete the system-preference block**

Delete the entire `@media (prefers-color-scheme: dark) { ... }` block at the end of the file. The head script now resolves the preference.

- [ ] **Step 6: Verify no axis-specific rules remain except the token block**

Run: `grep -n 'important\|prefers-color-scheme\|data-theme' assets/css/theme.css`
Expected: exactly one line, the `[data-theme="dark"] {` token block. (The toggle icon rules are handled in Task 5.)

- [ ] **Step 7: Build**

Run: `bundle exec jekyll build`
Expected: success.

- [ ] **Step 8: Commit**

```bash
git add assets/css/theme.css
git commit -m "Move every theme color into variables and drop !important overrides

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: SVG toggle include and nav

**Files:**
- Create: `_includes/theme-toggle.html`
- Modify: `_includes/navigation.html:10-15`
- Modify: `assets/css/theme.css` (toggle rules)
- Delete: `_includes/dark-mode-toggle.html`, `assets/imgs/lightbulb-on.png`, `assets/imgs/lightbulb-off.png`, `assets/imgs/README.md`

**Interfaces:**
- Consumes: `[data-toggle]` buttons expected by `init` (Task 2).
- Produces: `{% include theme-toggle.html axis="theme" %}` renders `<button class="theme-toggle" data-toggle="theme">` holding two SVGs with `data-when="light"` and `data-when="dark"`. Later tasks add `axis="color"` and `axis="style"` branches to this include.

- [ ] **Step 1: Write the include**

Create `_includes/theme-toggle.html`:

```html
{% comment %}
One nav button per theme axis. `include.axis` is theme, color or style.
Each button holds both icon states; theme.css shows the one matching the
html attribute. Icons show the state you get by clicking. theme.js sets
the aria-label on load, so the static label here is only a no-JS fallback.
{% endcomment %}
<button class="theme-toggle" type="button" data-toggle="{{ include.axis }}" aria-label="Toggle {{ include.axis }}">
{% if include.axis == "theme" %}
  <svg data-when="light" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M9 18h6M10 21h4M8.5 15a6.5 6.5 0 1 1 7 0c-.8.6-1.5 1.5-1.5 3h-4c0-1.5-.7-2.4-1.5-3Z"/>
  </svg>
  <svg data-when="dark" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M9 18h6M10 21h4M8.5 15a6.5 6.5 0 1 1 7 0c-.8.6-1.5 1.5-1.5 3h-4c0-1.5-.7-2.4-1.5-3Z" fill="currentColor" fill-opacity="0.35"/>
    <path d="M12 2v1M4.2 5.2l.7.7M2 12h1M21 12h1M19.8 5.2l-.7.7"/>
  </svg>
{% endif %}
</button>
```

- [ ] **Step 2: Use it in the nav**

In `_includes/navigation.html` replace lines 10 to 15 (the `<li>` containing the old button) with:

```html
      <li class="nav-toggles">
        {% include theme-toggle.html axis="theme" %}
      </li>
```

- [ ] **Step 3: Replace the toggle CSS**

In `assets/css/theme.css` delete everything from `/* Dark mode toggle button styles - in navigation bar */` up to (not including) the deleted media block position, i.e. the `.nav ul li`, `.dark-mode-toggle*` and `[data-theme="dark"] .dark-mode-toggle*` rules, and add:

```css
/* Theme axis buttons in the nav */
.nav ul li {
  display: inline-block;
  vertical-align: middle;
  line-height: normal;
}

.nav-toggles {
  display: inline-flex;
  gap: 0.75rem;
  vertical-align: middle;
}

.theme-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin: 0;
  display: inline-flex;
  color: var(--nav-link-color);
  line-height: 0;
  transition: transform 0.2s ease;
}

.theme-toggle:hover {
  transform: scale(1.15);
}

.theme-toggle:active {
  transform: scale(0.95);
}

.theme-toggle svg {
  display: block;
}

/* Each button shows the icon for the state a click produces. */
.theme-toggle [data-when] {
  display: none;
}

[data-theme="light"] .theme-toggle[data-toggle="theme"] [data-when="light"],
[data-theme="dark"] .theme-toggle[data-toggle="theme"] [data-when="dark"] {
  display: block;
}
```

- [ ] **Step 4: Delete the leftovers**

```bash
git rm _includes/dark-mode-toggle.html assets/imgs/lightbulb-on.png assets/imgs/lightbulb-off.png assets/imgs/README.md
```

- [ ] **Step 5: Build and inspect**

Run: `bundle exec jekyll build && grep -c 'data-toggle="theme"' _site/index.html && grep -rn "lightbulb\|dark-mode-toggle" _site/index.html`
Expected: `1`, then no output from the second grep.

- [ ] **Step 6: Run all tests**

Run: `node --test _tests/`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add -A _includes assets/css/theme.css assets/imgs
git commit -m "Render the theme button as inline SVG through a per-axis include

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Before/after screenshot check

**Files:**
- Create: `_tests/screenshot.cjs`

**Interfaces:**
- Produces: `node _tests/screenshot.cjs <url> <theme> <out.png>` writes a 1280x900 viewport screenshot with the nav cropped off (clip starts at y=70). Reused by the color and pixel tasks for their eight-combination checks.

- [ ] **Step 1: Write the tool**

```js
// Usage: node _tests/screenshot.cjs <url> <light|dark> <out.png> [full]
// Requires Playwright's Chromium; set PLAYWRIGHT_CHROMIUM to the executable if
// the default download is missing. The nav is cropped unless "full" is given.
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const [url, theme, out, full] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const clip = full ? undefined : { x: 0, y: 70, width: 1280, height: 830 };
  await page.screenshot({ path: path.resolve(out), clip });
  await browser.close();
})();
```

- [ ] **Step 2: Capture master**

```bash
git stash -u 2>/dev/null; git checkout master && bundle exec jekyll build -d /tmp/site-master && git checkout - && git stash pop 2>/dev/null
bundle exec jekyll build
(cd /tmp/site-master && python3 -m http.server 4130 >/dev/null 2>&1 &)
(cd _site && python3 -m http.server 4131 >/dev/null 2>&1 &)
sleep 1
export PLAYWRIGHT_MODULE=/home/brlauuu/.npm/_npx/9833c18b2d85bc59/node_modules/playwright
export PLAYWRIGHT_CHROMIUM=/home/brlauuu/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
S=/tmp/claude-shots; mkdir -p $S
for t in light dark; do for p in "" "2026-01-28/industrialized-gambling" "tags" "archive"; do
  n=$(echo "$p" | tr '/' '_'); n=${n:-home}
  node _tests/screenshot.cjs http://localhost:4130/$p $t $S/master-$n-$t.png
  node _tests/screenshot.cjs http://localhost:4131/$p $t $S/branch-$n-$t.png
done; done
pkill -f "http.server 413"
```

(The `git stash` lines are only needed if there is uncommitted work; the working tree should be clean at this point.)

- [ ] **Step 3: Compare**

```bash
node -e '
const fs=require("fs");const S="/tmp/claude-shots";let bad=0;
for (const f of fs.readdirSync(S).filter(f=>f.startsWith("master-"))) {
  const a=fs.readFileSync(`${S}/${f}`), b=fs.readFileSync(`${S}/${f.replace("master-","branch-")}`);
  const same=a.equals(b); console.log(same?"same":"DIFF", f); if(!same) bad++;
}
process.exit(bad?1:0)'
```

Expected: `same` for all 8 pairs. If a pair differs, open both PNGs with the Read tool, find the element that changed, and fix the token or rule in `theme.css` (the usual culprits: `pre code` color in light, `h1` on the tags page, share button shadow). Rebuild and rerun until all 8 are `same`. The nav is excluded from the comparison because the bulb is now SVG; check it by eye in a `full` screenshot in both themes: the bulb should be black on light and white on dark, at the same position as before.

- [ ] **Step 4: Check the flip works in a real browser**

```bash
(cd _site && python3 -m http.server 4131 >/dev/null 2>&1 &); sleep 1
node -e '
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM });
  const p = await b.newPage();
  await p.goto("http://localhost:4131/");
  const before = await p.evaluate(() => [...document.documentElement.attributes].map(a => a.name + "=" + a.value).join(" "));
  await p.evaluate(() => new Promise(r => { document.addEventListener("themechange", e => r(e.detail), { once: true }); document.querySelector("[data-toggle=theme]").click(); })).then(d => console.log("event", JSON.stringify(d)));
  const after = await p.evaluate(() => document.documentElement.dataset.theme + " " + localStorage.getItem("theme") + " " + document.querySelector("[data-toggle=theme]").getAttribute("aria-label"));
  console.log(before); console.log(after);
  await p.reload(); console.log("after reload", await p.evaluate(() => document.documentElement.dataset.theme));
  await b.close();
})();'
pkill -f "http.server 4131"
```

Expected: first line lists `data-theme=light data-color=off data-style=smooth` (plus `lang`), the event prints `{"theme":"dark","color":"off","style":"smooth"}`, then `dark dark Switch to light`, and `after reload dark`.

- [ ] **Step 5: Commit**

```bash
git add _tests/screenshot.cjs
git commit -m "Add a screenshot helper for theme comparisons

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Documentation

**Files:**
- Modify: `CLAUDE.md` (directory structure lines 28-33; the whole "### Dark Mode" section)
- Modify: `README.md` (add a "Theme axes" section before "Local preview and checks"; add `node --test _tests/theme.test.cjs` to the checks)
- Modify: `AGENTS.md` (Project Structure bullet for `assets/`)

- [ ] **Step 1: CLAUDE.md**

Update the directory tree lines to:

```
_includes/       # Custom HTML includes (head, navigation, theme-toggle, catalogue_item, project-card)
assets/
  imgs/          # Images for posts and pages
  css/           # Custom CSS (theme.css, projects.css)
  js/            # JavaScript files (theme.js, project-stats.js, share-button.js)
```

Replace the entire `### Dark Mode` section with:

```markdown
### Theme axes

The look of the site is controlled by three independent switches, each a
`data-` attribute on `<html>`, each with its own nav button:

| Axis  | Attribute    | Values           | Default                    | Storage key |
|-------|--------------|------------------|----------------------------|-------------|
| theme | `data-theme` | `light`, `dark`  | system preference or light | `theme`     |
| color | `data-color` | `off`, `on`      | `off`                      | `color`     |
| style | `data-style` | `smooth`, `pixel`| `smooth`                   | `style`     |

Color and style have no visual rules yet; see issues #9 and #10.

**Files:**
- `_includes/head.html` sets the three attributes before first paint (no flash).
- `assets/js/theme.js` wires `[data-toggle]` buttons, persists to localStorage, updates
  `aria-label`s and dispatches `themechange` on `document` with `{ theme, color, style }`.
  Its pure helpers are tested in `_tests/theme.test.cjs`.
- `_includes/theme-toggle.html` renders one button per axis with both icon states as
  inline SVG; the icon shows the state a click produces.
- `assets/css/theme.css` holds every color as a variable: `:root` is light,
  `[data-theme="dark"]` redefines the color variables. Component rules read variables
  and never name an axis. Later axes add their own variable blocks.

**Adding a dynamic effect:** listen for `themechange` and start or stop the effect
based on `event.detail`.

**Changing colors:** edit the variables in `assets/css/theme.css`. Do not add
`!important` or hard-coded colors to component rules.
```

Also change line 21 (`- **Dark Mode**: ...`) to `- **Theme axes**: light/dark, color on/off and smooth/pixel switches, persisted in localStorage`.

- [ ] **Step 2: README.md**

Insert before `## Local preview and checks`:

```markdown
## Theme axes

Three nav buttons set `data-theme` (`light`/`dark`), `data-color` (`off`/`on`) and
`data-style` (`smooth`/`pixel`) on `<html>`; choices persist in localStorage under
the same names. `assets/css/theme.css` defines the light and dark variables;
`assets/js/theme.js` handles the buttons and emits `themechange` on `document`.
The design is in `docs/superpowers/specs/2026-09-18-theme-axes-design.md`.
```

Add `node --test _tests/theme.test.cjs` after the existing `node --test` line in the checks block.

- [ ] **Step 3: AGENTS.md**

Change the `assets/` bullet to:

```
- `assets/` stores site assets: `assets/imgs/`, `assets/css/` (`theme.css`, `projects.css`), `assets/js/` (`theme.js`, `project-stats.js`, `share-button.js`).
```

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md README.md AGENTS.md
git commit -m "Document the three theme axes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Pull request

- [ ] **Step 1: Final checks**

Run: `node --test _tests/ && bundle exec jekyll build && git status --short`
Expected: all tests pass, build succeeds, clean tree.

- [ ] **Step 2: Push and open the PR**

```bash
GIT_ASKPASS= git -c credential.helper='!gh auth git-credential' push -u origin 4-theme-axes-foundation
gh pr create --title "Theme axes foundation: generic three-axis switching with no visible change (#4)" --body "$(cat <<'EOF'
## Summary
Part 1 of #4. Replaces the single dark-mode switch with three independent axes on `<html>` (`data-theme`, `data-color`, `data-style`), a generic toggle script with a `themechange` event, and a fully tokenized stylesheet. No visible change: light and dark render pixel-identical to master below the nav. The bulb is now inline SVG.

Design: `docs/superpowers/specs/2026-09-18-theme-axes-design.md`. Follow-ups: #9 (color), #10 (pixel).

## Changes
- `assets/js/theme.js` replaces `dark-mode.js`; pure helpers exported for tests.
- `_includes/head.html` sets all three attributes before paint.
- `_includes/theme-toggle.html` renders one SVG button per axis; nav uses it.
- `assets/css/theme.css` (renamed): every color is a variable, no `!important`, no duplicated system-preference block.
- PNG bulbs and the unused emoji toggle removed.
- `_tests/theme.test.cjs` (7 tests) and `_tests/screenshot.cjs` helper.
- Docs updated.

## Testing
- `node --test _tests/`: 21 passed.
- Screenshot diff against master: 8 pairs (home, post, tags, archive × light/dark) identical below the nav.
- Real-browser flip: attribute, storage, label and `themechange` verified; choice survives reload.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

The PR does not close #4; the pixel axis PR does.
