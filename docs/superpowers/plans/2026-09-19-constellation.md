# Tags Constellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A draggable, force-directed constellation of tags and posts above the existing tags list, lit on hover and focus, following light/dark, color and pixel, hidden under 600 px, keyboard accessible.

**Architecture:** `_pages/tags.md` emits a JSON data block and an include with an empty SVG. `assets/js/constellation.js` holds pure physics/highlight helpers (exported for Node tests) plus `init()` that builds the SVG nodes as real links, runs the simulation on `requestAnimationFrame`, handles hover/focus/drag/touch, and re-renders shapes on `themechange`. Styling lives in `assets/css/theme.css` under the usual axis selectors.

**Tech Stack:** Jekyll 3.10 / Liquid, SVG, plain JS, Node 20 `node --test`, Playwright headless Chromium.

**Spec:** `docs/superpowers/specs/2026-09-19-tags-constellation-design.md`

## Global Constraints

- Constants exactly: box 800×420, margin 30; tag radius 14–26 by count; post radius 8; spring rest 90, stiffness 0.02; repulsion 1800 clamped under 20 px; centring 0.005; damping 0.9; click threshold 4 px; grid 4 px under pixel; wander ±3 px.
- Nodes are `<a>` elements with `aria-label` "Tag <name>, <n> post(s)" or the post title; tags before posts in DOM order.
- Below 600 px: container `display: none` and the script does not start.
- Every color/pixel rule under `[data-color="on"]` / `[data-style="pixel"]`; no `!important`. Pages other than tags are untouched (byte-identical to master).
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_013dSYwteU9vJGeTHhARhj8p`. Branch `8-constellation`.

## File structure

| File | Responsibility |
|------|----------------|
| `assets/js/constellation.js` | Pure helpers (`seed`, `step`, `highlightSet`, `isClick`, `radiusFor`) and `init` (DOM build, loop, interaction, themechange re-render). |
| `_tests/constellation.test.cjs` | Tests for the pure helpers. |
| `_includes/constellation.html` | Container with the empty SVG, title, desc, gradient defs. |
| `_pages/tags.md` | JSON data block and the include, above `.tags-page`. |
| `_layouts/default.html` | Script tag (deferred) for the constellation script. |
| `assets/css/theme.css` | Base, highlight, color, pixel, reduced-motion and mobile rules; seven `--rainbow-stop-N` tokens. |
| `_tests/tools/constellation-check.cjs` | Browser assertions. |
| `README.md`, `CLAUDE.md` | Docs. |

---

### Task 1: Pure helpers with tests

**Files:** Create `assets/js/constellation.js`, `_tests/constellation.test.cjs`.

**Interfaces:** Produces `radiusFor(count, max)`, `seed(tags, posts, box) -> {nodes, links}`, `step(nodes, links, box) -> energy`, `highlightSet(nodes, links, id) -> Set`, `isClick(dx, dy)`, and the constants object `C`. Node shape: `{ id, kind: 'tag'|'post', label, href, slug?, count?, tags?, r, x, y, vx, vy, pinned }`. Link shape: `{ source, target }` (ids).

- [ ] **Step 1: Write the failing tests**

```js
const test = require('node:test');
// Loose assert: objects built inside the vm sandbox have their own Object.prototype.
const assert = require('node:assert');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../assets/js/constellation.js'), 'utf8');

function load() {
  const module = { exports: {} };
  vm.runInNewContext(script, { module, Object, Math, Map, Set });
  return module.exports;
}

const tags = [{ name: 'python', slug: 'python', count: 1 }, { name: 'tools', slug: 'tools', count: 2 }];
const posts = [
  { url: '/a', title: 'A', tags: ['python', 'tools'] },
  { url: '/b', title: 'B', tags: ['tools'] }
];
const box = { w: 800, h: 420, margin: 30 };

test('radiusFor scales tags between 14 and 26 by count', () => {
  const { radiusFor } = load();
  assert.equal(radiusFor(2, 2), 26);
  assert.equal(radiusFor(1, 2), 20);
  assert.equal(radiusFor(0, 0), 14);
});

test('seed builds nodes inside the box, tags first, with one link per post tag', () => {
  const { seed } = load();
  const { nodes, links } = seed(tags, posts, box);
  assert.equal(nodes.length, 4);
  assert.deepEqual(nodes.map((n) => n.kind), ['tag', 'tag', 'post', 'post']);
  assert.equal(nodes[1].r, 26);
  assert.equal(nodes[2].r, 8);
  assert.equal(nodes[0].href, '#python');
  assert.equal(nodes[2].href, '/a');
  for (const n of nodes) assert.ok(n.x >= box.margin && n.x <= box.w - box.margin && n.y >= box.margin && n.y <= box.h - box.margin);
  assert.deepEqual(links, [{ source: 'post:/a', target: 'tag:python' }, { source: 'post:/a', target: 'tag:tools' }, { source: 'post:/b', target: 'tag:tools' }]);
});

test('seed ignores post tags that have no tag node', () => {
  const { seed } = load();
  const { links } = seed(tags, [{ url: '/c', title: 'C', tags: ['missing', 'tools'] }], box);
  assert.deepEqual(links, [{ source: 'post:/c', target: 'tag:tools' }]);
});

test('step keeps nodes inside the box, damps velocity, and settles', () => {
  const { seed, step } = load();
  const { nodes, links } = seed(tags, posts, box);
  let energy = Infinity;
  for (let i = 0; i < 600; i++) energy = step(nodes, links, box);
  for (const n of nodes) {
    assert.ok(n.x >= box.margin + n.r - 1e-6 && n.x <= box.w - box.margin - n.r + 1e-6, `x in box: ${n.x}`);
    assert.ok(n.y >= box.margin + n.r - 1e-6 && n.y <= box.h - box.margin - n.r + 1e-6, `y in box: ${n.y}`);
  }
  assert.ok(energy < 0.05, `settled energy ${energy}`);
  const a = nodes.find((n) => n.id === 'post:/a'), t = nodes.find((n) => n.id === 'tag:tools');
  assert.ok(Math.hypot(a.x - t.x, a.y - t.y) < 200, 'linked nodes end up near each other');
});

test('step leaves a pinned node exactly where it is', () => {
  const { seed, step } = load();
  const { nodes, links } = seed(tags, posts, box);
  nodes[0].pinned = true; nodes[0].x = 100; nodes[0].y = 100;
  for (let i = 0; i < 50; i++) step(nodes, links, box);
  assert.equal(nodes[0].x, 100);
  assert.equal(nodes[0].y, 100);
});

test('highlightSet returns the node and its neighbours', () => {
  const { seed, highlightSet } = load();
  const { nodes, links } = seed(tags, posts, box);
  assert.deepEqual([...highlightSet(nodes, links, 'tag:tools')].sort(), ['post:/a', 'post:/b', 'tag:tools']);
  assert.deepEqual([...highlightSet(nodes, links, 'post:/a')].sort(), ['post:/a', 'tag:python', 'tag:tools']);
  assert.deepEqual([...highlightSet(nodes, links, 'tag:python')].sort(), ['post:/a', 'tag:python']);
});

test('isClick uses a 4 px threshold', () => {
  const { isClick } = load();
  assert.equal(isClick(1, 2), true);
  assert.equal(isClick(3, 3), false);
  assert.equal(isClick(0, 4), false);
});
```

- [ ] **Step 2: Run** `node --test _tests/constellation.test.cjs` — FAIL with ENOENT.

- [ ] **Step 3: Write the helpers**

```js
// Tags page constellation: tags and posts as draggable nodes on a small force
// layout. Pure helpers first (tested in Node), DOM wiring in init() below.
(() => {
  const C = {
    box: { w: 800, h: 420, margin: 30 },
    tagRadius: [14, 26], postRadius: 8,
    springLength: 90, springK: 0.02,
    repel: 1800, repelMin: 20,
    center: 0.005, damping: 0.9,
    clickPx: 4, grid: 4, wander: 3, restEnergy: 0.05
  };

  function radiusFor(count, max) {
    const [lo, hi] = C.tagRadius;
    return max > 0 ? lo + (hi - lo) * (count / max) : lo;
  }

  function seed(tags, posts, box) {
    const cx = box.w / 2, cy = box.h / 2;
    const max = tags.reduce((m, t) => Math.max(m, t.count), 0);
    const nodes = [];
    tags.forEach((t, i) => {
      const a = (i / Math.max(1, tags.length)) * Math.PI * 2;
      nodes.push({ id: `tag:${t.slug}`, kind: 'tag', label: t.name, slug: t.slug, count: t.count, href: `#${t.slug}`,
        r: radiusFor(t.count, max), x: cx + Math.cos(a) * 150, y: cy + Math.sin(a) * 120, vx: 0, vy: 0, pinned: false });
    });
    posts.forEach((p, i) => {
      const a = (i / Math.max(1, posts.length)) * Math.PI * 2 + 0.5;
      nodes.push({ id: `post:${p.url}`, kind: 'post', label: p.title, href: p.url, tags: p.tags || [],
        r: C.postRadius, x: cx + Math.cos(a) * 60, y: cy + Math.sin(a) * 50, vx: 0, vy: 0, pinned: false });
    });
    const ids = new Set(nodes.map((n) => n.id));
    const links = [];
    for (const p of nodes) {
      if (p.kind !== 'post') continue;
      for (const slug of p.tags) if (ids.has(`tag:${slug}`)) links.push({ source: p.id, target: `tag:${slug}` });
    }
    return { nodes, links };
  }

  // One simulation frame. Returns the total kinetic energy after the frame.
  function step(nodes, links, box) {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (const n of nodes) { n.fx = 0; n.fy = 0; }
    for (const l of links) {
      const a = byId.get(l.source), b = byId.get(l.target);
      if (!a || !b) continue;
      let dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const f = (d - C.springLength) * C.springK;
      dx /= d; dy /= d;
      a.fx += dx * f; a.fy += dy * f; b.fx -= dx * f; b.fy -= dy * f;
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        if (d < 1e-3) { dx = 1e-3 * (j - i); dy = 0; d = 1e-3; }
        const dd = Math.max(d, C.repelMin);
        const f = C.repel / (dd * dd);
        dx /= d; dy /= d;
        a.fx -= dx * f; a.fy -= dy * f; b.fx += dx * f; b.fy += dy * f;
      }
    }
    const cx = box.w / 2, cy = box.h / 2;
    let energy = 0;
    for (const n of nodes) {
      if (n.pinned) { n.vx = 0; n.vy = 0; continue; }
      n.fx += (cx - n.x) * C.center;
      n.fy += (cy - n.y) * C.center;
      n.vx = (n.vx + n.fx) * C.damping;
      n.vy = (n.vy + n.fy) * C.damping;
      n.x += n.vx; n.y += n.vy;
      const m = box.margin + n.r;
      n.x = Math.min(box.w - m, Math.max(m, n.x));
      n.y = Math.min(box.h - m, Math.max(m, n.y));
      energy += n.vx * n.vx + n.vy * n.vy;
    }
    return energy;
  }

  function highlightSet(nodes, links, id) {
    const set = new Set([id]);
    for (const l of links) {
      if (l.source === id) set.add(l.target);
      if (l.target === id) set.add(l.source);
    }
    return set;
  }

  function isClick(dx, dy) {
    return Math.hypot(dx, dy) < C.clickPx;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { C, radiusFor, seed, step, highlightSet, isClick };
  }
})();
```

- [ ] **Step 4: Run** the file (7 passed) and `node --test _tests/` (38 passed).

- [ ] **Step 5: Commit** "Add the constellation's physics and highlight helpers with tests" with the two trailers.

---

### Task 2: Data block, markup, rendering, loop and interaction

**Files:** Modify `_pages/tags.md`; create `_includes/constellation.html`; modify `_layouts/default.html`; modify `assets/js/constellation.js`; modify `assets/css/theme.css` (base rules).

**Interfaces:** Consumes Task 1 helpers. Produces the DOM contract for Task 3: `.constellation > svg` containing `<defs>` with `linearGradient#constellation-rainbow` (7 `<stop>`s), `g.constellation-links > line.link`, `g.constellation-nodes > a.node.node--tag|node--post` each with a `<circle>` or `<rect>` (class `shape`) and `<text class="label">`; classes `is-lit`, `is-dim` on nodes and lines; `data-id` on nodes and lines' `data-source`/`data-target`.

- [ ] **Step 1: JSON and include in the tags page**

In `_pages/tags.md`, directly after `{% assign tags = site.tags | sort %}` add:

```liquid
{% assign tagged_posts = site.posts | where_exp: "post", "post.tags.size > 0" %}
<script type="application/json" id="constellation-data">{"tags":[{% for tag in tags %}{"name":{{ tag[0] | jsonify }},"slug":{{ tag[0] | slugify | jsonify }},"count":{{ tag[1] | size }}}{% unless forloop.last %},{% endunless %}{% endfor %}],"posts":[{% for post in tagged_posts %}{"url":{{ post.url | relative_url | jsonify }},"title":{{ post.title | jsonify }},"tags":[{% for t in post.tags %}{{ t | slugify | jsonify }}{% unless forloop.last %},{% endunless %}{% endfor %}]}{% unless forloop.last %},{% endunless %}{% endfor %}]}</script>
{% include constellation.html %}
```

(Keep it before `{% if tags.size > 0 %}`; the include is harmless with no tags.)

Create `_includes/constellation.html`:

```html
{% comment %}
Force-directed constellation of tags and posts, filled by assets/js/constellation.js
from the #constellation-data JSON. Empty (zero height) without JavaScript; hidden
under 600px by CSS.
{% endcomment %}
<div class="constellation" id="constellation">
  <svg viewBox="0 0 800 420" width="100%" role="group" aria-labelledby="constellation-title" aria-describedby="constellation-desc">
    <title id="constellation-title">Tags and posts</title>
    <desc id="constellation-desc">Each tag is linked to its posts. Hover or focus a node to highlight its connections; drag to rearrange; activate a tag to jump to its section.</desc>
    <defs>
      <linearGradient id="constellation-rainbow" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0"/><stop offset="0.166"/><stop offset="0.333"/><stop offset="0.5"/><stop offset="0.666"/><stop offset="0.833"/><stop offset="1"/>
      </linearGradient>
    </defs>
    <g class="constellation-links"></g>
    <g class="constellation-nodes"></g>
  </svg>
</div>
```

In `_layouts/default.html` add `    <script src="{{ "/assets/js/constellation.js" | relative_url }}" defer></script>` after the backdrop script.

- [ ] **Step 2: Base CSS**

In `assets/css/theme.css`, after the `.tags-page` media block (the one that sets `grid-template-columns: 220px 1fr`), add:

```css
/* Tags constellation: hidden on small screens, empty without JavaScript. */
.constellation {
  display: none;
  margin: 0 0 2rem;
}

@media (min-width: 600px) {
  .constellation {
    display: block;
  }
}

.constellation svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.constellation .link {
  stroke: var(--border-color);
  stroke-width: 1;
  transition: opacity 0.2s ease;
}

.constellation .node {
  cursor: grab;
  outline: none;
  transition: opacity 0.2s ease;
}

.constellation .node:active {
  cursor: grabbing;
}

.constellation .node .shape {
  fill: var(--bg-color);
  stroke: var(--heading-color);
  stroke-width: 2;
}

.constellation .node--post .shape {
  stroke: var(--text-color);
  stroke-width: 1.5;
}

.constellation .label {
  fill: var(--text-color);
  font-family: Arial, Helvetica, "Helvetica Neue", sans-serif;
  font-size: 13px;
  pointer-events: none;
}

.constellation .node--post .label {
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.constellation .node--post.is-lit .label {
  opacity: 1;
}

.constellation .is-dim {
  opacity: 0.3;
}

.constellation .node.is-lit .shape {
  stroke: var(--link-color);
}

.constellation .link.is-lit {
  stroke: var(--link-color);
  stroke-width: 2;
}

.constellation .node:focus-visible .shape {
  stroke: var(--link-color);
  stroke-width: 3;
}
```

- [ ] **Step 3: init()**

In `assets/js/constellation.js`, replace the final export block with:

```js
  const SVG = 'http://www.w3.org/2000/svg';

  function init(doc, win) {
    const container = doc.getElementById('constellation');
    const data = doc.getElementById('constellation-data');
    if (!container || !data) return;
    let parsed;
    try { parsed = JSON.parse(data.textContent); } catch { return; }
    if (!parsed.tags?.length) return;
    const svg = container.querySelector('svg');
    const linksG = svg.querySelector('.constellation-links');
    const nodesG = svg.querySelector('.constellation-nodes');
    const wide = win.matchMedia('(min-width: 600px)');
    const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
    const html = doc.documentElement;
    const box = C.box;

    const { nodes, links } = seed(parsed.tags, parsed.posts || [], box);
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const el = new Map();      // node id -> <a>
    const lineEl = [];         // parallel to links

    function make(tag, attrs) {
      const e = doc.createElementNS(SVG, tag);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
      return e;
    }

    function shapeFor(n) {
      const pixel = html.dataset.style === 'pixel';
      const s = pixel
        ? make('rect', { class: 'shape', x: -n.r, y: -n.r, width: n.r * 2, height: n.r * 2 })
        : make('circle', { class: 'shape', r: n.r });
      return s;
    }

    function build() {
      for (const l of links) {
        const line = make('line', { class: 'link', 'data-source': l.source, 'data-target': l.target });
        linksG.appendChild(line);
        lineEl.push(line);
      }
      for (const n of nodes) {
        const a = make('a', { class: `node node--${n.kind}`, href: n.href, 'data-id': n.id });
        a.setAttribute('aria-label', n.kind === 'tag' ? `Tag ${n.label}, ${n.count} post${n.count === 1 ? '' : 's'}` : n.label);
        a.appendChild(shapeFor(n));
        const t = make('text', { class: 'label', x: n.r + 6, y: 4 });
        t.textContent = n.label;
        a.appendChild(t);
        nodesG.appendChild(a);
        el.set(n.id, a);
      }
    }

    function reshape() {
      for (const n of nodes) {
        const a = el.get(n.id);
        a.replaceChild(shapeFor(n), a.querySelector('.shape'));
      }
    }

    function render(t) {
      const pixel = html.dataset.style === 'pixel';
      const snap = (v) => (pixel ? Math.round(v / C.grid) * C.grid : v);
      for (const n of nodes) {
        let x = n.x, y = n.y;
        if (!pixel && !reduced.matches && !n.pinned && atRest) {
          x += Math.sin(t * 0.0006 + n.phase) * C.wander;
          y += Math.cos(t * 0.0005 + n.phase * 1.3) * C.wander;
        }
        el.get(n.id).setAttribute('transform', `translate(${snap(x).toFixed(2)} ${snap(y).toFixed(2)})`);
      }
      links.forEach((l, i) => {
        const a = byId.get(l.source), b = byId.get(l.target);
        const line = lineEl[i];
        line.setAttribute('x1', snap(a.x).toFixed(2)); line.setAttribute('y1', snap(a.y).toFixed(2));
        line.setAttribute('x2', snap(b.x).toFixed(2)); line.setAttribute('y2', snap(b.y).toFixed(2));
      });
    }

    nodes.forEach((n, i) => { n.phase = i * 1.7; });
    let atRest = false, frame = 0, running = false, litId = null;

    function light(id) {
      litId = id;
      const set = highlightSet(nodes, links, id);
      for (const [nid, a] of el) { a.classList.toggle('is-lit', set.has(nid)); a.classList.toggle('is-dim', !set.has(nid)); }
      links.forEach((l, i) => {
        const on = l.source === id || l.target === id;
        lineEl[i].classList.toggle('is-lit', on); lineEl[i].classList.toggle('is-dim', !on);
      });
    }

    function clearLight() {
      litId = null;
      for (const a of el.values()) a.classList.remove('is-lit', 'is-dim');
      for (const line of lineEl) line.classList.remove('is-lit', 'is-dim');
    }

    function loop(t) {
      if (!running) return;
      const energy = step(nodes, links, box);
      atRest = energy < C.restEnergy;
      render(t);
      frame = win.requestAnimationFrame(loop);
    }

    function start() {
      if (running || !wide.matches) return;
      running = true;
      if (reduced.matches) {
        for (let i = 0; i < 400; i++) step(nodes, links, box);
        atRest = true;
        render(0);
        running = false;                 // no loop; drags render directly
        return;
      }
      frame = win.requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      win.cancelAnimationFrame(frame);
    }

    // Pointer: SVG coordinates from client coordinates.
    function toSvg(event) {
      const rect = svg.getBoundingClientRect();
      return { x: ((event.clientX - rect.left) / rect.width) * box.w, y: ((event.clientY - rect.top) / rect.height) * box.h };
    }

    let drag = null;   // { node, startX, startY, lastX, lastY, moved }
    nodesG.addEventListener('pointerdown', (event) => {
      const a = event.target.closest('.node');
      if (!a || event.button !== 0) return;
      const n = byId.get(a.dataset.id);
      const p = toSvg(event);
      drag = { node: n, startX: event.clientX, startY: event.clientY, lastX: p.x, lastY: p.y, moved: false, offX: n.x - p.x, offY: n.y - p.y };
      n.pinned = true;
      a.setPointerCapture(event.pointerId);
    });
    nodesG.addEventListener('pointermove', (event) => {
      if (!drag) return;
      const p = toSvg(event);
      if (!isClick(event.clientX - drag.startX, event.clientY - drag.startY)) drag.moved = true;
      drag.node.vx = p.x - drag.lastX; drag.node.vy = p.y - drag.lastY;
      drag.lastX = p.x; drag.lastY = p.y;
      drag.node.x = p.x + drag.offX; drag.node.y = p.y + drag.offY;
      if (!running) render(0);
    });
    const release = () => {
      if (!drag) return;
      drag.node.pinned = false;
      if (reduced.matches || html.dataset.style === 'pixel') { drag.node.vx = 0; drag.node.vy = 0; }
      const moved = drag.moved;
      drag = null;
      if (moved) {
        // Swallow the click that follows a real drag.
        nodesG.addEventListener('click', (e) => e.preventDefault(), { capture: true, once: true });
      }
    };
    nodesG.addEventListener('pointerup', release);
    nodesG.addEventListener('pointercancel', release);

    // Hover and focus light; touch needs two taps to act.
    nodesG.addEventListener('pointerover', (event) => { const a = event.target.closest('.node'); if (a && event.pointerType !== 'touch') light(a.dataset.id); });
    nodesG.addEventListener('pointerout', (event) => { if (event.pointerType !== 'touch' && !drag) clearLight(); });
    nodesG.addEventListener('focusin', (event) => { const a = event.target.closest('.node'); if (a) light(a.dataset.id); });
    nodesG.addEventListener('focusout', () => { if (!drag) clearLight(); });
    nodesG.addEventListener('click', (event) => {
      const a = event.target.closest('.node');
      if (!a) return;
      if (event.pointerType === 'touch' || (event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents)) {
        if (litId !== a.dataset.id) { event.preventDefault(); light(a.dataset.id); }
      }
    });

    doc.addEventListener('themechange', () => { reshape(); if (!running) render(0); });
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) stop(); else start(); });
    wide.addEventListener?.('change', (e) => { if (e.matches) start(); else stop(); });
    reduced.addEventListener?.('change', () => { stop(); start(); });

    build();
    start();
    return { nodes, links, light, clearLight };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { C, radiusFor, seed, step, highlightSet, isClick };
  } else if (typeof document !== 'undefined') {
    init(document, window);
  }
```

Notes: `event.pointerType` is not on `click` events in all browsers; the `sourceCapabilities` check is the fallback and both are optional, so on desktop clicks act at once. `overflow: visible` on the SVG lets labels near the edge show.

- [ ] **Step 4: Build and browser-check**

`node --check assets/js/constellation.js && bundle exec jekyll build && node --test _tests/` (38). Confirm `grep -c constellation-data _site/tags.html` is 1 and `python3 -c "import json,re,sys;h=open('_site/tags.html').read();m=re.search(r'id=\"constellation-data\">(.*?)</script>',h,re.S);d=json.loads(m.group(1));print(len(d['tags']),len(d['posts']))"` prints `8 3`. Serve `_site` (extension-resolving server at `/tmp/claude-1000/-home-brlauuu-repos-brlauuu-github-io/b7b92c98-9b06-4ecf-aa5d-9f22f2ab40c3/scratchpad/serve.cjs`, `node serve.cjs <dir> <port>`) and with Playwright (module `/home/brlauuu/.npm/_npx/9833c18b2d85bc59/node_modules/playwright`, Chromium `/home/brlauuu/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell`) on `/tags` at 1280×900: after 1.5 s, `document.querySelectorAll('.constellation .node').length` is 11 and `.link` count is 8; hover the `tag:tools` node (`[data-id="tag:tools"]`) and check `is-lit` on exactly its posts and `is-dim` on the rest; press Tab from the top of the page until a node has focus and confirm `is-lit`; drag `tag:python` by 120 px with `page.mouse` and confirm its `transform` changed by roughly that much in SVG units; click `tag:python` (no drag) and confirm `location.hash === '#python'`; at 375×800 confirm `.constellation` has `display: none` and no `.node` exists. Take `/tmp/claude-shots-constellation/task2.png` at 1280×900 and open it: nodes spread out, labels readable, lines connecting posts to tags.

- [ ] **Step 5: Commit** "Draw the tags constellation from the page's tag data" with the two trailers.

---

### Task 3: Theme integration and checks

**Files:** Modify `assets/css/theme.css`; create `_tests/tools/constellation-check.cjs`.

- [ ] **Step 1: Tokens and rules**

Add to the light color block (`[data-color="on"] {`): `--rainbow-stop-1: #e0312a; --rainbow-stop-2: #e07800; --rainbow-stop-3: #c99700; --rainbow-stop-4: #1f9d4d; --rainbow-stop-5: #1f8fbf; --rainbow-stop-6: #0a5ed1; --rainbow-stop-7: #8e3fc4;` and to the dark block the dark stops `#ff6b6b, #ffa94d, #ffe066, #69db7c, #66d9e8, #74c0fc, #d0bfff` as `--rainbow-stop-1..7`.

Append to the Color axis layer:

```css
/* Constellation under color: gradient strokes and the shared hue cycle. */
[data-color="on"] .constellation stop:nth-child(1) { stop-color: var(--rainbow-stop-1); }
[data-color="on"] .constellation stop:nth-child(2) { stop-color: var(--rainbow-stop-2); }
[data-color="on"] .constellation stop:nth-child(3) { stop-color: var(--rainbow-stop-3); }
[data-color="on"] .constellation stop:nth-child(4) { stop-color: var(--rainbow-stop-4); }
[data-color="on"] .constellation stop:nth-child(5) { stop-color: var(--rainbow-stop-5); }
[data-color="on"] .constellation stop:nth-child(6) { stop-color: var(--rainbow-stop-6); }
[data-color="on"] .constellation stop:nth-child(7) { stop-color: var(--rainbow-stop-7); }

[data-color="on"] .constellation .node--tag .shape,
[data-color="on"] .constellation .link {
  stroke: url(#constellation-rainbow);
}

[data-color="on"] .constellation svg {
  animation: rainbow-cycle 12s var(--rainbow-timing) infinite;
  animation-play-state: var(--rainbow-play);
}
```

Append to the Style axis layer:

```css
/* Constellation under pixel: square nodes are drawn by the script; crisp lines, pixel labels, no easing. */
[data-style="pixel"] .constellation .label {
  font-family: var(--pixel-font);
  font-size: 12px;
}

[data-style="pixel"] .constellation .node,
[data-style="pixel"] .constellation .link,
[data-style="pixel"] .constellation .node--post .label {
  transition: none;
}
```

Add inside the existing `@media (prefers-reduced-motion: reduce)` block: `.constellation .node, .constellation .link, .constellation .node--post .label { transition: none; }`.

- [ ] **Step 2: Browser check tool**

Create `_tests/tools/constellation-check.cjs` that launches Chromium (env `PLAYWRIGHT_MODULE`, `PLAYWRIGHT_CHROMIUM`), takes `<base url>` as argv, and prints PASS/FAIL lines for: node count 11 and link count 8 at 1280×900; hovering `tag:tools` lights `post` nodes whose data contains tools and dims the others; clicking `tag:python` sets hash `#python`; dragging `tag:tools` by 120 px moves its transform by more than 60 SVG units; with `localStorage.color='on'` the `.link` computed stroke starts with `url(`; with `localStorage.style='pixel'` the shapes are `rect` elements; at 375 px the container is `display: none` and there are no nodes. Exit non-zero on any FAIL.

- [ ] **Step 3: Run and screenshot**

`bundle exec jekyll build && node --test _tests/` (38) and `node _tests/tools/constellation-check.cjs http://localhost:4132` all PASS. Screenshots into `/tmp/claude-shots-constellation/`: `default.png`, `dark.png`, `color.png`, `pixel.png`, `pixel-color-dark.png` (1280×900, 1.5 s wait), and `drag.png` mid-drag (mouse down on a node, move 80 px, screenshot, release). Open each with the Read tool and describe: nodes and labels readable, lines rainbow under color, squares under pixel, dimming on hover visible in a `hover.png` too.

Also confirm other pages are unaffected: `_tests/screenshot.cjs` of `index.html` and `2021-02-02/motevowrapper.html` in light vs a master worktree build, byte-identical (except the index sidebar).

- [ ] **Step 4: Commit** "Give the constellation its color and pixel looks and a browser check" with the two trailers.

---

### Task 4: Docs

**Files:** `README.md`, `CLAUDE.md`.

- [ ] README: a "Tags constellation" paragraph after the theme sections: what it is, that it reads `#constellation-data` from `_pages/tags.md`, that it is hidden under 600 px and keyboard-accessible, and the checks line `node _tests/tools/constellation-check.cjs http://localhost:4000`.
- [ ] CLAUDE.md: add `constellation` to the `_includes/` tree line and `constellation.js` to the js line; a "### Tags constellation" subsection under Pages/Tags System describing the data block, the helpers and tests, the DOM contract (`.node`, `.link`, `is-lit`, `is-dim`), the theme hooks (`--rainbow-stop-N`, gradient strokes, rect shapes under pixel), and that the list below is the primary structure.
- [ ] Commit "Document the tags constellation" with the two trailers.

The controller pushes and opens the PR "Tags page constellation (#8)", ending with `Closes #8`.
