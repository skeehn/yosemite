# YOSEMITE — Half Dome in Bayer Dither

Real Yosemite Half Dome terrain rendered in raw WebGL2 with ordered Bayer dithering, pixelation, and multi-color palettes. Static site, Cloudflare Pages ready.

Data (baked in, no keys): AWS Terrarium DEM tile z13 1374/3167, Esri World Imagery tile z12. Half Dome 37.7459N 119.5932W.

Run: npm install, npm run dev (port 3003)
Build: npm run build (outputs dist/)
Deploy: wrangler pages deploy dist --project-name=yosemite
