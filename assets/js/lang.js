// Language axis: data-lang on <html> is en, yu or sr. The inline script in
// _includes/head.html sets it before first paint; this file wires the nav menu
// (_includes/lang-menu.html), persists the choice and emits `themechange`.
// Text in every language is already in the page; CSS shows the active one.
// On a post, choosing another language opens that language's version of it
// instead (the <link data-lang-version> tags in head.html), replacing this
// history entry so Back does not bounce between versions.
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

  // Path of the post's version in `lang`, or null when this is not a post, it is
  // already in `lang`, or no such version exists. `versions` maps key to path.
  function versionFor(lang, contentLang, versions) {
    if (!contentLang || contentLang === lang) return null;
    return versions[lang] || null;
  }

  // True when focus moved to something outside an open menu (Tab past the last
  // option). A null target (a click on empty page) is left to the outside-click
  // listener, which must not hand focus back to the button.
  function shouldCloseOnFocusOut(menu, relatedTarget) {
    return Boolean(menu && menu.open && relatedTarget && !menu.contains(relatedTarget));
  }

  function init(doc, storage, location) {
    const html = doc.documentElement;
    const read = (key) => { try { return storage.getItem(key); } catch { return null; } };
    const write = (key, value) => { try { storage.setItem(key, value); } catch { /* private mode or blocked storage */ } };
    const menu = doc.querySelector('[data-lang-menu]');
    const summary = menu ? menu.querySelector('summary') : null;
    const options = menu ? Array.from(menu.querySelectorAll('[data-set-lang]')) : [];
    const versions = {};
    Array.from(doc.querySelectorAll('link[data-lang-version]'))
      .forEach((l) => { versions[l.dataset.langVersion] = l.dataset.path; });

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
      const version = versionFor(lang, html.getAttribute('data-content-lang'), versions);
      if (version && location) {
        write('lang', lang);
        close(false);
        location.replace(version + location.search + location.hash);
        return;
      }
      const changed = html.getAttribute('data-lang') !== lang;
      apply(lang);
      write('lang', lang);
      close(true);
      if (changed) doc.dispatchEvent(new CustomEvent('themechange', { detail: current() }));
    }

    apply(resolveLang(read('lang')));
    if (!menu) return { choose, current };

    options.forEach((o) => o.addEventListener('click', () => choose(o.dataset.setLang)));
    // Set when the menu closed because the user went elsewhere, so focus stays there.
    let leftMenu = false;
    // Opening moves focus to the active option so the arrows start from it.
    menu.addEventListener('toggle', () => {
      if (!menu.open) {
        // Closed by the l shortcut with focus inside: focus would fall to <body>.
        const active = doc.activeElement;
        const lost = !active || active === doc.body;
        if (!leftMenu && summary && (menu.contains(active) || lost)) summary.focus();
        leftMenu = false;
        return;
      }
      (options.find((o) => o.getAttribute('aria-current') === 'true') || options[0]).focus();
    });
    menu.addEventListener('keydown', (event) => {
      if (!menu.open) return;
      if (event.key === 'Escape') { event.preventDefault(); close(true); return; }
      const at = options.indexOf(doc.activeElement);
      const to = menuStep(at, event.key, options.length);
      if (to !== at && to >= 0) { event.preventDefault(); options[to].focus(); }
    });
    menu.addEventListener('focusout', (event) => {
      if (shouldCloseOnFocusOut(menu, event.relatedTarget)) { leftMenu = true; close(false); }
    });
    doc.addEventListener('click', (event) => {
      if (menu.open && !menu.contains(event.target)) { leftMenu = true; close(false); }
    });
    return { choose, current };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LANGS, CODES, NAMES, resolveLang, menuStep, versionFor, shouldCloseOnFocusOut, init };
  } else if (typeof document !== 'undefined') {
    let storage = null;
    try { storage = window.localStorage; } catch { /* storage access denied */ }
    init(document, storage ?? { getItem() { return null; }, setItem() {} }, window.location);
  }
})();
