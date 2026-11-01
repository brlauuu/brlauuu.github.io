// Optional public data sources never block the card's permanent GitHub link.
(() => {
  const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });
  const validCount = (value) => Number.isSafeInteger(value) && value >= 0;

  function webUrl(value) {
    if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return null;
    try {
      const url = new URL(value);
      return url.username || url.password ? null : url.href;
    } catch {
      return null;
    }
  }

  async function fetchResource(url, accept, read) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        credentials: 'omit',
        headers: { Accept: accept }
      });
      if (!response.ok) throw new Error('Data source unavailable');
      return await read(response);
    } finally {
      clearTimeout(timeout);
    }
  }

  const fetchJson = (url) => fetchResource(url, 'application/json', (response) => response.json());
  const fetchText = (url) => fetchResource(url, 'text/plain', (response) => response.text());

  // The first line of the repository's VERSION file, e.g. "1.2.3" or "v1.2.3-beta.1".
  function parseVersion(text) {
    if (typeof text !== 'string') return null;
    const line = text.split(/\r?\n/, 1)[0].trim();
    if (line.length > 32) return null;
    return /^v?\d+(\.\d+){0,3}(-[0-9A-Za-z.-]{1,32})?$/.test(line) ? line.replace(/^v/, '') : null;
  }

  function showVersion(card, config, text) {
    const version = parseVersion(text);
    const element = card.querySelector('[data-project-version]');
    if (!version || !element) return false;
    element.textContent = `v${version}`;
    element.setAttribute('aria-label', `${config.name} version ${version}`);
    element.title = `Version ${version}`;
    element.hidden = false;
    return true;
  }

  // The time of the latest commit on the default branch, from GitHub's commit list, or null.
  function lastCommitTime(commits) {
    const date = Array.isArray(commits) ? commits[0]?.commit?.committer?.date : undefined;
    const time = typeof date === 'string' ? Date.parse(date) : NaN;
    return Number.isFinite(time) ? time : null;
  }

  // Indices of the cards newest commit first; cards without a time follow in their listed order.
  function recencyOrder(times) {
    return times.map((time, index) => ({ time, index })).sort((a, b) => {
      if (a.time === null || b.time === null) return (a.time === null) - (b.time === null) || a.index - b.index;
      return b.time - a.time || a.index - b.index;
    }).map(({ index }) => index);
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { lastCommitTime, recencyOrder };
    return;
  }

  function showCount(element, count, label, fallback = false) {
    if (!element) return;
    element.textContent = validCount(count) ? compact.format(count) : '—';
    const description = validCount(count)
      ? `${count.toLocaleString()} ${label}${fallback ? ' (fallback)' : ''}`
      : `${label} unavailable`;
    element.setAttribute('aria-label', description);
    element.title = description;
  }

  function showWebsite(card, config, value) {
    const url = webUrl(value);
    const link = card.querySelector('[data-project-website]');
    if (!url || !link) return;
    link.href = url;
    link.removeAttribute('aria-disabled');
    link.setAttribute('aria-label', `${config.name} website`);
    link.title = 'Open website';
  }

  async function loadCard(card) {
    let config;
    try {
      config = JSON.parse(card.dataset.projectConfig);
      if (!config || typeof config !== 'object') return null;
    } catch {
      return null;
    }
    let commitTime = null;
    const counter = config.counter || {};
    const label = counter.label === 'users' ? 'users' : 'downloads';
    const stars = card.querySelector('[data-project-stars]');
    const forks = card.querySelector('[data-project-forks]');
    const custom = card.querySelector('[data-project-counter]');
    showCount(stars, config.fallbacks?.stars, 'stars', true);
    showCount(forks, config.fallbacks?.forks, 'forks', true);
    showCount(custom, counter.fallback, label, true);
    showWebsite(card, config, config.website_fallback);

    const logo = card.querySelector('.project-logo');
    if (logo) {
      logo.addEventListener('error', () => { logo.hidden = true; });
      if (logo.complete && !logo.naturalWidth) logo.hidden = true;
    }

    const requests = [];
    if (/^[a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+$/.test(config.repository)) {
      requests.push(fetchJson(`https://api.github.com/repos/${config.repository}`).then((data) => {
        if (validCount(data?.stargazers_count)) showCount(stars, data.stargazers_count, 'stars');
        if (validCount(data?.forks_count)) showCount(forks, data.forks_count, 'forks');
        showWebsite(card, config, data?.homepage);
      }).catch(() => {})); // Retain fallback values on a failed or blocked request.
      // The default branch's latest commit orders the cards; without it the card keeps its listed place.
      requests.push(fetchJson(`https://api.github.com/repos/${config.repository}/commits?per_page=1`)
        .then((commits) => { commitTime = lastCommitTime(commits); })
        .catch(() => {}));
      // The version comes from the VERSION file on the repository's default branch, else from the
      // latest GitHub release's tag; with neither the badge stays hidden.
      requests.push(fetchText(`https://raw.githubusercontent.com/${config.repository}/HEAD/VERSION`)
        .then((text) => showVersion(card, config, text), () => false)
        .then((shown) => shown || fetchJson(`https://api.github.com/repos/${config.repository}/releases/latest`)
          .then((release) => showVersion(card, config, release?.tag_name)))
        .catch(() => {}));
    }

    const counterUrl = webUrl(counter.url);
    if (counterUrl) {
      requests.push(fetchJson(counterUrl).then((data) => {
        const field = counter.field ?? 'count';
        if (typeof field !== 'string') return;
        const value = field === '' ? data : field.split('.').reduce((value, key) => {
          return value != null && Object.prototype.hasOwnProperty.call(value, key) ? value[key] : undefined;
        }, data);
        if (validCount(value)) showCount(custom, value, label);
      }).catch(() => {})); // The counter and GitHub requests fail independently.
    }
    await Promise.all(requests);
    return commitTime;
  }

  // Cards move once, after every card has loaded, so the sidebar never reshuffles more than once.
  const cards = [];
  const loads = [];
  document.querySelectorAll('[data-project-config]').forEach((card) => {
    const load = loadCard(card);
    cards.push(card);
    loads.push(load);
    return load;
  });
  Promise.all(loads).then((times) => {
    const parent = cards[0]?.parentNode;
    if (!parent || cards.some((card) => card.parentNode !== parent)) return;
    recencyOrder(times).forEach((index) => parent.appendChild(cards[index]));
  });
})();
