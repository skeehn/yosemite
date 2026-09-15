'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { VISTAS } from '../data/vistas';
import type { PaletteMode, SunMode } from '../api';
import { BUILD_ID } from '@/lib/build-id';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const ValleyScene = dynamic(() => import('../scene/valley-scene'), { ssr: false });

const PALS: { id: PaletteMode; label: string; sw: string; desc: string }[] = [
  { id: 0, label: 'FULL', sw: 'linear-gradient(135deg,#7fa8c9,#3d5a3a 55%,#c9bfa5)', desc: 'True color, dithered clean. The default.' },
  { id: 1, label: 'ALPINE', sw: 'linear-gradient(135deg,#14291f,#73705c 60%,#f5f2e6)', desc: 'Forest-floor neutrals. Quiet and premium.' },
  { id: 2, label: 'SUNSET', sw: 'linear-gradient(135deg,#211a52,#f26b40 60%,#fff5d9)', desc: 'Golden-hour gradient, always on.' },
  { id: 3, label: 'TOPO', sw: 'linear-gradient(135deg,#295937,#a89461 60%,#ebe6d6)', desc: 'Survey greens with contour bands.' },
  { id: 4, label: 'GAMEBOY', sw: 'linear-gradient(135deg,#0d1710,#619154 60%,#d9eb9e)', desc: 'Four greens. 1989 called.' },
  { id: 5, label: '1-BIT', sw: 'linear-gradient(135deg,#11100e 50%,#efe9dc 50%)', desc: 'Ink on paper. Obra-Dinn mode.' },
];

const FAQS = [
  { q: 'What is Valley?', a: 'An AI-designed backdrop engine. Living 3D landscapes in ordered Bayer dither, tuned per brand, embedded anywhere with one snippet.' },
  { q: 'How do I put it on my site?', a: 'Copy the iframe from the Embed section. No keys, no build step, no server. Params control vista, style, pixel size, and light.' },
  { q: 'What does it cost to run?', a: 'Almost nothing. One displaced relief plus one fullscreen dither pass holds 60 fps on integrated graphics, shipped as static files.' },
  { q: 'Can it show my own location?', a: 'Yes. Any photo becomes a vista: we bake a depth map, the relief follows, the dither does the rest. Studio plans include custom locations.' },
  { q: 'Who owns the imagery?', a: 'Yosemite photography is Creative Commons (Diliff, Dave Riggs, GualdimG via Wikimedia), credited on-page and in the repo.' },
];

const SNIPPET = `<iframe
  src="https://yosemite-half-dome.pages.dev/?embed=1&vista=tunnel-view&palette=0&pixel=4&sun=sunset"
  style="width:100%;height:100vh;border:0"
  title="Valley living backdrop"></iframe>`;

const DEPLOY_LOG = `$ valley deploy --vista tunnel-view --style sunset
✓ relief baked (102,400 tris, depth 640px)
✓ dither pass armed (Bayer 8x8, dual-density)
✓ uploaded 21 files (2.88s)
✓ live → valley.run/tunnel-view`;

const BENCH: { row: string; valley: string; img: string; vid: string }[] = [
  { row: 'MOTION', valley: '60 fps live geometry', img: 'None', vid: '30 fps loop' },
  { row: 'RESTYLE', valley: '6 styles, instant', img: 'Re-export', vid: 'Re-render' },
  { row: 'CAMERA', valley: 'Scroll + hover', img: 'Fixed', vid: 'Fixed' },
  { row: 'PAYLOAD', valley: '~1 MB photos', img: '~200 KB', vid: '5 MB+' },
  { row: 'HOSTING', valley: 'Static files', img: 'Static files', vid: 'CDN stream' },
];

export default function Page() {
  const [vistaIdx, setVistaIdx] = useState(0);
  const [local, setLocal] = useState(0);
  const [sun, setSun] = useState<SunMode>('day');
  const [pal, setPal] = useState<PaletteMode>(0);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        const f = p * VISTAS.length;
        setVistaIdx(Math.min(VISTAS.length - 1, Math.floor(f)));
        setLocal(Math.min(1, Math.max(0, f - Math.min(VISTAS.length - 1, Math.floor(f)))));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const onReady = useCallback(() => setReady(true), []);
  const noop = useCallback(() => {}, []);
  const copySnippet = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }, []);

  return (
    <>
      <div id="stage">
        <ValleyScene
          vistaId={VISTAS[vistaIdx]?.id ?? 'tunnel-view'}
          uiMode="scroll"
          palette={pal}
          pixel={3}
          bayerLog={3}
          relief={1.3}
          depthSplit={11}
          view={(VISTAS[vistaIdx] ?? VISTAS[0]).defaultView}
          spin={false}
          sun={sun}
          scrollProgress={local}
          onFps={noop}
          onReady={onReady}
          onHoverPoi={noop}
          onHoverTerrain={noop}
          onChapter={noop}
          onSelectPoi={noop}
        />
      </div>
      <div id="veil" className={ready ? 'hidden' : ''}>VALLEY</div>

      <button id="sunbtn" className="hidden" onClick={() => setSun(sun === 'day' ? 'sunset' : 'day')}>
        {sun === 'day' ? 'DAY' : 'SUNSET'}
      </button>

      <main className="site">
        <nav className="nav">
          <div className="wordmark">VALLEY</div>
          <div className="nav-links">
            <a href="#styles">STYLES</a>
            <a href="#vistas">VISTAS</a>
            <a href="#embed">EMBED</a>
            <a href="#pricing">PRICING</a>
            <a href="#faq">FAQ</a>
            <a href="https://github.com/skeehn/yosemite">GITHUB</a>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="ghost" onClick={() => setSun(sun === 'day' ? 'sunset' : 'day')}>{sun === 'day' ? 'DAY' : 'SUNSET'}</button>
            <a href="#embed"><Button size="sm">GET EMBED CODE</Button></a>
          </div>
        </nav>

        <section className="hero">
          <div className="flex gap-2">
            <Badge>60 FPS LIVE</Badge>
            <Badge variant="outline">OPEN REPO</Badge>
          </div>
          <h1>Give your website<br />a <em>living landscape.</em></h1>
          <p className="sub">
            Valley is the backdrop engine for sites with a pulse: real 3D Yosemite relief
            in ordered Bayer dither, restyled live, embedded in one snippet.
          </p>
          <div className="hero-cta">
            <a href="#embed"><Button>GET EMBED CODE</Button></a>
            <a href="#styles"><Button variant="outline">BROWSE STYLES</Button></a>
          </div>
          <div className="cmdline" onClick={copySnippet} title="Click to copy">
            <span>$</span> iframe valley --vista tunnel-view --style sunset --pixel 4
          </div>
          <div className="stats">
            <div><b>60</b><span>FPS LIVE</span></div>
            <div><b>4</b><span>VISTAS</span></div>
            <div><b>6</b><span>STYLES</span></div>
            <div><b>1</b><span>SNIPPET</span></div>
          </div>
          <div className="cue">SCROLL TO TRAVEL<span /></div>
        </section>

        <div className="strip">
          <span>ORDERED BAYER 8×8</span>
          <span>DUAL-DENSITY PIXELS</span>
          <span>STATIC-HOST READY</span>
          <span>HOVER + SCROLL PARALLAX</span>
        </div>

        <section className="prod">
          <div className="prod-grid">
            {[
              { t: 'RENDER', d: 'Photo becomes relief. Depth baked per vista, displaced at 102K tris, lit like a diorama.', a: '#styles', c: 'Try styles' },
              { t: 'TRAVEL', d: 'Scroll chapters fly the camera. Hover sways the world. Every vista knows its waypoints.', a: '#vistas', c: 'See vistas' },
              { t: 'EMBED', d: 'One iframe, five params. No keys, no server. The valley runs itself on any static host.', a: '#embed', c: 'Get code' },
            ].map((c) => (
              <Card key={c.t}>
                <CardHeader><CardTitle>{c.t}</CardTitle></CardHeader>
                <CardContent className="text-xs leading-7 text-white/60">{c.d}</CardContent>
                <CardFooter><a className="trylink" href={c.a}>{c.c} →</a></CardFooter>
              </Card>
            ))}
          </div>
        </section>

        <section className="styles" id="styles">
          <div className="numlabel">[ 01 — STYLES ]</div>
          <h2>Six moods, <em>one valley.</em></h2>
          <p className="lede">Every style re-grades the same live relief. Click one — the background behind this page changes instantly.</p>
          <div className="grid">
            {PALS.map((p) => (
              <Card key={p.id} className={pal === p.id ? 'ring-1 ring-white' : 'cursor-pointer'} onClick={() => setPal(p.id)}>
                <CardContent className="pt-6">
                  <div className="swatch" style={{ background: p.sw }} />
                  <CardTitle>{p.label}</CardTitle>
                  <CardDescription className="mt-2">{p.desc}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div id="vistas">
          <div className="vsec-label"><div className="numlabel">[ 02 — VISTAS ]</div></div>
          {VISTAS.map((v, i) => (
            <section key={v.id} className={'vsec' + (i % 2 ? ' right' : '')}>
              <Card className="max-w-[340px]">
                <CardContent className="pt-6">
                  <div className="num">0{i + 1} — LOCATION</div>
                  <div className="name">{v.label}</div>
                  <div className="sub">{v.sub}</div>
                  <p className="mt-4 text-xs leading-7 text-white/80">{v.blurb} The camera already knows the way here — you just scrolled through it.</p>
                  <div className="credit">PHOTO {v.credit}</div>
                </CardContent>
              </Card>
            </section>
          ))}
        </div>

        <section className="bench" id="why">
          <div className="numlabel">[ 03 — WHY LIVE ]</div>
          <h2>Backdrop options, <em>measured.</em></h2>
          <table>
            <thead><tr><th></th><th>VALLEY LIVE</th><th>STATIC IMAGE</th><th>VIDEO LOOP</th></tr></thead>
            <tbody>
              {BENCH.map((r) => (
                <tr key={r.row}><td>{r.row}</td><td className="hot">{r.valley}</td><td>{r.img}</td><td>{r.vid}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="embed" id="embed">
          <div className="numlabel">[ 04 — EMBED ]</div>
          <h2>Drop it <em>in.</em></h2>
          <p className="lede">One iframe. No keys, no build step, no server. The valley runs itself — drift, sway, and light included.</p>
          <Card className="mt-6 max-w-[720px]">
            <CardContent className="pt-5">
              <pre className="snippet" style={{ marginTop: 0, border: 'none', background: 'transparent', padding: 0 }}>{SNIPPET}</pre>
            </CardContent>
            <CardFooter className="gap-2 flex-wrap">
              <Button size="sm" onClick={copySnippet}>{copied ? 'COPIED' : 'COPY SNIPPET'}</Button>
              {['vista=*', 'palette=0-5', 'pixel=1-8', 'sun=day|sunset', 'spin=0|1'].map((p) => (
                <Badge key={p} variant="outline">{p}</Badge>
              ))}
            </CardFooter>
          </Card>
          <pre className="term">{DEPLOY_LOG}</pre>
        </section>

        <section className="pricing" id="pricing">
          <div className="numlabel">[ 05 — PRICING ]</div>
          <h2>Start free.</h2>
          <div className="tiers">
            <Card>
              <CardHeader><CardTitle>HOBBY</CardTitle></CardHeader>
              <CardContent>
                <div className="price">$0</div>
                <ul>
                  <li>1 live site</li>
                  <li>All 6 styles</li>
                  <li>Community locations</li>
                </ul>
              </CardContent>
              <CardFooter><Button variant="outline" className="w-full">START</Button></CardFooter>
            </Card>
            <Card className="ring-1 ring-white">
              <CardHeader><CardTitle>STUDIO</CardTitle><Badge className="w-fit">POPULAR</Badge></CardHeader>
              <CardContent>
                <div className="price">$19<span>/mo</span></div>
                <ul>
                  <li>Unlimited sites</li>
                  <li>Day/sunset cycling</li>
                  <li>Custom locations</li>
                </ul>
              </CardContent>
              <CardFooter><Button className="w-full">GO STUDIO</Button></CardFooter>
            </Card>
            <Card>
              <CardHeader><CardTitle>SCALE</CardTitle></CardHeader>
              <CardContent>
                <div className="price">Custom</div>
                <ul>
                  <li>SLA + support</li>
                  <li>Private vistas</li>
                  <li>SSO + audit</li>
                </ul>
              </CardContent>
              <CardFooter><Button variant="outline" className="w-full">TALK TO US</Button></CardFooter>
            </Card>
          </div>
        </section>

        <section className="pricing" id="faq" style={{ paddingTop: 0 }}>
          <div className="numlabel">[ 06 — FAQ ]</div>
          <h2>Asked, <em>answered.</em></h2>
          <Card className="mt-6 max-w-[720px]">
            <CardContent className="pt-2">
              <Accordion type="single" collapsible>
                <AccordionItem value="a"><AccordionTrigger>What is Valley?</AccordionTrigger><AccordionContent>An AI-designed backdrop engine. Living 3D landscapes in ordered Bayer dither, tuned per brand, embedded anywhere with one snippet.</AccordionContent></AccordionItem>
                <AccordionItem value="b"><AccordionTrigger>How do I put it on my site?</AccordionTrigger><AccordionContent>Copy the iframe from the Embed section. No keys, no build step, no server. Params control vista, style, pixel size, and light.</AccordionContent></AccordionItem>
                <AccordionItem value="c"><AccordionTrigger>What does it cost to run?</AccordionTrigger><AccordionContent>Almost nothing. One displaced relief plus one fullscreen dither pass holds 60 fps on integrated graphics, shipped as static files.</AccordionContent></AccordionItem>
                <AccordionItem value="d"><AccordionTrigger>Can it show my own location?</AccordionTrigger><AccordionContent>Yes. Any photo becomes a vista: we bake a depth map, the relief follows, the dither does the rest. Studio plans include custom locations.</AccordionContent></AccordionItem>
                <AccordionItem value="e"><AccordionTrigger>Who owns the imagery?</AccordionTrigger><AccordionContent>Yosemite photography is Creative Commons (Diliff, Dave Riggs, GualdimG via Wikimedia), credited on-page and in the repo.</AccordionContent></AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </section>

        <section className="closer">
          <h2>Put a valley behind <em>your launch.</em></h2>
          <a href="#embed"><Button size="lg">GET THE SNIPPET</Button></a>
        </section>

        <footer className="foot">
          <span>VALLEY · SHOT ON LOCATION IN YOSEMITE</span>
          <a href="https://github.com/skeehn/yosemite">GITHUB</a>
          <span>PHOTOS CC BY-SA · DILIFF · DAVE RIGGS · GUALDIMG</span>
          <span>BUILD {BUILD_ID}</span>
        </footer>
      </main>
    </>
  );
}
