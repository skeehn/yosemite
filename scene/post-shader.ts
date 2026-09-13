// Dither post-pass shaders shared by ValleyScene. Exported for the SHADER viewer.
export const POST_VERT = `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

export const POST_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D tD;
uniform vec2 u_res;
uniform int u_bayerLog;
uniform int u_mode;
uniform float u_time;
float bayerIdx2(vec2 p){
  vec2 q = mod(floor(p), 2.0);
  float x = step(0.5, q.x);
  float y = step(0.5, q.y);
  return (1.0 - x) * y * 3.0 + x * (1.0 - y) * 2.0 + x * y * 1.0;
}
float bayer2(vec2 p){ return (bayerIdx2(p) + 0.5) / 4.0; }
float bayer4(vec2 p){
  float c = bayerIdx2(floor(p * 0.5));
  float f = bayerIdx2(p);
  return (c * 4.0 + f + 0.5) / 16.0;
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
  if(p == 2){
    vec3 c1=vec3(0.13,0.10,0.32), c2=vec3(0.55,0.20,0.45), c3=vec3(0.95,0.42,0.25),
         c4=vec3(1.00,0.75,0.40), c5=vec3(1.00,0.96,0.85);
    if(t<0.25) return mix(c1,c2,t/0.25);
    if(t<0.50) return mix(c2,c3,(t-0.25)/0.25);
    if(t<0.75) return mix(c3,c4,(t-0.50)/0.25);
    return mix(c4,c5,(t-0.75)/0.25);
  }
  if(p == 3){
    vec3 c1=vec3(0.16,0.35,0.22), c2=vec3(0.42,0.52,0.28), c3=vec3(0.65,0.58,0.38),
         c4=vec3(0.48,0.36,0.26), c5=vec3(0.92,0.90,0.84);
    float b = floor(t*6.0)/6.0;
    if(b<0.2) return mix(c1,c2,b/0.2);
    if(b<0.4) return mix(c2,c3,(b-0.2)/0.2);
    if(b<0.6) return mix(c3,c4,(b-0.4)/0.2);
    if(b<0.8) return mix(c4,c5,(b-0.6)/0.2);
    return c5;
  }
  if(p == 4){
    vec3 c1=vec3(0.05,0.09,0.06), c2=vec3(0.19,0.38,0.19),
         c3=vec3(0.54,0.67,0.32), c4=vec3(0.85,0.92,0.62);
    float b = floor(t*4.0+0.5)/3.0;
    if(b<0.2) return c1; if(b<0.5) return c2; if(b<0.85) return c3; return c4;
  }
  vec3 c1=vec3(0.08,0.16,0.13), c2=vec3(0.20,0.33,0.22), c3=vec3(0.45,0.44,0.36),
       c4=vec3(0.62,0.60,0.55), c5=vec3(0.96,0.95,0.90);
  if(t<0.25) return mix(c1,c2,t/0.25);
  if(t<0.50) return mix(c2,c3,(t-0.25)/0.25);
  if(t<0.75) return mix(c3,c4,(t-0.50)/0.25);
  return mix(c4,c5,(t-0.75)/0.25);
}
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  float th = bayer(gl_FragCoord.xy, u_bayerLog);
  vec3 c = texture2D(tD, vUv).rgb;
  vec3 col;
  bool linear = true;
  if(u_mode == 0){
    col = floor(c * 5.0 + th) / 5.0;
  } else if(u_mode == 5){
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(0.066,0.062,0.055), vec3(0.937,0.914,0.863), step(th, lum));
    linear = false;
  } else {
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    float steps = (u_mode == 4) ? 4.0 : 6.0;
    float q = lum * steps + (th - 0.5) * 1.4;
    float qi = clamp((floor(q) + step(1.0 - fract(q), th)) / steps, 0.0, 1.0);
    col = pal(qi, u_mode);
    if(u_mode == 3){
      float cc = abs(fract(lum * 22.0) - 0.5);
      col *= (1.0 - smoothstep(0.06, 0.02, cc) * 0.25);
    }
  }
  if(linear){ col = pow(max(col, 0.0), vec3(0.4545)); }
  vec2 ndc = vUv - 0.5;
  col *= mix(0.78, 1.0, smoothstep(0.65, 0.2, length(ndc)));
  col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.035;
  gl_FragColor = vec4(col, 1.0);
}
`;

export const POST_SHADER_SOURCE = POST_FRAG;
