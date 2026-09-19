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
