// YOSEMITE — real Half Dome terrain + WebGL2 Bayer ordered dither + multi-palette
// Data: AWS Terrarium DEM tile z13/1374/3167, Esri World Imagery tile z12. No keys.

const VERT = `#version 300 es
layout(location=0) in vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`;

// NOTE: branchless Bayer — no loops, no dynamic break (some ANGLE/Metal drivers
// reject loop-break ordered-dither code at compile time).
const FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_height;
uniform sampler2D u_sat;
uniform vec2  u_res;
uniform float u_time, u_pixel, u_exagg, u_zoom, u_hmin, u_hmax;
uniform vec2  u_pan;
uniform int   u_bayerLog;   // 1=2x2, 2=4x4, 3=8x8
uniform int   u_palette;    // 0 alpine 1 sunset 2 topo 3 gameboy
uniform int   u_mode;       // 0 relief 1 satellite
out vec4 o;

float decodeH(vec2 uv){
  vec3 c = texture(u_height, uv).rgb * 255.0;
  return c.r * 256.0 + c.g + c.b / 256.0 - 32768.0;
}
float bayerIdx2(vec2 p){
  vec2 q = mod(floor(p), 2.0);
  float x = step(0.5, q.x);
  float y = step(0.5, q.y);
  return (1.0 - x) * (1.0 - y) * 0.0 + (1.0 - x) * y * 3.0 + x * (1.0 - y) * 2.0 + x * y * 1.0;
}
float bayer4(vec2 p){
  float c = bayerIdx2(floor(p * 0.5));
  float f = bayerIdx2(p);
  return (c * 4.0 + f + 0.5) / 16.0;
}
float bayer2(vec2 p){
  return (bayerIdx2(p) + 0.5) / 4.0;
}
float bayer8(vec2 p){
  float ci = bayer4(floor(p * 0.5)) * 16.0 - 0.5;
  float fi = bayerIdx2(p);
  return (ci * 4.0 + fi + 0.5) / 64.0;
}
float bayer(vec2 p, int logSize){
  if(logSize <= 1) return bayer2(p);
  if(logSize == 2) return bayer4(p);
  return bayer8(p);
}
vec3 pal(float t, int p){
  t = clamp(t, 0.0, 1.0);
  if(p == 1){ // SUNSET
    vec3 c1=vec3(0.13,0.10,0.32), c2=vec3(0.55,0.20,0.45), c3=vec3(0.95,0.42,0.25),
         c4=vec3(1.00,0.75,0.40), c5=vec3(1.00,0.96,0.85);
    if(t<0.25) return mix(c1,c2,t/0.25);
    if(t<0.50) return mix(c2,c3,(t-0.25)/0.25);
    if(t<0.75) return mix(c3,c4,(t-0.50)/0.25);
    return mix(c4,c5,(t-0.75)/0.25);
  }
  if(p == 2){ // TOPO banded
    vec3 c1=vec3(0.16,0.35,0.22), c2=vec3(0.42,0.52,0.28), c3=vec3(0.65,0.58,0.38),
         c4=vec3(0.48,0.36,0.26), c5=vec3(0.92,0.90,0.84);
    float b = floor(t*6.0)/6.0;
    if(b<0.2) return mix(c1,c2,b/0.2);
    if(b<0.4) return mix(c2,c3,(b-0.2)/0.2);
    if(b<0.6) return mix(c3,c4,(b-0.4)/0.2);
    if(b<0.8) return mix(c4,c5,(b-0.6)/0.2);
    return c5;
  }
  if(p == 3){ // GAMEBOY
    vec3 c1=vec3(0.05,0.09,0.06), c2=vec3(0.19,0.38,0.19),
         c3=vec3(0.54,0.67,0.32), c4=vec3(0.85,0.92,0.62);
    float b = floor(t*4.0+0.5)/3.0;
    if(b<0.2) return c1; if(b<0.5) return c2; if(b<0.85) return c3; return c4;
  }
  // ALPINE default
  vec3 c1=vec3(0.08,0.16,0.13), c2=vec3(0.20,0.33,0.22), c3=vec3(0.45,0.44,0.36),
       c4=vec3(0.62,0.60,0.55), c5=vec3(0.96,0.95,0.90);
  if(t<0.25) return mix(c1,c2,t/0.25);
  if(t<0.50) return mix(c2,c3,(t-0.25)/0.25);
  if(t<0.75) return mix(c3,c4,(t-0.50)/0.25);
  return mix(c4,c5,(t-0.75)/0.25);
}
void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 pix = floor(frag / u_pixel) * u_pixel + u_pixel * 0.5;
  vec2 nuv = (pix / u_res - 0.5) / u_zoom + 0.5 + u_pan;
  if(nuv.x < 0.0 || nuv.x > 1.0 || nuv.y < 0.0 || nuv.y > 1.0){
    vec2 g = floor(frag / 24.0);
    float grid = (mod(g.x+g.y, 2.0) < 1.0) ? 0.03 : 0.0;
    o = vec4(vec3(0.04 + grid), 1.0);
    return;
  }
  float th = bayer(pix, u_bayerLog);
  float e = 1.0 / (256.0 * u_zoom);
  float hC = decodeH(nuv);
  float hX = decodeH(nuv + vec2(e, 0.0));
  float hY = decodeH(nuv + vec2(0.0, e));
  float range = max(u_hmax - u_hmin, 1.0);
  float v = (hC - u_hmin) / range;
  v = clamp((v - 0.5) * u_exagg + 0.5, 0.0, 1.0);
  vec3 n = normalize(vec3(-(hX - hC) / max(e*range*0.5, 0.001), -(hY - hC) / max(e*range*0.5, 0.001), 1.2));
  vec3 sun = normalize(vec3(-0.55, 0.65, 0.75));
  float shade = clamp(dot(n, sun) * 0.5 + 0.5, 0.0, 1.0);
  shade = pow(shade, 1.3);
  float ramp;
  if(u_mode == 1){
    vec3 base = texture(u_sat, nuv).rgb;
    float lum = dot(base, vec3(0.299, 0.587, 0.114));
    ramp = clamp(lum * 0.65 + v * 0.2 + shade * 0.25, 0.0, 1.0);
    float q = ramp * 5.0 + (th - 0.5) * 1.2;
    float qi = clamp(floor(q + 0.5) / 5.0, 0.0, 1.0);
    vec3 pc = pal(qi, u_palette);
    o = vec4(mix(pc, base * 0.55 + pc * 0.45, 0.28), 1.0);
    return;
  }
  ramp = clamp(v * 0.72 + shade * 0.38 - 0.05, 0.0, 1.0);
  float steps = (u_palette == 3) ? 4.0 : 6.0;
  float q = ramp * steps + (th - 0.5) * 1.4;
  float qi = clamp((floor(q) + step(1.0 - fract(q), th)) / steps, 0.0, 1.0);
  vec3 col = pal(qi, u_palette);
  if(u_palette == 2){
    float c = abs(fract(v * 22.0) - 0.5);
    float line = smoothstep(0.06, 0.02, c);
    col *= (1.0 - line * 0.35);
  }
  float vig = smoothstep(1.25, 0.45, length(nuv - 0.5) * 2.0);
  col *= mix(0.82, 1.0, vig);
  o = vec4(col, 1.0);
}`;

type State = { pal: number; pixel: number; bayerLog: number; exagg: number; zoom: number; mode: number; drift: boolean; pan: [number, number] };

const state: State = { pal: 0, pixel: 3, bayerLog: 3, exagg: 1.0, zoom: 1.0, mode: 0, drift: true, pan: [0, 0] };
let webglDead = false;

function compile(gl: WebGL2RenderingContext, type: number, src: string, label: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(label + ' compile failed: ' + (gl.getShaderInfoLog(s) || 'no log'));
  }
  return s;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('image load failed: ' + src));
    img.src = src;
  });
}

// ---- Canvas2D static-dither fallback (no WebGL needed) ----
const PAL_STOPS: number[][][] = [
  [[8, 41, 33], [51, 84, 56], [115, 112, 92], [158, 153, 140], [245, 242, 230]],
  [[33, 26, 82], [140, 51, 115], [242, 107, 64], [255, 191, 102], [255, 245, 217]],
  [[41, 89, 56], [107, 133, 71], [166, 148, 97], [122, 92, 66], [235, 230, 214]],
  [[13, 23, 15], [48, 97, 48], [138, 171, 82], [217, 235, 158]],
];
const BAYER8: number[][] = (() => {
  let m: number[][] = [[0]];
  for (let s = 1; s < 8; s *= 2) {
    const n = s * 2;
    const nx: number[][] = Array.from({ length: n }, () => new Array(n));
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const off = [[0, 2], [3, 1]][y >= s ? 1 : 0][x >= s ? 1 : 0];
      nx[y][x] = m[y % s][x % s] * 4 + off;
    }
    m = nx;
  }
  return m;
})();

function palLerp(pal: number, t: number): [number, number, number] {
  const stops = PAL_STOPS[pal];
  if (stops.length === 4) {
    const idx = t < 0.2 ? 0 : t < 0.5 ? 1 : t < 0.85 ? 2 : 3;
    return stops[idx] as [number, number, number];
  }
  const x = Math.min(0.9999, Math.max(0, t)) * 4;
  const i = Math.floor(x), f = x - i;
  const a = stops[i], b2 = stops[i + 1];
  return [a[0] + (b2[0] - a[0]) * f, a[1] + (b2[1] - a[1]) * f, a[2] + (b2[2] - a[2]) * f];
}

async function renderStaticFallback(): Promise<void> {
  const img = await loadImage('./tiles/satellite-12-687-1583.jpg');
  const block = state.pixel;
  const W = 300, H = Math.round((W * img.naturalHeight) / img.naturalWidth);
  const off = document.createElement('canvas');
  off.width = W; off.height = H;
  const octx = off.getContext('2d', { willReadFrequently: true })!;
  octx.drawImage(img, 0, 0, W, H);
  const src = octx.getImageData(0, 0, W, H);
  const out = octx.createImageData(W, H);
  const steps = state.pal === 3 ? 4 : 6;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const bx = Math.floor(x / block) * block, by = Math.floor(y / block) * block;
      const i = (by * W + bx) * 4;
      const lum = (src.data[i] * 0.299 + src.data[i + 1] * 0.587 + src.data[i + 2] * 0.114) / 255;
      const th = (BAYER8[by & 7][bx & 7] + 0.5) / 64;
      const q = lum * steps + (th - 0.5) * 1.4;
      const qi = Math.min(1, Math.max(0, Math.floor(q + 0.5) / steps));
      const [r, g, b] = palLerp(state.pal, qi);
      const o = (y * W + x) * 4;
      out.data[o] = r; out.data[o + 1] = g; out.data[o + 2] = b; out.data[o + 3] = 255;
    }
  }
  const fb = document.getElementById('fbCanvas') as HTMLCanvasElement;
  fb.width = W; fb.height = H;
  fb.getContext('2d')!.putImageData(out, 0, 0);
}

async function bootFallback(reason: string): Promise<void> {
  webglDead = true;
  const canvas = document.getElementById('gl') as HTMLCanvasElement;
  canvas.style.display = 'none';
  const f = document.getElementById('fallback')!;
  f.classList.remove('hidden');
  document.getElementById('fallbackMsg')!.textContent = 'WEBGL OFFLINE — ' + reason;
  try {
    await renderStaticFallback();
  } catch (e) {
    document.getElementById('fallbackMsg')!.textContent += ' (static render also failed: ' + (e as Error).message + ')';
  }
  // keep palette + pixel controls live in fallback mode
  document.getElementById('palettes')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b || !webglDead) return;
    state.pal = Number(b.dataset.pal);
    document.querySelectorAll('#palettes button').forEach((x) => x.classList.toggle('on', x === b));
    void renderStaticFallback();
  });
  document.getElementById('pixel')!.addEventListener('input', (e) => {
    if (!webglDead) return;
    state.pixel = Number((e.target as HTMLInputElement).value);
    document.getElementById('pixelV')!.textContent = String(state.pixel);
    void renderStaticFallback();
  });
}

function heightRange(img: HTMLImageElement): [number, number] {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let mn = Infinity, mx = -Infinity;
  for (let i = 0; i < d.length; i += 4) {
    const h = d[i] * 256 + d[i + 1] + d[i + 2] / 256 - 32768;
    if (h < mn) mn = h; if (h > mx) mx = h;
  }
  return [mn, mx];
}

function tex(gl: WebGL2RenderingContext, img: HTMLImageElement) {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return t;
}

async function main() {
  const canvas = document.getElementById('gl') as HTMLCanvasElement;
  let gl: WebGL2RenderingContext | null = null;
  try {
    gl = canvas.getContext('webgl2', { antialias: false });
  } catch (e) {
    await bootFallback('context creation threw: ' + (e as Error).message);
    return;
  }
  if (!gl) {
    await bootFallback('this browser returned no WebGL2 context (hardware acceleration off or blocklisted).');
    return;
  }
  const glc: WebGL2RenderingContext = gl;
  const prog = glc.createProgram()!;
  glc.attachShader(prog, compile(glc, glc.VERTEX_SHADER, VERT, 'vertex'));
  glc.attachShader(prog, compile(glc, glc.FRAGMENT_SHADER, FRAG, 'fragment'));
  glc.linkProgram(prog);
  if (!glc.getProgramParameter(prog, glc.LINK_STATUS)) {
    throw new Error('program link failed: ' + (glc.getProgramInfoLog(prog) || 'no log'));
  }
  glc.useProgram(prog);

  const buf = glc.createBuffer();
  glc.bindBuffer(glc.ARRAY_BUFFER, buf);
  glc.bufferData(glc.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), glc.STATIC_DRAW);
  glc.enableVertexAttribArray(0);
  glc.vertexAttribPointer(0, 2, glc.FLOAT, false, 0, 0);

  const U = (n: string) => glc.getUniformLocation(prog, n);
  const u = {
    height: U('u_height'), sat: U('u_sat'), res: U('u_res'), time: U('u_time'),
    pixel: U('u_pixel'), exagg: U('u_exagg'), zoom: U('u_zoom'), pan: U('u_pan'),
    bayerLog: U('u_bayerLog'), palette: U('u_palette'), mode: U('u_mode'),
    hmin: U('u_hmin'), hmax: U('u_hmax'),
  };

  const [hImg, sImg] = await Promise.all([
    loadImage('./tiles/terrarium-13-1374-3167.png'),
    loadImage('./tiles/satellite-12-687-1583.jpg'),
  ]);
  const [hmin, hmax] = heightRange(hImg);
  const tH = tex(glc, hImg);
  const tS = tex(glc, sImg);
  glc.uniform1i(u.height, 0);
  glc.uniform1i(u.sat, 1);
  glc.activeTexture(glc.TEXTURE0); glc.bindTexture(glc.TEXTURE_2D, tH);
  glc.activeTexture(glc.TEXTURE1); glc.bindTexture(glc.TEXTURE_2D, tS);
  glc.uniform1f(u.hmin, hmin);
  glc.uniform1f(u.hmax, hmax);

  const readout = document.getElementById('readout')!;
  readout.textContent = `ELEV ${Math.round(hmin)}m – ${Math.round(hmax)}m · TILE z13 HALF DOME · WEBGL2`;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    glc.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  addEventListener('resize', resize);

  let drag: { x: number; y: number } | null = null;
  canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = (e.clientX - drag.x) / innerHeight / state.zoom;
    const dy = (e.clientY - drag.y) / innerHeight / state.zoom;
    state.pan[0] = Math.max(-0.5, Math.min(0.5, state.pan[0] - dx));
    state.pan[1] = Math.max(-0.5, Math.min(0.5, state.pan[1] + dy));
    drag = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointerup', () => (drag = null));
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.zoom = Math.max(0.5, Math.min(3, state.zoom * (e.deltaY > 0 ? 0.92 : 1.08)));
    (document.getElementById('zoom') as HTMLInputElement).value = String(Math.round(state.zoom * 100));
    document.getElementById('zoomV')!.textContent = state.zoom.toFixed(1) + 'x';
  }, { passive: false });

  const bayerNames = ['', '2x2', '4x4', '8x8'];
  document.getElementById('palettes')!.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b || webglDead) return;
    state.pal = Number(b.dataset.pal);
    document.querySelectorAll('#palettes button').forEach((x) => x.classList.toggle('on', x === b));
  });
  const pixel = document.getElementById('pixel') as HTMLInputElement;
  pixel.addEventListener('input', () => { state.pixel = Number(pixel.value); document.getElementById('pixelV')!.textContent = pixel.value; });
  const bayer = document.getElementById('bayer') as HTMLInputElement;
  bayer.addEventListener('input', () => { state.bayerLog = Number(bayer.value); document.getElementById('bayerV')!.textContent = bayerNames[state.bayerLog]; });
  const exagg = document.getElementById('exagg') as HTMLInputElement;
  exagg.addEventListener('input', () => { state.exagg = Number(exagg.value) / 100; document.getElementById('exaggV')!.textContent = state.exagg.toFixed(1) + 'x'; });
  const zoom = document.getElementById('zoom') as HTMLInputElement;
  zoom.addEventListener('input', () => { state.zoom = Number(zoom.value) / 100; document.getElementById('zoomV')!.textContent = state.zoom.toFixed(1) + 'x'; });
  const modeBtn = document.getElementById('modeBtn')!;
  modeBtn.addEventListener('click', () => { state.mode = state.mode === 0 ? 1 : 0; modeBtn.textContent = 'MODE: ' + (state.mode === 0 ? 'RELIEF' : 'SAT'); });
  const driftBtn = document.getElementById('driftBtn')!;
  driftBtn.addEventListener('click', () => { state.drift = !state.drift; driftBtn.textContent = 'DRIFT: ' + (state.drift ? 'ON' : 'OFF'); driftBtn.classList.toggle('on', state.drift); });
  const shaderBtn = document.getElementById('shaderBtn')!;
  const shaderView = document.getElementById('shaderView')!;
  shaderBtn.addEventListener('click', () => {
    shaderView.textContent = FRAG;
    shaderView.classList.toggle('hidden');
  });

  const fps = document.getElementById('fps')!;
  let frames = 0, last = performance.now(), t0 = last;
  function frame(now: number) {
    const t = (now - t0) / 1000;
    if (state.drift && !drag) state.pan[0] = Math.sin(t * 0.06) * 0.08;
    glc.uniform2f(u.res, canvas.width, canvas.height);
    glc.uniform1f(u.time, t);
    glc.uniform1f(u.pixel, state.pixel);
    glc.uniform1f(u.exagg, state.exagg);
    glc.uniform1f(u.zoom, state.zoom);
    glc.uniform2f(u.pan, state.pan[0], state.pan[1]);
    glc.uniform1i(u.bayerLog, state.bayerLog);
    glc.uniform1i(u.palette, state.pal);
    glc.uniform1i(u.mode, state.mode);
    glc.drawArrays(glc.TRIANGLES, 0, 3);
    frames++;
    if (now - last > 500) { fps.textContent = Math.round((frames * 1000) / (now - last)) + ' fps'; frames = 0; last = now; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

main().catch((e) => {
  console.error(e);
  void bootFallback('render failed: ' + (e instanceof Error ? e.message : String(e)));
});
