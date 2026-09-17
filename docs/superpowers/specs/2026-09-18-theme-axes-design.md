# Theme axes: light/dark, color, pixel

Design for GitHub issue #4, "Add color and style themes".

## Goal

Visitors control three independent aspects of the site's look from three
buttons in the nav:

| Axis  | Values            | Default                         | Button icon (shows the state you get by clicking) |
|-------|-------------------|---------------------------------|----------------------------------------------------|
| theme | `light` / `dark`  | system preference, else `light` | unlit bulb in light, lit bulb in dark              |
| color | `off` / `on`      | `off`                           | colored rainbow when off, monochrome rainbow when on |
| style | `smooth` / `pixel`| `smooth`                        | square when smooth, circle when pixel              |

Every combination of the three works, giving eight looks. Each axis is
implemented on its own and never mentions the others, except for the few
places listed under "Cross-axis rules".

## Architecture

### Attributes

The `html` element carries `data-theme`, `data-color` and `data-style`. The
inline script in `_includes/head.html` sets all three before first paint from
`localStorage` (keys `theme`, `color`, `style`) or the defaults above, so there
is no flash of the wrong look. The existing `theme` key and its values are
kept, so current visitors keep their choice.

### Toggle script

`assets/js/theme.js` replaces `assets/js/dark-mode.js`. It is generic over the
three axes: each button carries `data-toggle="theme|color|style"` and the
script flips that axis between its two values, writes the attribute, persists
the value and updates the button's accessible label. The theme axis keeps the
current behaviour of following system changes until the visitor has chosen
explicitly.

After every flip the script dispatches a `themechange` event on `document`
with `detail = { theme, color, style }`. Future dynamic effects (for example a
pointer-reactive background) subscribe to this event to start and stop
themselves; nothing else about them is designed now.

The pure logic (next value for an axis, default resolution, label text) is
kept free of DOM access so it is tested with `node --test` in `_tests/`, like
`project-stats.js`.

### Stylesheets

`assets/css/dark-mode.css` is renamed to `assets/css/theme.css` and
restructured into layers, all loaded on every page:

1. **Tokens.** `:root` defines every variable with its light value.
   `[data-theme="dark"]` redefines the color variables. Colors that are today
   hard-coded (`#000`, `#fff`, nav link colors, share button colors, share
   feedback background) become variables. The `!important` rules and the
   duplicated `prefers-color-scheme` block are removed: the head script always
   sets `data-theme`, so the system preference is resolved once, in the script.
2. **Components.** Rules that apply the variables to Tale's elements. No rule
   in this layer names an axis.
3. **Color axis.** `[data-color="on"]` redefines the accent variables and adds
   the gradient rules. `[data-color="on"][data-theme="dark"]` adjusts stops
   and glow for dark.
4. **Style axis.** `[data-style="pixel"]` redefines font, radius, border width,
   shadow, image-rendering and transition variables, and loads the pixel font.

`assets/css/projects.css` keeps the home-only project card rules and reads
the same variables.

## Nav buttons

`_includes/navigation.html` renders the three buttons at the right end of the
nav after the text links, in the order rainbow, bulb, shape, separated from
the links by a small gap. On narrow screens they stay on one row.

Icons are inline SVG from `_includes/theme-icons.html`, 18px, drawn with
`currentColor` so they take the nav text color in every combination. The bulb
PNGs in `assets/imgs/` are replaced by SVG lit and unlit bulbs. Each icon
include contains both states; CSS shows one per attribute value. The rainbow's
"off" state is the only icon with fixed colors: five or six bands that do not
change between light and dark.

Each button is a `<button>` with an `aria-label` describing the action
("Switch to dark", "Turn color on", "Switch to pixel style"), updated by the
script on every flip. Hover in smooth style scales the icon as today; pixel
style replaces that with a one-pixel offset and no easing.

## Color axis

Body text, page background and code blocks stay neutral in both variants.

The rainbow is one gradient variable, `--rainbow`, with stops red, orange,
yellow, green, cyan, blue, violet, used everywhere an accent appears: site
title, headings, the underline on post titles, the catalogue line, the post
title line, section borders, tag chips, project card borders and the share
button. Headings and the site title use it as a text fill; lines and borders
use it as a background on a thin element or a border-image.

Links take a single hue from the gradient: magenta in light, cyan in dark. On
hover the underline becomes the rainbow.

Light: full-saturation stops, white page. Dark: brightened stops that hold up
on near-black, plus a faint colored text-shadow glow on headings; card borders
slightly dimmed.

Animation: elements carrying the rainbow share one keyframe that applies a
`hue-rotate` filter through 360 degrees over 20 seconds, so all accents move
together and text is not repainted. `prefers-reduced-motion: reduce` disables
the animation and leaves the rainbow static.

## Style axis

Font: Silkscreen (SIL Open Font License) self-hosted in `assets/fonts/`,
loaded only by the pixel axis rules so it is not downloaded otherwise. It
applies to the site title, nav links, headings, dates, the pinned label, tag
chips, project names and buttons. Body text keeps the current serif.

Shapes: all corner radii become 0 (tag chips, project cards, share button,
code blocks, version badge). Borders become 2px. Soft shadows become hard
offset shadows with no blur. The catalogue and post title lines become
thicker and stepped.

Images: post images and project logos use `image-rendering: pixelated`.

Motion: every transition duration becomes 0. Hovers move elements by one or
two pixels instead of scaling.

## Cross-axis rules

These are the only places one axis knows about another:

- `[data-color="on"][data-theme="dark"]`: brightened stops, glow, dimmed card
  borders.
- `[data-style="pixel"][data-color="on"]`: the hue cycle uses `steps()` so it
  jumps instead of sliding.
- `[data-style="pixel"]` shape icon: the circle is drawn as a stepped, blocky
  circle.

## Error handling

- `localStorage` unavailable or throwing: the script falls back to defaults
  and the buttons still work for the session.
- An unknown stored value (for example from a future change): treated as the
  default for that axis.
- JavaScript disabled: the site renders in the default combination; buttons
  do nothing. The head script and the attributes are the only dependency.
- Pixel font missing or blocked: `font-family` falls back to the current
  sans-serif stack; everything else in pixel style still applies.

## Testing

- `node --test _tests/`: unit tests for the toggle logic (next value, default
  resolution including system preference, storage fallback, unknown values,
  label text, `themechange` payload).
- `bundle exec jekyll build` on every task.
- Visual check of the eight combinations on the home page and one post page,
  plus the archive and tags pages in at least the default and the
  color-dark-pixel combination, in headless Chromium screenshots.
- Reduced motion checked once by emulating the media feature.

## Documentation

`README.md`, `CLAUDE.md` and `AGENTS.md` describe the three axes, the storage
keys, where each layer of CSS lives and how to add a future effect via
`themechange`. The "Dark Mode" section of `CLAUDE.md` is replaced.

## Task split

Each task is its own branch, PR and review. Later tasks depend on the one
before.

1. **Foundation (no visible change).** Rename to `theme.css`, convert
   hard-coded colors to tokens, remove `!important` and the duplicated
   system-preference block, replace `dark-mode.js` with the generic
   `theme.js` plus tests, set all three attributes in the head script, add
   the `themechange` event. Bulb becomes inline SVG. Screenshots before and
   after must match in light and dark.
2. **Color axis.** Rainbow tokens and rules for light and dark, animation and
   reduced motion, rainbow button and icon, docs.
3. **Pixel axis.** Self-hosted Silkscreen, pixel tokens and rules, shape button
   and icon, the two cross-axis rules involving pixel, docs.

Issue #4 is closed by the third PR. Tasks 2 and 3 are filed as separate
GitHub issues referencing #4 so progress is visible.
