const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const script = fs.readFileSync(require('node:path').join(__dirname, '../assets/js/project-stats.js'), 'utf8');
const github = 'https://api.github.com/repos/owner/project';
const endpoint = 'https://metrics.example.test/project';

async function render(overrides = {}, sources = {}, options = {}) {
  const config = { name: 'Project', repository: 'owner/project', ...overrides };
  const elements = Object.fromEntries(['stars', 'forks', 'counter', 'website'].map(name => [name, {
    textContent: '—', attrs: { 'aria-disabled': 'true' },
    setAttribute(name, value) { this.attrs[name] = value; },
    removeAttribute(name) { delete this.attrs[name]; }
  }]));
  const logo = { complete: !!options.brokenLogo, naturalWidth: options.brokenLogo ? 0 : 36,
    addEventListener(name, handler) { this[name] = handler; } };
  const card = {
    dataset: { projectConfig: options.rawConfig ?? JSON.stringify(config) },
    querySelector(selector) {
      if (selector === '.project-logo') return logo;
      return elements[selector.replace('[data-project-', '').replace(']', '')];
    }
  };
  const requests = [], pending = [], timers = new Set();
  vm.runInNewContext(script, {
    URL, Intl, AbortController,
    document: { querySelectorAll: () => ({ forEach: callback => pending.push(callback(card)) }) },
    setTimeout(callback) { const id = {}; timers.add(id); if (options.timeout) queueMicrotask(callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    fetch: async (url, init) => {
      requests.push(url);
      assert.equal(init.credentials, 'omit');
      if (options.timeout) return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('Aborted'))));
      if (!(url in sources)) throw new Error('Network failure');
      const response = sources[url];
      return { ok: response.status ? response.status < 400 : true,
        json: async () => { if (response.invalidJson) throw new Error('Invalid JSON'); return response.body; } };
    }
  });
  await Promise.all(pending);
  assert.equal(timers.size, 0);
  return { elements, requests, logo };
}

test('GitHub provides the website and counts, including zero', async () => {
  const { elements } = await render({}, { [github]: { body: { stargazers_count: 6, forks_count: 0, homepage: 'https://app.example.test' } } });
  assert.equal(elements.stars.textContent, '6');
  assert.equal(elements.forks.textContent, '0');
  assert.equal(elements.website.href, 'https://app.example.test/');
  assert.equal(elements.website.attrs['aria-disabled'], undefined);
});

test('custom nested users count loads even if GitHub fails', async () => {
  const { elements } = await render({ counter: { label: 'users', url: endpoint, field: 'stats.active', fallback: 10 } }, {
    [endpoint]: { body: { stats: { active: 12345 } } }
  });
  assert.equal(elements.stars.textContent, '—');
  assert.equal(elements.counter.attrs['aria-label'], '12,345 users');
  assert.ok(elements.counter.textContent.length < 6);
});

test('a broken custom endpoint leaves GitHub working and shows its configured fallback', async () => {
  const { elements } = await render({ counter: { url: endpoint, fallback: 0 } }, {
    [github]: { body: { stargazers_count: 5, forks_count: 1 } },
    [endpoint]: { status: 500 }
  });
  assert.equal(elements.stars.textContent, '5');
  assert.equal(elements.counter.textContent, '0');
  assert.equal(elements.counter.attrs['aria-label'], '0 downloads (fallback)');
});

test('GitHub failure preserves website and numeric stats fallbacks', async () => {
  const { elements } = await render({ website_fallback: 'https://fallback.example.test', fallbacks: { stars: 2, forks: 0 } }, {
    [github]: { status: 403 }
  });
  assert.equal(elements.website.href, 'https://fallback.example.test/');
  assert.equal(elements.stars.textContent, '2');
  assert.equal(elements.forks.textContent, '0');
});

test('empty or unsafe GitHub homepage retains the configured website', async () => {
  for (const homepage of ['', 'javascript:alert(1)', 'https://user:password@example.test']) {
    const { elements } = await render({ website_fallback: 'https://fallback.example.test' }, { [github]: { body: { homepage } } });
    assert.equal(elements.website.href, 'https://fallback.example.test/');
  }
});

test('no website or counter configured leaves unavailable indicators', async () => {
  const { elements, requests } = await render({}, { [github]: { body: { homepage: '' } } });
  assert.equal(elements.website.href, undefined);
  assert.equal(elements.website.attrs['aria-disabled'], 'true');
  assert.equal(elements.counter.textContent, '—');
  assert.deepEqual(requests, [github]);
});

test('primitive JSON and default count fields support real zero', async () => {
  for (const [field, body] of [['', 0], [undefined, { count: 0 }]]) {
    const { elements } = await render({ counter: { url: endpoint, field } }, { [endpoint]: { body } });
    assert.equal(elements.counter.textContent, '0');
    assert.equal(elements.counter.attrs['aria-label'], '0 downloads');
  }
});

test('invalid, negative, fractional, missing and string counts preserve fallback', async () => {
  for (const body of [null, {}, { count: -1 }, { count: 1.5 }, { count: '42' }, { count: Number.MAX_SAFE_INTEGER + 1 }]) {
    const { elements } = await render({ counter: { url: endpoint, fallback: 3 } }, { [endpoint]: { body } });
    assert.equal(elements.counter.textContent, '3');
  }
});

test('malformed JSON and request timeout preserve fallbacks and release timers', async () => {
  const config = { counter: { url: endpoint, fallback: 4 } };
  for (const options of [{}, { timeout: true }]) {
    const { elements } = await render(config, { [endpoint]: { invalidJson: true } }, options);
    assert.equal(elements.counter.textContent, '4');
  }
});

test('unsafe endpoints and invalid repository IDs are never requested', async () => {
  for (const url of ['javascript:alert(1)', 'ftp://example.test', 'https://user:password@example.test']) {
    const { requests } = await render({ repository: '../invalid', counter: { url } });
    assert.deepEqual(requests, []);
  }
});

test('a broken logo is hidden without affecting counters', async () => {
  const { logo, elements } = await render({}, { [github]: { body: { stargazers_count: 1 } } }, { brokenLogo: true });
  assert.equal(logo.hidden, true);
  assert.equal(elements.stars.textContent, '1');
  const later = await render();
  later.logo.error();
  assert.equal(later.logo.hidden, true);
});

test('malformed project configuration does not cause requests', async () => {
  const { requests } = await render({}, {}, { rawConfig: '{invalid' });
  assert.deepEqual(requests, []);
});
