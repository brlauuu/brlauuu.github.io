// Three independent theme axes on <html>: data-theme, data-color, data-style.
// The inline script in _includes/head.html sets them before first paint;
// this file wires the nav buttons, persists choices and emits `themechange`.
(() => {
  const axes = {
    theme: { values: ['light', 'dark'], labels: { light: 'Switch to dark', dark: 'Switch to light' } },
    color: { values: ['off', 'on'], labels: { off: 'Turn color on', on: 'Turn color off' } },
    style: { values: ['smooth', 'pixel'], labels: { smooth: 'Switch to pixel style', pixel: 'Switch to smooth style' } }
  };

  function resolve(axis, stored, systemDark) {
    const { values } = axes[axis];
    if (values.includes(stored)) return stored;
    return axis === 'theme' && systemDark ? 'dark' : values[0];
  }

  function next(axis, current) {
    const { values } = axes[axis];
    return current === values[1] ? values[0] : values[1];
  }

  function label(axis, current) {
    return axes[axis].labels[current] ?? axes[axis].labels[axes[axis].values[0]];
  }

  function init(doc, storage, matchMedia) {
    const html = doc.documentElement;
    const read = (key) => { try { return storage.getItem(key); } catch { return null; } };
    const write = (key, value) => { try { storage.setItem(key, value); } catch { /* private mode or blocked storage */ } };
    const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
    const buttons = Array.from(doc.querySelectorAll('[data-toggle]')).filter((button) => axes[button.dataset.toggle]);

    const current = () => Object.fromEntries(Object.keys(axes).map((axis) => [axis, html.getAttribute(`data-${axis}`)]));

    function apply(axis, value) {
      html.setAttribute(`data-${axis}`, value);
      buttons.filter((button) => button.dataset.toggle === axis)
        .forEach((button) => button.setAttribute('aria-label', label(axis, value)));
    }

    function flip(axis) {
      const value = next(axis, html.getAttribute(`data-${axis}`));
      apply(axis, value);
      write(axis, value);
      doc.dispatchEvent(new CustomEvent('themechange', { detail: current() }));
    }

    Object.keys(axes).forEach((axis) => apply(axis, resolve(axis, read(axis), Boolean(media?.matches))));
    buttons.forEach((button) => button.addEventListener('click', () => flip(button.dataset.toggle)));
    media?.addEventListener?.('change', (event) => {
      if (!axes.theme.values.includes(read('theme'))) apply('theme', event.matches ? 'dark' : 'light');
    });

    return { current, flip };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { axes, resolve, next, label, init };
  } else if (typeof document !== 'undefined') {
    let storage = null;
    try { storage = window.localStorage; } catch { /* storage access denied */ }
    init(document, storage ?? { getItem() { return null; }, setItem() {} }, window.matchMedia);
  }
})();
