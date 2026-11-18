import React from 'react';
import {Easing} from 'remotion';
import {CaptionPage} from '../../components/WordCaptions';
import {display, lerp, p, pageAt, pb, renderQuality, rnd, useFrame} from '../shared';

// CAIR style kit — liquid motion + liquid glass. Gooey metaballs (SVG goo filter) carry volume, liquid tubes and
// vessels slosh with a sine surface, liquid sweeps (a band of liquid with wavy edges) replace cuts, frosted glass
// cards/chips sit on a slow mesh-gradient night. One font family: Sora ('Cair Head', 300–800).
// A video is `<Shots t shots={[...]} />`: every Shot paints its own MeshBg and enters on a liquid Sweep; `Caption` goes last.
// Keep goo blobs big (the threshold eats small radii, blur ~16), use SOLID fills inside a goo group (gradients show seams
// between merged circles) and draw highlights (`Gloss`) outside it. Counters use `tick(t)` so digits never strobe.
// Render cost: renderQuality() === 'lite' (GPU-less sandbox) drops the goo filter (attach it with `{...gooFilter(id)}`),
// freezes the mesh glows and the drift, and swaps backdrop-blur glass for tinted panels with hard shadows; 'full' = original.
// Frame (v1.11): every full-frame piece (Goo region, sweeps, Abs center, Caption, Headline) reads useFrame(); draw shot
// svgs at `width={W} height={H}`. Landscape sweeps stay vertical (flood up / pour down) with a 360 px band (same area).

/** True in the cheap render path (chat sandbox / software GL). Constant for a whole render. */
const LITE = () => renderQuality() === 'lite';

export const CAIR = {night: '#0B0A1F', violet: '#7B5CFF', pink: '#FF5FA2', cyan: '#33D6FF', amber: '#FFB547', white: '#F6F4FF'};
export const K = CAIR;
/** Derived tones (same hues, used for depth and for the pale→dark amber colour scale). */
export const TONE = {deep: '#151040', indigo: '#2A1E73', raspberry: '#C42A68', lilac: '#B9A6FF', pale: '#FFE9A6'};
export const SWATCH = ['#FFF3BF', '#FDE38A', '#F9C74F', '#EE9D2B', '#C26A14'];
export const FONT = "'Cair Head', sans-serif";
export const SOFT = Easing.bezier(0.45, 0, 0.2, 1);
export const ps = (t: number, a0: number, b0: number) => p(t, a0, b0, SOFT);
/** Quantise time for number counters: they roll at 20 Hz instead of changing digits every frame (a per-frame roll strobes). */
export const tick = (t: number, hz = 20) => Math.floor(t * hz) / hz;
/** Blend two #rrggbb colours (liquids change colour as solids, never by stacking opacity inside goo). */
export const mix = (c1: string, c2: string, q: number) => {
  const h = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const A = h(c1), B = h(c2);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], Math.max(0, Math.min(1, q)))).toString(16).padStart(2, '0')).join('');
};
export const txt = (size: number, weight = 700, color: string = K.white, extra: React.CSSProperties = {}): React.CSSProperties => ({
  fontFamily: FONT, fontWeight: weight, fontSize: size, color, lineHeight: 1.05, letterSpacing: size >= 90 ? -size * 0.03 : 0, ...extra,
});

// ---------- liquid primitives (SVG) ----------
/** Props that attach a goo filter to a <g>: `<g {...gooFilter('g1')}>`. LITE returns {} (no filter, blobs just overlap). */
export const gooFilter = (id: string): {filter?: string} => (LITE() ? {} : {filter: `url(#${id})`});
/** The goo filter (FULL only; in LITE it renders nothing — a full-frame blur is the costliest thing in the look). */
export const Goo: React.FC<{id: string; blur?: number}> = ({id, blur = 16}) => {
  const {W, H} = useFrame();
  return LITE() ? null : (
  <filter id={id} x="0" y="0" width={String(W)} height={String(H)} filterUnits="userSpaceOnUse">
    <feGaussianBlur in="SourceGraphic" stdDeviation={blur} result="b" />
    <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 30 -13" result="g" />
    <feComposite in="SourceGraphic" in2="g" operator="atop" />
  </filter>
  );
};

/** A wobbling liquid blob: one body circle + two satellites that orbit inside it (goo turns them into a living edge). */
export const Blob: React.FC<{x: number; y: number; r: number; fill: string; t: number; seed: number; opacity?: number}> = ({x, y, r, fill: fillIn, t, seed, opacity: opIn = 1}) => {
  let fill = fillIn, opacity = opIn;
  if (r <= 0.5) return null;
  const o1 = r * 0.42, o2 = r * 0.36;
  if (LITE() && /^#[0-9a-f]{8}$/i.test(fill)) { // no goo to merge alpha: draw opaque circles, fade the group
    opacity *= parseInt(fill.slice(7, 9), 16) / 255;
    fill = fill.slice(0, 7);
  }
  return (
    <g opacity={opacity}>
      <circle cx={x} cy={y} r={r} fill={fill} />
      <circle cx={x + Math.cos(t * 2.1 + seed) * o1} cy={y + Math.sin(t * 2.1 + seed) * o1} r={r * 0.62} fill={fill} />
      <circle cx={x + Math.cos(-t * 1.7 + seed * 2) * o2} cy={y + Math.sin(-t * 1.7 + seed * 2) * o2} r={r * 0.58} fill={fill} />
    </g>
  );
};

/** Glossy highlight for a blob of radius r at (x, y) — draw it OUTSIDE the goo group so it stays crisp. */
export const Gloss: React.FC<{x: number; y: number; r: number; opacity?: number}> = ({x, y, r, opacity = 0.35}) =>
  r > 2 ? <ellipse cx={x - r * 0.32} cy={y - r * 0.42} rx={r * 0.34} ry={r * 0.19} fill="#ffffff" opacity={opacity} transform={`rotate(-30 ${x - r * 0.32} ${y - r * 0.42})`} /> : null;

/** Points of a sloshing liquid edge at height `level` between x0..x1. */
export const edgeLine = (x0: number, x1: number, level: number, t: number, amp: number, seed = 0, n = 24): Array<[number, number]> => {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= n; i++) {
    const x = lerp(x0, x1, i / n);
    pts.push([x, level + Math.sin(i * 0.7 + t * 6 + seed) * amp + Math.sin(i * 0.31 - t * 3.7 + seed) * amp * 0.6]);
  }
  return pts;
};
const ptsD = (pts: Array<[number, number]>) => pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ');

/** Liquid surface path for a tube/flood: a sloshing sine edge at height `level` inside x0..x1, closed down to `bottom`. */
export const wave = (x0: number, x1: number, level: number, bottom: number, t: number, amp: number, seed = 0) =>
  `M ${x0} ${bottom} L ${ptsD(edgeLine(x0, x1, level, t, amp, seed))} L ${x1} ${bottom} Z`;

/** Glass vessel outline (a rounded rect) with a frosted body and a vertical highlight streak. */
export const GlassRect: React.FC<{x: number; y: number; w: number; h: number; r: number; opacity?: number}> = ({x, y, w, h, r, opacity = 1}) => (
  <g opacity={opacity}>
    <rect x={x} y={y} width={w} height={h} rx={r} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.38)" strokeWidth={3} />
    <rect x={x + Math.min(26, w * 0.12)} y={y + Math.min(r, h * 0.2) * 0.6 + 20} width={Math.max(8, w * 0.07)} height={Math.max(0, h - Math.min(r, h * 0.2) * 1.2 - 80)} rx={8} fill="#ffffff2a" />
  </g>
);

// ---------- shapes ----------
/** Water-jug (galon) outline: cap at the top, neck, shoulders, ridged body. (cx, y0) = top centre, h ≈ 270. */
export const galonPath = (cx: number, y0: number, s = 1) => {
  const X = (v: number) => (cx + v * s).toFixed(1), Y = (v: number) => (y0 + v * s).toFixed(1);
  return `M ${X(-34)} ${Y(24)} L ${X(34)} ${Y(24)} L ${X(34)} ${Y(50)} C ${X(34)} ${Y(72)} ${X(95)} ${Y(70)} ${X(95)} ${Y(112)} L ${X(95)} ${Y(242)} Q ${X(95)} ${Y(270)} ${X(67)} ${Y(270)} L ${X(-67)} ${Y(270)} Q ${X(-95)} ${Y(270)} ${X(-95)} ${Y(242)} L ${X(-95)} ${Y(112)} C ${X(-95)} ${Y(70)} ${X(-34)} ${Y(72)} ${X(-34)} ${Y(50)} Z`;
};

/** Stylised kidney bean (≈290×430 at s=1): convex outer side, soft hilum notch facing +x; mirror with flip=-1. Centre (cx, cy). */
export const kidneyPath = (cx: number, cy: number, s = 1, flip = 1) => {
  const P = (x: number, y: number) => `${(cx + x * s * flip).toFixed(1)} ${(cy + y * s).toFixed(1)}`;
  return `M ${P(20, -215)} C ${P(-110, -225)} ${P(-160, -110)} ${P(-150, 0)} C ${P(-160, 110)} ${P(-110, 225)} ${P(20, 215)} ` +
    `C ${P(110, 208)} ${P(142, 140)} ${P(114, 72)} C ${P(94, 34)} ${P(62, 24)} ${P(62, 0)} C ${P(62, -24)} ${P(94, -34)} ${P(114, -72)} C ${P(142, -140)} ${P(110, -208)} ${P(20, -215)} Z`;
};
/** Is a kidney-local point (unscaled, notch at +x) comfortably inside the bean? */
export const inKidney = (x: number, y: number) => ((x + 12) / 128) ** 2 + (y / 190) ** 2 < 0.9 && !(x > 20 && Math.abs(y) < 80);

/** Drinking tumbler: slightly tapered, rounded bottom. */
export const tumblerPath = (cx: number, top: number, bottom: number, wTop: number, wBot: number, r = 46) =>
  `M ${cx - wTop / 2} ${top} L ${cx + wTop / 2} ${top} L ${cx + wBot / 2} ${bottom - r} Q ${cx + wBot / 2} ${bottom} ${cx + wBot / 2 - r} ${bottom} ` +
  `L ${cx - wBot / 2 + r} ${bottom} Q ${cx - wBot / 2} ${bottom} ${cx - wBot / 2} ${bottom - r} Z`;

/** Mini kidney glyph for chips and pills (HTML-inline SVG). */
export const KidneyIcon: React.FC<{size?: number; color?: string}> = ({size = 44, color = K.pink}) => (
  <svg width={size * 0.72} height={size} viewBox="-170 -235 340 470" style={{display: 'block'}}>
    <path d={kidneyPath(0, 0, 1, 1)} fill={color} stroke="#ffffff" strokeOpacity={0.6} strokeWidth={18} />
    <ellipse cx={-70} cy={-110} rx={40} ry={22} fill="#fff" opacity={0.45} transform="rotate(-35 -70 -110)" />
  </svg>
);

// ---------- chip icons (what passes / stays) ----------
export const Dot: React.FC<{color: string; size?: number}> = ({color, size = 18}) => <div style={{width: size, height: size, borderRadius: size / 2, background: color, boxShadow: `0 0 18px ${color}`}} />;
export const Crystal: React.FC<{size?: number; color?: string}> = ({size = 18, color = '#fff'}) => <div style={{width: size, height: size, background: color, transform: 'rotate(45deg)', borderRadius: 3, boxShadow: `0 0 14px ${color}`}} />;
export const Hex: React.FC<{size?: number; color?: string}> = ({size = 22, color = K.amber}) => (
  <svg width={size} height={size} viewBox="-12 -12 24 24" style={LITE() ? {display: 'block'} : {display: 'block', filter: `drop-shadow(0 0 6px ${color})`}}><polygon points={hexPts(0, 0, 11)} fill={color} /></svg>
);
export const Ring: React.FC<{size?: number; color?: string}> = ({size = 20, color = '#fff'}) => <div style={{width: size, height: size, borderRadius: size / 2, border: `4px solid ${color}`, boxSizing: 'border-box'}} />;
export const hexPts = (x: number, y: number, r: number) => Array.from({length: 6}).map((_, i) => `${(x + Math.cos(i * Math.PI / 3 + Math.PI / 6) * r).toFixed(1)},${(y + Math.sin(i * Math.PI / 3 + Math.PI / 6) * r).toFixed(1)}`).join(' ');

// ---------- glass UI ----------
// LITE glass: no backdrop blur (the costliest thing in the look), a denser tinted panel instead, hard offset shadow.
const LITE_GLASS: React.CSSProperties = {background: 'linear-gradient(135deg, rgba(92,78,170,0.86), rgba(44,34,104,0.84))', border: '2px solid rgba(255,255,255,0.34)',
  boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.32), 0 10px 0 rgba(5,4,20,0.28)'};
export const Glass: React.FC<{style?: React.CSSProperties; children?: React.ReactNode; radius?: number}> = ({style, children, radius = 44}) => LITE() ? (
  <div style={{...LITE_GLASS, borderRadius: radius, ...style}}>{children}</div>
) : (
  <div style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06))', backdropFilter: 'blur(26px) saturate(150%)', WebkitBackdropFilter: 'blur(26px) saturate(150%)',
    border: '2px solid rgba(255,255,255,0.32)', borderRadius: radius, boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.35), 0 30px 60px rgba(5,4,20,0.35)', ...style}}>{children}</div>
);

/** Frosted pill chip that pops in at `at` (with a small overshoot). `icon` replaces the default colour dot. */
export const Chip: React.FC<{t: number; at: number; text: React.ReactNode; color?: string; icon?: React.ReactNode; size?: number; style?: React.CSSProperties; out?: number}> = ({t, at, text, color = K.cyan, icon, size = 40, style, out}) => {
  const q = pb(t, at - 0.05, at + 0.35);
  const o = out === undefined || !Number.isFinite(out) ? 1 : 1 - ps(t, out, out + 0.3);
  if (q <= 0.001 || o <= 0.001) return null;
  return (
    <div style={{display: 'inline-flex', alignItems: 'center', gap: 14, padding: `${size * 0.35}px ${size * 0.7}px`, borderRadius: 999, border: '2px solid rgba(255,255,255,0.3)',
      ...(LITE() ? {background: 'rgba(62,50,138,0.88)', boxShadow: '0 6px 0 rgba(5,4,20,0.25)'} : {background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)'}), fontFamily: FONT, fontWeight: 600, fontSize: size, color: K.white, whiteSpace: 'nowrap',
      transform: `translateY(${(1 - q) * 40}px) scale(${0.7 + 0.3 * q})`, opacity: Math.min(1, q * 1.4) * o, ...style}}>
      {icon ?? <Dot color={color} />}{text}
    </div>
  );
};

/**
 * Top headline pill that swaps its text on cue (old one floats up, new one rises in). Centred between `left` and
 * `right` (px from the frame edges, default 64); `top` default 200 portrait / 64 landscape. Landscape two-column
 * layouts can centre it over one column, e.g. `left={110} right={960}`.
 */
export const Headline: React.FC<{t: number; items: Array<{at: number; text: React.ReactNode}>; until?: number; top?: number; size?: number; left?: number; right?: number}> = ({t, items, until = Infinity, top: topIn, size = 58, left = 64, right = 64}) => {
  const fr = useFrame();
  const top = topIn ?? fr.pick(200, 64);
  return (
  <>
    {items.map((it, i) => {
      const next = items[i + 1]?.at ?? until;
      const qi = ps(t, it.at - 0.12, it.at + 0.3);
      const qo = Number.isFinite(next) ? ps(t, next - 0.12, next + 0.2) : 0;
      if (qi <= 0.001 || qo >= 0.999) return null;
      return (
        <div key={i} style={{position: 'absolute', left, right, top, display: 'flex', justifyContent: 'center', opacity: qi * (1 - qo), transform: `translateY(${(1 - qi) * 36 - qo * 36}px) scale(${0.92 + 0.08 * qi})`}}>
          <Glass style={{padding: '20px 42px', display: 'flex', alignItems: 'center', gap: 18, ...txt(size, 700), letterSpacing: -1, whiteSpace: 'nowrap'}}>{it.text}</Glass>
        </div>
      );
    })}
  </>
  );
};

/**
 * Glass caption with the spoken word lit by a pink→violet liquid pill. Portrait: top 1570. Landscape (no `top`):
 * anchored to the bottom safe margin (a wrapped page grows upward), max width 1400, Sora 48.
 */
export const Caption: React.FC<{t: number; pages: CaptionPage[]; top?: number}> = ({t, pages, top}) => {
  const fr = useFrame();
  const pg = pageAt(t, pages);
  if (!pg) return null;
  const q = pg.start < 0.15 ? 1 : ps(t, pg.start - 0.1, pg.start + 0.15); // the opening frame is already fully designed
  const pos: React.CSSProperties = fr.wide && top === undefined
    ? {position: 'absolute', left: fr.safe.side, right: fr.safe.side, bottom: fr.safe.bottom + 14, display: 'flex', justifyContent: 'center', alignItems: 'flex-end'}
    : {position: 'absolute', left: 64, right: 64, top: top ?? 1570, display: 'flex', justifyContent: 'center'};
  return (
    <div style={{...pos, opacity: q, transform: `translateY(${(1 - q) * 24}px)`}}>
      <Glass radius={36} style={{padding: '18px 30px', fontFamily: FONT, fontWeight: 600, fontSize: fr.pick(50, 48), lineHeight: 1.2, color: K.white, textAlign: 'center', maxWidth: fr.pick(952, 1400)}}>
        {pg.words.map((w, i) => {
          const on = t >= w.start - 0.04 && t < w.end + 0.1;
          return <React.Fragment key={i}><span style={{background: on ? `linear-gradient(90deg, ${K.pink}, ${K.violet})` : 'transparent', borderRadius: 16, padding: '0 10px', opacity: t >= w.start - 0.04 ? 1 : 0.4}}>{display(w.word)}</span>{i < pg.words.length - 1 ? ' ' : ''}</React.Fragment>;
        })}
      </Glass>
    </div>
  );
};

// ---------- backgrounds ----------
export type Bg = 'night' | 'deep' | 'flood' | 'amber' | 'aqua';
/** Slow mesh-gradient night (and variants). Every shot paints its own, so a liquid sweep can reveal it. */
export const MeshBg: React.FC<{t: number; kind?: Bg}> = ({t: tIn, kind = 'night'}) => {
  const lite = LITE();
  const t = lite ? 0 : tIn; // LITE: static glows — a moving full-screen gradient re-rasterises the whole frame every frame
  const g = (x: number, y: number, c: string, s: number) => `radial-gradient(circle at ${x}% ${y}%, ${c}, transparent ${s}%)`;
  const sx = Math.sin(t * 0.4), cx = Math.cos(t * 0.3), s2 = Math.sin(t * 0.45), c2 = Math.cos(t * 0.35);
  const layers: Record<Bg, string[]> = {
    night: [g(30 + sx * 12, 25 + cx * 8, `${K.violet}88`, 45), g(75 + c2 * 10, 70 + s2 * 10, `${K.pink}66`, 45), g(70 + Math.sin(t * 0.5) * 8, 18 + Math.sin(t * 0.25) * 6, `${K.cyan}44`, 40), K.night],
    deep: [g(25 + sx * 10, 30 + cx * 8, `${K.violet}55`, 45), g(80 + c2 * 8, 78 + s2 * 8, `${K.cyan}2e`, 42), `linear-gradient(180deg, #08071A, ${TONE.deep})`],
    flood: [g(28 + sx * 10, 22 + cx * 8, '#ffffff30', 35), g(80 + c2 * 8, 85 + s2 * 6, `${K.amber}44`, 38), `linear-gradient(160deg, ${K.violet}, ${K.pink})`],
    amber: [g(28 + sx * 10, 24 + cx * 8, `${K.amber}55`, 42), g(78 + c2 * 10, 72 + s2 * 10, `${K.pink}55`, 45), g(70, 16, `${K.violet}55`, 40), K.night],
    aqua: [g(30 + sx * 12, 26 + cx * 8, `${K.cyan}66`, 45), g(76 + c2 * 10, 74 + s2 * 10, `${K.violet}77`, 45), g(22, 82, `${K.pink}33`, 40), K.night],
  };
  return <div style={lite ? {position: 'absolute', inset: 0, background: layers[kind].join(','), willChange: 'transform'} : {position: 'absolute', inset: 0, background: layers[kind].join(',')}} />;
};

// ---------- liquid sweep transition ----------
/** A band of liquid sweeps across the frame: old shot above its leading edge, new shot behind its trailing edge. */
export type Sweep = {at: number; dur?: number; dir?: 'up' | 'down'; colors: [string, string]; seed?: number};
/** Frame size for the sweep geometry (pass `useFrame()`); defaults to portrait. */
export type SweepFrame = {W: number; H: number};
const PORTRAIT: SweepFrame = {W: 1080, H: 1920};
const SAMP = 26;
/** Band height: 640 px in portrait, the same AREA in other frames (360 px at 1920 wide). */
const bandOf = (W: number) => (640 * 1080) / W;
/** Edge samples: 24 across portrait, proportionally more across a wider frame (same wave length in px). */
const samplesOf = (W: number) => Math.round((24 * (W + 80)) / 1160);
export const sweepGeo = (t: number, s: Sweep, fr: SweepFrame = PORTRAIT) => {
  const dur = s.dur ?? 0.85;
  if (t < s.at || t >= s.at + dur) return null;
  const q = ps(t, s.at, s.at + dur);
  const up = (s.dir ?? 'up') === 'up';
  const band = bandOf(fr.W);
  const lead = up ? lerp(fr.H + 70, -70 - band, q) : lerp(-70, fr.H + 70 + band, q);
  return {q, up, lead, trail: up ? lead + band : lead - band, band};
};
/** CSS clip-path for the shot that the sweep reveals (only the part behind the trailing edge). */
export const sweepClip = (t: number, s: Sweep, fr: SweepFrame = PORTRAIT) => {
  const g = sweepGeo(t, s, fr);
  if (!g) return 'inset(0px)';
  const end = g.up ? fr.H + 90 : -90;
  return `path('M -40 ${end} L ${ptsD(edgeLine(-40, fr.W + 40, g.trail, t, SAMP, (s.seed ?? 0) + 1, samplesOf(fr.W)))} L ${fr.W + 40} ${end} Z')`;
};
export const SweepBand: React.FC<{t: number; s: Sweep; id: string}> = ({t, s, id}) => {
  const fr = useFrame();
  const g = sweepGeo(t, s, fr);
  if (!g) return null;
  const seed = s.seed ?? 0;
  const dirv = g.up ? 1 : -1;
  const n = samplesOf(fr.W), x1 = fr.W + 40;
  const lead = edgeLine(-40, x1, g.lead, t, SAMP, seed, n);
  const trail = edgeLine(-40, x1, g.trail + dirv * 8, t, SAMP, seed + 1, n).reverse(); // 8 px overlap hides the seam
  const foam = edgeLine(-40, x1, g.lead + dirv * 46, t + 0.5, 18, seed + 2, n).reverse();
  return (
    <svg width={fr.W} height={fr.H} style={{position: 'absolute', left: 0, top: 0}}>
      <defs>
        <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1={g.lead} x2="0" y2={g.trail}><stop offset="0" stopColor={s.colors[0]} /><stop offset="1" stopColor={s.colors[1]} /></linearGradient>
      </defs>
      <path d={`M ${ptsD(lead)} L ${ptsD(trail)} Z`} fill={`url(#${id})`} />
      <path d={`M ${ptsD(lead)} L ${ptsD(foam)} Z`} fill="#ffffff" opacity={0.18} />
      <polyline points={lead.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={5} />
      {Array.from({length: Math.round((16 * fr.W) / 1080)}).map((_, i) => {
        const depth = 80 + rnd(i * 3.3 + seed) * (g.band - 160);
        const y = g.lead + dirv * depth - dirv * (t - s.at) * (120 + rnd(i) * 160);
        return <circle key={i} cx={rnd(i * 7.1 + seed) * fr.W} cy={y} r={5 + rnd(i * 1.9) * 15} fill="none" stroke="#ffffff" strokeOpacity={0.45} strokeWidth={3} />;
      })}
    </svg>
  );
};

// ---------- shot compositor ----------
/** A shot of the episode: painted on its own mesh background; enters with a liquid sweep (or `fadeIn` for a dive). */
export type Shot = {from: number; render: (t: number) => React.ReactNode; bg?: Bg; sweep?: Sweep; until?: number; style?: (t: number) => React.CSSProperties};
const shotStart = (s: Shot) => (s.sweep ? s.sweep.at : s.from);
const shotIn = (s: Shot) => (s.sweep ? s.sweep.at + (s.sweep.dur ?? 0.85) : s.from);
export const Shots: React.FC<{t: number; shots: Shot[]}> = ({t, shots}) => {
  const fr = useFrame();
  return (
  <>
    {shots.map((s, i) => {
      const end = s.until ?? (shots[i + 1] ? shotIn(shots[i + 1]) : Infinity);
      if (t < shotStart(s) || t >= end) return null;
      return (
        <div key={i} style={{position: 'absolute', inset: 0, overflow: 'hidden', clipPath: s.sweep && (!LITE() || sweepGeo(t, s.sweep, fr)) ? sweepClip(t, s.sweep, fr) : LITE() ? undefined : 'inset(0px)', ...(s.style ? s.style(t) : {})}}>
          <MeshBg t={t} kind={s.bg} />
          {s.render(t)}
        </div>
      );
    })}
    {shots.map((s, i) => (s.sweep ? <SweepBand key={`b${i}`} t={t} s={s.sweep} id={`sweep${i}`} /> : null))}
  </>
  );
};

/** Slow handheld-free drift for a shot's content (subtle scale + float). */
export const Drift: React.FC<{t: number; seed?: number; amt?: number; children: React.ReactNode; origin?: string}> = ({t, seed = 0, amt = 1, children, origin = '50% 45%'}) => LITE() ? (
  // LITE: no whole-shot drift (moving the whole frame forces a full re-raster every frame)
  <div style={{position: 'absolute', inset: 0}}>{children}</div>
) : (
  <div style={{position: 'absolute', inset: 0, transformOrigin: origin,
    transform: `translate(${Math.sin(t * 0.35 + seed) * 7 * amt}px, ${Math.cos(t * 0.28 + seed * 2) * 9 * amt}px) scale(${1 + (0.012 + 0.008 * Math.sin(t * 0.22 + seed)) * amt})`}}>
    {children}
  </div>
);

/** Absolute box helper. `center` = a frame-wide row (0…W) with its content centred (x/w ignored); to centre in a landscape column use `x`, `w` and `style={{display: 'flex', justifyContent: 'center'}}`. */
export const Abs: React.FC<{x?: number; y: number; w?: number; o?: number; style?: React.CSSProperties; children: React.ReactNode; center?: boolean}> = ({x = 0, y, w, o = 1, style, children, center}) => {
  const {W} = useFrame();
  return o > 0.001 ? <div style={{position: 'absolute', left: center ? 0 : x, top: y, width: center ? W : w, display: center ? 'flex' : undefined, justifyContent: center ? 'center' : undefined, opacity: Math.min(1, o), ...style}}>{children}</div> : null;
};
