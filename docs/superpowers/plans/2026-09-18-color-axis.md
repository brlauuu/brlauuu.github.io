# Color Axis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the `color` axis its look: a rainbow button in the nav, rainbow accents with light and dark variants when `data-color="on"`, a slow hue cycle that respects reduced motion, and no change at all when color is off.

**Architecture:** Everything lands in a new "Color axis" layer at the end of `assets/css/theme.css`, keyed on `[data-color="on"]`; the one cross-axis block is `[data-color="on"][data-theme="dark"]` for brighter stops, glow and dimmed card borders. The rainbow is one `--rainbow` gradient variable. Rounded elements get a gradient border through a two-layer background; straight lines and section borders use `border-image`. Headings use the gradient as a text fill. The animation is a `hue-rotate` filter keyframe shared by every accent, paused through a variable under `prefers-reduced-motion`. The button is a new branch of `_includes/theme-toggle.html`; `assets/js/theme.js` already handles the axis.

**Tech Stack:** Jekyll 3.10 with the remote Tale theme, plain CSS, Node 20 `node --test`, headless Chromium via Playwright for screenshots.

**Spec:** `docs/superpowers/specs/2026-09-18-theme-axes-design.md` (sections "Nav buttons", "Color axis", "Cross-axis rules", "Testing").

## Global Constraints

- Color off must render byte-identical to current `master` (commit 4f4a22c) on every page in both themes; the screenshot diff in Task 4 enforces it. Every new rule is therefore scoped under `[data-color="on"]` (or under `[data-color="on"][data-theme="dark"]`, or is a `@keyframes` / reduced-motion variable that changes nothing while color is off).
- Body text, page background and code blocks stay neutral with color on.
- Gradient stops, in order: red, orange, yellow, green, cyan, blue, violet. Light: `#ff3b30, #ff9500, #ffd60a, #34c759, #32ade6, #007aff, #af52de`. Dark: `#ff6b6b, #ffa94d, #ffe066, #69db7c, #66d9e8, #74c0fc, #d0bfff`.
- Links with color on: light `#d81b9a` (hover `#ff2fb3`), dark `#3fd6ff` (hover `#8ae6ff`).
- Animation: one full hue turn over 20 s, linear, infinite, on every element that carries the rainbow; `prefers-reduced-motion: reduce` pauses it.
- Button `aria-label`s are set by `theme.js`: `Turn color on` / `Turn color off`. The rainbow icon shows six colored bands while color is off and a monochrome (`currentColor`) rainbow while on. Nav order: rainbow, bulb (the shape button comes with #10).
- No `!important`. No new `data-theme` selectors in the component layer.
- Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_013dSYwteU9vJGeTHhARhj8p`.
- Branch `9-color-axis` from `master`.

## File structure

| File | Responsibility |
|------|----------------|
| `_includes/theme-toggle.html` | Adds the `color` branch: two rainbow SVGs, `data-when="off"` (six colors) and `data-when="on"` (currentColor). |
| `_includes/navigation.html` | Renders the color button before the theme button. |
| `assets/css/theme.css` | Icon visibility rule for the color button (in the existing nav-buttons block); new "Color axis" layer at the end: tokens, accent rules, dark block, keyframes, reduced motion. |
| `_tests/screenshot.cjs` | Accepts `COLOR` and `STYLE` env vars to preset those axes. |
| `README.md`, `CLAUDE.md` | Describe the color axis and the second button. |

---

### Task 1: Rainbow button

**Files:**
- Modify: `_includes/theme-toggle.html`
- Modify: `_includes/navigation.html`
- Modify: `assets/css/theme.css` (icon visibility block near the end)

**Interfaces:**
- Consumes: `theme.js` wires any `[data-toggle="color"]` button, flips `data-color` between `off` and `on`, sets the label (already merged).
- Produces: `<button class="theme-toggle" data-toggle="color">` with `[data-when="off"]` and `[data-when="on"]` SVGs; the nav renders `{% include theme-toggle.html axis="color" %}` first, then `axis="theme"`.

- [ ] **Step 1: Add the color branch to the include**

In `_includes/theme-toggle.html`, directly before the closing `{% endif %}`, add:

```html
{% elsif include.axis == "color" %}
  <svg data-when="off" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" aria-hidden="true" focusable="false">
    <path d="M3 17a9 9 0 0 1 18 0" stroke="#ff3b30"/>
    <path d="M4.6 17a7.4 7.4 0 0 1 14.8 0" stroke="#ff9500"/>
    <path d="M6.2 17a5.8 5.8 0 0 1 11.6 0" stroke="#ffd60a"/>
    <path d="M7.8 17a4.2 4.2 0 0 1 8.4 0" stroke="#34c759"/>
    <path d="M9.4 17a2.6 2.6 0 0 1 5.2 0" stroke="#007aff"/>
    <path d="M11 17a1 1 0 0 1 2 0" stroke="#af52de"/>
  </svg>
  <svg data-when="on" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true" focusable="false">
    <path d="M3 17a9 9 0 0 1 18 0"/>
    <path d="M6.2 17a5.8 5.8 0 0 1 11.6 0"/>
    <path d="M9.4 17a2.6 2.6 0 0 1 5.2 0"/>
  </svg>
```

The `{% if include.axis == "theme" %}` ... `{% elsif ... %}` ... `{% endif %}` structure must stay a single `if` block.

- [ ] **Step 2: Render it in the nav**

In `_includes/navigation.html`, change the `nav-toggles` list item to:

```html
      <li class="nav-toggles">
        {% include theme-toggle.html axis="color" %}
        {% include theme-toggle.html axis="theme" %}
      </li>
```

- [ ] **Step 3: Icon visibility**

In `assets/css/theme.css`, extend the icon-visibility rule at the end of the nav-buttons block so it reads:

```css
:root:not([data-theme="dark"]) .theme-toggle[data-toggle="theme"] [data-when="light"],
[data-theme="dark"] .theme-toggle[data-toggle="theme"] [data-when="dark"],
:root:not([data-color="on"]) .theme-toggle[data-toggle="color"] [data-when="off"],
[data-color="on"] .theme-toggle[data-toggle="color"] [data-when="on"] {
  display: block;
}
```

- [ ] **Step 4: Build and check**

Run: `bundle exec jekyll build && grep -c 'data-toggle="color"' _site/index.html && grep -o 'data-toggle="[a-z]*"' _site/index.html`
Expected: `1`, then `data-toggle="color"` before `data-toggle="theme"`.

Run: `node --test _tests/`
Expected: 22 passed.

- [ ] **Step 5: Real-browser check**

```bash
(cd _site && python3 -m http.server 4131 >/dev/null 2>&1 &); sleep 1
export PLAYWRIGHT_MODULE=/home/brlauuu/.npm/_npx/9833c18b2d85bc59/node_modules/playwright
export PLAYWRIGHT_CHROMIUM=/home/brlauuu/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
node -e '
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM });
  const p = await b.newPage();
  await p.goto("http://localhost:4131/");
  const state = () => p.evaluate(() => {
    const btn = document.querySelector("[data-toggle=color]");
    const shown = [...btn.querySelectorAll("[data-when]")].filter(s => getComputedStyle(s).display !== "none").map(s => s.dataset.when);
    return [document.documentElement.dataset.color, btn.getAttribute("aria-label"), shown.join(","), localStorage.getItem("color")].join(" | ");
  });
  console.log(await state());
  await p.click("[data-toggle=color]");
  console.log(await state());
  await p.reload();
  console.log(await state());
  await b.close();
})();'
pkill -f "http.server 4131"
```

Expected, three lines:
```
off | Turn color on | off | null
on | Turn color off | on | on
on | Turn color off | on | on
```

- [ ] **Step 6: Commit**

```bash
git add _includes/theme-toggle.html _includes/navigation.html assets/css/theme.css
git commit -m "Add the rainbow button for the color axis

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013dSYwteU9vJGeTHhARhj8p"
```

---

### Task 2: Rainbow accents, light and dark

**Files:**
- Modify: `assets/css/theme.css` (append a new layer at the end of the file)

**Interfaces:**
- Consumes: existing tokens `--bg-color`, `--code-bg`, `--link-color`, `--link-hover-color`.
- Produces: `--rainbow`, `--rainbow-border` and the accent rules; Task 3 adds the animation to the same selectors, so keep the selector lists exactly as written here.

- [ ] **Step 1: Append the color layer**

Append to `assets/css/theme.css`:

```css
/* ------------------------------------------------------------------ */
/* Color axis: rainbow accents. Body text, page background and code   */
/* blocks stay neutral; everything that is already an accent carries  */
/* the rainbow. Nothing here applies while data-color is off.         */
/* ------------------------------------------------------------------ */

[data-color="on"] {
  --rainbow: linear-gradient(90deg, #ff3b30, #ff9500, #ffd60a, #34c759, #32ade6, #007aff, #af52de);
  --rainbow-border: var(--rainbow);
  --link-color: #d81b9a;
  --link-hover-color: #ff2fb3;
}

[data-color="on"][data-theme="dark"] {
  --rainbow: linear-gradient(90deg, #ff6b6b, #ffa94d, #ffe066, #69db7c, #66d9e8, #74c0fc, #d0bfff);
  --rainbow-border: linear-gradient(90deg, #ff6b6bbf, #ffa94dbf, #ffe066bf, #69db7cbf, #66d9e8bf, #74c0fcbf, #d0bfffbf);
  --link-color: #3fd6ff;
  --link-hover-color: #8ae6ff;
}

/* Headings and the site title: rainbow text fill. */
[data-color="on"] h1,
[data-color="on"] h2,
[data-color="on"] h3,
[data-color="on"] h4,
[data-color="on"] h5,
[data-color="on"] h6,
[data-color="on"] .nav-title,
[data-color="on"] .catalogue-title a {
  background-image: var(--rainbow);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* Post title underline on the home page and link underlines on hover. */
[data-color="on"] .catalogue-title a {
  text-decoration: none;
  border-bottom: 0.1em solid transparent;
  border-image: var(--rainbow) 1;
}

[data-color="on"] .post a:hover,
[data-color="on"] .post a:focus {
  text-decoration: none;
  border-bottom: 2px solid transparent;
  border-image: var(--rainbow) 1;
}

/* Straight lines and section borders. */
[data-color="on"] .catalogue-line,
[data-color="on"] .post-line,
[data-color="on"] .tags-header-line,
[data-color="on"] .catalogue-item,
[data-color="on"] .tag-section,
[data-color="on"] .pagination,
[data-color="on"] .pagination .top,
[data-color="on"] footer {
  border-image: var(--rainbow) 1;
}

/* Rounded elements: gradient border that keeps the radius. */
[data-color="on"] .tag-chip {
  border-color: transparent;
  background: linear-gradient(var(--code-bg), var(--code-bg)) padding-box, var(--rainbow-border) border-box;
}

[data-color="on"] .share-button,
[data-color="on"] .project-card {
  border-color: transparent;
  background: linear-gradient(var(--bg-color), var(--bg-color)) padding-box, var(--rainbow-border) border-box;
}
```

Notes for the implementer:
- `border-image` on `.catalogue-item` colors its existing `border-bottom`; on `.pagination` and `footer` their `border-top`. No new border widths are introduced, so nothing shifts.
- `.project-card` lives in `projects.css` (home page only); the rule here is harmless on other pages.
- `.catalogue-title a` gets both the text fill and the underline; the two properties do not conflict because the underline is a border, not a background.

- [ ] **Step 2: Build and screenshot color on**

```bash
bundle exec jekyll build
(cd _site && python3 -m http.server 4131 >/dev/null 2>&1 &); sleep 1
export PLAYWRIGHT_MODULE=/home/brlauuu/.npm/_npx/9833c18b2d85bc59/node_modules/playwright
export PLAYWRIGHT_CHROMIUM=/home/brlauuu/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
mkdir -p /tmp/claude-shots-color
for t in light dark; do for p in "index.html" "2026-01-28/industrialized-gambling.html" "tags.html" "2021-02-02/motevowrapper.html"; do
  n=$(echo "$p" | tr '/' '_' | sed 's/\.html$//')
  node -e '
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const [url, theme, out] = process.argv.slice(1);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.addInitScript((t) => { localStorage.setItem("theme", t); localStorage.setItem("color", "on"); }, theme);
  await p.goto(url, { waitUntil: "networkidle" });
  await p.screenshot({ path: out });
  await b.close();
})();' "http://localhost:4131/$p" $t /tmp/claude-shots-color/$n-$t.png
done; done
pkill -f "http.server 4131"
```

Open each of the 8 PNGs with the Read tool and confirm: headings and the site title show the gradient; body text is neutral grey (light) or light grey (dark); the home page title underline and the short line under it are rainbow; tag chips and project cards have a rainbow border with a plain interior; the post page's code block (the motevowrapper post has one) is neutral; links are magenta in light and cyan in dark. If any of these fail, fix the rule and repeat. Describe what each screenshot shows in your report.

- [ ] **Step 3: Tests**

Run: `node --test _tests/`
Expected: 22 passed.

- [ ] **Step 4: Commit**

```bash
git add assets/css/theme.css
git commit -m "Paint the accents with a rainbow when the color axis is on

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013dSYwteU9vJGeTHhARhj8p"
```

---

### Task 3: Hue cycle and reduced motion

**Files:**
- Modify: `assets/css/theme.css` (append to the color layer)

**Interfaces:**
- Consumes: the selector lists from Task 2.
- Produces: `@keyframes rainbow-cycle`, `--rainbow-play` variable (`running` / `paused`). #10 will change the timing function to `steps()` under `[data-style="pixel"]`.

- [ ] **Step 1: Append the animation**

Append to `assets/css/theme.css`:

```css
/* One shared hue cycle so every accent moves together. A filter rotates the
   rendered colors, so text is not repainted. Reduced motion pauses it. */
@keyframes rainbow-cycle {
  from { filter: hue-rotate(0deg); }
  to { filter: hue-rotate(360deg); }
}

[data-color="on"] {
  --rainbow-play: running;
}

@media (prefers-reduced-motion: reduce) {
  [data-color="on"] {
    --rainbow-play: paused;
  }
}

[data-color="on"] h1,
[data-color="on"] h2,
[data-color="on"] h3,
[data-color="on"] h4,
[data-color="on"] h5,
[data-color="on"] h6,
[data-color="on"] .nav-title,
[data-color="on"] .catalogue-title a,
[data-color="on"] .catalogue-line,
[data-color="on"] .post-line,
[data-color="on"] .tags-header-line,
[data-color="on"] .catalogue-item,
[data-color="on"] .tag-section,
[data-color="on"] .pagination,
[data-color="on"] .pagination .top,
[data-color="on"] footer,
[data-color="on"] .tag-chip,
[data-color="on"] .share-button,
[data-color="on"] .project-card {
  animation: rainbow-cycle 20s linear infinite;
  animation-play-state: var(--rainbow-play);
}

/* Dark: a faint glow so gradient text does not look muddy on near-black.
   drop-shadow follows the glyph alpha, so it never tints the fill itself. */
[data-color="on"][data-theme="dark"] h1,
[data-color="on"][data-theme="dark"] h2,
[data-color="on"][data-theme="dark"] h3,
[data-color="on"][data-theme="dark"] .nav-title,
[data-color="on"][data-theme="dark"] .catalogue-title a {
  animation-name: rainbow-cycle-glow;
}

@keyframes rainbow-cycle-glow {
  from { filter: hue-rotate(0deg) drop-shadow(0 0 6px rgba(255, 255, 255, 0.22)); }
  to { filter: hue-rotate(360deg) drop-shadow(0 0 6px rgba(255, 255, 255, 0.22)); }
}
```

Note: `.share-button` is `position: fixed`; a filter on it is fine because it is the fixed element itself, not an ancestor of one.

- [ ] **Step 2: Verify the animation state in a browser**

```bash
bundle exec jekyll build
(cd _site && python3 -m http.server 4131 >/dev/null 2>&1 &); sleep 1
export PLAYWRIGHT_MODULE=/home/brlauuu/.npm/_npx/9833c18b2d85bc59/node_modules/playwright
export PLAYWRIGHT_CHROMIUM=/home/brlauuu/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
node -e '
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM });
  for (const reduced of ["no-preference", "reduce"]) {
    const p = await b.newPage();
    await p.emulateMedia({ reducedMotion: reduced });
    await p.addInitScript(() => localStorage.setItem("color", "on"));
    await p.goto("http://localhost:4131/");
    console.log(reduced, await p.evaluate(() => {
      const h = document.querySelector(".catalogue-title");
      const cs = getComputedStyle(h);
      return [cs.animationName, cs.animationDuration, cs.animationPlayState, cs.backgroundImage.startsWith("linear-gradient")].join(" | ");
    }));
    await p.close();
  }
  const p = await b.newPage();
  await p.goto("http://localhost:4131/");
  console.log("off", await p.evaluate(() => getComputedStyle(document.querySelector(".catalogue-title")).animationName));
  await b.close();
})();'
pkill -f "http.server 4131"
```

Expected:
```
no-preference rainbow-cycle | 20s | running | true
reduce rainbow-cycle | 20s | paused | true
off none
```

- [ ] **Step 3: Tests and commit**

Run: `node --test _tests/` (22 passed), then:

```bash
git add assets/css/theme.css
git commit -m "Cycle the rainbow hue slowly and pause it under reduced motion

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013dSYwteU9vJGeTHhARhj8p"
```

---

### Task 4: Regression check, screenshot helper, docs

**Files:**
- Modify: `_tests/screenshot.cjs`
- Modify: `README.md` ("Theme axes" section and checks block)
- Modify: `CLAUDE.md` ("### Theme axes" section)

- [ ] **Step 1: Let the helper preset the other axes**

In `_tests/screenshot.cjs`, replace the `addInitScript` line with:

```js
  await page.addInitScript(({ theme, color, style }) => {
    localStorage.setItem('theme', theme);
    if (color) localStorage.setItem('color', color);
    if (style) localStorage.setItem('style', style);
  }, { theme, color: process.env.COLOR, style: process.env.STYLE });
```

and update the usage comment's first line to: `// Usage: [COLOR=on] [STYLE=pixel] node _tests/screenshot.cjs <url> <light|dark> <out.png> [full]`.

- [ ] **Step 2: Color off must equal master**

```bash
git worktree add /tmp/site-master-src master
bundle exec jekyll build -s /tmp/site-master-src -d /tmp/site-master
bundle exec jekyll build
(cd /tmp/site-master && python3 -m http.server 4130 >/dev/null 2>&1 &)
(cd _site && python3 -m http.server 4131 >/dev/null 2>&1 &)
sleep 1
export PLAYWRIGHT_MODULE=/home/brlauuu/.npm/_npx/9833c18b2d85bc59/node_modules/playwright
export PLAYWRIGHT_CHROMIUM=/home/brlauuu/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
S=/tmp/claude-shots-off; rm -rf $S; mkdir -p $S
for t in light dark; do for p in "index.html" "2026-01-28/industrialized-gambling.html" "tags.html" "archive.html" "2021-02-02/motevowrapper.html"; do
  n=$(echo "$p" | tr '/' '_' | sed 's/\.html$//')
  node _tests/screenshot.cjs http://localhost:4130/$p $t $S/master-$n-$t.png
  node _tests/screenshot.cjs http://localhost:4131/$p $t $S/branch-$n-$t.png
done; done
pkill -f "http.server 413"
git worktree remove /tmp/site-master-src
node -e '
const fs=require("fs");const S="/tmp/claude-shots-off";let bad=0;
for (const f of fs.readdirSync(S).filter(f=>f.startsWith("master-"))) {
  const same=fs.readFileSync(`${S}/${f}`).equals(fs.readFileSync(`${S}/${f.replace("master-","branch-")}`));
  console.log(same?"same":"DIFF", f); if(!same) bad++;
}
process.exit(bad?1:0)'
```

Expected: `same` for all pairs except possibly the two `index` pairs, which may differ in the project sidebar's live GitHub data only. If any other pair differs, open both PNGs, find the element, and fix the rule (it means a rule leaked outside `[data-color="on"]`).

- [ ] **Step 3: Docs**

`README.md`, "Theme axes" section: replace "today only the theme button is in the nav, the color and style buttons land with issues #9 and #10;" with "the nav has the rainbow (color) and bulb (theme) buttons; the style button lands with issue #10;". Add after that paragraph:

```markdown
With color on, headings, the site title, lines, borders, tag chips, project cards and the
share button carry a rainbow gradient (`--rainbow` in `theme.css`, brighter stops in dark)
and links turn magenta (light) or cyan (dark). Body text and code blocks stay neutral. The
hue cycles once every 20 seconds; `prefers-reduced-motion` pauses it.
```

`CLAUDE.md`, "### Theme axes": replace "Today only the theme switch has its nav button; the color and style buttons arrive with their axes (issues #9 and #10):" with "The color and theme switches have nav buttons; the style button arrives with issue #10:". Replace "Color and style have no visual rules yet; see issues #9 and #10." with:

```markdown
**Color axis** (`[data-color="on"]`, last layer of `theme.css`): defines `--rainbow` and
`--rainbow-border`, swaps the link tokens, paints headings and the site title with the
gradient as a text fill, lines and section borders with `border-image`, and rounded
elements (tag chips, project cards, share button) with a two-layer gradient border. One
`rainbow-cycle` keyframe (20 s hue rotation) is shared by every accent and paused by
`--rainbow-play` under `prefers-reduced-motion`. `[data-color="on"][data-theme="dark"]`
is the only cross-axis block: brighter stops, dimmed card borders, a glow on headings.
Style has no visual rules yet; see issue #10.
```

- [ ] **Step 4: Final checks and commit**

Run: `node --test _tests/ && node --check assets/js/theme.js && bundle exec jekyll build && git status --short`
Expected: 22 passed, build ok, only the three edited files pending.

```bash
git add _tests/screenshot.cjs README.md CLAUDE.md
git commit -m "Document the color axis and let the screenshot helper preset it

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013dSYwteU9vJGeTHhARhj8p"
```

---

### Task 5: Pull request

Push `9-color-axis` and open a PR titled "Color axis: rainbow accents with light and dark variants (#9)" whose body summarises the four commits, lists the 8 color-on screenshots checked, the color-off byte-diff result, the animation state check, and ends with `Closes #9` and the attribution footer. It does not close #4.
