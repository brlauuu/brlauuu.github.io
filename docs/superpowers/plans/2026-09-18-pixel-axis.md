# Pixel Axis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the `style` axis its look: a shape button in the nav, and under `data-style="pixel"` a self-hosted pixel font on chrome and headings, square corners, thick borders, hard shadows, pixelated images and no easing, composing with both other axes. Smooth must stay byte-identical to master.

**Architecture:** A new "Style axis" layer at the end of `assets/css/theme.css`, keyed on `[data-style="pixel"]`, overriding font, radius, border width, shadow, image rendering and transition properties on the components that have them. Silkscreen is served from `assets/fonts/` through one `@font-face` that only downloads when the pixel rules reference it. Three cross-axis rules only: `[data-style="pixel"][data-color="on"]` switches the hue cycle to `steps()` and thickens the gradient rings to match the 2px borders; the pixel-state shape icon is drawn blocky. The button is a new branch of `_includes/theme-toggle.html`; `assets/js/theme.js` already handles the axis. This PR closes #4.

**Tech Stack:** Jekyll 3.10 with the remote Tale theme, plain CSS, Node 20 `node --test`, headless Chromium via Playwright.

**Spec:** `docs/superpowers/specs/2026-09-18-theme-axes-design.md` (sections "Nav buttons", "Style axis", "Cross-axis rules", "Testing").

## Global Constraints

- Style smooth must render byte-identical to current `master` (commit 6baa9bc) below the nav on every page in both themes with color off; the diff in Task 4 enforces it. Every new rule is under `[data-style="pixel"]` or `[data-style="pixel"][data-color="on"]`, or is the `@font-face` declaration (inert until referenced).
- Body text keeps its current font. Pixel font applies only to: site title, nav links, headings, dates (`.catalogue-time`, `.post-info`, `.tag-date`), the pinned label, tag chips and counts, project names and version badge, the share tooltip, pagination links.
- Font: Silkscreen Regular (SIL OFL 1.1) self-hosted as `assets/fonts/Silkscreen-Regular.woff2` and `.ttf`, with the license text at `assets/fonts/Silkscreen-OFL.txt`. No external font request.
- Pixel: every `border-radius` becomes 0; the 1px component borders become 2px; the share button's soft shadow becomes a hard offset shadow; the catalogue and post lines become thicker and stepped (dashed); images and project logos use `image-rendering: pixelated`; inline SVG icons use `shape-rendering: crispEdges`; every transition duration becomes 0; hovers translate by 1 or 2px instead of scaling.
- Cross-axis: `[data-style="pixel"][data-color="on"]` sets `--rainbow-timing: steps(12)` and ring padding to 2px; nothing else names two axes.
- Button labels (set by `theme.js`): `Switch to pixel style` / `Switch to smooth style`. Icon: filled square while smooth, blocky filled circle while pixel. Nav order: rainbow, bulb, shape.
- No `!important`. Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_013dSYwteU9vJGeTHhARhj8p`.
- Branch `10-pixel-axis` from `master`.

## File structure

| File | Responsibility |
|------|----------------|
| `_includes/theme-toggle.html` | `style` branch: square (`data-when="smooth"`) and blocky circle (`data-when="pixel"`). |
| `_includes/navigation.html` | Renders the shape button after the bulb. |
| `assets/fonts/Silkscreen-Regular.woff2`, `.ttf`, `Silkscreen-OFL.txt` | Self-hosted pixel font and license. |
| `assets/css/theme.css` | Icon visibility for the style button; `@font-face`; "Style axis" layer at the end. |
| `README.md`, `CLAUDE.md`, `AGENTS.md` | Document the axis and the font license. |

---

### Task 1: Shape button

**Files:**
- Modify: `_includes/theme-toggle.html`, `_includes/navigation.html`, `assets/css/theme.css` (icon visibility rule in the nav block)

**Interfaces:**
- Consumes: `theme.js` flips `data-style` between `smooth` and `pixel` for any `[data-toggle="style"]` button.
- Produces: `<button class="theme-toggle" data-toggle="style">` with `[data-when="smooth"]` and `[data-when="pixel"]` SVGs; nav order rainbow, bulb, shape.

- [ ] **Step 1: Add the style branch**

In `_includes/theme-toggle.html`, directly before the closing `{% endif %}`, add:

```html
{% elsif include.axis == "style" %}
  <svg data-when="smooth" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <rect x="4" y="4" width="16" height="16"/>
  </svg>
  <svg data-when="pixel" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true" focusable="false">
    <path d="M9 3h6v2h2v2h2v2h2v6h-2v2h-2v2h-2v2H9v-2H7v-2H5v-2H3V9h2V7h2V5h2z"/>
  </svg>
```

- [ ] **Step 2: Nav**

In `_includes/navigation.html` the toggles item becomes:

```html
      <li class="nav-toggles">
        {% include theme-toggle.html axis="color" %}
        {% include theme-toggle.html axis="theme" %}
        {% include theme-toggle.html axis="style" %}
      </li>
```

- [ ] **Step 3: Icon visibility**

In `assets/css/theme.css`, extend the icon-visibility rule (the one ending in `display: block;` in the nav-buttons block) with two more selectors so it reads:

```css
:root:not([data-theme="dark"]) .theme-toggle[data-toggle="theme"] [data-when="light"],
[data-theme="dark"] .theme-toggle[data-toggle="theme"] [data-when="dark"],
:root:not([data-color="on"]) .theme-toggle[data-toggle="color"] [data-when="off"],
[data-color="on"] .theme-toggle[data-toggle="color"] [data-when="on"],
:root:not([data-style="pixel"]) .theme-toggle[data-toggle="style"] [data-when="smooth"],
[data-style="pixel"] .theme-toggle[data-toggle="style"] [data-when="pixel"] {
  display: block;
}
```

- [ ] **Step 4: Build, test, browser check**

Run: `bundle exec jekyll build && grep -o 'data-toggle="[a-z]*"' _site/index.html | tr '\n' ' '` — expected `data-toggle="color" data-toggle="theme" data-toggle="style"`. Run `node --test _tests/` (22 passed). Then:

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
    const btn = document.querySelector("[data-toggle=style]");
    const shown = [...btn.querySelectorAll("[data-when]")].filter(s => getComputedStyle(s).display !== "none").map(s => s.dataset.when);
    return [document.documentElement.dataset.style, btn.getAttribute("aria-label"), shown.join(","), localStorage.getItem("style") ?? "null"].join(" | ");
  });
  console.log(await state());
  await p.click("[data-toggle=style]");
  console.log(await state());
  await p.reload();
  console.log(await state());
  await b.close();
})();'
pkill -f "http.server 4131"
```

Expected:
```
smooth | Switch to pixel style | smooth | null
pixel | Switch to smooth style | pixel | pixel
pixel | Switch to smooth style | pixel | pixel
```

- [ ] **Step 5: Commit**

```bash
git add _includes/theme-toggle.html _includes/navigation.html assets/css/theme.css
git commit -m "Add the shape button for the style axis

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013dSYwteU9vJGeTHhARhj8p"
```

---

### Task 2: Self-hosted Silkscreen on chrome and headings

**Files:**
- Create: `assets/fonts/Silkscreen-Regular.woff2`, `assets/fonts/Silkscreen-Regular.ttf`, `assets/fonts/Silkscreen-OFL.txt`
- Modify: `assets/css/theme.css` (append the Style axis layer)

**Interfaces:**
- Produces: `@font-face` for `"Silkscreen"`; `--pixel-font` variable; the selector list of pixel-font elements that Task 3 leaves untouched.

- [ ] **Step 1: Fetch the font**

```bash
mkdir -p assets/fonts
curl -sL -o assets/fonts/Silkscreen-Regular.ttf https://raw.githubusercontent.com/google/fonts/main/ofl/silkscreen/Silkscreen-Regular.ttf
curl -sL -o assets/fonts/Silkscreen-OFL.txt https://raw.githubusercontent.com/google/fonts/main/ofl/silkscreen/OFL.txt
curl -sL -o assets/fonts/Silkscreen-Regular.woff2 https://fonts.gstatic.com/s/silkscreen/v6/m8JXjfVPf62XiF7kO-i9YLNlaw.woff2
file assets/fonts/Silkscreen-Regular.ttf assets/fonts/Silkscreen-Regular.woff2
head -3 assets/fonts/Silkscreen-OFL.txt
```

Expected: `TrueType Font data`, `Web Open Font Format (Version 2)`, and the OFL header naming The Silkscreen Project Authors. If the woff2 URL 404s, drop the woff2 source from the `@font-face` below and ship the ttf only.

- [ ] **Step 2: Append the font layer**

Append to `assets/css/theme.css`:

```css
/* ------------------------------------------------------------------ */
/* Style axis: pixel. Chrome and headings switch to a bitmap-style     */
/* font, corners go square, borders thicken, shadows go hard, images   */
/* render pixelated, nothing eases. Body text keeps its font. Nothing  */
/* here applies while data-style is smooth; the font only downloads    */
/* when a pixel rule references it.                                    */
/* ------------------------------------------------------------------ */

@font-face {
  font-family: "Silkscreen";
  src: url("/assets/fonts/Silkscreen-Regular.woff2") format("woff2"),
       url("/assets/fonts/Silkscreen-Regular.ttf") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

[data-style="pixel"] {
  --pixel-font: "Silkscreen", "Courier New", monospace;
}

/* Pixel font on chrome and headings only. Silkscreen is wide and has no
   lowercase-height nuance, so sizes step down from Tale's defaults. */
[data-style="pixel"] h1,
[data-style="pixel"] h2,
[data-style="pixel"] h3,
[data-style="pixel"] h4,
[data-style="pixel"] h5,
[data-style="pixel"] h6,
[data-style="pixel"] .nav-title,
[data-style="pixel"] .nav a,
[data-style="pixel"] .catalogue-time,
[data-style="pixel"] .catalogue-pinned,
[data-style="pixel"] .post-info,
[data-style="pixel"] .tag-date,
[data-style="pixel"] .tag-chip,
[data-style="pixel"] .tag-count,
[data-style="pixel"] .project-name,
[data-style="pixel"] .project-version,
[data-style="pixel"] .share-feedback,
[data-style="pixel"] .pagination,
[data-style="pixel"] .pagination .top {
  font-family: var(--pixel-font);
  letter-spacing: 0;
  line-height: 1.3;
}

[data-style="pixel"] .post-title,
[data-style="pixel"] .tags-header-title { font-size: 2.2rem; }
[data-style="pixel"] .catalogue-title { font-size: 1.3rem; }
[data-style="pixel"] h2 { font-size: 1.15rem; }
[data-style="pixel"] h3 { font-size: 1rem; }
[data-style="pixel"] .nav-title { font-size: 1.1rem; }
[data-style="pixel"] .nav a { font-size: 0.8rem; }
[data-style="pixel"] .catalogue-time,
[data-style="pixel"] .catalogue-pinned,
[data-style="pixel"] .post-info,
[data-style="pixel"] .tag-date,
[data-style="pixel"] .pagination { font-size: 0.7rem; }
[data-style="pixel"] .tag-chip,
[data-style="pixel"] .project-name { font-size: 0.7rem; }
[data-style="pixel"] .tag-count,
[data-style="pixel"] .project-version { font-size: 0.6rem; }
[data-style="pixel"] .share-feedback { font-size: 0.6rem; }
```

- [ ] **Step 3: Build and check the font loads only in pixel**

```bash
bundle exec jekyll build && ls -l _site/assets/fonts/
(cd _site && python3 -m http.server 4131 >/dev/null 2>&1 &); sleep 1
export PLAYWRIGHT_MODULE=/home/brlauuu/.npm/_npx/9833c18b2d85bc59/node_modules/playwright
export PLAYWRIGHT_CHROMIUM=/home/brlauuu/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
node -e '
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM });
  for (const style of ["smooth", "pixel"]) {
    const p = await b.newPage();
    const fonts = [];
    p.on("request", r => { if (r.url().includes("/assets/fonts/")) fonts.push(r.url().split("/").pop()); });
    await p.addInitScript(s => localStorage.setItem("style", s), style);
    await p.goto("http://localhost:4131/", { waitUntil: "networkidle" });
    const fam = await p.evaluate(() => [getComputedStyle(document.querySelector(".catalogue-title")).fontFamily, getComputedStyle(document.querySelector(".catalogue-item p")).fontFamily].join(" || "));
    console.log(style, "| fonts requested:", fonts.join(",") || "none", "|", fam);
    await p.close();
  }
  await b.close();
})();'
pkill -f "http.server 4131"
```

Expected: the `smooth` line requests no font and shows the existing families; the `pixel` line requests `Silkscreen-Regular.woff2`, the title's family starts with `Silkscreen`, and the paragraph's family is unchanged from the smooth line.

- [ ] **Step 4: Screenshot pixel on**

```bash
mkdir -p /tmp/claude-shots-pixel
(cd _site && python3 -m http.server 4131 >/dev/null 2>&1 &); sleep 1
for t in light dark; do for p in "index.html" "2021-02-02/motevowrapper.html" "tags.html"; do
  n=$(echo "$p" | tr '/' '_' | sed 's/\.html$//')
  STYLE=pixel node _tests/screenshot.cjs http://localhost:4131/$p $t /tmp/claude-shots-pixel/font-$n-$t.png full
done; done
pkill -f "http.server 4131"
```

Open all six with the Read tool: headings, nav, dates, chips and card names must be in the pixel font at sizes that fit their spaces (post title on at most two lines at 1280px; nav on one row; project names not overflowing their cards); paragraphs unchanged. Adjust a size if something overflows and say so in the report.

- [ ] **Step 5: Tests and commit**

`node --test _tests/` (22), then:

```bash
git add assets/fonts assets/css/theme.css
git commit -m "Self-host Silkscreen and use it for chrome and headings in pixel style

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013dSYwteU9vJGeTHhARhj8p"
```

---

### Task 3: Shapes, images, motion and the cross-axis rules

**Files:**
- Modify: `assets/css/theme.css` (append to the Style axis layer)

**Interfaces:**
- Consumes: color-layer selectors `.tag-chip::before`, `.project-card::before`, `.share-button::before` (ring padding) and `--rainbow-timing`.

- [ ] **Step 1: Append the rules**

```css
/* Shapes: no rounding anywhere, thicker borders, hard shadows. */
[data-style="pixel"] .tag-chip,
[data-style="pixel"] .tag-count,
[data-style="pixel"] .project-card,
[data-style="pixel"] .project-version,
[data-style="pixel"] .share-button,
[data-style="pixel"] .share-feedback,
[data-style="pixel"] code,
[data-style="pixel"] pre,
[data-style="pixel"] .highlight,
[data-style="pixel"] .project-logo {
  border-radius: 0;
}

[data-style="pixel"] .tag-chip,
[data-style="pixel"] .project-card,
[data-style="pixel"] .catalogue-item,
[data-style="pixel"] .tag-section,
[data-style="pixel"] .pagination,
[data-style="pixel"] .pagination .top,
[data-style="pixel"] footer {
  border-width: 2px;
}

[data-style="pixel"] .catalogue-item:last-child {
  border-width: 0;
}

[data-style="pixel"] .share-button {
  box-shadow: 4px 4px 0 var(--heading-color);
}

[data-style="pixel"] .share-button:hover {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--heading-color);
}

[data-style="pixel"] .share-button:active {
  transform: translate(4px, 4px);
  box-shadow: none;
}

/* Thick lines become stepped blocks. */
[data-style="pixel"] .catalogue-line,
[data-style="pixel"] .post-line,
[data-style="pixel"] .tags-header-line {
  border-top-width: 0.5rem;
  border-top-style: dashed;
}

/* Images and icons: no smoothing. */
[data-style="pixel"] img,
[data-style="pixel"] .project-logo {
  image-rendering: pixelated;
}

[data-style="pixel"] svg {
  shape-rendering: crispEdges;
}

/* Motion: nothing eases; hovers snap by a pixel or two. */
[data-style="pixel"] body,
[data-style="pixel"] .share-button,
[data-style="pixel"] .share-feedback,
[data-style="pixel"] .theme-toggle,
[data-style="pixel"] .catalogue-line,
[data-style="pixel"] .nav-title,
[data-style="pixel"] .nav li,
[data-style="pixel"] .pagination .top,
[data-style="pixel"] .pagination .arrow,
[data-style="pixel"] .tags-post-line {
  transition: none;
}

[data-style="pixel"] .theme-toggle:hover {
  transform: translate(1px, 1px);
}

[data-style="pixel"] .theme-toggle:active {
  transform: translate(2px, 2px);
}

/* Cross-axis: with color on, the hue cycle jumps instead of sliding, and
   the gradient rings match the thicker borders. */
[data-style="pixel"][data-color="on"] {
  --rainbow-timing: steps(12);
}

[data-style="pixel"][data-color="on"] .tag-chip::before,
[data-style="pixel"][data-color="on"] .project-card::before {
  padding: 2px;
}
```

Notes: `.share-button::before` already has 2px padding for its 2px border, so it needs no cross-axis rule. The dashed thick line is drawn under `border-image` when color is on, which paints a solid rainbow block instead; that is acceptable.

- [ ] **Step 2: Build, test, and browser-check the cross-axis rule**

`bundle exec jekyll build && node --test _tests/` (22). Then:

```bash
(cd _site && python3 -m http.server 4131 >/dev/null 2>&1 &); sleep 1
export PLAYWRIGHT_MODULE=/home/brlauuu/.npm/_npx/9833c18b2d85bc59/node_modules/playwright
export PLAYWRIGHT_CHROMIUM=/home/brlauuu/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
node -e '
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM });
  const p = await b.newPage();
  await p.addInitScript(() => { localStorage.setItem("style", "pixel"); localStorage.setItem("color", "on"); });
  await p.goto("http://localhost:4131/tags.html", { waitUntil: "networkidle" });
  console.log(await p.evaluate(() => {
    const h = getComputedStyle(document.querySelector(".tag-heading"));
    const chip = document.querySelector(".tag-chip");
    const cs = getComputedStyle(chip), ring = getComputedStyle(chip, "::before");
    return [h.animationTimingFunction, cs.borderRadius, cs.borderTopWidth, ring.paddingTop, getComputedStyle(document.querySelector(".theme-toggle")).transitionDuration].join(" | ");
  }));
  await b.close();
})();'
pkill -f "http.server 4131"
```

Expected: `steps(12) | 0px | 2px | 2px | 0s`.

- [ ] **Step 3: Screenshot the eight combinations**

```bash
(cd _site && python3 -m http.server 4131 >/dev/null 2>&1 &); sleep 1
for t in light dark; do for c in off on; do for s in smooth pixel; do for p in "index.html" "2021-02-02/motevowrapper.html" "tags.html"; do
  n=$(echo "$p" | tr '/' '_' | sed 's/\.html$//')
  COLOR=$c STYLE=$s node _tests/screenshot.cjs http://localhost:4131/$p $t /tmp/claude-shots-pixel/$n-$t-color$c-$s.png full
done; done; done; done
pkill -f "http.server 4131"
```

Open every `*-pixel.png` (12 files) with the Read tool and confirm: square corners on chips, cards, badges, share button and code blocks; 2px borders; hard shadow under the share button; dashed thick lines; nav icons crisp; with color on, rings hug the 2px borders and headings still show the gradient in the pixel font. Also open the six `*-smooth.png` files and confirm they look exactly like the site did before this branch. Describe what each shows.

- [ ] **Step 4: Commit**

```bash
git add assets/css/theme.css
git commit -m "Square corners, thick borders, hard shadows and no easing in pixel style

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013dSYwteU9vJGeTHhARhj8p"
```

---

### Task 4: Regression check, docs, pull request

**Files:**
- Modify: `README.md`, `CLAUDE.md`, `AGENTS.md`

- [ ] **Step 1: Smooth must equal master**

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
for t in light dark; do for c in off on; do for p in "index.html" "2026-01-28/industrialized-gambling.html" "tags.html" "archive.html" "2021-02-02/motevowrapper.html"; do
  n=$(echo "$p" | tr '/' '_' | sed 's/\.html$//')
  COLOR=$c node _tests/screenshot.cjs http://localhost:4130/$p $t $S/master-$n-$t-$c.png
  COLOR=$c node _tests/screenshot.cjs http://localhost:4131/$p $t $S/branch-$n-$t-$c.png
done; done; done
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

Expected: `same` for all 20 pairs except the `index` pairs (live GitHub sidebar) and, with color on, pairs where the hue cycle's phase differs between the two captures; for those, open both PNGs and confirm the only difference is hue phase or sidebar data. Any other DIFF means a rule leaked outside `[data-style="pixel"]`: report it as DONE_WITH_CONCERNS with the element named.

- [ ] **Step 2: Docs**

`README.md`, "Theme axes" section: replace "the nav has the rainbow (color) and bulb (theme) buttons; the style button lands with issue #10;" with "the nav has the rainbow (color), bulb (theme) and shape (style) buttons;". Append after the color paragraph:

```markdown
With pixel style on, headings and the site chrome use Silkscreen (SIL Open Font License,
self-hosted in `assets/fonts/`, downloaded only when pixel is on), corners are square,
borders 2px, the share button casts a hard shadow, images render pixelated and nothing
eases. Body text keeps its font. Combined with color on, the hue cycle steps instead of
sliding.
```

`CLAUDE.md`, "### Theme axes": replace "The color and theme switches have nav buttons; the style button arrives with issue #10:" with "Each switch has its nav button:". Replace "Style has no visual rules yet; see issue #10." with:

```markdown
**Style axis** (`[data-style="pixel"]`, last layer of `theme.css`): one `@font-face` for
Silkscreen (`assets/fonts/`, OFL; downloads only when referenced), `--pixel-font` on
headings, nav, dates, chips, badges, tooltip and pagination with stepped-down sizes; zero
radii, 2px component borders, a hard offset shadow on the share button, dashed thick lines,
`image-rendering: pixelated` on images, `shape-rendering: crispEdges` on inline SVG, all
transitions off and hovers that translate by a pixel. Cross-axis with color:
`--rainbow-timing: steps(12)` and 2px ring padding. Body text never changes font.
```

`AGENTS.md`: extend the theme-axes bullet with "; `assets/fonts/` holds the self-hosted Silkscreen font and its OFL license".

- [ ] **Step 3: Final checks, commit, PR**

`node --test _tests/ && node --check assets/js/theme.js && bundle exec jekyll build && git status --short` then:

```bash
git add README.md CLAUDE.md AGENTS.md
git commit -m "Document the pixel style axis

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013dSYwteU9vJGeTHhARhj8p"
```

The controller pushes and opens the PR, titled "Pixel style axis with self-hosted Silkscreen (#10)", ending with `Closes #10` and `Closes #4`.
