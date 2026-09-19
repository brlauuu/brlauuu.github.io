# Tags page constellation

Design for GitHub issue #8, "new UI for the tags page". A force-directed graph of tags
and posts sits above the existing tag index and sections, which stay unchanged.

## Goal

Make the tags page interesting: tags and posts as floating, draggable nodes joined by
lines, that light up on hover, follow all three theme axes, and remain fully usable by
keyboard. The list below keeps working for search engines, screen readers and no-JS.

## Data

`_pages/tags.md` emits `<script type="application/json" id="constellation-data">` from
Liquid: `{ "tags": [{ "name", "slug", "count" }], "posts": [{ "url", "title", "tags": [slug] }] }`,
sorted like the list (tags alphabetical, posts by date descending). Adding a post with
tags needs no other change.

## Markup

`_includes/constellation.html` renders `<div class="constellation"><svg ...></svg></div>`
at the top of the tags page content, before the `.tags-page` grid. The SVG has a
`<title>` and `<desc>`, a `viewBox` of 800×420, `width="100%"`, and is empty until the
script fills it, so without JavaScript it has no height. Each node is
`<a class="node node--tag|node--post" href="..." aria-label="...">` containing a `<circle>`
(or a `<rect>` under pixel, see below) and a `<text>` label. Links are `<line>` elements
in a group drawn before the nodes.

## Layout and physics (`assets/js/constellation.js`)

- Tag radius: 14–26 px scaled by post count (max count → 26). Post radius: 8 px.
- Forces per frame: springs from each post to each of its tags (rest length 90 px,
  stiffness 0.02); inverse-square repulsion between all nodes, clamped for distances
  under 20 px, strength 7000; centring pull 0.0012 toward the box centre, 2.4× stronger on the vertical axis so the layout fills the wide box; a clamped node loses its velocity on that axis so the system settles. These values were tuned by simulation against the real tag data (the spec's first draft of 1800 / 0.005 collapsed eleven nodes into the middle third of the box). Velocity damping 0.9. Positions clamped inside the box with a 30 px margin.
- Seed positions on a ring (tags on an outer ring, posts inner) so the first frames unfold.
- Rest detection: when total kinetic energy falls below a threshold the loop switches to a
  low-amplitude wander (a slow sine offset of ±3 px per node) so the graph breathes.
- Dragging: `pointerdown` on a node sets pointer capture and pins the node to the cursor;
  `pointermove` updates it; `pointerup` releases with the last velocity (a flick throws).
  A drag under 4 px counts as a click and is not prevented.
- Loop runs on `requestAnimationFrame`, stops when the document is hidden and when the
  container is not displayed (mobile), resumes on visibility.
- Pure helpers exported for Node tests: `step(nodes, links, box, dt)`, `highlightSet(nodes,
  links, id)`, `isClick(dx, dy)`, `seed(tags, posts, box)`.

## Interaction

- Hover or focus on a tag: that tag, its posts and their lines get class `is-lit`; all
  other nodes and lines get `is-dim` (opacity 0.3). Hover or focus on a post lights its
  tags. Leaving or blurring clears both.
- Click on a tag: navigate to `#slug` (the section below), same as the chips. Click on a
  post: open the post. Touch: first tap lights, second tap on the same node acts (Chromium only; on Safari and Firefox the first tap acts, because click events there carry no pointer type).
- Labels: tag labels always visible beside the node; post labels only when lit.

## Theme integration (in `assets/css/theme.css`)

- Base: node fill `--bg-color`, tag ring stroke `--heading-color` 2 px, post ring
  `--text-color` 1.5 px, lines `--border-color` 1 px, labels `--text-color` in the heading
  sans-serif, 13 px tags / 12 px posts.
- Color on: tag rings and lines use SVG `<linearGradient id="constellation-rainbow">`
  with the seven rainbow stops (light or dark set chosen by CSS variables read into the
  gradient via `stop-color: var(--rainbow-stop-N)`; the seven stop tokens are added to
  the color-axis token blocks); the SVG group carries the shared `rainbow-cycle`
  animation so hues shift in phase with the letters.
- Pixel on: `<circle>` nodes are drawn as `<rect>` (the script reads `data-style` and
  re-renders shapes on `themechange`); `shape-rendering: crispEdges`; labels in
  `--pixel-font` at 12 px; the wander is off and positions are rounded to a 4 px grid each
  frame so motion steps; release-throw is off.
- Reduced motion: no wander, no throw; the simulation runs to rest once at load, then
  only hover, focus and drag move things.

## Accessibility

SVG `<title>` "Tags and posts" and `<desc>` explaining the interaction. Node accessible
names: "Tag python, 1 post" / post title. Focus order tags then posts (DOM order). Visible
focus ring (`outline` on the `<a>` via `:focus-visible`, 2 px `--link-color`). The list
below is unchanged and remains the primary structure.

## Mobile

Under 600 px the container is `display: none` and the script does not start (it checks
`matchMedia('(min-width: 600px)')` and listens for changes).

## Testing

- Node: `step` conserves clamping and damping, `highlightSet` returns the right ids for a
  tag and for a post, `isClick` threshold, `seed` puts every node inside the box.
- Browser (`_tests/tools/constellation-check.cjs`): node count equals the JSON; hovering a
  tag lights exactly its posts; clicking a tag changes the hash to its slug; dragging a
  node moves it; at 375 px width the SVG has no children and the script did not start.
- Screenshots: default light, dark, color on, pixel, and one mid-drag.

## Documentation

README and CLAUDE.md describe the constellation, its data block, and the theme hooks.
