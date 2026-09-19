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
_includes/       # Custom HTML includes (head, navigation, theme-toggle, shortcuts, catalogue_item, project-card, constellation)
_layouts/        # Custom layouts (default, home)
assets/
  css/           # Custom CSS (theme.css, projects.css)
  js/            # JavaScript files (theme.js, shortcuts.js, project-stats.js, share-button.js, backdrop.js, constellation.js)
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
- Location: `_posts/`
- Naming: `YYYY-MM-DD-title.md`
- Format: Markdown with YAML front matter
- Required front matter:
  ```yaml
  ---
  layout: post
  title: "Post Title"
  author: "Đorđe Relić"
  tags: [tag1, tag2, tag3]  # Optional - posts can have tags or no tags
  ---
  ```
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
energy; at rest the graph wanders with ±3 px per node per frame to breathe. Dragging pins
a node to the cursor; a drag under 4 px is a click. Positions are rounded to a 4 px grid
under pixel style.

DOM contract: `<div class="constellation"><svg>...</svg></div>` contains `<a class="node
node--tag|node--post">` links with `<circle>` or `<rect>` shapes and `<text>` labels,
plus `<line>` elements for springs. On hover or focus, the node and its neighbours get
`is-lit`; everything else gets `is-dim` (0.3 opacity). A tag click jumps to `#slug`,
a post click opens its URL. Touch uses two-tap on Chromium, but single-tap on Safari and Firefox because click events there carry no pointer type.

Theme integration: tag and post rings stroke `--heading-color` and `--text-color`
respectively; links stroke `--border-color`; with color on, rings and lines use SVG
`<linearGradient id="constellation-rainbow">` with stops from `--rainbow-stop-1` through
`--rainbow-stop-7` (light or dark set chosen by the theme axis); the SVG group carries
the shared `rainbow-cycle` animation. Under pixel style, nodes are `<rect>` shapes with
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
animated, never containers. One `rainbow-cycle` keyframe (20 s hue rotation) is shared
by every accent and paused by `--rainbow-play` under `prefers-reduced-motion`. `[data-color="on"][data-theme="dark"]`
adds brighter stops, dimmed card borders and a glow on headings; the other cross-axis
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
Body text never changes font.

**Backdrop** (`assets/js/backdrop.js`): a fixed canvas behind the page drawn by one
fragment shader while `data-color="on"`. The script owns the element too: it creates
`<canvas class="backdrop" aria-hidden="true">` as the first child of `<body>` on start and
removes it 300 ms after color turns off (matching the background transition), so the canvas
exists only while color is on and color-off pages composite exactly as they did before.
Uniforms: time (an accumulator, so pause and resume never jump), resolution, eased pointer
and strength, `u_light` (theme band), `u_grid` (0 smooth, 4 pixel), `u_intensity`.
Started/stopped by `themechange`; theme and style flips only update uniforms. Smooth renders
at quarter resolution (the upscale is the softness, no CSS blur); pixel at full resolution
with coordinates and hue quantised in the shader. `<html>` carries the page background and
`<body>` is transparent under color on so the canvas shows through; `.nav-container`, `main`,
`footer` and `.project-sidebar` sit on `--panel-bg` at 92 % opacity, and only the nav and the
footer add a `backdrop-filter: blur(4px)` (opaque and bordered under pixel). Pure helpers
`uniformsFor`, `decide`, `ease` are tested in `_tests/backdrop.test.cjs`;
`_tests/tools/perf.cjs` probes frame time and long tasks and `_tests/tools/backdrop-check.cjs`
drives the color button in a browser.

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

### Keyboard shortcuts

`?` opens a native `<dialog>` (`_includes/shortcuts.html`, rendered by the default
layout) listing the shortcuts. Its rows are the single source of truth: each carries
`data-shortcut` and either `data-toggle` (a theme axis button to click) or `data-href`
(a page). `assets/js/shortcuts.js` reads that table on load, listens for `keydown` on
the document, ignores modifier combinations and editable targets, and runs `step()`:
`t`/`c`/`p` click the matching `[data-toggle]` button, `g` arms a 1.5 s two-key
sequence for `h`/`a`/`r`/`t`, `?` toggles the dialog, `Esc` and the backdrop close it.
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

This site deploys automatically via GitHub Pages when pushing to the `master` branch. No manual build or deployment steps are required.

## Important Notes

- All dependencies are managed via `github-pages` gem to ensure compatibility
- Generated files (`_site/`, `.sass-cache/`, etc.) are gitignored
- The site excludes build configuration files as defined in `_config.yml`
