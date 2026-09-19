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
