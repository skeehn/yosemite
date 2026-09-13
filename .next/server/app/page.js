(()=>{var e={};e.id=931,e.ids=[931],e.modules={2934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},4580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},5869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},7700:(e,t,r)=>{"use strict";r.r(t),r.d(t,{GlobalError:()=>a.a,__next_app__:()=>p,originalPathname:()=>u,pages:()=>d,routeModule:()=>f,tree:()=>c}),r(908),r(1506),r(5866);var l=r(3191),s=r(8716),n=r(7922),a=r.n(n),i=r(5231),o={};for(let e in i)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(o[e]=()=>i[e]);r.d(t,o);let c=["",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(r.bind(r,908)),"/Users/kstephenkeehn/yosemite/app/page.tsx"]}]},{layout:[()=>Promise.resolve().then(r.bind(r,1506)),"/Users/kstephenkeehn/yosemite/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(r.t.bind(r,5866,23)),"next/dist/client/components/not-found-error"]}],d=["/Users/kstephenkeehn/yosemite/app/page.tsx"],u="/page",p={require:r,loadChunk:()=>Promise.resolve()},f=new l.AppPageRouteModule({definition:{kind:s.x.APP_PAGE,page:"/page",pathname:"/",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:c}})},8886:()=>{},5942:(e,t,r)=>{Promise.resolve().then(r.bind(r,7723))},3735:(e,t,r)=>{Promise.resolve().then(r.t.bind(r,2994,23)),Promise.resolve().then(r.t.bind(r,6114,23)),Promise.resolve().then(r.t.bind(r,9727,23)),Promise.resolve().then(r.t.bind(r,9671,23)),Promise.resolve().then(r.t.bind(r,1868,23)),Promise.resolve().then(r.t.bind(r,4759,23))},7723:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>p});var l=r(326),s=r(3353),n=r.n(s),a=r(7577),i=r(2704);let o=n()(async()=>{},{loadableGenerated:{modules:["app/page.tsx -> ../components/valley-canvas"]},ssr:!1}),c=[{id:0,label:"FULL"},{id:1,label:"ALPINE"},{id:2,label:"SUNSET"},{id:3,label:"TOPO"},{id:4,label:"GAMEBOY"}],d=[{id:"valley",label:"VALLEY"},{id:"elcap",label:"EL CAP"},{id:"falls",label:"FALLS"},{id:"dome",label:"DOME"}],u=["","2x2","4x4","8x8"];function p(){let[e,t]=(0,a.useState)(0),[r,s]=(0,a.useState)(3),[n,p]=(0,a.useState)(3),[f,m]=(0,a.useState)(1),[x,h]=(0,a.useState)("valley"),[v,b]=(0,a.useState)(!0),[g,y]=(0,a.useState)("— fps"),[j,P]=(0,a.useState)(!1),[_,E]=(0,a.useState)(!1),[S,N]=(0,a.useState)(!1),C=(0,a.useCallback)(e=>y(e+" fps"),[]),k=(0,a.useCallback)(()=>P(!0),[]);return(0,l.jsxs)(l.Fragment,{children:[l.jsx("div",{id:"stage",children:l.jsx(o,{palette:e,pixel:r,bayerLog:n,relief:f,view:x,spin:v,onFps:C,onReady:k})}),l.jsx("div",{id:"veil",className:j?"hidden":"",children:"CARVING VALLEY…"}),(0,l.jsxs)("header",{className:"hud top",children:[(0,l.jsxs)("div",{className:"brand",children:["YOSEMITE",l.jsx("span",{children:"/TUNNEL-VIEW-3D"})]}),l.jsx("div",{className:"coords",children:"NEXT.JS \xb7 THREE \xb7 R3F \xb7 BAYER DITHER POST-PASS"})]}),(0,l.jsxs)("aside",{className:"hud legend",children:[l.jsx("div",{children:"TUNNEL VIEW \xb7 DISPLACED RELIEF \xb7 102K TRIS"}),l.jsx("div",{children:g})]}),(0,l.jsxs)("footer",{className:"hud panel",children:[(0,l.jsxs)("div",{className:"row",children:[l.jsx("div",{className:"group",id:"palettes",children:c.map(r=>l.jsx("button",{className:e===r.id?"on":"",onClick:()=>t(r.id),children:r.label},r.id))}),(0,l.jsxs)("div",{className:"group",children:[d.map(e=>l.jsx("button",{className:x===e.id?"on":"",onClick:()=>h(e.id),children:e.label},e.id)),(0,l.jsxs)("button",{className:v?"on":"",onClick:()=>b(!v),children:["SPIN: ",v?"ON":"OFF"]}),l.jsx("button",{onClick:()=>E(!_),children:"SHADER"}),l.jsx("button",{onClick:()=>N(!0),children:"HIDE UI"})]})]}),(0,l.jsxs)("div",{className:"row sliders",children:[(0,l.jsxs)("label",{children:["PIXEL ",l.jsx("input",{type:"range",min:1,max:8,step:1,value:r,onChange:e=>s(Number(e.target.value))}),l.jsx("b",{children:r})]}),(0,l.jsxs)("label",{children:["BAYER ",l.jsx("input",{type:"range",min:1,max:3,step:1,value:n,onChange:e=>p(Number(e.target.value))}),l.jsx("b",{children:u[n]})]}),(0,l.jsxs)("label",{children:["RELIEF ",l.jsx("input",{type:"range",min:20,max:200,step:1,value:Math.round(100*f),onChange:e=>m(Number(e.target.value)/100)}),(0,l.jsxs)("b",{children:[f.toFixed(1),"x"]})]})]}),l.jsx("div",{className:"hint",children:"drag to orbit \xb7 wheel to zoom \xb7 H hides interface \xb7 depth baked from photo \xb7 photo: Diliff CC BY-SA 3.0"})]}),_&&l.jsx("pre",{id:"shaderView",children:i.V})]})}},2704:(e,t,r)=>{"use strict";r.d(t,{V:()=>l}),r(326),r(7577);let l=`
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
  if(u_mode == 0){
    col = floor(c * 5.0 + th) / 5.0;
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
  col = pow(max(col, 0.0), vec3(0.4545));
  vec2 ndc = vUv - 0.5;
  col *= mix(0.78, 1.0, smoothstep(0.65, 0.2, length(ndc)));
  col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.035;
  gl_FragColor = vec4(col, 1.0);
}
`},3353:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"default",{enumerable:!0,get:function(){return n}});let l=r(1174);r(326),r(7577);let s=l._(r(7028));function n(e,t){var r;let l={loading:e=>{let{error:t,isLoading:r,pastDelay:l}=e;return null}};"function"==typeof e&&(l.loader=e);let n={...l,...t};return(0,s.default)({...n,modules:null==(r=n.loadableGenerated)?void 0:r.modules})}("function"==typeof t.default||"object"==typeof t.default&&null!==t.default)&&void 0===t.default.__esModule&&(Object.defineProperty(t.default,"__esModule",{value:!0}),Object.assign(t.default,t),e.exports=t.default)},933:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"BailoutToCSR",{enumerable:!0,get:function(){return s}});let l=r(4129);function s(e){let{reason:t,children:r}=e;throw new l.BailoutToCSRError(t)}},7028:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"default",{enumerable:!0,get:function(){return c}});let l=r(326),s=r(7577),n=r(933),a=r(6618);function i(e){return{default:e&&"default"in e?e.default:e}}let o={loader:()=>Promise.resolve(i(()=>null)),loading:null,ssr:!0},c=function(e){let t={...o,...e},r=(0,s.lazy)(()=>t.loader().then(i)),c=t.loading;function d(e){let i=c?(0,l.jsx)(c,{isLoading:!0,pastDelay:!0,error:null}):null,o=t.ssr?(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)(a.PreloadCss,{moduleIds:t.modules}),(0,l.jsx)(r,{...e})]}):(0,l.jsx)(n.BailoutToCSR,{reason:"next/dynamic",children:(0,l.jsx)(r,{...e})});return(0,l.jsx)(s.Suspense,{fallback:i,children:o})}return d.displayName="LoadableComponent",d}},6618:(e,t,r)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"PreloadCss",{enumerable:!0,get:function(){return n}});let l=r(326),s=r(4580);function n(e){let{moduleIds:t}=e,r=(0,s.getExpectedRequestStore)("next/dynamic css"),n=[];if(r.reactLoadableManifest&&t){let e=r.reactLoadableManifest;for(let r of t){if(!e[r])continue;let t=e[r].files.filter(e=>e.endsWith(".css"));n.push(...t)}}return 0===n.length?null:(0,l.jsx)(l.Fragment,{children:n.map(e=>(0,l.jsx)("link",{precedence:"dynamic",rel:"stylesheet",href:r.assetPrefix+"/_next/"+encodeURI(e),as:"style"},e))})}},1506:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>n,metadata:()=>s});var l=r(9510);r(7272);let s={title:"YOSEMITE — Tunnel View in 3D Bayer Dither",description:"Interactive 3D Yosemite valley relief with pixel + Bayer dither post-processing."};function n({children:e}){return(0,l.jsxs)("html",{lang:"en",children:[(0,l.jsxs)("head",{children:[l.jsx("link",{rel:"preconnect",href:"https://fonts.googleapis.com"}),l.jsx("link",{href:"https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap",rel:"stylesheet"})]}),l.jsx("body",{children:e})]})}},908:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>l});let l=(0,r(8570).createProxy)(String.raw`/Users/kstephenkeehn/yosemite/app/page.tsx#default`)},7272:()=>{}};var t=require("../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),l=t.X(0,[819],()=>r(7700));module.exports=l})();