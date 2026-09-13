# YOSEMITE — explorable 3D valley reliefs in Bayer dither

Next.js 14 static export + three.js + react-three-fiber + drei, deployed to Cloudflare Pages.
Four photo-vistas (Tunnel View, Half Dome, Bridalveil Creek, El Capitan), each a
displaced-relief mesh with pixel + ordered-Bayer-dither post pass.

## Layout (clean boundaries: UI never touches three.js)

- api.ts — public contract: ValleySceneProps in, events out
- data/vistas.ts — vista catalog (photo, depth, pois, viewpoints). Add a vista here.
- lib/depth-table.ts — pure depth sampling + terrain height math (no three, no DOM)
- scene/ — engine: valley-scene (composition), terrain, dressing (trees/falls/markers),
  controls (orbit/drag-look/move/tour/scroll rigs), post-shader
- app/page.tsx — demo website: dock UI only, all 3D state via props
- scripts/bake-depth.py — depth baker: `python3 bake-depth.py <photo> <depth-out>`

## Reuse API (for the future website)

```tsx
import ValleyScene from './scene/valley-scene';

<ValleyScene
  vistaId="tunnel-view" uiMode="orbit"      // orbit | explore | scroll
  palette={0} pixel={3} bayerLog={3} relief={1}
  view="valley" spin hike={false} sun="day" tour={false}
  scrollProgress={null}                      // null = internal chapters; 0-1 = host-driven
  apiRef={apiRef}                            // { flyToView(id), flyToPoi(id) }
  onFps={...} onReady={...}
  onHoverPoi={(h) => ...}                    // { id, label, blurb } | null
  onHoverTerrain={(h) => ...}                // { elevPct, x, y } | null
  onChapter={(i, label) => ...}              // scroll chapters
  onSelectPoi={(id) => ...} onTourEnd={...}
/>
```

Modes: orbit (OrbitControls + fly-to viewpoints), explore (drag-look + WASD
fly/hike with terrain collision + guided tour), scroll (camera chapters from
page scroll, or host-driven via scrollProgress).

## Run / ship

npm install · npm run dev (3003) · npm run build (out/) ·
npx wrangler pages deploy out --project-name=yosemite-half-dome --branch=main

Photos: Diliff (CC BY-SA 3.0), GualdimG (CC BY-SA 4.0), Dave Riggs (CC BY-SA 2.0),
via Wikimedia Commons. Credits in data/vistas.ts and on-page.
