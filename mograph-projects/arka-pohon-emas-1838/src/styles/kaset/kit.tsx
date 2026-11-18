import React from 'react';
import {AbsoluteFill, getInputProps} from 'remotion';
import {CaptionPage} from '../../components/WordCaptions';
import {display, lerp, noise, p, pageAt, renderQuality, rnd, useFrame} from '../shared';
import {FORMAT, SIZE} from '../../format';

/** Frame height of the delivered film (src/project.json format): default for the band builders below. */
const FILM_H: number = SIZE[FORMAT].height;

// KASET kit — a video told as a worn VHS tape of a 90s TV broadcast. One self-contained file: the VHS signal chain,
// in-picture transitions (roll, push, flip, dive, glitch, scrub, pause, CRT squash), 90s TV graphics (tabs, chrome
// titles, stat rows) and generic logo-free drawings (cassettes, players, TV set, factory, shop props, people).
// Depends only on react, remotion and ../shared. Quality: shared renderQuality() (lite in chat sandboxes), override {"vhs":…}.
// Signal chain, bottom to top:
//   PictureStack  the broadcast on tape: scene + tape bands (tracking / glitch / scrub / pause) through one VHS filter
//   TapeLayer     streak grain (30 Hz, intentional), dropouts, head-switching noise, rolling refresh bar
//   Osd           crisp deck OSD: PLAY ▶ / PAUSE ‖ / FF ▶▶ / REW ◀◀ / STOP ■, SP counter, date stamp
//   CC            Line-21 closed captions, painted on word by word
//   Crt           scanlines, vignette, rounded tube corners
// Fonts: 'Kas OSD' (Share Tech Mono), 'Kas Head' (Bebas Neue).
// Frame (v1.11): every full-frame layer sizes itself from useFrame() — portrait 1080×1920 (default) or landscape
// 1920×1080. Band builders are plain functions: pass the frame height as their last argument (`H`, default 1920).

export const KASET = {blue: '#1530C8', navy: '#0A1240', ink: '#05071A', tung: '#F2C38B', red: '#D8322B', white: '#F4F4F4', yellow: '#F6D64A'};
export const K = KASET;
export const OSD = "'Kas OSD', monospace";
export const HEAD = "'Kas Head', sans-serif";
/** secondary tones used by the drawings */
export const TONE = {wood: '#6B3F22', woodDk: '#4A2914', woodLt: '#93603A', plastic: '#1C1C22', plasticLt: '#34343E', smoke: '#2B2F3C', cream: '#F2EEE2', tape: '#5A3A26',
  redDk: '#8E1B17', blueLt: '#3A5CF7', orange: '#E07A2E', mustard: '#C9902E', teal: '#2FA39A', silver: '#B9BEC9', champagne: '#CDB88E'};

// ---------- render quality ----------
/** 'full' = the complete VHS chain. 'lite' = for small GPU-less machines (chat sandboxes): no SVG picture filter (a
 *  hard red/cyan fringe on the kit's type + a flat warm lift instead), tape bands drawn as overlays (no scene
 *  re-render), no grain, no blurred shadows, ≤ 6 extrusion layers. Same layout and timing in both.
 *  Chosen by the shared `renderQuality()` (input prop `quality`, else software GL + ≤ 4 threads → lite);
 *  the KASET-only input prop {"vhs":"full"|"lite"} wins when present. */
export type VhsQuality = 'full' | 'lite';
export const VHS_QUALITY: VhsQuality = (() => {
  let forced: string | undefined;
  try {
    forced = (getInputProps() as {vhs?: string}).vhs;
  } catch {
    forced = undefined;
  }
  if (forced === 'full' || forced === 'lite') return forced;
  return renderQuality();
})();
const LITE = VHS_QUALITY === 'lite';
/** pick a value per quality: `lq(fullValue, liteValue)` — use it for any blurred shadow / CSS filter in a scene */
export const lq = <T,>(full: T, lite: T): T => (LITE ? lite : full);
/** lite replaces the picture filter's chroma fringe with this hard text-shadow pair on the kit's type */
export const FRINGE = '-4px 0 0 rgba(255,46,70,0.7), 4px 0 0 rgba(40,220,255,0.62)';

// ---------- small helpers ----------
export const cl = (x: number) => Math.max(0, Math.min(1, x));
/** stacked hard shadow = 90s extruded type */
export const ext = (n: number, c: string, dx = 0.7, dy = 1) => {
  if (LITE && n > 6) {
    const k = n / 6; // same depth in 6 hard layers
    return Array.from({length: 6}, (_, i) => `${((i + 1) * dx * k).toFixed(1)}px ${((i + 1) * dy * k).toFixed(1)}px 0 ${c}`).join(', ');
  }
  return Array.from({length: n}, (_, i) => `${((i + 1) * dx).toFixed(1)}px ${((i + 1) * dy).toFixed(1)}px 0 ${c}`).join(', ');
};
/** word slam: lands on `at` (scale `from` → 1, visible from 3 frames before) */
export const slam = (t: number, at: number, from = 1.55): React.CSSProperties => {
  const q = p(t, at - 0.05, at + 0.17);
  return {opacity: cl((t - at + 0.05) / 0.05), transform: `scale(${lerp(from, 1, q)})`};
};
/** slide-in from an offset with ease-out; visible from 2 frames before `at` */
export const slide = (t: number, at: number, dx = 0, dy = 0, dur = 0.3): React.CSSProperties => {
  const q = p(t, at - 0.04, at - 0.04 + dur);
  return {opacity: cl((t - at + 0.04) / 0.05), transform: `translate(${(1 - q) * dx}px, ${(1 - q) * dy}px)`};
};
export const burst = (n: number, r1: number, r2: number) =>
  Array.from({length: n * 2}, (_, i) => {
    const r = i % 2 ? r2 : r1, an = (i / (n * 2)) * Math.PI * 2;
    return `${i ? 'L' : 'M'} ${(Math.cos(an) * r).toFixed(1)} ${(Math.sin(an) * r).toFixed(1)}`;
  }).join(' ') + ' Z';

// ---------- tape textures (rasterised once by the browser) ----------
const tex = (freq: string, oct: number, seed: number, size: number, extra = '') => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${oct}' seed='${seed}' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/>${extra}</filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
};
export const STREAK = tex('0.004 0.55', 2, 7, 512);
export const SNOW = tex('0.9 0.7', 1, 3, 256, `<feComponentTransfer><feFuncR type='discrete' tableValues='0 0 0.2 1'/><feFuncG type='discrete' tableValues='0 0 0.2 1'/><feFuncB type='discrete' tableValues='0 0 0.2 1'/></feComponentTransfer>`);
export const GRAIN = noise(0.85, 2, 5, 256);

// ---------- 90s TV graphics ----------
export const Tab: React.FC<{bg: string; fg: string; size: number; style?: React.CSSProperties; children: React.ReactNode}> = ({bg, fg, size, style, children}) => (
  <div style={{display: 'inline-block', background: `linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0) 46%, rgba(0,0,0,0.18)), ${bg}`, color: fg, fontFamily: HEAD, fontSize: size, lineHeight: 1,
    padding: `${size * 0.14}px ${size * 0.28}px ${size * 0.04}px`, borderTop: '3px solid rgba(255,255,255,0.55)', boxShadow: '8px 8px 0 rgba(0,0,0,0.45)', whiteSpace: 'nowrap', textShadow: LITE ? FRINGE : undefined, ...style}}>{children}</div>
);
export const GOLD = 'linear-gradient(180deg, #FFF6C8 0%, #F6D64A 38%, #B9811C 52%, #F6D64A 68%, #FFF3B0 100%)';
export const SILVER = 'linear-gradient(180deg, #FFFFFF 0%, #DCE3FF 40%, #6C7BB8 52%, #E9EDFF 70%, #FFFFFF 100%)';
export const RUBY = 'linear-gradient(180deg, #FFD9D2 0%, #FF6A5C 38%, #9E1E19 52%, #F0584D 68%, #FFC9C0 100%)';
/** chrome title type: extruded back copy + gradient-filled front copy (optional glint sweep 0..1) */
export const Chrome: React.FC<{text: string; size: number; grad: string; deep: string; n?: number; glint?: number; style?: React.CSSProperties}> = ({text, size, grad, deep, n = 12, glint, style}) => (
  <div style={{position: 'relative', fontFamily: HEAD, fontSize: size, lineHeight: 1, whiteSpace: 'nowrap', ...style}}>
    <div style={{color: deep, textShadow: LITE ? `${FRINGE}, ${ext(n, deep)}` : `${ext(n, deep)}, 0 ${n + 18}px 30px rgba(0,0,0,0.5)`}}>{text}</div>
    <div style={{position: 'absolute', left: 0, top: 0, color: 'transparent', WebkitBackgroundClip: 'text', backgroundClip: 'text',
      backgroundImage: glint !== undefined && glint > 0 && glint < 1
        ? `linear-gradient(105deg, rgba(255,255,255,0) ${(glint * 140 - 30).toFixed(1)}%, rgba(255,255,255,0.95) ${(glint * 140 - 22).toFixed(1)}%, rgba(255,255,255,0) ${(glint * 140 - 14).toFixed(1)}%), ${grad}`
        : grad}}>{text}</div>
  </div>
);
/** big extruded Bebas word */
export const Big: React.FC<{size: number; color: string; deep: string; n?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({size, color, deep, n = 10, style, children}) => (
  <div style={{fontFamily: HEAD, fontSize: size, lineHeight: 1, color, whiteSpace: 'nowrap', textShadow: LITE ? `${FRINGE}, ${ext(n, deep)}` : `${ext(n, deep)}, 0 ${n + 16}px 28px rgba(0,0,0,0.45)`, ...style}}>{children}</div>
);
/** tale-of-the-tape stat row: dark label cell + white value cell */
export const StatRow: React.FC<{label: string; value: React.ReactNode; w?: number; size?: number; accent?: string; style?: React.CSSProperties}> = ({label, value, w = 900, size = 70, accent = K.navy, style}) => (
  <div style={{display: 'flex', width: w, boxShadow: '10px 10px 0 rgba(0,0,0,0.4)', ...style}}>
    <div style={{width: w * 0.36, background: `linear-gradient(rgba(255,255,255,0.18), rgba(255,255,255,0) 50%), ${accent}`, color: K.white, fontFamily: HEAD, fontSize: size * 0.72, lineHeight: 1,
      padding: `${size * 0.26}px ${size * 0.3}px ${size * 0.14}px`, borderTop: '3px solid rgba(255,255,255,0.45)', textShadow: LITE ? FRINGE : undefined}}>{label}</div>
    <div style={{flex: 1, background: 'linear-gradient(#FFFFFF, #DCE0EE)', color: K.navy, fontFamily: HEAD, fontSize: size, lineHeight: 1, padding: `${size * 0.16}px ${size * 0.3}px ${size * 0.04}px`,
      borderTop: '3px solid #FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textShadow: LITE ? FRINGE : undefined}}>{value}</div>
  </div>
);

// ---------- the VHS picture filter ----------
export const VhsFilter: React.FC = () => {
  const {W, H} = useFrame();
  return (
  <svg width={0} height={0} style={{position: 'absolute'}}>
    <defs>
      {LITE ? (
        <filter id="kas-vhs" x="0" y="0" width={W} height={H} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="mR" />
          <feOffset in="mR" dx="-4" dy="0" result="mRo" />
          <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="mGB" />
          <feOffset in="mGB" dx="2" dy="0" result="mGBo" />
          <feBlend in="mRo" in2="mGBo" mode="screen" result="fr" />
          <feComponentTransfer in="fr">
            <feFuncR type="linear" slope="0.93" intercept="0.06" />
            <feFuncG type="linear" slope="0.91" intercept="0.045" />
            <feFuncB type="linear" slope="0.88" intercept="0.055" />
          </feComponentTransfer>
        </filter>
      ) : (
      <filter id="kas-vhs" x="0" y="0" width={W} height={H} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        {/* luma: a touch soft */}
        <feGaussianBlur in="SourceGraphic" stdDeviation="1.1 0.3" result="soft" />
        <feColorMatrix in="soft" type="matrix" values="0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0" result="Y" />
        {/* chroma: smeared horizontally and delayed to the right (biased by +0.5 so negatives survive) */}
        <feGaussianBlur in="SourceGraphic" stdDeviation="6 0.6" result="smear" />
        <feColorMatrix in="smear" type="matrix" values="0.701 -0.587 -0.114 0 0.5  -0.299 0.413 -0.114 0 0.5  -0.299 -0.587 0.886 0 0.5  0 0 0 1 0" result="CH" />
        <feOffset in="CH" dx="7" dy="0" result="CHo" />
        <feComposite in="Y" in2="CHo" operator="arithmetic" k1="0" k2="1" k3="1.2" k4="-0.6" result="mix" />
        {/* red/cyan convergence fringe */}
        <feColorMatrix in="mix" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="mR" />
        <feOffset in="mR" dx="-3" dy="0" result="mRo" />
        <feColorMatrix in="mix" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="mGB" />
        <feOffset in="mGB" dx="1" dy="0" result="mGBo" />
        <feBlend in="mRo" in2="mGBo" mode="screen" result="fr" />
        {/* lifted, warm blacks */}
        <feComponentTransfer in="fr">
          <feFuncR type="linear" slope="0.93" intercept="0.06" />
          <feFuncG type="linear" slope="0.91" intercept="0.045" />
          <feFuncB type="linear" slope="0.88" intercept="0.055" />
        </feComponentTransfer>
      </filter>
      )}
    </defs>
  </svg>
  );
};

// ---------- tape bands (re-rendered slices of the picture) ----------
export type Band = {y: number; h: number; dx: number; ts?: number; snow?: number};
/** tracking band rolling up through the picture between s and e (H = frame height: useFrame().H) */
export const trackBand = (t: number, s: number, e: number, H = FILM_H): Band[] => (t >= s && t < e ? [{y: lerp(H + 60, -180, (t - s) / (e - s)), h: 96, dx: 22 + 8 * Math.sin(t * 7), snow: 0.42}] : []);
/** tracking-glitch cut around frame-aligned `cut`: slices of both pictures in 4-frame holds */
export const glitchBands = (t: number, cut: number, seed = 9, n = 7, H = FILM_H): Band[] => {
  const f = Math.round(t * 60), cf = Math.round(cut * 60);
  if (f < cf - 8 || f >= cf + 8) return [];
  const h = Math.floor((f - cf) / 4); // -2 -1 | 0 1
  const env = [0.45, 1, 1, 0.45][h + 2];
  return Array.from({length: n}, (_, k) => ({
    y: rnd(h * 2.7 + k * 1.3 + seed) * (H - 60), h: 40 + rnd(h * 1.1 + k + seed) * 150, dx: (rnd(h * 4.3 + k * 2 + seed) - 0.5) * 220 * env,
    ts: k % 2 ? (h < 0 ? cut + 0.08 : cut - 0.08) : undefined, snow: 0.25 * env,
  }));
};
/** short accent hit: three slices held 4 frames each (y0/span = picture rows around the accent, in px) */
export const hitBands = (t: number, at: number, y0 = 600, span = 800, seed = 40): Band[] => {
  const f = Math.round(t * 60), rf = Math.round(at * 60);
  if (f < rf || f >= rf + 12) return [];
  const h = Math.floor((f - rf) / 4);
  return [0, 1, 2].map((k) => ({y: y0 + rnd(h * 3.1 + k + seed) * span, h: 34 + rnd(h + k * 7 + seed) * 50, dx: (rnd(h * 1.9 + k + seed) - 0.5) * 90 * (1 - h * 0.3), snow: 0.2}));
};
/** FF / REW search: noise bars crawling through the picture (H = frame height) */
export const scrubBands = (t: number, s: number, e: number, dir: 1 | -1, H = FILM_H): Band[] => {
  if (t < s || t >= e) return [];
  const k = t - s;
  const per = H + 280, f = per / 2200; // same crossing time and bar spacing at any height
  return [0, 1, 2].map((i) => ({y: ((((i * 760 * f + dir * k * 2600 * f) % per) + per) % per) - 140, h: 70 + i * 26, dx: 40 + i * 14, snow: 0.6}));
};
/** pause noise band near the bottom of the picture (H = frame height) */
export const pauseBand = (t: number, s: number, e: number, H = FILM_H): Band[] => (t >= s && t < e ? [{y: H - 220, h: 60, dx: 18, snow: 0.55}] : []);

/** the broadcast picture: scene(t) + slices, wobble, station bug, all through the VHS filter */
export const PictureStack: React.FC<{t: number; scene: (t: number) => React.ReactNode; bands: Band[]; jitter?: number; bug?: boolean}> = ({t, scene, bands, jitter = 0, bug = true}) => {
  const {W, H} = useFrame();
  // the wobble moves the whole picture every frame = a full re-raster; lite keeps only the held pause/search jitter
  const wy = LITE ? jitter : 1.6 * Math.sin(t * 2.3) + 0.7 * Math.sin(t * 6.1 + 1) + jitter;
  const wx = LITE ? 0 : 0.8 * Math.sin(t * 1.7 + 0.4);
  const k30 = Math.floor(t * 30);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, filter: LITE ? undefined : 'url(#kas-vhs)', overflow: 'hidden', background: '#000', willChange: LITE ? 'transform' : undefined}}>
      <div style={{position: 'absolute', inset: 0, transform: `translate(${wx.toFixed(2)}px, ${wy.toFixed(2)}px)`}}>
        {scene(t)}
        {LITE && bands.map((b, i) => (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: 0, right: 0, top: b.y, height: b.h, background: 'rgba(255,255,255,0.10)', borderTop: '3px solid rgba(255,255,255,0.5)'}} />
            {b.snow ? <div style={{position: 'absolute', left: Math.max(0, b.dx), right: 0, top: b.y, height: b.h, backgroundImage: SNOW, backgroundSize: '256px 64px',
              backgroundPosition: `${Math.floor(rnd(k30 + i) * 256)}px ${Math.floor(rnd(k30 * 1.3 + i) * 64)}px`, opacity: b.snow * 0.8}} /> : null}
          </React.Fragment>
        ))}
        {(LITE ? [] : bands).map((b, i) => (
          <div key={i} style={{position: 'absolute', inset: 0, clipPath: `inset(${b.y.toFixed(0)}px 0 ${(H - b.y - b.h).toFixed(0)}px 0)`}}>
            <div style={{position: 'absolute', inset: 0, transform: `translateX(${b.dx.toFixed(1)}px)`, filter: LITE ? undefined : 'brightness(1.15)'}}>{scene(b.ts ?? t)}</div>
            {b.snow ? (
              <>
                <div style={{position: 'absolute', left: 0, right: 0, top: b.y, height: b.h, backgroundImage: SNOW, backgroundSize: '256px 64px',
                  backgroundPosition: `${Math.floor(rnd(k30 + i) * 256)}px ${Math.floor(rnd(k30 * 1.3 + i) * 64)}px`, opacity: b.snow, mixBlendMode: 'screen'}} />
                <div style={{position: 'absolute', left: 0, right: 0, top: b.y, height: 3, background: 'linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.55) 30%, rgba(255,255,255,0.2) 70%, rgba(255,255,255,0.5))'}} />
              </>
            ) : null}
          </div>
        ))}
        {bug && <StationBug />}
      </div>
      {LITE && <div style={{position: 'absolute', inset: 0, background: 'rgba(60,34,34,0.09)'}} />}
    </div>
  );
};
/** invented station bug, top-right corner of the picture (inside PictureStack, so it freezes on PAUSE) */
export const StationBug: React.FC = () => {
  const fr = useFrame();
  return (
  <div style={{position: 'absolute', left: fr.W - fr.pick(188, 230), top: 74, width: 120, height: 120, borderRadius: 18, border: '5px solid rgba(244,244,244,0.75)', background: 'rgba(10,18,64,0.25)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(244,244,244,0.85)', zIndex: 40}}>
    <div style={{fontFamily: HEAD, fontSize: 84, lineHeight: 0.8, paddingTop: 6}}>9</div>
    <div style={{fontFamily: OSD, fontSize: 20, letterSpacing: 3, marginTop: 4}}>KANAL</div>
  </div>
  );
};

// ---------- transitions (inside the picture) ----------
/** vertical-hold roll: A rolls up, a black VBI bar passes, B rolls in */
export const VRoll: React.FC<{q: number; a: React.ReactNode; b: React.ReactNode}> = ({q, a, b}) => {
  const {W, H} = useFrame();
  const gap = 150, off = q * (H + gap);
  return (
    <>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${-off}px)`}}>{a}</div>
      <div style={{position: 'absolute', left: 0, top: H - off, width: W, height: gap, background: '#020204'}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 58, height: 14, background: '#1A1A1E'}} />
        <div style={{position: 'absolute', left: 0, width: 260, top: 92, height: 22, background: '#6A6A70'}} />
      </div>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${H + gap - off}px)`}}>{b}</div>
    </>
  );
};
/** 90s DVE push: A slides out left, B slides in from the right, a white seam between */
export const Push: React.FC<{q: number; a: React.ReactNode; b: React.ReactNode; dir?: 1 | -1}> = ({q, a, b, dir = 1}) => {
  const {W} = useFrame();
  return (
  <>
    <div style={{position: 'absolute', inset: 0, transform: `translateX(${-dir * q * W}px)`}}>{a}</div>
    <div style={{position: 'absolute', inset: 0, transform: `translateX(${dir * (1 - q) * W}px)`}}>{b}</div>
    <div style={{position: 'absolute', top: 0, bottom: 0, width: 18, left: dir > 0 ? (1 - q) * W - 9 : q * W - 9, background: K.white, boxShadow: LITE ? undefined : '0 0 30px rgba(255,255,255,0.8)'}} />
  </>
  );
};
/** DVE card flip around the vertical axis; `under` (usually B, dimmed) fills the frame behind the card */
export const Flip: React.FC<{q: number; a: React.ReactNode; b: React.ReactNode; under?: React.ReactNode}> = ({q, a, b, under}) => {
  const first = q < 0.5;
  const ang = first ? q * 180 : (q - 1) * 180;
  const s = 1 - 0.18 * Math.sin(q * Math.PI);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#05071A'}}>
      {under && <div style={{position: 'absolute', inset: 0, filter: LITE ? undefined : 'brightness(0.4) saturate(0.8)'}}>{under}{LITE && <div style={{position: 'absolute', inset: 0, background: 'rgba(5,7,26,0.6)'}} />}</div>}
      <div style={{position: 'absolute', inset: 0, transform: `perspective(2200px) scale(${s}) rotateY(${ang}deg)`, boxShadow: LITE ? '0 0 0 8px #F4F4F4, 24px 24px 0 rgba(0,0,0,0.45)' : '0 0 0 8px #F4F4F4, 0 40px 80px rgba(0,0,0,0.6)'}}>{first ? a : b}</div>
    </div>
  );
};
/** zoom-through: the scene scales up toward a focus point (used to dive into a TV screen); the focus ends at the frame centre */
export const Dive: React.FC<{q: number; fx: number; fy: number; s1: number; children: React.ReactNode}> = ({q, fx, fy, s1, children}) => {
  const {cx, cy} = useFrame();
  const s = lerp(1, s1, q), x = lerp(cx, fx, q), y = lerp(cy, fy, q);
  return <div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${cx}px, ${cy}px) scale(${s}) translate(${-x}px, ${-y}px)`}}>{children}</div>;
};

// ---------- tape layer ----------
export const TapeLayer: React.FC<{t: number}> = ({t}) => {
  const {W, H} = useFrame();
  const k30 = Math.floor(t * 30), k20 = Math.floor(t * 20);
  const drops = [0, 1, 2].filter((j) => rnd(k20 * 3.3 + j * 11) < 0.3).map((j) => ({y: rnd(k20 * 1.7 + j * 5) * H, x: rnd(k20 * 2.9 + j * 3) * (W - 180), w: 40 + rnd(k20 * 4.1 + j) * 240}));
  const rollY = ((t * 300) % (H + 680)) - 500;
  return (
    <>
      {!LITE && <AbsoluteFill style={{backgroundImage: STREAK, backgroundSize: `${W}px 512px`, backgroundPosition: `${Math.floor(rnd(k30) * W)}px ${Math.floor(rnd(k30 * 1.31) * 512)}px`, opacity: 0.1, mixBlendMode: 'overlay'}} />}
      {!LITE && <AbsoluteFill style={{backgroundImage: GRAIN, backgroundSize: '256px 256px', backgroundPosition: `${Math.floor(rnd(k30 * 0.7) * 256)}px ${Math.floor(rnd(k30 * 2.1) * 256)}px`, opacity: 0.09, mixBlendMode: 'overlay'}} />}
      {drops.map((d, i) => <div key={i} style={{position: 'absolute', left: d.x, top: d.y, width: d.w, height: 3, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.75) 20%, rgba(255,255,255,0.6) 70%, transparent)'}} />)}
      <div style={{position: 'absolute', left: 0, right: 0, top: H - 36, height: 36, backgroundImage: SNOW, backgroundSize: '256px 36px', backgroundPosition: `${Math.floor(rnd(k30 * 1.9) * 256)}px 0`, opacity: 0.45}} />
      {!LITE && <div style={{position: 'absolute', left: 0, right: 0, top: rollY, height: 420, background: 'linear-gradient(transparent, rgba(255,255,255,0.045), transparent)'}} />}
    </>
  );
};

// ---------- deck OSD ----------
export type Mode = 'PLAY' | 'PAUSE' | 'FF' | 'REW' | 'STOP';
export const Icon: React.FC<{m: Mode}> = ({m}) => {
  const wide = m === 'FF' || m === 'REW';
  return (
    <svg width={wide ? 76 : 40} height={46} viewBox={`0 0 ${wide ? 76 : 40} 46`} style={{display: 'block'}}>
      {m === 'PLAY' && <path d="M 2 2 L 38 23 L 2 44 Z" fill="currentColor" />}
      {m === 'PAUSE' && <path d="M 4 2 H 15 V 44 H 4 Z M 25 2 H 36 V 44 H 25 Z" fill="currentColor" />}
      {m === 'STOP' && <path d="M 3 4 H 37 V 42 H 3 Z" fill="currentColor" />}
      {m === 'FF' && <path d="M 2 2 L 36 23 L 2 44 Z M 38 2 L 72 23 L 38 44 Z" fill="currentColor" />}
      {m === 'REW' && <path d="M 74 2 L 40 23 L 74 44 Z M 38 2 L 4 23 L 38 44 Z" fill="currentColor" />}
    </svg>
  );
};
const two = (n: number) => String(Math.floor(n)).padStart(2, '0');
export const hms = (s: number) => `${two(s / 3600)}:${two((s / 60) % 60)}:${two(s % 60)}`;
const OSD_GLOW_FULL = '0 0 10px rgba(244,244,244,0.5), 3px 0 0 rgba(0,0,0,0.8), -3px 0 0 rgba(0,0,0,0.8), 0 3px 0 rgba(0,0,0,0.8), 0 -3px 0 rgba(0,0,0,0.8), 2px 2px 0 rgba(0,0,0,0.8), -2px -2px 0 rgba(0,0,0,0.8), 2px -2px 0 rgba(0,0,0,0.8), -2px 2px 0 rgba(0,0,0,0.8), 5px 5px 0 rgba(0,0,0,0.45)';
export const OSD_GLOW = LITE ? '3px 0 0 rgba(0,0,0,0.85), -3px 0 0 rgba(0,0,0,0.85), 0 3px 0 rgba(0,0,0,0.85), 0 -3px 0 rgba(0,0,0,0.85), 5px 5px 0 rgba(0,0,0,0.45)' : OSD_GLOW_FULL;
/** VCR on-screen display: mode (+ pop when it changes), SP tape counter, two-line date/clock stamp bottom-left.
 *  Positions follow the frame (landscape: left 100, stamp 236 px above the bottom). */
export const Osd: React.FC<{mode: Mode; pop: number; counter: number; line1: string; line2: string; line2On?: boolean; stampPop?: number}> = ({mode, pop, counter, line1, line2, line2On = true, stampPop = 1}) => {
  const fr = useFrame();
  const L = fr.pick(66, 100);
  return (
  <>
    <div style={{position: 'absolute', left: L, top: 70, display: 'flex', alignItems: 'center', gap: 18, fontFamily: OSD, fontSize: 64, lineHeight: 1, letterSpacing: 4, color: K.white, textShadow: OSD_GLOW,
      filter: LITE ? undefined : 'drop-shadow(0 0 6px rgba(244,244,244,0.45))', transform: `scale(${lerp(1.12, 1, pop)})`, transformOrigin: '0 50%'}}>
      {mode === 'REW' && <Icon m={mode} />}
      <span>{mode}</span>
      {mode !== 'REW' && <Icon m={mode} />}
    </div>
    <div style={{position: 'absolute', left: L + 2, top: 152, fontFamily: OSD, fontSize: 40, letterSpacing: 3, color: K.white, textShadow: OSD_GLOW, display: 'flex', gap: 26}}>
      <span>SP</span>
      <span>{hms(Math.max(0, counter)).slice(1)}</span>
    </div>
    <div style={{position: 'absolute', left: L + 2, top: fr.pick(1614, fr.H - 236), fontFamily: OSD, fontSize: 46, letterSpacing: 3, lineHeight: 1.15, color: K.white, textShadow: OSD_GLOW, whiteSpace: 'pre',
      transform: `scale(${lerp(1.15, 1, stampPop)})`, transformOrigin: '0 0'}}>
      <div>{line1}</div>
      <div style={{opacity: line2On ? 1 : 0}}>{line2}</div>
    </div>
  </>
  );
};

// ---------- Line-21 closed captions ----------
/** Line-21 captions, centred; default top 1462 portrait / H - 248 landscape (beside the date stamp, 120+ px clear) */
export const CC: React.FC<{t: number; pages: CaptionPage[]; top?: number}> = ({t, pages, top}) => {
  const fr = useFrame();
  const pg = pageAt(t, pages);
  if (!pg) return null;
  const last = pg.words.length - 1;
  const side = fr.pick(64, fr.safe.side);
  return (
    <div style={{position: 'absolute', left: side, right: side, top: top ?? fr.pick(1462, fr.H - 248), display: 'flex', justifyContent: 'center'}}>
      <div style={{fontFamily: OSD, fontSize: 58, lineHeight: 1.3, letterSpacing: 1, whiteSpace: 'nowrap'}}>
        {pg.words.map((w, i) => {
          const on = t >= w.start - 0.5 / 60;
          return (
            <span key={i} style={{background: on ? '#000' : 'transparent', color: on ? K.white : 'transparent', padding: `10px ${i === last ? 22 : 0}px 6px ${i === 0 ? 22 : 0}px`,
              textShadow: on && !LITE ? '0 0 6px rgba(244,244,244,0.45)' : 'none'}}>{display(w.word).toUpperCase()}{i < last ? ' ' : ''}</span>
          );
        })}
      </div>
    </div>
  );
};

// ---------- CRT ----------
export const Crt: React.FC = () => LITE ? (
  <>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 62% at 50% 48%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.42) 100%), repeating-linear-gradient(180deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0.26) 3px, rgba(0,0,0,0) 6px)', willChange: 'transform'}} />
    <AbsoluteFill style={{borderRadius: 56, boxShadow: '0 0 0 80px #030304', willChange: 'transform'}} />
  </>
) : (
  <>
    <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(180deg, rgba(0,0,0,0) 0px, rgba(0,0,0,0.26) 3px, rgba(0,0,0,0) 6px)'}} />
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 62% at 50% 48%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.42) 100%)'}} />
    <AbsoluteFill style={{background: 'linear-gradient(125deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 30%)'}} />
    <AbsoluteFill style={{borderRadius: 56, boxShadow: LITE ? '0 0 0 80px #030304' : '0 0 0 80px #030304, inset 0 0 70px rgba(0,0,0,0.55)'}} />
  </>
);

/** CRT power squash: the picture collapses into a bright band (never a fully black frame) and expands again.
 *  k = 0 normal, 1 = fully squashed band. */
export const Squash: React.FC<{k: number; children: React.ReactNode}> = ({k, children}) => {
  const sy = lerp(1, 0.07, k), sx = lerp(1, 0.92, k * k);
  return (
    <AbsoluteFill style={{transform: `scale(${sx}, ${sy})`, transformOrigin: '50% 50%', filter: k > 0.01 && !LITE ? `brightness(${1 + k * 1.6})` : undefined}}>
      {children}
      {LITE && k > 0.01 && <AbsoluteFill style={{background: '#FFFFFF', opacity: Math.min(0.75, k * 0.8)}} />}
    </AbsoluteFill>
  );
};

// ════════════════════════════ DRAWINGS ════════════════════════════
// Generic, logo-free home-video-era props in flat 90s TV-graphic style. Format/maker names (VHS, BETAMAX, a brand)
// appear only as plain text labels; never draw a real maker logo or product trade dress.

const INK = '#0A1240';
const CREAM = '#F2EEE2';

/** spinning tape hub with six teeth (slow: ≤ 1°/frame) */
const Hub: React.FC<{cx: number; cy: number; r: number; rot: number; fill?: string}> = ({cx, cy, r, rot, fill = '#D9DAE0'}) => (
  <g transform={`translate(${cx} ${cy}) rotate(${rot.toFixed(1)})`}>
    <circle r={r} fill={fill} />
    {Array.from({length: 6}, (_, i) => <rect key={i} x={-r * 0.16} y={-r * 0.98} width={r * 0.32} height={r * 0.42} fill="#3A3A44" transform={`rotate(${i * 60})`} />)}
    <circle r={r * 0.34} fill="#3A3A44" />
  </g>
);

/** Generic VHS-size cassette, front view. viewBox 380×210. amount = share of tape on the left reel. */
export const VhsTape: React.FC<{w: number; label?: string; accent?: string; t?: number; amount?: number; sil?: string; style?: React.CSSProperties}> = ({w, label = 'VHS', accent = '#D8322B', t = 0, amount = 0.6, sil, style}) => {
  const body = sil ?? '#1C1C22';
  const rot = t * 45;
  return (
    <svg width={w} height={(w * 210) / 380} viewBox="0 0 380 210" style={{display: 'block', overflow: 'visible', ...style}}>
      <defs><clipPath id="kas-vhs-win"><rect x={104} y={104} width={172} height={72} rx={6} /></clipPath></defs>
      <rect x={0} y={0} width={380} height={210} rx={12} fill={body} />
      {!sil && (
        <>
          <rect x={4} y={3} width={372} height={10} rx={5} fill="#FFFFFF" opacity={0.1} />
          <rect x={24} y={16} width={332} height={76} rx={4} fill={CREAM} />
          <rect x={24} y={16} width={332} height={18} rx={4} fill={accent} />
          <rect x={24} y={28} width={332} height={6} fill={accent} />
          {[0, 1].map((i) => <line key={i} x1={150} x2={340} y1={62 + i * 16} y2={62 + i * 16} stroke="#B9B2A0" strokeWidth={2} />)}
          <text x={38} y={84} fontFamily={HEAD} fontSize={46} fill={INK}>{label}</text>
          <rect x={104} y={104} width={172} height={72} rx={6} fill="#2B2F3C" stroke="#0B0B10" strokeWidth={4} />
          <g clipPath="url(#kas-vhs-win)">
            <circle cx={150} cy={140} r={20 + 30 * amount} fill="#5A3A26" />
            <circle cx={230} cy={140} r={20 + 30 * (1 - amount)} fill="#5A3A26" />
            <Hub cx={150} cy={140} r={15} rot={rot} />
            <Hub cx={230} cy={140} r={15} rot={rot + 20} />
            <path d="M 104 104 L 160 104 L 120 176 L 104 176 Z" fill="#FFFFFF" opacity={0.08} />
          </g>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} stroke="#34343E" strokeWidth={4}>
              <line x1={26} x2={84} y1={112 + i * 14} y2={112 + i * 14} />
              <line x1={296} x2={354} y1={112 + i * 14} y2={112 + i * 14} />
            </g>
          ))}
          <rect x={0} y={188} width={380} height={22} rx={8} fill="#000000" opacity={0.35} />
        </>
      )}
    </svg>
  );
};

/** Generic compact (Betamax-size) cassette: rounder, one wide window. viewBox 320×200. */
export const BetaTape: React.FC<{w: number; label?: string; accent?: string; t?: number; amount?: number; sil?: string; style?: React.CSSProperties}> = ({w, label = 'BETAMAX', accent = '#E07A2E', t = 0, amount = 0.6, sil, style}) => {
  const body = sil ?? '#2A2A31';
  const rot = t * 45;
  return (
    <svg width={w} height={(w * 200) / 320} viewBox="0 0 320 200" style={{display: 'block', overflow: 'visible', ...style}}>
      <defs><clipPath id="kas-beta-win"><rect x={58} y={92} width={204} height={64} rx={12} /></clipPath></defs>
      <rect x={0} y={0} width={320} height={200} rx={20} fill={body} />
      {!sil && (
        <>
          <rect x={6} y={4} width={308} height={10} rx={5} fill="#FFFFFF" opacity={0.1} />
          <rect x={20} y={16} width={280} height={60} rx={6} fill={CREAM} />
          <path d={`M 210 16 L 300 16 L 300 76 L 250 76 Z`} fill={accent} />
          <text x={32} y={62} fontFamily={HEAD} fontSize={40} fill={INK}>{label}</text>
          <rect x={58} y={92} width={204} height={64} rx={12} fill="#2B2F3C" stroke="#0B0B10" strokeWidth={4} />
          <g clipPath="url(#kas-beta-win)">
            <circle cx={122} cy={124} r={18 + 24 * amount} fill="#5A3A26" />
            <circle cx={198} cy={124} r={18 + 24 * (1 - amount)} fill="#5A3A26" />
            <Hub cx={122} cy={124} r={13} rot={rot} />
            <Hub cx={198} cy={124} r={13} rot={rot + 20} />
            <path d="M 58 92 L 112 92 L 80 156 L 58 156 Z" fill="#FFFFFF" opacity={0.08} />
          </g>
          <rect x={0} y={168} width={320} height={32} rx={14} fill="#000000" opacity={0.3} />
          <circle cx={30} cy={184} r={7} fill="#121216" />
          <circle cx={290} cy={184} r={7} fill="#121216" />
        </>
      )}
    </svg>
  );
};

/** Generic front-loading video player. viewBox 600×170. */
export const Vcr: React.FC<{w: number; body?: string; accent?: string; label?: string; readout?: string; led?: string; style?: React.CSSProperties}> = ({w, body = '#26262E', accent = '#D8322B', label = 'VHS', readout = '12:00', led = '#FF3B2F', style}) => {
  const light = body === '#B9BEC9' || body === '#CDB88E' || body === '#D9DCE4';
  return (
    <svg width={w} height={(w * 170) / 600} viewBox="0 0 600 170" style={{display: 'block', overflow: 'visible', ...style}}>
      <rect x={0} y={0} width={600} height={160} rx={10} fill={body} />
      <rect x={0} y={0} width={600} height={14} rx={7} fill="#FFFFFF" opacity={0.16} />
      <rect x={30} y={160} width={60} height={10} rx={3} fill="#111" />
      <rect x={510} y={160} width={60} height={10} rx={3} fill="#111" />
      <rect x={46} y={34} width={290} height={56} rx={5} fill="#000" opacity={0.55} />
      <rect x={52} y={40} width={278} height={10} rx={3} fill="#FFFFFF" opacity={0.12} />
      <rect x={370} y={30} width={190} height={52} rx={6} fill="#060A08" />
      <text x={465} y={69} textAnchor="middle" fontFamily={OSD} fontSize={38} fill="#7CFFB0">{readout}</text>
      <rect x={0} y={98} width={600} height={4} fill={accent} />
      {Array.from({length: 5}, (_, i) => (
        <g key={i} transform={`translate(${372 + i * 38} 114)`}>
          <rect width={30} height={22} rx={4} fill={light ? '#8E929C' : '#3E3E48'} />
          <path d={['M 11 5 L 21 11 L 11 17 Z', 'M 10 6 H 20 V 16 H 10 Z', 'M 6 11 L 14 5 V 17 Z M 15 11 L 23 5 V 17 Z', 'M 7 5 L 15 11 L 7 17 Z M 16 5 L 24 11 L 16 17 Z', 'M 10 5 H 13 V 17 H 10 Z M 17 5 H 20 V 17 H 17 Z'][i]} fill={light ? '#222' : '#DDD'} />
        </g>
      ))}
      <text x={48} y={138} fontFamily={HEAD} fontSize={30} fill={light ? '#2A2A34' : '#E8E8EE'}>{label}</text>
      <circle cx={576} cy={125} r={7} fill={led} />
    </svg>
  );
};

/** Wooden CRT television with rabbit ears. Screen content gets the screen size (sw, sh). Height = 0.8·w. */
export const CrtTv: React.FC<{w: number; screen: (sw: number, sh: number) => React.ReactNode; antenna?: boolean; style?: React.CSSProperties}> = ({w, screen, antenna = true, style}) => {
  const h = w * 0.8, sw = w * 0.66, sh = h * 0.74, sx = w * 0.065, sy = h * 0.11;
  return (
    <div style={{position: 'relative', width: w, height: h, ...style}}>
      {antenna && (
        <svg width={w} height={w * 0.5} style={{position: 'absolute', left: 0, top: -w * 0.42, overflow: 'visible'}}>
          <line x1={w * 0.4} y1={w * 0.44} x2={w * 0.2} y2={w * 0.02} stroke="#2A2A30" strokeWidth={w * 0.012} />
          <line x1={w * 0.42} y1={w * 0.44} x2={w * 0.62} y2={0} stroke="#2A2A30" strokeWidth={w * 0.012} />
          <circle cx={w * 0.2} cy={w * 0.02} r={w * 0.016} fill="#2A2A30" />
          <circle cx={w * 0.62} cy={0} r={w * 0.016} fill="#2A2A30" />
          <ellipse cx={w * 0.41} cy={w * 0.45} rx={w * 0.07} ry={w * 0.03} fill="#2A2A30" />
        </svg>
      )}
      <div style={{position: 'absolute', inset: 0, borderRadius: w * 0.05, background: 'linear-gradient(180deg, #93603A 0%, #6B3F22 40%, #4A2914 100%)', boxShadow: LITE ? `${w * 0.02}px ${w * 0.03}px 0 rgba(0,0,0,0.4), inset 0 3px 0 rgba(255,255,255,0.25)` : `0 ${w * 0.04}px ${w * 0.06}px rgba(0,0,0,0.45), inset 0 3px 0 rgba(255,255,255,0.25)`}} />
      <div style={{position: 'absolute', inset: 0, borderRadius: w * 0.05, backgroundImage: 'repeating-linear-gradient(92deg, rgba(0,0,0,0.06) 0 6px, transparent 6px 19px)'}} />
      <div style={{position: 'absolute', left: sx - w * 0.02, top: sy - w * 0.02, width: sw + w * 0.04, height: sh + w * 0.04, borderRadius: w * 0.06, background: '#1A1A1E'}} />
      <div style={{position: 'absolute', left: sx, top: sy, width: sw, height: sh, borderRadius: `${w * 0.06}px / ${w * 0.07}px`, overflow: 'hidden', background: '#0B0D18'}}>
        {screen(sw, sh)}
        <div style={{position: 'absolute', inset: 0, borderRadius: 'inherit', boxShadow: LITE ? undefined : `inset 0 0 ${w * 0.05}px rgba(0,0,0,0.7)`, background: LITE ? 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%), linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0) 40%)' : 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0) 40%)'}} />
      </div>
      <div style={{position: 'absolute', left: w * 0.77, top: sy, width: w * 0.17, height: sh, borderRadius: w * 0.02, background: '#3A2414'}}>
        {[0.16, 0.42].map((k, i) => <div key={i} style={{position: 'absolute', left: '22%', top: `${k * 100}%`, width: '56%', paddingTop: '56%', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #E8E2D6, #8E877A)', boxShadow: '0 3px 0 #1A100A'}} />)}
        {Array.from({length: 6}, (_, i) => <div key={i} style={{position: 'absolute', left: '14%', right: '14%', top: `${70 + i * 4.4}%`, height: 3, background: '#1A100A'}} />)}
      </div>
      <div style={{position: 'absolute', left: w * 0.1, bottom: -w * 0.045, width: w * 0.08, height: w * 0.05, background: '#2A1A0E', borderRadius: '0 0 6px 6px'}} />
      <div style={{position: 'absolute', right: w * 0.1, bottom: -w * 0.045, width: w * 0.08, height: w * 0.05, background: '#2A1A0E', borderRadius: '0 0 6px 6px'}} />
    </div>
  );
};

/** SMPTE-style generic colour bars filling a box */
export const BarsPattern: React.FC<{w: number; h: number}> = ({w, h}) => {
  const top = ['#C0C0C0', '#C0C000', '#00C0C0', '#00C000', '#C000C0', '#C00000', '#0000C0'];
  const mid = ['#0000C0', '#131313', '#C000C0', '#131313', '#00C0C0', '#131313', '#C0C0C0'];
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, background: '#131313'}}>
      {top.map((c, i) => <div key={i} style={{position: 'absolute', left: (i * w) / 7, width: w / 7 + 1, top: 0, height: h * 0.67, background: c}} />)}
      {mid.map((c, i) => <div key={i} style={{position: 'absolute', left: (i * w) / 7, width: w / 7 + 1, top: h * 0.67, height: h * 0.08, background: c}} />)}
      {['#00214C', '#FFFFFF', '#32006A', '#131313'].map((c, i) => <div key={i} style={{position: 'absolute', left: (i * w) / 5.6, width: i === 3 ? w : w / 5.6 + 1, top: h * 0.75, height: h * 0.25, background: c}} />)}
    </div>
  );
};

/** Generic tank silhouette (for "bukan perang senjata"). viewBox 420×230. */
export const Tank: React.FC<{w: number; color?: string}> = ({w, color = '#0A1240'}) => (
  <svg width={w} height={(w * 230) / 420} viewBox="0 0 420 230" style={{display: 'block'}}>
    <rect x={20} y={150} width={380} height={70} rx={35} fill={color} />
    {Array.from({length: 6}, (_, i) => <circle key={i} cx={62 + i * 59} cy={185} r={22} fill="#F4F4F4" opacity={0.25} />)}
    <path d="M 40 150 L 70 110 L 360 110 L 390 150 Z" fill={color} />
    <path d="M 130 110 Q 140 50 220 48 Q 300 50 300 110 Z" fill={color} />
    <rect x={280} y={64} width={140} height={20} rx={6} fill={color} />
  </svg>
);

/** Generic factory with sawtooth roof and a smoking chimney. viewBox 240×200. */
export const Factory: React.FC<{w: number; color?: string; lit?: boolean; t?: number}> = ({w, color = '#2A3A8C', lit = true, t = 0}) => (
  <svg width={w} height={(w * 200) / 240} viewBox="0 0 240 200" style={{display: 'block', overflow: 'visible'}}>
    {[0, 1, 2].map((i) => {
      const k = ((t * 0.6 + i / 3) % 1);
      return <circle key={i} cx={192 + k * 18} cy={30 - k * 60} r={10 + k * 14} fill="#DADCE6" opacity={0.7 * (1 - k)} />;
    })}
    <rect x={180} y={20} width={26} height={100} fill={color} />
    <path d="M 10 200 L 10 90 L 60 60 L 60 90 L 110 60 L 110 90 L 160 60 L 160 90 L 230 90 L 230 200 Z" fill={color} />
    {[0, 1, 2, 3].map((i) => <rect key={i} x={28 + i * 50} y={120} width={30} height={26} rx={3} fill={lit ? '#F6D64A' : '#1A1F3C'} />)}
    <rect x={96} y={160} width={48} height={40} fill="#0A1240" />
  </svg>
);

/** License document with a seal. Width w, height 1.3·w. */
export const LicenseDoc: React.FC<{w: number; title?: string; style?: React.CSSProperties}> = ({w, title = 'LISENSI', style}) => (
  <div style={{position: 'relative', width: w, height: w * 1.3, background: 'linear-gradient(#FFFFFF, #E9E5D8)', boxShadow: '6px 8px 0 rgba(0,0,0,0.35)', borderTop: '3px solid #FFF', ...style}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: w * 0.08, textAlign: 'center', fontFamily: HEAD, fontSize: w * 0.2, lineHeight: 1, color: INK}}>{title}</div>
    <div style={{position: 'absolute', left: 0, right: 0, top: w * 0.32, textAlign: 'center', fontFamily: HEAD, fontSize: w * 0.17, lineHeight: 1, color: '#D8322B'}}>VHS</div>
    {[0, 1, 2, 3].map((i) => <div key={i} style={{position: 'absolute', left: w * 0.14, right: w * (i % 2 ? 0.3 : 0.14), top: w * (0.6 + i * 0.12), height: Math.max(2, w * 0.03), background: '#B9B2A0'}} />)}
    <div style={{position: 'absolute', right: w * 0.08, bottom: w * 0.06, width: w * 0.3, height: w * 0.3, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #FF6A5C, #9E1E19)', boxShadow: '0 0 0 3px #F6D64A'}} />
  </div>
);

/** Price tag on a string with a down arrow (competitive price — no numbers). viewBox 140×200. */
export const PriceTag: React.FC<{w: number; color?: string; rot?: number}> = ({w, color = '#F6D64A', rot = 0}) => (
  <svg width={w} height={(w * 200) / 140} viewBox="0 0 140 200" style={{display: 'block', overflow: 'visible', transform: `rotate(${rot}deg)`, transformOrigin: '50% 0'}}>
    <path d="M 70 0 L 70 34" stroke="#F4F4F4" strokeWidth={4} />
    <path d="M 70 30 L 130 70 L 130 196 L 10 196 L 10 70 Z" fill={color} stroke="#0A1240" strokeWidth={5} />
    <circle cx={70} cy={66} r={10} fill="#0A1240" />
    <path d="M 52 100 L 88 100 L 88 132 L 106 132 L 70 172 L 34 132 L 52 132 Z" fill="#D8322B" stroke="#0A1240" strokeWidth={4} />
  </svg>
);

/** Spine of a rented tape box on a shelf (abstract, no titles). Height h, width 0.24·h. */
export const Spine: React.FC<{h: number; seed: number}> = ({h, seed}) => {
  const cols = ['#D8322B', '#F6D64A', '#1530C8', '#F2C38B', '#2FA39A', '#E07A2E', '#F4F4F4', '#7A3FB0', '#0A1240'];
  const c = cols[Math.floor(rnd(seed) * cols.length)];
  const c2 = cols[Math.floor(rnd(seed + 3.3) * cols.length)];
  const w = h * 0.24;
  return (
    <div style={{position: 'relative', width: w, height: h, background: c, boxShadow: 'inset -4px 0 0 rgba(0,0,0,0.25), inset 3px 0 0 rgba(255,255,255,0.25)'}}>
      <div style={{position: 'absolute', left: '14%', right: '14%', top: '10%', height: '9%', background: c2}} />
      <div style={{position: 'absolute', left: '18%', right: '18%', top: '26%', height: '44%', background: CREAM}}>
        {[0, 1, 2].map((i) => <div key={i} style={{position: 'absolute', left: '18%', right: '18%', top: `${18 + i * 26}%`, height: 3, background: '#9C9480'}} />)}
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: '6%', textAlign: 'center', fontFamily: HEAD, fontSize: w * 0.42, lineHeight: 1, color: c === '#F4F4F4' || c === '#F6D64A' || c === '#F2C38B' ? INK : '#F4F4F4'}}>VHS</div>
    </div>
  );
};

/** Generic flat person (head + shoulders + torso). viewBox 220×330. */
export const Person: React.FC<{w: number; shirt?: string; hair?: string; skin?: string; kind?: number; style?: React.CSSProperties}> = ({w, shirt = '#2FA39A', hair = '#2A1A10', skin = '#D9A57A', kind = 0, style}) => (
  <svg width={w} height={(w * 330) / 220} viewBox="0 0 220 330" style={{display: 'block', overflow: 'visible', ...style}}>
    <path d="M 10 330 L 22 230 Q 30 180 110 176 Q 190 180 198 230 L 210 330 Z" fill={shirt} />
    <path d="M 84 176 L 110 214 L 136 176 Z" fill="#FFFFFF" opacity={0.85} />
    <rect x={92} y={136} width={36} height={46} fill={skin} />
    <ellipse cx={110} cy={98} rx={52} ry={60} fill={skin} />
    {kind % 3 === 0 && <path d="M 56 96 Q 50 30 110 32 Q 172 30 166 96 Q 150 58 110 60 Q 72 58 56 96 Z" fill={hair} />}
    {kind % 3 === 1 && <path d="M 52 120 Q 40 24 110 28 Q 182 24 168 120 L 158 120 Q 156 66 110 62 Q 64 66 62 120 Z" fill={hair} />}
    {kind % 3 === 2 && <path d="M 58 84 Q 60 34 110 34 Q 160 34 162 84 Z M 50 84 L 176 84 L 176 92 L 50 92 Z" fill={hair} />}
    <circle cx={92} cy={102} r={6} fill="#1A1A1E" />
    <circle cx={128} cy={102} r={6} fill="#1A1A1E" />
    <path d="M 94 128 Q 110 138 126 128" stroke="#7A3B2A" strokeWidth={5} fill="none" strokeLinecap="round" />
  </svg>
);

/** Champion belt with a gold plate. viewBox 560×200. */
export const Belt: React.FC<{w: number; text?: string}> = ({w, text = 'MENANG'}) => (
  <svg width={w} height={(w * 200) / 560} viewBox="0 0 560 200" style={{display: 'block', overflow: 'visible'}}>
    <rect x={0} y={62} width={560} height={76} rx={14} fill="#1A1A22" />
    <rect x={0} y={70} width={560} height={8} fill="#D8322B" />
    <rect x={0} y={122} width={560} height={8} fill="#D8322B" />
    {[60, 120, 440, 500].map((x) => <circle key={x} cx={x} cy={100} r={16} fill="#F6D64A" stroke="#A87A12" strokeWidth={4} />)}
    <path d="M 170 100 Q 170 10 280 6 Q 390 10 390 100 Q 390 190 280 194 Q 170 190 170 100 Z" fill="#F6D64A" stroke="#A87A12" strokeWidth={8} />
    <path d="M 196 100 Q 196 34 280 30 Q 364 34 364 100 Q 364 166 280 170 Q 196 166 196 100 Z" fill="#E8B92E" />
    <text x={280} y={122} textAnchor="middle" fontFamily={HEAD} fontSize={62} fill="#5E3E06">{text}</text>
  </svg>
);

/** Gold rosette medal with ribbons. viewBox 200×260. */
export const Rosette: React.FC<{w: number; text?: string}> = ({w, text = 'BAGUS'}) => (
  <svg width={w} height={(w * 260) / 200} viewBox="0 0 200 260" style={{display: 'block', overflow: 'visible'}}>
    <path d="M 60 120 L 30 250 L 70 228 L 96 256 L 110 130 Z" fill="#D8322B" />
    <path d="M 140 120 L 170 250 L 130 228 L 104 256 L 90 130 Z" fill="#1530C8" />
    <path d={Array.from({length: 32}, (_, i) => { const r = i % 2 ? 84 : 98, an = (i / 32) * Math.PI * 2; return `${i ? 'L' : 'M'} ${(100 + Math.cos(an) * r).toFixed(1)} ${(100 + Math.sin(an) * r).toFixed(1)}`; }).join(' ') + ' Z'} fill="#F6D64A" stroke="#A87A12" strokeWidth={5} />
    <circle cx={100} cy={100} r={64} fill="#E8B92E" stroke="#A87A12" strokeWidth={4} />
    <text x={100} y={118} textAnchor="middle" fontFamily={HEAD} fontSize={48} fill="#5E3E06">{text}</text>
  </svg>
);

/** Film strip (sprocket holes + frames). */
export const FilmStrip: React.FC<{w: number; h: number; frames?: number; seed?: number}> = ({w, h, frames = 8, seed = 1}) => {
  const cols = ['#F2C38B', '#E07A2E', '#3A5CF7', '#2FA39A', '#D8322B', '#F6D64A'];
  const fw = (w - 8) / frames;
  return (
    <div style={{position: 'relative', width: w, height: h, background: '#121216', boxShadow: '6px 6px 0 rgba(0,0,0,0.4)'}}>
      {Array.from({length: Math.floor(w / 26)}, (_, i) => (
        <React.Fragment key={i}>
          <div style={{position: 'absolute', left: 8 + i * 26, top: h * 0.07, width: 13, height: h * 0.11, background: '#E8E8EE', borderRadius: 2}} />
          <div style={{position: 'absolute', left: 8 + i * 26, bottom: h * 0.07, width: 13, height: h * 0.11, background: '#E8E8EE', borderRadius: 2}} />
        </React.Fragment>
      ))}
      {Array.from({length: frames}, (_, i) => (
        <div key={i} style={{position: 'absolute', left: 4 + i * fw + 4, top: h * 0.26, width: fw - 8, height: h * 0.48, background: `linear-gradient(160deg, ${cols[Math.floor(rnd(seed + i) * cols.length)]}, ${cols[Math.floor(rnd(seed + i + 9) * cols.length)]})`}} />
      ))}
    </div>
  );
};

/** Test pattern for picture-sharpness comparisons. viewBox 400×300. */
export const TestCard: React.FC<{w: number; h: number}> = ({w, h}) => (
  <svg width={w} height={h} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" style={{display: 'block'}}>
    <rect width={400} height={300} fill="#8C8F99" />
    {Array.from({length: 11}, (_, i) => <line key={`v${i}`} x1={i * 40} x2={i * 40} y1={0} y2={300} stroke="#F4F4F4" strokeWidth={2} />)}
    {Array.from({length: 8}, (_, i) => <line key={`h${i}`} x1={0} x2={400} y1={i * 40 + 10} y2={i * 40 + 10} stroke="#F4F4F4" strokeWidth={2} />)}
    <circle cx={200} cy={150} r={118} fill="#1A1A22" stroke="#F4F4F4" strokeWidth={5} />
    {['#C0C0C0', '#C0C000', '#00C0C0', '#00C000', '#C000C0', '#C00000', '#0000C0'].map((c, i) => <rect key={i} x={96 + i * 30} y={70} width={30} height={60} fill={c} />)}
    {Array.from({length: 12}, (_, i) => <rect key={`b${i}`} x={96 + i * 17.5} y={140} width={i % 2 ? 17.5 : 8} height={40} fill="#F4F4F4" />)}
    <path d="M 200 190 L 160 240 L 240 240 Z" fill="#F4F4F4" />
    {Array.from({length: 6}, (_, i) => <line key={`w${i}`} x1={200} y1={190} x2={160 + i * 16} y2={240} stroke="#1A1A22" strokeWidth={2} />)}
  </svg>
);

/** Green check / red cross badge */
export const Mark: React.FC<{w: number; ok?: boolean}> = ({w, ok = true}) => (
  <svg width={w} height={w} viewBox="0 0 100 100" style={{display: 'block'}}>
    <circle cx={50} cy={50} r={46} fill={ok ? '#2FA39A' : '#D8322B'} stroke="#F4F4F4" strokeWidth={6} />
    {ok ? <path d="M 27 52 L 44 69 L 75 34" stroke="#F4F4F4" strokeWidth={12} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      : <path d="M 32 32 L 68 68 M 68 32 L 32 68" stroke="#F4F4F4" strokeWidth={12} strokeLinecap="round" />}
  </svg>
);

/** 70s sofa (front). viewBox 520×260. */
export const Sofa: React.FC<{w: number; color?: string}> = ({w, color = '#B5652A'}) => (
  <svg width={w} height={(w * 260) / 520} viewBox="0 0 520 260" style={{display: 'block'}}>
    <rect x={30} y={20} width={460} height={150} rx={36} fill={color} />
    <rect x={0} y={90} width={90} height={150} rx={30} fill={color} />
    <rect x={430} y={90} width={90} height={150} rx={30} fill={color} />
    <rect x={70} y={130} width={380} height={90} rx={20} fill={color} />
    <rect x={70} y={130} width={380} height={90} rx={20} fill="#000" opacity={0.12} />
    <line x1={260} x2={260} y1={136} y2={214} stroke="#000" strokeOpacity={0.2} strokeWidth={5} />
    <rect x={40} y={236} width={24} height={24} fill="#3A2414" />
    <rect x={456} y={236} width={24} height={24} fill="#3A2414" />
  </svg>
);

/** Floor lamp with a warm shade. viewBox 160×520. */
export const Lamp: React.FC<{w: number}> = ({w}) => (
  <svg width={w} height={(w * 520) / 160} viewBox="0 0 160 520" style={{display: 'block', overflow: 'visible'}}>
    <ellipse cx={80} cy={110} rx={150} ry={150} fill="#FFD08A" opacity={0.18} />
    <path d="M 30 20 L 130 20 L 156 120 L 4 120 Z" fill="#F2C38B" />
    <path d="M 30 20 L 130 20 L 156 120 L 4 120 Z" fill="#E07A2E" opacity={0.35} />
    <rect x={76} y={120} width={8} height={380} fill="#2A1A10" />
    <ellipse cx={80} cy={506} rx={48} ry={12} fill="#2A1A10" />
  </svg>
);

// ─── characters & 90s broadcast set pieces (from the prototype) ───
type RomPal = {skin: string; skinDk: string; hair: string; tunic: string; tunicDk: string; cloak: string; cloakDk: string; gold: string; goldDk: string; eye: string; lip: string};
const ROM: RomPal = {skin: '#E4B088', skinDk: '#C98F63', hair: '#3A2314', tunic: '#EDE4D0', tunicDk: '#CFC2A6', cloak: '#C9302A', cloakDk: '#8E1B17', gold: '#F6D64A', goldDk: '#B0821A', eye: '#F7F0E4', lip: '#B5634A'};

/** Front bust of a generic bearded Roman king with a laurel wreath. viewBox 600×1400 (torso runs off frame). */
export const Romulus: React.FC<{sil?: string; width?: number}> = ({sil, width = 600}) => {
  const c: RomPal = sil ? (Object.fromEntries(Object.keys(ROM).map((k) => [k, sil])) as RomPal) : ROM;
  const curls = Array.from({length: 11}, (_, i) => {
    const an = ((200 + (i / 10) * 140) * Math.PI) / 180;
    return <circle key={i} cx={300 + Math.cos(an) * 112} cy={238 + Math.sin(an) * 104} r={25} fill={c.hair} />;
  });
  const beardCurls = Array.from({length: 9}, (_, i) => {
    const an = ((18 + (i / 8) * 144) * Math.PI) / 180;
    return <circle key={i} cx={300 + Math.cos(an) * 96} cy={360 + Math.sin(an) * 118} r={22} fill={c.hair} />;
  });
  const leaves = Array.from({length: 14}, (_, i) => {
    const side = i < 7 ? -1 : 1;
    const k = i % 7;
    const an = ((side < 0 ? 196 + k * 10.5 : 344 - k * 10.5) * Math.PI) / 180;
    const x = 300 + Math.cos(an) * 116, y = 252 + Math.sin(an) * 92;
    const rot = (an * 180) / Math.PI + 90 + side * 38;
    return <ellipse key={i} cx={x} cy={y} rx={11} ry={27} fill={c.gold} stroke={c.goldDk} strokeWidth={3} transform={`rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`} />;
  });
  return (
    <svg width={width} height={(width * 1400) / 600} viewBox="0 0 600 1400" style={{display: 'block', overflow: 'visible'}}>
      {/* torso: tunic + red cloak with gold trim and brooch */}
      <path d="M 10 1400 L 30 690 Q 50 595 160 562 L 250 530 L 350 530 L 440 562 Q 550 595 570 690 L 590 1400 Z" fill={c.tunic} />
      <path d="M 238 532 L 300 640 L 362 532 Z" fill={c.skinDk} />
      <path d="M 200 700 Q 230 900 215 1400 M 400 700 Q 370 900 385 1400 M 300 660 L 300 1400" stroke={c.tunicDk} strokeWidth={8} fill="none" />
      <path d="M 10 1400 L 28 700 Q 45 602 150 566 L 238 535 Q 205 610 172 680 Q 128 800 150 1400 Z" fill={c.cloak} />
      <path d="M 590 1400 L 572 700 Q 555 602 450 566 L 362 535 Q 398 600 432 650 Q 482 760 452 1400 Z" fill={c.cloak} />
      <path d="M 150 1400 Q 128 800 172 680 Q 205 610 238 535" stroke={c.gold} strokeWidth={9} fill="none" />
      <path d="M 452 1400 Q 482 760 432 650 Q 398 600 362 535" stroke={c.gold} strokeWidth={9} fill="none" />
      <path d="M 40 1400 L 52 760 Q 60 690 110 640" stroke={c.cloakDk} strokeWidth={22} fill="none" opacity={0.7} />
      <path d="M 560 1400 L 548 760 Q 540 690 490 640" stroke={c.cloakDk} strokeWidth={22} fill="none" opacity={0.7} />
      <circle cx={418} cy={606} r={30} fill={c.gold} stroke={c.goldDk} strokeWidth={6} />
      <circle cx={418} cy={606} r={12} fill={c.goldDk} />
      {/* neck */}
      <path d="M 250 410 L 250 535 Q 300 562 350 535 L 350 410 Z" fill={c.skinDk} />
      {/* hair mass behind the head */}
      <path d="M 190 310 Q 172 168 250 122 Q 300 96 350 122 Q 428 168 410 310 Z" fill={c.hair} />
      {/* ears */}
      <ellipse cx={203} cy={302} rx={19} ry={34} fill={c.skinDk} />
      <ellipse cx={397} cy={302} rx={19} ry={34} fill={c.skinDk} />
      {/* face */}
      <path d="M 204 250 Q 200 152 300 138 Q 400 152 396 250 L 393 330 Q 387 420 300 448 Q 213 420 207 330 Z" fill={c.skin} />
      {!sil && <path d="M 334 146 Q 400 156 396 250 L 393 330 Q 387 420 300 448 Q 366 398 368 300 Q 374 205 334 146 Z" fill="#9C5A35" opacity={0.2} />}
      {/* hair curls over the forehead */}
      {curls}
      {/* laurel wreath */}
      <path d="M 186 262 Q 196 168 300 160 Q 404 168 414 262" stroke={c.goldDk} strokeWidth={7} fill="none" />
      {leaves}
      {/* brows, eyes, nose */}
      <path d="M 226 266 Q 256 250 292 272 L 290 282 Q 256 266 228 276 Z" fill={c.hair} />
      <path d="M 374 266 Q 344 250 308 272 L 310 282 Q 344 266 372 276 Z" fill={c.hair} />
      <ellipse cx={262} cy={298} rx={21} ry={11} fill={c.eye} />
      <ellipse cx={338} cy={298} rx={21} ry={11} fill={c.eye} />
      <circle cx={265} cy={299} r={9} fill={sil ? c.eye : '#2B1B10'} />
      <circle cx={335} cy={299} r={9} fill={sil ? c.eye : '#2B1B10'} />
      {!sil && <path d="M 240 292 Q 262 282 284 292 M 316 292 Q 338 282 360 292" stroke="#5A3420" strokeWidth={4} fill="none" />}
      {!sil && <path d="M 302 300 L 289 346 Q 300 356 314 347" stroke="#A86E48" strokeWidth={6} fill="none" strokeLinecap="round" />}
      {/* beard + moustache + lip */}
      <path d="M 207 300 Q 200 432 300 490 Q 400 432 393 300 L 378 318 Q 372 398 300 414 Q 228 398 222 318 Z" fill={c.hair} />
      {beardCurls}
      <path d="M 248 374 Q 274 352 300 364 Q 326 352 352 374 Q 330 390 300 382 Q 270 390 248 374 Z" fill={sil ? c.hair : '#24150C'} />
      {!sil && <path d="M 280 396 Q 300 406 320 396 Q 300 414 280 396 Z" fill={c.lip} />}
    </svg>
  );
};

/** Generic lineup silhouettes (2 = cropped hair, 3 = crested helmet). Same 600×1400 box as Romulus. */
export const Suspect: React.FC<{kind: 2 | 3; fill: string; width?: number}> = ({kind, fill, width = 600}) => (
  <svg width={width} height={(width * 1400) / 600} viewBox="0 0 600 1400" style={{display: 'block', overflow: 'visible'}}>
    <path d="M 10 1400 L 30 690 Q 50 595 160 562 L 250 530 L 350 530 L 440 562 Q 550 595 570 690 L 590 1400 Z" fill={fill} />
    <path d="M 250 400 L 250 540 L 350 540 L 350 400 Z" fill={fill} />
    <ellipse cx={203} cy={300} rx={19} ry={34} fill={fill} />
    <ellipse cx={397} cy={300} rx={19} ry={34} fill={fill} />
    <path d="M 204 250 Q 200 150 300 136 Q 400 150 396 250 L 393 330 Q 387 430 300 456 Q 213 430 207 330 Z" fill={fill} />
    {kind === 2 && <path d="M 196 280 Q 186 140 300 120 Q 414 140 404 280 Q 380 190 300 186 Q 220 190 196 280 Z" fill={fill} />}
    {kind === 3 && (
      <>
        <path d="M 186 300 Q 180 130 300 108 Q 420 130 414 300 L 392 300 L 392 250 L 208 250 L 208 300 Z" fill={fill} />
        <path d="M 196 250 L 196 380 L 236 400 L 236 260 Z M 404 250 L 404 380 L 364 400 L 364 260 Z" fill={fill} />
        <path d="M 150 150 Q 300 -40 450 150 L 420 160 Q 300 10 180 160 Z" fill={fill} />
        <path d="M 170 150 Q 300 -10 430 150 L 430 120 Q 300 -60 170 120 Z" fill={fill} />
      </>
    )}
  </svg>
);

/** 90s news wireframe globe, slowly spinning. Centered on (0,0) inside a 2r box. */
export const Globe: React.FC<{t: number; r: number; color?: string; spin?: number; width?: number}> = ({t, r, color = '#8FA6FF', spin = 0.32, width = 2.5}) => {
  const rot = LITE ? 0.6 : t * spin;
  const pad = 20;
  return (
    <svg width={r * 2 + pad * 2} height={r * 2 + pad * 2} viewBox={`${-r - pad} ${-r - pad} ${r * 2 + pad * 2} ${r * 2 + pad * 2}`} style={{display: 'block', overflow: 'visible'}}>
      <g fill="none" stroke={color} strokeWidth={width} transform="rotate(-18)">
        <circle r={r} strokeWidth={width * 2} />
        {Array.from({length: 8}, (_, i) => {
          const th = rot + (i / 8) * Math.PI;
          return <ellipse key={i} rx={Math.abs(Math.cos(th)) * r} ry={r} opacity={0.55 + 0.45 * Math.abs(Math.sin(th))} />;
        })}
        {[-60, -30, 0, 30, 60].map((d) => {
          const ph = (d * Math.PI) / 180;
          return <ellipse key={d} cy={-Math.sin(ph) * r * 0.985} rx={Math.cos(ph) * r} ry={Math.cos(ph) * r * 0.16} />;
        })}
      </g>
    </svg>
  );
};

/** Virtual-set floor: perspective grid that slides toward the viewer. Full frame width, from `horizon` to the bottom. */
export const Floor: React.FC<{t: number; horizon: number; color?: string; speed?: number}> = ({t, horizon, color = '#5E7DFF', speed = 0.3}) => {
  const fr = useFrame();
  const W = fr.W, H = fr.H - horizon, c = fr.cx;
  const off = LITE ? 0.35 : (t * speed) % 1;
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: horizon}} viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id="kas-floor" gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={0} y2={H}>
          <stop offset="0" stopColor={color} stopOpacity={0} />
          <stop offset="0.5" stopColor={color} stopOpacity={0.55} />
          <stop offset="1" stopColor={color} stopOpacity={0.9} />
        </linearGradient>
      </defs>
      <g stroke="url(#kas-floor)" strokeWidth={3}>
        {Array.from({length: 25}, (_, k) => {
          const i = k - 12;
          return <line key={`v${k}`} x1={c + i * 22} y1={0} x2={c + i * 240} y2={H} />;
        })}
        {Array.from({length: 13}, (_, k) => {
          const z = (k + off) / 13;
          const y = H * z * z;
          return <line key={`h${k}`} x1={0} y1={y} x2={W} y2={y} />;
        })}
      </g>
    </svg>
  );
};
