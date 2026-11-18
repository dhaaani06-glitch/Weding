import React, {useEffect, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import {rnd, useFrame} from '../shared';
import {BUSH, CLOUD, DOWN_ARROW, HERO_A, HERO_B, HERO_CHEER, MONTH_HAPPY, MONTH_HURT, MONTH_SAD, Pix, pixW, POINTER, SPARK_A, SPARK_B, SUN, TREE} from './sprites';

// PIKSEL kit — 16-bit RPG game UI in crisp pixel art (party menus, HP/XP gauges, quest log, battle wipes, dialog box).
// Files: kit.tsx (palette PIKSEL-16, sprite renderer, windows, text, gauges, backgrounds, characters, captions, transitions)
// + sprites.ts (pixel maps and procedural sprite builders; re-exported here) + demo.tsx. Fonts come from <StyleFonts />:
// 'Pik Head' (Press Start 2P) and 'Pik Text' (Pixelify Sans). Draw everything in ONE SVG with viewBox 270×480 (×4 = 1080×1920)
// and shapeRendering crispEdges; positions are whole logical pixels. Captions are the RPG dialog box (HTML text overlay,
// frame-exact typewriter per word). Rules of the look:
//  · motion snaps to the pixel grid; sprite cycles are 2 frames at 4–10 fps; pops are two 4-frame holds (hop)
//  · blinks ≤ 4 Hz, shakes held at 15 Hz, counters tick ≤ 20 Hz
//  · never slide periodic content fast (tile grids / text rows alias into "blinks"): slide a new page OVER a still one,
//    or open windows vertically.
// Landscape (v1.11): the same ×4 grid turned sideways — logical 480×270 (×4 = 1920×1080). `usePx()` gives the logical
// size; `PxScreen` is the root svg for either format. Backgrounds, transitions, Hud and the dialog box read the frame;
// windows/sprites/text keep the coordinates you give them (re-flow those per format in the episode).
export * from './sprites';

/** a caption word (same shape as the starter's src/lib/words.ts Word) */
export type Word = {i: number; word: string; start: number; end: number};

// ═════════════════════════ engine: palette, sprites, defs, text, windows, gauges, cell masks ═════════════════════════
/** PIKSEL-16 — original 16-colour palette (night navy, berry, coral, honey, mint, ocean blues, warm paper white).
 *  Every value is hand-nudged; none matches a published palette hex. */
export const P = {
  ink: '#171A30', plum: '#63285F', red: '#BC4258', orange: '#F4865B', yellow: '#FFD47C', lime: '#B2F06C', green: '#3CBB6B', teal: '#27757F',
  deep: '#2B3A76', blue: '#4062D0', sky: '#46ACF4', cyan: '#80F1F0', white: '#F7F3EA', g1: '#9BB3C5', g2: '#5A6F8B', g3: '#363E5C',
} as const;
export type PKey = keyof typeof P;
/** one-character colour codes used by pixel maps */
export const CH: Record<string, string> = {
  k: P.ink, p: P.plum, r: P.red, o: P.orange, y: P.yellow, l: P.lime, g: P.green, t: P.teal,
  d: P.deep, b: P.blue, s: P.sky, c: P.cyan, w: P.white, '1': P.g1, '2': P.g2, '3': P.g3,
};

export const HEAD = "'Pik Head', monospace"; // Press Start 2P — UI titles, numbers (8-px grid: use sizes 8/16/24/32/48)
export const TEXT = "'Pik Text', monospace"; // Pixelify Sans — dialog / captions

export const sn = Math.round;
/** pixel scale of the grid (logical px → screen px) */
export const PX = 4;
/** logical canvas of the current composition: 270×480 portrait, 480×270 landscape */
export const usePx = () => {
  const fr = useFrame();
  return {LW: fr.W / PX, LH: fr.H / PX, wide: fr.wide, fr};
};
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** stepped time: holds a value for 1/fps seconds (sprite cycles, blinks). */
export const step = (t: number, fps: number) => Math.floor(t * fps);

// ---------------- pixel sprites ----------------
type Run = {x: number; y: number; w: number; ch: string};
const runCache = new WeakMap<Pix, Run[]>();
const runsOf = (map: Pix): Run[] => {
  const hit = runCache.get(map);
  if (hit) return hit;
  const out: Run[] = [];
  map.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') { x++; continue; }
      let e = x + 1;
      while (e < row.length && row[e] === ch) e++;
      out.push({x, y, w: e - x, ch});
      x = e;
    }
  });
  runCache.set(map, out);
  return out;
};

/** Pixel sprite. `tint` paints every pixel one colour (hit flash / silhouette); `tintK` recolours the outline. */
export const Spr: React.FC<{m: Pix; x: number; y: number; s?: number; flip?: boolean; sub?: Record<string, string>; tint?: string; tintK?: string}> = ({
  m, x, y, s = 1, flip = false, sub, tint, tintK,
}) => {
  const W = pixW(m);
  return (
    <g transform={`translate(${sn(x)} ${sn(y)}) scale(${s})`}>
      {runsOf(m).map((r, i) => {
        const fill = r.ch === 'k' && tintK ? tintK : tint ?? sub?.[r.ch] ?? CH[r.ch] ?? P.ink;
        return <rect key={i} x={flip ? W - r.x - r.w : r.x} y={r.y} width={r.w} height={1} fill={fill} />;
      })}
    </g>
  );
};

// ---------------- defs: dither patterns ----------------
/** 50 % checker of a palette colour */
export const d50 = (k: PKey) => `url(#d50-${k})`;
/** 25 % (one pixel in four) */
export const d25 = (k: PKey) => `url(#d25-${k})`;
export const PxDefs: React.FC = () => (
  <defs>
    {(Object.keys(P) as PKey[]).map((k) => (
      <React.Fragment key={k}>
        <pattern id={`d50-${k}`} width={2} height={2} patternUnits="userSpaceOnUse">
          <rect x={0} y={0} width={1} height={1} fill={P[k]} />
          <rect x={1} y={1} width={1} height={1} fill={P[k]} />
        </pattern>
        <pattern id={`d25-${k}`} width={2} height={2} patternUnits="userSpaceOnUse">
          <rect x={0} y={0} width={1} height={1} fill={P[k]} />
        </pattern>
      </React.Fragment>
    ))}
  </defs>
);
/** Root svg of a PIKSEL frame: the composition size, viewBox = the logical grid (270×480 or 480×270), crisp edges,
 *  PxDefs included. Put scenes, Hud and DialogFrame inside; DialogText goes after it as HTML. */
export const PxScreen: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {LW, LH, fr} = usePx();
  return (
    <svg width={fr.W} height={fr.H} viewBox={`0 0 ${LW} ${LH}`} shapeRendering="crispEdges" style={{position: 'absolute', left: 0, top: 0}}>
      <PxDefs />
      {children}
    </svg>
  );
};

// ---------------- text ----------------
const OFF8 = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
/** Pixel text; (x, y) = top-left of the cap box (y + size = baseline). `ol` = 1-px outline, `sh` = 1-px drop shadow. */
export const Tx: React.FC<{x: number; y: number; s?: number; c?: string; a?: 'start' | 'middle' | 'end'; f?: string; sh?: string; ol?: string; w?: number; children: React.ReactNode}> = ({
  x, y, s = 8, c = P.white, a = 'start', f = HEAD, sh, ol, w = 400, children,
}) => {
  const base = {fontFamily: f, fontSize: s, textAnchor: a, fontWeight: w} as const;
  const yb = sn(y) + s;
  const xx = sn(x);
  return (
    <g>
      {ol && OFF8.map(([dx, dy], i) => <text key={i} x={xx + dx} y={yb + dy} fill={ol} {...base}>{children}</text>)}
      {sh && <text x={xx + (s >= 16 ? 2 : 1)} y={yb + (s >= 16 ? 2 : 1)} fill={sh} {...base}>{children}</text>}
      <text x={xx} y={yb} fill={c} {...base}>{children}</text>
    </g>
  );
};

// ---------------- windows ----------------
const TONE: Record<string, [string, string, PKey, string]> = {
  // top fill, bottom fill, dither key for the band, bevel line
  blue: [P.blue, P.deep, 'deep', P.sky],
  dark: [P.g3, P.ink, 'ink', P.g2],
  red: [P.red, P.plum, 'plum', P.orange],
  plum: [P.plum, P.ink, 'ink', P.red],
  teal: [P.teal, P.deep, 'deep', P.green],
  paper: [P.yellow, P.orange, 'orange', P.white],
  gold: [P.yellow, P.orange, 'orange', P.white],
  page: [P.white, P.yellow, 'yellow', P.white],
};
export type Tone = keyof typeof TONE;

/** RPG window: ink outline with notched corners, light rim, ink inner line, two-tone dithered fill.
 *  `open` 0→1 grows it from its middle line in pixel steps (classic window-open), children appear when open. */
export const Win: React.FC<{x: number; y: number; w: number; h: number; open?: number; tone?: Tone; rim?: string; shadow?: boolean; children?: React.ReactNode}> = ({
  x, y, w, h, open = 1, tone = 'blue', rim = P.white, shadow = true, children,
}) => {
  const q = clamp01(open);
  if (q <= 0) return null;
  x = sn(x); y = sn(y); w = sn(w); h = sn(h);
  const hh = q >= 1 ? h : Math.max(6, 2 * Math.round((h * q) / 2));
  const yy = y + Math.round((h - hh) / 2);
  const [top, bot, dk, bevel] = TONE[tone];
  const band = Math.max(1, Math.round((hh - 6) * 0.42));
  const rest = hh - 6 - band - 4;
  return (
    <g>
      {shadow && <rect x={x + 2} y={yy + 2} width={w} height={hh} fill={d50('ink')} />}
      <rect x={x + 1} y={yy} width={w - 2} height={hh} fill={P.ink} />
      <rect x={x} y={yy + 1} width={w} height={hh - 2} fill={P.ink} />
      <rect x={x + 2} y={yy + 1} width={w - 4} height={hh - 2} fill={rim} />
      <rect x={x + 1} y={yy + 2} width={w - 2} height={hh - 4} fill={rim} />
      <rect x={x + 2} y={yy + 2} width={w - 4} height={hh - 4} fill={P.ink} />
      <rect x={x + 3} y={yy + 3} width={w - 6} height={hh - 6} fill={top} />
      {hh > 14 && <rect x={x + 3} y={yy + 3 + band} width={w - 6} height={Math.min(4, hh - 6 - band)} fill={d50(dk)} />}
      {rest > 0 && <rect x={x + 3} y={yy + 7 + band} width={w - 6} height={rest} fill={bot} />}
      {hh > 10 && <rect x={x + 3} y={yy + 3} width={w - 6} height={1} fill={bevel} />}
      {q >= 1 && children}
    </g>
  );
};

/** Segmented gauge: n cells of width cw (gap 1) starting at x. colour per cell via fn. */
export const Cells: React.FC<{x: number; y: number; n: number; cw: number; h: number; color: (i: number) => string | null}> = ({x, y, n, cw, h, color}) => (
  <g>
    <rect x={x - 1} y={y - 1} width={n * (cw + 1) + 1} height={h + 2} fill={P.ink} />
    {Array.from({length: n}).map((_, i) => {
      const c = color(i);
      return c ? <rect key={i} x={x + i * (cw + 1)} y={y} width={cw} height={h} fill={c} /> : null;
    })}
  </g>
);

/** Continuous pixel bar with frame + highlight line. */
export const Bar: React.FC<{x: number; y: number; w: number; h: number; q: number; c: string; back?: string; hi?: string}> = ({x, y, w, h, q, c, back = P.g3, hi}) => {
  const fw = sn(w * clamp01(q));
  return (
    <g>
      <rect x={x - 1} y={y - 1} width={w + 2} height={h + 2} fill={P.ink} />
      <rect x={x} y={y} width={w} height={h} fill={back} />
      {fw > 0 && <rect x={x} y={y} width={fw} height={h} fill={c} />}
      {fw > 0 && hi && <rect x={x} y={y} width={fw} height={1} fill={hi} />}
    </g>
  );
};

// ---------------- transitions (cell masks) ----------------
export type Cell = {x: number; y: number; w: number; h: number};
/** random-order block dissolve: cells revealed when q passes their threshold */
export const dissolveCells = (q: number, size = 10, seed = 3, lw = 270, lh = 480): Cell[] => {
  const out: Cell[] = [];
  const cols = Math.ceil(lw / size), rows = Math.ceil(lh / size);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if (rnd(seed + i * 17.13 + j * 3.71) < q) out.push({x: i * size, y: j * size, w: size, h: size});
  }
  return out;
};
/** diagonal sweep of growing squares (top-left → bottom-right) */
export const squaresCells = (q: number, size = 16, lw = 270, lh = 480): Cell[] => {
  const out: Cell[] = [];
  const cols = Math.ceil(lw / size), rows = Math.ceil(lh / size);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const d = (i / cols) * 0.45 + (j / rows) * 0.55;
    const lq = clamp01(q * 2 - d);
    const s = 2 * Math.round((lq * size) / 2);
    if (s <= 0) continue;
    out.push({x: i * size + (size - s) / 2, y: j * size + (size - s) / 2, w: s, h: s});
  }
  return out;
};
/** spiral order (outer ring → centre) of a cols×rows block grid */
export const spiralOrder = (cols: number, rows: number) => {
  const order: Array<[number, number]> = [];
  let top = 0, left = 0, bottom = rows - 1, right = cols - 1;
  while (top <= bottom && left <= right) {
    for (let i = left; i <= right; i++) order.push([i, top]);
    top++;
    for (let j = top; j <= bottom; j++) order.push([right, j]);
    right--;
    if (top <= bottom) { for (let i = right; i >= left; i--) order.push([i, bottom]); bottom--; }
    if (left <= right) { for (let j = bottom; j >= top; j--) order.push([left, j]); left++; }
  }
  return order;
};

export const ClipCells: React.FC<{id: string; cells: Cell[]}> = ({id, cells}) => (
  <clipPath id={id}>
    {cells.map((c, i) => <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} />)}
  </clipPath>
);

/** Integer shake held at 15 Hz (4-frame holds → never reads as a blink). */
export const pxShake = (t: number, impacts: number[], amp = 2, dur = 0.36) => {
  let x = 0, y = 0;
  const SX = [1, -1, 1, 0, -1, 1], SY = [-1, 1, 0, 1, -1, 0];
  for (const at of impacts) {
    const k = t - at;
    if (k < 0 || k >= dur) continue;
    const st = Math.floor(k * 15);
    const fall = 1 - k / dur;
    x += Math.round(SX[st % 6] * amp * fall + (SX[st % 6] > 0 ? 0.2 : -0.2));
    y += Math.round(SY[st % 6] * amp * fall);
  }
  return {x, y};
};

/** characters of `s` typed from `at` at `cps` (≤ 20 Hz ticks) */
export const typed = (s: string, t: number, at: number, cps = 20) => (t < at ? '' : s.slice(0, Math.min(s.length, Math.floor((t - at) * cps) + 1)));
/** stepped pop: lifts h px for 4 frames, then h/2 for 4 frames, then rests */
export const hop = (t: number, at: number, h = 3) => (t < at ? 0 : t < at + 0.07 ? -h : t < at + 0.14 ? -Math.ceil(h / 2) : 0);
/** 0→1 window-open progress (vertical grow) */
export const opening = (t: number, at: number, dur = 0.12) => clamp01((t - at) / dur);
/** counter value quantised to 20 Hz */
export const tick = (t: number) => Math.floor(t * 20) / 20;
/** snap a stop/start time to the hero's 6 fps walk-cycle boundary, so no cycle frame lasts a single frame */
export const alignWalk = (x: number) => Math.floor(x * 6) / 6;
/** same for the buddy's 4 fps hop (phase-shifted by 0.12 s) */
export const alignHop = (x: number) => Math.floor((x + 0.12) * 4) / 4 - 0.12;

export const useFontsReady = () => {
  const [handle] = useState(() => delayRender('piksel fonts'));
  useEffect(() => {
    Promise.all([document.fonts.load("8px 'Pik Head'"), document.fonts.load("600 16px 'Pik Text'")])
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);
};

// ───────────────────────── backgrounds ─────────────────────────
/** dotted menu backdrop, dots drifting diagonally 1 px per hold */
export const MenuBg: React.FC<{t: number; id?: string}> = ({t, id = 'menuDots'}) => {
  const {LW, LH} = usePx();
  const o = step(t, 6) % 8;
  return (
    <g>
      <defs>
        <pattern id={id} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform={`translate(${o} ${o})`}>
          <rect x={0} y={0} width={1} height={1} fill={P.deep} />
          <rect x={4} y={4} width={1} height={1} fill={P.g3} />
        </pattern>
      </defs>
      <rect x={0} y={0} width={LW} height={LH} fill={P.ink} />
      <rect x={0} y={0} width={LW} height={LH} fill={`url(#${id})`} />
      <rect x={0} y={0} width={LW} height={22} fill={d25('deep')} />
      <rect x={0} y={LH - 44} width={LW} height={44} fill={d25('deep')} />
    </g>
  );
};

/** stepped pixel dome (hill) standing on y = base, with a light rim */
export const Dome: React.FC<{cx: number; w: number; h: number; base: number; c: string; top?: string}> = ({cx, w, h, base, c, top}) => (
  <g>
    {Array.from({length: h}).map((_, r) => {
      const hw = Math.round((w / 2) * Math.sqrt(1 - Math.pow((h - r) / h, 2)));
      const prev = r > 0 ? Math.round((w / 2) * Math.sqrt(1 - Math.pow((h - r + 1) / h, 2))) : 0;
      if (hw <= 0) return null;
      const rim = Math.max(1, hw - prev);
      return (
        <g key={r}>
          <rect x={cx - hw} y={base - h + r} width={hw * 2} height={1} fill={c} />
          {top && <rect x={cx - hw} y={base - h + r} width={rim} height={1} fill={top} />}
          {top && <rect x={cx + hw - rim} y={base - h + r} width={rim} height={1} fill={top} />}
        </g>
      );
    })}
  </g>
);

/** vertical sky made of flat bands joined by 50 % dither rows */
export const SkyBands: React.FC<{bands: Array<[number, PKey]>; to: number}> = ({bands, to}) => {
  const {LW} = usePx();
  return (
  <g>
    {bands.map(([y, k], i) => {
      const y1 = i < bands.length - 1 ? bands[i + 1][0] : to;
      return (
        <g key={i}>
          <rect x={0} y={y} width={LW} height={y1 - y} fill={P[k]} />
          {i < bands.length - 1 && <rect x={0} y={y1 - 4} width={LW} height={4} fill={d50(bands[i + 1][1])} />}
        </g>
      );
    })}
  </g>
  );
};

const DAY_SKY: Array<[number, PKey]> = [[0, 'deep'], [60, 'blue'], [128, 'sky'], [196, 'cyan']];
const DAWN_SKY: Array<[number, PKey]> = [[0, 'deep'], [52, 'plum'], [112, 'red'], [164, 'orange'], [206, 'yellow']];

/** outdoor field: sky, sun, drifting clouds, hills, parallax trees, grass + a stone path that scrolls with `scroll`.
 *  Fills the frame in either format (landscape default horizon 120, more hills/trees/posts across the width). */
export const FieldBg: React.FC<{t: number; scroll?: number; dawn?: boolean; horizon?: number; sunY?: number}> = ({t, scroll = 0, dawn = false, horizon: hz, sunY}) => {
  const {LW, LH, wide} = usePx();
  const horizon = hz ?? (wide ? 120 : 236);
  const cl = step(t, 5);
  const par = sn(scroll * 0.4);
  const gs = sn(scroll);
  // wrap periods and counts: portrait values unchanged, landscape covers 480 logical px
  const PH = wide ? 560 : 360, PC = wide ? 550 : 340, PG = wide ? 520 : 312, PF = wide ? 510 : 330;
  const sky = dawn ? DAWN_SKY : DAY_SKY;
  const bands: Array<[number, PKey]> = wide ? sky.map(([y, k]) => [Math.round((y * horizon) / 236), k]) : sky;
  const hy = (y: number) => (wide ? Math.round((y * horizon) / 236) : y);
  return (
    <g>
      <SkyBands bands={bands} to={horizon} />
      {dawn ? <Spr m={SUN} x={wide ? LW / 2 - 13 : 122} y={sunY ?? hy(150)} /> : <Spr m={SUN} x={wide ? LW - 106 : 206} y={wide ? 30 : 70} />}
      {!dawn && (wide ? [[28, 30], [62, 160], [38, 290], [70, 410]] : [[12, 40], [150, 90], [60, 120]]).map(([y0, x0], i) => (
        <Spr key={i} m={CLOUD} x={((x0 + cl * (1 + (i % 2)) - par * 0.2) % PC + PC) % PC - 40} y={wide ? Math.round((y0 * horizon) / 120) : 58 + y0 + i * 6} />
      ))}
      {dawn && (wide ? [[0, 30], [1, 220], [2, 400]] : [[0, 30], [1, 180]]).map(([i, x0]) => <Spr key={i} m={CLOUD} x={((x0 + cl) % PC) - 40} y={hy(90 + (i % 2) * 40)} />)}
      {(wide ? [[30, 110, 26], [120, 120, 18], [220, 130, 30], [330, 120, 22], [440, 130, 28]] : [[30, 110, 26], [120, 120, 18], [220, 130, 30]]).map(([cx, w, h], i) => <Dome key={`f${i}`} cx={((cx - par * 0.5) % PH + PH) % PH - 40} w={w} h={h} base={horizon} c={dawn ? P.plum : P.teal} top={dawn ? P.red : P.green} />)}
      {(wide ? [[60, 0], [150, 1], [250, 0], [330, 1], [430, 0], [510, 1]] : [[60, 0], [150, 1], [250, 0], [330, 1]]).map(([x0, k], i) => {
        const x = ((x0 - par) % PH + PH) % PH - 40;
        return k ? <Spr key={`t${i}`} m={TREE} x={x} y={horizon - 26} /> : <Spr key={`t${i}`} m={BUSH} x={x} y={horizon - 9} />;
      })}
      {/* ground */}
      <rect x={0} y={horizon} width={LW} height={LH - horizon} fill={P.green} />
      <rect x={0} y={horizon} width={LW} height={2} fill={P.lime} />
      <rect x={0} y={horizon + 2} width={LW} height={3} fill={d50('lime')} />
      {Array.from({length: wide ? 30 : 18}).map((_, i) => {
        const per = wide ? 10 : 6;
        const row = Math.floor(i / per), x = (((i % per) * 52 + row * 26 - gs) % PG + PG) % PG - 20;
        return <rect key={i} x={x} y={horizon + 12 + row * 64 + (row === 0 ? 0 : 50)} width={6} height={2} fill={P.teal} />;
      })}
      {/* stone path */}
      <rect x={0} y={horizon + 26} width={LW} height={20} fill={P.g2} />
      <rect x={0} y={horizon + 26} width={LW} height={1} fill={P.g1} />
      <rect x={0} y={horizon + 45} width={LW} height={2} fill={P.g3} />
      {Array.from({length: PG / 26}).map((_, i) => (
        <rect key={i} x={((i * 26 - gs) % PG + PG) % PG - 20} y={horizon + 27} width={1} height={18} fill={P.g3} />
      ))}
      <rect x={0} y={horizon + 47} width={LW} height={LH - horizon - 47} fill={P.green} />
      <rect x={0} y={horizon + 47} width={LW} height={2} fill={d50('teal')} />
      {/* near foreground: flowers + a wooden fence, scrolling faster than the path (parallax) */}
      {Array.from({length: wide ? 14 : 11}).map((_, i) => {
        const x = (((i * 37 + (i % 3) * 11) - sn(scroll * 1.15)) % PF + PF) % PF - 30;
        const y = horizon + 54 + (i % 3) * 7;
        const c = [P.yellow, P.white, P.orange][i % 3];
        return (
          <g key={`fl${i}`}>
            <rect x={x} y={y + 1} width={3} height={1} fill={c} /><rect x={x + 1} y={y} width={1} height={3} fill={c} />
            <rect x={x + 1} y={y + 1} width={1} height={1} fill={i % 3 === 1 ? P.yellow : P.red} />
          </g>
        );
      })}
      {(() => {
        const fs = sn(scroll * 1.35);
        const fy = horizon + 72;
        return (
          <g>
            <rect x={0} y={fy + 5} width={LW} height={3} fill={P.ink} />
            <rect x={0} y={fy + 6} width={LW} height={1} fill={P.red} />
            <rect x={0} y={fy + 14} width={LW} height={3} fill={P.ink} />
            <rect x={0} y={fy + 15} width={LW} height={1} fill={P.plum} />
            {Array.from({length: PF / 30}).map((_, i) => {
              const x = ((i * 30 - fs) % PF + PF) % PF - 30;
              return (
                <g key={`fp${i}`}>
                  <rect x={x - 1} y={fy - 1} width={7} height={26} fill={P.ink} />
                  <rect x={x} y={fy} width={5} height={24} fill={P.plum} />
                  <rect x={x} y={fy} width={2} height={24} fill={P.red} />
                </g>
              );
            })}
            <rect x={0} y={fy + 24} width={LW} height={3} fill={d50('teal')} />
          </g>
        );
      })()}
    </g>
  );
};

/** library wall: shelves of seeded book spines in the palette */
const SPINES: PKey[] = ['red', 'plum', 'teal', 'deep', 'orange', 'g2', 'green', 'blue'];
export const LibraryBg: React.FC<{t: number}> = ({t}) => {
  const {LW, LH, wide} = usePx();
  return (
  <g>
    <rect x={0} y={0} width={LW} height={LH} fill={P.ink} />
    {Array.from({length: wide ? 4 : 7}).map((_, r) => {
      const y = 20 + r * 64;
      let x = 4;
      const books: React.ReactNode[] = [];
      let k = 0;
      while (x < LW - 4) {
        const w = 4 + ((r * 7 + k * 5) % 4);
        const h = 34 + ((r * 3 + k * 11) % 14);
        const c = SPINES[(r * 5 + k * 3) % SPINES.length];
        books.push(<g key={k}><rect x={x} y={y + 50 - h} width={w} height={h} fill={P[c]} />{k % 3 === 0 && <rect x={x} y={y + 54 - h} width={w} height={1} fill={P.yellow} />}</g>);
        x += w + 1;
        k++;
      }
      return (
        <g key={r}>
          {books}
          <rect x={0} y={y + 50} width={LW} height={5} fill={P.plum} />
          <rect x={0} y={y + 50} width={LW} height={1} fill={P.red} />
          <rect x={0} y={y + 55} width={LW} height={2} fill={P.ink} />
        </g>
      );
    })}
    {/* dim the wall so windows read on top, with a warm candle pool that breathes in 2 steps */}
    <rect x={0} y={0} width={LW} height={LH} fill={d50('ink')} />
    <rect x={0} y={0} width={LW} height={LH} fill={d25('ink')} />
    {wide
      ? <rect x={130} y={step(t, 2) % 2 ? 46 : 48} width={220} height={120} fill={d25('plum')} />
      : <rect x={60} y={step(t, 2) % 2 ? 140 : 142} width={150} height={130} fill={d25('plum')} />}
  </g>
  );
};

/** result-screen rays: static pixel wedges from (cx, cy) */
export const RaysBg: React.FC<{cx: number; cy: number; t: number}> = ({cx, cy, t}) => {
  const {LW, LH} = usePx();
  const rot = step(t, 2) * 2;
  return (
    <g>
      <rect x={0} y={0} width={LW} height={LH} fill={P.deep} />
      {Array.from({length: 12}).map((_, i) => {
        const a0 = ((i * 30 + rot) * Math.PI) / 180, a1 = ((i * 30 + 15 + rot) * Math.PI) / 180;
        const R = 600;
        return <polygon key={i} points={`${cx},${cy} ${cx + Math.cos(a0) * R},${cy + Math.sin(a0) * R} ${cx + Math.cos(a1) * R},${cy + Math.sin(a1) * R}`} fill={P.blue} />;
      })}
      <rect x={0} y={0} width={LW} height={LH} fill={d25('ink')} />
    </g>
  );
};

// ───────────────────────── characters ─────────────────────────
/** the player ("KAMU"): walk cycle at 6 fps with a 1-px bob, or cheer */
export const Hero: React.FC<{x: number; y: number; s?: number; t: number; walk?: boolean; cheer?: boolean; flip?: boolean; tint?: string}> = ({x, y, s = 3, t, walk = true, cheer, flip, tint}) => {
  const f = step(t, 6) % 2;
  const m = cheer ? HERO_CHEER : walk ? (f ? HERO_B : HERO_A) : HERO_A;
  return <Spr m={m} x={x} y={y + (walk && f ? -1 : 0)} s={s} flip={flip} tint={tint} />;
};
/** the habit mascot: a calendar buddy (green header), hops at 4 fps */
export const BUDDY = {H: P.green, h: P.teal};
export const Buddy: React.FC<{x: number; y: number; s?: number; t: number; mood?: 'happy' | 'sad' | 'hurt'; hopping?: boolean; sub?: Record<string, string>}> = ({x, y, s = 2, t, mood = 'happy', hopping = true, sub = BUDDY}) => {
  const m = mood === 'sad' ? MONTH_SAD : mood === 'hurt' ? MONTH_HURT : MONTH_HAPPY;
  return <Spr m={m} x={x} y={y - (hopping && step(t + 0.12, 4) % 2 ? 1 : 0)} s={s} sub={sub} />;
};

// ───────────────────────── UI ─────────────────────────
export const Pointer: React.FC<{x: number; y: number; t: number; still?: boolean}> = ({x, y, t, still}) => <Spr m={POINTER} x={x + (still ? 0 : step(t, 4) % 2)} y={y} />;

export const Sparkle: React.FC<{x: number; y: number; t: number; at: number; dur?: number}> = ({x, y, t, at, dur = 0.5}) => {
  if (t < at || t > at + dur) return null;
  return <Spr m={step(t - at, 8) % 2 ? SPARK_B : SPARK_A} x={x} y={y} />;
};

/** small window with centred text */
export const Tag: React.FC<{x: number; y: number; w: number; text: string; tone?: Tone; c?: string; s?: number; shadow?: boolean; open?: number}> = ({
  x, y, w, text, tone = 'red', c = P.white, s = 8, shadow = false, open = 1,
}) => (
  <Win x={x} y={y} w={w} h={s + 10} tone={tone} shadow={shadow} open={open}>
    <Tx x={x + w / 2} y={y + 5} a="middle" c={c} s={s}>{text}</Tx>
  </Win>
);

/** two-line banner window (size-16 text, ink outline) that opens vertically. Default x: 12 portrait (full width),
 *  centred in landscape. */
export const Banner: React.FC<{x?: number; y: number; w?: number; open: number; tone?: Tone; l1: string; l2?: string; c1?: string; c2?: string; sh?: string}> = ({
  x: x0, y, w = 246, open, tone = 'red', l1, l2, c1 = P.white, c2 = P.yellow, sh = P.plum,
}) => {
  const {LW, wide} = usePx();
  const x = x0 ?? (wide ? Math.round((LW - w) / 2) : 12);
  return (
  <Win x={x} y={y} w={w} h={l2 ? 46 : 28} tone={tone} open={open}>
    <Tx x={x + w / 2} y={y + 6} s={16} a="middle" c={c1} ol={P.ink} sh={sh}>{l1}</Tx>
    {l2 && <Tx x={x + w / 2} y={y + 26} s={16} a="middle" c={c2} ol={P.ink} sh={sh}>{l2}</Tx>}
  </Win>
  );
};

/** day tile (calendar page with a number or a mark) */
export const DayTile: React.FC<{x: number; y: number; n?: number | string; w?: number; h?: number; top?: string; dim?: boolean}> = ({x, y, n, w = 18, h = 16, top = P.red, dim}) => (
  <g>
    <rect x={x - 1} y={y - 1} width={w + 2} height={h + 2} fill={P.ink} />
    <rect x={x} y={y} width={w} height={h} fill={dim ? P.g2 : P.white} />
    <rect x={x} y={y} width={w} height={3} fill={dim ? P.g3 : top} />
    <rect x={x} y={y + h - 1} width={w} height={1} fill={dim ? P.g3 : P.g1} />
    {n !== undefined && <Tx x={x + w / 2} y={y + Math.round((h - 8) / 2) + 2} a="middle" c={dim ? P.g3 : P.ink}>{String(n)}</Tx>}
  </g>
);

/** chapter tab + episode progress pips along the top (landscape: inside the 16:9 safe area, x 28, y 16) */
export const Hud: React.FC<{chapter: string; idx: number; n: number; t: number}> = ({chapter, idx, n, t}) => {
  const {LW, wide} = usePx();
  const m = wide ? 28 : 12, ty = wide ? 16 : 27;
  const w = chapter.length * 8 + 14;
  const px0 = LW - m - n * 10 + 2;
  return (
    <g>
      <Win x={m} y={ty} w={w} h={20} tone="red" shadow={false}>
        <Tx x={m + w / 2} y={ty + 6} a="middle" c={P.yellow}>{chapter}</Tx>
      </Win>
      {Array.from({length: n}).map((_, i) => {
        const x = px0 + i * 10, cur = i === idx;
        return (
          <g key={i}>
            <rect x={x} y={ty + 5} width={8} height={8} fill={P.ink} />
            <rect x={x + 1} y={ty + 6} width={6} height={6} fill={i < idx ? P.lime : cur ? (step(t, 2) % 2 ? P.yellow : P.orange) : P.g3} />
          </g>
        );
      })}
    </g>
  );
};

// ───────────────────────── dialog box (captions) ─────────────────────────
export type Page = {start: number; end: number; words: Word[]};
/** sentence pages from word-index breaks, each page lasts until the next starts */
export const buildPages = (words: Word[], breaks: number[]): Page[] =>
  breaks.slice(0, -1).map((b, k) => ({words: words.filter((w) => w.i >= b && w.i < breaks[k + 1])}))
    .map((pg, k, all) => ({...pg, start: pg.words[0].start, end: k < all.length - 1 ? all[k + 1].words[0].start : 9999}));
const pageAtT = (pages: Page[], t: number) => pages.find((x) => t >= x.start && t < x.end) ?? pages[0];
/** letters of a word visible at t: first letter on the word's start frame, fully typed by ~80 % of the word */
export const typedWord = (w: {word: string; start: number; end: number}, t: number) => {
  if (t < w.start) return 0;
  const cps = Math.max(24, w.word.length / Math.max(0.12, (w.end - w.start) * 0.8));
  return Math.min(w.word.length, Math.floor((t - w.start) * cps) + 1);
};

/** dialog box geometry in logical px: portrait box 8,358 254×68 + bezel from 430; landscape a full-width box
 *  28,184 424×56 (text 780–928 screen px, 120+ px clear of the bottom) + a 26-px bezel at the bottom. */
export const dialogBox = (wide: boolean, LW: number, LH: number) =>
  wide ? {x: 28, y: 184, w: LW - 56, h: 56, bezel: LH - 26, hint: LH - 22, hx: [30, 116]}
    : {x: 8, y: 358, w: 254, h: 68, bezel: 430, hint: 436, hx: [18, 104]};

export const DialogFrame: React.FC<{t: number; pages: Page[]; name?: string}> = ({t, pages, name = 'NARATOR'}) => {
  const {LW, LH, wide} = usePx();
  const b = dialogBox(wide, LW, LH);
  const pg = pageAtT(pages, t);
  const last = pg.words[pg.words.length - 1];
  const done = t >= last.end;
  const nw = name.length * 8 + 14;
  return (
    <g>
      <Win x={b.x} y={b.y} w={b.w} h={b.h} tone="dark" rim={P.white}>
        {done && step(t - last.end, 4) % 2 === 0 && <Spr m={DOWN_ARROW} x={b.x + b.w - 20} y={b.y + b.h - 14 + (step(t, 8) % 2)} />}
      </Win>
      <Win x={b.x + 6} y={b.y - 11} w={nw} h={17} tone="red" shadow={false}>
        <Tx x={b.x + 6 + nw / 2} y={b.y - 6} a="middle" c={P.yellow}>{name}</Tx>
      </Win>
      {/* console bezel + controller hints (decor, below the safe area) */}
      <rect x={0} y={b.bezel} width={LW} height={LH - b.bezel} fill={P.ink} />
      <rect x={0} y={b.bezel} width={LW} height={1} fill={P.g3} />
      <rect x={0} y={b.bezel + 1} width={LW} height={2} fill={d50('g3')} />
      {([[b.hx[0], 'A', 'LANJUT', P.red], [b.hx[1], 'B', 'LEWATI', P.blue]] as Array<[number, string, string, string]>).map(([x, k, label, c]) => (
        <g key={k}>
          <rect x={x + 1} y={b.hint} width={11} height={13} fill={P.ink} />
          <rect x={x} y={b.hint + 1} width={13} height={11} fill={P.ink} />
          <rect x={x + 2} y={b.hint + 1} width={9} height={11} fill={c} />
          <rect x={x + 1} y={b.hint + 2} width={11} height={9} fill={c} />
          <Tx x={x + 7} y={b.hint + 3} a="middle" c={P.white}>{k}</Tx>
          <Tx x={x + 18} y={b.hint + 3} c={P.g1} sh={P.ink}>{label}</Tx>
        </g>
      ))}
    </g>
  );
};

/** HTML overlay with the typed caption (Pixelify Sans 60 px, 1-logical-px pixel shadow); spoken word in yellow */
export const DialogText: React.FC<{t: number; pages: Page[]}> = ({t, pages}) => {
  const {LW, LH, wide, fr} = usePx();
  const b = dialogBox(wide, LW, LH);
  const pg = pageAtT(pages, t);
  return (
    <div style={{position: 'absolute', left: b.x * PX + 48, top: b.y * PX + 44, width: fr.pick(870, 1400), fontFamily: TEXT, fontWeight: 600, fontSize: 60, lineHeight: '74px', color: P.white,
      textShadow: `4px 4px 0 ${P.ink}`, letterSpacing: 1}}>
      {pg.words.map((w, i) => {
        const n = typedWord(w, t);
        const next = pg.words[i + 1];
        const active = t >= w.start && t < (next ? next.start : w.end + 0.25);
        // digits use Press Start 2P (Pixelify's 2/5 read as 8/S at this size); untyped letters stay as transparent text
        const segs = w.word.match(/\d+|\D+/g) ?? [w.word];
        let at = 0;
        return (
          <React.Fragment key={w.i}>
            {segs.map((sg, j) => {
              const vis = Math.max(0, Math.min(sg.length, n - at));
              at += sg.length;
              const digit = /\d/.test(sg[0]);
              const st: React.CSSProperties = digit ? {fontFamily: HEAD, fontSize: 46, letterSpacing: 0, fontWeight: 400} : {};
              return (
                <span key={j} style={st}>
                  <span style={{color: active ? P.yellow : P.white}}>{sg.slice(0, vis)}</span>
                  <span style={{color: 'transparent', textShadow: 'none'}}>{sg.slice(vis)}</span>
                </span>
              );
            })}
            {i < pg.words.length - 1 ? ' ' : ''}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ───────────────────────── transitions (never an empty frame) ─────────────────────────
export type TransKind = 'dissolve' | 'squares' | 'blinds' | 'iris' | 'slide';
/** Renders `from` and `to` across a window [a, b]: block dissolve, diagonal growing squares, blinds (rows wipe left→right,
 *  staggered top→bottom), pixel iris from the centre, or `to` sliding in OVER a still `from` — use slide only when the
 *  incoming scene has no repeating texture (shelves, fences, bricks alias into blinks when they move fast). */
export const Trans: React.FC<{kind: TransKind; t: number; a: number; b: number; id: string; from: React.ReactNode; to: React.ReactNode}> = ({kind, t, a, b, id, from, to}) => {
  const {LW, LH} = usePx();
  const q = clamp01((t - a) / (b - a));
  if (kind === 'slide') {
    const e = q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2;
    const dx = sn(LW * (1 - e));
    return (
      <>
        {from}
        <rect x={dx - 6} y={0} width={6} height={LH} fill={d50('ink')} />
        <g transform={`translate(${dx} 0)`}>
          <rect x={0} y={0} width={LW} height={LH} fill={P.ink} />
          {to}
          <rect x={0} y={0} width={2} height={LH} fill={P.g2} />
        </g>
      </>
    );
  }
  const cells = kind === 'dissolve' ? dissolveCells(q, 10, 5, LW, LH) : kind === 'squares' ? squaresCells(q, 18, LW, LH) : kind === 'blinds' ? blindsCells(q, LW, LH) : irisCells(q, LW, LH);
  return (
    <>
      {from}
      <ClipCells id={id} cells={cells} />
      <g clipPath={`url(#${id})`}>{to}</g>
    </>
  );
};

const blindsCells = (q: number, lw = 270, lh = 480) => {
  const n = Math.ceil(lh / 12);
  return Array.from({length: n}).map((_, j) => ({x: 0, y: j * 12, w: sn(lw * clamp01(q * 1.6 - (j / n) * 0.6)), h: 12})).filter((c) => c.w > 0);
};
/** pixel iris from the content centre (portrait 135,200 · landscape 240,112) */
const irisCells = (q: number, lw = 270, lh = 480) => {
  const out: Array<{x: number; y: number; w: number; h: number}> = [];
  const R = q * 300;
  const cx = lw / 2, cy = lw > lh ? 112 : 200;
  for (let j = 0; j < Math.ceil(lh / 10); j++) for (let i = 0; i < Math.ceil(lw / 10); i++) if (Math.hypot(i * 10 + 5 - cx, j * 10 + 5 - cy) < R) out.push({x: i * 10, y: j * 10, w: 10, h: 10});
  return out;
};

/** spiral battle wipe: a red/plum block band spirals in (outer ring → centre), the new scene trails it */
const SPC = 15;
const SPIRALS: Record<string, Array<[number, number]>> = {};
const spiralFor = (lw: number, lh: number) => (SPIRALS[`${lw}x${lh}`] ??= spiralOrder(Math.ceil(lw / SPC), Math.ceil(lh / SPC)));
const inout = (q: number) => (q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2);
export const SpiralWipe: React.FC<{t: number; cover: [number, number]; reveal: [number, number]; id: string; children: React.ReactNode}> = ({t, cover, reveal, id, children}) => {
  const {LW, LH} = usePx();
  const SPIRAL = spiralFor(LW, LH);
  const N = SPIRAL.length;
  const c = Math.floor(N * inout(clamp01((t - cover[0]) / (cover[1] - cover[0]))));
  const r = Math.floor(N * inout(clamp01((t - reveal[0]) / (reveal[1] - reveal[0]))));
  return (
    <g>
      {SPIRAL.slice(r, c).map(([i, j], k) => (
        <g key={k}>
          <rect x={i * SPC} y={j * SPC} width={SPC} height={SPC} fill={(i + j) % 2 ? P.red : P.plum} />
          <rect x={i * SPC} y={j * SPC} width={SPC} height={1} fill={(i + j) % 2 ? P.orange : P.red} />
          <rect x={i * SPC + SPC - 1} y={j * SPC} width={1} height={SPC} fill={P.ink} />
        </g>
      ))}
      {r > 0 && (
        <>
          <ClipCells id={id} cells={SPIRAL.slice(0, r).map(([i, j]) => ({x: i * SPC, y: j * SPC, w: SPC, h: SPC}))} />
          <g clipPath={`url(#${id})`}>{children}</g>
        </>
      )}
    </g>
  );
};

/** pixels of a map that fall apart: each run drops with gravity after a staggered delay (stepped, monotonic) */
export const Shatter: React.FC<{m: Pix; x: number; y: number; s?: number; t: number; at: number; seed?: number}> = ({m, x, y, s = 1, t, at, seed = 1}) => {
  const k = t - at;
  return (
    <g transform={`translate(${x} ${y})`}>
      {m.flatMap((row, j) => [...row].map((ch, i) => {
        if (ch === '.' || ch === ' ') return null;
        const d = ((i * 7 + j * 13 + seed * 5) % 11) / 30;
        const kk = Math.max(0, k - d);
        const dy = sn(kk * kk * 900);
        const dx = sn(((i * 3 + j) % 5 - 2) * kk * 30);
        if (dy > 400) return null;
        return <rect key={`${i}-${j}`} x={i * s + dx} y={j * s + dy} width={s} height={s} fill={CH[ch] ?? P.ink} />;
      }))}
    </g>
  );
};
