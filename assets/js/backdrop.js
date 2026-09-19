// Animated backdrop for the color axis: one WebGL fragment shader on a fixed
// canvas behind the page. Started and stopped by the `themechange` event;
// theme and style flips only change uniforms. See the spec's "Backdrop" section.
(() => {
  const INTENSITY = 1.0;      // the one knob: amplitude of everything
  const GRID_CSS_PX = 4;      // pixel style cell size in CSS pixels
  const FADE_MS = 600;

  function uniformsFor({ theme, style }) {
    return { light: theme === 'dark' ? 0 : 1, grid: style === 'pixel' ? GRID_CSS_PX : 0 };
  }

  function decide(detail, running) {
    if (detail.color === 'on') return running ? 'update' : 'start';
    return running ? 'stop' : 'idle';
  }

  // Exponential approach: after `tau` seconds about 63% of the gap is closed.
  function ease(current, target, dt, tau) {
    return current + (target - current) * (1 - Math.exp(-dt / tau));
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { uniformsFor, decide, ease, INTENSITY };
  }
})();
