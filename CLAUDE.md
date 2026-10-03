# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Jekyll-based personal blog hosted on GitHub Pages, using the Tale theme. The site belongs to Đorđe Relić (brlauuu), a PhD Candidate at Biozentrum, and serves as a writer-focused platform for essays and articles.

## Site Configuration

- **Jekyll Theme**: Tale (minimal theme for storytellers)
- **Theme Method**: remote_theme via `chesterhow/tale`
- **Ruby Version**: 3.3.4 (matches GitHub Pages environment)
- **GitHub Pages Gem**: ~> 232
- **Jekyll Version**: 3.10.0 (via github-pages gem)
- **Site URL**: https://brlauuu.github.io
- **Author**: Đorđe Relić
- **Social Links**: GitHub (brlauuu), LinkedIn (dorderelic)
- **Plugins**: jekyll-paginate, jekyll-remote-theme, jekyll-feed, jekyll-seo-tag, jekyll-sitemap
- **Archive System**: Automatic separation of recent (< 1 year) and archived (> 1 year) posts
- **Theme axes**: light/dark, color on/off and smooth/pixel switches, persisted in localStorage

## Directory Structure

```
_posts/          # Blog posts (YYYY-MM-DD-title.md format)
_pages/          # Static pages (about, archive)
_includes/       # Custom HTML includes (head, navigation, theme-toggle, shortcuts, catalogue_item, project-card, constellation, lang-menu, flag, t, date, lang-counts, lang-empty)
_layouts/        # Custom layouts (default, home)
assets/
  css/           # Custom CSS (theme.css, projects.css)
  js/            # JavaScript files (theme.js, shortcuts.js, sidenotes.js, project-stats.js, share-button.js, backdrop.js, constellation.js, lang.js)
_config.yml      # Jekyll configuration
index.html       # Homepage with recent posts
```

## Development Commands

### Local Development
```bash
# Install dependencies
bundle install

# Run local development server
bundle exec jekyll serve

# Build site (output to _site/)
bundle exec jekyll build
```

### Accessing Local Site
When running `jekyll serve`, the site is available at `http://localhost:4000`

## Content Structure

### Blog Posts
- Location: `_posts/` for English, `_posts/yu/` for Naš (Latin) and `_posts/sr/` for Српски
  (Cyrillic). `_config.yml` defaults give folder posts their `lang` and `locale: sr_RS`
  (og:locale has no Serbo-Croatian code) and a `/yu/` or `/sr/` URL prefix, so one post can
  exist in both scripts on the same date; English posts use `locale: en_US` and no prefix.
  The two versions of a post share `ref:`, so each links to the other. `_tests/front-matter.test.cjs` fails on an unknown `lang` or one
  that contradicts the folder.
- Naming: `YYYY-MM-DD-title.md`
- Format: Markdown with YAML front matter
- Required front matter:
  ```yaml
  ---
  layout: post
  title: "Post Title"
  author: "Đorđe Relić"
  lang: en                  # Optional: set by the folder (`en` in _posts/)
  tags: [tag1, tag2, tag3]  # Optional - posts can have tags or no tags
  ---
  ```
- **Feed**: `feed.xml` in the root is jekyll-feed 0.17.0's template, copied so each entry's
  `xml:lang` is the language code (`en`, `sh`, `sr-Cyrl`) instead of the `lang` key; jekyll-feed
  skips its own feed while that file exists
- **Reading time**: `_layouts/post.html` shows the word count and minutes to read (200 words/min, rounded up) under the date, counted from the rendered body without the footnote list; pages that use the post layout don't show it
- **Tags**: Posts can optionally include tags for categorization
  - Add tags as an array in the front matter: `tags: [python, bioinformatics]`
  - Tags are displayed below the post title
  - Tags link to the tags page with anchor navigation
  - Posts without tags are perfectly valid

### Pages
- Location: `_pages/`
- Layout: Use `layout: post` for pages (Tale uses post layout for all content pages)
- Current pages:
  - `_pages/about.md` - Short, subtle about section with social links
  - `_pages/archive.md` - Shows posts older than 1 year, grouped by year
  - `_pages/tags.md` - Lists all posts organized by tags, alphabetically
- Navigation: Custom navigation in `_includes/navigation.html`
  - Posts (home)
  - Archive
  - Tags
  - About

### Archive System
The site uses an automatic archive system that separates recent and old content:

- **Home Page** (`index.html` with `_layouts/home.html`):
  - Shows only posts from the last year (365 days)
  - Automatically calculated based on current date vs. post date
  - Recent posts appear here
  - If no recent posts exist, displays a message with link to archive

- **Archive Page** (`_pages/archive.md`):
  - Shows only posts older than 1 year
  - Posts are grouped by year (most recent year first)
  - Each year section shows the month and day with post title
  - Displays message if no archived posts exist yet

**Important**: When adding a new post, the archive automatically updates. Posts older than 1 year will move from the home page to the archive. No manual intervention needed.

### Tags System

The site includes a tagging system for categorizing posts:

- **Tags Page** (`_pages/tags.md`): Lists all posts grouped by their tags
- **Tag Display**: Tags appear below post titles on individual post pages
- **Clickable Tags**: Tags link to the tags page with anchor navigation
- **Optional**: Posts can have multiple tags, a single tag, or no tags at all

**Adding tags to posts:**
```yaml
---
layout: post
title: "Your Post Title"
author: "Đorđe Relić"
tags: [tag1, tag2, tag3]
---
```

**Tags are:**
- Displayed alphabetically on the tags page
- Shown below the post title with links to tag sections
- Completely optional - omit the `tags:` line if not needed

### Tags constellation

A force-directed graph of tags and posts sits at the top of the tags page above the list.
Tags are nodes sized 14–26 px by post count (up to max count), posts are 8 px nodes;
nodes are linked by springs if the post has that tag. The constellation reads its data
block from `<script type="application/json" id="constellation-data">` with shape
`{ "tags": [{ "name", "slug", "count" }], "posts": [{ "url", "title", "tags": [slug] }] }`,
so adding a tagged post updates the graph without any other change.

Physics live in the `C` constants at the top of `assets/js/constellation.js`: the box is
800×420 px with a 30 px margin; springs (length 90 px, stiffness 0.02) pull post-to-tag
pairs; inverse-square repulsion (strength 7000, clamped under 20 px) pushes all nodes;
centring pull (strength 0.0012, 2.4× stronger on the vertical axis) draws toward the box
centre so the layout settles as an ellipse rather than a circle; damping 0.9 dissipates
energy; at rest each node shows a static ±3 px sine offset (the wander) so the graph
breathes; the loop idles (stops itself) once at rest under pixel style and reduced motion,
waking on drag, theme change or visibility resume. Dragging pins
a node to the cursor; a drag under 4 px is a click. Positions are rounded to a 4 px grid
under pixel style.

DOM contract: `<div class="constellation"><svg>...</svg></div>` contains `<a class="node
node--tag|node--post">` links with `<circle>` or `<rect>` shapes and `<text>` labels,
plus `<line>` elements for springs. On hover or focus, the node and its neighbours get
`is-lit`; everything else gets `is-dim` (0.3 opacity). A tag click jumps to `#slug`,
a post click opens its URL. Labels sit to the right of their node, flipping to the left
in the right quarter of the box so they stay inside it. Touch uses two-tap on Chromium,
but single-tap on Safari and Firefox because click events there carry no pointer type.

Theme integration: tag and post rings stroke `--heading-color` and `--text-color`
respectively; links stroke `--border-color`; with color on, tag rings and lines use SVG
`<linearGradient id="constellation-rainbow">` (post rings keep the text color) with stops
from `--rainbow-stop-1` through `--rainbow-stop-7` (light or dark set chosen by the theme
axis), in user-space units spanning the box width; the SVG group carries
the shared hue cycle (`var(--cycle-name)`). Under pixel style, nodes are `<rect>` shapes with
`shape-rendering: crispEdges` and labels use `--pixel-font` at 12 px; wander and throw
are off. Under reduced motion, wander is off and the simulation runs to rest once, then
only interaction moves nodes.

Tests: `node --test _tests/constellation.test.cjs` runs Node tests of `step`, `highlightSet`,
`isClick` and `seed`; `node _tests/tools/constellation-check.cjs http://localhost:4000`
drives the browser. Hidden under 600 px; empty without JavaScript; the tag list below is
the primary structure.

### Theme axes

The look of the site is controlled by three independent switches, each a
`data-` attribute on `<html>`. Each switch has its nav button:

| Axis  | Attribute    | Values           | Default                    | Storage key |
|-------|--------------|------------------|----------------------------|-------------|
| theme | `data-theme` | `light`, `dark`  | system preference or light | `theme`     |
| color | `data-color` | `off`, `on`      | `off`                      | `color`     |
| style | `data-style` | `smooth`, `pixel`| `smooth`                   | `style`     |

**Color axis** (`[data-color="on"]`, last layer of `theme.css`): defines `--rainbow` and
`--rainbow-border`, swaps the link tokens, paints headings and the site title with the
gradient as a text fill, the three thick lines with `border-image`, thin section rules
with an animated `::after` strip, and rounded elements (tag chips, project cards, share
button) with a masked `::before` ring; only leaf accents and those pseudo-elements are
animated, never containers. Light with color on is an acid trip (candy stops, hot pink
links); `[data-color="on"][data-theme="dark"]` is abstract dread (oxblood, bruise, moss,
bone, moss links). The cycle is tokenised: `--cycle-name` and `--cycle-duration` give light
`rainbow-cycle` over 12 s and dark `dread-pulse` (±20° hue) over 40 s, paused by
`--rainbow-play` under `prefers-reduced-motion`; the keyframes animate only the
registered `--hue` angle (`@property`), and each animated element carries a static
`filter: var(--melt) hue-rotate(var(--hue))` (identity `--melt` by default; a `url()` filter
list does not interpolate, so it cannot live in the keyframes), plus `var(--glow)` on dark
headings. Body text carries a
`--halo` text-shadow (cream in light, black in dark); gradient headings and `pre` opt out.
Headings `h1`–`h3`, the site title and home-page post titles melt in smooth style: they set
`--melt` to `url(#melt-light)` or `url(#melt-dark)`, SVG filters defined once in
`_includes/melt-filter.html` (SMIL-animated turbulence feeding a displacement map; dark adds a
flickering ink bleed). `assets/js/melt.js` pauses the animations unless color is on, style is
smooth, motion is allowed and the tab is visible; its `meltState` is tested in
`_tests/melt.test.cjs`. Pixel style never melts.
Dark adds a glow on headings via `--cycle-glow-name`; the other cross-axis
blocks belong to the style axis below.
**Style axis** (`[data-style="pixel"]`, last layer of `theme.css`): one `@font-face` for
Silkscreen (`assets/fonts/`, OFL; downloads only when referenced), `--pixel-font` on
headings, nav, dates, chips, badges, tooltip and pagination with stepped-down sizes; zero
radii, 2px component borders, a hard offset shadow on the share button, dashed thick lines,
`image-rendering: pixelated` on images, `shape-rendering: crispEdges` on inline SVG, all
transitions off and hovers that translate by a pixel. Cross-axis with color
(`[data-style="pixel"][data-color="on"]`): `--rainbow-timing: steps(12)`, 2px ring
padding, and 3px rainbow strips to cover the 2px borders. With color on the thick lines
paint as solid rainbow bars because `border-image` replaces the dashed style; accepted.
The font fallback stack is monospace rather than the site's sans stack, on purpose.
Body text never changes font. Silkscreen has no Cyrillic, so Cyrillic text (СР, Српски)
falls back to the monospace stack under pixel style.

**Backdrop** (`assets/js/backdrop.js`): a fixed canvas behind the page drawn by one
fragment shader while `data-color="on"`: light is an acid trip (domain-warped candy
marbling, twelve glossy drips that swell a bead at the top edge, stretch, and fall as teardrops into a pool, with
per-drip constants precomputed in JS by `dripParams` and read from a 12x2 texture; the pointer stirring the paint),
dark is abstract dread (ink plumes, fog, a breathing vignette, candle flicker, a candle glow at
the pointer). Inside the reading column (`u_lane`, from `main`'s rect via the tested `laneFor`)
the field desaturates, pulls toward the page background and halves its warp. The script owns the element too: it creates
`<canvas class="backdrop" aria-hidden="true">` as the first child of `<body>` on start and
removes it 300 ms after color turns off (matching the background transition), so the canvas
exists only while color is on and color-off pages composite exactly as they did before.
Uniforms: time (an accumulator, so pause and resume never jump), resolution, eased pointer
and strength, `u_light` (theme band), `u_grid` (0 smooth, 1 pixel), `u_intensity`, `u_lane`.
Started/stopped by `themechange`; theme and style flips only update uniforms. Both styles render
at quarter resolution: smooth lets the upscale be the softness (no CSS blur); pixel passes
`u_grid` = 1 canvas px (one 4 px cell) and the canvas is upscaled with `image-rendering: pixelated`,
with coordinates and hue quantised in the shader. `<html>` carries the page background and
`<body>` is transparent under color on so the canvas shows through. There are no panels:
color never changes layout, and `node _tests/tools/layout-invariance.cjs <base url>` fails if
a theme or color flip moves any text within a style. Pure helpers
`uniformsFor`, `decide`, `ease`, `laneFor`, `dripParams` are tested in `_tests/backdrop.test.cjs`;
`_tests/tools/perf.cjs` probes frame time and long tasks and `_tests/tools/backdrop-check.cjs`
drives the color button in a browser. `_tests/tools/contrast-sample.cjs` checks body text stays ≥ 3:1 on the lane.

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

### Reference side notes

Write references as Kramdown footnotes: `[^1]` inline and `[^1]: text` definitions
placed under a `## References` heading at the very end of the post (Kramdown appends the
endnotes list at the end of the document, so the heading must be last to sit above it).
`assets/js/sidenotes.js` runs on pages with a `.post`: it intercepts clicks on
`a.footnote[href*="#fn:"]`, copies the matching `li#fn:N` markup (minus the return arrow)
into an `<aside class="sidenote" role="note">`, and places it in the right margin
(`sidenote--wide`, absolutely positioned at the citing block's `offsetTop`, width
clamped to the available margin, at 1200px and up) or inline on the row right under the
citing line: `lineBreakTarget` finds the first word after the reference that wraps to the
next line and splits the text node there (or inserts before an inline element such as a
link, so the note never lands inside one); a reference on the block's last line puts the
note after the block. Closing removes the note and `normalize()`s the parent. One note at a time; Esc, outside click, the close button, or the same
number again closes it; resize re-places it. The active number gets `is-active`. Styles
in `theme.css` next to the share button, with rainbow left rule under color and square
pixel variants at the end. Pure helpers `noteIdFor`, `placement`, `citingBlock`,
`nextLineIndex` are tested in `_tests/sidenotes.test.cjs`.

### Keyboard shortcuts

`?` opens a native `<dialog>` (`_includes/shortcuts.html`, rendered by the default
layout) listing the shortcuts. Its rows are the single source of truth: each carries
`data-shortcut` and either `data-toggle` (a theme axis button to click) or `data-href`
(a page). `assets/js/shortcuts.js` reads that table on load, listens for `keydown` on
the document, ignores modifier combinations and editable targets, and runs `step()`:
`t`/`c`/`p` click the matching `[data-toggle]` button, `g` arms a 1.5 s two-key
sequence for `h`/`a`/`r`/`t`, `l` opens the language menu (a row with `data-action` clicks the element whose `data-action-target` matches), `?` toggles the dialog, `Esc` and the backdrop close it.
The pure helpers (`ignores`, `readBindings`, `step`) are tested in
`_tests/shortcuts.test.cjs`. Dialog styles live in `theme.css` next to the nav buttons,
with pixel and color variants at the end of the file. To add a shortcut, add a row to
the include; nothing in the script needs to change.

### Assets
- CSS: `assets/css/`
- JavaScript: `assets/js/`

## Tale Theme Details

Tale is a minimal Jekyll theme designed specifically for storytellers and writers:

- **Design Philosophy**: Content-first, distraction-free reading experience
- **Features**: Responsive design, pagination, syntax highlighting
- **Permalink Structure**: `/:year-:month-:day/:title`

### Customization

To customize the Tale theme:
- Override layouts by creating files in `_layouts/`
- Override includes by creating files in `_includes/`
- Add custom CSS in `assets/css/` directory
- Tale's default typography is optimized for readability

## Deployment

The site is served from two places, both built automatically on every push to `master`:

- **GitHub Pages** at https://brlauuu.github.io, the canonical address (`url` in `_config.yml`).
- **Vercel** at https://brlauuu.dev (project `brlauuu-dev-redirect`, Git integration). `vercel.json`
  runs `bundle install` and `bundle exec jekyll build --config _config.yml,_config.vercel.yml` into
  `_site`, with `cleanUrls` so extensionless links like `/tags` resolve as they do on Pages. Pull
  requests get Vercel preview deployments. `_config.vercel.yml` sets `vercel: true` and nothing
  else, so canonical, feed and sitemap URLs still point at github.io. Both files are excluded from
  the built site.
- **Vercel Web Analytics** is on for the Vercel project. `_includes/head.html` adds
  `/_vercel/insights/script.js` only when `site.vercel` is set, so github.io pages carry no
  analytics and request nothing.

## Important Notes

- All dependencies are managed via `github-pages` gem to ensure compatibility
- Generated files (`_site/`, `.sass-cache/`, etc.) are gitignored
- The site excludes build configuration files as defined in `_config.yml`
