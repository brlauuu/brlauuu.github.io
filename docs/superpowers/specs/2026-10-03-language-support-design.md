# Language support

Design for GitHub issue #34, "Add language tags and overall language support".

## Goal

The blog will eventually carry every post in three languages. This step tags posts with
their language and adds a language choice: picking a language filters every post list to
that language and switches the site's own text. All posts are English today, so YU and СР
show "no posts yet" notes until the first translations arrive.

## Languages

| Key  | Menu name | Flag                                   | Badge | `lang` attribute |
|------|-----------|----------------------------------------|-------|------------------|
| `en` | English   | US flag                                | US    | `en`             |
| `yu` | Naš       | SFRY flag with the red star (pre-1991) | YU    | `sh`             |
| `sr` | Српски    | Serbian civil tricolour                | СР    | `sr-Cyrl`        |

`yu` and `sr` are the same language in Latin and Cyrillic script; their strings always
say the same thing.

## Posts

- Front matter `lang: en | yu | sr`. The four existing posts get `lang: en`;
  `_config.yml` defaults `lang: en` for posts that omit it.
- Future translations of one post share `ref: <key>` (e.g. `ref: bottleneck-moved`).
  Nothing has a `ref` yet; the post page already reads it (see Post pages).

## The language axis

- `data-lang` on `<html>`, a fourth axis beside `data-theme`, `data-color` and `data-style`,
  stored in localStorage under `lang`. Default `en` for a first visit; the browser
  language is never consulted.
- The inline script in `_includes/head.html` sets `data-lang` before first paint, and sets
  `<html lang>`: the post's `lang` attribute value on post pages (the body text is in that
  language), the chosen language's value on every other page. `_layouts/default.html`
  drops its hard-coded `lang="en"` (the build writes the post's or `en` as the no-JS value).
- `assets/js/theme.js` adds `lang` to the `themechange` detail
  (`{ theme, color, style, lang }`). Language has three values, so it is set, not toggled:
  `assets/js/lang.js` owns the menu and dispatches `themechange` after writing the
  attribute and storage.

## The dropdown (`_includes/lang-menu.html`, `assets/js/lang.js`)

- First item in `.nav-toggles`, before the color button, on desktop and mobile.
- The button shows only the active language's flag (24×16 inline SVG, all three flags in
  the markup, CSS shows the active one, like the toggle icons). `aria-label`
  "Language: <name>", `aria-expanded`, `aria-controls` the panel.
- The panel, aligned under the button, has one row per language: flag, badge, menu name.
  The active row has `aria-current="true"`. Choosing a row sets the language, saves it,
  closes the panel and dispatches `themechange`.
- Closes on Esc, outside click, choosing, or the button again. Up/Down move between rows
  and wrap; focus returns to the button on close.
- No JavaScript: the menu is a `<details>` element that still opens; rows do nothing and
  the site stays English, as the other switches do nothing without JavaScript.
- Flags are simplified for 16 px: US with 7 stripes and a plain blue canton; SFRY blue,
  white, red with a gold-edged red star across the stripes; Serbia red, blue, white without
  the coat of arms.
- Keyboard shortcut `l` opens the menu: a row in `_includes/shortcuts.html` with
  `data-action="lang-menu"`; `shortcuts.js` learns `data-action` (it clicks the element
  `[data-action-target="<action>"]`, here the menu button).
- Styles from the existing tokens, like the shortcuts dialog. Pixel: square panel, 2px
  border, `--pixel-font` on badges and names, `crispEdges` on flags. Color on: the masked
  rainbow ring used by tag chips and the share button.

## Site text (`_data/i18n.yml`, `_includes/t.html`)

`{% include t.html key="archive" %}` writes
`<span lang="en" data-t="en">Archive</span><span lang="sh" data-t="yu">Arhiva</span><span lang="sr-Cyrl" data-t="sr">Архива</span>`;
CSS hides every `[data-t]` that does not match `html[data-lang]`. Strings that take a
number (reading time) are written as a template per language with the number filled in.

| Key            | en                             | yu                               | sr                               |
|----------------|--------------------------------|----------------------------------|----------------------------------|
| archive        | Archive                        | Arhiva                           | Архива                           |
| tags           | Tags                           | Kategorije                       | Категорије                       |
| about          | About                          | O meni                           | О мени                           |
| written_by     | Written by                     | Autor                            | Аутор                            |
| on             | on                             | (omitted)                        | (omitted)                        |
| reading        | N words, ~M min read           | N reči, ~M min čitanja           | N речи, ~M мин читања            |
| tags_label     | Tags:                          | Kategorije:                      | Категорије:                      |
| no_posts       | No posts in this language yet. | Još nema članaka na ovom jeziku. | Још нема чланака на овом језику. |
| only_in        | Only available in:             | Dostupno samo na:                | Доступно само на:                |
| months         | January … December             | januar … decembar                | јануар … децембар                |

Dates follow the language: "October 03, 2026" (en), "3. oktobar 2026." (yu),
"3. октобар 2026." (sr). Not translated in this step: post and About bodies, the site
title, `<title>` and SEO tags, the feed and the sitemap.

## Filtering

All in CSS, keyed on `html[data-lang]`:

- Post entries on the home page (`catalogue_item.html`), Archive and Tags carry
  `data-langs="<lang>"`; entries of another language are hidden.
- Groups that could empty out (Archive year sections, Tags sections and their index
  links) carry `data-langs="en yu"`, computed by Liquid at build time, and are hidden when
  the active language is not in the list.
- Each list page writes, at build time, a `no_posts` note for every language with no
  posts there (home: no posts from the last year in that language) marked
  `data-t="<lang>"`, like any one-language text; CSS shows the note only for the active
  language.
- Constellation: each post in `#constellation-data` carries `lang`. `constellation.js`
  builds the graph from the active language's posts and the tags they use, and rebuilds
  (reseeds) on a `themechange` whose `lang` changed. With no posts it shows nothing; the
  page's `no_posts` note covers it.

## Post pages

- The post body is never hidden.
- When the chosen language differs from the post's, a short note under the header reads
  `only_in` plus the post language's flag and name. If a post with the same `ref` exists
  in the chosen language, the note links to it instead (text: that version's flag and
  name). The note is one element per language, shown by CSS like the strings.
- Previous/next arrows, the feed and the sitemap stay language-agnostic.

## Testing

- `_tests/lang.test.cjs`: `resolveLang` (stored valid value, stored invalid value,
  nothing stored → `en`) and `menuStep` (Up/Down wrap at both ends). `theme.test.cjs`
  covers `lang` in the event detail; `shortcuts.test.cjs` covers `l` and `data-action`.
- Browser, with a throwaway YU post added locally (deleted before the PR): switching
  filters home, Archive, Tags and the constellation; empty notes appear only where
  expected; nav and post header switch; `<html lang>` is right on posts and pages; the
  choice survives reload; the menu works by keyboard, Esc and outside click.
- Screenshots at 1280 and 375 px, smooth and pixel, light and dark, color on.
- Regression: with English chosen, screenshots match master pixel for pixel outside the
  nav (the new flag button shifts the nav); the HTML differs (strings become spans);
  `_tests/tools/layout-invariance.cjs` still passes.
