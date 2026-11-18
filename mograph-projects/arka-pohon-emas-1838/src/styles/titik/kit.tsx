import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Easing} from 'remotion';
import {CaptionPage} from '../../components/WordCaptions';
import {display, FORMAT, frameOf, lerp, p, pageAt, renderQuality, rnd, spline, useFrame} from '../shared';
import {SIZE} from '../../format';

// TITIK style kit — unit / particle data visualisation: 1 dot = 1 unit (a day, a person, a percent…).
// Engine: `morph()` chains formation steps per dot (own delay + arc), `dotText()` samples glyphs into exactly N dots,
// `buildKing()` shows how to turn a drawn portrait into halftone cells. Dots are drawn on ONE <canvas> per frame
// (`DotCanvas`), deterministic (seeded `rnd`, never Math.random), over a breathing dot lattice with a subtle bloom.
// DOM pieces (Stat, Callout, ShareBar, Hud, MonoCaption) sit on top. Depends only on react, remotion, ../shared.

export const TK = {ink: '#0B0D12', dot: '#EDEBE6', mute: '#7D828C', coral: '#FF5A4E', cyan: '#4FD1E8', lime: '#B8F34A'};
export const HEAD = "'Tik Head', sans-serif";
export const MONO = "'Tik Mono', monospace";

export type RGB = [number, number, number];
export const rgb = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export const mixRGB = (a: RGB, b: RGB, q: number): RGB => [lerp(a[0], b[0], q), lerp(a[1], b[1], q), lerp(a[2], b[2], q)];
export const css = (c: RGB, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;

export type Dot = {x: number; y: number; r: number; a: number; c: RGB};
export type Formation = (i: number, t: number) => Dot;
export type Step = {
  at: number;
  dur: number;
  to: Formation;
  /** per-dot extra delay (s) */
  delay?: (i: number) => number;
  /** sideways bend of the path as a fraction of its length (each dot gets its own signed share) */
  arc?: number;
  ease?: (q: number) => number;
  /** the step only moves these dots */
  only?: (i: number) => boolean;
  /** all dots bend the same way (a vortex) instead of each choosing a side */
  swirl?: boolean;
};

export const SMOOTH = Easing.bezier(0.65, 0, 0.35, 1);
export const SNAP = Easing.bezier(0.16, 1, 0.3, 1);
export const YANK = Easing.bezier(0.5, -0.18, 0.75, 0.45);

/** State of dot i at time t after the chain of steps. */
export const morph = (i: number, t: number, start: Formation, steps: Step[]): Dot => {
  let s = start(i, t);
  for (const st of steps) {
    if (st.only && !st.only(i)) continue;
    const q = (t - st.at - (st.delay ? st.delay(i) : 0)) / st.dur;
    if (q <= 0) continue;
    const b = st.to(i, t);
    if (q >= 1) {
      s = b;
      continue;
    }
    const e = (st.ease ?? SMOOTH)(q);
    const dx = b.x - s.x;
    const dy = b.y - s.y;
    const bend = Math.sin(Math.PI * Math.min(1, Math.max(0, e))) * (st.arc ?? 0.22) * (st.swirl ? 0.55 + 0.45 * rnd(i * 7.31 + st.at * 3.7) : rnd(i * 7.31 + st.at * 3.7) * 2 - 1);
    s = {x: s.x + dx * e - dy * bend, y: s.y + dy * e + dx * bend, r: Math.max(0, lerp(s.r, b.r, e)), a: Math.min(1, Math.max(0, lerp(s.a, b.a, e))), c: mixRGB(s.c, b.c, Math.min(1, Math.max(0, e)))};
  }
  return s;
};

// ---------- geometry ----------
export type Pt = [number, number];

/** Dense polyline along the same Catmull-Rom curve that shared.spline() draws. */
export const crPoints = (pts: Pt[], closed = false, per = 20): Pt[] => {
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  const out: Pt[] = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    for (let k = 0; k < per; k++) {
      const u = k / per, u2 = u * u, u3 = u2 * u;
      const f = (j: 0 | 1) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3);
      out.push([f(0), f(1)]);
    }
  }
  out.push(closed ? pts[0] : pts[pts.length - 1]);
  return out;
};

/** n points evenly spaced along a polyline (both ends included). */
export const resample = (poly: Pt[], n: number): Pt[] => {
  const cum = [0];
  for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
  const L = cum[cum.length - 1];
  const out: Pt[] = [];
  let j = 1;
  for (let k = 0; k < n; k++) {
    const d = (k / Math.max(1, n - 1)) * L;
    while (j < cum.length - 1 && cum[j] < d) j++;
    const q = (d - cum[j - 1]) / Math.max(1e-6, cum[j] - cum[j - 1]);
    out.push([lerp(poly[j - 1][0], poly[j][0], q), lerp(poly[j - 1][1], poly[j][1], q)]);
  }
  return out;
};

const canvas2d = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return {c, ctx: c.getContext('2d', {willReadFrequently: true}) as CanvasRenderingContext2D};
};

export type DotText = {pts: Pt[]; s: number; box: {x0: number; y0: number; x1: number; y1: number}; hole?: {x: number; y: number; R: number}};

/**
 * Lay out exactly n dots on a square lattice inside the ink of `text` (fitted into the box).
 * The lattice pitch is searched so that the glyph holds ~n dots; extras are dropped evenly.
 * splitDot: keep the bottom detached blob (the dot of "?" / "!") out and report it as `hole`.
 */
export const dotText = (text: string, font: (px: number) => string, box: {cx: number; cy: number; w: number; h: number}, n: number, splitDot = false): DotText => {
  // sampling canvas: from the screen origin to past the box (the text is fitted inside it), so any frame size works
  const W = Math.ceil(box.cx + box.w / 2 + 64), H = Math.ceil(box.cy + box.h / 2 + 64);
  const {ctx} = canvas2d(W, H);
  ctx.font = font(400);
  let m = ctx.measureText(text);
  const k = Math.min(box.w / (m.actualBoundingBoxLeft + m.actualBoundingBoxRight), box.h / (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent));
  ctx.font = font(400 * k);
  m = ctx.measureText(text);
  const x = box.cx - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
  const y = box.cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x, y);
  const img = ctx.getImageData(0, 0, W, H).data;
  const ink = (px: number, py: number) => {
    const X = Math.round(px), Y = Math.round(py);
    return X >= 0 && Y >= 0 && X < W && Y < H && img[(Y * W + X) * 4 + 3] > 127;
  };
  const bb = {x0: Math.floor(x - m.actualBoundingBoxLeft), x1: Math.ceil(x + m.actualBoundingBoxRight), y0: Math.floor(y - m.actualBoundingBoxAscent), y1: Math.ceil(y + m.actualBoundingBoxDescent)};
  let cut = Infinity;
  let hole: DotText['hole'];
  if (splitDot) {
    const rowInk = (yy: number) => {
      for (let xx = bb.x0; xx <= bb.x1; xx++) if (ink(xx, yy)) return true;
      return false;
    };
    let yy = bb.y1;
    while (yy > bb.y0 && !rowInk(yy)) yy--;
    while (yy > bb.y0 && rowInk(yy)) yy--;
    cut = yy;
    let sx = 0, sy = 0, cnt = 0;
    for (let py = cut; py <= bb.y1; py++) for (let px = bb.x0; px <= bb.x1; px++) if (ink(px, py)) { sx += px; sy += py; cnt++; }
    hole = {x: sx / Math.max(1, cnt), y: sy / Math.max(1, cnt), R: Math.sqrt(cnt / Math.PI)};
  }
  const grid = (s: number) => {
    const out: Pt[] = [];
    const i0 = Math.ceil((bb.x0 - box.cx) / s), i1 = Math.floor((bb.x1 - box.cx) / s);
    const j0 = Math.ceil((bb.y0 - box.cy) / s), j1 = Math.floor((bb.y1 - box.cy) / s);
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const px = box.cx + i * s, py = box.cy + j * s;
        if (py < cut && ink(px, py)) out.push([px, py]);
      }
    return out;
  };
  let lo = 3, hi = 140;
  for (let it = 0; it < 36; it++) {
    const mid = (lo + hi) / 2;
    if (grid(mid).length >= n) lo = mid;
    else hi = mid;
  }
  const all = grid(lo);
  const pts = all.length <= n ? all : Array.from({length: n}, (_, q) => all[Math.floor((q * all.length) / n)]);
  while (pts.length < n) pts.push(pts[pts.length % Math.max(1, all.length)] ?? [box.cx, box.cy]);
  return {pts, s: lo, box: bb, hole};
};

// ---------- the suspect: a generic laurelled Roman king in profile (coin portrait), as halftone data ----------
// Coordinates in a 600×700 box, coin centre (300, 350), radius 300. Facing right.
export const KING_HEAD: Pt[] = [
  [215, 700], [222, 600], [205, 520], [168, 470], [140, 400], [132, 320], [146, 240], [185, 170], [245, 122], [320, 102], [392, 116], [442, 152],
  [470, 202], [480, 250], [484, 284], [477, 303], [491, 340], [508, 378], [514, 394], [502, 405], [484, 409], [487, 424], [494, 437], [484, 447],
  [489, 461], [479, 477], [471, 488], [484, 514], [478, 540], [452, 557], [402, 562], [374, 578], [372, 640], [402, 700],
];
const HAIR: Pt[] = [[472, 196], [432, 186], [406, 212], [396, 254], [378, 290], [350, 304], [336, 336], [340, 402], [318, 420], [284, 428], [252, 446], [228, 486], [210, 534], [90, 560], [90, 60], [530, 60], [530, 196]];
export const LAUREL: Pt[] = [[182, 436], [165, 360], [176, 284], [214, 218], [272, 172], [342, 150], [404, 158], [452, 184]];

export type King = {
  /** halftone cells: x, y (portrait coords), value 0–1, laurel 0/1 */
  cells: Float32Array;
  count: number;
  /** profile outline points (portrait coords), back of neck → front of neck */
  outline: Pt[];
};

export const buildKing = (outlineN: number): King => {
  const W = 600, H = 700;
  const {c, ctx} = canvas2d(W, H);
  const head = new Path2D(spline(KING_HEAD, true));
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath();
  ctx.arc(300, 350, 300, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgb(20,20,20)';
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(500, 270, 10, 430, 340, 400);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, '#d9d9d9');
  g.addColorStop(1, '#4a4a4a');
  ctx.fillStyle = g;
  ctx.fill(head);
  ctx.save();
  ctx.clip(head);
  // hair mass with curls
  const hair = new Path2D(spline(HAIR, true));
  ctx.fillStyle = '#3c3c3c';
  ctx.fill(hair);
  ctx.save();
  ctx.clip(hair);
  ctx.lineCap = 'round';
  for (let k = 0; k < 220; k++) {
    const x = 120 + rnd(k * 3.1 + 1) * 380, y = 90 + rnd(k * 5.7 + 2) * 470;
    const rr = 9 + rnd(k * 1.9) * 9;
    ctx.strokeStyle = `rgba(200,200,200,${0.45 + rnd(k * 7.7) * 0.4})`;
    ctx.lineWidth = 4 + rnd(k * 2.3) * 3;
    ctx.beginPath();
    ctx.arc(x, y, rr, rnd(k * 4.4) * 6.28, rnd(k * 4.4) * 6.28 + 3.6);
    ctx.stroke();
  }
  ctx.restore();
  // ear
  ctx.save();
  ctx.translate(306, 356);
  ctx.rotate(-0.16);
  ctx.fillStyle = '#c4c4c4';
  ctx.beginPath();
  ctx.ellipse(0, 0, 25, 44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(2, -2, 15, -1.9, 1.6);
  ctx.stroke();
  ctx.restore();
  // brow, eye, nostril, mouth, jaw and neck shadows
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2b2b2b';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(414, 276);
  ctx.quadraticCurveTo(450, 266, 480, 280);
  ctx.stroke();
  ctx.fillStyle = '#141414';
  ctx.beginPath();
  ctx.moveTo(436, 300);
  ctx.quadraticCurveTo(456, 286, 474, 298);
  ctx.quadraticCurveTo(458, 310, 436, 302);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(488, 396, 9, -2.6, 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(489, 443);
  ctx.quadraticCurveTo(476, 448, 462, 444);
  ctx.stroke();
  ctx.filter = 'blur(14px)';
  ctx.strokeStyle = 'rgba(0,0,0,0.55)';
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.moveTo(330, 446);
  ctx.quadraticCurveTo(380, 540, 470, 556);
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(330, 560, 70, 140);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.arc(440, 382, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.filter = 'none';
  ctx.restore();
  // ribbons tied at the back of the wreath
  ctx.strokeStyle = '#bdbdbd';
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.stroke(new Path2D(spline([[182, 436], [160, 476], [150, 524], [128, 566]])));
  ctx.stroke(new Path2D(spline([[182, 436], [188, 486], [172, 532], [180, 590]])));
  ctx.restore();
  // laurel leaves on a separate mask
  const {c: lc, ctx: lx} = canvas2d(W, H);
  const band = resample(crPoints(LAUREL), 13);
  const leaf = (cx: number, cy: number, ang: number) => {
    for (const cc of [ctx, lx]) {
      cc.save();
      cc.translate(cx, cy);
      cc.rotate(ang);
      cc.fillStyle = '#f2f2f2';
      cc.beginPath();
      cc.ellipse(0, 0, 25, 9.5, 0, 0, Math.PI * 2);
      cc.fill();
      cc.restore();
    }
  };
  band.forEach((pt, k) => {
    if (k === band.length - 1) return;
    const nx = band[k + 1][0] - pt[0], ny = band[k + 1][1] - pt[1];
    const ang = Math.atan2(ny, nx);
    for (const side of [-1, 1]) {
      const a2 = ang + side * 0.62;
      leaf(pt[0] + Math.cos(a2) * 19, pt[1] + Math.sin(a2) * 19, a2);
    }
  });
  leaf(band[band.length - 1][0] + 10, band[band.length - 1][1] + 4, 0.5);
  // soften, then sample on a hex lattice
  const {ctx: bx} = canvas2d(W, H);
  bx.filter = 'blur(2.2px)';
  bx.drawImage(c, 0, 0);
  const lum = bx.getImageData(0, 0, W, H).data;
  const lm = lx.getImageData(0, 0, W, H).data;
  void lc;
  const sp = 12;
  const cells: number[] = [];
  for (let j = 0; ; j++) {
    const y = 8 + j * sp * 0.866;
    if (y > H - 4) break;
    for (let i = 0; ; i++) {
      const x = 8 + i * sp + (j % 2) * sp * 0.5;
      if (x > W - 4) break;
      if ((x - 300) ** 2 + (y - 350) ** 2 > 296 ** 2) continue;
      const o = (Math.round(y) * W + Math.round(x)) * 4;
      const v = lum[o] / 255;
      cells.push(x, y, v, lm[o + 3] > 100 ? 1 : 0);
    }
  }
  // outline: back of neck → over the head → front of neck, inside the coin
  const poly = crPoints(KING_HEAD.slice(1, KING_HEAD.length - 1), false, 24);
  return {cells: new Float32Array(cells), count: cells.length / 4, outline: resample(poly, outlineN)};
};

// ---------- async layouts (fonts must be loaded before glyphs are sampled) ----------
const ASYNC = new Map<string, unknown>();
const FONTS = [`800 400px 'Tik Head'`, `300 100px 'Tik Head'`, `500 40px 'Tik Mono'`];

/** Build a layout once per browser tab, after the TITIK fonts have loaded (holds the render with delayRender). */
export const useAsyncLayout = <T,>(key: string, build: () => T): T | null => {
  const [L, setL] = useState<T | null>((ASYNC.get(key) as T | undefined) ?? null);
  const [handle] = useState(() => (ASYNC.has(key) ? null : delayRender(`titik: ${key}`)));
  useEffect(() => {
    if (ASYNC.has(key)) {
      if (handle !== null) continueRender(handle);
      return;
    }
    let live = true;
    Promise.all(FONTS.map((f) => document.fonts.load(f)))
      .then(() => document.fonts.ready)
      .then(() => {
        const v = build();
        ASYNC.set(key, v);
        if (live) setL(v);
        if (handle !== null) continueRender(handle);
      });
    return () => {
      live = false;
    };
  }, [handle, build, key]);
  return L;
};

export type Layouts = {q: DotText; roma: DotText; king: King};
export const useLayouts = (build: () => Layouts) => useAsyncLayout('proto', build);

// ---------- render quality ----------
/**
 * FULL = the approved look. LITE (renderQuality() === 'lite': chat sandbox / software GL) drops what makes the
 * renderer re-rasterise and filter the whole frame: the CSS bloom over the canvas, the camera drift (canvas + DOM),
 * the per-frame breathing lattice (becomes one static CSS dot pattern); a faint canvas halo per dot stands in for the bloom.
 */
type Quality = {lite: boolean; bloom: boolean; drift: boolean; cssLattice: boolean; res: number};
let QCACHE: Quality | null = null;
export const titikQuality = (): Quality => {
  if (QCACHE) return QCACHE;
  const lite = renderQuality() === 'lite';
  // canvas resolution stays 1: measured, a 0.5× canvas saves only ~27 ms CPU/frame and softens every dot
  return (QCACHE = {lite, bloom: !lite, drift: !lite, cssLattice: lite, res: 1});
};

// ---------- canvas helpers ----------
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const LAT = 40; // background lattice pitch (offset 20)
export const snap = (v: number) => 20 + Math.round((v - 20) / LAT) * LAT;
export const GOLD = Math.PI * (3 - Math.sqrt(5));
const WH = rgb(TK.dot);

/** The breathing dot lattice ("grid paper") every unit sinks into and rises from (covers the DotCanvas frame). */
export const drawLattice = (ctx: CanvasRenderingContext2D, t: number, k = 1) => {
  const Q = titikQuality();
  if (Q.cssLattice) return; // LITE: a static CSS pattern in <Backdrop> instead
  const cols = Math.ceil(ctx.canvas.width / Q.res / LAT), rows = Math.ceil(ctx.canvas.height / Q.res / LAT);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const x = 20 + i * LAT, y = 20 + j * LAT;
      const w = 0.5 + 0.5 * Math.sin(x * 0.0055 + y * 0.0032 - t * 1.3);
      ctx.fillStyle = css(WH, (0.06 + 0.1 * w * w) * k);
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, 6.2832);
      ctx.fill();
    }
};

export const ringStroke = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, dash: number[] = [], lw = 2) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 6.2832);
  ctx.stroke();
  ctx.setLineDash([]);
};

/** One expanding shock ring after t0 (no flash: it only grows and fades). */
export const ping = (ctx: CanvasRenderingContext2D, t: number, t0: number, x: number, y: number, c: RGB, r0 = 10, grow = 70, dur = 0.6, lw = 2.5) => {
  const q = (t - t0) / dur;
  if (q <= 0 || q >= 1) return;
  ringStroke(ctx, x, y, r0 + SNAP(q) * grow, css(c, 0.85 * (1 - q) * (1 - q)), [], lw);
};

const isAccent = (c: RGB) => Math.abs(c[0] - c[2]) > 40 || Math.abs(c[1] - c[2]) > 40;

/** A unit dot: circle when still (with a slow idle wave), a capsule streak from its half-frame-earlier position when moving. */
export const drawDot = (ctx: CanvasRenderingContext2D, d: Dot, pr: Dot, t: number, glow = true) => {
  if (d.a <= 0.004 || d.r <= 0.08) return;
  const dx = d.x - pr.x, dy = d.y - pr.y, len = Math.hypot(dx, dy);
  if (titikQuality().lite) {
    if (d.r > 2.5) {
      // LITE stand-in for the CSS bloom: one faint halo per dot (the bloom filter costs ~0.7 s CPU/frame on software GL)
      ctx.fillStyle = css(d.c, (isAccent(d.c) ? 0.1 : 0.07) * d.a);
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * 1.9, 0, 6.2832);
      ctx.fill();
    }
  } else if (glow && d.r > 6 && isAccent(d.c)) {
    ctx.fillStyle = css(d.c, 0.07 * d.a);
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r * 1.7, 0, 6.2832);
    ctx.fill();
  }
  if (len < 0.9) {
    ctx.fillStyle = css(d.c, d.a);
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r * (1 + 0.035 * Math.sin(d.x * 0.013 + d.y * 0.009 - t * 2.6)), 0, 6.2832);
    ctx.fill();
  } else {
    ctx.strokeStyle = css(d.c, d.a * Math.min(1, (2 * d.r + 2) / (2 * d.r + len)));
    ctx.lineWidth = 2 * d.r;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pr.x, pr.y);
    ctx.lineTo(d.x, d.y);
    ctx.stroke();
  }
};

/** Phyllotaxis (sunflower) position of unit k (0-based) around (x, y) with pitch c. */
export const sunflower = (k: number, x: number, y: number, c: number, spin = 0): Pt => {
  const rr = c * Math.sqrt(k + 1), th = (k + 1) * GOLD + spin;
  return [x + Math.cos(th) * rr, y + Math.sin(th) * rr];
};

// ---------- data helpers: the year, layouts, exact numbers ----------
/** Common (non-leap) year: month lengths, Indonesian short names, and day-of-year (0–364) → month / day-in-month. */
export const YEAR = (() => {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const names = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
  const month = new Int8Array(365), day = new Int8Array(365);
  let d = 0;
  days.forEach((n, m) => {
    for (let k = 0; k < n; k++) {
      month[d] = m;
      day[d] = k;
      d++;
    }
  });
  return {days, names, month, day};
})();
/** `cols` = month blocks per row (default 3 → 3 × 4 portrait wall calendar; landscape: 4 → 4 × 3 or 6 → 6 × 2). */
export type CalLayout = {s: number; x0: number; y0: number; gx: number; gy: number; cols?: number};
/** Day d in a wall calendar of 7-wide month blocks (pitch s, block offsets gx/gy, `cols` blocks per row). */
export const calendarPos = (d: number, L: CalLayout): Pt => {
  const m = YEAR.month[d], k = YEAR.day[d], c = L.cols ?? 3;
  return [L.x0 + (m % c) * L.gx + (k % 7) * L.s, L.y0 + Math.floor(m / c) * L.gy + Math.floor(k / 7) * L.s];
};
/** Top-left of month block m in that calendar (for its label). */
export const calendarBlock = (m: number, L: CalLayout): Pt => [L.x0 + (m % (L.cols ?? 3)) * L.gx, L.y0 + Math.floor(m / (L.cols ?? 3)) * L.gy];
/** Unit k in a row-major grid of `cols` (waffle charts, unit bars). */
export const gridPos = (k: number, cols: number, x0: number, y0: number, s: number, sy = s): Pt => [x0 + (k % cols) * s, y0 + Math.floor(k / cols) * sy];
/** Unit k of n on a circle (first one at the top, clockwise). */
export const onRing = (k: number, n: number, cx: number, cy: number, R: number, start = -Math.PI / 2): Pt => [cx + Math.cos(start + (k / n) * Math.PI * 2) * R, cy + Math.sin(start + (k / n) * Math.PI * 2) * R];
/** All unordered pairs [i, j] (i < j) of n units, in lexicographic order — C(n, 2) of them. */
export const pairsOf = (n: number): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) out.push([i, j]);
  return out;
};
/** Held time for counters/readouts: changes at most `hz` times a second (≤ 20 never strobes at 60 fps). */
export const tick = (t: number, hz = 20) => Math.floor(t * hz) / hz;
/** Indonesian percent with a decimal comma: pctID(0.50729) → "50,73%". Format exact values; never round across a claim. */
export const pctID = (v: number, d = 2) => `${(v * 100).toFixed(d).replace('.', ',')}%`;

// ---------- camera drift + the dot canvas ----------
/** Subtle "breathing" camera (≈1 % zoom, a few px) applied to the canvas AND to world-anchored DOM labels. */
export const drift = (t: number) => ({s: 1 + 0.012 * (0.5 + 0.5 * Math.sin(t * 0.23)), x: 4 * Math.sin(t * 0.17), y: 6 * Math.sin(t * 0.13)});
/** CSS transform of the drift around the frame centre (`fr` default: the project format; components pass useFrame()). */
export const driftCss = (t: number, fr: {cx: number; cy: number} = frameOf(SIZE[FORMAT].width, SIZE[FORMAT].height)) => {
  const c = drift(t);
  return `translate(${c.x}px, ${c.y}px) translate(${fr.cx}px, ${fr.cy}px) scale(${c.s}) translate(-${fr.cx}px, -${fr.cy}px)`;
};
/** DOM layer that moves with the canvas drift (axis labels, callouts that point at dots). Headers/HUD/captions stay outside. */
export const DriftLayer: React.FC<{t: number; on?: boolean; children: React.ReactNode}> = ({t, on = true, children}) => {
  const fr = useFrame();
  return <div style={{position: 'absolute', left: 0, top: 0, width: fr.W, height: fr.H, transform: on && titikQuality().drift ? driftCss(t, fr) : undefined, transformOrigin: '0 0'}}>{children}</div>;
};
/**
 * The one full-frame canvas. `draw(ctx, t)` runs in useLayoutEffect on every frame (so the screenshot always has it),
 * after a clear and the drift transform. Pass draw = null until async layouts are ready. Bloom = subtle CSS drop-shadow.
 */
export const DotCanvas: React.FC<{t: number; draw: ((ctx: CanvasRenderingContext2D, t: number) => void) | null; camera?: boolean; bloom?: boolean}> = ({t, draw, camera = true, bloom = true}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const {W, H, cx, cy} = useFrame();
  const Q = titikQuality();
  const k = Q.res;
  useLayoutEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W * k, H * k);
    if (!draw) return;
    if (camera && Q.drift) {
      const c = drift(t);
      ctx.setTransform(k * c.s, 0, 0, k * c.s, k * (cx + c.x - cx * c.s), k * (cy + c.y - cy * c.s));
    } else if (k !== 1) ctx.setTransform(k, 0, 0, k, 0, 0);
    draw(ctx, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [t, draw, camera, k, Q.drift, W, H, cx, cy]);
  return <canvas ref={ref} width={W * k} height={H * k} style={{position: 'absolute', left: 0, top: 0, width: W, height: H, filter: bloom && Q.bloom ? BLOOM : undefined}} />;
};

// ---------- DOM overlay pieces ----------
export const BLOOM = 'drop-shadow(0 0 9px rgba(237,235,230,0.22))';
export const lab: React.CSSProperties = {fontFamily: MONO, fontWeight: 500, fontSize: 24, letterSpacing: 3, fontStretch: '87.5%', textTransform: 'uppercase'};
export const fade = (t: number, a0: number, b0: number, a1?: number, b1?: number) => p(t, a0, b0) * (a1 === undefined || b1 === undefined ? 1 : 1 - p(t, a1, b1));

/** Ink background: soft centre lift + faint 160 px rule grid (the dot lattice is drawn on the canvas). */
export const Backdrop: React.FC = () =>
  titikQuality().cssLattice ? (
    // LITE: one static layer (centre lift + rule grid + the lattice as a dot pattern at its mean brightness)
    <AbsoluteFill style={{willChange: 'transform', backgroundColor: TK.ink, backgroundImage: 'radial-gradient(circle at 20px 20px, rgba(237,235,230,0.11) 1.6px, transparent 2.2px), linear-gradient(rgba(237,235,230,0.03) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(237,235,230,0.03) 1.5px, transparent 1.5px), radial-gradient(ellipse 80% 55% at 50% 48%, #151925 0%, #0B0D12 70%)', backgroundSize: '40px 40px, 160px 160px, 160px 160px, 100% 100%', backgroundPosition: '0 0, -60px -60px, -60px -60px, 0 0'}} />
  ) : (
    <>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 55% at 50% 48%, #151925 0%, #0B0D12 70%)'}} />
      <AbsoluteFill style={{backgroundImage: 'linear-gradient(rgba(237,235,230,0.03) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(237,235,230,0.03) 1.5px, transparent 1.5px)', backgroundSize: '160px 160px', backgroundPosition: '-60px -60px'}} />
    </>
  );

/** Big display stat: light Manrope figure + a stacked mono label. Enters from below, leaves upwards (0.2 s).
 *  Default spot: top-left header (portrait top 196 / left 64; landscape top 150 / left 110). */
export const Stat: React.FC<{t: number; inAt: number; outAt?: number; num: React.ReactNode; label: string[]; color?: string; size?: number; top?: number; left?: number}> = ({t, inAt, outAt = Infinity, num, label, color = TK.dot, size = 210, top: topP, left: leftP}) => {
  const fr = useFrame();
  const top = topP ?? fr.pick(196, 150), left = leftP ?? fr.pick(64, fr.safe.side);
  const qi = p(t, inAt, inAt + 0.45), qo = Number.isFinite(outAt) ? p(t, outAt, outAt + 0.2) : 0;
  if (qi <= 0.001 || qo >= 0.999) return null;
  return (
    <div style={{position: 'absolute', left, top, display: 'flex', alignItems: 'flex-end', gap: 26, opacity: qi * (1 - qo), transform: `translateY(${(1 - qi) * 46 - qo * 40}px)`}}>
      <div style={{fontFamily: HEAD, fontWeight: 300, fontSize: size, lineHeight: 0.86, letterSpacing: -size * 0.045, color, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}>{num}</div>
      <div style={{...lab, color, opacity: 0.8, lineHeight: 1.45, paddingBottom: size * 0.06, whiteSpace: 'nowrap'}}>{label.map((l, k) => <div key={k}>{l}</div>)}</div>
    </div>
  );
};

/** Thin leader line + mono note (data annotation), drawn on with q 0→1. */
export const Callout: React.FC<{q: number; from: Pt; elbow: Pt; to: Pt; text: string[]; color?: string; align?: 'left' | 'right' | 'below'}> = ({q, from, elbow, to, text, color = TK.dot, align = 'left'}) => {
  const {W, H} = useFrame();
  if (q <= 0.001) return null;
  const l1 = Math.max(1, Math.hypot(elbow[0] - from[0], elbow[1] - from[1])), l2 = Math.max(1, Math.hypot(to[0] - elbow[0], to[1] - elbow[1]));
  const drawn = q * (l1 + l2);
  const e1 = Math.min(1, drawn / l1), e2 = clamp01((drawn - l1) / l2);
  const tq = clamp01((q - 0.55) / 0.45);
  return (
    <>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        <circle cx={from[0]} cy={from[1]} r={5} fill="none" stroke={color} strokeWidth={2} opacity={Math.min(1, q * 3)} />
        <line x1={from[0]} y1={from[1]} x2={lerp(from[0], elbow[0], e1)} y2={lerp(from[1], elbow[1], e1)} stroke={color} strokeWidth={1.6} opacity={0.8} />
        {e2 > 0 && <line x1={elbow[0]} y1={elbow[1]} x2={lerp(elbow[0], to[0], e2)} y2={lerp(elbow[1], to[1], e2)} stroke={color} strokeWidth={1.6} opacity={0.8} />}
      </svg>
      <div style={{position: 'absolute', top: align === 'below' ? to[1] + 10 : to[1] - 34, ...(align === 'right' ? {right: W - to[0] + 10} : {left: align === 'below' ? Math.min(to[0], elbow[0]) : to[0] + 10}), ...lab, fontSize: 22, color, lineHeight: 1.4, opacity: tq, textAlign: align === 'right' ? 'right' : 'left', transform: `translateY(${(1 - tq) * 10}px)`, whiteSpace: 'nowrap'}}>
        {text.map((x, k) => <div key={k}>{x}</div>)}
      </div>
    </>
  );
};

/** One clean mono caption line; the spoken word turns accent-coloured and underlined (frame-exact).
 *  Portrait top 1584; landscape centred in a 1400 px band at top 890 (underline ends ≈ 950, above the 120 px margin). */
export const MonoCaption: React.FC<{t: number; pages: CaptionPage[]; accent?: (word: string) => string; top?: number; size?: number}> = ({t, pages, accent = () => TK.coral, top: topP, size = 46}) => {
  const fr = useFrame();
  const pg = pageAt(t, pages);
  if (!pg) return null;
  const q = p(t, pg.start - 0.08, pg.start + 0.12);
  const top = topP ?? fr.pick(1584, fr.H - fr.safe.bottom - 70), side = fr.pick(64, (fr.W - fr.captionW) / 2);
  return (
    <div style={{position: 'absolute', left: side, right: side, top, display: 'flex', justifyContent: 'center', opacity: q, transform: `translateY(${(1 - q) * 12}px)`}}>
      <div style={{fontFamily: MONO, fontWeight: 500, fontSize: size, fontStretch: '87.5%', letterSpacing: -0.5, lineHeight: 1.2, whiteSpace: 'nowrap', color: TK.dot}}>
        {pg.words.map((w, k) => {
          const next = pg.words[k + 1];
          const on = t >= w.start - 0.03 && t < (next ? next.start : w.end + 0.3);
          const said = t >= w.start - 0.03;
          const c = accent(w.word);
          return (
            <React.Fragment key={w.i}>
              <span style={{color: on ? c : said ? TK.dot : 'rgba(237,235,230,0.3)', textDecoration: on ? 'underline' : 'none', textDecorationThickness: 4, textUnderlineOffset: 12, textDecorationColor: c}}>{display(w.word)}</span>
              {k < pg.words.length - 1 ? ' ' : ''}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

/** Instrument frame: brand + topic top-left, legend top-right, ruler rule, progress rule, live dot count + chapter.
 *  Portrait: rows at 96 / 136 (ruler) … 1500 (progress) / 1526. Landscape: 64 / 100 … 790 / 816, sides 110 (the
 *  caption sits under it at 890). */
export const Hud: React.FC<{t: number; duration: number; live: number; topic: string; legend: React.ReactNode; chapter: number; chapters: number}> = ({t, duration, live, topic, legend, chapter, chapters}) => {
  const fr = useFrame();
  const x0 = fr.pick(64, fr.safe.side), x1 = fr.W - x0, w = x1 - x0;
  const n = Math.round(w / 23.8); // ruler ticks every ≈ 23.8 px (40 gaps in portrait)
  return (
  <>
    <div style={{position: 'absolute', left: x0, right: x0, top: fr.pick(96, fr.safe.top), display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...lab, fontSize: 22, color: 'rgba(237,235,230,0.62)'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
        <span style={{fontFamily: HEAD, fontWeight: 800, fontSize: 26, letterSpacing: 6, color: TK.dot}}>TITIK</span>
        <span>/ {topic}</span>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 12}}>{legend}</div>
    </div>
    <svg width={fr.W} height={40} style={{position: 'absolute', left: 0, top: fr.pick(136, 100)}}>
      <line x1={x0} y1={10} x2={x1} y2={10} stroke={TK.dot} strokeOpacity={0.28} strokeWidth={1.5} />
      {Array.from({length: n + 1}).map((_, k) => (
        <line key={k} x1={x0 + k * (w / n)} y1={10} x2={x0 + k * (w / n)} y2={k % 5 === 0 ? 22 : 15} stroke={TK.dot} strokeOpacity={k % 5 === 0 ? 0.4 : 0.2} strokeWidth={1.5} />
      ))}
    </svg>
    <svg width={fr.W} height={40} style={{position: 'absolute', left: 0, top: fr.pick(1500, 790)}}>
      <line x1={x0} y1={10} x2={x1} y2={10} stroke={TK.dot} strokeOpacity={0.22} strokeWidth={1.5} />
      <line x1={x0} y1={10} x2={x0 + w * clamp01(t / duration)} y2={10} stroke={TK.dot} strokeOpacity={0.7} strokeWidth={2.5} />
    </svg>
    <div style={{position: 'absolute', left: x0, right: x0, top: fr.pick(1526, 816), display: 'flex', justifyContent: 'space-between', ...lab, fontSize: 20, color: 'rgba(237,235,230,0.55)'}}>
      <span>TITIK AKTIF <span style={{color: TK.dot}}>{String(live).padStart(3, '0')}</span></span>
      <span>BAB <span style={{color: TK.dot}}>{String(chapter).padStart(2, '0')}</span> / {String(chapters).padStart(2, '0')}</span>
    </div>
  </>
  );
};

/**
 * Two-part share bar (e.g. "all different" vs "someone shares"): v = left share 0–1 (animate it smoothly), the texts
 * carry the EXACT values. `mid` marks ½ (or any label) at the centre tick.
 */
export const ShareBar: React.FC<{v: number; o?: number; left: string; right: string; leftValue: string; rightValue: string; leftColor?: string; rightColor?: string; top?: number; mid?: string | null; midColor?: string; x?: number; width?: number}> = ({
  v, o = 1, left, right, leftValue, rightValue, leftColor = TK.lime, rightColor = TK.coral, top: topP, mid = '½', midColor = TK.dot, x, width,
}) => {
  // full width between the side margins by default (landscape top 690); `x`/`width` put it in a column
  const fr = useFrame();
  if (o < 0.01) return null;
  const top = topP ?? fr.pick(1388, 690);
  const x0 = x ?? fr.pick(64, fr.safe.side), w = width ?? fr.W - 2 * x0, xs = x0 + w * clamp01(v);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: fr.W, height: fr.H, opacity: o}}>
      <div style={{position: 'absolute', left: x0, top, ...lab, fontSize: 20, color: leftColor}}>
        {left} <span style={{color: TK.dot, marginLeft: 8}}>{leftValue}</span>
      </div>
      <div style={{position: 'absolute', right: fr.W - x0 - w, top, ...lab, fontSize: 20, color: rightColor, textAlign: 'right'}}>
        <span style={{color: TK.dot, marginRight: 8}}>{rightValue}</span> {right}
      </div>
      <svg width={fr.W} height={80} style={{position: 'absolute', left: 0, top: top + 32}}>
        <rect x={x0} y={20} width={Math.max(0, xs - x0)} height={10} fill={leftColor} />
        <rect x={xs} y={20} width={Math.max(0, x0 + w - xs)} height={10} fill={rightColor} />
        {mid !== null && (
          <>
            <line x1={x0 + w / 2} y1={8} x2={x0 + w / 2} y2={42} stroke={TK.dot} strokeWidth={2} strokeDasharray="3 3" />
            <text x={x0 + w / 2} y={62} textAnchor="middle" fill={midColor} fillOpacity={0.8} style={{...lab, fontSize: 18}}>{mid}</text>
          </>
        )}
      </svg>
    </div>
  );
};

/** Legend chip: a dot swatch + "= 1 X". */
export const Legend: React.FC<{color?: string; size?: number; text: string; opacity?: number}> = ({color = TK.dot, size = 14, text, opacity = 1}) => (
  <span style={{display: 'inline-flex', alignItems: 'center', gap: 10, opacity}}>
    <span style={{width: size, height: size, borderRadius: size / 2, background: color, display: 'inline-block'}} />
    <span>{text}</span>
  </span>
);
