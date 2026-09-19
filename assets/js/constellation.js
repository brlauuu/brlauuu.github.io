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
    let atRest = false, frame = 0, running = false, litId = null, built = false;

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
      if (!built) { build(); built = true; }   // nothing in the DOM until the graph is shown
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

    doc.addEventListener('themechange', () => { if (!built) return; reshape(); if (!running) render(0); });
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) stop(); else start(); });
    wide.addEventListener?.('change', (e) => { if (e.matches) start(); else stop(); });
    reduced.addEventListener?.('change', () => { stop(); start(); });

    start();
    return { nodes, links, light, clearLight };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { C, radiusFor, seed, step, highlightSet, isClick };
  } else if (typeof document !== 'undefined') {
    init(document, window);
  }
})();
