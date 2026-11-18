import React from 'react';
import {AbsoluteFill, Easing} from 'remotion';
import type {CaptionPage} from '../../components/WordCaptions';
import {display, lerp, noise, p, pageAt, pb, useFrame} from '../shared';
import type {Frame} from '../shared';

// LANTANG style kit — pure kinetic typography: the words ARE the picture and ARE the captions.
// Anybody variable font ('Lan Head', wdth 50–150, weight 900), full-bleed colour cards (ink/paper/hot/blue) that wipe
// over each other, justified lines whose words land on their spoken syllable (rise / slam / drop / stretch / pop),
// outline echoes, walls that squeeze a word, odometer digits, print grain. Everything is driven by `t` (seconds);
// no dependency on any episode, words file or audio module. Width maths is measured, not guessed (see below).

export const LANTANG = {ink: '#0E0E0E', paper: '#F3EFE6', hot: '#FF4A1C', blue: '#2B4BFF'};
export const L = LANTANG;
export const HEAD = "'Lan Head', sans-serif";
export const SNAP = Easing.bezier(0.8, 0, 0.15, 1);
export const ps = (t: number, a0: number, b0: number) => p(t, a0, b0, SNAP);
export const W = 936; // usable line width in PORTRAIT (72 px margins) — landscape: useMeasure().w = 1700 (110 px margins)
export const LS = -0.02; // default letter-spacing (em)
export const GAP = 0.22; // gap between words of one line (em)

// ---------- the measure (v1.11 landscape) ----------
// Portrait: one 936 px column between 72 px margins (= W). Landscape 1920×1080: the full measure is 1700 px between
// 110 px margins — use it for one wide stack, or split it into two columns (e.g. 980 + 80 gutter + 640) with
// <Stack left width>. The sizing helpers default to the PORTRAIT W: in landscape always pass the column width
// (fl(text, size, undefined, colW), fillWdth(text, size, colW), fit(text, wdth, colW)).
/** Full measure and side margin of a frame: portrait {w: 936, side: 72}, landscape {w: 1700, side: 110}. */
export const measureOf = (fr: Frame) => ({w: fr.pick(W, fr.W - 2 * fr.safe.side), side: fr.pick(72, fr.safe.side), wide: fr.wide});
/** measureOf for the composition being rendered. */
export const useMeasure = () => measureOf(useFrame());

// ---------- measured widths (the fit contract) ----------
// A900 / A780: advance of each glyph in 1/1000 em at wdth 50 and wdth 150, measured in headless Chrome from
// public/fonts/Anybody-Var.ttf. Advances are linear in wdth, so any wdth 50–150 is exact by interpolation.
// Weights: 900 (house weight) and 780 (for words squeezed to wdth ≈50, where 900 clogs the counters) are measured;
// weights in between interpolate linearly, lighter weights use the 780 table (over-estimates → never crops).
// Covered: A–Z, 0–9, space and . , ! ? : ; ' " - – — ½ > < % / # · … ( ) + = × & “ ” — UPPERCASE ONLY (lowercase
// falls back to its capital, unknown glyphs to H). Kerning is ignored: estimates are within ~2% and err wide.
// Every helper includes the letter-spacing (default LS = -0.02 em per glyph) and Line's word gap (GAP = 0.22 em).
// Change the font, the weight outside 780–900, or the gap/letter-spacing of Line, and these numbers are wrong.
const A900: Record<string, [number, number]> = {
  '0': [373, 971], '1': [328, 941], '2': [372, 1005], '3': [366, 1001], '4': [402, 955], '5': [366, 989], '6': [366, 1003], '7': [322, 903], '8': [367, 984], '9': [366, 1009],
  A: [374, 1156], B: [372, 1097], C: [371, 1084], D: [371, 1085], E: [251, 962], F: [250, 877], G: [373, 1134], H: [372, 1128], I: [187, 513], J: [369, 1087],
  K: [383, 1025], L: [254, 853], M: [605, 1408], N: [481, 1258], O: [369, 1130], P: [373, 1033], Q: [369, 1130], R: [376, 1054], S: [375, 1100], T: [312, 1070],
  U: [373, 1137], V: [386, 1116], W: [609, 1610], X: [404, 1102], Y: [399, 1123], Z: [255, 998], ' ': [100, 425], '.': [190, 371], ',': [206, 494], '!': [221, 394],
  '?': [391, 1009], ':': [191, 382], ';': [206, 468], "'": [146, 278], '"': [249, 438], '-': [235, 754], '–': [269, 843], '—': [313, 1007], '½': [510, 1616], '>': [244, 682],
  '%': [470, 1179], '/': [278, 840], '#': [545, 1157], '·': [190, 382], '…': [631, 1031], '(': [238, 587], ')': [238, 598], '+': [243, 416], '=': [236, 424], '×': [271, 429],
  '<': [245, 682], '&': [484, 1275], '“': [249, 438], '”': [249, 438],
};
const A780: Record<string, [number, number]> = {
  '0': [329, 936], '1': [289, 903], '2': [328, 965], '3': [323, 972], '4': [354, 926], '5': [323, 953], '6': [322, 966], '7': [285, 873], '8': [323, 949], '9': [322, 967],
  A: [330, 1139], B: [329, 1081], C: [329, 1073], D: [327, 1066], E: [224, 956], F: [223, 875], G: [330, 1117], H: [329, 1102], I: [166, 488], J: [327, 1060],
  K: [340, 993], L: [226, 845], M: [535, 1370], N: [424, 1220], O: [326, 1124], P: [329, 1011], Q: [329, 1124], R: [332, 1031], S: [332, 1077], T: [275, 1049],
  U: [331, 1122], V: [341, 1094], W: [542, 1575], X: [357, 1080], Y: [350, 1099], Z: [227, 986], ' ': [93, 425], '.': [174, 340], ',': [187, 460], '!': [199, 359],
  '?': [349, 950], ':': [174, 351], ';': [188, 428], "'": [130, 253], '"': [222, 394], '-': [214, 736], '–': [244, 822], '—': [285, 984], '½': [467, 1568], '>': [223, 658],
  '%': [425, 1125], '/': [251, 761], '#': [495, 1092], '·': [174, 350], '…': [575, 928], '(': [209, 557], ')': [209, 564], '+': [232, 393], '=': [222, 419], '×': [252, 394],
  '<': [223, 658], '&': [426, 1253], '“': [222, 394], '”': [222, 394],
};
const advAt = (tab: Record<string, [number, number]>, ch: string, wdth: number) => {
  const [a, b] = tab[ch] ?? tab[ch.toUpperCase()] ?? tab.H;
  return lerp(a, b, (wdth - 50) / 100) / 1000;
};
const adv = (ch: string, wdth: number, weight = 900) =>
  lerp(advAt(A780, ch, wdth), advAt(A900, ch, wdth), Math.max(0, Math.min(1, (weight - 780) / 120)));
/** Advance of one word in em at this wdth, letter-spacing included. */
export const ems = (text: string, wdth: number, ls = LS, weight = 900) => [...text].reduce((s, ch) => s + adv(ch, wdth, weight) + ls, 0);
/** Width in px of a line of words (Line component: words separated by GAP em). */
export const lineW = (words: string[], wdth: number, size: number, ls = LS, weight = 900) =>
  size * (words.reduce((s, w) => s + ems(w, wdth, ls, weight), 0) + GAP * (words.length - 1));
/** Font size that makes the line fill `width` at this wdth. Pass an array for a multi-word Line. */
export const fit = (text: string | string[], wdth: number, width = W, max = 900, ls = LS, weight = 900) =>
  Math.min(max, Math.floor(width / lineW(Array.isArray(text) ? text : [text], wdth, 1, ls, weight)));
/** wdth (50–150) that makes the line fill `width` at this size — every line the same height, justified by width. */
export const fillWdth = (text: string | string[], size: number, width = W, ls = LS, weight = 900) => {
  const ws = Array.isArray(text) ? text : [text];
  const a = lineW(ws, 50, size, ls, weight), b = lineW(ws, 150, size, ls, weight);
  return Math.max(50, Math.min(150, 50 + (100 * (width - a)) / (b - a)));
};
/** THE line sizer — justified line props for <Line {...fl('WORD', 300)} />: fills `width` (default W = 936, the 72 px
 *  margins) at this size by choosing wdth; if that would need wdth below `min` (63 for size ≥ 220, else 70 — narrower
 *  900 type clogs and stops reading), it keeps wdth = min and lowers the size instead. Pass an array for a multi-word
 *  Line. Only for weight 900 + default ls; for a squeezed 780 word use lineW/fillWdth with ls and weight explicitly. */
export const fl = (text: string | string[], size: number, min = size >= 220 ? 63 : 70, width = W) => {
  const wd = fillWdth(text, size, width);
  return wd >= min ? {size, wdth: wd} : {size: fit(text, min, width), wdth: min};
};

// ---------- kinetic line ----------
export type Mode = 'rise' | 'slam' | 'drop' | 'stretch' | 'pop';
export type Word = {text: string; at: number; color?: string; outline?: string; wdth?: number};
type LineProps = {
  t: number; words: Word[]; size: number; wdth?: number; color?: string; mode?: Mode; stagger?: number; ls?: number;
  align?: 'flex-start' | 'center' | 'flex-end'; out?: number; skew?: number; fromWdth?: number; bob?: number; weight?: number; style?: React.CSSProperties;
};

/** One kinetic line of one or more words, each landing on its own cue. Hidden words keep their width, so lines never jump. */
export const Line: React.FC<LineProps> = ({t, words, size, wdth = 100, color = L.paper, mode = 'rise', stagger = 0.022, align = 'flex-start', out, skew = 0, fromWdth = 150, ls = LS, bob = 0, weight = 900, style}) => {
  const qo = out !== undefined ? ps(t, out, out + 0.28) : 0;
  const clip = mode === 'rise' || out !== undefined;
  return (
    <div style={{display: 'flex', justifyContent: align, gap: size * GAP, height: size * 0.9, overflow: clip ? 'hidden' : 'visible', transform: skew ? `skewX(${skew}deg)` : undefined, flexShrink: 0, ...style}}>
      {words.map((w, wi) => {
        const ww = w.wdth ?? wdth;
        const shown = t >= w.at - 0.06;
        const whole = mode === 'slam' ? pb(t, w.at - 0.04, w.at + 0.22) : mode === 'stretch' ? ps(t, w.at - 0.04, w.at + 0.5) : 1;
        const st = mode === 'stretch' && shown ? lerp(fromWdth, ww, whole) : ww;
        const sc = mode === 'slam' ? lerp(1.55, 1, whole) : 1;
        const vis = mode === 'slam' ? whole > 0 : mode === 'stretch' ? shown : true;
        const fade = mode === 'slam' ? Math.min(1, ps(t, w.at - 0.04, w.at + 0.06) * 1.6) : 1; // slam ramps in over ~5 frames, no one-frame flash
        return (
          <div key={wi} style={{transform: `translateY(${-qo * 112}%) scale(${sc})`, transformOrigin: '50% 60%', whiteSpace: 'nowrap', fontFamily: HEAD, fontWeight: weight,
            fontStretch: `${st}%`, fontSize: size, lineHeight: 0.9, letterSpacing: size * ls, color: w.outline ? 'transparent' : w.color ?? color,
            WebkitTextStroke: w.outline ? `${Math.max(2.5, size * 0.016)}px ${w.outline}` : undefined, opacity: vis ? fade : 0}}>
            {[...w.text].map((ch, i) => {
              const k0 = w.at + i * stagger;
              const q = mode === 'drop' ? pb(t, k0, k0 + 0.32) : ps(t, k0 - 0.04, k0 + 0.26);
              let tf = mode === 'rise' ? `translateY(${(1 - q) * 105}%)`
                : mode === 'drop' ? `translateY(${(1 - q) * -300}px) rotate(${(1 - q) * (i % 2 ? 26 : -26)}deg)`
                : mode === 'pop' ? `scale(${pb(t, k0 - 0.04, k0 + 0.24)})` : 'none';
              if (bob) tf = `${tf === 'none' ? '' : tf} translateY(${Math.sin(t * 2.4 + i * 1.3) * bob * size}px) rotate(${Math.sin(t * 1.7 + i * 2.1) * bob * 40}deg)`;
              return <span key={i} style={{display: 'inline-block', transform: tf, opacity: mode === 'drop' || mode === 'pop' ? (q > 0.01 ? 1 : 0) : 1, whiteSpace: 'pre'}}>{ch}</span>;
            })}
          </div>
        );
      })}
    </div>
  );
};

/** Vertical stack of lines, centred in the frame (bottom keeps clear of the platform UI). Default box: the full measure
 * (portrait x 72–1008, y 170 → 260 from the bottom; landscape x 110–1810, y 120 → 130 from the bottom). For a column
 * pass `left` (frame x) and `width` (the column width — size its lines to the same width). */
export const Stack: React.FC<{children: React.ReactNode; gap?: number; top?: number; bottom?: number; justify?: 'center' | 'flex-start' | 'flex-end'; style?: React.CSSProperties; left?: number; width?: number}> = ({
  children, gap = 18, top, bottom, justify = 'center', style, left, width,
}) => {
  const fr = useFrame();
  const side = fr.pick(72, fr.safe.side);
  const box = width !== undefined ? {left: left ?? side, width} : {left: left ?? side, right: side};
  return (
    <div style={{position: 'absolute', ...box, top: top ?? fr.pick(170, 120), bottom: bottom ?? fr.pick(260, 130), display: 'flex', flexDirection: 'column', justifyContent: justify, gap, ...style}}>{children}</div>
  );
};

/** Spacer for stacks. */
export const Gap: React.FC<{h: number}> = ({h}) => <div style={{height: h, flexShrink: 0}} />;

/** Tag box (label on a solid block) that scales in; `parts` reveals it word by word. */
export const Tag: React.FC<{t: number; at: number; text?: string; parts?: Array<{text: string; at: number}>; bg: string; color: string; size?: number; rot?: number; out?: number; wdth?: number; self?: 'flex-start' | 'center' | 'flex-end'}> = ({
  t, at, text, parts, bg, color, size = 84, rot = 0, out, wdth = 78, self = 'flex-start',
}) => {
  const q = pb(t, at - 0.04, at + 0.26);
  const o = out !== undefined ? 1 - ps(t, out, out + 0.2) : 1;
  const ps_ = parts ?? [{text: text ?? '', at}];
  return (
    <div style={{alignSelf: self, flexShrink: 0, background: bg, padding: `${size * 0.1}px ${size * 0.24}px ${size * 0.02}px`, transform: `rotate(${rot}deg) scale(${q})`, transformOrigin: '0 50%', opacity: q > 0.01 ? o : 0}}>
      <div style={{fontFamily: HEAD, fontWeight: 900, fontStretch: `${wdth}%`, fontSize: size, color, lineHeight: 1, whiteSpace: 'nowrap', display: 'flex', gap: size * 0.24}}>
        {ps_.map((w, i) => {
          const k = ps(t, w.at - 0.04, w.at + 0.18);
          return <span key={i} style={{display: 'inline-block', opacity: k > 0.01 ? 1 : 0, transform: `translateY(${(1 - k) * 30}%)`}}>{w.text}</span>;
        })}
      </div>
    </div>
  );
};

/** Small folio in the top-left of every card: topic + a time bar that fills over the episode (a timebox motif). */
export const Folio: React.FC<{t: number; dur: number; color: string; label: string; show: number}> = ({t, dur, color, label, show}) => {
  const fr = useFrame();
  const q = ps(t, show, show + 0.4);
  if (q <= 0) return null;
  return (
    <div style={{position: 'absolute', left: fr.pick(72, fr.safe.side), top: fr.pick(92, fr.safe.top), opacity: q}}>
      <div style={{fontFamily: HEAD, fontWeight: 800, fontStretch: '110%', fontSize: 24, letterSpacing: 24 * 0.14, color}}>{label}</div>
      <div style={{marginTop: 10, width: 230, height: 5, background: `${color}33`}}>
        <div style={{width: `${Math.min(100, (100 * t) / dur)}%`, height: '100%', background: color}} />
      </div>
    </div>
  );
};

export type Wipe = 'up' | 'down' | 'left' | 'right' | 'circle' | 'cut';
/** A card that wipes over the previous one; everything for one idea lives inside it. `drift` pushes slowly in. */
export const Card: React.FC<{t: number; start: number; until: number; bg: string; wipe: Wipe; dur?: number; children: React.ReactNode; drift?: number; slow?: number; origin?: string; at?: [number, number]}> = ({
  t, start, until, bg, wipe, dur = 0.32, children, drift = 0.014, slow = 3, origin = '50% 46%', at = [50, 46],
}) => {
  if (t < start || t > until) return null;
  const q = wipe === 'cut' ? 1 : ps(t, start, start + dur);
  const r = (1 - q) * 100;
  const clip = wipe === 'up' ? `inset(${r}% 0 0 0)` : wipe === 'down' ? `inset(0 0 ${r}% 0)` : wipe === 'left' ? `inset(0 0 0 ${r}%)` : wipe === 'right' ? `inset(0 ${r}% 0 0)`
    : wipe === 'circle' ? `circle(${q * 125}% at ${at[0]}% ${at[1]}%)` : 'none';
  // the incoming card's content travels a little with the wipe, then keeps a slow push so type never sits dead
  const push = wipe === 'up' ? `translateY(${r * 1.2}px)` : wipe === 'down' ? `translateY(${-r * 1.2}px)` : wipe === 'left' ? `translateX(${r * 1.2}px)` : wipe === 'right' ? `translateX(${-r * 1.2}px)` : wipe === 'circle' ? `scale(${0.9 + 0.1 * q})` : '';
  const k = Math.min(1, (t - start) / slow);
  const sc = 1 + drift * (1 - (1 - k) * (1 - k));
  return (
    <AbsoluteFill style={{background: bg, clipPath: clip === 'none' ? undefined : clip}}>
      <AbsoluteFill style={{transform: `${push} scale(${sc})`, transformOrigin: origin}}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Outlined copies of a word that scale (tunnel) or step (offset) out behind the solid word. */
export const Echo: React.FC<{t: number; at: number; text: string; size: number; wdth: number; color: string; n?: number; kind?: 'scale' | 'offset'; align?: 'left' | 'center'; ls?: number}> = ({
  t, at, text, size, wdth, color, n = 3, kind = 'scale', align = 'center', ls = LS,
}) => (
  <>
    {Array.from({length: n}, (_, j) => n - j).map((i) => {
      const q = p(t, at + i * 0.05, at + 0.8 + i * 0.05);
      const tf = kind === 'scale' ? `scale(${1 + q * 0.12 * i})` : `translate(${q * 18 * i}px, ${q * 18 * i}px)`;
      return (
        <div key={i} style={{position: 'absolute', left: 0, right: 0, top: 0, textAlign: align, fontFamily: HEAD, fontWeight: 900, fontStretch: `${wdth}%`, fontSize: size, lineHeight: 0.9,
          letterSpacing: size * ls, color: 'transparent', WebkitTextStroke: `${Math.max(3, size * 0.012)}px ${color}`, opacity: q > 0 ? 0.6 / i : 0, transform: tf, whiteSpace: 'nowrap'}}>{text}</div>
      );
    })}
  </>
);

/** A solid rule that grows from one side on its cue (underlines, bars, strikes). */
export const Rule: React.FC<{t: number; at: number; dur?: number; h?: number; w?: number | string; color: string; from?: 'left' | 'right' | 'center'; style?: React.CSSProperties}> = ({
  t, at, dur = 0.4, h = 18, w = '100%', color, from = 'left', style,
}) => {
  const q = ps(t, at, at + dur);
  return <div style={{width: w, height: h, background: color, transform: `scaleX(${q})`, transformOrigin: from === 'left' ? '0 50%' : from === 'right' ? '100% 50%' : '50% 50%', flexShrink: 0, ...style}} />;
};

/** Odometer digits: each reel rolls up `travel` places and eases onto its digit, left→right. Kept slow (a few digits
 *  per second, light speed blur) so the reel never strobes at 60 fps. */
export const Roll: React.FC<{t: number; value: string; start: number; lock: number; step?: number; size: number; wdth: number; color: string; cell?: number; align?: 'center' | 'flex-start'; travel?: number}> = ({
  t, value, start, lock, step = 0.09, size, wdth, color, cell, align = 'center', travel = 3,
}) => {
  const cw = cell ?? size * Math.max(...'0123456789'.split('').map((d) => adv(d, wdth)));
  const h = size * 0.9;
  return (
    <div style={{display: 'flex', justifyContent: align, height: h, overflow: 'hidden', opacity: t < start ? 0 : 1, flexShrink: 0}}>
      {[...value].map((d, i) => {
        const v = Number(d);
        const reel = (tt: number) => v - travel * (1 - p(tt, start, lock + i * step, Easing.bezier(0.25, 0.35, 0.3, 1))); // position in digits
        const pos = reel(t);
        const blur = Math.min(10, Math.abs(reel(t + 1 / 60) - pos) * h * 0.35); // speed blur
        return (
          <div key={i} style={{width: cw, position: 'relative', height: h, filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : undefined}}>
            {[-1, 0, 1].map((k) => {
              const n = Math.floor(pos) + k;
              const y = (n - pos) * h;
              return (
                <div key={k} style={{position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center', transform: `translateY(${y}px)`, fontFamily: HEAD, fontWeight: 900,
                  fontStretch: `${wdth}%`, fontSize: size, lineHeight: 0.9, color}}>{((n % 10) + 10) % 10}</div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

/** Camera punch on hits: a decaying ~6 Hz wobble (slow enough that 60 fps never reads it as a blink). */
export const punch = (t: number, impacts: number[], amp = 14, dur = 0.42) => {
  let x = 0, y = 0;
  impacts.forEach((at, i) => {
    const k = t - at;
    if (k < 0 || k > dur) return;
    const fall = (1 - k / dur) ** 2;
    x += Math.sin(k * 2 * Math.PI * 6 + i) * amp * fall;
    y += Math.cos(k * 2 * Math.PI * 5 + i * 3) * amp * 0.7 * fall;
  });
  return {x, y};
};

/** Print grain over everything. */
export const Grain: React.FC = () => (
  <AbsoluteFill style={{backgroundImage: noise(0.9, 2, 7, 300), opacity: 0.07, mixBlendMode: 'overlay', pointerEvents: 'none'}} />
);

/** Plain text block in the head face (for labels that are not timed word by word). */
export const Txt: React.FC<{children: React.ReactNode; size: number; wdth?: number; color?: string; ls?: number; style?: React.CSSProperties; weight?: number}> = ({children, size, wdth = 100, color = L.paper, ls = LS, style, weight = 900}) => (
  <div style={{fontFamily: HEAD, fontWeight: weight, fontStretch: `${wdth}%`, fontSize: size, lineHeight: 0.9, letterSpacing: size * ls, color, whiteSpace: 'nowrap', ...style}}>{children}</div>
);

/** A huge single glyph behind the type (e.g. "?"), swinging in on its cue. */
/** Default size 1500 / top 160 portrait, 1000 / 0 landscape (the glyph then fills the frame height). */
export const Ghost: React.FC<{t: number; at: number; ch: string; color: string; size?: number; top?: number; rot?: [number, number]}> = ({t, at, ch, color, size: size0, top: top0, rot = [-40, 8]}) => {
  const fr = useFrame();
  const size = size0 ?? fr.pick(1500, 1000), top = top0 ?? fr.pick(160, 0);
  const q = pb(t, at - 0.2, at + 0.6);
  if (q <= 0) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top, textAlign: 'center', fontFamily: HEAD, fontWeight: 900, fontSize: size, lineHeight: 1, color,
      transform: `rotate(${lerp(rot[0], rot[1], q) + Math.sin(t * 0.9) * 2}deg) scale(${0.6 + 0.4 * q})`}}>{ch}</div>
  );
};

/** Giant outlined word drifting sideways behind the type (texture for long cards). */
export const Marquee: React.FC<{t: number; text: string; size: number; top: number; speed?: number; color: string; wdth?: number; from?: number}> = ({t, text, size, top, speed = 60, color, wdth = 120, from = 0}) => (
  <div style={{position: 'absolute', left: 0, top, whiteSpace: 'nowrap', fontFamily: HEAD, fontWeight: 900, fontStretch: `${wdth}%`, fontSize: size, lineHeight: 0.9,
    color: 'transparent', WebkitTextStroke: `3px ${color}`, transform: `translateX(${-((t - from) * speed) % (size * 4) - size}px)`}}>{`${text} ${text} ${text} ${text}`}</div>
);

/** Row of small chips that pop in one after another (days, steps). */
export const Chips: React.FC<{t: number; at: number; items: string[]; bg: string; color: string; step?: number; h?: number; size?: number; hi?: number[]; hiBg?: string}> = ({
  t, at, items, bg, color, step = 0.07, h = 72, size = 40, hi = [], hiBg,
}) => (
  <div style={{display: 'flex', gap: 10, height: h, flexShrink: 0}}>
    {items.map((it, i) => {
      const q = pb(t, at + i * step, at + i * step + 0.28);
      return (
        <div key={i} style={{flex: 1, background: hi.includes(i) && hiBg ? hiBg : bg, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${q})`, opacity: q > 0.01 ? 1 : 0}}>
          <Txt size={size} wdth={100} color={color} style={{lineHeight: 1}}>{it}</Txt>
        </div>
      );
    })}
  </div>
);

/** Span marker |———| of a given width with a solid bar inside whose word stretches/squeezes to fill it. */
export const SpanBar: React.FC<{barW: number; spanW: number; h?: number; text: string; size: number; bg: string; color: string; tick: string; tickQ?: number; q?: number}> = ({
  barW, spanW, h = 170, text, size, bg, color, tick, tickQ = 1, q = 1,
}) => {
  const st = fillWdth(text, size, Math.max(10, barW - 48));
  return (
    <div style={{position: 'relative', height: h + 44, width: '100%', flexShrink: 0}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: spanW, height: h + 44, opacity: tickQ}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: 8, height: '100%', background: tick}} />
        <div style={{position: 'absolute', right: 0, top: 0, width: 8, height: '100%', background: tick}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: (h + 44) / 2 - 2, height: 4, background: tick, opacity: 0.45}} />
      </div>
      <div style={{position: 'absolute', left: 0, top: 22, width: barW, height: h, background: bg, transform: `scaleX(${q})`, transformOrigin: '0 50%', opacity: q > 0.01 ? 1 : 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
        <Txt size={size} wdth={st} color={color} style={{marginTop: size * 0.08}}>{text}</Txt>
      </div>
    </div>
  );
};

/** Two walls that slide in from the frame edges to hug a word of width `inner` (limits, deadlines). Lives in a
 * container (Stack line) of `width` (default: the full measure) whose left edge is at frame x `left` (default: the side
 * margin); pass both when the word sits in a column. */
export const Walls: React.FC<{q: number; inner: number; h: number; color: string; pad?: number; thick?: number; width?: number; left?: number}> = ({q, inner, h, color, pad = 26, thick = 22, width: width0, left: left0}) => {
  const fr = useFrame();
  if (q <= 0) return null;
  const m = measureOf(fr);
  const width = width0 ?? m.w, left = left0 ?? m.side;
  const xl = lerp(-left - thick - 20, (width - inner) / 2 - pad - thick, q);
  const xr = lerp(fr.W - left + 20, (width + inner) / 2 + pad, q);
  return (
    <>
      <div style={{position: 'absolute', left: xl, top: -h * 0.08, width: thick, height: h * 1.16, background: color}} />
      <div style={{position: 'absolute', left: xr, top: -h * 0.08, width: thick, height: h * 1.16, background: color}} />
    </>
  );
};

/** mm:ss countdown that ticks once per second after `from` (a real timer, digits in fixed cells). */
export const Countdown: React.FC<{t: number; from: number; minutes: number; size: number; color: string; q?: number}> = ({t, from, minutes, size, color, q = 1}) => {
  const left = Math.max(0, minutes * 60 - Math.max(0, Math.floor(t - from)));
  const txt = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  return (
    <div style={{display: 'flex', opacity: q}}>
      {[...txt].map((c, i) => (
        <div key={i} style={{width: c === ':' ? size * 0.32 : size * 0.6, textAlign: 'center'}}><Txt size={size} wdth={100} color={color} ls={0}>{c}</Txt></div>
      ))}
    </div>
  );
};

/** Timesheet row: big duration on the left, task words + a bar (length = minutes) on the right. */
export const TimeRow: React.FC<{t: number; dur: Array<{text: string; at: number}>; label: Word[][]; minutes: number; barAt: number; color?: string; barColor?: string; pre?: Word; more?: boolean; wobble?: [number, number]; width?: number}> = ({
  t, dur, label, minutes, barAt, color = L.paper, barColor = L.hot, pre, more, wobble, width,
}) => {
  const m = useMeasure();
  const rowW = width ?? m.w; // the row's width (default: the full measure)
  const colW = 380;
  const durTxt = dur.map((d) => d.text);
  const size = Math.min(150, fit(durTxt, 74, colW));
  const wd = fillWdth(durTxt, size, colW);
  const rightW = rowW - colW - 40;
  const maxBar = rightW;
  const unit = 420 / 60;
  let bw = more ? maxBar - 30 : Math.min(maxBar, minutes * unit);
  if (wobble && t > wobble[0]) bw *= 1 - 0.32 * Math.abs(Math.sin((t - wobble[0]) * 4.2)) * (1 - ps(t, wobble[1] - 0.3, wobble[1]));
  const q = ps(t, barAt, barAt + 0.7);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 40, flexShrink: 0}}>
      <div style={{width: colW, display: 'flex', flexDirection: 'column', gap: 10}}>
        {pre && <Line t={t} words={[pre]} size={48} wdth={100} color={color} />}
        <Line t={t} words={dur} size={size} wdth={wd} color={color} />
      </div>
      <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 14}}>
        {label.map((ln, i) => {
          const txt = ln.map((x) => x.text);
          return <Line key={i} t={t} words={ln} size={58} wdth={Math.min(96, fillWdth(txt, 58, rightW))} color={color} stagger={0.015} />;
        })}
        <div style={{position: 'relative', height: 48}}>
          <div style={{position: 'absolute', left: 0, top: 0, height: 48, width: bw, background: barColor, transform: `scaleX(${q})`, transformOrigin: '0 50%'}} />
          {more && <div style={{position: 'absolute', left: bw * q - 2, top: -8, width: 0, height: 0, borderTop: '32px solid transparent', borderBottom: '32px solid transparent', borderLeft: `34px solid ${barColor}`, opacity: q > 0.9 ? 1 : 0}} />}
        </div>
      </div>
    </div>
  );
};

/** The look's word-synced caption for talky stretches that have no hand-built card: the current page as 1–2 justified
 *  kinetic lines, each word rising on its own start, the spoken word in `hot`. Sits low (top ≈1380) above the UI zone.
 *  Landscape defaults: width 1400 centred, size 96, bottom edge 130 px above the frame bottom (no `top`). */
export const Caption: React.FC<{t: number; pages: CaptionPage[]; top?: number; size?: number; color?: string; hot?: string; width?: number}> = ({
  t, pages, top, size: size0, color = L.paper, hot = L.hot, width: width0,
}) => {
  const fr = useFrame();
  const size = size0 ?? fr.pick(112, 96), width = width0 ?? fr.pick(W, fr.captionW);
  const pos = top !== undefined || !fr.wide ? {top: top ?? 1380} : {bottom: fr.safe.bottom + 10};
  const pg = pageAt(t, pages);
  if (!pg) return null;
  const ws = pg.words.map((w) => ({...w, text: display(w.word).toUpperCase()}));
  const one = fl(ws.map((w) => w.text), size, 70, width);
  let rows = [ws];
  if (one.size < size * 0.82 && ws.length > 1) {
    // two lines, split where the character count balances
    const total = ws.reduce((n, w) => n + w.text.length, 0);
    let acc = 0, cut = 1;
    for (let i = 0; i < ws.length - 1; i++) { acc += ws[i].text.length; if (acc >= total / 2) { cut = i + 1; break; } cut = i + 1; }
    rows = [ws.slice(0, cut), ws.slice(cut)];
  }
  return (
    <div style={{position: 'absolute', left: (fr.W - width) / 2, width, ...pos, display: 'flex', flexDirection: 'column', gap: size * 0.1}}>
      {rows.map((row, r) => (
        <Line key={`${pg.start}-${r}`} t={t} {...fl(row.map((w) => w.text), rows.length === 1 ? size : size * 0.9, 70, width)} stagger={0.015}
          words={row.map((w) => ({text: w.text, at: w.start - 0.04, color: t >= w.start - 0.04 && t < w.end + 0.1 ? hot : color}))} />
      ))}
    </div>
  );
};
