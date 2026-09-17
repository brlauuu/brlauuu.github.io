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

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { axes, resolve, next, label };
  }
})();
