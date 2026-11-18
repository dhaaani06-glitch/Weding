import React from 'react';
import {AbsoluteFill, Easing} from 'remotion';
import {CaptionPage} from '../../components/WordCaptions';
import {display, lerp, p, pageAt, pb, Pose, rnd, useFrame, World} from '../shared';

// FLATLIFE style kit (VOYNANN MOGRAPH v1.8) — the classic flat 2D character explainer.
// A warm cream stage (big soft circle, sun, drifting confetti, floor band), rounded vector people built on one rig
// (`Person`: moods, blink, breathing, two-joint arms that hold tools, walk, drop-in with squash) with `Dimas` as the
// house protagonist, overshoot props (shelf that builds/tilts/collapses, boxes, price tags, frogs, hearts, medals),
// iris wipes between scenes, drop-in titles, pill labels and the white-pill caption with the spoken word in coral.
// Self-contained: depends only on react, remotion, ../shared and the CaptionPage type.
// Frame (v1.11): world = the composition at rest (pose = W/2, H/2, s 1). Portrait 1080×1920 floor y 1390; landscape
// 1920×1080 floor y 800 (`FLOOR_Y`), characters s ≈ 1.0–1.1 side by side. Full-frame pieces read useFrame().

export const FLAT = {
  bg: '#FFF3E2', navy: '#22325A', coral: '#FF6B57', teal: '#16A394', sun: '#FFC845', lilac: '#8F7CF0', sky: '#BFE6F2',
  skin: '#F4B98C', red: '#E0483C', brown: '#8A5A3B',
  // extras for the IKEA episode (same warm family)
  floor: '#F6DFC3', wood: '#E9B574', woodDark: '#C98B4E', kraft: '#DDAA6C', kraftDark: '#B98247', steel: '#A9B4CC', cream: '#FFF9F0',
};
export const F = FLAT;
export const HEAD = "'Flat Head', sans-serif";
export const TEXT = "'Flat Text', sans-serif";
export const FALL = Easing.in(Easing.quad);
export const SHADOW = '#22325A22';

// ---------- motion helpers ----------
export const blink = (t: number, seed: number) => {
  const per = 2.4 + rnd(seed) * 1.6;
  return (t + rnd(seed + 1) * per) % per < 0.11 ? 0.12 : 1;
};
/** Drop-in with squash-and-stretch on landing (from the prototype). */
export const land = (t: number, at: number, h = 700) => {
  const dy = lerp(-h, 0, p(t, at, at + 0.3, FALL));
  const k = t - (at + 0.3);
  const sq = k > 0 && k < 0.45 ? Math.sin((k / 0.45) * Math.PI) * 0.2 * (1 - k / 0.45) : 0;
  return {dy, sx: 1 + sq, sy: 1 - sq, on: t >= at};
};
/** Squash pulse after an impact at `at` (returns scale x/y). */
export const squash = (t: number, at: number, amt = 0.18, dur = 0.42) => {
  const k = t - at;
  const sq = k > 0 && k < dur ? Math.sin((k / dur) * Math.PI) * amt * (1 - k / dur) : 0;
  return {sx: 1 + sq, sy: 1 - sq};
};
/** Pop in (with overshoot) at `inAt` and, if `outAt` is given, pop out there (seconds). */
export const popIO = (t: number, inAt: number, outAt?: number, d = 0.32) =>
  pb(t, inAt, inAt + d) * (outAt === undefined || !Number.isFinite(outAt) ? 1 : 1 - p(t, outAt, outAt + 0.22, Easing.in(Easing.back(2))));

// ---------- labels & caption ----------
export const Pill: React.FC<{x: number; y: number; q: number; bg: string; color?: string; text: React.ReactNode; size?: number; rot?: number; shadow?: string}> = ({x, y, q, bg, color = '#fff', text, size = 54, rot = 0, shadow = '#22325A33'}) =>
  q > 0.01 ? (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) rotate(${rot}deg) scale(${q})`, background: bg, color, borderRadius: 999,
      padding: `${size * 0.22}px ${size * 0.6}px`, fontFamily: HEAD, fontWeight: 700, fontSize: size, letterSpacing: 2, whiteSpace: 'nowrap', boxShadow: `0 10px 0 ${shadow}`, lineHeight: 1.15}}>{text}</div>
  ) : null;

/** Default floor line of the stage in world coordinates: 1390 portrait, 800 landscape. */
export const FLOOR_Y = {portrait: 1390, landscape: 800} as const;

/**
 * White-pill caption (sun pill when `dark`). Portrait: top 1556. Landscape (no `top`): anchored to the bottom safe
 * margin (grows upward if a page wraps), max width 1400, Nunito 52.
 */
export const Caption: React.FC<{t: number; pages: CaptionPage[]; dark?: boolean; top?: number}> = ({t, pages, dark = false, top}) => {
  const fr = useFrame();
  const pg = pageAt(t, pages);
  if (!pg) return null;
  const q = pb(t, pg.start - 0.08, pg.start + 0.16);
  const box: React.CSSProperties = fr.wide && top === undefined
    ? {position: 'absolute', left: fr.safe.side, right: fr.safe.side, bottom: fr.safe.bottom + 14, display: 'flex', justifyContent: 'center', alignItems: 'flex-end'}
    : {position: 'absolute', left: 64, right: 64, top: top ?? 1556, display: 'flex', justifyContent: 'center'};
  return (
    <div style={box}>
      <div style={{background: dark ? F.sun : '#fff', borderRadius: 40, padding: '16px 28px', transform: `scale(${0.85 + 0.15 * q})`, opacity: q, boxShadow: '0 10px 0 #22325A30',
        fontFamily: TEXT, fontWeight: 900, fontSize: fr.pick(56, 52), lineHeight: 1.15, color: F.navy, textAlign: 'center', maxWidth: fr.pick(900, 1400)}}>
        {pg.words.map((w, i) => {
          const on = t >= w.start - 0.04 && t < w.end + 0.1;
          return <React.Fragment key={i}><span style={{background: on ? F.coral : 'transparent', color: on ? '#fff' : F.navy, borderRadius: 14, padding: '0 8px', opacity: t >= w.start - 0.04 ? 1 : 0.35}}>{display(w.word)}</span>{i < pg.words.length - 1 ? ' ' : ''}</React.Fragment>;
        })}
      </div>
    </div>
  );
};

// ---------- backdrops & transitions ----------
/** Floating confetti shapes (circles, plus signs, squiggles) that drift behind every scene. */
/** Spread over the frame width (world at rest); landscape: 18 pieces in y 50…730 (above the 800 floor). */
export const Confetti: React.FC<{t: number; colors: string[]; opacity?: number; n?: number; seed?: number}> = ({t, colors, opacity = 1, n: nIn, seed = 0}) => {
  const fr = useFrame();
  const n = nIn ?? fr.pick(14, 18);
  return (
  <g opacity={opacity}>
    {Array.from({length: n}).map((_, i) => {
      const k = i + seed * 31;
      const x = 60 + rnd(k * 3.3) * (fr.W - 120), y = (fr.wide ? 50 + rnd(k * 5.1) * 680 : 160 + rnd(k * 5.1) * 1250) + Math.sin(t * 1.3 + i) * 16;
      const c = colors[i % colors.length], r = 10 + rnd(k * 2.2) * 14, kind = i % 3;
      return kind === 0 ? <circle key={i} cx={x} cy={y} r={r} fill={c} />
        : kind === 1 ? <path key={i} d={`M ${x - r} ${y} H ${x + r} M ${x} ${y - r} V ${y + r}`} stroke={c} strokeWidth={8} strokeLinecap="round" transform={`rotate(${t * 30 + i * 20} ${x} ${y})`} />
        : <path key={i} d={`M ${x - 24} ${y} q 12 -16 24 0 t 24 0`} stroke={c} strokeWidth={7} fill="none" strokeLinecap="round" />;
    })}
  </g>
  );
};

/** One-shot confetti burst from (x, y) at time `at` (deterministic ballistic pieces). */
export const Burst: React.FC<{t: number; at: number; x: number; y: number; n?: number; spread?: number; colors?: string[]; seed?: number; power?: number}> = ({t, at, x, y, n = 22, spread = 1, colors = [F.coral, F.teal, F.sun, F.lilac], seed = 1, power = 1}) => {
  const k = t - at;
  if (k < 0 || k > 1.6) return null;
  return (
    <g opacity={1 - p(t, at + 1.1, at + 1.6)}>
      {Array.from({length: n}).map((_, i) => {
        const ang = -Math.PI / 2 + (rnd(seed + i * 1.7) - 0.5) * Math.PI * 1.5 * spread;
        const v = (520 + rnd(seed + i * 2.9) * 640) * power;
        const px = x + Math.cos(ang) * v * k * (1 - k * 0.35), py = y + Math.sin(ang) * v * k + 900 * k * k;
        const c = colors[i % colors.length], r = 9 + rnd(seed + i) * 9;
        return i % 2 ? <rect key={i} x={px - r} y={py - r * 0.5} width={r * 2} height={r} rx={3} fill={c} transform={`rotate(${k * 500 + i * 40} ${px} ${py})`} />
          : <circle key={i} cx={px} cy={py} r={r * 0.7} fill={c} />;
      })}
    </g>
  );
};

/**
 * Warm stage: background colour, a big soft circle, a small sun, drifting confetti, floor band. Use inside an svg.
 * Defaults follow the frame: portrait circle (540, 820) r 430, floor 1390, sun up-right of the circle; landscape circle
 * (W/2, 460) r 380, floor 800, sun to the right of the circle (cx + 1.04 r, cy − 0.6 r) so the top pill row stays free.
 */
export const Backdrop: React.FC<{t: number; bg?: string; circle?: string; cx?: number; cy?: number; r?: number; sun?: string | null; floorY?: number; floor?: string; confetti?: string[]; seed?: number}> = ({
  t, bg = F.bg, circle = F.sky, cx: cxIn, cy: cyIn, r: rIn, sun = F.sun, floorY: floorIn, floor = F.floor, confetti = [F.coral, F.teal, F.lilac, F.sun], seed = 0,
}) => {
  const fr = useFrame();
  const cx = cxIn ?? fr.cx, cy = cyIn ?? fr.pick(820, 460), r = rIn ?? fr.pick(430, 380);
  const floorY = floorIn ?? fr.pick(FLOOR_Y.portrait, FLOOR_Y.landscape);
  const sunX = fr.wide ? cx + r * 1.04 : cx + 340, sunY = fr.wide ? cy - r * 0.6 : cy - 390;
  return (
  <g>
    <rect x={-1200} y={-1200} width={fr.W + 2400} height={fr.H + 2400} fill={bg} />
    <circle cx={cx} cy={cy} r={r} fill={circle} />
    {sun && <circle cx={sunX} cy={sunY} r={90} fill={sun} />}
    <Confetti t={t} colors={confetti} seed={seed} />
    <rect x={-1200} y={floorY} width={fr.W + 2400} height={1600} fill={floor} />
    <rect x={-1200} y={floorY} width={fr.W + 2400} height={10} fill="#22325A18" />
  </g>
  );
};

/** Iris (circle clip) wipe: the children appear inside a growing circle with a sun-yellow rim. */
export const Iris: React.FC<{t: number; at: number; dur?: number; cx?: number; cy?: number; rim?: string; children: React.ReactNode}> = ({t, at, dur = 0.5, cx: cxIn, cy: cyIn, rim = F.sun, children}) => {
  const fr = useFrame();
  if (t < at) return null;
  const cx = cxIn ?? fr.cx, cy = cyIn ?? fr.pick(1000, 560); // default: frame centre, a little low
  const q = p(t, at, at + dur, Easing.inOut(Easing.cubic));
  const maxR = Math.hypot(Math.max(cx, fr.W - cx), Math.max(cy, fr.H - cy)) + 40;
  const r = q * maxR;
  return (
    <>
      <AbsoluteFill style={{clipPath: q >= 1 ? undefined : `circle(${r}px at ${cx}px ${cy}px)`, overflow: 'hidden'}}>{children}</AbsoluteFill>
      {q < 1 && (
        <svg width={fr.W} height={fr.H} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={rim} strokeWidth={26 * Math.sin(q * Math.PI)} />
          <circle cx={cx} cy={cy} r={r + 20} fill="none" stroke={F.coral} strokeWidth={10 * Math.sin(q * Math.PI)} />
        </svg>
      )}
    </>
  );
};

// ---------- the character rig ----------
export type Mood = 'happy' | 'proud' | 'pain' | 'curious' | 'sad' | 'shock' | 'meh' | 'love';
export type Tool = 'none' | 'hammer' | 'screwdriver' | 'clipboard' | 'wrench';
/** Shoulder angle `a` (0 = hanging, 90 = straight out, 180 = straight up), elbow bend `e` (+ = keeps rotating outward/up, − = folds inward). */
export type Arm = {a: number; e: number; tool?: Tool; toolRot?: number};
export type Look = {
  skin: string; hair: string; hairStyle: 'tuft' | 'short' | 'curly' | 'bun' | 'side' | 'bald'; shirt: string; pants: string; shoes: string;
  coat?: boolean; glasses?: boolean; beard?: boolean; stripe?: string;
};
export const DIMAS_LOOK: Look = {skin: F.skin, hair: '#3B2418', hairStyle: 'tuft', shirt: F.teal, pants: '#34497A', shoes: F.coral, stripe: '#0F8577'};

const L1 = 94, L2 = 86;
/** Hand position (character-local, before scale) for a given side/arm pose — lets scenes aim props at hands. */
export const handPos = (side: -1 | 1, arm: Arm) => {
  const a = (arm.a * Math.PI) / 180, e = ((arm.a + arm.e) * Math.PI) / 180;
  const sx = side * 64, sy = -318;
  const ex = sx + side * Math.sin(a) * L1, ey = sy + Math.cos(a) * L1;
  return {x: ex + side * Math.sin(e) * L2, y: ey + Math.cos(e) * L2};
};

const ToolArt: React.FC<{tool: Tool}> = ({tool}) => {
  if (tool === 'hammer')
    return (
      <g>
        <line x1={0} y1={-18} x2={0} y2={120} stroke={F.brown} strokeWidth={15} strokeLinecap="round" />
        <rect x={-52} y={112} width={104} height={38} rx={10} fill="#5E6E92" />
        <rect x={-52} y={112} width={104} height={12} rx={6} fill="#ffffff40" />
      </g>
    );
  if (tool === 'screwdriver')
    return (
      <g>
        <rect x={-13} y={-10} width={26} height={56} rx={11} fill={F.coral} />
        <line x1={0} y1={46} x2={0} y2={112} stroke={F.steel} strokeWidth={9} strokeLinecap="round" />
      </g>
    );
  if (tool === 'wrench')
    return <path d="M -8 -6 L -8 70 L -30 70 L -30 84 L 8 84 L 8 -6 Z" fill={F.steel} stroke="#7C88A6" strokeWidth={4} strokeLinejoin="round" />;
  if (tool === 'clipboard')
    return (
      <g transform="translate(0 30)">
        <rect x={-62} y={-80} width={124} height={160} rx={12} fill={F.brown} />
        <rect x={-50} y={-64} width={100} height={132} rx={6} fill="#fff" />
        <rect x={-24} y={-90} width={48} height={22} rx={8} fill={F.steel} />
        {[0, 1, 2, 3].map((i) => <line key={i} x1={-36} y1={-38 + i * 28} x2={36 - (i % 2) * 22} y2={-38 + i * 28} stroke={F.navy} strokeWidth={7} strokeLinecap="round" opacity={0.6} />)}
      </g>
    );
  return null;
};

export type PersonProps = {
  t: number; x: number; y: number; s?: number; look?: Look; mood?: Mood; seed?: number; at?: number;
  armL?: Arm; armR?: Arm; walk?: number; tilt?: number; lean?: number; lookX?: number; lookY?: number; hop?: number;
  bandage?: boolean; sweat?: number; thumbSwell?: number; flip?: boolean; dropH?: number;
};

/**
 * Flat human rig (same construction as the prototype's Romulus: origin = between the feet, ~520 px tall at s = 1).
 * Moods, blink, breathing, two-segment arms with tools, a front-facing walk cycle and landing squash.
 */
export const Person: React.FC<PersonProps> = ({
  t, x, y, s = 1, look = DIMAS_LOOK, mood = 'happy', seed = 7, at = -10, armL = {a: 12, e: 6}, armR = {a: 12, e: 6}, walk = 0, tilt = 0, lean = 0, lookX = 0, lookY = 0,
  hop = 0, bandage = false, sweat = 0, thumbSwell = 0, flip = false, dropH = 700,
}) => {
  const l = land(t, at, dropH);
  if (!l.on) return null;
  const breathe = Math.sin(t * 3.1 + seed) * 3;
  const ph = Math.sin(t * 13 + seed);
  const liftL = Math.max(0, ph) * walk * 26, liftR = Math.max(0, -ph) * walk * 26;
  const bob = Math.abs(ph) * walk * 10;
  const bl = mood === 'proud' || mood === 'pain' ? 1 : blink(t, seed);
  const ink = F.navy;
  const coat = !!look.coat;
  const arm = (side: -1 | 1, A: Arm) => {
    const tool = A.tool ?? 'none';
    const isL = side === -1;
    return (
      <g transform={`translate(${side * 64} -318) rotate(${-side * A.a})`}>
        <line x1={0} y1={0} x2={0} y2={L1} stroke={coat ? '#fff' : look.shirt} strokeWidth={30} strokeLinecap="round" />
        {coat && <line x1={0} y1={4} x2={0} y2={L1} stroke="#E4E9F2" strokeWidth={6} strokeLinecap="round" transform="translate(9 0)" />}
        <g transform={`translate(0 ${L1}) rotate(${-side * A.e})`}>
          <line x1={0} y1={0} x2={0} y2={L2} stroke={coat ? '#fff' : look.skin} strokeWidth={coat ? 28 : 24} strokeLinecap="round" />
          {coat && <line x1={0} y1={L2 * 0.62} x2={0} y2={L2} stroke={look.skin} strokeWidth={24} strokeLinecap="round" />}
          <g transform={`translate(0 ${L2}) rotate(${A.toolRot ?? 0})`}><ToolArt tool={tool} /></g>
          <circle cx={0} cy={L2 + 4} r={18} fill={look.skin} />
          {/* thumb */}
          <ellipse cx={side * -14} cy={L2 - 4} rx={9 * (1 + thumbSwell * (isL ? 1 : 0))} ry={12 * (1 + thumbSwell * (isL ? 1 : 0))} fill={isL && thumbSwell > 0 ? F.red : look.skin} />
          {bandage && isL && <rect x={side * -14 - 13} y={L2 - 12} width={26} height={14} rx={5} fill={F.cream} stroke={F.coral} strokeWidth={3} transform={`rotate(-20 ${side * -14} ${L2 - 6})`} />}
        </g>
      </g>
    );
  };
  // face parts, head-local (centre 0,0, r = 80)
  const eye = (ex: number, i: number) => {
    const px = ex + lookX * 5, py = lookY * 4;
    if (mood === 'proud') return <path key={ex} d={`M ${ex - 13} 6 Q ${ex} -10 ${ex + 13} 6`} stroke={ink} strokeWidth={7} fill="none" strokeLinecap="round" />;
    if (mood === 'pain') return <path key={ex} d={i ? `M ${ex + 12} -8 L ${ex - 8} 2 L ${ex + 12} 12` : `M ${ex - 12} -8 L ${ex + 8} 2 L ${ex - 12} 12`} stroke={ink} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
    if (mood === 'love')
      return <path key={ex} d={`M ${ex} 12 C ${ex - 22} -2 ${ex - 10} -16 ${ex} -6 C ${ex + 10} -16 ${ex + 22} -2 ${ex} 12 Z`} fill={F.coral} transform={`scale(${1 + Math.sin(t * 9) * 0.08})`} style={{transformBox: 'fill-box', transformOrigin: 'center'}} />;
    if (mood === 'shock')
      return <g key={ex}><ellipse cx={ex} cy={0} rx={15} ry={18 * bl} fill="#fff" stroke={ink} strokeWidth={5} /><circle cx={px} cy={py} r={6 * bl} fill={ink} /></g>;
    if (mood === 'meh')
      return <g key={ex}><ellipse cx={px} cy={4} rx={9} ry={9 * bl} fill={ink} /><path d={`M ${ex - 14} -2 L ${ex + 14} -2`} stroke={look.skin} strokeWidth={10} /><path d={`M ${ex - 14} 0 L ${ex + 14} 0`} stroke={ink} strokeWidth={6} strokeLinecap="round" /></g>;
    return <ellipse key={ex} cx={px} cy={py} rx={9} ry={12 * bl} fill={ink} />;
  };
  const brow = (ex: number, i: number) => {
    const sd = i ? 1 : -1;
    const d = mood === 'sad' ? `M ${ex - 14} ${-26 + sd * -6} L ${ex + 14} ${-26 + sd * 6}`.replace(/NaN/g, '0')
      : mood === 'pain' ? `M ${ex - 14} ${-30 + (i ? -8 : 8)} L ${ex + 14} ${-30 + (i ? 8 : -8)}`
      : mood === 'curious' ? (i ? `M ${ex - 14} -40 Q ${ex} -50 ${ex + 14} -40` : `M ${ex - 14} -28 L ${ex + 14} -28`)
      : mood === 'proud' ? `M ${ex - 14} -34 Q ${ex} -44 ${ex + 14} -34`
      : mood === 'shock' ? `M ${ex - 14} -40 Q ${ex} -48 ${ex + 14} -40`
      : `M ${ex - 13} -30 Q ${ex} -36 ${ex + 13} -30`;
    // sad: inner ends up
    const dSad = i ? `M ${ex - 14} -36 L ${ex + 14} -28` : `M ${ex - 14} -28 L ${ex + 14} -36`;
    return <path key={`b${ex}`} d={mood === 'sad' ? dSad : d} stroke={look.hair === '#FFFFFF' ? ink : look.hair} strokeWidth={7} fill="none" strokeLinecap="round" />;
  };
  const mouth = mood === 'happy' ? <path d="M -24 30 Q 0 52 24 30" stroke={ink} strokeWidth={7} fill="none" strokeLinecap="round" />
    : mood === 'proud' || mood === 'love' ? <g><path d="M -30 26 Q 0 70 30 26 Z" fill={ink} /><path d="M -14 46 Q 0 38 14 46 Q 0 58 -14 46 Z" fill={F.coral} /></g>
    : mood === 'pain' ? <g><path d="M -30 32 Q -15 22 0 32 Q 15 42 30 32 L 30 46 Q 15 56 0 46 Q -15 36 -30 46 Z" fill="#fff" stroke={ink} strokeWidth={5} strokeLinejoin="round" /></g>
    : mood === 'curious' ? <ellipse cx={6} cy={38} rx={9} ry={11} fill={ink} />
    : mood === 'sad' ? <path d="M -20 44 Q 0 28 20 44" stroke={ink} strokeWidth={7} fill="none" strokeLinecap="round" />
    : mood === 'shock' ? <ellipse cx={0} cy={40} rx={13} ry={17} fill={ink} />
    : <path d="M -18 38 L 18 38" stroke={ink} strokeWidth={7} strokeLinecap="round" />;
  const hair = () => {
    const c = look.hair;
    switch (look.hairStyle) {
      case 'tuft':
        return (
          <g fill={c}>
            <path d="M -84 4 Q -92 -86 -4 -94 Q 84 -96 86 4 Q 74 -38 46 -48 Q 30 -30 4 -44 Q -26 -30 -44 -50 Q -70 -36 -84 4 Z" />
            <path d="M -14 -90 Q 0 -138 40 -124 Q 20 -112 22 -88 Z" />
            <path d="M 10 -92 Q 38 -128 64 -104 Q 40 -100 34 -84 Z" />
          </g>
        );
      case 'short':
        return <path d="M -84 0 Q -88 -92 0 -92 Q 88 -92 84 0 Q 78 -50 40 -54 Q 0 -60 -40 -54 Q -78 -50 -84 0 Z" fill={c} />;
      case 'side':
        return <path d="M -86 10 Q -92 -94 6 -94 Q 92 -90 86 0 Q 70 -60 -6 -50 Q -50 -46 -62 -20 Q -74 -6 -86 10 Z" fill={c} />;
      case 'curly':
        return (
          <g fill={c}>
            {Array.from({length: 9}).map((_, i) => {
              const ang = Math.PI * (1.02 + (i / 8) * 0.96);
              return <circle key={i} cx={Math.cos(ang) * 76} cy={Math.sin(ang) * 72 - 8} r={30} />;
            })}
            <path d="M -70 -30 Q 0 -70 70 -30 L 70 -60 L -70 -60 Z" />
          </g>
        );
      case 'bun':
        return (
          <g fill={c}>
            <circle cx={0} cy={-104} r={36} />
            <path d="M -86 20 Q -94 -94 0 -92 Q 94 -94 86 20 Q 78 -44 40 -50 Q 0 -40 -40 -50 Q -78 -44 -86 20 Z" />
          </g>
        );
      default:
        return <path d="M -84 -10 Q -86 -40 -70 -50 L -70 -20 Z M 84 -10 Q 86 -40 70 -50 L 70 -20 Z" fill={c} />;
    }
  };
  const sweatDrop = sweat > 0 ? (
    <g opacity={sweat}>
      {[0, 1].map((i) => {
        const k = ((t * 1.4 + i * 0.5) % 1);
        return <path key={i} d="M 0 0 q 13 24 0 34 q -13 -10 0 -34 Z" fill={F.sky} stroke={ink} strokeWidth={4} transform={`translate(${i ? -96 : 92} ${-40 + k * 40}) scale(${1 - k * 0.3})`} opacity={1 - k} />;
      })}
    </g>
  ) : null;
  const pose = `translate(${x} ${y + l.dy - hop}) scale(${(flip ? -1 : 1) * s * l.sx} ${s * l.sy}) rotate(${lean})`;
  return (
    <g transform={pose}>
      <ellipse cx={0} cy={4} rx={110} ry={16} fill={SHADOW} transform={`scale(${1 + l.dy / 1400 - hop / 600})`} />
      <g transform={`translate(0 ${-bob})`}>
        {/* legs */}
        {[-1, 1].map((sd) => {
          const lift = sd < 0 ? liftL : liftR;
          return (
            <g key={sd}>
              <line x1={sd * 30} y1={-150} x2={sd * 34} y2={-18 - lift} stroke={look.pants} strokeWidth={32} strokeLinecap="round" />
              <ellipse cx={sd * 42} cy={-10 - lift} rx={34} ry={15} fill={look.shoes} />
              <rect x={sd * 42 - 30} y={-12 - lift} width={60} height={6} rx={3} fill="#fff" opacity={0.7} />
            </g>
          );
        })}
        <rect x={-76} y={-178} width={152} height={44} rx={16} fill={look.pants} />
        <g transform={`translate(0 ${breathe * 0.5})`}>
          {/* torso */}
          <path d="M -72 -336 Q -84 -240 -78 -158 L 78 -158 Q 84 -240 72 -336 Q 0 -356 -72 -336 Z" fill={look.shirt} />
          {look.stripe && !coat && <rect x={-80} y={-240} width={160} height={22} fill={look.stripe} opacity={0.9} />}
          {coat && (
            <g>
              <path d="M -76 -338 Q -90 -230 -84 -120 L -8 -120 L -8 -300 Q -30 -330 -76 -338 Z" fill="#fff" />
              <path d="M 76 -338 Q 90 -230 84 -120 L 8 -120 L 8 -300 Q 30 -330 76 -338 Z" fill="#fff" />
              <path d="M -8 -300 L -40 -250 L -20 -240 Z M 8 -300 L 40 -250 L 20 -240 Z" fill="#E4E9F2" />
              <rect x={30} y={-240} width={34} height={8} rx={4} fill={F.coral} />
            </g>
          )}
          <path d="M -22 -344 Q 0 -318 22 -344" fill={look.skin} />
          {arm(-1, armL)}
          {arm(1, armR)}
          {/* head */}
          <g transform={`translate(0 -436) rotate(${tilt} 0 80)`}>
            <rect x={-18} y={52} width={36} height={44} fill={look.skin} />
            <rect x={-18} y={58} width={36} height={14} fill="#00000014" />
            {[-1, 1].map((sd) => <circle key={sd} cx={sd * 80} cy={8} r={17} fill={look.skin} />)}
            <circle cx={0} cy={0} r={80} fill={look.skin} />
            {look.beard && <path d="M -78 14 Q -70 92 0 92 Q 70 92 78 14 Q 50 54 0 52 Q -50 54 -78 14 Z" fill={look.hair} />}
            {hair()}
            {[-28, 28].map((ex, i) => eye(ex, i))}
            {[-28, 28].map((ex, i) => brow(ex, i))}
            {look.glasses && (
              <g fill="none" stroke={ink} strokeWidth={5}>
                <circle cx={-28} cy={2} r={22} /><circle cx={28} cy={2} r={22} /><path d="M -6 0 Q 0 -6 6 0" />
              </g>
            )}
            <path d="M -6 16 Q 0 22 6 16" stroke="#C98058" strokeWidth={5} fill="none" strokeLinecap="round" />
            <circle cx={-50} cy={24} r={12} fill={F.coral} opacity={mood === 'love' || mood === 'proud' ? 0.6 : 0.38} />
            <circle cx={50} cy={24} r={12} fill={F.coral} opacity={mood === 'love' || mood === 'proud' ? 0.6 : 0.38} />
            {mouth}
            {sweatDrop}
          </g>
        </g>
      </g>
    </g>
  );
};

/** Dimas: young guy, messy tuft, teal tee with a stripe, coral sneakers. */
export const Dimas: React.FC<Omit<PersonProps, 'look'>> = (props) => <Person look={DIMAS_LOOK} seed={7} {...props} />;

/** Ready-made generic casts (no likeness of anyone): lab coats for researchers, three everyday people. Spread and tweak them: `{...LOOKS.labNeat, coat: false}`. */
export const LOOKS = {
  labGlasses: {skin: '#E9A877', hair: '#5B3A29', hairStyle: 'short', shirt: F.lilac, pants: F.navy, shoes: F.brown, coat: true, glasses: true},
  labNeat: {skin: '#F4C39C', hair: '#2B2B3A', hairStyle: 'side', shirt: F.sun, pants: '#34497A', shoes: F.navy, coat: true},
  labCurly: {skin: '#D99A6C', hair: '#4A3426', hairStyle: 'curly', shirt: F.coral, pants: F.navy, shoes: F.brown, coat: true},
  bunCoral: {skin: '#C98A5E', hair: '#2B1D16', hairStyle: 'bun', shirt: F.coral, pants: '#34497A', shoes: F.navy, stripe: '#E65441'},
  shortLilac: {skin: '#F2C29B', hair: '#6B4430', hairStyle: 'short', shirt: F.lilac, pants: F.navy, shoes: F.coral, stripe: '#7563D9'},
  curlySun: {skin: '#E6AE82', hair: '#3B2418', hairStyle: 'curly', shirt: F.sun, pants: '#34497A', shoes: F.teal, stripe: '#F0B22F'},
} satisfies Record<string, Look>;

// ---------- props ----------
/** Flat-pack box standing upright (origin bottom-centre). `open` lifts the top flaps; `tip` rotates it. */
export const FlatBox: React.FC<{x: number; y: number; s?: number; open?: number; label?: string; rot?: number; sx?: number; sy?: number}> = ({x, y, s = 1, open = 0, label = 'RAK BUKU', rot = 0, sx = 1, sy = 1}) => {
  const W = 270, H = 430, D = 46;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s * sx} ${s * sy})`}>
      <ellipse cx={20} cy={4} rx={190} ry={18} fill={SHADOW} />
      {/* side face */}
      <path d={`M ${W / 2} 0 L ${W / 2 + D} ${-D * 0.7} L ${W / 2 + D} ${-H - D * 0.7} L ${W / 2} ${-H} Z`} fill={F.kraftDark} />
      {/* top flaps */}
      <g transform={`translate(${-W / 2} ${-H}) rotate(${-120 * open})`}><path d={`M 0 0 L ${W / 2} 0 L ${W / 2 + D / 2} ${-D * 0.7} L ${D / 2} ${-D * 0.7} Z`} fill={open > 0.5 ? F.kraftDark : F.kraft} /></g>
      <g transform={`translate(${W / 2} ${-H}) rotate(${120 * open})`}><path d={`M 0 0 L ${-W / 2} 0 L ${-W / 2 + D / 2} ${-D * 0.7} L ${D / 2} ${-D * 0.7} Z`} fill={open > 0.5 ? F.kraftDark : '#E7B97F'} /></g>
      <rect x={-W / 2} y={-H} width={W} height={H} rx={6} fill={F.kraft} />
      <rect x={-W / 2} y={-H} width={W} height={34} fill="#C9935A" opacity={0.5 * (1 - open)} />
      {/* print: line drawing of a shelf */}
      <g transform={`translate(0 ${-H * 0.58})`} stroke={F.navy} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x={-62} y={-96} width={124} height={176} rx={4} />
        <line x1={-62} y1={-38} x2={62} y2={-38} /><line x1={-62} y1={20} x2={62} y2={20} />
        <rect x={-46} y={-84} width={14} height={40} fill={F.coral} stroke="none" /><rect x={-28} y={-80} width={14} height={36} fill={F.teal} stroke="none" />
        <rect x={18} y={-26} width={14} height={40} fill={F.sun} stroke="none" />
      </g>
      <text x={0} y={-62} textAnchor="middle" fill={F.navy} style={{fontFamily: HEAD, fontWeight: 700, fontSize: 40, letterSpacing: 2}}>{label}</text>
      <rect x={-W / 2 + 26} y={-46} width={44} height={22} rx={5} fill={F.coral} />
      <path d={`M ${W / 2 - 60} -46 l 18 14 l 18 -14`} stroke={F.navy} strokeWidth={6} fill="none" opacity={0.6} />
    </g>
  );
};

/** One wooden plank (used for parts and the shelf). */
const Plank: React.FC<{x: number; y: number; w: number; h: number; c?: string}> = ({x, y, w, h, c = F.wood}) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={5} fill={c} />
    <rect x={x} y={y + h - Math.min(8, h * 0.3)} width={w} height={Math.min(8, h * 0.3)} rx={3} fill={F.woodDark} opacity={0.7} />
  </g>
);

type PlankDef = {id: string; x: number; y: number; w: number; h: number; stage: number; from: [number, number]; pile: [number, number, number]};
const SW = 300, SH = 450, TH = 22;
const PLANKS: PlankDef[] = [
  {id: 'L', x: -SW / 2, y: -SH, w: TH, h: SH, stage: 0, from: [-260, 0], pile: [-150, -11, 90]},
  {id: 'R', x: SW / 2 - TH, y: -SH, w: TH, h: SH, stage: 0.08, from: [260, 0], pile: [170, -33, 88]},
  {id: 'B', x: -SW / 2, y: -40, w: SW, h: TH, stage: 0.25, from: [0, 120], pile: [10, -55, -4]},
  {id: 'T', x: -SW / 2, y: -SH, w: SW, h: TH, stage: 0.32, from: [0, -220], pile: [-40, -77, 6]},
  {id: 'S1', x: -SW / 2 + TH, y: -SH * 0.68, w: SW - TH * 2, h: TH, stage: 0.5, from: [-300, -60], pile: [60, -99, -8]},
  {id: 'S2', x: -SW / 2 + TH, y: -SH * 0.36, w: SW - TH * 2, h: TH, stage: 0.6, from: [300, -40], pile: [-20, -121, 10]},
];
const BOOKS = [
  {sh: 0, x: -118, w: 26, h: 96, c: F.coral}, {sh: 0, x: -90, w: 22, h: 84, c: F.teal}, {sh: 0, x: -66, w: 30, h: 104, c: F.lilac}, {sh: 0, x: -10, w: 24, h: 90, c: F.sun}, {sh: 0, x: 40, w: 28, h: 70, c: F.navy, lean: 18},
  {sh: 1, x: -118, w: 30, h: 100, c: F.sun}, {sh: 1, x: -86, w: 22, h: 86, c: F.navy}, {sh: 1, x: 30, w: 26, h: 96, c: F.coral}, {sh: 1, x: 58, w: 26, h: 104, c: F.teal}, {sh: 1, x: 86, w: 22, h: 90, c: F.lilac},
  {sh: 2, x: -118, w: 26, h: 92, c: F.lilac}, {sh: 2, x: -90, w: 30, h: 100, c: F.coral}, {sh: 2, x: 70, w: 30, h: 90, c: F.teal},
];

/**
 * Rak buku (origin bottom-centre on the floor). `build` 0→1 assembles it step by step (sides, base/top, shelves, back),
 * `tilt` racks it a few degrees (agak miring), `books` fills it, `collapse` 0→1 drops every plank into a pile.
 */
export const Shelf: React.FC<{x: number; y: number; s?: number; build?: number; tilt?: number; books?: number; collapse?: number; lying?: number; plant?: number}> = ({
  x, y, s = 1, build = 1, tilt = 0, books = 0, collapse = 0, lying = 0, plant = 0,
}) => {
  const backQ = p(build, 0.75, 1);
  const k = Math.tan((tilt * Math.PI) / 180);
  const intact = collapse <= 0;
  const loose = collapse < 1; // books/back fall and fade while the frame collapses
  const fall = p(collapse, 0, 0.6, FALL);
  const shelfTop = (sh: number) => [-40, -SH * 0.36, -SH * 0.68][sh];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={lying > 0.5 ? 0 : 0} cy={4} rx={SW * 0.7} ry={16} fill={SHADOW} />
      {/* lying → standing: rotate about the bottom-left corner (lying = on its side, top to the left) */}
      <g transform={`rotate(${-90 * lying} ${-SW / 2} 0)`}>
        <g transform={`matrix(1 0 ${-k} 1 0 0)`}>
          <g opacity={1 - fall} transform={`translate(${fall * -30} ${fall * 120}) rotate(${fall * -12})`}>
          {loose && backQ > 0 && <rect x={-SW / 2 + 6} y={-SH + 6} width={SW - 12} height={SH - 20} rx={4} fill="#D9A062" opacity={backQ} />}
          {loose && backQ > 0 && [0, 1, 2].map((i) => <line key={i} x1={-SW / 2 + 30} y1={-SH + 60 + i * 140} x2={SW / 2 - 30} y2={-SH + 60 + i * 140} stroke="#C98B4E" strokeWidth={4} opacity={backQ * 0.6} />)}
          </g>
          {/* books */}
          {loose && BOOKS.map((b, i) => {
            const q = pb(books, i / BOOKS.length * 0.7, i / BOOKS.length * 0.7 + 0.3);
            if (q <= 0) return null;
            const base = shelfTop(b.sh);
            const bf = p(collapse, 0.05 * (i % 4), 0.5 + 0.05 * (i % 4), FALL);
            const by = base + bf * (-base - 14 - (i % 3) * 10), br = (b.lean ?? 0) + tilt * 1.4 + bf * (i % 2 ? 84 : -84);
            return (
              <g key={i} transform={`translate(${b.x + b.w / 2 + bf * (i % 2 ? 40 : -40)} ${by}) rotate(${br}) scale(1 ${q})`} opacity={1 - p(collapse, 0.7, 1)}>
                <rect x={-b.w / 2} y={-b.h} width={b.w} height={b.h} rx={4} fill={b.c} />
                <rect x={-b.w / 2 + 4} y={-b.h + 14} width={b.w - 8} height={6} rx={3} fill="#ffffff66" />
              </g>
            );
          })}
          {/* planks */}
          {PLANKS.map((pl, i) => {
            const q = intact ? p(build, pl.stage, pl.stage + 0.22, Easing.out(Easing.back(1.4))) : 1;
            if (q <= 0) return null;
            const cx = pl.x + pl.w / 2, cy = pl.y + pl.h / 2;
            const cq = collapse > 0 ? p(collapse, i * 0.06, i * 0.06 + 0.55, FALL) : 0;
            const tx = lerp((1 - q) * pl.from[0], pl.pile[0] - cx, cq);
            const ty = lerp((1 - q) * pl.from[1], pl.pile[1] - cy, cq);
            const r = lerp(0, pl.pile[2], cq);
            return (
              <g key={pl.id} transform={`translate(${tx} ${ty}) rotate(${r} ${cx} ${cy})`} opacity={Math.min(1, q * 2)}>
                <Plank x={pl.x} y={pl.y} w={pl.w} h={pl.h} c={pl.id === 'L' || pl.id === 'R' ? '#E3AC69' : F.wood} />
              </g>
            );
          })}
          {/* screw heads */}
          {intact && build > 0.7 && [[-SW / 2 + 11, -SH + 11], [SW / 2 - 11, -SH + 11], [-SW / 2 + 11, -29], [SW / 2 - 11, -29]].map(([sx, sy], i) => <circle key={i} cx={sx} cy={sy} r={5} fill="#9A6A3E" />)}
          {/* plant on top */}
          {loose && plant > 0 && (
            <g transform={`translate(${70 + fall * 60} ${-SH + fall * (SH - 20)}) rotate(${fall * 70}) scale(${plant})`} opacity={1 - p(collapse, 0.7, 1)}>
              <path d="M -26 0 L -20 -44 L 20 -44 L 26 0 Z" fill={F.coral} transform="scale(1 -1) translate(0 0)" />
              <rect x={-24} y={-48} width={48} height={48} rx={8} fill={F.coral} />
              {[-30, 0, 30].map((a, i) => <ellipse key={i} cx={Math.sin((a * Math.PI) / 180) * 30} cy={-80} rx={13} ry={34} fill={F.teal} transform={`rotate(${a} ${Math.sin((a * Math.PI) / 180) * 30} -60)`} />)}
            </g>
          )}
        </g>
      </g>
    </g>
  );
};

export const Screw: React.FC<{x: number; y: number; s?: number; rot?: number}> = ({x, y, s = 1, rot = 0}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <rect x={-9} y={-6} width={18} height={70} rx={6} fill={F.steel} />
    {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={-11} y1={8 + i * 12} x2={11} y2={2 + i * 12} stroke="#7C88A6" strokeWidth={4} strokeLinecap="round" />)}
    <path d="M -9 64 L 0 82 L 9 64 Z" fill={F.steel} />
    <ellipse cx={0} cy={-8} rx={26} ry={12} fill="#C3CBDD" stroke="#7C88A6" strokeWidth={4} />
    <line x1={-12} y1={-8} x2={12} y2={-8} stroke="#7C88A6" strokeWidth={4} strokeLinecap="round" />
  </g>
);

export const Hammer: React.FC<{x: number; y: number; s?: number; rot?: number}> = ({x, y, s = 1, rot = 0}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <rect x={-14} y={-10} width={28} height={250} rx={12} fill={F.brown} />
    <rect x={-14} y={150} width={28} height={90} rx={12} fill="#6D4329" />
    <path d="M -110 -50 L 60 -50 Q 110 -50 110 -20 L 110 20 Q 110 34 80 30 L 60 26 L -110 26 Z" fill="#5E6E92" />
    <rect x={-110} y={-50} width={36} height={76} rx={6} fill="#4C5A7C" />
    <rect x={-74} y={-44} width={150} height={12} rx={6} fill="#ffffff40" />
  </g>
);

/** Wall clock; `hours` turns both hands (minute hand = hours × 360°), a coral wedge shows elapsed time. */
export const Clock: React.FC<{x: number; y: number; r?: number; hours: number; q?: number}> = ({x, y, r = 200, hours, q = 1}) => {
  const h0 = 10;
  const ha = ((h0 + hours) % 12) * 30, ma = (hours % 1) * 360;
  const wedge = (Math.min(hours, 11.99) / 12) * 360; // elapsed time from the 10 o'clock start
  const arc = (a0: number, a1: number, rr: number) => {
    const p0 = [Math.sin((a0 * Math.PI) / 180) * rr, -Math.cos((a0 * Math.PI) / 180) * rr];
    const p1 = [Math.sin((a1 * Math.PI) / 180) * rr, -Math.cos((a1 * Math.PI) / 180) * rr];
    return `M 0 0 L ${p0[0]} ${p0[1]} A ${rr} ${rr} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p1[0]} ${p1[1]} Z`;
  };
  if (q <= 0) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${q})`}>
      <circle cx={10} cy={14} r={r + 18} fill="#22325A22" />
      <circle cx={0} cy={0} r={r + 18} fill={F.navy} />
      <circle cx={0} cy={0} r={r} fill={F.cream} />
      {wedge > 0.5 && <path d={arc(h0 * 30, h0 * 30 + wedge, r * 0.86)} fill={F.coral} opacity={0.3} />}
      {Array.from({length: 12}).map((_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        return <line key={i} x1={Math.sin(a) * r * 0.82} y1={-Math.cos(a) * r * 0.82} x2={Math.sin(a) * r * 0.92} y2={-Math.cos(a) * r * 0.92} stroke={F.navy} strokeWidth={i % 3 ? 6 : 12} strokeLinecap="round" />;
      })}
      <line x1={0} y1={0} x2={0} y2={-r * 0.5} stroke={F.navy} strokeWidth={16} strokeLinecap="round" transform={`rotate(${ha})`} />
      <line x1={0} y1={0} x2={0} y2={-r * 0.76} stroke={F.coral} strokeWidth={10} strokeLinecap="round" transform={`rotate(${ma})`} />
      <circle cx={0} cy={0} r={14} fill={F.navy} />
    </g>
  );
};

/** Prize rosette with "#1". */
export const Medal: React.FC<{x: number; y: number; s?: number; rot?: number; text?: string}> = ({x, y, s = 1, rot = 0, text = '#1'}) =>
  s > 0.01 ? (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M -40 30 L -70 150 L -40 130 L -20 162 L 0 40 Z" fill={F.coral} />
      <path d="M 40 30 L 70 150 L 40 130 L 20 162 L 0 40 Z" fill="#E5533F" />
      {Array.from({length: 16}).map((_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return <circle key={i} cx={Math.cos(a) * 70} cy={Math.sin(a) * 70} r={22} fill={F.sun} />;
      })}
      <circle cx={0} cy={0} r={72} fill={F.sun} />
      <circle cx={0} cy={0} r={56} fill="#fff" stroke={F.sun} strokeWidth={8} />
      <text x={0} y={20} textAnchor="middle" fill={F.navy} style={{fontFamily: HEAD, fontWeight: 700, fontSize: 56}}>{text}</text>
    </g>
  ) : null;

export const Heart: React.FC<{x: number; y: number; s?: number; color?: string; deflate?: number; rot?: number; crack?: number}> = ({x, y, s = 1, color = F.coral, deflate = 0, rot = 0, crack = 0}) => {
  if (s <= 0.01) return null;
  const sy = 1 - deflate * 0.55, sx = 1 - deflate * 0.25;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s * sx} ${s * sy})`}>
      <path d="M 0 70 C -120 -10 -90 -110 0 -60 C 90 -110 120 -10 0 70 Z" fill="#22325A22" transform="translate(8 10)" />
      <path d="M 0 70 C -120 -10 -90 -110 0 -60 C 90 -110 120 -10 0 70 Z" fill={color} />
      <ellipse cx={-38} cy={-38} rx={18} ry={11} fill="#ffffff66" transform="rotate(-30 -38 -38)" />
      {deflate > 0.2 && <path d="M -40 10 q 10 -10 20 0 M 20 -10 q 10 -8 20 2" stroke="#00000030" strokeWidth={6} fill="none" strokeLinecap="round" />}
      {crack > 0 && <path d="M 0 -60 L -12 -20 L 10 0 L -8 34 L 0 70" stroke={F.navy} strokeWidth={8} fill="none" strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray="1 2" strokeDashoffset={1 - crack} />}
    </g>
  );
};

/** Price tag hanging from a string at (x, y). */
export const PriceTag: React.FC<{x: number; y: number; s?: number; text: React.ReactNode; color?: string; ink?: string; swing?: number; string?: number; w?: number; size?: number}> = ({
  x, y, s = 1, text, color = F.sun, ink = F.navy, swing = 0, string = 80, w = 240, size = 70,
}) => {
  if (s <= 0.01) return null;
  const h = 130;
  return (
    <g transform={`translate(${x} ${y}) rotate(${swing}) scale(${s})`}>
      <line x1={0} y1={-string} x2={0} y2={0} stroke={F.navy} strokeWidth={5} />
      <g transform="translate(0 0)">
        <path d={`M 0 -10 L ${w / 2} 30 L ${w / 2} ${h + 40} L ${-w / 2} ${h + 40} L ${-w / 2} 30 Z`} fill="#22325A22" transform="translate(8 10)" />
        <path d={`M 0 -10 L ${w / 2} 30 L ${w / 2} ${h + 40} Q ${w / 2} ${h + 52} ${w / 2 - 12} ${h + 52} L ${-w / 2 + 12} ${h + 52} Q ${-w / 2} ${h + 52} ${-w / 2} ${h + 40} L ${-w / 2} 30 Z`} fill={color} stroke={F.navy} strokeWidth={6} strokeLinejoin="round" />
        <circle cx={0} cy={22} r={12} fill={F.bg} stroke={F.navy} strokeWidth={5} />
        <text x={0} y={60 + h / 2} textAnchor="middle" fill={ink} style={{fontFamily: HEAD, fontWeight: 700, fontSize: size}}>{text}</text>
      </g>
    </g>
  );
};

/** Origami frog: `crumple` 0 = neat expert fold, 1 = amateur (wonky outline, creases, odd eyes). Origin = bottom centre. */
export const Frog: React.FC<{x: number; y: number; s?: number; crumple?: number; color?: string; rot?: number; seed?: number; happy?: boolean}> = ({x, y, s = 1, crumple = 0, color = F.teal, rot = 0, seed = 3, happy = false}) => {
  if (s <= 0.01) return null;
  const j = (i: number, amt = 26) => (rnd(seed + i * 1.91) - 0.5) * amt * crumple;
  const pts: Array<[number, number]> = [[-130, 0], [-96, -70], [-56, -112], [-30, -150], [0, -128], [30, -150], [56, -112], [96, -70], [130, 0]];
  const P = pts.map(([px, py], i) => [px + j(i), py + j(i + 20)] as [number, number]);
  const poly = P.map((q) => q.join(' ')).join(' L ');
  const dark = '#0E7F73', light = '#3FC1B0';
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <ellipse cx={0} cy={6} rx={150} ry={14} fill={SHADOW} />
      <path d={`M ${poly} Z`} fill={color} stroke={F.navy} strokeWidth={6} strokeLinejoin="round" />
      {/* facets */}
      <path d={`M ${P[0].join(' ')} L ${0 + j(40)} ${-56 + j(41)} L ${P[8].join(' ')} Z`} fill={dark} opacity={0.55} />
      <path d={`M ${P[2].join(' ')} L ${0 + j(40)} ${-56 + j(41)} L ${P[6].join(' ')} L ${P[4].join(' ')} Z`} fill={light} opacity={0.6} />
      {/* back legs */}
      <path d={`M -130 0 L ${-170 + j(50)} ${-20 + j(51)} L ${-120 + j(52)} -30 Z`} fill={dark} stroke={F.navy} strokeWidth={5} strokeLinejoin="round" />
      <path d={`M 130 0 L ${170 + j(53)} ${-20 + j(54)} L ${120 + j(55)} -30 Z`} fill={dark} stroke={F.navy} strokeWidth={5} strokeLinejoin="round" />
      {/* creases (amateur) */}
      {crumple > 0.3 && [0, 1, 2, 3].map((i) => <path key={i} d={`M ${-80 + i * 50 + j(60 + i, 30)} ${-20 + j(70 + i, 30)} L ${-60 + i * 46 + j(80 + i, 40)} ${-80 + j(90 + i, 30)}`} stroke={F.navy} strokeWidth={3} opacity={0.45 * crumple} />)}
      {/* eyes */}
      {[[-30, -150], [30, -150]].map(([ex, ey], i) => {
        const big = 1 + (i ? 0.45 : -0.15) * crumple;
        const ox = P[i ? 5 : 3][0] - ex, oy = P[i ? 5 : 3][1] - ey;
        return (
          <g key={i} transform={`translate(${ex + ox} ${ey + oy + 6})`}>
            <circle cx={0} cy={0} r={18 * big} fill="#fff" stroke={F.navy} strokeWidth={5} />
            <circle cx={i ? 4 * crumple : 0} cy={2 + (i ? 6 : -2) * crumple} r={8 * big} fill={F.navy} />
          </g>
        );
      })}
      {happy ? <path d="M -24 -98 Q 0 -78 24 -98" stroke={F.navy} strokeWidth={6} fill="none" strokeLinecap="round" />
        : <path d={`M -22 ${-96 + j(99, 12)} Q 0 ${-90 + j(98, 20)} 22 ${-96 + j(97, 12)}`} stroke={F.navy} strokeWidth={6} fill="none" strokeLinecap="round" />}
    </g>
  );
};

/** Paper square folding into a triangle (fold1) and a smaller triangle (fold2). Origin = centre. */
export const PaperFold: React.FC<{x: number; y: number; s?: number; fold1: number; fold2: number; color?: string; rot?: number}> = ({x, y, s = 1, fold1, fold2, color = F.teal, rot = 0}) => {
  const R = 150;
  const back = '#0E7F73';
  const f1 = Math.cos(fold1 * Math.PI); // 1 → −1: top half flips down over the horizontal diagonal
  const f2 = Math.cos(fold2 * Math.PI);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      {/* bottom half (always) */}
      <g>
        {/* left quarter of bottom half folds over the vertical axis in fold2 */}
        <path d={`M ${-R} 0 L 0 0 L 0 ${R} Z`} fill={color} stroke={F.navy} strokeWidth={6} strokeLinejoin="round" transform={`scale(${f2} 1)`} style={{}} />
        <path d={`M 0 0 L ${R} 0 L 0 ${R} Z`} fill={color} stroke={F.navy} strokeWidth={6} strokeLinejoin="round" />
        {fold2 > 0.5 && <path d={`M 0 0 L ${R * -f2} 0 L 0 ${R} Z`} fill={back} stroke={F.navy} strokeWidth={6} strokeLinejoin="round" />}
      </g>
      {/* top half flips down */}
      {fold1 < 1 && (
        <g transform={`scale(1 ${f1})`}>
          <path d={`M ${-R} 0 L 0 ${-R} L ${R} 0 Z`} fill={f1 > 0 ? color : back} stroke={F.navy} strokeWidth={6} strokeLinejoin="round" />
        </g>
      )}
      {fold1 >= 1 && fold2 < 0.5 && <path d={`M ${-R} 0 L 0 ${R} L ${R} 0 Z`} fill={back} stroke={F.navy} strokeWidth={6} strokeLinejoin="round" opacity={0.0} />}
      <line x1={fold2 > 0.5 ? 0 : -R} y1={0} x2={R} y2={0} stroke={F.navy} strokeWidth={4} opacity={0.35} />
    </g>
  );
};

/** Storage box folding from a flat net (fold 0) into a box (fold 1). Origin = bottom centre. */
export const StorageBox: React.FC<{x: number; y: number; s?: number; fold?: number; color?: string; label?: boolean}> = ({x, y, s = 1, fold = 1, color = F.kraft, label = true}) => {
  const S = 170;
  const k = Math.max(0, Math.min(1, fold));
  const side = lerp(1, 0.3, k), top = lerp(1, 0.32, k), gone = 1 - k;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={20} cy={6} rx={S * 0.8} ry={14} fill={SHADOW} />
      <g transform={`translate(0 ${-S / 2})`}>
        {/* left + bottom flaps fold away */}
        {gone > 0.02 && <rect x={-S / 2 - S * gone} y={-S / 2} width={S * gone} height={S} fill={F.kraftDark} stroke={F.navy} strokeWidth={5} />}
        {gone > 0.02 && <rect x={-S / 2} y={S / 2} width={S} height={S * gone * 0.4} fill={F.kraftDark} stroke={F.navy} strokeWidth={5} opacity={gone} />}
        {/* right side face */}
        <path d={`M ${S / 2} ${-S / 2} L ${S / 2 + S * side} ${-S / 2 - S * side * (k * 0.5)} L ${S / 2 + S * side} ${S / 2 - S * side * (k * 0.5)} L ${S / 2} ${S / 2} Z`} fill={F.kraftDark} stroke={F.navy} strokeWidth={5} strokeLinejoin="round" />
        {/* top face */}
        <path d={`M ${-S / 2} ${-S / 2} L ${-S / 2 + S * 0.3 * k} ${-S / 2 - S * top} L ${S / 2 + S * 0.3 * k} ${-S / 2 - S * top} L ${S / 2} ${-S / 2} Z`} fill="#E9BD86" stroke={F.navy} strokeWidth={5} strokeLinejoin="round" />
        <rect x={-S / 2} y={-S / 2} width={S} height={S} fill={color} stroke={F.navy} strokeWidth={5} />
        {label && <rect x={-S * 0.3} y={-S * 0.12} width={S * 0.6} height={S * 0.3} rx={8} fill={F.cream} stroke={F.navy} strokeWidth={4} />}
        {label && <line x1={-S * 0.18} y1={S * 0.03} x2={S * 0.18} y2={S * 0.03} stroke={F.coral} strokeWidth={7} strokeLinecap="round" />}
        {k > 0.85 && <path d={`M ${-S / 2 + S * 0.15 * k} ${-S / 2 - S * top * 0.5} L ${S / 2 + S * 0.15 * k} ${-S / 2 - S * top * 0.5}`} stroke={F.navy} strokeWidth={4} opacity={0.5} />}
      </g>
    </g>
  );
};

/**
 * Podium / price bar standing on the floor at y (grows with `h`). Optional `label` (small caps line) and `value` (big number)
 * on its face; each fades in only once the podium is tall enough to hold it, so text never hangs below the floor while it rises.
 */
export const Podium: React.FC<{x: number; y: number; w: number; h: number; color: string; label?: string; value?: string; labelSize?: number; valueSize?: number}> = ({x, y, w, h, color, label, value, labelSize = 40, valueSize = 96}) => {
  if (h <= 1) return null;
  const ly = labelSize * 2.1, vy = (label ? ly : 0) + valueSize * 1.05;
  return (
    <g>
      <rect x={x - w / 2} y={y - h} width={w} height={h + 6} rx={16} fill={color} />
      <rect x={x - w / 2} y={y - h} width={w} height={20} rx={10} fill="#ffffff55" />
      {label && <text x={x} y={y - h + ly} textAnchor="middle" fill="#fff" opacity={p(h, ly + 16, ly + 56)} style={{fontFamily: HEAD, fontWeight: 700, fontSize: labelSize, letterSpacing: 2}}>{label}</text>}
      {value && <text x={x} y={y - h + vy} textAnchor="middle" fill="#fff" opacity={p(h, vy + 24, vy + 74)} style={{fontFamily: HEAD, fontWeight: 700, fontSize: valueSize}}>{value}</text>}
    </g>
  );
};

/** Cartoon impact burst with a word inside. */
export const BurstStar: React.FC<{x: number; y: number; s: number; text?: string; color?: string; rot?: number}> = ({x, y, s, text, color = F.sun, rot = 0}) => {
  if (s <= 0.01) return null;
  const pts = Array.from({length: 24}).map((_, i) => {
    const a = (i / 24) * Math.PI * 2, r = i % 2 ? 110 : 170 + (i % 4 === 0 ? 20 : 0);
    return `${Math.cos(a) * r} ${Math.sin(a) * r * 0.8}`;
  });
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d={`M ${pts.join(' L ')} Z`} fill={color} stroke={F.navy} strokeWidth={8} strokeLinejoin="round" />
      {text && <text x={0} y={24} textAnchor="middle" fill={F.navy} style={{fontFamily: HEAD, fontWeight: 700, fontSize: 76, letterSpacing: 2}}>{text}</text>}
    </g>
  );
};

/** Little stars circling a head (dizzy). */
export const DizzyStars: React.FC<{t: number; x: number; y: number; q: number; rx?: number}> = ({t, x, y, q, rx = 120}) =>
  q > 0.01 ? (
    <g opacity={q}>
      {[0, 1, 2].map((i) => {
        const a = t * 5 + (i * Math.PI * 2) / 3;
        return <path key={i} d={STAR_PATH} fill={F.sun} stroke={F.navy} strokeWidth={4} transform={`translate(${x + Math.cos(a) * rx} ${y + Math.sin(a) * rx * 0.3}) scale(${0.5 + 0.25 * (Math.sin(a) + 1)})`} />;
      })}
    </g>
  ) : null;
const STAR_PATH = 'M 0 -30 L 9 -9 L 30 -6 L 14 9 L 19 30 L 0 19 L -19 30 L -14 9 L -30 -6 L -9 -9 Z';

/** 4-point twinkle that pops and fades. */
export const Sparkle: React.FC<{t: number; at: number; x: number; y: number; size?: number; color?: string; dur?: number}> = ({t, at, x, y, size = 40, color = F.sun, dur = 0.7}) => {
  const k = (t - at) / dur;
  if (k < 0 || k > 1) return null;
  const sc = Math.sin(k * Math.PI) * size;
  return <path d="M 0 -1 Q 0.12 -0.12 1 0 Q 0.12 0.12 0 1 Q -0.12 0.12 -1 0 Q -0.12 -0.12 0 -1 Z" fill={color} transform={`translate(${x} ${y}) rotate(${k * 90}) scale(${sc})`} />;
};
/** Looping sparkles around a point (for "best" / "glow" moments). */
export const SparkleField: React.FC<{t: number; from: number; x: number; y: number; rx: number; ry: number; n?: number; color?: string; until?: number}> = ({t, from, x, y, rx, ry, n = 6, color = F.sun, until = Infinity}) => {
  if (t < from || t > until + 0.7) return null;
  return (
    <g>
      {Array.from({length: n}).map((_, i) => {
        const per = 1.1 + rnd(i * 3.7) * 0.6;
        const phase = rnd(i * 5.3) * per;
        const cyc = Math.floor((t - from + phase) / per);
        const at = from - phase + cyc * per;
        if (at > until) return null;
        const a = rnd(i * 7.1 + cyc * 1.3) * Math.PI * 2, rr = 0.6 + rnd(i * 2.3 + cyc) * 0.4;
        return <Sparkle key={i} t={t} at={at} x={x + Math.cos(a) * rx * rr} y={y + Math.sin(a) * ry * rr} size={18 + rnd(i) * 22} color={color} dur={per * 0.8} />;
      })}
    </g>
  );
};

export const SweatDrop: React.FC<{x: number; y: number; s?: number; rot?: number}> = ({x, y, s = 1, rot = 0}) =>
  s > 0.01 ? <path d="M 0 -26 Q 22 8 0 26 Q -22 8 0 -26 Z" fill={F.sky} stroke={F.navy} strokeWidth={5} transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} /> : null;

export const QMark: React.FC<{x: number; y: number; s: number; color?: string; rot?: number; size?: number}> = ({x, y, s, color = F.sun, rot = 0, size = 150}) =>
  s > 0.01 ? <text x={0} y={0} textAnchor="middle" fill={color} stroke={F.navy} strokeWidth={6} paintOrder="stroke" transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} style={{fontFamily: HEAD, fontWeight: 700, fontSize: size}}>?</text> : null;

export const Magnifier: React.FC<{x: number; y: number; s?: number; rot?: number}> = ({x, y, s = 1, rot = -30}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <circle cx={0} cy={0} r={70} fill="#BFE6F255" stroke={F.sun} strokeWidth={16} />
    <line x1={0} y1={74} x2={0} y2={190} stroke={F.sun} strokeWidth={24} strokeLinecap="round" />
    <path d="M -36 -30 Q -20 -50 6 -52" stroke="#fff" strokeWidth={8} fill="none" strokeLinecap="round" opacity={0.7} />
  </g>
);

/** Lab table with legs (origin = top-centre). */
export const Table: React.FC<{x: number; y: number; w: number; color?: string; legs?: number}> = ({x, y, w, color = F.brown, legs = 230}) => (
  <g>
    <rect x={x - w / 2 + 30} y={y} width={22} height={legs} fill="#6D4329" />
    <rect x={x + w / 2 - 52} y={y} width={22} height={legs} fill="#6D4329" />
    <rect x={x - w / 2} y={y - 10} width={w} height={34} rx={10} fill={color} />
    <rect x={x - w / 2} y={y - 10} width={w} height={10} rx={5} fill="#ffffff40" />
  </g>
);

/** Room decor: window with sky, a picture frame and a potted plant. */
export const Window: React.FC<{x: number; y: number; w?: number; h?: number; t: number}> = ({x, y, w = 300, h = 360, t}) => (
  <g>
    <rect x={x - 14} y={y - 14} width={w + 28} height={h + 28} rx={18} fill={F.cream} />
    <rect x={x} y={y} width={w} height={h} rx={8} fill={F.sky} />
    <circle cx={x + w * 0.7} cy={y + h * 0.3} r={44} fill={F.sun} />
    <g transform={`translate(${((t * 14) % (w + 200)) - 100} 0)`}>
      <ellipse cx={x + 40} cy={y + h * 0.62} rx={60} ry={22} fill="#fff" />
      <ellipse cx={x + 80} cy={y + h * 0.58} rx={40} ry={26} fill="#fff" />
    </g>
    <rect x={x + w / 2 - 7} y={y} width={14} height={h} fill={F.cream} />
    <rect x={x} y={y + h / 2 - 7} width={w} height={14} fill={F.cream} />
    <rect x={x - 30} y={y + h + 8} width={w + 60} height={22} rx={8} fill="#E8C9A2" />
  </g>
);
export const Plant: React.FC<{x: number; y: number; s?: number; t: number}> = ({x, y, s = 1, t}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx={0} cy={4} rx={70} ry={12} fill={SHADOW} />
    {[-40, -15, 15, 40].map((a, i) => (
      <ellipse key={i} cx={0} cy={-150} rx={22} ry={70} fill={i % 2 ? F.teal : '#0F8577'} transform={`rotate(${a + Math.sin(t * 1.5 + i) * 3} 0 -90)`} />
    ))}
    <path d="M -52 -110 L 52 -110 L 40 0 L -40 0 Z" fill={F.coral} />
    <rect x={-58} y={-120} width={116} height={24} rx={8} fill="#E65441" />
  </g>
);
export const Frame: React.FC<{x: number; y: number; w: number; h: number; rot?: number; children?: React.ReactNode}> = ({x, y, w, h, rot = 0, children}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <rect x={-w / 2 - 12} y={-h / 2 - 12} width={w + 24} height={h + 24} rx={8} fill={F.navy} />
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={4} fill={F.cream} />
    {children}
  </g>
);

/** Check card: rounded card with a box that gets a hand-drawn tick (q) or a cross (x). */
export const CheckCard: React.FC<{x: number; y: number; s: number; text: string; tick: number; cross?: number; w?: number}> = ({x, y, s, text, tick, cross = 0, w = 620}) =>
  s > 0.01 ? (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-w / 2 + 10} y={-70} width={w} height={150} rx={30} fill="#00000033" />
      <rect x={-w / 2} y={-80} width={w} height={150} rx={30} fill="#fff" />
      <rect x={-w / 2 + 34} y={-46} width={84} height={84} rx={18} fill={F.bg} stroke={F.navy} strokeWidth={7} />
      <path d={`M ${-w / 2 + 52} -6 L ${-w / 2 + 72} 18 L ${-w / 2 + 108} -32`} stroke={F.teal} strokeWidth={14} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 2" strokeDashoffset={1 - tick} opacity={tick > 0.01 && cross < 0.5 ? 1 : 0} />
      {cross > 0 && <path d={`M ${-w / 2 + 52} -28 L ${-w / 2 + 100} 20 M ${-w / 2 + 100} -28 L ${-w / 2 + 52} 20`} stroke={F.red} strokeWidth={14} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="1 2" strokeDashoffset={1 - cross} />}
      <text x={-w / 2 + 150} y={20} fill={F.navy} style={{fontFamily: HEAD, fontWeight: 700, fontSize: 64}}>{text}</text>
    </g>
  ) : null;

/** Mix two arm poses. */
export const armMix = (A: Arm, B: Arm, q: number): Arm => ({a: lerp(A.a, B.a, q), e: lerp(A.e, B.e, q), tool: q < 0.5 ? A.tool : B.tool, toolRot: lerp(A.toolRot ?? 0, B.toolRot ?? 0, q)});
/** Arm pose from keyframes [time, pose] (sorted): eases into each pose over `dur` seconds. */
export const armAt = (t: number, keys: Array<[number, Arm]>, dur = 0.3): Arm => {
  let cur = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const q = p(t, keys[i][0], keys[i][0] + dur, Easing.inOut(Easing.cubic));
    if (q <= 0) break;
    cur = armMix(cur, keys[i][1], q);
  }
  return cur;
};
/** Value from keyframes [time, value] with eased transitions (numbers). */
export const keyAt = (t: number, keys: Array<[number, number]>, dur = 0.3): number => {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const q = p(t, keys[i][0], keys[i][0] + dur, Easing.inOut(Easing.cubic));
    if (q <= 0) break;
    v = lerp(v, keys[i][1], q);
  }
  return v;
};
/** Discrete state from keyframes (mood, flags). */
export const stepAt = <T,>(t: number, keys: Array<[number, T]>): T => {
  let v = keys[0][1];
  for (const [at, val] of keys) if (t >= at) v = val;
  return v;
};

/** Pill drawn in SVG (for labels that live in the world and move with the camera). */
export const SvgPill: React.FC<{x: number; y: number; q: number; text: string; bg: string; color?: string; size?: number; rot?: number; upper?: boolean}> = ({x, y, q, text, bg, color = '#fff', size = 40, rot = 0, upper = true}) => {
  if (q <= 0.01) return null;
  const w = text.length * size * (upper ? 0.62 : 0.54) + size * 1.2, h = size * 1.55;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${q})`}>
      <rect x={-w / 2} y={-h / 2 + 8} width={w} height={h} rx={h / 2} fill="#22325A33" />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={bg} />
      <text x={0} y={size * 0.36} textAnchor="middle" fill={color} style={{fontFamily: HEAD, fontWeight: 700, fontSize: size, letterSpacing: 1}}>{text}</text>
    </g>
  );
};

/**
 * Navy stage with a spotlight cone and a glowing floor ellipse (from the prototype's detective scene). Inside an svg.
 * `cx` = cone centre (default frame centre); floor 1400 portrait / 810 landscape; landscape cone ±640 at the floor.
 */
export const SpotStage: React.FC<{t: number; floorY?: number; cx?: number}> = ({t, floorY: floorIn, cx: cxIn}) => {
  const fr = useFrame();
  const floorY = floorIn ?? fr.pick(1400, FLOOR_Y.landscape + 10), cx = cxIn ?? fr.cx;
  const w1 = fr.pick(520, 640), w2 = fr.pick(330, 410);
  return (
  <g>
    <rect x={-1200} y={-1200} width={fr.W + 2400} height={fr.H + 2400} fill={F.navy} />
    <path d={`M ${cx} -40 L ${cx - w1} ${floorY} L ${cx + w1} ${floorY} Z`} fill="#FFF3E214" />
    <path d={`M ${cx} -40 L ${cx - w2} ${floorY} L ${cx + w2} ${floorY} Z`} fill="#FFF3E20F" />
    <ellipse cx={cx} cy={floorY} rx={w1} ry={84} fill="#FFF3E22A" />
    <Confetti t={t} colors={['#ffffff22', '#FFC84533']} />
  </g>
  );
};

// ---------- scene plumbing ----------
/**
 * One camera world with a full-frame svg inside (draw everything in world coordinates; at pose (W/2, H/2, s 1) the
 * world is the frame: 1080×1920 portrait, 1920×1080 landscape).
 */
export const Stage: React.FC<{pose: Pose; off?: {x: number; y: number}; children: React.ReactNode}> = ({pose, off, children}) => {
  const {W, H} = useFrame();
  return (
    <World pose={pose} offset={off}>
      <svg width={W} height={H} style={{position: 'absolute', overflow: 'visible'}}>{children}</svg>
    </World>
  );
};
/**
 * A scene that lives from `from` to `to` (seconds) and opens with an iris wipe centred on (cx, cy). It stays mounted
 * `dur` s past `to` so the NEXT scene's iris opens over it (never over an empty frame). `from <= 0` = first scene, no wipe.
 * Render scenes in time order; later ones paint on top.
 */
export const IrisScene: React.FC<{t: number; from: number; to: number; cx?: number; cy?: number; dur?: number; children: React.ReactNode}> = ({t, from, to, cx, cy, dur = 0.5, children}) => {
  if (t < from || t >= to + dur + 0.02) return null;
  if (from <= 0) return <AbsoluteFill style={{overflow: 'hidden'}}>{children}</AbsoluteFill>;
  return <Iris t={t} at={from} dur={dur} cx={cx} cy={cy}>{children}</Iris>;
};
/**
 * Big title word (HTML, screen space) whose letters drop in one by one with squash-and-stretch. Centred across the
 * frame; give `left` + `width` to centre it in a column instead (landscape two-column layouts).
 */
export const DropWord: React.FC<{t: number; at: number; text: string; size: number; top: number; color: string; stagger?: number; shadow?: string; left?: number; width?: number}> = ({t, at, text, size, top, color, stagger = 0.06, shadow = '0 12px 0 #00000030', left, width}) => (
  <div style={{position: 'absolute', left: left ?? 0, right: width === undefined ? 0 : undefined, width, top, display: 'flex', justifyContent: 'center', fontFamily: HEAD, fontWeight: 700, fontSize: size, lineHeight: 1, color, letterSpacing: size * 0.02}}>
    {text.split('').map((ch, i) => {
      const l = land(t, at + i * stagger, 520);
      return <span key={i} style={{display: 'inline-block', whiteSpace: 'pre', opacity: l.on ? 1 : 0, transform: `translateY(${l.dy}px) scale(${l.sx}, ${l.sy})`, transformOrigin: '50% 100%', textShadow: shadow}}>{ch}</span>;
    })}
  </div>
);
/** White dust puffs from a heavy landing at (x, y), `spread` px to each side. */
export const Puffs: React.FC<{t: number; at: number; x: number; y: number; spread: number}> = ({t, at, x, y, spread}) => {
  const k = p(t, at, at + 0.55);
  if (k <= 0 || k >= 1) return null;
  return (
    <g opacity={1 - k}>
      {[-1, 1].flatMap((sd) => [0, 1, 2].map((i) => <circle key={`${sd}${i}`} cx={x + sd * (spread + k * (60 + i * 40))} cy={y - 10 - i * 14 - k * 20} r={14 + k * 26 - i * 4} fill="#fff" />))}
    </g>
  );
};
/** World point of a shelf-local point (lx right, ly up = negative) on a `Shelf` at (x, y, s) racked by `tilt` degrees — pin medals/tags to it. */
export const shelfPoint = (x: number, y: number, s: number, lx: number, ly: number, tilt = 0) => ({x: x + s * (lx - Math.tan((tilt * Math.PI) / 180) * ly), y: y + s * ly});

// ---------- small props ----------
/** Instruction sheet (stick figure + box pictogram). */
export const Manual: React.FC<{x: number; y: number; rot: number; s?: number}> = ({x, y, rot, s = 1}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <rect x={-70} y={-90} width={140} height={180} rx={10} fill="#22325A22" transform="translate(6 8)" />
    <rect x={-70} y={-90} width={140} height={180} rx={10} fill="#fff" stroke={F.navy} strokeWidth={5} />
    <circle cx={-30} cy={-50} r={12} fill={F.navy} /><path d="M -30 -38 L -30 0 M -30 -20 L -6 -30 M -30 0 L -44 26 M -30 0 L -16 26" stroke={F.navy} strokeWidth={6} strokeLinecap="round" />
    <rect x={2} y={-40} width={44} height={60} rx={4} fill={F.kraft} stroke={F.navy} strokeWidth={4} />
    {[0, 1].map((i) => <line key={i} x1={-46} y1={48 + i * 20} x2={46 - i * 26} y2={48 + i * 20} stroke={F.navy} strokeWidth={5} strokeLinecap="round" opacity={0.5} />)}
  </g>
);
/** Lab flask with liquid and rising bubbles (origin = bottom centre, ~150 px tall at s = 1). */
export const Beaker: React.FC<{x: number; y: number; t: number; s?: number; c?: string}> = ({x, y, t, s = 1, c = F.teal}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M -50 -6 L 50 -6 L 22 -64 L 22 -120 L -22 -120 L -22 -64 Z" fill={c} opacity={0.85} />
    <path d="M -26 -150 L -26 -66 L -74 4 Q -78 12 -68 12 L 68 12 Q 78 12 74 4 L 26 -66 L 26 -150" fill="#ffffff55" stroke={F.navy} strokeWidth={6} strokeLinejoin="round" />
    {[0, 1, 2].map((i) => {
      const k = (t * 0.9 + i * 0.33) % 1;
      return <circle key={i} cx={-8 + i * 9} cy={-40 - k * 120} r={6 + i * 2} fill="#fff" opacity={1 - k} />;
    })}
  </g>
);
/** Adhesive plaster (bandage) icon. */
export const Plaster: React.FC<{x: number; y: number; s?: number; rot?: number}> = ({x, y, s = 1, rot = 0}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <rect x={-80} y={-28} width={160} height={56} rx={28} fill={F.cream} stroke={F.navy} strokeWidth={5} />
    <rect x={-28} y={-24} width={56} height={48} rx={8} fill="#F6D3B4" />
    {[-1, 1].map((sd) => [0, 1].map((i) => <circle key={`${sd}${i}`} cx={sd * 54} cy={-8 + i * 16} r={4} fill={F.coral} opacity={0.6} />))}
  </g>
);
