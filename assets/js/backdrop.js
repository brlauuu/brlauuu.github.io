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

  const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  const FRAGMENT = `
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_pointerStrength;
uniform float u_light;
uniform float u_grid;
uniform float u_intensity;

vec3 hsl2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  if (u_grid > 0.0) frag = (floor(frag / u_grid) + 0.5) * u_grid;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uv = frag / u_resolution;
  vec2 q = vec2(uv.x * aspect, uv.y);      // pointer space, unshifted
  vec2 p = q;
  float t = u_time;

  p.y += t * 0.02;                          // the drip: slow downward drift
  float v = sin(p.x * 3.0 + t * 0.15);
  v += sin(p.y * 2.5 + t * 0.11);
  v += sin((p.x + p.y) * 2.0 + t * 0.09);
  v += sin(length(p - vec2(0.5 * aspect, 0.5)) * 4.0 - t * 0.13);

  for (int i = 0; i < 4; i++) {           // four wandering blobs that merge
    float fi = float(i);
    vec2 c = vec2(0.5 * aspect + 0.4 * aspect * sin(t * 0.05 * (fi + 1.0) + fi),
                  0.5 + 0.4 * cos(t * 0.07 * (fi + 1.3) + fi * 2.0));
    float d = length(p - c);
    v += 1.2 * exp(-d * d * 6.0);
  }

  vec2 m = vec2(u_pointer.x / u_resolution.x * aspect, u_pointer.y / u_resolution.y);
  float dm = length(q - m);
  float bulge = u_pointerStrength * exp(-dm * dm * 25.0);   // radius about a fifth of the view
  v += bulge * 2.0;

  float hue = fract(v * 0.12 * u_intensity + t * 0.025 + bulge * 0.3);
  if (u_grid > 0.0) hue = floor(hue * 12.0) / 12.0;
  float light = mix(0.26, 0.86, u_light) + 0.06 * sin(v);  // dark 0.20-0.32, light 0.80-0.92
  float sat = mix(0.75, 0.6, u_light);
  gl_FragColor = vec4(hsl2rgb(vec3(hue, sat, light)), 1.0);
}`;

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
    return shader;
  }

  function init(doc, win) {
    const canvas = doc.getElementById('backdrop');
    if (!canvas) return;
    const html = doc.documentElement;
    const axes = () => ({ theme: html.dataset.theme, color: html.dataset.color, style: html.dataset.style });
    const reduced = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

    let gl = null, program = null, loc = null, frame = 0, running = false, hidden = false;
    let startedAt = 0, pausedAt = 0, last = 0;
    let light = 1, lightTarget = 1, grid = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, strength: 0, strengthTarget: 0 };
    let needResize = true;

    function setup() {
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false });
      if (!gl) return false;
      const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
      if (!vs || !fs) return false;
      program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
      gl.useProgram(program);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(program, 'a_pos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      loc = {};
      for (const name of ['u_time', 'u_resolution', 'u_pointer', 'u_pointerStrength', 'u_light', 'u_grid', 'u_intensity']) {
        loc[name] = gl.getUniformLocation(program, name);
      }
      canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); stop(); }, { passive: false });
      return true;
    }

    function resize() {
      const w = win.innerWidth, h = win.innerHeight;
      const scale = grid > 0 ? 1 : 0.5;          // smooth renders at half resolution
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      needResize = false;
    }

    function draw(now) {
      if (needResize) resize();
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      light = ease(light, lightTarget, dt, 0.15);
      pointer.x = ease(pointer.x, pointer.tx, dt, 0.1);
      pointer.y = ease(pointer.y, pointer.ty, dt, 0.1);
      pointer.strength = ease(pointer.strength, pointer.strengthTarget, dt, pointer.strengthTarget > pointer.strength ? 0.15 : 0.6);
      const scale = canvas.width / win.innerWidth;
      gl.uniform1f(loc.u_time, reduced.matches ? 0 : (now - startedAt) / 1000);
      gl.uniform2f(loc.u_resolution, canvas.width, canvas.height);
      gl.uniform2f(loc.u_pointer, pointer.x * scale, (win.innerHeight - pointer.y) * scale);
      gl.uniform1f(loc.u_pointerStrength, reduced.matches ? 0 : pointer.strength);
      gl.uniform1f(loc.u_light, light);
      gl.uniform1f(loc.u_grid, grid * scale);
      gl.uniform1f(loc.u_intensity, INTENSITY);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function loop(now) {
      if (!running || hidden) return;
      draw(now);
      frame = win.requestAnimationFrame(loop);
    }

    function applyAxes() {
      const u = uniformsFor(axes());
      lightTarget = u.light;
      if (u.grid !== grid) { grid = u.grid; needResize = true; }
    }

    function start() {
      if (running) return;
      if (!gl && !setup()) return;
      applyAxes();
      light = lightTarget;                       // no cross-fade on a cold start
      running = true;
      startedAt = win.performance.now();
      last = 0;
      draw(startedAt);
      canvas.classList.add('is-on');
      if (!reduced.matches) frame = win.requestAnimationFrame(loop);
    }

    function stop() {
      if (!running) return;
      running = false;
      win.cancelAnimationFrame(frame);
      canvas.classList.remove('is-on');
      win.setTimeout(() => { if (!running && gl) { gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); } }, FADE_MS);
    }

    doc.addEventListener('themechange', (event) => {
      const action = decide(event.detail, running);
      if (action === 'start') start();
      else if (action === 'stop') stop();
      else if (action === 'update') { applyAxes(); if (reduced.matches) draw(win.performance.now()); }
    });

    doc.addEventListener('visibilitychange', () => {
      hidden = doc.hidden;
      if (!running) return;
      if (hidden) { pausedAt = win.performance.now(); win.cancelAnimationFrame(frame); }
      else { startedAt += win.performance.now() - pausedAt; last = 0; if (!reduced.matches) frame = win.requestAnimationFrame(loop); }
    });

    win.addEventListener('resize', () => { needResize = true; if (running && reduced.matches) draw(win.performance.now()); }, { passive: true });
    const point = (event) => { pointer.tx = event.clientX; pointer.ty = event.clientY; pointer.strengthTarget = 1; };
    doc.addEventListener('pointermove', point, { passive: true });
    doc.addEventListener('pointerdown', point, { passive: true });
    doc.addEventListener('pointerleave', () => { pointer.strengthTarget = 0; }, { passive: true });
    win.addEventListener('blur', () => { pointer.strengthTarget = 0; }, { passive: true });

    if (axes().color === 'on') start();
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { uniformsFor, decide, ease, INTENSITY };
  } else if (typeof document !== 'undefined') {
    init(document, window);
  }
})();
