// Public API of the reusable scene. Props in, events out.
// Deliberately small: orbit + scroll, one relief, dither post.
export type UiMode = 'orbit' | 'scroll';
export type PaletteMode = 0 | 1 | 2 | 3 | 4 | 5; // full, alpine, sunset, topo, gameboy, 1-bit
export type SunMode = 'day' | 'sunset';

export type HoverPoi = { id: string; label: string; blurb: string } | null;
export type HoverTerrain = { elevPct: number; x: number; y: number } | null;

export type ValleySceneProps = {
  vistaId: string;
  uiMode: UiMode;
  palette: PaletteMode;
  pixel: number;
  bayerLog: number;
  relief: number;
  /** orbit viewpoint id (from vista.views) */
  view: string;
  spin: boolean;
  sun: SunMode;
  /** null = internal ScrollControls chapters; 0-1 = host-driven scroll */
  scrollProgress: number | null;
  onFps: (n: number) => void;
  onReady: () => void;
  onHoverPoi: (h: HoverPoi) => void;
  onHoverTerrain: (h: HoverTerrain) => void;
  onChapter: (index: number, label: string) => void;
  onSelectPoi: (id: string) => void;
};
