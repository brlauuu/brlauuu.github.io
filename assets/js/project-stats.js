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

  async function fetchJson(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        credentials: 'omit',
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('Data source unavailable');
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
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

  document.querySelectorAll('[data-project-config]').forEach(async (card) => {
    let config;
    try {
      config = JSON.parse(card.dataset.projectConfig);
      if (!config || typeof config !== 'object') return;
    } catch {
      return;
    }
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
  });
})();
