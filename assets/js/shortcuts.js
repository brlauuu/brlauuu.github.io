// Keyboard shortcuts. The key table lives in the markup of the help dialog
// (_includes/shortcuts.html): each row carries data-shortcut plus either
// data-toggle (a theme axis button to click) or data-href (a page to open).
// Single keys act at once; "g" arms a two-key sequence for a moment.
(() => {
  const SEQUENCE_MS = 1500;

  function ignores(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return true;
    const target = event.target || {};
    const tag = (target.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(target.isContentEditable);
  }

  function readBindings(rows) {
    const bindings = {};
    for (const row of rows) {
      const { shortcut, toggle, href } = row.dataset;
      if (!shortcut) continue;
      bindings[shortcut] = toggle ? { toggle } : { href };
    }
    return bindings;
  }

  // Returns the action for `key` given the pending prefix, and the new prefix.
  function step(bindings, pending, key) {
    if (key === '?') return { action: { help: true }, pending: null };
    if (pending) {
      if (key === pending) return { action: null, pending };
      const action = bindings[`${pending} ${key}`] || null;
      return { action, pending: null };
    }
    if (key === 'g') return { action: null, pending: 'g' };
    return { action: bindings[key] || null, pending: null };
  }

  function init(doc, win) {
    const dialog = doc.getElementById('shortcuts');
    if (!dialog || typeof dialog.showModal !== 'function') return;
    const bindings = readBindings(doc.querySelectorAll('#shortcuts [data-shortcut]'));
    let pending = null;
    let timer = null;

    const toggleHelp = () => (dialog.open ? dialog.close() : dialog.showModal());

    function act(action) {
      if (action.help) toggleHelp();
      else if (action.toggle) doc.querySelector(`[data-toggle="${action.toggle}"]`)?.click();
      else if (action.href) win.location.assign(action.href);
    }

    doc.addEventListener('keydown', (event) => {
      if (ignores(event)) return;
      if (dialog.open && event.key !== '?' && event.key !== 'Escape') return;
      const result = step(bindings, pending, event.key);
      pending = result.pending;
      win.clearTimeout(timer);
      if (pending) timer = win.setTimeout(() => { pending = null; }, SEQUENCE_MS);
      if (result.action) {
        event.preventDefault();
        act(result.action);
      }
    });

    // A click on the backdrop lands on the dialog element itself.
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });
    doc.querySelector('#shortcuts [data-close]')?.addEventListener('click', () => dialog.close());
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ignores, readBindings, step, init };
  } else if (typeof document !== 'undefined') {
    init(document, window);
  }
})();
