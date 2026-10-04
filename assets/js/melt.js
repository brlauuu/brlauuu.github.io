// Melting headings: the SVG filters in _includes/melt-filter.html animate with SMIL.
// They only show with color on in smooth style, so the animations are paused at all
// other times, under reduced motion (frozen, still melted), on phones (where the CSS applies
// no melt, #64) and while the tab is hidden.
(() => {
  // The same query as the CSS that leaves phones unmelted.
  const PHONE = '(pointer: coarse), (max-width: 600px)';

  function meltState({ color, style, reduced, phone, hidden }) {
    return color === 'on' && style !== 'pixel' && !reduced && !phone && !hidden ? 'run' : 'pause';
  }

  function init(doc, win) {
    const svg = doc.querySelector('svg.melt-filters');
    if (!svg || typeof svg.pauseAnimations !== 'function') return;
    const html = doc.documentElement;
    const reduced = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    const phone = win.matchMedia ? win.matchMedia(PHONE) : { matches: false };
    const apply = () => {
      const state = meltState({ color: html.dataset.color, style: html.dataset.style, reduced: reduced.matches, phone: phone.matches, hidden: doc.hidden });
      if (state === 'run') svg.unpauseAnimations();
      else svg.pauseAnimations();
    };
    doc.addEventListener('themechange', apply);
    doc.addEventListener('visibilitychange', apply);
    reduced.addEventListener?.('change', apply);
    phone.addEventListener?.('change', apply);
    apply();
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { meltState, PHONE };
  } else if (typeof document !== 'undefined') {
    init(document, window);
  }
})();
