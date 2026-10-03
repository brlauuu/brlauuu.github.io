// Language axis: data-lang on <html> is en, yu or sr. The inline script in
// _includes/head.html sets it before first paint; this file wires the nav menu
// (_includes/lang-menu.html), persists the choice and emits `themechange`.
// Text in every language is already in the page; CSS shows the active one.
(() => {
  const LANGS = ['en', 'yu', 'sr'];
  const CODES = { en: 'en', yu: 'sh', sr: 'sr-Cyrl' };
  const NAMES = { en: 'English', yu: 'Naš', sr: 'Српски' };

  function resolveLang(stored) {
    return LANGS.includes(stored) ? stored : 'en';
  }

  // Next focused option index for a key; -1 when there are no options.
  function menuStep(index, key, count) {
    if (!count) return -1;
    if (key === 'ArrowDown') return index < 0 ? 0 : (index + 1) % count;
    if (key === 'ArrowUp') return index < 0 ? count - 1 : (index - 1 + count) % count;
    if (key === 'Home') return 0;
    if (key === 'End') return count - 1;
    return index;
  }

  function init(doc, storage) {
    const html = doc.documentElement;
    const read = (key) => { try { return storage.getItem(key); } catch { return null; } };
    const write = (key, value) => { try { storage.setItem(key, value); } catch { /* private mode or blocked storage */ } };
    const menu = doc.querySelector('[data-lang-menu]');
    const summary = menu ? menu.querySelector('summary') : null;
    const options = menu ? Array.from(menu.querySelectorAll('[data-set-lang]')) : [];

    const current = () => ({
      theme: html.getAttribute('data-theme'),
      color: html.getAttribute('data-color'),
      style: html.getAttribute('data-style'),
      lang: html.getAttribute('data-lang')
    });

    function apply(lang) {
      html.setAttribute('data-lang', lang);
      if (!html.hasAttribute('data-content-lang')) html.setAttribute('lang', CODES[lang]);
      options.forEach((o) => o.setAttribute('aria-current', String(o.dataset.setLang === lang)));
      if (summary) summary.setAttribute('aria-label', `Language: ${NAMES[lang]}`);
    }

    function close(refocus) {
      if (!menu || !menu.open) return;
      menu.open = false;
      if (refocus && summary) summary.focus();
    }

    function choose(lang) {
      const changed = html.getAttribute('data-lang') !== lang;
      apply(lang);
      write('lang', lang);
      close(true);
      if (changed) doc.dispatchEvent(new CustomEvent('themechange', { detail: current() }));
    }

    apply(resolveLang(read('lang')));
    if (!menu) return { choose, current };

    options.forEach((o) => o.addEventListener('click', () => choose(o.dataset.setLang)));
    // Opening moves focus to the active option so the arrows start from it.
    menu.addEventListener('toggle', () => {
      if (!menu.open) return;
      (options.find((o) => o.getAttribute('aria-current') === 'true') || options[0]).focus();
    });
    menu.addEventListener('keydown', (event) => {
      if (!menu.open) return;
      if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
      const at = options.indexOf(doc.activeElement);
      const to = menuStep(at, event.key, options.length);
      if (to !== at && to >= 0) { event.preventDefault(); options[to].focus(); }
    });
    doc.addEventListener('click', (event) => {
      if (menu.open && !menu.contains(event.target)) close(false);
    });
    return { choose, current };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LANGS, CODES, NAMES, resolveLang, menuStep, init };
  } else if (typeof document !== 'undefined') {
    let storage = null;
    try { storage = window.localStorage; } catch { /* storage access denied */ }
    init(document, storage ?? { getItem() { return null; }, setItem() {} });
  }
})();
