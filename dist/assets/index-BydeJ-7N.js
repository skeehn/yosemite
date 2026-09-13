(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))a(o);new MutationObserver(o=>{for(const r of o)if(r.type==="childList")for(const u of r.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&a(u)}).observe(document,{childList:!0,subtree:!0});function c(o){const r={};return o.integrity&&(r.integrity=o.integrity),o.referrerPolicy&&(r.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?r.credentials="include":o.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function a(o){if(o.ep)return;o.ep=!0;const r=c(o);fetch(o.href,r)}})();const U=`#version 300 es
layout(location=0) in vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }`,R=`#version 300 es
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
int bayerIndex(ivec2 p, int logSize){
  int idx = 0;
  for(int i = 0; i < 4; i++){
    if(i >= logSize) break;
    int ix = (p.x >> i) & 1;
    int iy = (p.y >> i) & 1;
    idx = (idx << 2) | (iy << 1) | ix;
  }
  return idx;
}
float bayer(vec2 frag, int logSize){
  ivec2 p = ivec2(floor(frag));
  int levels = 1 << (2 * logSize);
  return (float(bayerIndex(p, logSize)) + 0.5) / float(levels);
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
  vec3 base;
  float ramp;
  if(u_mode == 1){
    base = texture(u_sat, nuv).rgb;
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
}`,n={pal:0,pixel:3,bayerLog:3,exagg:1,zoom:1,mode:0,drift:!0,pan:[0,0]};function A(t,e,c){const a=t.createShader(e);if(t.shaderSource(a,c),t.compileShader(a),!t.getShaderParameter(a,t.COMPILE_STATUS))throw new Error(t.getShaderInfoLog(a)||"shader fail");return a}async function B(t){return new Promise((e,c)=>{const a=new Image;a.crossOrigin="anonymous",a.onload=()=>e(a),a.onerror=()=>c(new Error("img load fail "+t)),a.src=t})}function N(t){const e=document.createElement("canvas");e.width=t.naturalWidth,e.height=t.naturalHeight;const c=e.getContext("2d",{willReadFrequently:!0});c.drawImage(t,0,0);const a=c.getImageData(0,0,e.width,e.height).data;let o=1/0,r=-1/0;for(let u=0;u<a.length;u+=4){const d=a[u]*256+a[u+1]+a[u+2]/256-32768;d<o&&(o=d),d>r&&(r=d)}return[o,r]}function z(t,e){const c=t.createTexture();return t.bindTexture(t.TEXTURE_2D,c),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,e),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),c}async function X(){const t=document.getElementById("gl"),e=t.getContext("webgl2",{antialias:!1});if(!e){document.getElementById("fallback").classList.remove("hidden"),t.style.display="none";return}const c=e.createProgram();if(e.attachShader(c,A(e,e.VERTEX_SHADER,U)),e.attachShader(c,A(e,e.FRAGMENT_SHADER,R)),e.linkProgram(c),!e.getProgramParameter(c,e.LINK_STATUS))throw new Error(e.getProgramInfoLog(c)||"link fail");e.useProgram(c);const a=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,a),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW),e.enableVertexAttribArray(0),e.vertexAttribPointer(0,2,e.FLOAT,!1,0,0);const o=i=>e.getUniformLocation(c,i),r={height:o("u_height"),sat:o("u_sat"),res:o("u_res"),time:o("u_time"),pixel:o("u_pixel"),exagg:o("u_exagg"),zoom:o("u_zoom"),pan:o("u_pan"),bayerLog:o("u_bayerLog"),palette:o("u_palette"),mode:o("u_mode"),hmin:o("u_hmin"),hmax:o("u_hmax")},[u,d]=await Promise.all([B("./tiles/terrarium-13-1374-3167.png"),B("./tiles/satellite-12-687-1583.jpg")]),[x,v]=N(u),S=z(e,u),P=z(e,d);e.uniform1i(r.height,0),e.uniform1i(r.sat,1),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,S),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,P),e.uniform1f(r.hmin,x),e.uniform1f(r.hmax,v);const w=document.getElementById("readout");w.textContent=`ELEV ${Math.round(x)}m – ${Math.round(v)}m · TILE z13 HALF DOME`;function E(){const i=Math.min(window.devicePixelRatio||1,2);t.width=Math.floor(innerWidth*i),t.height=Math.floor(innerHeight*i),e.viewport(0,0,t.width,t.height)}E(),addEventListener("resize",E);let l=null;t.addEventListener("pointerdown",i=>{l={x:i.clientX,y:i.clientY},t.setPointerCapture(i.pointerId)}),t.addEventListener("pointermove",i=>{if(!l)return;const m=(i.clientX-l.x)/innerHeight/n.zoom,f=(i.clientY-l.y)/innerHeight/n.zoom;n.pan[0]=Math.max(-.5,Math.min(.5,n.pan[0]-m)),n.pan[1]=Math.max(-.5,Math.min(.5,n.pan[1]+f)),l={x:i.clientX,y:i.clientY}}),t.addEventListener("pointerup",()=>l=null),t.addEventListener("wheel",i=>{i.preventDefault(),n.zoom=Math.max(.5,Math.min(3,n.zoom*(i.deltaY>0?.92:1.08))),document.getElementById("zoom").value=String(Math.round(n.zoom*100)),document.getElementById("zoomV").textContent=n.zoom.toFixed(1)+"x"},{passive:!1});const M=["","2x2","4x4","8x8"];document.getElementById("palettes").addEventListener("click",i=>{const m=i.target.closest("button");m&&(n.pal=Number(m.dataset.pal),document.querySelectorAll("#palettes button").forEach(f=>f.classList.toggle("on",f===m)))});const p=document.getElementById("pixel");p.addEventListener("input",()=>{n.pixel=Number(p.value),document.getElementById("pixelV").textContent=p.value});const _=document.getElementById("bayer");_.addEventListener("input",()=>{n.bayerLog=Number(_.value),document.getElementById("bayerV").textContent=M[n.bayerLog]});const y=document.getElementById("exagg");y.addEventListener("input",()=>{n.exagg=Number(y.value)/100,document.getElementById("exaggV").textContent=n.exagg.toFixed(1)+"x"});const b=document.getElementById("zoom");b.addEventListener("input",()=>{n.zoom=Number(b.value)/100,document.getElementById("zoomV").textContent=n.zoom.toFixed(1)+"x"});const T=document.getElementById("modeBtn");T.addEventListener("click",()=>{n.mode=n.mode===0?1:0,T.textContent="MODE: "+(n.mode===0?"RELIEF":"SAT")});const g=document.getElementById("driftBtn");g.addEventListener("click",()=>{n.drift=!n.drift,g.textContent="DRIFT: "+(n.drift?"ON":"OFF"),g.classList.toggle("on",n.drift)});const D=document.getElementById("shaderBtn"),L=document.getElementById("shaderView");D.addEventListener("click",()=>{L.textContent=R,L.classList.toggle("hidden")});const F=document.getElementById("fps");let h=0,s=performance.now(),C=s;function I(i){const m=(i-C)/1e3;n.drift&&!l&&(n.pan[0]=Math.sin(m*.06)*.08),e.uniform2f(r.res,t.width,t.height),e.uniform1f(r.time,m),e.uniform1f(r.pixel,n.pixel),e.uniform1f(r.exagg,n.exagg),e.uniform1f(r.zoom,n.zoom),e.uniform2f(r.pan,n.pan[0],n.pan[1]),e.uniform1i(r.bayerLog,n.bayerLog),e.uniform1i(r.palette,n.pal),e.uniform1i(r.mode,n.mode),e.drawArrays(e.TRIANGLES,0,3),h++,i-s>500&&(F.textContent=Math.round(h*1e3/(i-s))+" fps",h=0,s=i),requestAnimationFrame(I)}requestAnimationFrame(I)}X().catch(t=>{console.error(t),document.getElementById("fallback").classList.remove("hidden")});
