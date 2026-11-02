const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const script = fs.readFileSync(require('node:path').join(__dirname, '../assets/js/project-stats.js'), 'utf8');
const github = 'https://api.github.com/repos/owner/project';
const endpoint = 'https://metrics.example.test/project';
const versionFile = 'https://raw.githubusercontent.com/owner/project/HEAD/VERSION';
const latestRelease = `${github}/releases/latest`;
const commits = `${github}/commits?per_page=1`;

async function render(overrides = {}, sources = {}, options = {}) {
  const config = { name: 'Project', repository: 'owner/project', ...overrides };
  const elements = Object.fromEntries(['stars', 'forks', 'counter', 'website', 'version'].map(name => [name, {
    textContent: '—', hidden: name === 'version', attrs: { 'aria-disabled': 'true' },
    setAttribute(name, value) { this.attrs[name] = value; },
    removeAttribute(name) { delete this.attrs[name]; }
  }]));
  const makeLogo = (broken) => ({ complete: broken, naturalWidth: broken ? 0 : 36,
    addEventListener(name, handler) { this[name] = handler; } });
  const logo = makeLogo(!!options.brokenLogo);
  const logos = options.darkLogo ? [logo, makeLogo(!!options.brokenDarkLogo)] : [logo];
  const card = {
    dataset: { projectConfig: options.rawConfig ?? JSON.stringify(config) },
    querySelector(selector) {
      return elements[selector.replace('[data-project-', '').replace(']', '')];
    },
    querySelectorAll(selector) { return selector === '.project-logo' ? logos : []; }
  };
  const requests = [], pending = [], timers = new Set();
  vm.runInNewContext(script, {
    URL, Intl, AbortController, localStorage: options.storage,
    document: { querySelectorAll: () => ({ forEach: callback => pending.push(callback(card)) }) },
    setTimeout(callback) { const id = {}; timers.add(id); if (options.timeout) queueMicrotask(callback); return id; },
    clearTimeout(id) { timers.delete(id); },
    fetch: async (url, init) => {
      requests.push(url);
      assert.equal(init.credentials, 'omit');
      if (options.timeout) return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('Aborted'))));
      if (!(url in sources)) throw new Error('Network failure');
      const response = sources[url];
      return { ok: response.status ? response.status < 400 : true, status: response.status ?? 200,
        json: async () => { if (response.invalidJson) throw new Error('Invalid JSON'); return response.body; },
        text: async () => response.body };
    }
  });
  await Promise.all(pending);
  assert.equal(timers.size, 0);
  return { elements, requests, logo, logos };
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
  assert.deepEqual(requests, [github, commits, versionFile, latestRelease]);
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

test('a light and a dark logo are each hidden only when broken', async () => {
  const { logos } = await render({}, {}, { darkLogo: true, brokenDarkLogo: true });
  assert.deepEqual(logos.map((l) => !!l.hidden), [false, true]);
  logos[0].error();
  assert.equal(logos[0].hidden, true);
});

test('malformed project configuration does not cause requests', async () => {
  const { requests } = await render({}, {}, { rawConfig: '{invalid' });
  assert.deepEqual(requests, []);
});

test('the VERSION file shows a version badge, normalizing whitespace and a v prefix', async () => {
  for (const [body, expected] of [['1.1.0\n', 'v1.1.0'], ['  v2.0.0-beta.1  \n', 'v2.0.0-beta.1'], ['3\nchangelog', 'v3']]) {
    const { elements, requests } = await render({}, { [github]: { body: {} }, [versionFile]: { body } });
    assert.equal(elements.version.textContent, expected);
    assert.equal(elements.version.hidden, false);
    assert.equal(elements.version.attrs['aria-label'], `Project version ${expected.slice(1)}`);
    assert.ok(requests.includes(versionFile));
  }
});

test('a missing, invalid or failing VERSION file keeps the badge hidden without affecting stats', async () => {
  const bodies = [{ status: 404 }, { body: '' }, { body: 'latest' }, { body: '<html>' }, { body: '1.0;' }, { body: 'v' + '9'.repeat(400) }, { body: { count: 1 } }];
  for (const version of bodies) {
    const { elements } = await render({}, { [github]: { body: { stargazers_count: 7 } }, [versionFile]: version });
    assert.equal(elements.version.hidden, true);
    assert.equal(elements.version.textContent, '—');
    assert.equal(elements.stars.textContent, '7');
  }
  const { elements } = await render({}, { [versionFile]: { body: '1.0.0' } });
  assert.equal(elements.version.textContent, 'v1.0.0');
  assert.equal(elements.stars.textContent, '—');
});

test('without a VERSION file the badge shows the latest GitHub release tag', async () => {
  const { elements, requests } = await render({}, { [github]: { body: {} }, [versionFile]: { status: 404 }, [latestRelease]: { body: { tag_name: 'v0.6.0' } } });
  assert.equal(elements.version.textContent, 'v0.6.0');
  assert.equal(elements.version.hidden, false);
  assert.ok(requests.includes(latestRelease));
});

test('a valid VERSION file wins and the releases API is not asked', async () => {
  const { elements, requests } = await render({}, { [versionFile]: { body: '1.2.0' }, [latestRelease]: { body: { tag_name: 'v9.9.9' } } });
  assert.equal(elements.version.textContent, 'v1.2.0');
  assert.ok(!requests.includes(latestRelease));
});

test('no VERSION file and no usable release keep the badge hidden', async () => {
  for (const release of [{ status: 404 }, { body: {} }, { body: { tag_name: 'nightly' } }, { body: { tag_name: 7 } }]) {
    const { elements } = await render({}, { [versionFile]: { status: 404 }, [latestRelease]: release });
    assert.equal(elements.version.hidden, true);
  }
});

function helpers() {
  const module = { exports: {} };
  vm.runInNewContext(script, { module, URL, Intl, AbortController });
  return module.exports;
}

test('lastCommitTime reads the committer date of the first listed commit', () => {
  const { lastCommitTime } = helpers();
  assert.equal(lastCommitTime([{ commit: { committer: { date: '2026-11-01T10:13:43Z' } } }]), Date.parse('2026-11-01T10:13:43Z'));
  for (const body of [null, {}, [], [{}], [{ commit: { committer: { date: 'soon' } } }], [{ commit: { committer: { date: 7 } } }], { message: 'API rate limit exceeded' }]) {
    assert.equal(lastCommitTime(body), null);
  }
});

test('recencyOrder puts the newest commit first and undated cards last in listed order', () => {
  const { recencyOrder } = helpers();
  assert.deepEqual(Array.from(recencyOrder([10, 30, 20])), [1, 2, 0]);
  assert.deepEqual(Array.from(recencyOrder([null, 5, null, 9])), [3, 1, 0, 2]);
  assert.deepEqual(Array.from(recencyOrder([null, null])), [0, 1]);
  assert.deepEqual(Array.from(recencyOrder([4, 4, 8])), [2, 0, 1]);
});

test('the sidebar reorders cards by their latest commit once all have loaded', async () => {
  const parent = { children: [], appendChild(child) {
    this.children = this.children.filter((c) => c !== child).concat(child);
    child.parentNode = this;
  } };
  const repos = { a: '2026-10-01T00:00:00Z', b: null, c: '2026-11-01T00:00:00Z' };
  const cards = Object.keys(repos).map((name) => {
    const card = {
      name, parentNode: parent,
      dataset: { projectConfig: JSON.stringify({ name, repository: `owner/${name}` }) },
      querySelector: () => null,
      querySelectorAll: () => []
    };
    parent.children.push(card);
    return card;
  });
  const pending = [];
  vm.runInNewContext(script, {
    URL, Intl, AbortController, setTimeout: () => ({}), clearTimeout() {},
    document: { querySelectorAll: () => ({ forEach: (callback) => cards.forEach((card) => pending.push(callback(card))) }) },
    fetch: async (url) => {
      const match = url.match(/repos\/owner\/(\w+)\/commits/);
      if (!match || !repos[match[1]]) return { ok: false };
      return { ok: true, json: async () => [{ commit: { committer: { date: repos[match[1]] } } }] };
    }
  });
  await Promise.all(pending);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(parent.children.map((card) => card.name), ['c', 'a', 'b']);
});

// The GitHub cache (localStorage), so a few page views do not use up GitHub's 60
// unauthenticated requests an hour.
function memoryStorage(entries = {}) {
  const data = new Map(Object.entries(entries).map(([key, value]) => [key, JSON.stringify(value)]));
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)) };
}
const cacheKey = (url) => `project-stats:${url}`;
const hourAgo = () => Date.now() - 61 * 60 * 1000;
const sources = {
  [github]: { body: { stargazers_count: 7, forks_count: 2, homepage: 'https://app.example.test', big: 'x'.repeat(1000) } },
  [commits]: { body: [{ commit: { committer: { date: '2026-10-01T00:00:00Z' } } }] },
  [latestRelease]: { body: { tag_name: 'v1.2.0' } }
};

test('cacheState: fresh under an hour, stale after, none without a usable entry', () => {
  const { cacheState } = require('../assets/js/project-stats.js');
  const now = 10 * 60 * 60 * 1000;
  assert.equal(cacheState({ time: now - 1000, value: 1 }, now), 'fresh');
  assert.equal(cacheState({ time: now - 60 * 60 * 1000, value: 1 }, now), 'stale');
  assert.equal(cacheState({ time: now + 1000, value: 1 }, now), 'stale'); // a clock that went back
  assert.equal(cacheState({ time: now, value: null }, now), 'fresh'); // a remembered 404
  for (const entry of [null, undefined, {}, { time: 'x', value: 1 }, { time: now }]) assert.equal(cacheState(entry, now), 'none');
});

test('a second page view within the hour asks GitHub nothing and shows the same card', async () => {
  const storage = memoryStorage();
  const first = await render({}, sources, { storage });
  assert.deepEqual(first.requests, [github, commits, versionFile, latestRelease]);
  assert.ok(!storage.data.get(cacheKey(github)).includes('xxx'), 'only the used fields are kept');
  const second = await render({}, {}, { storage });
  assert.deepEqual(second.requests, [versionFile]); // VERSION failed as a network error, so it is asked again
  assert.equal(second.elements.stars.textContent, '7');
  assert.equal(second.elements.forks.textContent, '2');
  assert.equal(second.elements.website.href, 'https://app.example.test/');
  assert.equal(second.elements.version.textContent, 'v1.2.0');
});

test('a remembered 404 is not asked again within the hour', async () => {
  const storage = memoryStorage();
  await render({}, { ...sources, [versionFile]: { status: 404 } }, { storage });
  const again = await render({}, {}, { storage });
  assert.deepEqual(again.requests, []);
  assert.equal(again.elements.version.textContent, 'v1.2.0');
});

test('an answer older than an hour is asked again, and replaced', async () => {
  const storage = memoryStorage({ [cacheKey(github)]: { time: hourAgo(), value: { stargazers_count: 1 } } });
  const { elements, requests } = await render({}, sources, { storage });
  assert.ok(requests.includes(github));
  assert.equal(elements.stars.textContent, '7');
  assert.equal(JSON.parse(storage.data.get(cacheKey(github))).value.stargazers_count, 7);
});

test('when GitHub refuses, the last answers keep the version, counts and commit time', async () => {
  const storage = memoryStorage({
    [cacheKey(github)]: { time: hourAgo(), value: { stargazers_count: 3, forks_count: 1 } },
    [cacheKey(commits)]: { time: hourAgo(), value: [{ commit: { committer: { date: '2026-10-01T00:00:00Z' } } }] },
    [cacheKey(versionFile)]: { time: hourAgo(), value: null },
    [cacheKey(latestRelease)]: { time: hourAgo(), value: { tag_name: 'v0.9.0' } }
  });
  const refused = { [github]: { status: 403 }, [commits]: { status: 403 }, [latestRelease]: { status: 403 } };
  const { elements } = await render({}, refused, { storage });
  assert.equal(elements.stars.textContent, '3');
  assert.equal(elements.version.textContent, 'v0.9.0');
  // A refusal is not remembered: the stale answer stays as it was, to be retried next time.
  assert.equal(JSON.parse(storage.data.get(cacheKey(github))).value.stargazers_count, 3);
});

test('storage that throws or holds junk leaves the card working uncached', async () => {
  const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const junk = memoryStorage();
  junk.data.set(cacheKey(github), '{not json');
  for (const storage of [throwing, junk]) {
    const { elements, requests } = await render({}, sources, { storage });
    assert.equal(elements.stars.textContent, '7');
    assert.ok(requests.includes(github));
  }
});
