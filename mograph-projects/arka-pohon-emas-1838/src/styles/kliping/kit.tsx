import React from 'react';
import {CaptionPage} from '../../components/WordCaptions';
import {display, drawOn, lerp, noise, p, pageAt, rnd, useFrame} from '../shared';

// KLIPING style kit — mixed-media zine collage gone punk: torn paper scraps (white fibre edge), ransom-note
// letters cut from different "magazines", halftone cut-outs, tape, rubber stamps, marker scribbles.
// Graphics move in STOP-MOTION: build `h = makeHold(frame, fps)` once per frame and pass it to every piece (12 fps held
// clock `h.tq` + per-hold jitter); give `camera()`/`shake()` `h.tq` too. Captions use the exact `t` (never `h.tq`).
// Chapters are torn `Sheet`s slapped over the desk; pieces glued on a sheet use `at={glued(landing)}` so they travel with it.
// Self-contained: depends only on react, ../shared and the CaptionPage type.
// Frame (v1.11): `Sheet`, `Ink` and `Caption` size themselves from useFrame() (1080×1920 portrait, 1920×1080
// landscape); a landscape whip-pan moves x by W + 120 = 2040 per panel (portrait 1200), `World w` / `Ink w` = n·2040.

export const KLIPING = {
  kraft: '#C8A27C', paper: '#FBF8F1', ink: '#151515', pink: '#FF7EB6', cobalt: '#2F4BFF', mustard: '#F2B705', mint: '#5ED6A6', red: '#F0442E',
  // newsprint neutrals (the "plain" clipping, phone screen)
  news: '#E4DED2', grey: '#B9B3A8', greyInk: '#7D776E',
};
export const Q = KLIPING;
export const FAT = "'Klip Fat', serif";
export const BLOCK = "'Klip Block', sans-serif";
export const HAND = "'Klip Hand', cursive";
export const TYPE = "'Arsip Type', monospace";
export const GEO = "'Geo Head', sans-serif";
export const GRAIN = noise(0.55, 4, 11, 420);
/** Speckled alpha mask so stamps and markers look inked, not vector-flat. */
const inkMask = (() => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='2' seed='4' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -4.2 3.35'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
})();

// ---------- stop-motion clock ----------
export type Hold = {
  t: number; tq: number; n: number;
  jig: (id: number, amt?: number) => {x: number; y: number; r: number};
};
/** 12 fps held clock from the frame number (exact hold boundaries: 5 frames per hold at 60 fps). */
export const makeHold = (frame: number, fps: number): Hold => {
  const n = Math.floor((frame * 12) / fps + 1e-9);
  const t = frame / fps;
  return {
    t, tq: n / 12, n,
    jig: (id, amt = 1) => ({x: (rnd(n * 1.7 + id) - 0.5) * 3 * amt, y: (rnd(n * 2.3 + id * 1.3) - 0.5) * 3 * amt, r: (rnd(n * 3.1 + id * 0.7) - 0.5) * 0.8 * amt}),
  };
};
/** Cue time for pieces glued onto a chapter `Sheet` before it slides in (visible during the slide, slap already settled). */
export const glued = (landing: number) => landing - 0.5;
/** Seconds since a cue on the held clock, rounded to the nearest hold so a beat never lands late. */
export const since = (h: Hold, at: number) => h.tq - at + 1 / 24;
export const on = (h: Hold, at: number) => since(h, at) >= 0;
/** Eased 0→1 progress sampled on the held clock (stop-motion move). */
export const hp = (h: Hold, a: number, b: number) => p(h.tq + 1 / 24, a, b);
/** Slap-down scale for the first two holds after landing. */
export const slap = (h: Hold, at: number, big = 1.18) => {
  const k = since(h, at);
  return k < 1 / 12 ? big : k < 2 / 12 ? 0.96 : 1;
};

/** Jagged rectangle path (0,0)-(w,h). */
export const torn = (w: number, h: number, seed: number, jag = 9, step = 16) => {
  const pts: string[] = [];
  const edge = (x0: number, y0: number, x1: number, y1: number, k: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / step));
    const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    for (let i = 0; i < n; i++) {
      const q = i / n, j = (rnd(seed + k * 97 + i * 3.7) - 0.5) * jag;
      pts.push(`${(x0 + (x1 - x0) * q + nx * j).toFixed(1)} ${(y0 + (y1 - y0) * q + ny * j).toFixed(1)}`);
    }
  };
  edge(0, 0, w, 0, 1); edge(w, 0, w, h, 2); edge(w, h, 0, h, 3); edge(0, h, 0, 0, 4);
  return `M ${pts.join(' L ')} Z`;
};

const hid = (seed: number, color: string) => `kht${String(seed).replace('.', '_')}${color.replace(/[^a-zA-Z0-9]/g, '')}`;
/** Halftone dot pattern def (put inside an <svg><defs>). */
export const Dots: React.FC<{id: string; color: string; size?: number; r?: number; angle?: number}> = ({id, color, size = 14, r = 4.2, angle = 30}) => (
  <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse" patternTransform={`rotate(${angle})`}><circle cx={size / 2} cy={size / 2} r={r} fill={color} /></pattern>
);

// ---------- removal: a piece torn off the page in two holds ----------
export const Off: React.FC<{h: Hold; out?: number; dx?: number; dy?: number; r?: number; z?: number; children: React.ReactNode}> = ({h, out, dx = 0, dy = -1400, r = -20, z, children}) => {
  if (out === undefined) return <>{children}</>;
  const k = since(h, out);
  if (k >= 3 / 12) return null;
  const q = k < 0 ? 0 : k < 1 / 12 ? 0.18 : k < 2 / 12 ? 0.55 : 1;
  return <div style={{position: 'absolute', left: 0, top: 0, zIndex: z, transform: `translate(${dx * q}px, ${dy * q}px) rotate(${r * q}deg)`}}>{children}</div>;
};

// ---------- paper pieces ----------
/** A torn paper scrap: white fibre core under a coloured sheet, optional halftone, slapped on at `at`. */
export const Scrap: React.FC<{
  h: Hold; at: number; x: number; y: number; w: number; hgt: number; color: string; rot?: number; seed: number;
  halftone?: string; out?: number; children?: React.ReactNode; z?: number; jag?: number; style?: React.CSSProperties;
}> = ({h, at, x, y, w, hgt, color, rot = 0, seed, halftone, out, children, z = 1, jag = 9, style}) => {
  if (!on(h, at)) return null;
  if (out !== undefined && on(h, out)) return null;
  const s = slap(h, at);
  const j = h.jig(seed);
  const id = hid(seed, halftone ?? '');
  return (
    <div style={{position: 'absolute', left: x + j.x, top: y + j.y, width: w, height: hgt, transform: `rotate(${rot + j.r}deg) scale(${s})`, zIndex: z, filter: 'drop-shadow(4px 7px 0 rgba(0,0,0,0.22))', ...style}}>
      <svg width={w + 20} height={hgt + 20} style={{position: 'absolute', left: -10, top: -10, overflow: 'visible'}}>
        {halftone && <defs><Dots id={id} color={halftone} /></defs>}
        <path d={torn(w + 12, hgt + 12, seed + 5, jag + 1)} fill={Q.paper} transform="translate(4 4)" />
        <path d={torn(w, hgt, seed, jag)} fill={color} transform="translate(10 10)" />
        {halftone && <path d={torn(w, hgt, seed, jag)} fill={`url(#${id})`} transform="translate(10 10)" opacity={0.5} />}
      </svg>
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{children}</div>
    </div>
  );
};

export const Tape: React.FC<{h: Hold; at: number; x: number; y: number; w?: number; rot?: number; seed: number; out?: number}> = ({h, at, x, y, w = 170, rot = -12, seed, out}) => {
  if (!on(h, at)) return null;
  if (out !== undefined && on(h, out)) return null;
  const j = h.jig(seed + 50, 0.6);
  return (
    <svg width={w + 10} height={60} style={{position: 'absolute', left: x + j.x, top: y + j.y, transform: `rotate(${rot}deg)`, zIndex: 20, overflow: 'visible'}}>
      <path d={torn(w, 46, seed, 6, 10)} fill="rgba(255,250,225,0.74)" />
      <path d={torn(w, 46, seed, 6, 10)} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={2} />
    </svg>
  );
};

const FONTS = [FAT, BLOCK, GEO, TYPE, FAT, BLOCK];
const PAL = [[Q.paper, Q.ink], [Q.ink, Q.paper], [Q.mustard, Q.ink], [Q.pink, Q.ink], [Q.cobalt, Q.paper], [Q.red, Q.paper], [Q.mint, Q.ink]];
/** Ransom-note word: every letter cut from a different "magazine"; letters land one by one on the held clock. */
export const Ransom: React.FC<{h: Hold; at: number; text: string; size: number; x: number; y: number; seed: number; per?: number; rot?: number; out?: number; z?: number; avoid?: string}> = ({
  h, at, text, size, x, y, seed, per = 1 / 24, rot = 0, out, z = 10, avoid,
}) => {
  if (out !== undefined && on(h, out)) return null;
  return (
    <div style={{position: 'absolute', left: x, top: y, display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: size * 0.05, transform: `rotate(${rot}deg)`, zIndex: z}}>
      {[...text].map((ch, i) => {
        if (ch === ' ') return <div key={i} style={{width: size * 0.32}} />;
        if (!on(h, at + i * per)) return <div key={i} style={{width: size * 0.62, height: size}} />;
        const r = (s: number) => rnd(seed * 13 + i * 7.1 + s);
        let [bg, fg] = PAL[Math.floor(r(1) * PAL.length)];
        if (avoid && bg === avoid) [bg, fg] = PAL[(Math.floor(r(1) * PAL.length) + 1) % PAL.length];
        const j = h.jig(seed * 31 + i, 0.5);
        const pop = slap(h, at + i * per, 1.25);
        return (
          <div key={i} style={{background: bg, color: fg, fontFamily: FONTS[Math.floor(r(2) * FONTS.length)], fontWeight: 900, fontSize: size * (0.82 + r(3) * 0.36), lineHeight: 1,
            padding: `${size * 0.06}px ${size * 0.1}px ${size * 0.02}px`, transform: `rotate(${(r(4) - 0.5) * 14 + j.r * 3}deg) translateY(${(r(5) - 0.5) * size * 0.16}px) scale(${pop})`,
            boxShadow: '3px 5px 0 rgba(0,0,0,0.25)', textTransform: r(6) > 0.5 ? 'uppercase' : 'none'}}>{ch}</div>
        );
      })}
    </div>
  );
};

/** Hand-written marker note (Kalam), appears on its cue. */
export const Note: React.FC<{h: Hold; at: number; x: number; y: number; text: React.ReactNode; size?: number; color?: string; rot?: number; out?: number; shadow?: string; z?: number}> = ({
  h, at, x, y, text, size = 64, color = Q.ink, rot = -3, out, shadow, z = 12,
}) => {
  if (!on(h, at) || (out !== undefined && on(h, out))) return null;
  const j = h.jig(x + y, 0.5);
  return <div style={{position: 'absolute', left: x + j.x, top: y + j.y, fontFamily: HAND, fontWeight: 700, fontSize: size, lineHeight: 1.05, color, transform: `rotate(${rot}deg)`, zIndex: z, whiteSpace: 'nowrap', textShadow: shadow}}>{text}</div>;
};

/** Marker scribble drawn on in stop-motion steps (use inside an <Ink> layer). */
export const Marker: React.FC<{h: Hold; at: number; d: string; color?: string; width?: number; dur?: number; out?: number}> = ({h, at, d, color = Q.red, width = 12, dur = 0.4, out}) => {
  if (out !== undefined && on(h, out)) return null;
  return <path d={d} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" {...drawOn(Math.min(1, Math.max(0, since(h, at) / dur)))} />;
};
/** Full-size SVG layer for marker strokes (default = the frame, W×H; `w` for wide worlds). */
export const Ink: React.FC<{children: React.ReactNode; w?: number; hgt?: number; z?: number}> = ({children, w, hgt, z = 30}) => {
  const fr = useFrame();
  return <svg width={w ?? fr.W} height={hgt ?? fr.H} style={{position: 'absolute', left: 0, top: 0, zIndex: z, overflow: 'visible', pointerEvents: 'none'}}>{children}</svg>;
};
/** Arrow head path at (x,y) pointing along angle (deg). */
export const arrowHead = (x: number, y: number, ang: number, len = 34) => {
  const a = (ang * Math.PI) / 180, s = 0.55;
  const p1 = [x - Math.cos(a - s) * len, y - Math.sin(a - s) * len], p2 = [x - Math.cos(a + s) * len, y - Math.sin(a + s) * len];
  return ` M ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} L ${x} ${y} L ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
};

/** Rubber stamp impression: double border, speckled ink, slammed down on its cue. Centred on (x, y). */
export const Stamp: React.FC<{h: Hold; at: number; x: number; y: number; text: string; color?: string; size?: number; rot?: number; out?: number; z?: number; blend?: boolean; round?: boolean}> = ({
  h, at, x, y, text, color = Q.red, size = 80, rot = -12, out, z = 25, blend = true, round = false,
}) => {
  if (!on(h, at) || (out !== undefined && on(h, out))) return null;
  const s = slap(h, at, 1.32);
  const j = h.jig(x * 0.3 + y, 0.4);
  return (
    <div style={{position: 'absolute', left: x + j.x, top: y + j.y, zIndex: z, transform: `translate(-50%, -50%) rotate(${rot + j.r}deg) scale(${s})`, mixBlendMode: blend ? 'multiply' : 'normal'}}>
      <div style={{border: `${size * 0.09}px solid ${color}`, borderRadius: round ? 999 : size * 0.12, padding: size * 0.06, WebkitMaskImage: inkMask, maskImage: inkMask, WebkitMaskSize: '260px 260px', opacity: since(h, at) < 1 / 12 ? 0.8 : 1}}>
        <div style={{border: `${size * 0.04}px solid ${color}`, borderRadius: round ? 999 : size * 0.07, padding: `${size * 0.1}px ${size * 0.26}px ${size * 0.04}px`, fontFamily: BLOCK, fontSize: size, lineHeight: 1, color, whiteSpace: 'nowrap', letterSpacing: size * 0.04}}>{text}</div>
      </div>
    </div>
  );
};

/** Star-burst sticker with a word on it. Centred on (x, y). */
export const Burst: React.FC<{h: Hold; at: number; x: number; y: number; size: number; color?: string; text: React.ReactNode; fontSize?: number; rot?: number; out?: number; z?: number; points?: number; fg?: string}> = ({
  h, at, x, y, size, color = Q.pink, text, fontSize = 40, rot = 12, out, z = 22, points = 12, fg = Q.ink,
}) => {
  if (!on(h, at) || (out !== undefined && on(h, out))) return null;
  const j = h.jig(x + 3 * y, 1);
  const r1 = size / 2, r0 = r1 * 0.74;
  const d = Array.from({length: points * 2}).map((_, i) => { const r = i % 2 ? r0 : r1; const an = (i / (points * 2)) * Math.PI * 2; return `${i ? 'L' : 'M'} ${(Math.cos(an) * r).toFixed(1)} ${(Math.sin(an) * r).toFixed(1)}`; }).join(' ') + ' Z';
  return (
    <div style={{position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, zIndex: z, transform: `rotate(${rot + j.r * 4}deg) scale(${slap(h, at, 1.25)})`, filter: 'drop-shadow(4px 7px 0 rgba(0,0,0,0.22))'}}>
      <svg width={size} height={size} viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} style={{overflow: 'visible'}}>
        <path d={d} fill={Q.paper} stroke={Q.paper} strokeWidth={14} strokeLinejoin="round" />
        <path d={d} fill={color} stroke={Q.ink} strokeWidth={5} strokeLinejoin="round" />
      </svg>
      <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: BLOCK, fontSize, lineHeight: 1.02, color: fg, textAlign: 'center'}}>{text}</div>
    </div>
  );
};

// ---------- printed matter ----------
/** Grey text lines of a newspaper column. */
export const TextLines: React.FC<{n: number; w: number; seed: number; color?: string; gap?: number; thick?: number}> = ({n, w, seed, color = Q.grey, gap = 20, thick = 9}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: gap - thick}}>
    {Array.from({length: n}).map((_, i) => <div key={i} style={{height: thick, width: w * (i === n - 1 ? 0.55 : 0.82 + rnd(seed + i * 2.3) * 0.18), background: color, borderRadius: 2}} />)}
  </div>
);

/** Generic head-and-shoulders silhouette (no likeness), printed in halftone. viewBox 0 0 200 240. */
export const Person: React.FC<{w: number; bg?: string; tone?: string; hair?: number; seed: number; border?: boolean; glasses?: boolean}> = ({w, bg = Q.mustard, tone = '#EFE7D8', hair = 0, seed, border = true, glasses}) => {
  const id = `prs${seed}`.replace('.', '_');
  const body = 'M 14 240 Q 16 172 100 158 Q 184 172 186 240 Z';
  const hairs = [
    'M 46 92 Q 44 30 100 28 Q 158 30 154 92 Q 148 58 100 56 Q 56 58 46 92 Z', // short
    'M 46 100 Q 40 26 100 26 Q 160 26 154 100 Q 150 60 100 58 Q 52 60 46 100 Z M 76 24 A 26 22 0 1 1 126 24 A 26 22 0 1 1 76 24 Z', // bun
    'M 40 170 Q 30 40 100 28 Q 172 40 160 170 L 140 170 Q 150 70 100 62 Q 52 70 60 170 Z', // long
    'M 40 72 Q 50 22 100 22 Q 150 22 160 72 L 178 80 L 30 80 Z', // cap
    'M 52 70 Q 70 40 100 44 Q 132 40 150 72 Q 128 60 100 62 Q 72 60 52 70 Z', // thin
  ];
  return (
    <svg width={w} height={w * 1.2} viewBox="0 0 200 240" style={{overflow: 'visible', display: 'block'}}>
      <defs>
        <Dots id={`${id}a`} color={Q.ink} size={9} r={3.3} angle={45} />
        <Dots id={`${id}b`} color={Q.ink} size={9} r={1.8} angle={45} />
        <clipPath id={`${id}c`}><rect x={100} y={0} width={120} height={240} /></clipPath>
      </defs>
      {border && <g stroke={Q.paper} strokeWidth={18} strokeLinejoin="round" fill={Q.paper}>
        <path d={body} /><ellipse cx={100} cy={100} rx={54} ry={64} /><path d={hairs[hair % hairs.length]} />
      </g>}
      <path d={body} fill={bg} />
      <path d={body} fill={`url(#${id}a)`} opacity={0.55} />
      <rect x={82} y={140} width={36} height={30} fill={tone} />
      <ellipse cx={100} cy={100} rx={52} ry={62} fill={tone} />
      <g clipPath={`url(#${id}c)`}><ellipse cx={100} cy={100} rx={52} ry={62} fill={`url(#${id}b)`} /></g>
      <path d={hairs[hair % hairs.length]} fill={Q.ink} />
      <path d={hairs[hair % hairs.length]} fill={`url(#${id}b)`} opacity={0.3} />
      {glasses && <g stroke={Q.ink} strokeWidth={5} fill="none"><circle cx={80} cy={104} r={15} /><circle cx={120} cy={104} r={15} /><path d="M 95 104 L 105 104" /></g>}
    </svg>
  );
};

/** Halftone "press photo" block (a generic figure on a tint). */
export const Photo: React.FC<{w: number; hgt: number; tint?: string; seed: number; grey?: boolean}> = ({w, hgt, tint = Q.cobalt, seed, grey}) => {
  const id = `ph${seed}`.replace('.', '_');
  const ink = grey ? Q.greyInk : Q.ink;
  return (
    <svg width={w} height={hgt} style={{display: 'block'}}>
      <defs><Dots id={id} color={ink} size={8} r={2.6} angle={45} /></defs>
      <rect width={w} height={hgt} fill={grey ? Q.grey : tint} />
      <rect width={w} height={hgt} fill={`url(#${id})`} opacity={0.35} />
      <ellipse cx={w * 0.5} cy={hgt * 0.42} rx={hgt * 0.2} ry={hgt * 0.24} fill={`url(#${id})`} />
      <path d={`M ${w * 0.18} ${hgt} Q ${w * 0.22} ${hgt * 0.68} ${w * 0.5} ${hgt * 0.66} Q ${w * 0.78} ${hgt * 0.68} ${w * 0.82} ${hgt} Z`} fill={`url(#${id})`} />
    </svg>
  );
};

/** Newspaper clipping on torn paper: headline, optional halftone photo, grey text lines. */
export const Clipping: React.FC<{
  h: Hold; at: number; x: number; y: number; w: number; hgt: number; seed: number; rot?: number; color?: string;
  head?: React.ReactNode; headSize?: number; headColor?: string; headFont?: string; photo?: string | false; lines?: number; out?: number; z?: number; children?: React.ReactNode; grey?: boolean;
}> = ({h, at, x, y, w, hgt, seed, rot = 0, color = Q.paper, head, headSize = 56, headColor = Q.ink, headFont = FAT, photo = Q.cobalt, lines = 4, out, z = 3, children, grey}) => (
  <Scrap h={h} at={at} x={x} y={y} w={w} hgt={hgt} color={color} rot={rot} seed={seed} out={out} z={z}>
    <div style={{position: 'absolute', inset: 0, padding: `${Math.max(14, w * 0.06)}px ${Math.max(14, w * 0.07)}px`, display: 'flex', flexDirection: 'column', gap: Math.max(8, hgt * 0.035), overflow: 'hidden'}}>
      {head && <div style={{fontFamily: headFont, fontSize: headSize, lineHeight: 0.95, color: headColor, letterSpacing: -0.5}}>{head}</div>}
      {photo && <Photo w={w * 0.86} hgt={hgt * 0.36} tint={photo} seed={seed} grey={grey} />}
      <TextLines n={lines} w={w * 0.86} seed={seed} color={grey ? Q.grey : '#C9C2B5'} gap={Math.max(14, hgt * 0.05)} thick={Math.max(6, hgt * 0.022)} />
    </div>
    {children}
  </Scrap>
);

// ---------- cut-out props ----------
/** Paper phone with a group-chat screen (generic UI, no app branding). Screen children are in screen coords. */
export const Phone: React.FC<{h: Hold; at: number; x: number; y: number; w: number; hgt: number; rot?: number; title?: string; seed: number; children?: React.ReactNode; out?: number; z?: number}> = ({
  h, at, x, y, w, hgt, rot = 0, title = 'Grup Keluarga', seed, children, out, z = 4,
}) => {
  if (!on(h, at) || (out !== undefined && on(h, out))) return null;
  const j = h.jig(seed, 0.7);
  const pad = w * 0.045, head = w * 0.17;
  return (
    <div style={{position: 'absolute', left: x + j.x, top: y + j.y, width: w, height: hgt, zIndex: z, transform: `rotate(${rot + j.r}deg) scale(${slap(h, at, 1.06)})`,
      background: Q.ink, borderRadius: w * 0.11, boxShadow: `0 0 0 ${w * 0.016}px ${Q.paper}, 8px 14px 0 ${w * 0.016}px rgba(0,0,0,0.25)`}}>
      <div style={{position: 'absolute', left: pad, top: pad * 1.6, right: pad, bottom: pad * 1.6, background: Q.news, borderRadius: w * 0.07, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: head, background: Q.cobalt, display: 'flex', alignItems: 'center', gap: w * 0.03, padding: `${w * 0.03}px ${w * 0.05}px 0`}}>
          <div style={{width: head * 0.62, height: head * 0.62, borderRadius: '50%', background: Q.pink, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'}}>
            <Person w={head * 0.5} bg={Q.mustard} hair={1} seed={seed + 0.5} border={false} />
          </div>
          <div style={{fontFamily: GEO, fontWeight: 800, fontSize: head * 0.3, color: Q.paper, whiteSpace: 'nowrap'}}>{title}</div>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: head, bottom: 0}}>{children}</div>
      </div>
      <div style={{position: 'absolute', left: '50%', top: pad * 0.45, width: w * 0.2, height: pad * 0.55, marginLeft: -w * 0.1, background: '#2a2a2a', borderRadius: 99}} />
    </div>
  );
};

/** Chat bubble inside the phone (appears on its cue). */
export const Bubble: React.FC<{h: Hold; at: number; x: number; y: number; w: number; name: string; nameColor?: string; fwd?: boolean; children: React.ReactNode; seed: number; fs?: number}> = ({
  h, at, x, y, w, name, nameColor = Q.red, fwd, children, seed, fs = 26,
}) => {
  if (!on(h, at)) return null;
  const j = h.jig(seed, 0.4);
  return (
    <div style={{position: 'absolute', left: x + j.x, top: y + j.y, width: w, background: Q.paper, border: `3px solid ${Q.ink}`, borderRadius: `6px ${fs}px ${fs}px ${fs}px`, padding: `${fs * 0.35}px ${fs * 0.6}px ${fs * 0.5}px`,
      boxShadow: '4px 6px 0 rgba(0,0,0,0.18)', transform: `scale(${slap(h, at, 1.08)})`, transformOrigin: '0 0'}}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 12}}>
        <div style={{fontFamily: HAND, fontWeight: 700, fontSize: fs, color: nameColor, lineHeight: 1.1}}>{name}</div>
        {fwd && <div style={{fontFamily: TYPE, fontSize: fs * 0.7, color: Q.greyInk, fontStyle: 'italic'}}>↪ diteruskan</div>}
      </div>
      <div style={{marginTop: fs * 0.25}}>{children}</div>
    </div>
  );
};

/** Boxy cut-out robot (original drawing). viewBox 0 0 300 400. */
export const Robot: React.FC<{w: number; eye?: number}> = ({w, eye = 0}) => (
  <svg width={w} height={w * 4 / 3} viewBox="0 0 300 400" style={{overflow: 'visible', display: 'block'}}>
    <defs><Dots id="robotdots" color={Q.ink} size={10} r={3} angle={45} /></defs>
    <g stroke={Q.paper} strokeWidth={22} strokeLinejoin="round" fill={Q.paper}>
      <rect x={40} y={70} width={220} height={160} rx={26} /><rect x={74} y={240} width={152} height={150} rx={14} /><path d="M 150 70 L 150 26" /><circle cx={150} cy={22} r={16} />
      <rect x={14} y={256} width={50} height={110} rx={20} /><rect x={236} y={256} width={50} height={110} rx={20} />
    </g>
    <path d="M 150 70 L 150 30" stroke={Q.ink} strokeWidth={8} /><circle cx={150} cy={22} r={15} fill={Q.red} stroke={Q.ink} strokeWidth={5} />
    <rect x={14} y={256} width={50} height={110} rx={20} fill={Q.mint} stroke={Q.ink} strokeWidth={6} />
    <rect x={236} y={256} width={50} height={110} rx={20} fill={Q.mint} stroke={Q.ink} strokeWidth={6} />
    <rect x={74} y={240} width={152} height={150} rx={14} fill={Q.grey} stroke={Q.ink} strokeWidth={6} />
    <rect x={74} y={240} width={152} height={150} rx={14} fill="url(#robotdots)" opacity={0.45} />
    <rect x={104} y={270} width={92} height={56} rx={8} fill={Q.mustard} stroke={Q.ink} strokeWidth={5} />
    {[0, 1, 2].map((i) => <circle key={i} cx={124 + i * 26} cy={298} r={7} fill={i === eye % 3 ? Q.red : Q.ink} />)}
    <rect x={40} y={70} width={220} height={160} rx={26} fill={Q.cobalt} stroke={Q.ink} strokeWidth={6} />
    <rect x={40} y={70} width={220} height={160} rx={26} fill="url(#robotdots)" opacity={0.3} />
    <circle cx={105} cy={140} r={32} fill={Q.paper} stroke={Q.ink} strokeWidth={5} /><circle cx={195} cy={140} r={32} fill={Q.paper} stroke={Q.ink} strokeWidth={5} />
    <circle cx={105 + (eye % 2 ? 8 : -6)} cy={142} r={13} fill={Q.ink} /><circle cx={195 + (eye % 2 ? 8 : -6)} cy={142} r={13} fill={Q.ink} />
    <rect x={100} y={190} width={100} height={22} rx={6} fill={Q.paper} stroke={Q.ink} strokeWidth={4} />
    {[0, 1, 2, 3].map((i) => <path key={i} d={`M ${120 + i * 20} 190 L ${120 + i * 20} 212`} stroke={Q.ink} strokeWidth={4} />)}
  </svg>
);

/** Emotion face cut-out (kaget / takut / jijik), drawn in marker on a halftone disc. viewBox -150..150. */
export const Face: React.FC<{w: number; mood: 'kaget' | 'takut' | 'jijik' | 'datar'; bg: string; n?: number}> = ({w, mood, bg, n = 0}) => {
  const id = `face${mood}`;
  const k = {stroke: Q.ink, strokeWidth: 9, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  const wob = n % 2 ? 3 : -3;
  return (
    <svg width={w} height={w} viewBox="-150 -150 300 300" style={{overflow: 'visible', display: 'block'}}>
      <defs><Dots id={id} color={Q.ink} size={10} r={2.6} angle={30} /><clipPath id={`${id}c`}><circle r={128} /></clipPath></defs>
      <circle r={140} fill={Q.paper} />
      <circle r={128} fill={bg} stroke={Q.ink} strokeWidth={6} />
      <g clipPath={`url(#${id}c)`}><circle cx={60} cy={60} r={150} fill={`url(#${id})`} opacity={0.45} /></g>
      {mood === 'kaget' && <>
        <path d="M -78 -78 Q -50 -104 -22 -82" {...k} /><path d="M 22 -82 Q 50 -104 78 -78" {...k} />
        <circle cx={-48} cy={-30} r={30} fill={Q.paper} stroke={Q.ink} strokeWidth={7} /><circle cx={48} cy={-30} r={30} fill={Q.paper} stroke={Q.ink} strokeWidth={7} />
        <circle cx={-48} cy={-28} r={9} fill={Q.ink} /><circle cx={48} cy={-28} r={9} fill={Q.ink} />
        <ellipse cx={0} cy={62} rx={30} ry={40} fill={Q.ink} /><ellipse cx={0} cy={78} rx={16} ry={14} fill={Q.red} />
        <path d={`M ${150 + wob} -110 L ${136 + wob} -50 M ${180 + wob} -86 L ${150 + wob} -30`} {...k} stroke={Q.red} strokeWidth={10} />
      </>}
      {mood === 'takut' && <>
        <path d="M -80 -52 L -22 -78" {...k} /><path d="M 80 -52 L 22 -78" {...k} />
        <circle cx={-46} cy={-20} r={22} fill={Q.paper} stroke={Q.ink} strokeWidth={7} /><circle cx={46} cy={-20} r={22} fill={Q.paper} stroke={Q.ink} strokeWidth={7} />
        <circle cx={-46 + wob} cy={-16} r={7} fill={Q.ink} /><circle cx={46 + wob} cy={-16} r={7} fill={Q.ink} />
        <path d="M -62 70 L -40 52 L -20 70 L 0 52 L 20 70 L 40 52 L 62 70" {...k} />
        <path d="M 96 -96 Q 120 -60 108 -44 Q 90 -36 86 -56 Q 86 -70 96 -96 Z" fill={Q.cobalt} stroke={Q.ink} strokeWidth={5} />
      </>}
      {mood === 'jijik' && <>
        <path d="M -80 -60 L -24 -44" {...k} /><path d="M 24 -40 L 80 -66" {...k} />
        <path d="M -72 -16 Q -46 -32 -20 -16" {...k} /><circle cx={48} cy={-14} r={18} fill={Q.paper} stroke={Q.ink} strokeWidth={7} /><circle cx={50} cy={-12} r={6} fill={Q.ink} />
        <path d="M -60 50 Q -30 30 0 50 Q 30 70 60 46" {...k} />
        <path d="M -6 52 Q -4 104 22 100 Q 44 94 30 58" fill={Q.pink} stroke={Q.ink} strokeWidth={6} />
        <path d={`M -150 ${-20 + wob} q 14 -14 0 -28 q -14 -14 0 -28`} {...k} stroke={Q.mint} strokeWidth={8} />
      </>}
      {mood === 'datar' && <>
        <path d="M -70 -40 L -26 -40" {...k} stroke={Q.greyInk} /><path d="M 26 -40 L 70 -40" {...k} stroke={Q.greyInk} />
        <circle cx={-48} cy={-12} r={9} fill={Q.greyInk} /><circle cx={48} cy={-12} r={9} fill={Q.greyInk} />
        <path d="M -44 58 L 44 58" {...k} stroke={Q.greyInk} />
      </>}
    </svg>
  );
};

/** Cut-out scissors (open 0..1). viewBox -150..150, pointing left. */
export const Scissors: React.FC<{w: number; open: number}> = ({w, open}) => {
  const a = 6 + open * 20;
  const blade = (s: number) => (
    <g transform={`rotate(${s * a})`}>
      <path d={`M 0 0 L -150 ${-s * 6} Q -150 ${s * 14} -120 ${s * 18} L 10 ${s * 14} Z`} fill="#D9D6CF" stroke={Q.ink} strokeWidth={5} strokeLinejoin="round" />
      <path d={`M 10 ${s * 8} Q 60 ${s * 14} 90 ${s * 46}`} stroke={Q.ink} strokeWidth={5} fill="none" />
      <ellipse cx={110} cy={s * 58} rx={40} ry={28} fill={s > 0 ? Q.red : Q.pink} stroke={Q.ink} strokeWidth={6} />
      <ellipse cx={110} cy={s * 58} rx={22} ry={13} fill={Q.paper} stroke={Q.ink} strokeWidth={4} />
    </g>
  );
  return (
    <svg width={w} height={w} viewBox="-160 -160 320 320" style={{overflow: 'visible', display: 'block', filter: 'drop-shadow(5px 8px 0 rgba(0,0,0,0.22))'}}>
      {blade(1)}{blade(-1)}<circle r={9} fill={Q.ink} />
    </svg>
  );
};

/** Pointing finger cut-out (points up). viewBox 0 0 200 360. */
export const Finger: React.FC<{w: number}> = ({w}) => (
  <svg width={w} height={w * 1.8} viewBox="0 0 200 360" style={{overflow: 'visible', display: 'block', filter: 'drop-shadow(6px 10px 0 rgba(0,0,0,0.22))'}}>
    <g stroke={Q.paper} strokeWidth={18} strokeLinejoin="round" fill={Q.paper}>
      <rect x={70} y={10} width={56} height={170} rx={28} /><rect x={36} y={140} width={136} height={130} rx={40} /><rect x={40} y={262} width={128} height={100} />
    </g>
    <rect x={40} y={262} width={128} height={100} fill={Q.cobalt} stroke={Q.ink} strokeWidth={6} />
    <rect x={36} y={140} width={136} height={130} rx={40} fill="#F1C7A1" stroke={Q.ink} strokeWidth={6} />
    <rect x={70} y={10} width={56} height={170} rx={28} fill="#F1C7A1" stroke={Q.ink} strokeWidth={6} />
    <path d="M 84 30 Q 98 18 112 30 L 112 54 Q 98 62 84 54 Z" fill={Q.paper} stroke={Q.ink} strokeWidth={4} />
    <path d="M 126 170 Q 150 172 166 190 M 120 205 Q 150 205 168 222 M 36 190 Q 18 180 26 160 Q 40 140 60 160" stroke={Q.ink} strokeWidth={5} fill="none" strokeLinecap="round" />
  </svg>
);

/** Octagon stop sign. Centred on (x, y). */
export const StopSign: React.FC<{h: Hold; at: number; x: number; y: number; size: number; text: string; rot?: number; z?: number; out?: number}> = ({h, at, x, y, size, text, rot = -8, z = 24, out}) => {
  if (!on(h, at) || (out !== undefined && on(h, out))) return null;
  const r = size / 2;
  const d = Array.from({length: 8}).map((_, i) => { const an = Math.PI / 8 + (i / 8) * Math.PI * 2; return `${i ? 'L' : 'M'} ${(Math.cos(an) * r).toFixed(1)} ${(Math.sin(an) * r).toFixed(1)}`; }).join(' ') + ' Z';
  const j = h.jig(x + y, 1);
  return (
    <div style={{position: 'absolute', left: x - r, top: y - r, width: size, height: size, zIndex: z, transform: `rotate(${rot + j.r * 3}deg) scale(${slap(h, at, 1.28)})`, filter: 'drop-shadow(6px 10px 0 rgba(0,0,0,0.25))'}}>
      <svg width={size} height={size} viewBox={`${-r} ${-r} ${size} ${size}`} style={{overflow: 'visible'}}>
        <path d={d} fill={Q.paper} stroke={Q.paper} strokeWidth={22} strokeLinejoin="round" />
        <path d={d} fill={Q.red} stroke={Q.ink} strokeWidth={6} strokeLinejoin="round" />
        <path d={d} fill="none" stroke={Q.paper} strokeWidth={6} transform="scale(0.88)" />
      </svg>
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BLOCK, fontSize: size * 0.2, color: Q.paper}}>{text}</div>
    </div>
  );
};

/** Paper stopwatch; the hand ticks once per hold. */
export const Stopwatch: React.FC<{w: number; tick: number}> = ({w, tick}) => (
  <svg width={w} height={w * 1.15} viewBox="-100 -130 200 230" style={{overflow: 'visible', display: 'block', filter: 'drop-shadow(5px 8px 0 rgba(0,0,0,0.22))'}}>
    <rect x={-18} y={-128} width={36} height={26} rx={6} fill={Q.red} stroke={Q.ink} strokeWidth={5} />
    <circle r={96} fill={Q.paper} stroke={Q.paper} strokeWidth={16} />
    <circle r={92} fill={Q.paper} stroke={Q.ink} strokeWidth={8} />
    {Array.from({length: 12}).map((_, i) => { const an = (i / 12) * Math.PI * 2; return <path key={i} d={`M ${Math.sin(an) * 72} ${-Math.cos(an) * 72} L ${Math.sin(an) * 82} ${-Math.cos(an) * 82}`} stroke={Q.ink} strokeWidth={i % 3 ? 4 : 8} />; })}
    <path d={`M 0 0 L ${Math.sin(tick * 0.52) * 66} ${-Math.cos(tick * 0.52) * 66}`} stroke={Q.red} strokeWidth={8} strokeLinecap="round" />
    <circle r={9} fill={Q.ink} />
  </svg>
);

/** Magnifying glass; children render magnified inside the lens. Centre of lens at (0,0) of the svg box. */
export const Magnifier: React.FC<{size: number; children?: React.ReactNode}> = ({size, children}) => (
  <div style={{position: 'relative', width: size, height: size}}>
    <div style={{position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', background: 'rgba(235,245,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{children}</div>
    <svg width={size * 2} height={size * 2} viewBox={`0 0 ${size * 2} ${size * 2}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', filter: 'drop-shadow(6px 10px 0 rgba(0,0,0,0.25))'}}>
      <path d={`M ${size * 0.86} ${size * 0.86} L ${size * 1.42} ${size * 1.42}`} stroke={Q.paper} strokeWidth={size * 0.2} strokeLinecap="round" />
      <path d={`M ${size * 0.88} ${size * 0.88} L ${size * 1.4} ${size * 1.4}`} stroke={Q.ink} strokeWidth={size * 0.13} strokeLinecap="round" />
      <path d={`M ${size * 0.95} ${size * 0.95} L ${size * 1.36} ${size * 1.36}`} stroke={Q.red} strokeWidth={size * 0.07} strokeLinecap="round" />
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill="none" stroke={Q.paper} strokeWidth={size * 0.12} />
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill="none" stroke={Q.ink} strokeWidth={size * 0.07} />
      <path d={`M ${size * 0.24} ${size * 0.36} Q ${size * 0.3} ${size * 0.22} ${size * 0.44} ${size * 0.18}`} stroke="#fff" strokeWidth={size * 0.04} fill="none" strokeLinecap="round" />
    </svg>
  </div>
);

// ---------- page furniture ----------
/** Kraft desk: noise + corrugated fibres. */
export const Desk: React.FC = () => (
  <>
    <div style={{position: 'absolute', inset: 0, background: Q.kraft}} />
    <div style={{position: 'absolute', inset: 0, backgroundImage: GRAIN, opacity: 0.35, mixBlendMode: 'multiply'}} />
    <div style={{position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.035) 0 3px, transparent 3px 26px)'}} />
  </>
);

/**
 * Torn-sheet slap transition: a big coloured sheet slides over the frame in two holds and lands at `at`,
 * carrying its scene with it (children = the new scene, already partly glued on). Halftone fades into one corner.
 * Sized from the frame: the paper is (W + 220)×(H + 280) and the slide starts 0.74·(W + 120) / 0.74·(H + 80) away.
 */
export const Sheet: React.FC<{h: Hold; at: number; color: string; from?: 'left' | 'right' | 'top' | 'bottom'; rot?: number; seed: number; dots?: string; children?: React.ReactNode; corner?: 'tl' | 'tr' | 'bl' | 'br'}> = ({
  h, at, color, from = 'left', rot = 0, seed, dots, children, corner = 'tr',
}) => {
  const fr = useFrame();
  const k = Math.round((h.tq - (at - 2 / 12)) * 12);
  if (k < 0) return null;
  const off = k === 0 ? 0.74 : k === 1 ? 0.26 : 0;
  const dr = k === 0 ? 7 : k === 1 ? 2.5 : 0;
  const v = {left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1]}[from];
  const W = fr.W + 220, H = fr.H + 280;
  const id = `sh${seed}`;
  const cx = corner.includes('l') ? 0 : W, cy = corner.includes('t') ? 0 : H;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: fr.W, height: fr.H, transform: `translate(${v[0] * off * (fr.W + 120)}px, ${v[1] * off * (fr.H + 80)}px) rotate(${(rot + dr * (v[0] || v[1]))}deg)`, transformOrigin: '50% 50%'}}>
      <svg width={W} height={H} style={{position: 'absolute', left: -110, top: -140, overflow: 'visible', filter: k < 2 ? 'drop-shadow(0 0 24px rgba(0,0,0,0.35))' : undefined}}>
        <defs>
          {dots && <Dots id={`${id}d`} color={dots} size={22} r={7} angle={20} />}
          <radialGradient id={`${id}g`} cx={cx / W} cy={cy / H} r={0.55}><stop offset={0} stopColor="#fff" stopOpacity={1} /><stop offset={1} stopColor="#fff" stopOpacity={0} /></radialGradient>
          <mask id={`${id}m`}><rect width={W} height={H} fill={`url(#${id}g)`} /></mask>
        </defs>
        <path d={torn(W, H, seed, 46, 44)} fill={Q.paper} transform="translate(-8 -8) scale(1.012)" />
        <path d={torn(W, H, seed + 3, 40, 40)} fill={color} />
        {dots && <rect width={W} height={H} fill={`url(#${id}d)`} mask={`url(#${id}m)`} opacity={0.5} />}
      </svg>
      {children}
    </div>
  );
};

// ---------- captions ----------
/**
 * Torn-paper caption, Kalam, the spoken word gets a mustard highlighter stripe. Frame-exact (not on the held clock).
 * Portrait: top 1574. Landscape (no `top`): anchored to the bottom safe margin, Kalam 56, one line (nowrap).
 */
export const Caption: React.FC<{t: number; pages: CaptionPage[]; top?: number}> = ({t, pages, top}) => {
  const fr = useFrame();
  const pg = pageAt(t, pages);
  if (!pg) return null;
  const pos: React.CSSProperties = fr.wide && top === undefined
    ? {position: 'absolute', left: fr.safe.side, right: fr.safe.side, bottom: fr.safe.bottom + 14, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 60}
    : {position: 'absolute', left: 70, right: 70, top: top ?? 1574, display: 'flex', justifyContent: 'center', zIndex: 60};
  return (
    <div style={pos}>
      <div style={{position: 'relative', padding: '14px 34px', transform: `rotate(${(rnd(pg.start * 10) - 0.5) * 3}deg)`, filter: 'drop-shadow(3px 5px 0 rgba(0,0,0,0.22))'}}>
        <svg width={1000} height={200} style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible'}} viewBox="0 0 1000 200" preserveAspectRatio="none">
          <path d={torn(1000, 200, Math.round(pg.start * 10), 14, 24)} fill={Q.paper} />
        </svg>
        <div style={{position: 'relative', fontFamily: HAND, fontWeight: 700, fontSize: fr.pick(58, 56), lineHeight: 1.15, color: Q.ink, textAlign: 'center', whiteSpace: 'nowrap'}}>
          {pg.words.map((w, i) => {
            const on = t >= w.start - 0.04 && t < w.end + 0.1;
            return <React.Fragment key={i}><span style={{background: on ? `linear-gradient(transparent 45%, ${Q.mustard} 45%, ${Q.mustard} 90%, transparent 90%)` : 'none', opacity: t >= w.start - 0.04 ? 1 : 0.35}}>{display(w.word)}</span>{i < pg.words.length - 1 ? ' ' : ''}</React.Fragment>;
          })}
        </div>
      </div>
    </div>
  );
};

export const lerpPt = (a: [number, number], b: [number, number], q: number): [number, number] => [lerp(a[0], b[0], q), lerp(a[1], b[1], q)];

// ---------- more cut-outs ----------
/** Generic cut-out holder: slaps in on its cue, jitters per hold, optional removal. */
export const Cut: React.FC<{h: Hold; at: number; x: number; y: number; rot?: number; out?: number; z?: number; scale?: number; origin?: string; seed?: number; big?: number; children: React.ReactNode}> = ({
  h, at, x, y, rot = 0, out, z = 6, scale = 1, origin = '50% 50%', seed = 0, big = 1.15, children,
}) => {
  if (!on(h, at) || (out !== undefined && on(h, out))) return null;
  const j = h.jig(seed + x * 0.1 + y * 0.07, 0.8);
  return <div style={{position: 'absolute', left: x + j.x, top: y + j.y, zIndex: z, transform: `rotate(${rot + j.r}deg) scale(${scale * slap(h, at, big)})`, transformOrigin: origin}}>{children}</div>;
};

/** A torn paper strip that grows to length L in stop-motion steps (bar chart / race track). */
export const TornBar: React.FC<{h: Hold; at: number; x: number; y: number; L: number; hgt: number; color: string; seed: number; dur?: number; z?: number; halftone?: string}> = ({h, at, x, y, L, hgt, color, seed, dur = 0.6, z = 4, halftone}) => {
  const w = L * hp(h, at, at + dur);
  if (w < 6) return null;
  const id = hid(seed + 0.5, halftone ?? '');
  return (
    <svg width={w + 30} height={hgt + 30} style={{position: 'absolute', left: x - 8, top: y - 8, zIndex: z, overflow: 'visible', filter: 'drop-shadow(4px 6px 0 rgba(0,0,0,0.2))'}}>
      {halftone && <defs><Dots id={id} color={halftone} size={12} r={3.4} /></defs>}
      <path d={torn(w + 10, hgt + 10, seed + 5, 9, 18)} fill={Q.paper} transform="translate(3 3)" />
      <path d={torn(w, hgt, seed, 8, 18)} fill={color} transform="translate(8 8)" />
      {halftone && <path d={torn(w, hgt, seed, 8, 18)} fill={`url(#${id})`} opacity={0.45} transform="translate(8 8)" />}
    </svg>
  );
};

/** Tiny news slip (one of thousands of "kabar"). Plain divs: cheap enough to use by the dozen. */
export const Slip: React.FC<{h: Hold; at: number; x: number; y: number; rot: number; color: string; seed: number; w?: number}> = ({h, at, x, y, rot, color, seed, w = 120}) => {
  if (!on(h, at)) return null;
  const j = h.jig(seed, 0.6);
  return (
    <div style={{position: 'absolute', left: x + j.x, top: y + j.y, width: w, height: w * 0.7, background: color, transform: `rotate(${rot + j.r}deg) scale(${slap(h, at, 1.2)})`, boxShadow: '3px 5px 0 rgba(0,0,0,0.22)', padding: w * 0.09, display: 'flex', flexDirection: 'column', gap: w * 0.06}}>
      <div style={{height: w * 0.1, width: '70%', background: Q.ink}} />
      <div style={{display: 'flex', gap: w * 0.06}}>
        <div style={{width: w * 0.28, height: w * 0.28, background: rnd(seed) > 0.5 ? Q.cobalt : Q.red, opacity: 0.75}} />
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: w * 0.05}}>{[0, 1, 2].map((i) => <div key={i} style={{height: w * 0.05, background: '#B4AEA3'}} />)}</div>
      </div>
    </div>
  );
};

/** Round fact-checker badge ("CEK FAKTA"), centred on (x, y). */
export const Badge: React.FC<{h: Hold; at: number; x: number; y: number; r?: number; n: number; color?: string}> = ({h, at, x, y, r = 64, n, color = Q.paper}) => {
  if (!on(h, at)) return null;
  const j = h.jig(n * 11 + 7, 0.8);
  return (
    <div style={{position: 'absolute', left: x - r + j.x, top: y - r + j.y, width: r * 2, height: r * 2, zIndex: 8, transform: `rotate(${(rnd(n) - 0.5) * 24 + j.r * 3}deg) scale(${slap(h, at, 1.3)})`, filter: 'drop-shadow(3px 6px 0 rgba(0,0,0,0.25))'}}>
      <svg width={r * 2} height={r * 2} viewBox="-70 -70 140 140" style={{position: 'absolute', inset: 0}}>
        <circle r={66} fill={color} stroke={Q.paper} strokeWidth={6} />
        <circle r={60} fill="none" stroke={Q.ink} strokeWidth={5} />
        <circle r={50} fill="none" stroke={Q.ink} strokeWidth={2} strokeDasharray="4 5" />
      </svg>
      <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: BLOCK, color: Q.ink, lineHeight: 0.95, textAlign: 'center'}}>
        <div style={{fontSize: r * 0.22}}>CEK</div><div style={{fontSize: r * 0.22}}>FAKTA</div><div style={{fontFamily: FAT, fontSize: r * 0.36, color: Q.red, marginTop: 2}}>{n}</div>
      </div>
    </div>
  );
};

/** Press card with a photo slot and fields; `stampAt` slams a PENERBIT-style stamp across it. */
export const PressCard: React.FC<{h: Hold; at: number; x: number; y: number; w: number; hgt: number; rot?: number; name: string; children?: React.ReactNode}> = ({h, at, x, y, w, hgt, rot = -3, name, children}) => {
  if (!on(h, at)) return null;
  const j = h.jig(91, 0.6);
  return (
    <div style={{position: 'absolute', left: x + j.x, top: y + j.y, width: w, height: hgt, zIndex: 10, transform: `rotate(${rot + j.r}deg) scale(${slap(h, at, 1.12)})`,
      background: Q.paper, borderRadius: 30, border: `6px solid ${Q.ink}`, boxShadow: `0 0 0 12px ${Q.paper}, 10px 16px 0 12px rgba(0,0,0,0.28)`}}>
      {/* lanyard + clip */}
      <div style={{position: 'absolute', left: w / 2 - 70, top: -170, width: 140, height: 150, background: Q.red, borderLeft: `5px solid ${Q.ink}`, borderRight: `5px solid ${Q.ink}`}} />
      <div style={{position: 'absolute', left: w / 2 - 60, top: -40, width: 120, height: 70, background: '#C9C4BA', border: `5px solid ${Q.ink}`, borderRadius: 14}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 46, height: 110, background: Q.mustard, borderTop: `5px solid ${Q.ink}`, borderBottom: `5px solid ${Q.ink}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: BLOCK, fontSize: 66, color: Q.ink, letterSpacing: 4}}>KARTU PERS</div>
      <div style={{position: 'absolute', left: 44, top: 196, width: w * 0.3, height: w * 0.38, background: Q.cobalt, border: `5px solid ${Q.ink}`, overflow: 'hidden', display: 'flex', alignItems: 'flex-end', justifyContent: 'center'}}>
        <Person w={w * 0.25} bg={Q.pink} hair={0} seed={93} border={false} />
      </div>
      <div style={{position: 'absolute', left: w * 0.3 + 84, top: 200, right: 44}}>
        <div style={{fontFamily: TYPE, fontWeight: 700, fontSize: 30, color: Q.greyInk, letterSpacing: 3}}>NAMA</div>
        <div style={{fontFamily: HAND, fontWeight: 700, fontSize: 104, color: Q.ink, lineHeight: 1}}>{name}</div>
        <div style={{height: 5, background: Q.ink, marginTop: 4}} />
        <div style={{fontFamily: TYPE, fontWeight: 700, fontSize: 30, color: Q.greyInk, letterSpacing: 3, marginTop: 34}}>PERAN</div>
        <div style={{height: 5, background: Q.ink, marginTop: 70}} />
      </div>
      <div style={{position: 'absolute', left: 44, right: 44, bottom: 40, height: 64, display: 'flex', gap: 6, alignItems: 'stretch'}}>
        {Array.from({length: 34}).map((_, i) => <div key={i} style={{width: rnd(i * 3.3) > 0.6 ? 10 : 4, background: Q.ink}} />)}
      </div>
      {children}
    </div>
  );
};

/** A news clipping that runs: torn headline scrap on marker legs that swap every hold. */
export const Runner: React.FC<{h: Hold; x: number; y: number; label: string; color: string; seed: number; running: boolean}> = ({h, x, y, label, color, seed, running}) => {
  const ph = running ? h.n % 2 : 0;
  const j = h.jig(seed, 0.8);
  const leg = (k: number) => {
    const s = (ph === k ? 1 : -1) * (running ? 1 : 0.2);
    return `M ${70 + k * 50} 96 L ${70 + k * 50 + s * 26} 136 L ${70 + k * 50 + s * 26 + 18} 140`;
  };
  return (
    <div style={{position: 'absolute', left: x + j.x, top: y + j.y + (running && ph ? -6 : 0), width: 190, height: 150, zIndex: 9}}>
      <svg width={190} height={150} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <path d={leg(0)} stroke={Q.ink} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={leg(1)} stroke={Q.ink} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d={torn(176, 100, seed, 8, 14)} fill={Q.paper} transform="translate(4 0)" style={{filter: 'drop-shadow(3px 5px 0 rgba(0,0,0,0.22))'}} />
      </svg>
      <div style={{position: 'absolute', left: 14, top: 8, width: 160, height: 84, display: 'flex', flexDirection: 'column', gap: 6, transform: `rotate(${ph ? -3 : 2}deg)`}}>
        <div style={{fontFamily: FAT, fontSize: 38, lineHeight: 1, color}}>{label}</div>
        <div style={{height: 7, background: '#B4AEA3', width: '90%'}} /><div style={{height: 7, background: '#B4AEA3', width: '70%'}} />
      </div>
    </div>
  );
};

/** Tiny people icons in a block (the "1.500 orang" audience). */
export const Crowd: React.FC<{h: Hold; at: number; x: number; y: number; cols: number; rows: number; size?: number; per?: number}> = ({h, at, x, y, cols, rows, size = 30, per = 1 / 12}) => {
  const colors = [Q.paper, Q.pink, Q.cobalt, Q.mint, Q.ink, Q.red];
  return (
    <svg width={cols * size} height={rows * size * 1.25} style={{position: 'absolute', left: x, top: y, overflow: 'visible', zIndex: 5}}>
      {Array.from({length: cols * rows}).map((_, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        if (!on(h, at + r * per)) return null;
        const cx = c * size + size / 2 + (r % 2 ? size * 0.3 : 0) + (rnd(i * 1.7 + h.n * 0.13) - 0.5) * 2, cy = r * size * 1.25 + size * 0.4;
        const col = colors[Math.floor(rnd(i * 4.4) * colors.length)];
        return <g key={i}><path d={`M ${cx - size * 0.38} ${cy + size * 0.85} Q ${cx} ${cy + size * 0.2} ${cx + size * 0.38} ${cy + size * 0.85} Z`} fill={col} stroke={Q.ink} strokeWidth={2} /><circle cx={cx} cy={cy + size * 0.12} r={size * 0.22} fill={col} stroke={Q.ink} strokeWidth={2} /></g>;
      })}
    </svg>
  );
};
