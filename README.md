Personal blog.

## Project cards

Edit `_data/projects.yml` to add, remove, or reorder projects. Each entry creates one sidebar card; there is no separate Projects page.

```yaml
- name: My project
  repository: owner/repository
  logo_url: https://raw.githubusercontent.com/owner/repository/main/public/icon.png
  website_fallback: https://my-project.example
  fallbacks:
    stars: "—"
    forks: "—"
  counter:
    label: downloads
    url: https://my-project.example/api/public-stats
    field: count
    fallback: "—"
```

- `name` and `repository` are required. Other settings are optional.
- GitHub supplies stars, forks, and the website from the repository's **About → Website** field. `website_fallback` is used if that field is empty, invalid, or GitHub cannot be reached. With neither URL, the website icon is muted and disabled. The GitHub icon always links to the repository.
- The version badge next to the name reads the first line of a `VERSION` file at the root of the repository's default branch (for example `1.2.0` or `v1.2.0-beta.1`). Repositories without that file show no badge.
- `logo_url` loads directly from the supplied URL. A raw GitHub URL following `main` picks up future changes after normal browser/CDN caching. Broken images are hidden. Current icons are monochrome and receive contrast/inversion styling for light and dark themes; revisit that styling before using a full-color logo.
- `counter.label` is `downloads` (default) or `users`; this selects the icon and accessible label.
- `counter.url` is your public JSON endpoint. Leave it blank until available. No download/user totals are inferred from GitHub release downloads or fabricated.
- `counter.field` selects a JSON field, defaulting to `count`. Use a dot path such as `stats.active_users` for nested data, or `field: ""` when the entire response is a number.
- Counts must be nonnegative integer JSON numbers, not strings. Large values display compactly; hover or assistive technology exposes the full number.
- `fallbacks.stars`, `fallbacks.forks`, and `counter.fallback` accept a nonnegative integer or `"—"`. Defaults are dashes, indicating unavailable data. Numeric fallbacks are labeled as fallback values in tooltips.

A minimal counter response:

```json
{"count": 1234}
```

A nested response for `field: stats.active_users`:

```json
{"stats": {"active_users": 56}}
```

The endpoint must support browser requests without authentication. For another domain, allow the blog origin through CORS (or use `Access-Control-Allow-Origin: *` for a fully public endpoint). Use HTTPS for production URLs. Do not put private API keys or tokens in this file: settings are delivered to every browser.

Data sources load independently. Network failures, non-success responses, invalid JSON/counts, CORS blocks, and requests taking longer than eight seconds retain the fallback. Website destinations are not health-checked: a valid URL can still lead to a site that is offline. Fallbacks apply to data loading, not a guarantee that external websites are running.

## Theme axes

Three switches set `data-theme` (`light`/`dark`), `data-color` (`off`/`on`) and
`data-style` (`smooth`/`pixel`) on `<html>`; the nav has the rainbow (color), bulb (theme) and shape (style) buttons; choices persist in localStorage under
the same names. `assets/css/theme.css` defines the light and dark variables;
`assets/js/theme.js` handles the buttons and emits `themechange` on `document`.
The design is in `docs/superpowers/specs/2026-09-18-theme-axes-design.md`.

With color on, headings, the site title, lines, borders, tag chips, project cards and the
share button carry a rainbow gradient (`--rainbow` in `theme.css`, brighter stops in dark)
and links turn magenta (light) or cyan (dark). Body text and code blocks stay neutral. The
hue cycles once every 12 seconds; `prefers-reduced-motion` pauses it.

With color on, a WebGL plasma (`assets/js/backdrop.js`) runs behind the page and reacts
to the pointer; the content sits on a panel. The script creates its canvas when color turns
on and removes it 300 ms after color turns off, so nothing sits behind the page otherwise.
It follows light/dark (palette band) and pixel (chunky blocks, opaque panels), pauses when
the tab is hidden, freezes under `prefers-reduced-motion`, and shows nothing without WebGL.
`INTENSITY` at the top of the script is the one knob.

With pixel style on, headings and the site chrome use Silkscreen (SIL Open Font License,
self-hosted in `assets/fonts/`, downloaded only when pixel is on), corners are square,
borders 2px, the share button casts a hard shadow, images render pixelated and nothing
eases. Body text keeps its font. Combined with color on, the hue cycle steps instead of
sliding.

## Keyboard shortcuts

Press `?` on any page for the list. `t`, `c` and `p` flip the theme, color and style
switches (they click the nav buttons, so the choice persists like a click would). `g`
followed by `h`, `a`, `r` or `t` goes to home, about, archive or tags. Shortcuts are
ignored while typing in a field or with a modifier key held. The key table lives in
`_includes/shortcuts.html`; `assets/js/shortcuts.js` reads it from the dialog rows, and
its pure logic is tested in `_tests/shortcuts.test.cjs`.

## Tags constellation

The tags page features a force-directed constellation of tags and posts as draggable,
interactive nodes. The constellation reads its data from `<script type="application/json"
id="constellation-data">` emitted by `_pages/tags.md`, and is rendered by `assets/js/constellation.js` with styling from `assets/css/theme.css`. It responds to all three
theme axes, is fully keyboard-accessible, and remains hidden under 600 px width so the
existing tag list is the primary interface on mobile. Touch interaction uses two-tap on Chromium, but single-tap on Safari and Firefox. Without JavaScript, the page shows
the tag list only. Check the constellation with `node _tests/tools/constellation-check.cjs http://localhost:4000`.

## Local preview and checks

```sh
bundle exec jekyll serve --host 127.0.0.1 --port 4000
bundle exec jekyll build
node --test _tests/project-stats.test.cjs
node --test _tests/theme.test.cjs
node --test _tests/shortcuts.test.cjs
node --test _tests/backdrop.test.cjs
node --test _tests/constellation.test.cjs
node --check assets/js/project-stats.js
node --check assets/js/theme.js
node _tests/tools/perf.cjs http://localhost:4000/ 10
node _tests/tools/backdrop-check.cjs http://localhost:4000/
```

The dependency-free tests use Node's built-in test runner. `_tests/` is excluded from Jekyll output by its underscore prefix.
