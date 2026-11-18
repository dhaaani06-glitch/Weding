import React from 'react';
import {staticFile} from 'remotion';
import {CaptionPage} from '../../components/WordCaptions';
import {display, lerp, p, pb, rnd, useFrame} from '../shared';

// MABAR — 2D cartoon "game story" look: blocky avatar characters with swap-faces, thick ink outlines + one flat
// cel-shade tone, bright sky/grass/lava block worlds, and game UI laid over the story (HUD chip, popups, select
// cards, cursor clicks, [SYSTEM] chat lines, achievement toasts). Captions are 1–2 chunky words with heavy outline.
// Everything is flat: no gradients, no glows, no blur. All artwork original (no real game UI, logos or avatars).
// Frame (v1.11): one SVG the size of the composition (portrait 1080×1920 default, landscape 1920×1080 on request).
// Screen-anchored pieces (Chip, SysLine, MabarCaption, ScreenClip, SlamCard, Lava/LabBg extents) read useFrame();
// world pieces (Avatar, Platform, Cloud, panels…) keep the coordinates you give them.

export const MB = {
  ink: '#22183A',
  sky: '#5FC6F2', skyLo: '#86D5F7', cloud: '#FFFFFF', cloudSh: '#C9E9F8',
  grass: '#5CCB4E', grassSh: '#3E9F3A', grassHi: '#8BE06A',
  dirt: '#B8744A', dirtSh: '#8F5636', dirtLine: '#9E6040',
  lava: '#FF5A1F', lavaHi: '#FFB021', lavaSh: '#D9400F',
  panel: '#1E1A33', panelHi: '#2F2852', night: '#2B2257', nightHi: '#342A6B',
  gold: '#FFC93C', goldSh: '#E39A12', red: '#F0373F', redSh: '#B81E2B',
  blue: '#2F6BFF', blueSh: '#1E48C4', green: '#2ECC71', greenSh: '#1E9C55',
  pink: '#FF6FA8', pinkSh: '#D94C86', white: '#FFFFFF', grey: '#C9C4DB', greySh: '#9C95B5',
  skin: '#F7C99C', skinSh: '#DFA472', blush: '#FF8FA3', tongue: '#F2566A', sweat: '#8FDBFF',
  stone: '#F2E5C6', stoneSh: '#D6C095',
};
const K = MB.ink;
export const HEAD = "'Mabar Head', sans-serif";
export const UI = "'Mabar UI', sans-serif";

/** Look fonts (both SIL OFL, already in public/fonts): Baloo 2 ExtraBold for captions/bursts, Nunito Black for UI. */
export const MabarFonts: React.FC = () => (
  <style>{`
    @font-face {font-family:'Mabar Head';src:url('${staticFile('fonts/Baloo2-Var.ttf')}') format('truetype');font-weight:400 800;}
    @font-face {font-family:'Mabar UI';src:url('${staticFile('fonts/Nunito-Var.ttf')}') format('truetype');font-weight:200 1000;}
  `}</style>
);

// ---------- geometry ----------
/** Rounded-rect path with per-corner radii [tl, tr, br, bl]. */
export const rp = (x: number, y: number, w: number, h: number, r: number | [number, number, number, number]) => {
  const [tl, tr, br, bl] = typeof r === 'number' ? [r, r, r, r] : r;
  return `M ${x + tl} ${y} H ${x + w - tr} Q ${x + w} ${y} ${x + w} ${y + tr} V ${y + h - br} Q ${x + w} ${y + h} ${x + w - br} ${y + h} H ${x + bl} Q ${x} ${y + h} ${x} ${y + h - bl} V ${y + tl} Q ${x} ${y} ${x + tl} ${y} Z`;
};

/** Flat block: base colour, one cel-shade tone on the right (or bottom) and an ink outline. */
export const Block: React.FC<{x: number; y: number; w: number; h: number; r?: number; fill: string; shade: string; sw: number; side?: 'r' | 'b'; k?: number; children?: React.ReactNode}> = ({
  x, y, w, h, r = 18, fill, shade, sw, side = 'r', k = 0.76, children,
}) => (
  <g>
    <path d={rp(x, y, w, h, r)} fill={shade} />
    <path d={side === 'r' ? rp(x, y, Math.max(r, w * k), h, [r, 0, 0, r]) : rp(x, y, w, Math.max(r, h * k), [r, r, 0, 0])} fill={fill} />
    {children}
    <path d={rp(x, y, w, h, r)} fill="none" stroke={K} strokeWidth={sw} strokeLinejoin="round" />
  </g>
);

export const star = (cx: number, cy: number, n: number, r1: number, r2: number, rot = 0) => {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? r2 : r1;
    d += `${i ? 'L' : 'M'} ${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)} `;
  }
  return d + 'Z';
};

// ---------- avatar rig ----------
export type Hair = 'bangs' | 'beanie' | 'cap' | 'spiky' | 'laurel' | 'bob' | 'bald' | 'none';
export type Mood = 'happy' | 'grin' | 'smug' | 'shock' | 'sad' | 'angry' | 'star' | 'neutral';
export type Look = {
  skin?: string; skinSh?: string;
  shirt: string; shirtSh: string; pants: string; pantsSh: string; shoe: string;
  hair: Hair; hairCol: string; hairSh: string;
  emblem?: string; emblemCol?: string; stripes?: boolean; mask?: boolean; cape?: string; capeSh?: string;
  sash?: string; crown?: boolean; capCol?: string; silhouette?: boolean;
  /** lab coat / robe: inner V of this colour on the chest */ lapels?: string; bowtie?: string; glasses?: boolean;
  /** monkey: ear colour + lighter face patch */ ears?: string; face?: string;
};

export const blinkAt = (t: number, seed: number) => {
  const per = 2.6 + rnd(seed) * 1.8;
  const k = (t + rnd(seed + 1) * per) % per;
  return k < 0.1 ? Math.max(0.08, Math.abs(k - 0.05) / 0.05) : 1;
};

const Eye: React.FC<{cx: number; cy: number; rx: number; ry: number; pr: number; lx: number; ly: number; bl: number; sw: number}> = ({cx, cy, rx, ry, pr, lx, ly, bl, sw}) =>
  bl < 0.25 ? (
    <path d={`M ${cx - rx} ${cy} Q ${cx} ${cy + 10} ${cx + rx} ${cy}`} stroke={K} strokeWidth={sw * 1.2} fill="none" strokeLinecap="round" />
  ) : (
    <g transform={`translate(${cx} ${cy}) scale(1 ${bl}) translate(${-cx} ${-cy})`}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#fff" stroke={K} strokeWidth={sw} />
      <ellipse cx={cx + lx * rx * 0.38} cy={cy + ly * ry * 0.3} rx={pr} ry={pr * 1.22} fill={K} />
      <circle cx={cx + lx * rx * 0.38 - pr * 0.35} cy={cy + ly * ry * 0.3 - pr * 0.45} r={pr * 0.36} fill="#fff" />
    </g>
  );

const brow = (mood: Mood, side: -1 | 1, raise = 0) => {
  // returns [outer, inner] points relative to head (inner = towards nose)
  const ox = side * 78, ix = side * 26;
  const base = -176 - raise;
  const m: Record<Mood, [number, number]> = {
    happy: [base + 2, base - 6], grin: [base, base - 6], neutral: [base, base], star: [base - 6, base - 10],
    smug: side < 0 ? [base + 8, base + 8] : [base - 14, base - 4], shock: [base - 18, base - 22],
    sad: [base + 8, base - 14], angry: [base - 10, base + 16],
  };
  const [oy, iy] = m[mood];
  return `M ${ox} ${oy} L ${ix} ${iy}`;
};

const Mouth: React.FC<{mood: Mood; sw: number; talk: number}> = ({mood, sw, talk}) => {
  const open = 1 + talk * 0.35;
  if (mood === 'happy' || mood === 'star' || mood === 'grin') {
    const w = mood === 'happy' ? 46 : 56;
    const d = `M ${-w} -82 Q 0 ${-82 + 74 * open} ${w} -82 Z`;
    return (
      <g>
        <path d={d} fill={K} stroke={K} strokeWidth={sw} strokeLinejoin="round" />
        {mood !== 'happy' && <path d={`M ${-w + 10} -80 H ${w - 10} V -68 Q 0 -62 ${-w + 10} -68 Z`} fill="#fff" />}
        <ellipse cx={0} cy={-82 + 28 * open} rx={w * 0.42} ry={9} fill={MB.tongue} />
      </g>
    );
  }
  if (mood === 'shock') return <g><ellipse cx={0} cy={-58} rx={22} ry={26 * open} fill={K} /><ellipse cx={0} cy={-46} rx={12} ry={7} fill={MB.tongue} /></g>;
  if (mood === 'smug') return <path d="M -42 -66 Q 6 -44 48 -82" stroke={K} strokeWidth={sw * 1.5} fill="none" strokeLinecap="round" />;
  if (mood === 'sad') return <path d={`M -34 -46 Q 0 ${-80 - talk * 8} 34 -46`} stroke={K} strokeWidth={sw * 1.5} fill="none" strokeLinecap="round" />;
  if (mood === 'angry') return <g><path d={rp(-44, -84, 88, 34, 12)} fill="#fff" stroke={K} strokeWidth={sw} /><line x1={-44} y1={-67} x2={44} y2={-67} stroke={K} strokeWidth={sw * 0.7} /></g>;
  return <path d="M -26 -62 L 26 -62" stroke={K} strokeWidth={sw * 1.5} strokeLinecap="round" />;
};

const HairShape: React.FC<{look: Look; sw: number; t: number}> = ({look, sw, t}) => {
  const {hair, hairCol: c, hairSh: sh} = look;
  if (hair === 'bangs') {
    const d = 'M -128 -112 V -196 Q -128 -256 -66 -256 H 66 Q 128 -256 128 -196 V -112 L 108 -112 L 106 -150 L 84 -168 L 58 -146 L 30 -170 L 2 -146 L -26 -170 L -54 -146 L -82 -168 L -106 -150 L -108 -112 Z';
    return <g><path d={d} fill={c} stroke={K} strokeWidth={sw} strokeLinejoin="round" /><path d="M 70 -240 Q 112 -236 114 -196" stroke={sh} strokeWidth={sw * 2.2} fill="none" strokeLinecap="round" /><path d="M -84 -226 L -40 -232" stroke="#ffffff66" strokeWidth={sw * 1.4} strokeLinecap="round" /></g>;
  }
  if (hair === 'bob') {
    const d = 'M -134 -40 V -190 Q -134 -258 -64 -258 H 64 Q 134 -258 134 -190 V -40 L 106 -40 L 104 -150 Q 60 -150 30 -176 Q -10 -146 -104 -150 L -106 -40 Z';
    return <path d={d} fill={c} stroke={K} strokeWidth={sw} strokeLinejoin="round" />;
  }
  if (hair === 'spiky') {
    const d = 'M -126 -130 V -200 L -132 -262 L -84 -238 L -56 -288 L -20 -246 L 18 -292 L 46 -246 L 90 -280 L 98 -232 L 138 -240 L 126 -196 V -130 L 104 -130 L 100 -160 L 60 -176 L 10 -158 L -40 -178 L -92 -160 L -104 -130 Z';
    return <g><path d={d} fill={c} stroke={K} strokeWidth={sw} strokeLinejoin="round" /><path d="M 60 -250 L 92 -238" stroke={sh} strokeWidth={sw * 2} strokeLinecap="round" /></g>;
  }
  if (hair === 'cap') {
    const cc = look.capCol ?? MB.blue;
    return (
      <g>
        <path d="M -128 -110 V -150 H 128 V -110 L 108 -110 L 106 -140 L -106 -140 L -108 -110 Z" fill={c} stroke={K} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M -126 -170 V -196 Q -126 -266 0 -266 Q 126 -266 126 -196 V -170 Z" fill={cc} stroke={K} strokeWidth={sw} strokeLinejoin="round" />
        <path d={rp(-150, -184, 300, 34, 17)} fill={cc} stroke={K} strokeWidth={sw} />
        <circle cx={0} cy={-222} r={22} fill="#fff" stroke={K} strokeWidth={sw * 0.8} />
      </g>
    );
  }
  if (hair === 'none') return null;
  if (hair === 'bald') {
    return (
      <g>
        <path d={rp(-132, -186, 34, 76, [14, 0, 0, 14])} fill={c} stroke={K} strokeWidth={sw} />
        <path d={rp(98, -186, 34, 76, [0, 14, 14, 0])} fill={c} stroke={K} strokeWidth={sw} />
        <path d="M -40 -222 Q 0 -232 40 -222" stroke="#ffffff88" strokeWidth={sw * 1.4} fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (hair === 'beanie') {
    return (
      <g>
        <path d="M -126 -150 V -196 Q -126 -270 0 -270 Q 126 -270 126 -196 V -150 Z" fill={c} stroke={K} strokeWidth={sw} strokeLinejoin="round" />
        <path d={rp(-134, -178, 268, 40, 14)} fill={sh} stroke={K} strokeWidth={sw} />
        {[-80, -30, 20, 70].map((x) => <line key={x} x1={x} y1={-172} x2={x + 10} y2={-144} stroke={K} strokeWidth={sw * 0.5} opacity={0.4} />)}
      </g>
    );
  }
  // laurel: curly hair + a green leaf wreath
  const curls = [-100, -60, -20, 20, 60, 100];
  const sway = Math.sin(t * 3) * 2;
  return (
    <g>
      <path d="M -128 -120 V -196 Q -128 -256 -66 -256 H 66 Q 128 -256 128 -196 V -120 L 108 -120 L 104 -170 Q 0 -150 -104 -170 L -108 -120 Z" fill={c} stroke={K} strokeWidth={sw} strokeLinejoin="round" />
      {curls.map((x, i) => <circle key={x} cx={x} cy={-252 + (i % 2) * 8} r={26} fill={c} stroke={K} strokeWidth={sw} />)}
      {Array.from({length: 9}, (_, i) => {
        const a = Math.PI * (0.06 + (i / 8) * 0.88);
        const x = -Math.cos(a) * 138, y = -196 - Math.sin(a) * 34;
        return <ellipse key={i} cx={x} cy={y} rx={30} ry={14} fill={i % 2 ? '#4FAE45' : '#6BC95A'} stroke={K} strokeWidth={sw * 0.8} transform={`rotate(${(i < 4.5 ? -30 : 30) + sway} ${x} ${y})`} />;
      })}
    </g>
  );
};

/** Blocky avatar. Origin = between the feet; ~620 px tall at s=1. Angles in degrees (0 = arm hanging). */
export const Avatar: React.FC<{
  t: number; x: number; y: number; s?: number; look: Look; mood?: Mood; armL?: number; armR?: number;
  legs?: number; lean?: number; sx?: number; sy?: number; seed?: number; lx?: number; ly?: number;
  tag?: string; tagQ?: number; sweat?: boolean; tear?: number; talk?: number; holdR?: React.ReactNode; flip?: boolean; headTilt?: number;
}> = ({t, x, y, s = 1, look, mood = 'neutral', armL = 4, armR = 4, legs = 0, lean = 0, sx = 1, sy = 1, seed = 1, lx = 0, ly = 0, tag, tagQ = 1, sweat, tear = 0, talk = 0, holdR, flip, headTilt = 0}) => {
  const sw = 7 / s;
  const sil = !!look.silhouette;
  const S = (c: string) => (sil ? '#251D4D' : c);
  const skin = S(look.skin ?? MB.skin), skinSh = S(look.skinSh ?? MB.skinSh);
  const breathe = Math.sin(t * 3.1 + seed) * 3;
  const bl = blinkAt(t, seed);
  const arm = (side: -1 | 1, ang: number) => {
    const px = side * 104;
    const ax = side < 0 ? -80 : 0;
    return (
      <g transform={`translate(${px} -362) rotate(${side < 0 ? ang : -ang})`}>
        <path d={rp(ax, -6, 80, 196, 20)} fill={skinSh} />
        <path d={rp(ax, -6, 62, 196, [20, 0, 0, 20])} fill={skin} />
        <path d={rp(ax, -6, 80, 112, [20, 20, 0, 0])} fill={S(look.shirtSh)} />
        <path d={rp(ax, -6, 60, 112, [20, 0, 0, 0])} fill={S(look.shirt)} />
        {look.stripes && !sil && [30, 70].map((yy) => <rect key={yy} x={ax} y={yy} width={80} height={14} fill={K} opacity={0.85} />)}
        <path d={rp(ax, -6, 80, 196, 20)} fill="none" stroke={K} strokeWidth={sw} />
        <line x1={ax} y1={106} x2={ax + 80} y2={106} stroke={K} strokeWidth={sw * 0.8} />
        {side > 0 && holdR && <g transform="translate(40 190)">{holdR}</g>}
      </g>
    );
  };
  const leg = (side: -1 | 1) => (
    <g transform={`rotate(${side * legs} ${side * 48} -176)`}>
      <path d={rp(side < 0 ? -98 : 6, -178, 92, 178, [8, 8, 18, 18])} fill={S(look.pantsSh)} />
      <path d={rp(side < 0 ? -98 : 6, -178, 66, 178, [8, 0, 0, 18])} fill={S(look.pants)} />
      <path d={rp(side < 0 ? -98 : 6, -40, 92, 40, [0, 0, 18, 18])} fill={S(look.shoe)} />
      <path d={rp(side < 0 ? -98 : 6, -178, 92, 178, [8, 8, 18, 18])} fill="none" stroke={K} strokeWidth={sw} />
      <line x1={side < 0 ? -98 : 6} y1={-40} x2={side < 0 ? -6 : 98} y2={-40} stroke={K} strokeWidth={sw * 0.8} />
    </g>
  );
  const capeSway = Math.sin(t * 2.4 + seed) * 10;
  return (
    <g transform={`translate(${x} ${y}) scale(${s * sx * (flip ? -1 : 1)} ${s * sy}) rotate(${lean})`}>
      <ellipse cx={0} cy={2} rx={128} ry={16} fill={K} opacity={0.18} />
      {look.cape && (
        <path d={`M -96 -360 Q -150 -150 ${-150 + capeSway} -40 H ${150 + capeSway} Q 150 -150 96 -360 Z`} fill={S(look.cape)} stroke={K} strokeWidth={sw} strokeLinejoin="round" />
      )}
      {leg(-1)}
      {leg(1)}
      <g transform={`translate(0 ${breathe * 0.4})`}>
        <path d={rp(-104, -374, 208, 202, 22)} fill={S(look.shirtSh)} />
        <path d={rp(-104, -374, 158, 202, [22, 0, 0, 22])} fill={S(look.shirt)} />
        {look.stripes && !sil && [-330, -280, -230].map((yy) => <rect key={yy} x={-104} y={yy} width={208} height={20} fill={K} opacity={0.85} />)}
        {look.sash && !sil && <path d="M -104 -374 L -40 -374 L 104 -230 L 104 -172 Z" fill={look.sash} stroke={K} strokeWidth={sw * 0.8} strokeLinejoin="round" />}
        {look.lapels && !sil && (
          <g>
            <path d="M -40 -374 L 0 -300 L 40 -374 Z" fill={look.lapels} stroke={K} strokeWidth={sw * 0.8} strokeLinejoin="round" />
            <path d="M -40 -374 L 0 -300 L -18 -250 L -60 -374 Z M 40 -374 L 0 -300 L 18 -250 L 60 -374 Z" fill="none" stroke={K} strokeWidth={sw * 0.8} strokeLinejoin="round" />
            <line x1={0} y1={-300} x2={0} y2={-180} stroke={K} strokeWidth={sw * 0.6} opacity={0.5} />
            {[-280, -230].map((yy) => <circle key={yy} cx={-14} cy={yy} r={7} fill={K} opacity={0.6} />)}
          </g>
        )}
        {look.bowtie && !sil && (
          <g transform="translate(0 -362)">
            <path d="M 0 0 L -38 -20 L -38 20 Z M 0 0 L 38 -20 L 38 20 Z" fill={look.bowtie} stroke={K} strokeWidth={sw * 0.8} strokeLinejoin="round" />
            <circle cx={0} cy={0} r={10} fill={look.bowtie} stroke={K} strokeWidth={sw * 0.8} />
          </g>
        )}
        {look.emblem && !sil && (
          <g transform="translate(0 -276)">
            <path d={rp(-44, -40, 88, 80, 16)} fill="#fff" stroke={K} strokeWidth={sw * 0.8} />
            <path d={rp(-44, -40, 88, 24, [16, 16, 0, 0])} fill={look.emblemCol ?? MB.red} stroke={K} strokeWidth={sw * 0.8} />
            <text x={0} y={32} textAnchor="middle" fill={K} style={{fontFamily: HEAD, fontWeight: 800, fontSize: 46}}>{look.emblem}</text>
          </g>
        )}
        <path d={rp(-104, -374, 208, 202, 22)} fill="none" stroke={K} strokeWidth={sw} />
        {arm(-1, armL)}
        {arm(1, armR)}
        <g transform={`translate(0 -362) rotate(${headTilt})`}>
          {look.ears && !sil && [-1, 1].map((sd) => (
            <g key={sd}>
              <circle cx={sd * 128} cy={-120} r={46} fill={look.ears} stroke={K} strokeWidth={sw} />
              <circle cx={sd * 128} cy={-120} r={24} fill={look.face ?? MB.skin} />
            </g>
          ))}
          <path d={rp(-116, -236, 232, 240, 50)} fill={skinSh} />
          <path d={rp(-116, -236, 186, 240, [50, 0, 0, 50])} fill={skin} />
          <path d={rp(-116, -236, 232, 240, 50)} fill="none" stroke={K} strokeWidth={sw} />
          {look.face && !sil && <path d="M -96 -150 Q -60 -196 0 -160 Q 60 -196 96 -150 Q 110 -40 0 -14 Q -110 -40 -96 -150 Z" fill={look.face} stroke={K} strokeWidth={sw * 0.8} />}
          {look.mask && !sil && <path d={rp(-120, -158, 240, 66, 16)} fill="#1A1530" stroke={K} strokeWidth={sw} />}
          {!sil && (
            <g>
              {(mood === 'happy' || mood === 'grin' || mood === 'star') && <g><ellipse cx={-80} cy={-74} rx={20} ry={11} fill={MB.blush} opacity={0.7} /><ellipse cx={80} cy={-74} rx={20} ry={11} fill={MB.blush} opacity={0.7} /></g>}
              {mood === 'star'
                ? [-50, 50].map((ex) => <path key={ex} d={star(ex, -124, 5, 34, 15)} fill={MB.gold} stroke={K} strokeWidth={sw} strokeLinejoin="round" />)
                : [-50, 50].map((ex) => (
                    <Eye key={ex} cx={ex} cy={-124} rx={mood === 'shock' ? 30 : 24} ry={mood === 'shock' ? 34 : 29} pr={mood === 'shock' ? 7 : 12} lx={lx} ly={ly} bl={mood === 'smug' ? Math.min(bl, 1) : bl} sw={sw} />
                  ))}
              {mood === 'smug' && [-50, 50].map((ex) => <path key={ex} d={`M ${ex - 27} -126 Q ${ex} -158 ${ex + 27} -126 Z`} fill={look.mask ? '#1A1530' : skin} stroke={K} strokeWidth={sw} strokeLinejoin="round" />)}
              <path d={brow(mood, -1)} stroke={K} strokeWidth={sw * 1.9} strokeLinecap="round" />
              <path d={brow(mood, 1)} stroke={K} strokeWidth={sw * 1.9} strokeLinecap="round" />
              <Mouth mood={mood} sw={sw} talk={talk} />
              {look.glasses && (
                <g>
                  {[-50, 50].map((ex) => <circle key={ex} cx={ex} cy={-124} r={38} fill="#ffffff33" stroke={K} strokeWidth={sw * 1.1} />)}
                  <line x1={-12} y1={-128} x2={12} y2={-128} stroke={K} strokeWidth={sw * 1.1} />
                  <line x1={-88} y1={-130} x2={-116} y2={-138} stroke={K} strokeWidth={sw} />
                  <line x1={88} y1={-130} x2={116} y2={-138} stroke={K} strokeWidth={sw} />
                </g>
              )}
              {sweat && <path d="M 112 -196 Q 92 -160 112 -148 Q 132 -160 112 -196 Z" fill={MB.sweat} stroke={K} strokeWidth={sw * 0.8} />}
              {tear > 0 && <path d={`M -62 ${-96 + tear * 40} q -12 20 0 26 q 12 -6 0 -26 Z`} fill={MB.sweat} stroke={K} strokeWidth={sw * 0.7} />}
            </g>
          )}
          {sil ? (
            <g>
              <path d="M -128 -120 V -196 Q -128 -256 -66 -256 H 66 Q 128 -256 128 -196 V -120 Z" fill="#251D4D" stroke={K} strokeWidth={sw} />
              <text x={0} y={-50} textAnchor="middle" fill="#fff" style={{fontFamily: HEAD, fontWeight: 800, fontSize: 190}}>?</text>
            </g>
          ) : (
            <HairShape look={look} sw={sw} t={t} />
          )}
          {look.crown && !sil && (
            <g transform="translate(0 -270)">
              <path d="M -76 0 L -84 -78 L -40 -40 L 0 -96 L 40 -40 L 84 -78 L 76 0 Z" fill={MB.gold} stroke={K} strokeWidth={sw} strokeLinejoin="round" />
              <circle cx={0} cy={-26} r={12} fill={MB.red} stroke={K} strokeWidth={sw * 0.7} />
            </g>
          )}
        </g>
      </g>
      {tag && tagQ > 0.01 && (
        <g transform={`translate(0 ${-690 - (look.crown ? 90 : 0)}) scale(${(1 / s) * lerp(0.6, 1, tagQ)})`} opacity={Math.min(1, tagQ * 2)}>
          <text x={0} y={0} textAnchor="middle" fill="#fff" stroke={K} strokeWidth={10} paintOrder="stroke" strokeLinejoin="round" style={{fontFamily: UI, fontWeight: 900, fontSize: 40}}>{tag}</text>
        </g>
      )}
    </g>
  );
};

// ---------- world pieces ----------
/** Blocky cloud (no outline, flat shade underneath). */
export const Cloud: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d={rp(-170, -30, 340, 80, 30)} fill={MB.cloudSh} transform="translate(0 14)" />
    <path d={rp(-100, -110, 190, 100, 34)} fill={MB.cloud} />
    <path d={rp(-30, -150, 100, 70, 28)} fill={MB.cloud} />
    <path d={rp(-170, -40, 340, 80, 30)} fill={MB.cloud} />
  </g>
);

/** Floating grass-topped dirt block. (x, y) = top-left. */
export const Platform: React.FC<{x: number; y: number; w: number; h: number; sw?: number; seed?: number}> = ({x, y, w, h, sw = 7, seed = 3}) => {
  const rows = Math.max(1, Math.floor((h - 50) / 70));
  return (
    <g>
      <path d={rp(x, y + 30, w, h - 30, [0, 0, 22, 22])} fill={MB.dirt} />
      <path d={rp(x + w * 0.8, y + 30, w * 0.2, h - 30, [0, 0, 22, 0])} fill={MB.dirtSh} />
      {Array.from({length: rows}, (_, r) => {
        const yy = y + 60 + r * 70;
        return (
          <g key={r}>
            <line x1={x} y1={yy + 46} x2={x + w} y2={yy + 46} stroke={MB.dirtSh} strokeWidth={6} />
            {Array.from({length: Math.ceil(w / 120)}, (_, c) => {
              const xx = x + ((c * 120 + (r % 2) * 60 + rnd(seed + r * 7 + c) * 30) % w);
              return <rect key={c} x={xx} y={yy + 4} width={34} height={22} rx={6} fill={MB.dirtLine} />;
            })}
          </g>
        );
      })}
      <path d={rp(x - 6, y, w + 12, 48, [16, 16, 8, 8])} fill={MB.grassSh} />
      <path d={rp(x - 6, y, (w + 12) * 0.82, 40, [16, 0, 0, 8])} fill={MB.grass} />
      {Array.from({length: Math.floor(w / 70)}, (_, i) => {
        const xx = x + 20 + i * 70 + rnd(seed + i) * 20;
        const hh = 16 + rnd(seed + i * 3) * 26;
        return <path key={i} d={rp(xx, y + 40, 26, hh, [0, 0, 13, 13])} fill={MB.grassSh} stroke={K} strokeWidth={sw * 0.7} />;
      })}
      <path d={rp(x - 6, y, w + 12, 48, [16, 16, 8, 8])} fill="none" stroke={K} strokeWidth={sw} />
      <path d={rp(x, y + 44, w, h - 44, [0, 0, 22, 22])} fill="none" stroke={K} strokeWidth={sw} />
      <line x1={x + 14} y1={y + 12} x2={x + w * 0.35} y2={y + 12} stroke={MB.grassHi} strokeWidth={8} strokeLinecap="round" />
    </g>
  );
};

/** Lava sea from y down, with a slow flat wave band and bubbles. Default extent: 600 px past the frame on each side. */
export const Lava: React.FC<{t: number; y: number; x0?: number; x1?: number}> = ({t, y, x0 = -600, x1: x1p}) => {
  const {W} = useFrame();
  const x1 = x1p ?? W + 620;
  let wave = `M ${x0} ${y + 40}`;
  for (let x = x0; x <= x1; x += 40) wave += ` L ${x} ${(y + Math.sin(x / 90 + t * 1.6) * 10).toFixed(1)}`;
  wave += ` L ${x1} ${y + 40} Z`;
  return (
    <g>
      <rect x={x0} y={y} width={x1 - x0} height={2400} fill={MB.lava} />
      <path d={wave} fill={MB.lavaHi} />
      <rect x={x0} y={y + 34} width={x1 - x0} height={20} fill={MB.lavaSh} opacity={0.5} />
      {Array.from({length: 7}, (_, i) => {
        const per = 1.6 + rnd(i) * 0.9;
        const k = ((t + rnd(i + 9) * per) % per) / per;
        const bx = x0 + 200 + rnd(i * 5) * (x1 - x0 - 400);
        const r = 6 + Math.sin(k * Math.PI) * 18;
        return <circle key={i} cx={bx} cy={y + 90 + rnd(i * 3) * 260} r={r} fill={MB.lavaHi} opacity={0.9} />;
      })}
    </g>
  );
};

/** 2.5D "day" cube with a big number. Centre at (x, y). */
export const DayCube: React.FC<{x: number; y: number; s?: number; label: string; col?: string; sh?: string; rot?: number}> = ({x, y, s = 1, label, col = MB.pink, sh = MB.pinkSh, rot = 0}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <path d="M -70 -70 L -40 -100 L 100 -100 L 70 -70 Z" fill="#fff" stroke={K} strokeWidth={7} strokeLinejoin="round" />
    <path d="M 70 -70 L 100 -100 L 100 40 L 70 70 Z" fill={sh} stroke={K} strokeWidth={7} strokeLinejoin="round" />
    <path d={rp(-70, -70, 140, 140, 10)} fill={col} stroke={K} strokeWidth={7} />
    <text x={0} y={30} textAnchor="middle" fill="#fff" stroke={K} strokeWidth={10} paintOrder="stroke" strokeLinejoin="round" style={{fontFamily: HEAD, fontWeight: 800, fontSize: 92}}>{label}</text>
  </g>
);

/** Flat radial rays (alternating wedges). */
export const Rays: React.FC<{cx: number; cy: number; r?: number; n?: number; rot?: number; col?: string; op?: number}> = ({cx, cy, r = 1400, n = 14, rot = 0, col = '#fff', op = 0.25}) => {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a0 = rot + (i / n) * Math.PI * 2, a1 = a0 + Math.PI / n;
    d += `M ${cx} ${cy} L ${cx + Math.cos(a0) * r} ${cy + Math.sin(a0) * r} L ${cx + Math.cos(a1) * r} ${cy + Math.sin(a1) * r} Z `;
  }
  return <path d={d} fill={col} opacity={op} />;
};

/** Comic burst word (pops with overshoot at `at`, gone after `out`). */
export const Burst: React.FC<{t: number; at: number; out: number; x: number; y: number; text: string; s?: number; rot?: number; fill?: string; back?: string}> = ({
  t, at, out, x, y, text, s = 1, rot = -8, fill = MB.gold, back = '#fff',
}) => {
  if (t < at || t > out + 0.2) return null;
  const q = pb(t, at, at + 0.22);
  const o = 1 - p(t, out, out + 0.18);
  const wob = Math.sin((t - at) * 7) * 2;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot + wob}) scale(${s * q * lerp(0.6, 1, o)})`} opacity={o}>
      <path d={star(0, 0, 12, 250, 170, (t - at) * 0.15)} fill={back} stroke={K} strokeWidth={9} strokeLinejoin="round" />
      <text x={8} y={50} textAnchor="middle" fill={MB.red} stroke={K} strokeWidth={14} paintOrder="stroke" strokeLinejoin="round" style={{fontFamily: HEAD, fontWeight: 800, fontSize: 150}}>{text}</text>
      <text x={0} y={40} textAnchor="middle" fill={fill} stroke={K} strokeWidth={14} paintOrder="stroke" strokeLinejoin="round" style={{fontFamily: HEAD, fontWeight: 800, fontSize: 150}}>{text}</text>
    </g>
  );
};

/** 4-point sparkle that pops and shrinks. */
export const Sparkle: React.FC<{t: number; at: number; x: number; y: number; r?: number; col?: string}> = ({t, at, x, y, r = 34, col = '#fff'}) => {
  const k = t - at;
  if (k < 0 || k > 0.7) return null;
  const q = Math.sin((k / 0.7) * Math.PI);
  return <path d={star(x, y, 4, r * q, r * q * 0.3, k)} fill={col} stroke={K} strokeWidth={5} strokeLinejoin="round" />;
};

/** Confetti burst from (x, y) at time `at` (deterministic flat paper bits). */
export const Confetti: React.FC<{t: number; at: number; x: number; y: number; n?: number; spread?: number; seed?: number}> = ({t, at, x, y, n = 26, spread = 900, seed = 1}) => {
  const k = t - at;
  if (k < 0 || k > 2.6) return null;
  const cols = [MB.gold, MB.pink, MB.green, MB.blue, MB.red, '#fff'];
  return (
    <g>
      {Array.from({length: n}, (_, i) => {
        const a = -Math.PI / 2 + (rnd(seed + i) - 0.5) * 2.4;
        const v = spread * (0.6 + rnd(seed + i * 3) * 0.6);
        const px = x + Math.cos(a) * v * k * 0.9;
        const py = y + Math.sin(a) * v * k + 1100 * k * k;
        const rot = (rnd(seed + i * 7) - 0.5) * 720 * k;
        const o = 1 - p(t, at + 1.8, at + 2.6);
        return <rect key={i} x={px - 10} y={py - 16} width={20} height={32} rx={4} fill={cols[i % cols.length]} stroke={K} strokeWidth={4} transform={`rotate(${rot} ${px} ${py})`} opacity={o} />;
      })}
    </g>
  );
};

/** Cloud puff (spawn / transform). Covers ~r around (x, y) between at and at+dur. */
export const Puff: React.FC<{t: number; at: number; x: number; y: number; r?: number; dur?: number; seed?: number}> = ({t, at, x, y, r = 260, dur = 0.7, seed = 5}) => {
  const k = (t - at) / dur;
  if (k < 0 || k > 1) return null;
  const grow = p(k, 0, 0.35);
  const fade = 1 - p(k, 0.45, 1);
  return (
    <g>
      {Array.from({length: 11}, (_, i) => {
        const a = (i / 11) * Math.PI * 2 + rnd(seed + i);
        const d = r * (0.25 + 0.75 * grow) * (0.55 + rnd(seed + i * 2) * 0.4);
        const cr = r * 0.42 * (0.7 + rnd(seed + i * 3) * 0.5) * (0.3 + 0.7 * grow) * fade;
        return (
          <g key={i}>
            <circle cx={x + Math.cos(a) * d} cy={y + Math.sin(a) * d + cr * 0.18} r={cr} fill={MB.cloudSh} />
            <circle cx={x + Math.cos(a) * d} cy={y + Math.sin(a) * d} r={cr} fill="#fff" stroke={K} strokeWidth={6} />
          </g>
        );
      })}
      <circle cx={x} cy={y} r={r * 0.62 * grow * fade} fill="#fff" />
    </g>
  );
};

// ---------- UI ----------
type Icon = 'clock' | 'cal' | 'search' | 'book' | 'star' | 'bolt' | 'pause' | 'peck';
export const IconG: React.FC<{k: Icon; c: string}> = ({k, c}) => {
  if (k === 'clock') return <g><circle cx={0} cy={0} r={20} fill="none" stroke={c} strokeWidth={6} /><path d="M 0 -10 V 0 L 8 6" stroke={c} strokeWidth={6} fill="none" strokeLinecap="round" /><rect x={-6} y={-32} width={12} height={8} rx={2} fill={c} /></g>;
  if (k === 'cal') return <g><path d={rp(-22, -18, 44, 40, 7)} fill="none" stroke={c} strokeWidth={6} /><line x1={-22} y1={-5} x2={22} y2={-5} stroke={c} strokeWidth={6} /><line x1={-10} y1={-26} x2={-10} y2={-14} stroke={c} strokeWidth={6} strokeLinecap="round" /><line x1={10} y1={-26} x2={10} y2={-14} stroke={c} strokeWidth={6} strokeLinecap="round" /></g>;
  if (k === 'star') return <path d={star(0, 2, 5, 24, 11)} fill={c} />;
  if (k === 'bolt') return <path d="M 6 -26 L -14 4 L 0 4 L -6 26 L 14 -6 L 0 -6 Z" fill={c} />;
  if (k === 'pause') return <g><rect x={-16} y={-20} width={11} height={40} rx={3} fill={c} /><rect x={5} y={-20} width={11} height={40} rx={3} fill={c} /></g>;
  if (k === 'peck') return <g><path d="M -20 -6 L 14 -6 L 24 2 L 14 10 L -20 10 Z" fill={c} /><circle cx={-6} cy={22} r={5} fill={c} /><circle cx={8} cy={24} r={5} fill={c} /></g>;
  if (k === 'search') return <g><circle cx={-4} cy={-4} r={15} fill="none" stroke={c} strokeWidth={6} /><line x1={7} y1={7} x2={20} y2={20} stroke={c} strokeWidth={7} strokeLinecap="round" /></g>;
  return <g><path d="M -22 -18 Q -11 -24 0 -16 Q 11 -24 22 -18 V 20 Q 11 14 0 22 Q -11 14 -22 20 Z" fill="none" stroke={c} strokeWidth={6} strokeLinejoin="round" /><line x1={0} y1={-16} x2={0} y2={22} stroke={c} strokeWidth={5} /></g>;
};

/** Top HUD chip (dark pill + icon + text). `hot` 0..1 tints it red; `pop` 0..1 bounces it on a change.
 *  Default: top centre (y 160 portrait, 110 landscape = inside the 64-px top safe margin). */
export const Chip: React.FC<{x?: number; y?: number; icon: Icon; text: string; hot?: number; pop?: number; q?: number}> = ({x: xp, y: yp, icon, text, hot = 0, pop = 0, q = 1}) => {
  const fr = useFrame();
  const x = xp ?? fr.cx, y = yp ?? fr.pick(160, 110);
  const w = 112 + text.length * 30.5;
  const sc = q * (1 + Math.sin(Math.min(1, pop) * Math.PI) * 0.16);
  return (
    <g transform={`translate(${x} ${y}) scale(${sc})`} opacity={Math.min(1, q * 2)}>
      <path d={rp(-w / 2, -40, w, 80, 40)} fill={hot > 0.5 ? MB.red : MB.panel} stroke="#fff" strokeWidth={6} />
      <path d={rp(-w / 2 - 6, -46, w + 12, 92, 46)} fill="none" stroke={K} strokeWidth={4} />
      <g transform={`translate(${-w / 2 + 50} 2)`}><IconG k={icon} c="#fff" /></g>
      <text x={-w / 2 + 88} y={16} fill="#fff" style={{fontFamily: UI, fontWeight: 900, fontSize: 44, letterSpacing: 1}}>{text}</text>
    </g>
  );
};

/** "[SYSTEM] …" chat line. Default under the chip, left: (70, 278) portrait, (110, 214) landscape. */
export const SysLine: React.FC<{t: number; at: number; out: number; text: string; x?: number; y?: number}> = ({t, at, out, text, x: xp, y: yp}) => {
  const fr = useFrame();
  const x = xp ?? fr.pick(70, fr.safe.side), y = yp ?? fr.pick(278, 214);
  if (t < at || t > out + 0.3) return null;
  const q = p(t, at, at + 0.25);
  const o = 1 - p(t, out, out + 0.3);
  const shown = Math.floor(text.length * p(t, at, at + 0.45));
  const st = {fontFamily: UI, fontWeight: 900, fontSize: 36} as const;
  return (
    <g transform={`translate(${x + (1 - q) * -40} ${y})`} opacity={q * o}>
      <text x={0} y={0} fill={MB.gold} stroke={K} strokeWidth={9} paintOrder="stroke" strokeLinejoin="round" style={st}>
        [SYSTEM] <tspan fill="#fff">{text.slice(0, shown)}</tspan>
      </text>
    </g>
  );
};

/** Mouse cursor (tip at 0,0); press 0..1 squashes it and shows a click ring. */
export const Cursor: React.FC<{x: number; y: number; press?: number; ring?: number; s?: number}> = ({x, y, press = 0, ring = 0, s = 1.25}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {ring > 0 && ring < 1 && <circle cx={0} cy={0} r={20 + ring * 70} fill="none" stroke="#fff" strokeWidth={8 * (1 - ring)} />}
    <g transform={`scale(${1 - press * 0.15})`}>
      <path d="M 0 0 L 0 76 L 20 58 L 34 90 L 48 84 L 34 52 L 60 52 Z" fill="#fff" stroke={K} strokeWidth={7} strokeLinejoin="round" />
    </g>
  </g>
);

// ---------- captions ----------
export type Hot = Record<string, string>;
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');

/** 1–2 chunky words, heavy ink outline + solid drop, keywords coloured; each page pops in. Centred on `x` (default the
 *  frame centre), shrunk to fit `maxW` (default 940 portrait / 1400 landscape; give a column width when it sits in one). */
export const MabarCaption: React.FC<{t: number; pages: CaptionPage[]; y: number; hot: Hot; size?: number; x?: number; maxW?: number}> = ({t, pages, y, hot, size = 118, x: xp, maxW: mw}) => {
  const fr = useFrame();
  const x = xp ?? fr.cx, maxW = mw ?? fr.captionW;
  const pg = pages.find((g) => t >= g.start - 0.06 && t < g.end);
  if (!pg) return null;
  const q = pb(t, pg.start - 0.06, pg.start + 0.12);
  const text = pg.words.map((w) => display(w.word)).join(' ');
  const col = pg.words.map((w) => hot[norm(w.word)]).find(Boolean) ?? '#fff';
  const allHot = pg.words.length === 1 && col !== '#fff';
  const est = text.length * size * 0.56;
  const fs = est > maxW ? (size * maxW) / est : size;
  const words = pg.words.map((w) => ({w: display(w.word), c: hot[norm(w.word)] ?? '#fff'}));
  const st = {fontFamily: HEAD, fontWeight: 800, fontSize: fs * (allHot ? 1.08 : 1), letterSpacing: 0} as const;
  return (
    <g transform={`translate(${x} ${y}) scale(${lerp(0.72, 1, q)}) rotate(${(1 - q) * -4})`} opacity={Math.min(1, q * 3)}>
      <text x={0} y={12} textAnchor="middle" fill={K} stroke={K} strokeWidth={fs * 0.2} strokeLinejoin="round" style={st}>{text}</text>
      <text x={0} y={0} textAnchor="middle" stroke={K} strokeWidth={fs * 0.2} paintOrder="stroke" strokeLinejoin="round" style={st}>
        {words.map((w, i) => <tspan key={i} fill={w.c}>{(i ? ' ' : '') + w.w}</tspan>)}
      </text>
    </g>
  );
};

// ---------- screen ----------
/** clipPath of the whole screen (the composition W×H). Put it in <defs> once and wrap every scene INSIDE its moving
 *  whip/drop <g> with clipPath={`url(#${id})`}, or a later scene's huge sky rect covers the earlier one. */
export const ScreenClip: React.FC<{id?: string}> = ({id = 'mb-screen'}) => {
  const {W, H} = useFrame();
  return <clipPath id={id}><rect x={0} y={0} width={W} height={H} /></clipPath>;
};
/** scene-change travel: whip = translateX ±(W + 100) (1180 portrait, 2020 landscape); drop = translateY −(H + 40). */
export const whipDist = (W: number) => W + 100;
export const dropDist = (H: number) => H + 40;
