# Color axis v2 (acid trip and dread) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn color-on into two moods (light: melting acid trip; dark: abstract dread) with no panels, where flipping theme or color never moves text.

**Architecture:** Paint-only changes. CSS drops the panel boxes and swaps the color tokens per mood; the existing WebGL backdrop gets a new fragment shader plus a `u_lane` uniform for a calmer reading column; an inline SVG filter melts headings in smooth style, driven through a `--melt` variable that the existing hue-cycle keyframes compose with. A browser check pins text positions across theme × color.

**Tech Stack:** Jekyll 3.10 (github-pages), plain CSS, vanilla JS, WebGL 1 GLSL, SVG filters/SMIL, Node `node:test`, Playwright (headless Chromium + SwiftShader).

**Spec:** `docs/superpowers/specs/2026-09-18-theme-axes-design.md`, section "Color axis v2: acid trip and dread" (read it before Task 1).

## Global Constraints

- Within one style, theme or color flips never move text: no color-axis or theme rule may set padding, margin, border width/style, font, weight, size, letter spacing, line height, `display` or `position` on anything that holds or wraps text (pseudo-element overlays excepted). Tolerance 0.5 px.
- Color off is unchanged, byte for byte (screenshots identical to master).
- No `!important`, no hard-coded colors in component rules; colors live in tokens (CLAUDE.md rule). Hard-coded colors inside the GLSL shader and SVG filter are fine.
- Reduced motion: one still frame, no drips falling, no flicker, no pointer effect, melt frozen.
- Pixel style: no melt filter; backdrop quantised to the 4 px grid as today.
- One canvas, one draw per frame; smooth at quarter resolution.
- Body text with halo ≥ 3:1 against the lane; headings exempt.
- Do not `npm install` in the repo. Playwright and Chromium are external:
  `export PLAYWRIGHT_MODULE=/home/brlauuu/.npm/_npx/9833c18b2d85bc59/node_modules/playwright`
  `export PLAYWRIGHT_CHROMIUM=/home/brlauuu/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`
- Local server for browser tools: `bundle exec jekyll serve --port 4132 --no-watch` (run in the background; it serves extensionless URLs like `/tags`). Rebuild by restarting it after CSS/JS edits.
- The shell is zsh: a `$VAR` holding several words is not split; pass page lists literally.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Branch: `color-axis-v2` (already created; the spec commit is on it).

## Review Focus

1. Gradient headings are `color: transparent`; an inherited `text-shadow` halo would paint a visible shadow *through* them. Expected: headings show no halo. Pinned in Task 5 (computed `text-shadow` is `none` on `h1`).
2. `--melt` must not leak into strips, rings and lines that share the hue-cycle keyframes. Expected: only `h1`–`h3`, `.nav-title`, `.catalogue-title a` carry the SVG filter. Pinned in Task 6 (computed `filter` of `.post-line` contains no `url(`).
3. Pages without `main` content width (narrow phones) or a missing `main`: the lane must not go NaN or zero-width. Expected: full-width lane. Pinned in Task 3 (`laneFor` tests).
4. Theme flip while color is on and the tab is hidden, or reduced motion toggled mid-session: melt animations must pause/resume accordingly, never run under reduced motion. Pinned in Task 6 (`meltState` table test).
5. The home page's GitHub sidebar text changes between loads when the API answers differently. Expected: the invariance check is deterministic. Pinned in Task 1 (requests to `api.github.com` are aborted in the tool).

---

## File Structure

| File | Responsibility |
|---|---|
| `_tests/tools/layout-invariance.cjs` (new) | Browser check: text/image/pre/share-button rects identical across theme × color per style and width |
| `assets/css/theme.css` (modify) | Panel removal, mood tokens, halo, cycle tokens, melt hookup |
| `assets/js/backdrop.js` (modify) | New fragment shader (two moods), `u_lane`, exported `laneFor` |
| `_tests/backdrop.test.cjs` (modify) | `laneFor` tests |
| `_includes/melt-filter.html` (new) | Hidden SVG with `#melt-light` and `#melt-dark` |
| `assets/js/melt.js` (new) | Pause/resume SMIL animations; exported `meltState` |
| `_tests/melt.test.cjs` (new) | `meltState` tests |
| `_layouts/default.html` (modify) | Render the filter include, load `melt.js` |
| `_tests/tools/contrast-sample.cjs` (new) | Samples body-text contrast against the lane |
| `CLAUDE.md` (modify) | Color axis and backdrop paragraphs |

---

### Task 1: Layout-invariance check (fails on master)

**Files:**
- Create: `_tests/tools/layout-invariance.cjs`

**Interfaces:**
- Produces: CLI `node _tests/tools/layout-invariance.cjs <base url>`; prints `PASS`/`FAIL` per page × width × style × combo and exits 1 on any FAIL. Later tasks run it as their regression gate.

- [ ] **Step 1: Write the tool**

```js
// Usage: node _tests/tools/layout-invariance.cjs <base url>
// Within one style, flipping theme or color must never move text. For every page,
// at 1280 and 390 px, in smooth and in pixel, records the client rects of every text
// node plus images, code blocks and the share button under light + color off, then
// under the other three theme x color combinations, and fails on any difference over
// 0.5 px. Smooth vs pixel is never compared (the font changes on purpose).
// The constellation is skipped (it animates) and GitHub API calls are aborted so the
// home sidebar renders the same fallback on every load.
// Prints PASS/FAIL per combination and exits non-zero on any FAIL.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = (process.argv[2] ?? 'http://localhost:4132').replace(/\/$/, '');

const PAGES = [
  '/', '/archive', '/tags', '/about',
  '/2026-01-28/industrialized-gambling', '/2026-10-03/the-bottleneck-moved',
  '/2020-12-09/Peculiar-case-of-BLAT-output', '/2021-02-02/motevowrapper',
];
const WIDTHS = [1280, 390];
const STYLES = ['smooth', 'pixel'];
const COMBOS = [['dark', 'off'], ['light', 'on'], ['dark', 'on']];
const TOLERANCE = 0.5;

function collect() {
  const out = [];
  const skip = 'script, style, .backdrop, .constellation, .melt-filters, dialog:not([open])';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.textContent.trim() && !n.parentElement.closest(skip)
      ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const range = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      out.push({ key: JSON.stringify(n.textContent.trim().slice(0, 30)), x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height });
    }
  }
  for (const el of document.querySelectorAll('img, pre, .share-button')) {
    const r = el.getBoundingClientRect();
    out.push({ key: el.tagName.toLowerCase() + (el.className ? '.' + el.className : ''), x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height });
  }
  return out;
}

async function measure(browser, url, width, theme, color, style) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  await ctx.route('https://api.github.com/**', (route) => route.abort());
  const page = await ctx.newPage();
  await page.addInitScript((axes) => {
    for (const [k, v] of Object.entries(axes)) localStorage.setItem(k, v);
  }, { theme, color, style });
  await page.goto(base + url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const rects = await page.evaluate(collect);
  await ctx.close();
  return rects;
}

function diff(a, b) {
  const problems = [];
  if (a.length !== b.length) problems.push(`rect count ${a.length} -> ${b.length}`);
  for (let i = 0; i < Math.min(a.length, b.length) && problems.length < 3; i++) {
    const p = a[i], q = b[i];
    const d = Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y), Math.abs(p.w - q.w), Math.abs(p.h - q.h));
    if (p.key !== q.key || d > TOLERANCE) problems.push(`${p.key} moved ${d.toFixed(1)}px (${p.x.toFixed(1)},${p.y.toFixed(1)} -> ${q.x.toFixed(1)},${q.y.toFixed(1)})`);
  }
  return problems;
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  let failed = 0;
  for (const url of PAGES) for (const width of WIDTHS) for (const style of STYLES) {
    const baseline = await measure(browser, url, width, 'light', 'off', style);
    for (const [theme, color] of COMBOS) {
      const problems = diff(baseline, await measure(browser, url, width, theme, color, style));
      if (problems.length) failed++;
      console.log(`${problems.length ? 'FAIL' : 'PASS'}  ${url} ${width}px ${style} ${theme}/${color}${problems.length ? ' :: ' + problems.join(' | ') : ''}`);
    }
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
```

- [ ] **Step 2: Run it against master's CSS to see it fail**

```bash
cd /home/brlauuu/repos/brlauuu.github.io
bundle exec jekyll serve --port 4132 --no-watch > /tmp/claude-jekyll.log 2>&1 &
sleep 15
node _tests/tools/layout-invariance.cjs http://localhost:4132 | tee /tmp/claude-invariance-master.txt | grep -c FAIL
```

Expected: `dark/off` lines PASS; `light/on` and `dark/on` lines FAIL with moves of about 21 px (1.5 rem panel padding) on most pages, exit code 1. If any `dark/off` line fails, stop and report: the theme axis already moves text and the plan's assumption is wrong.

- [ ] **Step 3: Commit**

```bash
git add _tests/tools/layout-invariance.cjs
git commit -m "Add layout invariance check for theme and color flips

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Remove the panels (invariance passes)

**Files:**
- Modify: `assets/css/theme.css` (`--panel-bg` tokens near lines 51 and 101; the print block's panel overrides near 1030; the "Backdrop: the page background moves to <html>" block near 1043–1081; `.pagination .top` near 872; pixel panel block near 1351–1366)
- Modify: `CLAUDE.md` (Backdrop paragraph)

**Interfaces:**
- Consumes: Task 1's tool.
- Produces: no panel rules; `--panel-bg` gone.

- [ ] **Step 1: Delete the two `--panel-bg` token lines**

Remove `  --panel-bg: rgba(255, 255, 255, 0.92);` and `  --panel-bg: rgba(26, 26, 26, 0.92);`.

- [ ] **Step 2: Replace the screen panel block**

Replace this whole block:

```css
/* Backdrop: the page background moves to <html> so the canvas shows through
   <body>, and the content column sits on a frosted panel. */
[data-color="on"] {
  background-color: var(--bg-color);
}

[data-color="on"] body {
  background-color: transparent;
}

[data-color="on"] .nav-container,
[data-color="on"] main,
[data-color="on"] footer {
  background-color: var(--panel-bg);
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  border-radius: 8px;
}

/* Blur only on the two thin strips: a blur behind the whole content column is the
   most expensive part of the frame and, at 92 % opacity, the least visible. */
[data-color="on"] .nav-container,
[data-color="on"] footer {
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}

[data-color="on"] main {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

/* The sidebar sits outside main, so it needs its own panel. */
[data-color="on"] .project-sidebar {
  background-color: var(--panel-bg);
  border-radius: 8px;
  padding: 0.6rem;
  padding-top: 1.4rem;
}
```

with:

```css
/* Backdrop: the page background moves to <html> so the canvas shows through
   <body>. No panels: text sits on the backdrop, which calms itself behind the
   reading column (u_lane), and color never changes layout. */
[data-color="on"] {
  background-color: var(--bg-color);
}

[data-color="on"] body {
  background-color: transparent;
}
```

- [ ] **Step 3: Remove the pixel panel block**

Delete:

```css
/* Backdrop under pixel: opaque bordered panels, crisp blocks, no blur. */
[data-color="on"][data-style="pixel"] .nav-container,
[data-color="on"][data-style="pixel"] main,
[data-color="on"][data-style="pixel"] footer {
  background-color: var(--bg-color);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  border: 2px solid var(--border-color);
  border-radius: 0;
}

[data-color="on"][data-style="pixel"] .project-sidebar {
  background-color: var(--bg-color);
  border: 2px solid var(--border-color);
  border-radius: 0;
}
```

Keep the `[data-style="pixel"] .backdrop { image-rendering: pixelated; }` rule that follows it.

- [ ] **Step 4: Remove the panel overrides from the print block**

Inside `@media print { ... }` delete:

```css
  [data-color="on"] .nav-container,
  [data-color="on"] main,
  [data-color="on"] footer,
  [data-color="on"] .project-sidebar {
    background: none;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
    border: 0;
    padding-left: 0;
    padding-right: 0;
  }
```

- [ ] **Step 5: Stop `.pagination .top` from changing display**

Replace:

```css
[data-color="on"] .pagination .top {
  position: relative;
  display: inline-block;
}
```

with (relative positioning on an inline box does not move it; the `::after` strip uses it as its containing block):

```css
[data-color="on"] .pagination .top {
  position: relative;
}
```

and update the comment above it from `.pagination .top is an inline link that needs a box to hang a strip on.` to `.pagination .top stays inline; position: relative alone anchors its strip without moving it.`

- [ ] **Step 6: Confirm nothing else references the panel**

Run: `grep -n 'panel-bg\|backdrop-filter' assets/css/theme.css`
Expected: no output.

- [ ] **Step 7: Run the invariance check**

```bash
pkill -f '[j]ekyll serve --port 4132'; bundle exec jekyll serve --port 4132 --no-watch > /tmp/claude-jekyll.log 2>&1 & sleep 15
node _tests/tools/layout-invariance.cjs http://localhost:4132; echo exit=$?
```

Expected: every line PASS, `exit=0`. If heading lines fail (keys that are heading text), remove the `width: fit-content; max-width: 100%` heading block and the `[data-color="on"] .post-title { margin-left: auto; margin-right: auto; }` block, rerun, and note it in the commit message. Any other FAIL: find the rule with `grep -n 'data-color="on"' assets/css/theme.css` that sets a box property on that element and make it an overlay; do not raise the tolerance.

- [ ] **Step 8: Update CLAUDE.md**

In the **Backdrop** paragraph replace:

```
`<body>` is transparent under color on so the canvas shows through; `.nav-container`, `main`,
`footer` and `.project-sidebar` sit on `--panel-bg` at 92 % opacity, and only the nav and the
footer add a `backdrop-filter: blur(4px)` (opaque and bordered under pixel). Pure helpers
```

with:

```
`<body>` is transparent under color on so the canvas shows through. There are no panels:
color never changes layout, and `node _tests/tools/layout-invariance.cjs <base url>` fails if
a theme or color flip moves any text within a style. Pure helpers
```

- [ ] **Step 9: Run Node tests and commit**

```bash
node --test _tests/*.test.cjs 2>&1 | grep -E '^# (pass|fail)'
git add assets/css/theme.css CLAUDE.md
git commit -m "Drop the color-on panels so color never moves text

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: `# fail 0`.

---

### Task 3: Lane uniform and the light mood shader

**Files:**
- Modify: `assets/js/backdrop.js`
- Test: `_tests/backdrop.test.cjs`

**Interfaces:**
- Produces: `laneFor(rect, viewWidth, scale) -> [left, right, soft]` (numbers, canvas pixels; `soft` = 60 CSS px × scale), exported alongside `uniformsFor`, `decide`, `ease`, `INTENSITY`. Uniform `u_lane` is a `vec3` (left, right, soft) — the spec's vec2 plus the soft edge width so the shader needs no extra scale uniform. Shader functions `acid(...)` (this task) and `dread(...)` (Task 4) share helpers `hash`, `noise`, `fbm`, `laneMask`, `hsl2rgb`.

- [ ] **Step 1: Write the failing tests**

Append to `_tests/backdrop.test.cjs`:

```js
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
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test _tests/backdrop.test.cjs`
Expected: 3 failures, `laneFor is not a function`.

- [ ] **Step 3: Implement `laneFor` and export it**

Under the `REMOVE_MS` constant add:

```js
  const LANE_SOFT_CSS_PX = 60; // soft edge of the calm reading lane
```

After `ease` add:

```js
  // The reading column in canvas pixels: [left, right, soft edge]. Without a usable
  // rect (no main, zero width) the whole width is the lane, so text is never on the
  // wild part of the field by accident.
  function laneFor(rect, viewWidth, scale) {
    const soft = LANE_SOFT_CSS_PX * scale;
    if (!rect || !(rect.width > 0)) return [0, viewWidth * scale, soft];
    const left = Math.max(0, Math.min(viewWidth, rect.left));
    const right = Math.max(left, Math.min(viewWidth, rect.right));
    return [left * scale, right * scale, soft];
  }
```

Change the export line to:

```js
    module.exports = { uniformsFor, decide, ease, laneFor, INTENSITY };
```

- [ ] **Step 4: Run the tests**

Run: `node --test _tests/backdrop.test.cjs`
Expected: all pass.

- [ ] **Step 5: Wire `u_lane` into the renderer**

In `init`, next to `let needResize = true;` add `let lane = [0, 1, 0];`.

In `setup()`, add `'u_lane'` to the uniform name list:

```js
      for (const name of ['u_time', 'u_resolution', 'u_pointer', 'u_pointerStrength', 'u_light', 'u_grid', 'u_intensity', 'u_lane']) {
```

In `resize()`, after `gl.viewport(...)`:

```js
      const main = doc.querySelector('main');
      lane = laneFor(main ? main.getBoundingClientRect() : null, w, canvas.width / w);
```

In `draw()`, after the `u_intensity` line:

```js
      gl.uniform3f(loc.u_lane, lane[0], lane[1], lane[2]);
```

- [ ] **Step 6: Replace the fragment shader**

Replace the whole `const FRAGMENT = \`...\`;` with:

```js
  const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_pointerStrength;
uniform float u_light;
uniform float u_grid;
uniform float u_intensity;
uniform vec3 u_lane;          // reading column: left, right, soft edge (canvas px)

vec3 hsl2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

// 1 inside the reading column, 0 outside, with a soft edge.
float laneMask(float x) {
  float e = max(u_lane.z, 1.0);
  return smoothstep(u_lane.x - e, u_lane.x + e, x) * (1.0 - smoothstep(u_lane.y - e, u_lane.y + e, x));
}

// Light: candy marbling (domain-warped noise) stirred by the pointer, with drips.
vec3 acid(vec2 p, vec2 uv, float aspect, float t, float calm, vec2 m, float ms) {
  vec2 sw = p - m;
  float stir = ms * exp(-dot(sw, sw) * 20.0);
  float ang = stir * 2.5;
  p = m + mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * sw;
  float amp = mix(1.0, 0.5, calm) * u_intensity;
  vec2 q = vec2(fbm(p * 2.0 + vec2(0.0, t * 0.03)), fbm(p * 2.0 + vec2(5.2, 1.3) - t * 0.025));
  vec2 r = vec2(fbm(p * 2.0 + 4.0 * amp * q + vec2(1.7, 9.2) + t * 0.02),
                fbm(p * 2.0 + 4.0 * amp * q + vec2(8.3, 2.8)));
  float f = fbm(p * 2.0 + 4.0 * amp * r);
  float hue = fract(f * 1.6 + q.x * 0.4 + t * 0.01);
  if (u_grid > 0.0) hue = floor(hue * 12.0) / 12.0;
  vec3 col = hsl2rgb(vec3(hue, 0.95, 0.6 + 0.08 * sin(f * 6.0)));

  // Drips: twelve columns, each a capsule from the top edge with a bulging tip,
  // thinning as it stretches; fades into a pool at the bottom and starts again.
  float edge = u_grid > 0.0 ? 0.0 : 0.004;
  float yt = 1.0 - uv.y;                       // distance from the top, 0..1
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float x0 = (fi + 0.5) / 12.0 + (hash(vec2(fi, 1.0)) - 0.5) * 0.05;
    float speed = 0.015 + 0.02 * hash(vec2(fi, 2.0));
    float phase = fract(t * speed + hash(vec2(fi, 3.0)));
    float len = phase * 1.15;
    float w = (0.010 + 0.010 * hash(vec2(fi, 4.0))) * mix(1.0, 0.6, phase);
    float dx = (uv.x - x0) * aspect;
    float body = length(vec2(dx, yt - clamp(yt, 0.0, len))) - w;
    float tip = length(vec2(dx, yt - len)) - w * 1.4;
    float d = min(body, tip);
    float fade = 1.0 - smoothstep(0.85, 1.0, phase);
    float cover = (edge > 0.0 ? smoothstep(edge, -edge, d) : step(d, 0.0)) * fade;
    float pool = smoothstep(1.0, 0.0, length(vec2(dx / (w * 5.0), (1.0 - yt) / 0.02)))
               * smoothstep(0.8, 1.0, phase);
    float dripHue = fract(hash(vec2(fi, 5.0)) + t * 0.02);
    if (u_grid > 0.0) dripHue = floor(dripHue * 12.0) / 12.0;
    vec3 paint = hsl2rgb(vec3(dripHue, 1.0, 0.55));
    float rim = smoothstep(-0.006, 0.0, d) * cover;
    float gloss = smoothstep(-w * 0.7, -w * 0.4, dx) * smoothstep(-w * 0.1, -w * 0.35, dx) * cover;
    col = mix(col, paint * (1.0 - 0.35 * rim), max(cover, pool));
    col = mix(col, vec3(1.0), gloss * 0.55);
  }
  return col;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  if (u_grid > 0.0) frag = (floor(frag / u_grid) + 0.5) * u_grid;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uv = frag / u_resolution;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 m = vec2(u_pointer.x / u_resolution.x * aspect, u_pointer.y / u_resolution.y);
  float calm = laneMask(frag.x);
  vec3 col = acid(p, uv, aspect, u_time, calm, m, u_pointerStrength);
  // Quiet lane: desaturate and pull toward the page background.
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(luma), 0.45 * calm);
  col = mix(col, vec3(1.0), 0.35 * calm);
  gl_FragColor = vec4(col, 1.0);
}`;
```

(The dark mood is added in Task 4; until then dark color-on also shows the acid field.)

- [ ] **Step 7: Check that the shader compiles and draws in a browser**

```bash
pkill -f '[j]ekyll serve --port 4132'; bundle exec jekyll serve --port 4132 --no-watch > /tmp/claude-jekyll.log 2>&1 & sleep 15
node _tests/tools/backdrop-check.cjs http://localhost:4132; echo exit=$?
```

Expected: all PASS, `exit=0` (it checks the canvas draws only with color on). A shader compile failure shows up as "no canvas" failures; fix GLSL errors by loading the page in the tool with `page.on('console')` if needed.

- [ ] **Step 8: Look at it**

```bash
COLOR=on node _tests/screenshot.cjs http://localhost:4132/2026-01-28/industrialized-gambling light /tmp/claude-shots-acid.png full
```

Open `/tmp/claude-shots-acid.png` with the Read tool. Expected: candy marbling, visible drips from the top edge with a pale highlight, the column behind the text noticeably paler. If drips are invisible, raise `w` base from 0.010 to 0.016; if the lane looks like a box, widen `LANE_SOFT_CSS_PX` to 90.

- [ ] **Step 9: Run all tests and commit**

```bash
node --test _tests/*.test.cjs 2>&1 | grep -E '^# (pass|fail)'
git add assets/js/backdrop.js _tests/backdrop.test.cjs
git commit -m "Backdrop: acid marbling with drips and a calm reading lane

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Dark mood shader (dread)

**Files:**
- Modify: `assets/js/backdrop.js` (fragment shader only)

**Interfaces:**
- Consumes: Task 3's helpers and `main()`.
- Produces: `vec3 dread(vec2 p, vec2 uv, float t, float calm, vec2 m, float ms)`; `main()` picks the mood by `u_light`.

- [ ] **Step 1: Add `dread` after `acid`**

```glsl
// Dark: near-black ink plumes, drifting fog, a breathing vignette, an irregular
// candle flicker, and a candle glow that follows the pointer.
vec3 dread(vec2 p, vec2 uv, float t, float calm, vec2 m, float ms) {
  float amp = mix(1.0, 0.5, calm) * u_intensity;
  vec2 q = vec2(fbm(p * 1.5 + vec2(0.0, -t * 0.02)), fbm(p * 1.5 + vec2(3.1, 7.7) + t * 0.015));
  float ink = fbm(p * 1.8 + 3.0 * amp * q + vec2(t * 0.01, 0.0));
  vec3 bruise = vec3(0.20, 0.06, 0.24);
  vec3 oxblood = vec3(0.30, 0.03, 0.05);
  vec3 moss = vec3(0.10, 0.16, 0.06);
  vec3 col = mix(bruise, oxblood, smoothstep(0.35, 0.65, ink));
  col = mix(col, moss, smoothstep(0.55, 0.8, q.y) * 0.7);
  col *= 0.35 + 0.65 * smoothstep(0.25, 0.75, ink);
  float fog = fbm(vec2(p.x * 0.8 + t * 0.03, p.y * 2.5));
  col += vec3(0.05, 0.05, 0.07) * smoothstep(0.45, 0.8, fog);
  vec2 c = uv - 0.5;
  col *= smoothstep(0.85 + 0.05 * sin(t * 0.25), 0.3, length(c * vec2(1.1, 1.0)));
  float flicker = 1.0 - 0.12 * smoothstep(0.6, 1.0, noise(vec2(t * 0.7, 3.0)));
  float dm = length(p - m);
  float glow = ms * exp(-dm * dm * 12.0) * (0.85 + 0.15 * noise(vec2(t * 6.0, 1.0)));
  col = col * flicker + glow * (vec3(0.55, 0.32, 0.12) + col * 2.0);
  if (u_grid > 0.0) col = floor(col * 12.0 + 0.5) / 12.0;
  return col;
}
```

- [ ] **Step 2: Replace the body of `main()` after `float calm = laneMask(frag.x);`**

```glsl
  vec3 col;
  if (u_light > 0.999) col = acid(p, uv, aspect, u_time, calm, m, u_pointerStrength);
  else if (u_light < 0.001) col = dread(p, uv, u_time, calm, m, u_pointerStrength);
  else col = mix(dread(p, uv, u_time, calm, m, u_pointerStrength),
                 acid(p, uv, aspect, u_time, calm, m, u_pointerStrength), u_light);
  // Quiet lane: desaturate and pull toward the page background of the mood.
  vec3 bg = mix(vec3(0.102), vec3(1.0), u_light);     // #1a1a1a and #fff
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(luma), 0.45 * calm);
  col = mix(col, bg, 0.35 * calm);
  gl_FragColor = vec4(col, 1.0);
}`;
```

(This replaces the Task 3 lines from `vec3 col = acid(...)` to the closing `}\`;`.)

- [ ] **Step 3: Browser check and look**

```bash
pkill -f '[j]ekyll serve --port 4132'; bundle exec jekyll serve --port 4132 --no-watch > /tmp/claude-jekyll.log 2>&1 & sleep 15
node _tests/tools/backdrop-check.cjs http://localhost:4132; echo exit=$?
COLOR=on node _tests/screenshot.cjs http://localhost:4132/2026-01-28/industrialized-gambling dark /tmp/claude-shots-dread.png full
```

Expected: `exit=0`. Open the PNG with Read: near-black with purple/oxblood/moss plumes, edges fading to black, no figures. If it is entirely black, lower the vignette inner radius from 0.3 to 0.15 and raise `0.35 +` to `0.5 +`.

- [ ] **Step 4: Commit**

```bash
git add assets/js/backdrop.js
git commit -m "Backdrop: dread mood for dark color-on

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Mood palettes, cycle tokens and the halo

**Files:**
- Modify: `assets/css/theme.css` (color-axis token blocks near 729–755; keyframes and animation list near 951–1011)
- Modify: `CLAUDE.md` (Color axis paragraph)

**Interfaces:**
- Produces: tokens `--halo`, `--cycle-name`, `--cycle-glow-name`, `--cycle-duration`, `--melt` (identity default `hue-rotate(0deg)`); keyframes `rainbow-cycle`, `rainbow-cycle-glow`, `dread-pulse`, `dread-pulse-glow`, all composing `var(--melt)` first. Task 6 sets `--melt` on headings.

- [ ] **Step 1: Replace the two color token blocks**

Replace from `/* Light stops are darkened until each sits at or near 3:1 on white, so` through the end of the `[data-color="on"][data-theme="dark"] { ... }` token block with:

```css
/* Light with color on is an acid trip: candy stops, hot pink links, a cream halo
   around body text. Fun over readable; headings are exempt from contrast. */
[data-color="on"] {
  --rainbow: linear-gradient(90deg, #ff2e93, #ff7a00, #ffd400, #7ed321, #00d4ff, #7a3cff, #e81cff);
  --rainbow-border: var(--rainbow);
  --link-color: #e0007a;
  --link-hover-color: #ff2e93;
  --rainbow-stop-1: #ff2e93;
  --rainbow-stop-2: #ff7a00;
  --rainbow-stop-3: #ffd400;
  --rainbow-stop-4: #7ed321;
  --rainbow-stop-5: #00d4ff;
  --rainbow-stop-6: #7a3cff;
  --rainbow-stop-7: #e81cff;
  --halo: rgba(255, 248, 235, 0.75);
  --cycle-name: rainbow-cycle;
  --cycle-glow-name: rainbow-cycle;
  --cycle-duration: 12s;
  --melt: hue-rotate(0deg);
}

/* Dark with color on is the scary part of the fairy tale: oxblood, bruise,
   moss and bone, a slow narrow pulse instead of a full hue turn. */
[data-color="on"][data-theme="dark"] {
  --rainbow: linear-gradient(90deg, #8a1c1c, #6e2350, #5b2a6e, #3f4f2a, #4f6b2a, #d8cfb8, #8a1c1c);
  --rainbow-border: linear-gradient(90deg, #8a1c1cbf, #6e2350bf, #5b2a6ebf, #3f4f2abf, #4f6b2abf, #d8cfb8bf, #8a1c1cbf);
  --link-color: #9bbf5a;
  --link-hover-color: #e8dfc8;
  --rainbow-stop-1: #8a1c1c;
  --rainbow-stop-2: #6e2350;
  --rainbow-stop-3: #5b2a6e;
  --rainbow-stop-4: #3f4f2a;
  --rainbow-stop-5: #4f6b2a;
  --rainbow-stop-6: #d8cfb8;
  --rainbow-stop-7: #8a1c1c;
  --halo: rgba(0, 0, 0, 0.85);
  --cycle-name: dread-pulse;
  --cycle-glow-name: dread-pulse-glow;
  --cycle-duration: 40s;
}

/* A halo around body text keeps it legible on the backdrop. Gradient headings are
   transparent text, so an inherited shadow would show through them: they opt out,
   as do code blocks, which keep their solid box. */
[data-color="on"] body {
  text-shadow: 0 0 4px var(--halo), 0 0 10px var(--halo);
}

[data-color="on"] h1,
[data-color="on"] h2,
[data-color="on"] h3,
[data-color="on"] h4,
[data-color="on"] h5,
[data-color="on"] h6,
[data-color="on"] .nav-title,
[data-color="on"] .catalogue-title a,
[data-color="on"] pre {
  text-shadow: none;
}
```

- [ ] **Step 2: Replace the keyframes and the animation list**

Replace:

```css
@keyframes rainbow-cycle {
  from { filter: hue-rotate(0deg); }
  to { filter: hue-rotate(360deg); }
}
```

with:

```css
/* --melt comes first so headings can add the SVG melt filter without a second
   animation; everything else gets the identity default. */
@keyframes rainbow-cycle {
  from { filter: var(--melt) hue-rotate(0deg); }
  to { filter: var(--melt) hue-rotate(360deg); }
}

@keyframes dread-pulse {
  0%, 100% { filter: var(--melt) hue-rotate(-20deg); }
  50% { filter: var(--melt) hue-rotate(20deg); }
}
```

In the long selector list ending with `[data-color="on"] .share-button::before {`, replace the declaration

```css
  animation: rainbow-cycle 12s var(--rainbow-timing) infinite;
```

with

```css
  animation: var(--cycle-name) var(--cycle-duration) var(--rainbow-timing) infinite;
```

Replace the dark glow block:

```css
[data-color="on"][data-theme="dark"] h1:not(.catalogue-title),
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

with:

```css
[data-color="on"][data-theme="dark"] h1:not(.catalogue-title),
[data-color="on"][data-theme="dark"] h2,
[data-color="on"][data-theme="dark"] h3,
[data-color="on"][data-theme="dark"] .nav-title,
[data-color="on"][data-theme="dark"] .catalogue-title a {
  animation-name: var(--cycle-glow-name);
}

@keyframes rainbow-cycle-glow {
  from { filter: var(--melt) hue-rotate(0deg) drop-shadow(0 0 6px rgba(255, 255, 255, 0.22)); }
  to { filter: var(--melt) hue-rotate(360deg) drop-shadow(0 0 6px rgba(255, 255, 255, 0.22)); }
}

@keyframes dread-pulse-glow {
  0%, 100% { filter: var(--melt) hue-rotate(-20deg) drop-shadow(0 0 8px rgba(216, 207, 184, 0.25)); }
  50% { filter: var(--melt) hue-rotate(20deg) drop-shadow(0 0 8px rgba(216, 207, 184, 0.25)); }
}
```

- [ ] **Step 3: Find any other place that hard-codes the cycle**

Run: `grep -n 'rainbow-cycle 12s' assets/css/theme.css`
For each remaining match (there are two, in pixel cross-axis rules near 1098 and 1323), replace `rainbow-cycle 12s` with `var(--cycle-name) var(--cycle-duration)`.

- [ ] **Step 4: Verify the halo opt-out and invariance in a browser**

Append to `_tests/tools/layout-invariance.cjs`, before `await browser.close();`:

```js
  // The halo must never paint through transparent gradient headings.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('color', 'on'));
    await page.goto(base + '/about', { waitUntil: 'networkidle' });
    const shadows = await page.evaluate(() => ({
      h1: getComputedStyle(document.querySelector('h1')).textShadow,
      p: getComputedStyle(document.querySelector('main p')).textShadow,
    }));
    const ok = shadows.h1 === 'none' && shadows.p !== 'none';
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  halo on body text only :: ${JSON.stringify(shadows)}`);
    await ctx.close();
  }
```

```bash
pkill -f '[j]ekyll serve --port 4132'; bundle exec jekyll serve --port 4132 --no-watch > /tmp/claude-jekyll.log 2>&1 & sleep 15
node _tests/tools/layout-invariance.cjs http://localhost:4132; echo exit=$?
```

Expected: all PASS including `halo on body text only`, `exit=0`.

- [ ] **Step 5: Update CLAUDE.md**

Replace the Color axis sentences from `animated, never containers. One \`rainbow-cycle\` keyframe (20 s hue rotation) is shared` through `adds brighter stops, dimmed card borders and a glow on headings; the other cross-axis` with:

```
animated, never containers. Light with color on is an acid trip (candy stops, hot pink
links); `[data-color="on"][data-theme="dark"]` is abstract dread (oxblood, bruise, moss,
bone, moss links). The cycle is tokenised: `--cycle-name` and `--cycle-duration` give light
`rainbow-cycle` over 12 s and dark `dread-pulse` (±20° hue) over 40 s, paused by
`--rainbow-play` under `prefers-reduced-motion`; every keyframe starts its `filter` with
`var(--melt)` (identity by default) so headings can add the melt filter. Body text carries a
`--halo` text-shadow (cream in light, black in dark); gradient headings and `pre` opt out.
Dark adds a glow on headings via `--cycle-glow-name`; the other cross-axis
```

- [ ] **Step 6: Commit**

```bash
git add assets/css/theme.css CLAUDE.md _tests/tools/layout-invariance.cjs
git commit -m "Color axis: acid and dread palettes, cycle tokens, text halo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Melting headings

**Files:**
- Create: `_includes/melt-filter.html`, `assets/js/melt.js`, `_tests/melt.test.cjs`
- Modify: `_layouts/default.html`, `assets/css/theme.css`, `CLAUDE.md`

**Interfaces:**
- Consumes: `--melt` and the keyframes from Task 5.
- Produces: `svg.melt-filters` with filters `#melt-light`, `#melt-dark`; `meltState({ color, style, reduced, hidden }) -> 'run' | 'pause'`.

- [ ] **Step 1: Write the failing test**

`_tests/melt.test.cjs`:

```js
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
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test _tests/melt.test.cjs`
Expected: FAIL, `ENOENT ... assets/js/melt.js`.

- [ ] **Step 3: Write `assets/js/melt.js`**

```js
// Melting headings: the SVG filters in _includes/melt-filter.html animate with SMIL.
// They only show with color on in smooth style, so the animations are paused at all
// other times, under reduced motion (frozen, still melted) and while the tab is hidden.
(() => {
  function meltState({ color, style, reduced, hidden }) {
    return color === 'on' && style !== 'pixel' && !reduced && !hidden ? 'run' : 'pause';
  }

  function init(doc, win) {
    const svg = doc.querySelector('svg.melt-filters');
    if (!svg || typeof svg.pauseAnimations !== 'function') return;
    const html = doc.documentElement;
    const reduced = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    const apply = () => {
      const state = meltState({ color: html.dataset.color, style: html.dataset.style, reduced: reduced.matches, hidden: doc.hidden });
      if (state === 'run') svg.unpauseAnimations();
      else svg.pauseAnimations();
    };
    doc.addEventListener('themechange', apply);
    doc.addEventListener('visibilitychange', apply);
    reduced.addEventListener?.('change', apply);
    apply();
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { meltState };
  } else if (typeof document !== 'undefined') {
    init(document, window);
  }
})();
```

- [ ] **Step 4: Run the test**

Run: `node --test _tests/melt.test.cjs`
Expected: PASS.

- [ ] **Step 5: Write `_includes/melt-filter.html`**

```html
<svg class="melt-filters" width="0" height="0" aria-hidden="true" focusable="false">
  <!-- Light: heat-haze wobble with glyph bottoms sagging into a downward smear. -->
  <filter id="melt-light" x="-5%" y="-20%" width="110%" height="170%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves="2" seed="3" result="noise">
      <animate attributeName="baseFrequency" dur="12s" values="0.012 0.06;0.016 0.09;0.012 0.06" repeatCount="indefinite"/>
    </feTurbulence>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="9" xChannelSelector="R" yChannelSelector="G" result="warp"/>
    <feGaussianBlur in="warp" stdDeviation="0 3" result="smear"/>
    <feOffset in="smear" dy="5" result="drop"/>
    <feMerge>
      <feMergeNode in="drop"/>
      <feMergeNode in="warp"/>
    </feMerge>
  </filter>
  <!-- Dark: ink bleeding into wet paper, flickering with the candle. -->
  <filter id="melt-dark" x="-5%" y="-20%" width="110%" height="150%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.02 0.03" numOctaves="2" seed="7" result="noise">
      <animate attributeName="baseFrequency" dur="18s" values="0.02 0.03;0.026 0.04;0.02 0.03" repeatCount="indefinite"/>
    </feTurbulence>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" result="warp"/>
    <feGaussianBlur in="warp" stdDeviation="2.5" result="blur"/>
    <feColorMatrix in="blur" type="matrix" values="0.5 0 0 0 0  0 0.4 0 0 0  0 0 0.45 0 0  0 0 0 0.85 0" result="dim"/>
    <feOffset in="dim" dy="1.5" result="bleedRaw"/>
    <feComponentTransfer in="bleedRaw" result="bleed">
      <feFuncA type="linear" slope="1">
        <animate attributeName="slope" dur="7s" values="1;0.8;1;0.95;0.65;1" keyTimes="0;0.2;0.35;0.6;0.7;1" repeatCount="indefinite"/>
      </feFuncA>
    </feComponentTransfer>
    <feMerge>
      <feMergeNode in="bleed"/>
      <feMergeNode in="warp"/>
    </feMerge>
  </filter>
</svg>
```

- [ ] **Step 6: Render it and load the script**

In `_layouts/default.html`, after `{% include shortcuts.html %}` add `    {% include melt-filter.html %}`; after the `backdrop.js` script tag add:

```html
    <script src="{{ "/assets/js/melt.js" | relative_url }}" defer></script>
```

- [ ] **Step 7: Hide the SVG and set `--melt` on headings**

In `theme.css`, after the halo rules from Task 5, add:

```css
/* The filter definitions take no space and never paint. */
.melt-filters {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}

/* Melting headings, smooth style only: warping the pixel font turns it to mush. */
[data-color="on"]:not([data-style="pixel"]) h1,
[data-color="on"]:not([data-style="pixel"]) h2,
[data-color="on"]:not([data-style="pixel"]) h3,
[data-color="on"]:not([data-style="pixel"]) .nav-title,
[data-color="on"]:not([data-style="pixel"]) .catalogue-title a {
  --melt: url(#melt-light);
}

[data-color="on"][data-theme="dark"]:not([data-style="pixel"]) h1,
[data-color="on"][data-theme="dark"]:not([data-style="pixel"]) h2,
[data-color="on"][data-theme="dark"]:not([data-style="pixel"]) h3,
[data-color="on"][data-theme="dark"]:not([data-style="pixel"]) .nav-title,
[data-color="on"][data-theme="dark"]:not([data-style="pixel"]) .catalogue-title a {
  --melt: url(#melt-dark);
}
```

- [ ] **Step 8: Pin the leak and the hookup in the browser check**

Append to `_tests/tools/layout-invariance.cjs`, before `await browser.close();`:

```js
  // --melt reaches headings only; strips and rings keep the plain hue cycle.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => localStorage.setItem('color', 'on'));
    await page.goto(base + '/2026-01-28/industrialized-gambling', { waitUntil: 'networkidle' });
    const filters = await page.evaluate(() => ({
      title: getComputedStyle(document.querySelector('.post-title')).filter,
      line: getComputedStyle(document.querySelector('.post-line') || document.querySelector('footer'), '::after').filter,
    }));
    const ok = filters.title.includes('url(') && !filters.line.includes('url(');
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  melt on headings only :: ${JSON.stringify(filters)}`);
    await ctx.close();
  }
```

- [ ] **Step 9: Run everything and look**

```bash
pkill -f '[j]ekyll serve --port 4132'; bundle exec jekyll serve --port 4132 --no-watch > /tmp/claude-jekyll.log 2>&1 & sleep 15
node --test _tests/*.test.cjs 2>&1 | grep -E '^# (pass|fail)'
node _tests/tools/layout-invariance.cjs http://localhost:4132; echo exit=$?
for t in light dark; do COLOR=on node _tests/screenshot.cjs http://localhost:4132/2026-01-28/industrialized-gambling $t /tmp/claude-shots-melt-$t.png; done
```

Expected: `# fail 0`; all invariance lines PASS incl. `melt on headings only`; open both PNGs with Read: light title wobbles with a smear below the letters, dark title has a soft bleeding edge, both still recognisable. If letters are unreadable mush, halve `scale` (9→5, 4→2).

- [ ] **Step 10: Update CLAUDE.md**

After the Color axis paragraph's new halo sentence (Task 5), add:

```
Headings `h1`–`h3`, the site title and home-page post titles melt in smooth style: they set
`--melt` to `url(#melt-light)` or `url(#melt-dark)`, SVG filters defined once in
`_includes/melt-filter.html` (SMIL-animated turbulence feeding a displacement map; dark adds a
flickering ink bleed). `assets/js/melt.js` pauses the animations unless color is on, style is
smooth, motion is allowed and the tab is visible; its `meltState` is tested in
`_tests/melt.test.cjs`. Pixel style never melts.
```

- [ ] **Step 11: Commit**

```bash
git add _includes/melt-filter.html assets/js/melt.js _tests/melt.test.cjs _layouts/default.html assets/css/theme.css CLAUDE.md _tests/tools/layout-invariance.cjs
git commit -m "Melting headings via SVG filters composed into the hue cycle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Contrast, performance, color-off identity and the contact sheet

**Files:**
- Create: `_tests/tools/contrast-sample.cjs`
- Modify: `CLAUDE.md` (Backdrop paragraph: shader description)

**Interfaces:**
- Consumes: everything above.
- Produces: verification evidence for the PR (numbers and a contact sheet image in the scratchpad).

- [ ] **Step 1: Write the contrast tool**

```js
// Usage: node _tests/tools/contrast-sample.cjs <base url>
// Body text must stay at or above 3:1 against what is behind it (backdrop lane plus
// halo). For the first three paragraphs of a post, light and dark color-on, it
// screenshots the paragraph with its glyphs made transparent (halo kept), takes the
// 10th-percentile-worst contrast between the text color and those pixels, and fails
// under 3:1. Headings are exempt by design.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const base = (process.argv[2] ?? 'http://localhost:4132').replace(/\/$/, '');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  let failed = 0;
  for (const theme of ['light', 'dark']) for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.addInitScript((t) => { localStorage.setItem('theme', t); localStorage.setItem('color', 'on'); }, theme);
    await page.emulateMedia({ reducedMotion: 'reduce' });   // a still frame: stable pixels
    await page.goto(base + '/2026-01-28/industrialized-gambling', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const textRgb = await page.evaluate(() => getComputedStyle(document.querySelector('.post p')).color);
    await page.addStyleTag({ content: '.post p, .post p * { color: transparent !important; }' });
    for (let i = 0; i < 3; i++) {
      const box = await page.locator('.post p').nth(i).boundingBox();
      const png = await page.screenshot({ clip: box });
      const ratio = await page.evaluate(async ({ data, text }) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + data;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const px = ctx.getImageData(0, 0, c.width, c.height).data;
        const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        const [tr, tg, tb] = text.match(/\d+/g).map(Number);
        const lt = lum(tr, tg, tb);
        const ratios = [];
        for (let k = 0; k < px.length; k += 16) {
          const lb = lum(px[k], px[k + 1], px[k + 2]);
          ratios.push((Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05));
        }
        ratios.sort((a, b) => a - b);
        return ratios[Math.floor(ratios.length * 0.1)];
      }, { data: png.toString('base64'), text: textRgb });
      const ok = ratio >= 3;
      if (!ok) failed++;
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${theme} ${width}px paragraph ${i + 1}: ${ratio.toFixed(2)}:1`);
    }
    await page.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
```

(The `!important` is inside a test-only injected style, not in `theme.css`; the CLAUDE.md rule is about component rules.)

- [ ] **Step 2: Run it**

```bash
pkill -f '[j]ekyll serve --port 4132'; bundle exec jekyll serve --port 4132 --no-watch > /tmp/claude-jekyll.log 2>&1 & sleep 15
node _tests/tools/contrast-sample.cjs http://localhost:4132; echo exit=$?
```

Expected: all PASS. If light fails, raise the lane pull in the shader (`0.35 * calm` → `0.5 * calm`) before touching the halo. If dark fails, raise the dark `--halo` alpha to 0.95 first, then the lane pull. Do not change `--text-color` (it is shared with color off). Re-run until PASS and record the numbers.

- [ ] **Step 3: Performance against master**

```bash
S=/tmp/claude-1000/-home-brlauuu-repos-brlauuu-github-io/95cf05fa-6473-438c-bfbe-2822b79e7922/scratchpad
node _tests/tools/perf.cjs http://localhost:4132/2026-01-28/industrialized-gambling 10 | tee $S/perf-branch.txt
rm -rf $S/master-src && git worktree add -q $S/master-src master
(cd $S/master-src && bundle exec jekyll serve --port 4133 --no-watch > /tmp/claude-jekyll-master.log 2>&1 &) ; sleep 20
node _tests/tools/perf.cjs http://localhost:4133/2026-01-28/industrialized-gambling 10 | tee $S/perf-master.txt
```

Expected: branch `longTasks` ≤ master's and fps within 20 % of master's (SwiftShader floor). If over, drop the fourth `fbm` octave (`i < 4` → `i < 3`) and rerun.

- [ ] **Step 4: Color-off byte identity**

```bash
S=/tmp/claude-1000/-home-brlauuu-repos-brlauuu-github-io/95cf05fa-6473-438c-bfbe-2822b79e7922/scratchpad
for u in / /archive /about /2026-01-28/industrialized-gambling /2020-12-09/Peculiar-case-of-BLAT-output; do
  n=$(echo $u | tr -c 'a-z0-9\n' _)
  for t in light dark; do
    node _tests/screenshot.cjs http://localhost:4133$u $t $S/off-m$n-$t.png full
    node _tests/screenshot.cjs http://localhost:4132$u $t $S/off-b$n-$t.png full
    cmp -s $S/off-m$n-$t.png $S/off-b$n-$t.png && echo "same $u $t" || echo "DIFF $u $t"
  done
done
pkill -f '[j]ekyll serve --port 4133'; git worktree remove --force $S/master-src
```

Expected: all `same`, except `/` may differ by the live GitHub sidebar (check the diff box is inside the sidebar). Any other DIFF is a regression: the usual cause is the melt SVG; confirm `.melt-filters` has zero size.

- [ ] **Step 5: Contact sheet**

```bash
S=/tmp/claude-1000/-home-brlauuu-repos-brlauuu-github-io/95cf05fa-6473-438c-bfbe-2822b79e7922/scratchpad
rm -rf $S/sheet && mkdir -p $S/sheet
for t in light dark; do for st in smooth pixel; do
  STYLE=$([ $st = pixel ] && echo pixel) COLOR=on node _tests/screenshot.cjs http://localhost:4132/2026-01-28/industrialized-gambling $t $S/sheet/post-$t-$st.png
  STYLE=$([ $st = pixel ] && echo pixel) COLOR=on node _tests/screenshot.cjs http://localhost:4132/ $t $S/sheet/home-$t-$st.png
done; done
python3 - "$S/sheet" <<'EOF'
import sys, glob, os
from PIL import Image
d = sys.argv[1]
files = sorted(glob.glob(os.path.join(d, '*.png')))
ims = [Image.open(f).resize((640, 415)) for f in files]
cols = 4; rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * 650, rows * 425), 'white')
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * 650, (i // cols) * 425))
sheet.save(os.path.join(d, 'contact-sheet.png'))
print(os.path.join(d, 'contact-sheet.png'))
EOF
```

Open the contact sheet and the 390 px screenshots from the mobile audit (`W=390` with the scratchpad `mobile-audit.cjs`) with Read and check each against the spec: light = candy marble + drips + melting headings; dark = ink, fog, vignette, no figures; pixel = no melt, quantised backdrop; lane visibly calmer; no panels. Then also take one reduced-motion pair (`page.emulateMedia({ reducedMotion: 'reduce' })` via a one-off script or the contrast tool's setup) and confirm drips hang still.

- [ ] **Step 6: Update the Backdrop paragraph in CLAUDE.md**

Replace `fragment shader while \`data-color="on"\`.` with:

```
fragment shader while `data-color="on"`: light is an acid trip (domain-warped candy
marbling, twelve glossy drips running down from the top edge, the pointer stirring the paint),
dark is abstract dread (ink plumes, fog, a breathing vignette, candle flicker, a candle glow at
the pointer). Inside the reading column (`u_lane`, from `main`'s rect via the tested `laneFor`)
the field desaturates, pulls toward the page background and halves its warp.
```

and add `u_lane` to the uniform list sentence (`\`u_grid\` (0 smooth, 4 pixel), \`u_intensity\`, \`u_lane\`.`). Add after `drives the color button in a browser.`: `` `_tests/tools/contrast-sample.cjs` checks body text stays ≥ 3:1 on the lane. ``

- [ ] **Step 7: Final full run and commit**

```bash
node --test _tests/*.test.cjs 2>&1 | grep -E '^# (pass|fail)'
node _tests/tools/layout-invariance.cjs http://localhost:4132; echo invariance=$?
node _tests/tools/backdrop-check.cjs http://localhost:4132; echo backdrop=$?
node _tests/tools/constellation-check.cjs http://localhost:4132; echo constellation=$?
node _tests/tools/contrast-sample.cjs http://localhost:4132; echo contrast=$?
pkill -f '[j]ekyll serve --port 4132'
git add _tests/tools/contrast-sample.cjs CLAUDE.md assets/js/backdrop.js
git commit -m "Contrast sampling tool and backdrop docs for color axis v2

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: `# fail 0` and every exit code 0. The contact sheet path, perf numbers and contrast numbers go into the PR description (images cannot be attached through `gh`; the sheet is shown to the user in chat).
