'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PaletteMode, UiMode, SunMode, ValleyApi } from '../components/valley-canvas';
import { POST_SHADER_SOURCE } from '../components/valley-canvas';

const ValleyCanvas = dynamic(() => import('../components/valley-canvas'), { ssr: false });

const PALS: { id: PaletteMode; label: string; sw: string }[] = [
  { id: 0, label: 'FULL', sw: 'linear-gradient(135deg,#7fa8c9,#3d5a3a 55%,#c9bfa5)' },
  { id: 1, label: 'ALPINE', sw: 'linear-gradient(135deg,#14291f,#73705c 60%,#f5f2e6)' },
  { id: 2, label: 'SUNSET', sw: 'linear-gradient(135deg,#211a52,#f26b40 60%,#fff5d9)' },
  { id: 3, label: 'TOPO', sw: 'linear-gradient(135deg,#295937,#a89461 60%,#ebe6d6)' },
  { id: 4, label: 'GAMEBOY', sw: 'linear-gradient(135deg,#0d1710,#619154 60%,#d9eb9e)' },
  { id: 5, label: '1-BIT', sw: 'linear-gradient(135deg,#11100e 50%,#efe9dc 50%)' },
];
const VIEWS = [
  { id: 'valley', label: 'VALLEY' },
  { id: 'elcap', label: 'EL CAP' },
  { id: 'falls', label: 'FALLS' },
  { id: 'dome', label: 'DOME' },
];
const BAYER_NAMES = ['', '2x2', '4x4', '8x8'];

export default function Page() {
  const [mode, setMode] = useState<UiMode>('orbit');
  const [locked, setLocked] = useState(false);
  const [pal, setPal] = useState<PaletteMode>(0);
  const [pixel, setPixel] = useState(3);
  const [bayer, setBayer] = useState(3);
  const [relief, setRelief] = useState(1);
  const [view, setView] = useState('valley');
  const [spin, setSpin] = useState(true);
  const [sun, setSun] = useState<SunMode>('day');
  const [hike, setHike] = useState(false);
  const [tune, setTune] = useState(false);
  const [fps, setFps] = useState('— fps');
  const [ready, setReady] = useState(false);
  const [showShader, setShowShader] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);
  const apiRef = useRef<ValleyApi | null>(null);

  const onFps = useCallback((n: number) => setFps(n + ' fps'), []);
  const onReady = useCallback(() => setReady(true), []);
  const onLockChange = useCallback((l: boolean) => setLocked(l), []);
  const onVisitPoi = useCallback((id: string) => setView(id), []);

  useEffect(() => {
    document.body.classList.toggle('chrome-hidden', uiHidden);
    if (!uiHidden) return;
    const show = () => setUiHidden(false);
    window.addEventListener('pointermove', show, { once: true });
    return () => window.removeEventListener('pointermove', show);
  }, [uiHidden]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'h' || e.key === 'H') setUiHidden((v) => !v);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const exploring = mode === 'explore';
  const effPixel = Math.min(8, pixel + (exploring ? 2 : 0));

  const enterExplore = () => {
    setMode('explore');
    setSpin(false);
  };
  const exitExplore = () => {
    apiRef.current?.unlock();
    setMode('orbit');
  };

  return (
    <>
      <div id="stage">
        <ValleyCanvas
          palette={pal}
          pixel={effPixel}
          bayerLog={bayer}
          relief={relief}
          view={view}
          spin={spin}
          uiMode={mode}
          hike={hike}
          sun={sun}
          apiRef={apiRef}
          onFps={onFps}
          onReady={onReady}
          onLockChange={onLockChange}
          onVisitPoi={onVisitPoi}
        />
      </div>
      <div id="veil" className={ready ? 'hidden' : ''}>CARVING VALLEY…</div>
      {locked && <div id="crosshair" />}

      <header className="hud top">
        <div className="brand">YOSEMITE<span>TUNNEL VIEW · 3D</span></div>
        <div className="coords">{fps} · {exploring ? (hike ? 'HIKE' : 'FLY') : 'ORBIT'}</div>
      </header>

      {exploring && !locked && ready && (
        <div className="hud enter">
          <div className="enter-card">
            <div className="enter-title">ENTER THE VALLEY</div>
            <div className="enter-sub">{hike ? 'WASD glide low · SHIFT fast · ESC release' : 'WASD fly · SPACE up · C down · SHIFT fast · ESC release'}</div>
            <button className="enter-btn" onClick={() => apiRef.current?.lock()}>CLICK TO TAKE CONTROL</button>
          </div>
        </div>
      )}

      <nav className="hud dock">
        <div className="seg">
          <button className={mode === 'orbit' ? 'on' : ''} onClick={() => exploring && exitExplore()}>ORBIT</button>
          <button className={exploring ? 'on explore-only' : 'explore-only'} onClick={() => !exploring && enterExplore()}>EXPLORE</button>
        </div>
        <span className="div" />
        <div className="dots">
          {PALS.map((p) => (
            <button
              key={p.id}
              title={p.label}
              className={'dot' + (pal === p.id ? ' on' : '')}
              onClick={() => setPal(p.id)}
            >
              <span style={{ background: p.sw }} />
            </button>
          ))}
        </div>
        <span className="div" />
        <button className={tune ? 'on' : ''} onClick={() => setTune(!tune)}>TUNE</button>
        {tune && (
          <div className="tune">
            <div className="tune-row">
              {VIEWS.map((v) => (
                <button key={v.id} className={view === v.id && !exploring ? 'on' : ''} onClick={() => { setView(v.id); if (exploring) apiRef.current?.flyTo(v.id); }}>
                  {v.label}
                </button>
              ))}
            </div>
            <label>PIXEL <input type="range" min={1} max={8} step={1} value={pixel} onChange={(e) => setPixel(Number(e.target.value))} /><b>{effPixel}</b></label>
            <label>BAYER <input type="range" min={1} max={3} step={1} value={bayer} onChange={(e) => setBayer(Number(e.target.value))} /><b>{BAYER_NAMES[bayer]}</b></label>
            <label>RELIEF <input type="range" min={20} max={200} step={1} value={Math.round(relief * 100)} onChange={(e) => setRelief(Number(e.target.value) / 100)} /><b>{relief.toFixed(1)}x</b></label>
            <div className="tune-row">
              <button className={sun === 'day' ? 'on' : ''} onClick={() => setSun('day')}>DAY</button>
              <button className={sun === 'sunset' ? 'on' : ''} onClick={() => setSun('sunset')}>SUNSET</button>
              <button className={!hike ? 'on' : ''} onClick={() => setHike(false)}>FLY</button>
              <button className={hike ? 'on' : ''} onClick={() => setHike(true)}>HIKE</button>
              <button className={spin && !exploring ? 'on' : ''} onClick={() => setSpin(!spin)}>SPIN</button>
              <button onClick={() => setShowShader(!showShader)}>SHADER</button>
              <button onClick={() => setUiHidden(true)}>HIDE</button>
            </div>
            <div className="hint">drag orbit · wheel zoom · H hides interface · depth baked from photo · photo Diliff CC BY-SA 3.0</div>
          </div>
        )}
      </nav>

      {showShader && <pre id="shaderView">{POST_SHADER_SOURCE}</pre>}
    </>
  );
}
