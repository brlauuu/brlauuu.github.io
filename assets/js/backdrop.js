// Animated backdrop for the color axis: one WebGL fragment shader on a fixed
// canvas behind the page. Started and stopped by the `themechange` event;
// theme and style flips only change uniforms. See the spec's "Backdrop" section.
(() => {
  const INTENSITY = 1.0;      // the one knob: amplitude of everything
  const GRID_CSS_PX = 4;      // pixel style cell size in CSS pixels
  const REMOVE_MS = 300;    // matches the body background transition
  const LANE_SOFT_CSS_PX = 60; // soft edge of the calm reading lane

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

  // The reading column in canvas pixels: [left, right, soft edge]. Without a usable
  // rect (no main, zero width) the whole width is the lane, so text is never on the
  // wild part of the field by accident.
  function laneFor(rect, viewWidth, scale) {
    const soft = LANE_SOFT_CSS_PX * scale;
    if (!rect || !(rect.width > 0)) return [0, viewWidth * scale, soft];
    const left = Math.max(0, Math.min(viewWidth, rect.left));
    const right = Math.max(left, Math.min(viewWidth, rect.right));
    return [left * scale, right * scale, soft];
  }

  const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

  const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_pointerStrength;
uniform float u_light;
uniform float u_grid;
uniform float u_intensity;
uniform vec3 u_lane;          // reading column: left, right, soft edge (canvas px)

vec3 hsl2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}

// 1 inside the reading column, 0 outside, with a soft edge.
float laneMask(float x) {
  float e = max(u_lane.z, 1.0);
  return smoothstep(u_lane.x - e, u_lane.x + e, x) * (1.0 - smoothstep(u_lane.y - e, u_lane.y + e, x));
}

// Light: candy marbling (domain-warped noise) stirred by the pointer, with drips.
vec3 acid(vec2 p, vec2 uv, float aspect, float t, float calm, vec2 m, float ms) {
  vec2 sw = p - m;
  float stir = ms * exp(-dot(sw, sw) * 20.0);
  float ang = stir * 2.5;
  p = m + mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * sw;
  float amp = mix(1.0, 0.5, calm) * u_intensity;
  vec2 q = vec2(fbm(p * 2.0 + vec2(0.0, t * 0.03)), fbm(p * 2.0 + vec2(5.2, 1.3) - t * 0.025));
  vec2 r = vec2(fbm(p * 2.0 + 4.0 * amp * q + vec2(1.7, 9.2) + t * 0.02),
                fbm(p * 2.0 + 4.0 * amp * q + vec2(8.3, 2.8)));
  float f = fbm(p * 2.0 + 4.0 * amp * r);
  float hue = fract(f * 1.6 + q.x * 0.4 + t * 0.01);
  if (u_grid > 0.0) hue = floor(hue * 12.0) / 12.0;
  vec3 col = hsl2rgb(vec3(hue, 0.95, 0.6 + 0.08 * sin(f * 6.0)));

  // Drips: twelve columns, each a capsule from the top edge with a bulging tip,
  // thinning as it stretches; fades into a pool at the bottom and starts again.
  float edge = u_grid > 0.0 ? 0.0 : 0.004;
  float yt = 1.0 - uv.y;                       // distance from the top, 0..1
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float x0 = (fi + 0.5) / 12.0 + (hash(vec2(fi, 1.0)) - 0.5) * 0.05;
    float speed = 0.015 + 0.02 * hash(vec2(fi, 2.0));
    float phase = fract(t * speed + hash(vec2(fi, 3.0)));
    float len = phase * 1.15;
    float w = (0.010 + 0.010 * hash(vec2(fi, 4.0))) * mix(1.0, 0.6, phase);
    float dx = (uv.x - x0) * aspect;
    float body = length(vec2(dx, yt - clamp(yt, 0.0, len))) - w;
    float tip = length(vec2(dx, yt - len)) - w * 1.4;
    float d = min(body, tip);
    float fade = 1.0 - smoothstep(0.85, 1.0, phase);
    float cover = (edge > 0.0 ? smoothstep(edge, -edge, d) : step(d, 0.0)) * fade;
    float pool = smoothstep(1.0, 0.0, length(vec2(dx / (w * 5.0), (1.0 - yt) / 0.02)))
               * smoothstep(0.8, 1.0, phase);
    float dripHue = fract(hash(vec2(fi, 5.0)) + t * 0.02);
    if (u_grid > 0.0) dripHue = floor(dripHue * 12.0) / 12.0;
    vec3 paint = hsl2rgb(vec3(dripHue, 1.0, 0.55));
    float rim = smoothstep(-0.006, 0.0, d) * cover;
    float gloss = smoothstep(-w * 0.7, -w * 0.4, dx) * smoothstep(-w * 0.1, -w * 0.35, dx) * cover;
    col = mix(col, paint * (1.0 - 0.35 * rim), max(cover, pool));
    col = mix(col, vec3(1.0), gloss * 0.55);
  }
  return col;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  if (u_grid > 0.0) frag = (floor(frag / u_grid) + 0.5) * u_grid;
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uv = frag / u_resolution;
  vec2 p = vec2(uv.x * aspect, uv.y);
  vec2 m = vec2(u_pointer.x / u_resolution.x * aspect, u_pointer.y / u_resolution.y);
  float calm = laneMask(frag.x);
  vec3 col = acid(p, uv, aspect, u_time, calm, m, u_pointerStrength);
  // Quiet lane: desaturate and pull toward the page background.
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(luma), 0.45 * calm);
  col = mix(col, vec3(1.0), 0.35 * calm);
  gl_FragColor = vec4(col, 1.0);
}`;

  function compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
    return shader;
  }

  function init(doc, win) {
    const html = doc.documentElement;
    const axes = () => ({ theme: html.dataset.theme, color: html.dataset.color, style: html.dataset.style });
    const reduced = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

    let canvas = null;
    let gl = null, program = null, loc = null, frame = 0, running = false, hidden = doc.hidden;
    let elapsed = 0, last = 0, removal = 0;
    let light = 1, lightTarget = 1, grid = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, strength: 0, strengthTarget: 0 };
    let needResize = true;
    let lane = [0, 1, 0];

    // The viewport without the scrollbar, so the canvas never forces one.
    const viewW = () => html.clientWidth;
    const viewH = () => html.clientHeight;

    // The canvas exists only while color is on: a transparent canvas left in the
    // DOM changes how the text above it is composited.
    function create() {
      const el = doc.createElement('canvas');
      el.className = 'backdrop';
      el.setAttribute('aria-hidden', 'true');
      el.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        if (el !== canvas) return;                 // a discarded canvas losing its context on purpose
        gl = null; program = null; loc = null; needResize = true;
        stop();
      }, { passive: false });
      el.addEventListener('webglcontextrestored', () => { if (el === canvas && axes().color === 'on') start(); });
      doc.body.insertBefore(el, doc.body.firstChild);
      return el;
    }

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
      for (const name of ['u_time', 'u_resolution', 'u_pointer', 'u_pointerStrength', 'u_light', 'u_grid', 'u_intensity', 'u_lane']) {
        loc[name] = gl.getUniformLocation(program, name);
      }
      return true;
    }

    function resize() {
      const w = viewW(), h = viewH();
      const scale = grid > 0 ? 1 : 0.25;        // smooth renders at quarter resolution
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
      const main = doc.querySelector('main');
      lane = laneFor(main ? main.getBoundingClientRect() : null, w, canvas.width / w);
      needResize = false;
    }

    function draw(now) {
      if (!gl) return;
      if (needResize) resize();
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      // An accumulator, so pausing and resuming never jumps and the value stays small.
      if (!reduced.matches) elapsed = (elapsed + dt) % 86400;
      light = ease(light, lightTarget, dt, 0.15);
      pointer.x = ease(pointer.x, pointer.tx, dt, 0.1);
      pointer.y = ease(pointer.y, pointer.ty, dt, 0.1);
      pointer.strength = ease(pointer.strength, pointer.strengthTarget, dt, pointer.strengthTarget > pointer.strength ? 0.15 : 0.6);
      const scale = canvas.width / viewW();
      gl.uniform1f(loc.u_time, reduced.matches ? 0 : elapsed);
      gl.uniform2f(loc.u_resolution, canvas.width, canvas.height);
      gl.uniform2f(loc.u_pointer, pointer.x * scale, (viewH() - pointer.y) * scale);
      gl.uniform1f(loc.u_pointerStrength, reduced.matches ? 0 : pointer.strength);
      gl.uniform1f(loc.u_light, light);
      gl.uniform1f(loc.u_grid, grid * scale);
      gl.uniform1f(loc.u_intensity, INTENSITY);
      gl.uniform3f(loc.u_lane, lane[0], lane[1], lane[2]);
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
      if (removal) { win.clearTimeout(removal); removal = 0; }
      if (running) return;
      if (!canvas) canvas = create();               // reuse one still waiting to be removed
      if (!gl && !setup()) {                        // no WebGL, or shaders failed: leave no canvas behind
        gl = null; program = null; loc = null;
        canvas.remove(); canvas = null;
        return;
      }
      applyAxes();
      light = lightTarget;                          // no cross-fade on a cold start
      needResize = true;
      running = true;
      last = 0;
      draw(win.performance.now());
      void canvas.offsetHeight;                     // flush the inserted element so the fade runs
      canvas.classList.add('is-on');
      if (!reduced.matches) frame = win.requestAnimationFrame(loop);
    }

    function stop() {
      if (!running) return;
      running = false;
      win.cancelAnimationFrame(frame);
      if (canvas) canvas.classList.remove('is-on');
      removal = win.setTimeout(() => {
        removal = 0;
        if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext();
        gl = null; program = null; loc = null; needResize = true;
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
        canvas = null;
      }, REMOVE_MS);
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
      if (hidden) win.cancelAnimationFrame(frame);
      else {
        last = 0;
        if (reduced.matches) draw(win.performance.now());
        else frame = win.requestAnimationFrame(loop);
      }
    });

    reduced.addEventListener?.('change', () => {
      if (!running) return;
      if (reduced.matches) { win.cancelAnimationFrame(frame); draw(win.performance.now()); }
      else { last = 0; frame = win.requestAnimationFrame(loop); }
    });

    win.addEventListener('resize', () => { needResize = true; if (running && reduced.matches) draw(win.performance.now()); }, { passive: true });
    const point = (event) => { pointer.tx = event.clientX; pointer.ty = event.clientY; pointer.strengthTarget = 1; };
    doc.addEventListener('pointermove', point, { passive: true });
    doc.addEventListener('pointerdown', point, { passive: true });
    // relatedTarget null means the pointer left the window, not just one element.
    doc.addEventListener('pointerout', (event) => { if (!event.relatedTarget) pointer.strengthTarget = 0; }, { passive: true });
    const lift = (event) => { if (event.pointerType !== 'mouse') pointer.strengthTarget = 0; };
    doc.addEventListener('pointerup', lift, { passive: true });
    doc.addEventListener('pointercancel', lift, { passive: true });
    win.addEventListener('blur', () => { pointer.strengthTarget = 0; }, { passive: true });

    // Listeners are live at once; the first draw waits for idle time after load.
    const boot = () => { if (axes().color === 'on') start(); };
    const schedule = () => {
      if (win.requestIdleCallback) win.requestIdleCallback(boot, { timeout: 2000 });
      else win.setTimeout(boot, 200);
    };
    if (doc.readyState === 'complete') schedule();
    else win.addEventListener('load', schedule, { once: true });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { uniformsFor, decide, ease, laneFor, INTENSITY };
  } else if (typeof document !== 'undefined') {
    init(document, window);
  }
})();
