import React from 'react';
import {AbsoluteFill, continueRender, delayRender, getInputProps, useCurrentFrame, useVideoConfig} from 'remotion';
import {FORMAT, noise, rnd, spline, useFrame} from '../shared';
import {SIZE} from '../../format';

// LEMPUNG kit — claymation (2.5D plasticine stop-motion) on a tabletop paper-sweep set. Flat HTML/SVG shapes become
// clay through the filter ids in <ClayDefs/> (slabA/B/C, big, txtA/B, fine, cap) and cf() fills; motion is held on a
// 12 fps clock with squash & stretch keyframes (drop/press/pop/puff/flatten), transitions are a rolling pin or a dough
// sheet slap (<Timeline/>), captions sit on a rolled-dough strip. Quality: LITE by default (GPU-less, ≈0.3–0.5 s Chrome CPU/frame:
// boiling lumpy outlines + grain + matte gradients, no blur),
// FULL with --props='{"clay":"full"}' (+ --gl=angle). Props/puppets live in ./props.tsx. No episode/words/audio imports.

export const L = {
  cream: '#FFF4E2', backdrop: '#F1E3CF', sweep: '#E8D3B6',
  tomato: '#E2553B', mustard: '#F2B33D', teal: '#2E9C8F', lilac: '#9C7BD8',
  cocoa: '#6B4532', ink: '#3B2A20', skin: '#EDAE86', skinDk: '#DC9068', pink: '#EE8E9C', wood: '#D7A06B', sky: '#8CC7E8',
};
export const HEAD = "'Lem Head', sans-serif";
export const HZ = 12;
/** Hold index since `at` on the global 12 fps grid (0 = first hold at/after `at`). */
export const kAt = (tq: number, at: number) => Math.floor((tq - at) * HZ + 1e-4);

// ---------- render quality ----------
// 'full' = the real clay filter (turbulence boil + blurred-alpha lighting): beautiful, but ~1.25 s/frame on software GL
// (Chrome runs every SVG filter in ONE GPU process, so --concurrency does not help). Use it only with a GPU
// (`npx remotion render … --gl=angle --props='{"clay":"full"}'`).
// 'lite' (DEFAULT) = no blur/turbulence/lighting at all: lumpy outlines re-seeded per hold (blobEllipse/blobRect/wobPath +
// useBoil, characters only), a pre-rasterised dimple grain over bodies (ClayG), matte gradients (cf), compositor layers, CSS bodies with grain
// and hard rims, chunky hard text-shadows, hard inner rims + one hard drop shadow per group. ≈0.3–0.5 s Chrome CPU/frame (swangle).
export type ClayQuality = 'full' | 'lite';
/** Set to 'full' to force the full filter from code (e.g. a GPU machine rendering through `npm run render`, which cannot
 *  pass --props or --gl). null = follow the input prop `clay` (default lite). */
const FORCE_CLAY: ClayQuality | null = null;
// Input props: `clay` wins if set; else the shared `quality` prop counts only when explicitly passed (deliberately NOT
// shared.renderQuality()'s auto-detect: FULL costs ~2 s/frame without a GPU even on many-thread machines). Default LITE.
const CLAY_PROPS = getInputProps() as {clay?: string; quality?: string};
export const CLAY: ClayQuality = FORCE_CLAY ?? (CLAY_PROPS.clay === 'full' || CLAY_PROPS.clay === 'lite' ? CLAY_PROPS.clay : CLAY_PROPS.quality === 'full' ? 'full' : 'lite');
export const LITE = CLAY === 'lite';

const hex6 = (c: string) => /^#[0-9a-fA-F]{6}$/.test(c);
/** Mix two #rrggbb colours (q 0 → a, 1 → b). */
export const mixColor = (a: string, b: string, q: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * q).toString(16).padStart(2, '0')).join('');
};
export const lighten = (c: string, q: number) => (hex6(c) ? mixColor(c, '#FFF8EC', q) : c);
export const darken = (c: string, q: number) => (hex6(c) ? mixColor(c, '#2A160C', q) : c);
const GRADS = new Set<string>();
/** Clay fill for SVG shapes: in lite a matte per-shape radial gradient (broad soft light top-left → colour → darker
 *  lower rim), in full the flat colour (the filter does the light). Non-hex colours pass through.
 *  Needs <ClayGrads/> rendered LAST in the tree. */
export const cf = (c: string) => {
  if (!LITE || !hex6(c)) return c;
  const k = c.slice(1).toLowerCase();
  GRADS.add(k);
  return `url(#cg-${k})`;
};

// ---- lite surface: a pre-baked tile of fine even dimples (faint dark dot under a faint light dot), a few faint thumb
// smudges and two barely-visible thumbprint whorls (deterministic, built once) ----
const TEX = 120;
const GRID = 9;
const DIMPLE = Array.from({length: GRID * GRID}).map((_, i) => {
  const cell = TEX / GRID, gx = i % GRID, gy = Math.floor(i / GRID);
  return {x: (gx + 0.2 + rnd(i * 3.17 + 1) * 0.6) * cell, y: (gy + 0.2 + rnd(i * 5.71 + 2) * 0.6) * cell, r: 0.8 + rnd(i * 2.3) * 1.1};
});
const SMUDGE = [[24, 30, 8, 3.4, 25], [86, 22, 7, 3, -40], [60, 78, 9, 3.6, 60], [104, 100, 6.5, 2.8, 10]];
const texShapes = () => {
  const out: string[] = [];
  for (const d of DIMPLE) {
    out.push(`<circle cx='${d.x.toFixed(1)}' cy='${(d.y + d.r * 0.45).toFixed(1)}' r='${d.r.toFixed(2)}' fill='#3a1e0c' fill-opacity='0.038'/>`);
    out.push(`<circle cx='${d.x.toFixed(1)}' cy='${(d.y - d.r * 0.45).toFixed(1)}' r='${(d.r * 0.8).toFixed(2)}' fill='#fff8ea' fill-opacity='0.05'/>`);
  }
  for (const [x, y, rx, ry, r] of SMUDGE) {
    for (const ox of [-TEX, 0, TEX]) for (const oy of [-TEX, 0, TEX]) {
      const cx = x + ox, cy = y + oy;
      if (cx < -12 || cx > TEX + 12 || cy < -12 || cy > TEX + 12) continue;
      out.push(`<ellipse cx='${cx}' cy='${cy}' rx='${rx}' ry='${ry}' transform='rotate(${r} ${cx} ${cy})' fill='#3a1e0c' fill-opacity='0.016'/>`);
      out.push(`<ellipse cx='${cx - 0.8}' cy='${cy - 1}' rx='${rx * 0.8}' ry='${ry * 0.6}' transform='rotate(${r} ${cx} ${cy})' fill='#fff8ea' fill-opacity='0.03'/>`);
    }
  }
  for (const [cx, cy, rot] of [[34, 40, 20], [90, 92, -35]]) {
    for (let i = 0; i < 5; i++) {
      const rx = 2.4 + i * 2.6, ry = 1.9 + i * 2.1;
      out.push(`<ellipse cx='${cx}' cy='${cy}' rx='${rx.toFixed(1)}' ry='${ry.toFixed(1)}' transform='rotate(${rot} ${cx} ${cy})' fill='none' stroke='#3a1e0c' stroke-opacity='0.022' stroke-width='0.7' stroke-dasharray='${(rx * 4).toFixed(1)} ${(rx * 1.3).toFixed(1)}'/>`);
    }
  }
  return out.join('');
};
let TEX_PNG = '';
/** The tile rasterised once to a PNG data URL (canvas, deterministic). */
const texPng = () => {
  if (TEX_PNG || typeof document === 'undefined') return TEX_PNG;
  const k = 3, cv = document.createElement('canvas');
  cv.width = TEX * k; cv.height = TEX * k;
  const g = cv.getContext('2d');
  if (!g) return '';
  g.scale(k, k);
  // draw the same SVG tile once (dimples, smudges, whorls) via an Image is async; draw the shapes directly instead
  for (const d of DIMPLE) {
    g.fillStyle = 'rgba(58,30,12,0.038)'; g.beginPath(); g.arc(d.x, d.y + d.r * 0.45, d.r, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,248,234,0.05)'; g.beginPath(); g.arc(d.x, d.y - d.r * 0.45, d.r * 0.8, 0, Math.PI * 2); g.fill();
  }
  for (const [x, y, rx, ry, r] of SMUDGE) for (const ox of [-TEX, 0, TEX]) for (const oy of [-TEX, 0, TEX]) {
    g.save(); g.translate(x + ox, y + oy); g.rotate((r * Math.PI) / 180);
    g.fillStyle = 'rgba(58,30,12,0.016)'; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,248,234,0.03)'; g.beginPath(); g.ellipse(-0.8, -1, rx * 0.8, ry * 0.6, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  g.strokeStyle = 'rgba(58,30,12,0.022)'; g.lineWidth = 0.7;
  for (const [cx, cy, rot] of [[34, 40, 20], [90, 92, -35]]) for (let i = 0; i < 5; i++) {
    g.save(); g.translate(cx, cy); g.rotate((rot * Math.PI) / 180);
    g.beginPath(); g.ellipse(0, 0, 2.4 + i * 2.6, 1.9 + i * 2.1, 0, 0.3, Math.PI * 1.6); g.stroke();
    g.restore();
  }
  TEX_PNG = cv.toDataURL('image/png');
  return TEX_PNG;
};
const TEX_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='${TEX}' height='${TEX}'>${texShapes()}</svg>`;
/** The same tile as a CSS background image (pills, caption, crumbs, any HTML clay). */
export const CLAY_TEX = `url("data:image/svg+xml;utf8,${encodeURIComponent(TEX_SVG)}")`;

/** Gradient defs for every colour passed to cf() this render + the clay texture pattern. Place it LAST in the root. */
export const ClayGrads: React.FC = () => {
  if (!LITE) return null;
  return (
    <svg width={0} height={0} style={{position: 'absolute'}}>
      <style>{'.lem-tex *{fill:url(#lemTex)!important;stroke:none!important}.lem-tex text,.lem-tex [fill="none"]{display:none}'}</style>
      <defs>
        <pattern id="lemTex" patternUnits="userSpaceOnUse" width={TEX} height={TEX}>
          {/* the tile as one pre-rasterised PNG: a vector pattern of ~200 shapes cost ~0.85 s CPU/frame in SwiftShader */}
          <image href={texPng()} width={TEX} height={TEX} />
        </pattern>
        {[...GRADS].map((k) => {
          const c = '#' + k;
          return (
            <radialGradient key={k} id={`cg-${k}`} cx={0.42} cy={0.36} r={0.78} fx={0.32} fy={0.26}>
              <stop offset={0} stopColor={lighten(c, 0.16)} />
              <stop offset={0.45} stopColor={lighten(c, 0.05)} />
              <stop offset={0.72} stopColor={c} />
              <stop offset={0.9} stopColor={darken(c, 0.14)} />
              <stop offset={1} stopColor={darken(c, 0.26)} />
            </radialGradient>
          );
        })}
      </defs>
    </svg>
  );
};
/** CSS clay body for HTML boxes in lite (matte gradient + grain tile + hard inset rims + hard drop shadow; no blur). */
export const liteBody = (c: string, sh = 1): React.CSSProperties => (hex6(c) ? {
  background: `${CLAY_TEX}, radial-gradient(ellipse 85% 80% at 34% 26%, ${lighten(c, 0.14)} 0%, ${lighten(c, 0.04)} 40%, ${c} 72%, ${darken(c, 0.2)} 100%)`,
  boxShadow: `inset ${2 * sh}px ${3 * sh}px 0 rgba(255,250,235,0.16), inset ${-4 * sh}px ${-6 * sh}px 0 rgba(40,20,10,0.13), ${7 * sh}px ${10 * sh}px 0 rgba(52,30,16,0.2)`,
} : {background: c});

// ---- lite geometry: lumpy outlines that boil (re-seeded per 12 fps hold on a 3-drawing cycle) ----
/** 0, 1, 2 — the boil drawing for this frame (always 0 in full, where the filter boils instead). In lite only `hero`
 *  shapes (characters) boil: a big prop that changes every hold forces Chrome to re-rasterise it every hold
 *  (software GL), so props keep a static lumpy outline. */
export const useBoil = (hero = false) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return LITE && hero ? Math.floor((f * HZ) / fps) % 3 : 0;
};
const wn = (seed: number, i: number, boil: number) => rnd(seed * 17.13 + i * 7.31 + boil * 101.7) - 0.5;
type Pt2 = [number, number];
/** Ellipse outline through n points; in lite each point is pushed in/out by ±amp (fraction of the radius). */
export const blobEllipse = (cx: number, cy: number, rx: number, ry: number, seed: number, boil = 0, amp = 0.05, n = 10) => {
  const pts: Pt2[] = [];
  for (let i = 0; i < n; i++) {
    const an = (i / n) * Math.PI * 2;
    const k = 1 + (LITE ? wn(seed, i, boil) * 2 * amp : 0);
    pts.push([cx + Math.cos(an) * rx * k, cy + Math.sin(an) * ry * k]);
  }
  return spline(pts, true) + ' Z';
};
/** Rounded-rect outline (radii tl tr br bl) as a smooth closed spline; in lite points move ±amp px along the normal. */
export const blobRect = (x: number, y: number, w: number, h: number, r: number | [number, number, number, number], seed: number, boil = 0, amp = 3) => {
  const [tl, tr, br, bl] = (Array.isArray(r) ? r : [r, r, r, r]).map((v) => Math.max(1, Math.min(v, w / 2, h / 2)));
  const pts: Pt2[] = [];
  const corner = (cx: number, cy: number, rr: number, a0: number) => { for (let k = 0; k <= 2; k++) { const an = a0 + (k / 2) * (Math.PI / 2); pts.push([cx + Math.cos(an) * rr, cy + Math.sin(an) * rr]); } };
  const edge = (x0: number, y0: number, x1: number, y1: number) => { const n = Math.max(0, Math.round(Math.hypot(x1 - x0, y1 - y0) / 110) - 1); for (let k = 1; k <= n; k++) pts.push([x0 + ((x1 - x0) * k) / (n + 1), y0 + ((y1 - y0) * k) / (n + 1)]); };
  corner(x + tl, y + tl, tl, Math.PI); edge(x + tl, y, x + w - tr, y);
  corner(x + w - tr, y + tr, tr, -Math.PI / 2); edge(x + w, y + tr, x + w, y + h - br);
  corner(x + w - br, y + h - br, br, 0); edge(x + w - br, y + h, x + bl, y + h);
  corner(x + bl, y + h - bl, bl, Math.PI / 2); edge(x, y + h - bl, x, y + tl);
  const cx = x + w / 2, cy = y + h / 2;
  const moved = pts.map(([px, py], i) => {
    if (!LITE) return [px, py] as Pt2;
    const d = Math.hypot(px - cx, py - cy) || 1;
    const k = wn(seed, i, boil) * 2 * amp;
    return [px + ((px - cx) / d) * k, py + ((py - cy) / d) * k] as Pt2;
  });
  return spline(moved, true) + ' Z';
};
/** Lumpy edges for drawn paths (absolute M/L/C/Q/Z only), lite only: every anchor point moves by a seeded ±amp
 *  offset and drags the control points that belong to it, so curves stay smooth (no kinks), just uneven. */
export const wobPath = (d: string, seed: number, boil = 0, amp = 3) => {
  if (!LITE) return d;
  const toks = d.match(/[MLCQZmlcqz]|-?\d*\.?\d+/g) ?? [];
  // offsets are keyed by the anchor's coordinates, so a closing point equal to the start moves with it (no seam)
  const off = (x: number, y: number): [number, number] => [wn(seed + x * 0.0131, Math.round(y * 7.7), boil) * 2 * amp, wn(seed + y * 0.0173, Math.round(x * 5.3) + 1, boil) * 2 * amp];
  let i = 0, out = '', cmd = '';
  let last: [number, number] = [0, 0];
  const at = (k: number) => parseFloat(toks[i + k]);
  const fmt = (x: number, y: number, o: [number, number]) => `${(x + o[0]).toFixed(1)} ${(y + o[1]).toFixed(1)}`;
  while (i < toks.length) {
    const t = toks[i];
    if (/[A-Za-z]/.test(t)) { cmd = t.toUpperCase(); i++; out += cmd === 'Z' ? 'Z ' : cmd + ' '; continue; }
    if (cmd === 'M' || cmd === 'L') { const o = off(at(0), at(1)); out += fmt(at(0), at(1), o) + ' '; last = o; i += 2; }
    else if (cmd === 'C') { const o = off(at(4), at(5)); out += `${fmt(at(0), at(1), last)} ${fmt(at(2), at(3), o)} ${fmt(at(4), at(5), o)} `; last = o; i += 6; }
    else if (cmd === 'Q') { const o = off(at(2), at(3)); const m: [number, number] = [(last[0] + o[0]) / 2, (last[1] + o[1]) / 2]; out += `${fmt(at(0), at(1), m)} ${fmt(at(2), at(3), o)} `; last = o; i += 4; }
    else { out += toks[i++] + ' '; }
  }
  return out.trim();
};
/** A clay group: the filter id plus (lite) the same shapes again with the grain pattern forced on by CSS. */
export const ClayG: React.FC<{f: string; tex?: boolean; flat?: boolean; children: React.ReactNode; clipPath?: string; transform?: string}> = ({f, tex, flat, children, clipPath, transform}) => (
  // `flat`: in lite no filter at all (big/zoomed or crowded groups — a filter re-runs on every re-raster in software GL)
  <g filter={LITE && flat ? undefined : `url(#${f})`} clipPath={clipPath} transform={transform}>
    {children}
    {LITE && (tex ?? (f !== 'fine' && f !== 'txtA' && f !== 'txtB')) && <g className="lem-tex">{children}</g>}
  </g>
);
/** Chunky clay letters in lite: rim light, 2-step extrusion, hard drop shadow. */
export const liteText = (c: string, size: number) => {
  const u = Math.max(1, size / 120);
  return `${-1.6 * u}px ${-1.6 * u}px 0 ${lighten(c, 0.4)}, ${1.6 * u}px ${2.6 * u}px 0 ${darken(c, 0.22)}, ${3 * u}px ${5 * u}px 0 ${darken(c, 0.34)}, ${7 * u}px ${11 * u}px 0 rgba(52,30,16,0.2)`;
};

// ---------- squash & stretch keyframes (one row per hold) ----------
export type SQ = {x: number; y: number; sx: number; sy: number; r: number; on: boolean};
export const ID: SQ = {x: 0, y: 0, sx: 1, sy: 1, r: 0, on: true};
const OFF: SQ = {...ID, on: false};
const keys = (rows: number[][], k: number, first: number): SQ => {
  const i = k - first;
  if (i < 0) return OFF;
  const row = rows[Math.min(i, rows.length - 1)];
  return {x: row[3] ?? 0, y: row[0], sx: row[1], sy: row[2], r: 0, on: true};
};
/** Falls in and squashes on the floor exactly on `at`. */
export const drop = (tq: number, at: number, fall = 1): SQ => {
  const s = keys([[-260, 0.8, 1.26], [-95, 0.87, 1.17], [0, 1.26, 0.74], [-20, 0.92, 1.1], [0, 1.05, 0.96], [0, 0.99, 1.01], [0, 1, 1]], kAt(tq, at), -2);
  return {...s, y: s.y * fall};
};
/** Thumb-pressed onto the wall on `at`. */
export const press = (tq: number, at: number): SQ =>
  keys([[-16, 1.34, 1.34], [0, 1.2, 0.8], [0, 0.94, 1.08], [0, 1.02, 0.99], [0, 1, 1]], kAt(tq, at), -1);
/** Grows out of the floor, fully up on `at`. */
export const pop = (tq: number, at: number): SQ =>
  keys([[0, 0.5, 0.22], [0, 0.84, 1.26], [0, 1.12, 0.9], [0, 0.97, 1.04], [0, 1, 1]], kAt(tq, at), -1);
/** Squashed flat and removed from `at`. */
export const flatten = (tq: number, at: number): SQ => {
  const k = kAt(tq, at);
  if (k < 0) return ID;
  if (k === 0) return {...ID, sx: 1.12, sy: 0.62};
  if (k === 1) return {...ID, sx: 1.3, sy: 0.22};
  return OFF;
};
/** Inflates from scale a to scale b on `at` (anticipation squash first). */
export const puff = (tq: number, at: number, a: [number, number], b: [number, number]): [number, number] => {
  const k = kAt(tq, at);
  if (k < -1) return a;
  if (k === -1) return [a[0] * 1.08, a[1] * 0.88];
  const rows: number[][] = [[0.94, 1.16], [1.06, 0.95], [0.98, 1.03], [1, 1]];
  const r = rows[Math.min(k, rows.length - 1)];
  return [b[0] * r[0], b[1] * r[1]];
};
export const mul = (a: SQ, b: SQ): SQ => ({x: a.x + b.x, y: a.y + b.y, sx: a.sx * b.sx, sy: a.sy * b.sy, r: a.r + b.r, on: a.on && b.on});
/** Animator's touch: tiny per-hold offset (changes only on holds, never per frame). */
export const jig = (hold: number, id: number, amt = 1) => ({
  x: (rnd(hold * 1.7 + id * 9.1) - 0.5) * 2.4 * amt,
  y: (rnd(hold * 2.3 + id * 4.7) - 0.5) * 2.4 * amt,
  r: (rnd(hold * 3.1 + id * 0.7) - 0.5) * 0.9 * amt,
});

// ---------- the clay filter ----------
type FOpts = {seed: number; blur: number; disp: number; surf: number; freq: number; grain?: number; spec?: number; sh?: number; region?: [string, string, string, string]};
const ClayFilter: React.FC<{id: string; boil: number} & FOpts> = ({id, boil, seed, blur, disp, surf, freq, grain = 0.034, spec = 0.55, sh = 1, region = ['-25%', '-25%', '150%', '150%']}) => (
  <filter id={id} x={region[0]} y={region[1]} width={region[2]} height={region[3]} colorInterpolationFilters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={2} seed={seed + boil * 37} result="warp" />
    <feDisplacementMap in="SourceGraphic" in2="warp" scale={disp} xChannelSelector="R" yChannelSelector="G" result="shape" />
    <feGaussianBlur in="shape" stdDeviation={blur} result="soft" />
    <feTurbulence type="fractalNoise" baseFrequency={0.045} numOctaves={2} seed={seed * 3 + 1} result="grain" />
    <feComposite in="grain" in2="soft" operator="arithmetic" k1={0} k2={grain} k3={1} k4={-grain / 2} result="bump" />
    <feDiffuseLighting in="bump" surfaceScale={surf} diffuseConstant={1} lightingColor="#ffffff" result="diff">
      <feDistantLight azimuth={225} elevation={50} />
    </feDiffuseLighting>
    <feComposite in="diff" in2="shape" operator="arithmetic" k1={1.3} k2={0} k3={0} k4={0} result="lit0" />
    <feComposite in="lit0" in2="shape" operator="in" result="lit" />
    <feSpecularLighting in="bump" surfaceScale={surf} specularConstant={spec} specularExponent={26} lightingColor="#FFF4E0" result="spec">
      <feDistantLight azimuth={225} elevation={42} />
    </feSpecularLighting>
    <feComposite in="spec" in2="shape" operator="in" result="specIn" />
    <feComposite in="specIn" in2="lit" operator="arithmetic" k1={0} k2={1} k3={1} k4={0} result="clay" />
    <feColorMatrix in="shape" type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.12  0 0 0 0 0.07  0 0 0 0.4 0" result="sha" />
    <feGaussianBlur in="sha" stdDeviation={blur * 0.9} result="shb" />
    <feOffset in="shb" dx={9 * sh} dy={13 * sh} result="shadow" />
    <feMerge>
      <feMergeNode in="shadow" />
      <feMergeNode in="clay" />
    </feMerge>
  </filter>
);

const TXT: [string, string, string, string] = ['-12%', '-45%', '124%', '190%'];
/** Lite chain (no blur / turbulence / lighting): hard inner rims made from the alpha shifted by `rim` px — a light strip
 *  on the top-left inner edge and a warm dark strip on the bottom-right one — plus a hard offset drop shadow. */
const LiteFilter: React.FC<{id: string; sh?: number; rim?: number; region?: [string, string, string, string]}> = ({id, sh = 1, rim = 0, region = ['-10%', '-10%', '130%', '135%']}) => (
  <filter id={id} x={region[0]} y={region[1]} width={region[2]} height={region[3]} colorInterpolationFilters="sRGB">
    {rim > 0 && (
      <>
        <feOffset in="SourceAlpha" dx={rim} dy={rim} result="dn" />
        <feOffset in="SourceAlpha" dx={-rim * 1.3} dy={-rim * 1.3} result="up" />
        <feComposite in="SourceAlpha" in2="dn" operator="out" result="hiE" />
        <feComposite in="SourceAlpha" in2="up" operator="out" result="loE" />
        <feColorMatrix in="hiE" type="matrix" values="0 0 0 0 1  0 0 0 0 0.98  0 0 0 0 0.92  0 0 0 0.42 0" result="hiC" />
        <feColorMatrix in="loE" type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 0 0.05  0 0 0 0.3 0" result="loC" />
        <feComposite in="loC" in2="SourceGraphic" operator="atop" result="c1" />
        <feComposite in="hiC" in2="c1" operator="atop" result="clay" />
      </>
    )}
    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.12  0 0 0 0 0.07  0 0 0 0.24 0" result="sha" />
    <feOffset in="sha" dx={7 * sh} dy={10 * sh} result="shadow" />
    <feMerge><feMergeNode in="shadow" /><feMergeNode in={rim > 0 ? 'clay' : 'SourceGraphic'} /></feMerge>
  </filter>
);
/** All clay filters (ids slabA/B/C, big, txtA/B, fine, cap). Full: `hold` re-seeds the edge turbulence on a 3-drawing
 *  boil cycle. Lite: the same ids carry hard rims (bodies, letters) + a hard drop shadow. Quality = CLAY. */
export const ClayDefs: React.FC<{hold: number}> = ({hold}) => {
  const b = hold % 3;
  if (LITE) {
    return (
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <defs>
          {['slabA', 'slabB', 'slabC'].map((id) => <LiteFilter key={id} id={id} rim={4} />)}
          <LiteFilter id="big" sh={1.4} rim={6} />
          <LiteFilter id="txtA" sh={0.7} region={TXT} />
          <LiteFilter id="txtB" sh={0.7} region={TXT} />
          <LiteFilter id="fine" sh={0.45} />
          <LiteFilter id="cap" sh={0.6} />
        </defs>
      </svg>
    );
  }
  return (
    <svg width={0} height={0} style={{position: 'absolute'}}>
      <defs>
        {/* slabs / bodies */}
        <ClayFilter id="slabA" boil={b} seed={3} blur={11} disp={11} surf={13} freq={0.011} />
        <ClayFilter id="slabB" boil={b} seed={17} blur={11} disp={11} surf={13} freq={0.012} />
        <ClayFilter id="slabC" boil={b} seed={29} blur={11} disp={10} surf={13} freq={0.010} />
        {/* big hero shapes (giant numbers, the ?) */}
        <ClayFilter id="big" boil={b} seed={41} blur={16} disp={16} surf={16} freq={0.008} sh={1.4} />
        {/* letters */}
        <ClayFilter id="txtA" boil={b} seed={53} blur={6} disp={6} surf={8} freq={0.02} region={TXT} />
        <ClayFilter id="txtB" boil={b} seed={67} blur={6} disp={6} surf={8} freq={0.022} region={TXT} />
        {/* small parts (eyes, leaves, balls) */}
        <ClayFilter id="fine" boil={b} seed={79} blur={4} disp={4} surf={6} freq={0.03} sh={0.6} />
        {/* caption dough strip */}
        <ClayFilter id="cap" boil={b} seed={91} blur={10} disp={5} surf={12} freq={0.009} sh={0.6} />
      </defs>
    </svg>
  );
};

// ---------- set ----------
export type Set = {wall: string; wallLow: string; floor: string; floorNear: string; dark?: boolean};
export const SETS: Record<string, Set> = {
  cream: {wall: '#F3E6D2', wallLow: '#E9D6BC', floor: '#DFC6A6', floorNear: '#ECD9BE'},
  peach: {wall: '#F6D9C6', wallLow: '#EEC6AC', floor: '#E5B394', floorNear: '#F0C9AE'},
  mint: {wall: '#DDEDE2', wallLow: '#CBE0D2', floor: '#B9D2C1', floorNear: '#CFE3D5'},
  night: {wall: '#2F857A', wallLow: '#25706A', floor: '#1E5C56', floorNear: '#286F67', dark: true},
  butter: {wall: '#F7E5B8', wallLow: '#EFD59F', floor: '#E3C189', floorNear: '#F0D6A4'},
};
/** Matte paper sweep: wall curving into the tabletop, warm key-light pool top-left, vignette, paper tooth. */
export const Backdrop: React.FC<{set: Set}> = ({set}) => (
  <AbsoluteFill style={LITE ? {willChange: 'transform'} : undefined}>
    <AbsoluteFill style={{background: `linear-gradient(180deg, ${set.wall} 0%, ${set.wallLow} 50%, ${set.floor} 60%, ${set.floorNear} 100%)`}} />
    <AbsoluteFill style={{background: `radial-gradient(ellipse 75% 42% at 28% 24%, rgba(255,248,232,${set.dark ? 0.16 : 0.5}), transparent 72%)`}} />
    <AbsoluteFill style={{background: `radial-gradient(ellipse 80% 22% at 50% 78%, rgba(255,250,240,${set.dark ? 0.1 : 0.32}), transparent 70%)`}} />
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 88% 72% at 48% 44%, transparent 52%, rgba(60,32,14,0.30) 100%)'}} />
    <AbsoluteFill style={{backgroundImage: noise(0.9, 3, 7, 360), opacity: set.dark ? 0.16 : 0.13, mixBlendMode: 'multiply'}} />
  </AbsoluteFill>
);

/** Soft contact shadow where an object meets the tabletop (wider when squashed, fainter when airborne). */
export const Contact: React.FC<{x: number; y: number; w: number; s?: SQ; k?: number}> = ({x, y, w, s = ID, k = 1}) => {
  if (!s.on) return null;
  const air = Math.max(0, Math.min(1, -s.y / 260));
  const ww = w * s.sx * (1 - air * 0.4);
  return <div style={{position: 'absolute', left: x - ww / 2 + 10, top: y - 26, width: ww, height: 52, borderRadius: '50%',
    background: `radial-gradient(closest-side, rgba(52,28,14,${0.5 * k * (1 - air * 0.7)}), rgba(52,28,14,0))`}} />;
};

/** Placed object: absolute box with squash/stretch around its base. */
export const Place: React.FC<{x: number; y: number; w: number; h: number; s?: SQ; rot?: number; origin?: string; z?: number; children: React.ReactNode}> = ({
  x, y, w, h, s = ID, rot = 0, origin = '50% 100%', z, children,
}) => {
  if (!s.on) return null;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, zIndex: z, transformOrigin: origin,
      transform: `translate(${s.x}px, ${s.y}px) rotate(${rot + s.r}deg) scale(${s.sx}, ${s.sy})`}}>
      {children}
    </div>
  );
};

/** A clay body: any HTML box run through a clay filter. */
const radiiOf = (br: React.CSSProperties['borderRadius'], w: number, h: number): [number, number, number, number] => {
  if (typeof br === 'number') return [br, br, br, br];
  if (typeof br === 'string') {
    if (br.trim().endsWith('%') && !br.includes(' ')) { const r = (parseFloat(br) / 100) * Math.min(w, h) * 2; return [r, r, r, r]; }
    const v = br.split('/')[0].trim().split(/\s+/).map((x) => (x.endsWith('%') ? (parseFloat(x) / 100) * Math.min(w, h) * 2 : parseFloat(x)));
    if (v.length === 4) return [v[0], v[1], v[2], v[3]];
    if (v.length >= 1 && Number.isFinite(v[0])) return [v[0], v[0], v[0], v[0]];
  }
  return [10, 10, 10, 10];
};
/** A clay body: any HTML box run through a clay filter. In lite a box with numeric width/height becomes a lumpy SVG
 *  blob (matte gradient + grain, boils per hold); unsized boxes (inset: 0) get the CSS lite body + grain tile. */
export const Clay: React.FC<{f?: string; style?: React.CSSProperties; children?: React.ReactNode; seed?: number}> = ({f = 'slabA', style, children, seed}) => {
  const boil = useBoil();
  if (LITE) {
    const bg = typeof style?.background === 'string' ? style.background : undefined;
    const sh = f === 'fine' ? 0.45 : f === 'cap' ? 0.6 : f === 'big' ? 1.3 : 1;
    const w = style?.width, h = style?.height;
    if (bg && hex6(bg) && typeof w === 'number' && typeof h === 'number' && w >= 24 && h >= 24) {
      const {background: _b, borderRadius, overflow, ...rest} = style ?? {};
      const sd = seed ?? Math.round(((rest.left as number) || 0) * 0.37 + ((rest.top as number) || 0) * 0.61 + w * 1.3 + h);
      const amp = Math.min(5, Math.max(1.4, Math.min(w, h) * 0.035));
      return (
        <div style={{position: 'absolute', ...rest}}>
          <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
            <ClayG f={f === 'fine' ? 'fine' : f}><path d={blobRect(0, 0, w, h, radiiOf(borderRadius, w, h), sd, boil, amp)} fill={cf(bg)} /></ClayG>
          </svg>
          <div style={{position: 'absolute', inset: 0, overflow, borderRadius}}>{children}</div>
        </div>
      );
    }
    return <div style={{position: 'absolute', ...style, ...(bg ? liteBody(bg, sh) : {})}}>{children}</div>;
  }
  return <div style={{position: 'absolute', filter: `url(#${f})`, ...style}}>{children}</div>;
};

/** Thumbprint whorl pressed into a surface (drawn inside a clay body so it is displaced with it). */
export const Thumb: React.FC<{x: number; y: number; r?: number; rot?: number; dark?: boolean}> = ({x, y, r = 46, rot = 0, dark}) => (
  <svg width={r * 2} height={r * 2} style={{position: 'absolute', left: x - r, top: y - r, overflow: 'visible'}}>
    <g transform={`rotate(${rot} ${r} ${r})`} fill="none" strokeLinecap="round">
      {Array.from({length: 6}).map((_, i) => {
        const rx = r * (0.18 + i * 0.15), ry = r * (0.13 + i * 0.12);
        return (
          <React.Fragment key={i}>
            <ellipse cx={r + 1.5} cy={r + 1.5} rx={rx} ry={ry} stroke={dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.32)'} strokeWidth={2} strokeDasharray={`${rx * 4} ${rx * 1.2}`} />
            <ellipse cx={r} cy={r} rx={rx} ry={ry} stroke={dark ? 'rgba(0,0,0,0.22)' : 'rgba(70,40,20,0.13)'} strokeWidth={2} strokeDasharray={`${rx * 4} ${rx * 1.2}`} />
          </React.Fragment>
        );
      })}
    </g>
  </svg>
);

/** Clay letters, each pressed on (wall) or dropped (floor) one after another on the hold grid. */
export const ClayWord: React.FC<{
  text: string; tq: number; hold: number; at: number; size: number; y: number; color: string | string[]; x?: number; w?: number;
  per?: number; mode?: 'press' | 'drop' | 'pop'; f?: string; out?: number; rot?: number; weight?: number; seed?: number; spacing?: number; shade?: string;
  ats?: number[];
}> = ({text, tq, hold, at, size, y, color, x = 0, w: wP, per = 1 / 24, mode = 'press', f = 'txtA', out, rot = 0, weight = 800, seed = 1, spacing = -0.02, shade, ats}) => {
  const fw = useFrame().W;
  const w = wP ?? fw; // default: the whole frame width (centred); landscape layouts pass a column (x, w)
  const chars = [...text];
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', filter: LITE ? undefined : `url(#${f})`,
      transform: `rotate(${rot}deg)`, fontFamily: HEAD, fontWeight: weight, fontSize: size, lineHeight: 1, letterSpacing: spacing * size}}>
      {chars.map((ch, i) => {
        if (ch === ' ') return <span key={i} style={{width: size * 0.28}} />;
        const t0 = ats ? ats[i] : at + i * per;
        let s = mode === 'press' ? press(tq, t0) : mode === 'drop' ? drop(tq, t0, 0.55) : pop(tq, t0);
        if (out !== undefined) s = mul(s, flatten(tq, out + (i % 3) / 24));
        const j = jig(hold, seed * 13 + i, 0.8);
        const tilt = (rnd(seed * 7 + i * 3.3) - 0.5) * 7;
        const col = Array.isArray(color) ? color[i % color.length] : color;
        return (
          <span key={i} style={{display: 'inline-block', color: col, visibility: s.on ? 'visible' : 'hidden', transformOrigin: mode === 'press' ? '50% 60%' : '50% 92%',
            textShadow: LITE ? liteText(col, size) : shade ? `0 ${size * 0.035}px 0 ${shade}` : undefined,
            transform: `translate(${j.x + s.x}px, ${j.y + s.y + (rnd(seed + i * 5.1) - 0.5) * size * 0.06}px) rotate(${tilt + j.r}deg) scale(${s.sx}, ${s.sy})`}}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};

// ---------- transitions ----------
/** Wooden rolling pin (not clay): cylinder body with end caps and handles, rolling grain, soft shadow below. */
export const RollingPin: React.FC<{y: number}> = ({y}) => {
  const {W} = useFrame(); // the pin spans the frame width (body W − 172 px, handles past both edges)
  const wood = `linear-gradient(180deg, #F6D3A4 0%, #EDBE86 18%, ${L.wood} 46%, #B97F4C 74%, #8A5A34 100%)`;
  return (
    <div style={{position: 'absolute', left: 0, top: y - 90, width: W, height: 180, zIndex: 60}}>
      <div style={{position: 'absolute', left: 70, top: 96, width: W - 120, height: 120, borderRadius: 60, background: LITE ? 'radial-gradient(closest-side, rgba(40,20,8,0.34), rgba(40,20,8,0))' : 'rgba(40,20,8,0.34)', filter: LITE ? undefined : 'blur(20px)'}} />
      {/* handles */}
      {[-70, W - 120].map((x) => (
        <div key={x} style={{position: 'absolute', left: x, top: 56, width: 190, height: 68, borderRadius: 34, background: `linear-gradient(180deg, #E9B27A 0%, #C98E58 45%, #8E5C35 100%)`, boxShadow: '0 10px 18px rgba(40,20,8,0.3)'}} />
      ))}
      {/* body */}
      <div style={{position: 'absolute', left: 86, top: 0, width: W - 172, height: 180, borderRadius: 90, background: wood, overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0, opacity: 0.2, backgroundImage: 'repeating-linear-gradient(180deg, transparent 0 26px, rgba(110,62,28,0.95) 26px 29px, transparent 29px 55px)', backgroundPositionY: `${-y * 0.45}px`}} />
        <div style={{position: 'absolute', left: 40, top: 30, width: W - 252, height: 18, borderRadius: 9, background: 'rgba(255,250,235,0.6)', filter: LITE ? undefined : 'blur(5px)', opacity: LITE ? 0.7 : 1}} />
        {/* flour dust on the body */}
        <div style={{position: 'absolute', inset: 0, backgroundImage: noise(0.5, 2, 4, 300), opacity: 0.12, mixBlendMode: 'screen'}} />
      </div>
      {/* end caps */}
      {[86, W - 120].map((x) => <div key={x} style={{position: 'absolute', left: x, top: 8, width: 34, height: 164, borderRadius: '50%', background: 'linear-gradient(90deg, rgba(120,72,36,0.55), rgba(255,230,190,0.25))'}} />)}
    </div>
  );
};

/** Wavy x of the slapped dough sheet's leading edge at height y. */
export const waveX = (x: number, y: number) => x + Math.sin(y / 170 + 1.3) * 26 + Math.sin(y / 61) * 11;
const DEF_VIEW = {W: SIZE[FORMAT].width, H: SIZE[FORMAT].height};
/** clip-path polygon: everything right of the wavy edge (`v` = frame size; default the project format). */
export const slapClip = (x: number, v: {W: number; H: number} = DEF_VIEW) => {
  const pts: string[] = [];
  for (let y = -40; y <= v.H + 40; y += 40) pts.push(`${waveX(x, y).toFixed(1)}px ${y}px`);
  return `polygon(${pts.join(', ')}, ${v.W + 120}px ${v.H + 40}px, ${v.W + 120}px -40px)`;
};
/** The leading lip of a dough sheet slapped over the set: a fat lumpy clay roll along the wavy edge. */
export const DoughLip: React.FC<{x: number; color: string}> = ({x, color}) => {
  const {W, H} = useFrame();
  let d = '';
  for (let y = -60; y <= H + 60; y += 30) d += `${y === -60 ? 'M' : 'L'} ${waveX(x, y).toFixed(1)} ${y} `;
  return (
    <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, zIndex: 60, overflow: 'visible'}}>
      <path d={d} transform="translate(-58 6)" stroke="rgba(40,20,8,0.28)" strokeWidth={70} fill="none" style={{filter: LITE ? undefined : 'blur(16px)'}} opacity={LITE ? 0.55 : 1} />
      <ClayG f="big" tex={false}><path d={d} stroke={color} strokeWidth={104} strokeLinecap="round" fill="none" /></ClayG>
    </svg>
  );
};

// =====================================================================================================
// Episode toolkit (grown out of the prototype): sets, text helpers, camera, captions, scene timeline.
// =====================================================================================================

SETS.micro = {wall: '#DCEFF0', wallLow: '#C6E3E4', floor: '#AFD3D2', floorNear: '#C7E4E1'};
SETS.oven = {wall: '#5B3B2C', wallLow: '#4C3125', floor: '#3D271D', floorNear: '#4E3427', dark: true};
SETS.rose = {wall: '#F6DAD2', wallLow: '#EEC5BB', floor: '#E2ADA3', floorNear: '#EEC7BF'};

/** Per-character contact times for multi-word clay lines: each word starts on its own spoken word. */
export const timesFor = (text: string, starts: number[], per = 1 / 24) => {
  const out: number[] = [];
  let w = 0, i = 0;
  for (const ch of text) {
    if (ch === ' ') { w++; i = 0; out.push(0); continue; }
    out.push(starts[Math.min(w, starts.length - 1)] + i * per);
    i++;
  }
  return out;
};
/** Clay line whose words each start on their own spoken word (`starts` = one time per word). */
export const ClayLine: React.FC<{text: string; starts: number[]; per?: number} & Omit<React.ComponentProps<typeof ClayWord>, 'text' | 'at' | 'ats' | 'per'>> = ({text, starts, per = 1 / 30, ...rest}) => {
  // unmounted before it is pressed on and after it is squashed away: no empty filtered box costing GPU time
  if (rest.tq < Math.min(...starts) - 2 / HZ) return null;
  if (rest.out !== undefined && rest.tq > rest.out + 4 / HZ) return null;
  return <ClayWord {...rest} text={text} at={0} ats={timesFor(text, starts, per)} />;
};

export const slabRadius = (w: number) => `${w * 0.3}px ${w * 0.3}px ${w * 0.1}px ${w * 0.1}px`;
/** Rounded clay tablet (tombstone shape) with an optional thumbprint. */
export const Slab: React.FC<{w: number; h: number; color: string; f?: string; thumb?: number; radius?: string; children?: React.ReactNode}> = ({w, h, color, f = 'slabA', thumb, radius, children}) => (
  <Clay f={f} style={{left: 0, top: 0, width: w, height: h, background: color, borderRadius: radius ?? slabRadius(w), overflow: 'hidden'}}>
    {thumb !== undefined && <Thumb x={w * 0.7} y={h * 0.26} r={Math.min(w, h) * 0.2} rot={thumb} />}
    {children}
  </Clay>
);
/** Centered Baloo label (painted onto whatever clay body it sits in). */
export const Label: React.FC<{size: number; color: string; top?: number | string; children: React.ReactNode; weight?: number}> = ({size, color, top, children, weight = 800}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top: top ?? 0, bottom: top === undefined ? 0 : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: HEAD, fontWeight: weight, fontSize: size, lineHeight: 1, color, whiteSpace: 'nowrap'}}>{children}</div>
);
/** Clay pill tag (dough strip with a label), pressed on at `at`. */
export const Pill: React.FC<{tq: number; at: number; x: number; y: number; w: number; h?: number; color: string; ink: string; size?: number; rot?: number; f?: string; children: React.ReactNode; z?: number; out?: number}> = ({
  tq, at, x, y, w, h = 96, color, ink, size = 50, rot = 0, f = 'slabC', children, z, out,
}) => {
  let s = press(tq, at);
  if (out !== undefined) s = mul(s, flatten(tq, out));
  return (
    <Place x={x} y={y} w={w} h={h} s={s} rot={rot} origin="50% 50%" z={z}>
      <Clay f={f} style={{inset: 0, background: color, borderRadius: h / 2}}><Label size={size} color={ink}>{children}</Label></Clay>
    </Place>
  );
};

/** 4-point clay sparkle. */
export const Star: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="-50 -50 100 100" style={{overflow: 'visible'}}>
    <ClayG f="fine"><path d="M 0 -48 C 6 -12 12 -6 48 0 C 12 6 6 12 0 48 C -6 12 -12 6 -48 0 C -12 -6 -6 -12 0 -48 Z" fill={cf(color)} /></ClayG>
  </svg>
);
/** Stray clay crumbs on the tabletop (set dressing), in a floor strip so the filter region stays small; four near
 *  each side edge. Landscape default strip top 806. */
export const Crumbs: React.FC<{seed: number; colors: string[]; top?: number}> = ({seed, colors, top}) => {
  const fr = useFrame();
  return (
  <div style={{position: 'absolute', left: 0, top: top ?? fr.pick(1452, 806), width: fr.W, height: 110, filter: LITE ? undefined : 'url(#fine)'}}>
    {Array.from({length: 8}).map((_, i) => {
      const x = i < 4 ? 30 + rnd(seed + i) * 230 : fr.W - 280 + rnd(seed + i) * 230;
      const y = 20 + rnd(seed + i * 3.3) * 70;
      const d = 14 + rnd(seed + i * 7.7) * 20;
      const c = colors[i % colors.length];
      return <div key={i} style={{position: 'absolute', left: x, top: y, width: d, height: d * 0.78, borderRadius: '50%', ...(LITE ? liteBody(c, 0.3) : {background: c})}} />;
    })}
  </div>
  );
};

// ---------- camera (held on the 12 fps grid like everything else) ----------
const ioq = (q: number) => (q <= 0 ? 0 : q >= 1 ? 1 : q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2);
export type CamMove = {from: number; to: number; s?: number; fx?: number; fy?: number};
/** Scene camera: focus point (fx,fy) shown at screen centre with scale s; moves ease between poses; slow push;
 *  two-hold nudge on each impact. `cut` moves (from === to) jump instantly, like a stop-motion camera reframe.
 *  Default focus = the frame centre (W/2, H/2), so an unmoved Cam is identity in both formats. Keep s ≥ 1: the
 *  Backdrop inside it is frame-sized and would show its edges when scaled down. */
export const Cam: React.FC<{tq: number; from?: number; to?: number; push?: number; impacts?: number[]; s0?: number; fx0?: number; fy0?: number; moves?: CamMove[]; children: React.ReactNode}> = ({
  tq, from = 0, to = 1, push = 0.03, impacts = [], s0 = 1, fx0, fy0, moves = [], children,
}) => {
  const fr = useFrame();
  let s = s0, fx = fx0 ?? fr.cx, fy = fy0 ?? fr.cy;
  for (const m of moves) {
    const q = m.to <= m.from ? (tq >= m.from ? 1 : 0) : ioq((tq - m.from) / (m.to - m.from));
    s = s + ((m.s ?? s) - s) * q;
    fx = fx + ((m.fx ?? fx) - fx) * q;
    fy = fy + ((m.fy ?? fy) - fy) * q;
  }
  const pq = Math.max(0, Math.min(1, (tq - from) / Math.max(0.001, to - from)));
  s *= 1 + (LITE ? 0 : push) * pq; // lite: no slow push — a whole-frame transform change every hold costs CPU in software GL
  let ny = 0;
  for (const at of impacts) {
    const k = kAt(tq, at);
    if (k === 0) ny += 9;
    else if (k === 1) ny -= 4;
  }
  return (
    <AbsoluteFill style={{transformOrigin: '0 0', transform: `translate(${fr.cx - s * fx}px, ${fr.cy - s * fy + ny}px) scale(${s})`, willChange: LITE ? 'transform' : undefined}}>{children}</AbsoluteFill>
  );
};

// ---------- captions: Baloo 2 on a rolled-dough strip, spoken word in tomato ----------
type CapPage = {start: number; end: number; words: {word: string; start: number; end: number}[]};
const pageAtT = (t: number, pages: CapPage[]) => pages.find((pg) => t >= pg.start - 0.08 && t < pg.end) ?? null;
const shown = (w: string) => w.replace(/[.,;:]+(["')\]]*)$/, '$1');
/** Portrait: top 1572 in a 896 px band. Landscape: centred in a 1400 px band, bottom ≈ 130 px above the frame edge. */
export const Caption: React.FC<{t: number; pages: CapPage[]; top?: number}> = ({t, pages, top}) => {
  const fr = useFrame();
  const pg = pageAtT(t, pages);
  if (!pg) return null;
  const f = Math.floor((t - pg.start + 0.08) * 60);
  const s = f < 0 ? 0.92 : f < 4 ? 0.92 + f * 0.035 : f < 8 ? 1.06 - (f - 4) * 0.015 : 1;
  return (
    <div style={{position: 'absolute', left: fr.pick(64, (fr.W - fr.captionW) / 2), width: fr.pick(896, fr.captionW), top: top ?? fr.pick(1572, fr.H - fr.safe.bottom - 112), display: 'flex', justifyContent: 'center', zIndex: 90, willChange: LITE ? 'transform' : undefined}}>
      <div style={{position: 'relative', padding: '14px 42px 20px', transform: `scale(${s}) rotate(${(rnd(pg.start * 7) - 0.5) * 2.4}deg)`}}>
        <Clay f="cap" style={{inset: 0, background: L.cream, borderRadius: 999}}>
          <Thumb x={60} y={34} r={30} rot={20} />
        </Clay>
        <div style={{position: 'relative', fontFamily: HEAD, fontWeight: 700, fontSize: 60, lineHeight: 1.12, color: L.ink, whiteSpace: 'nowrap'}}>
          {pg.words.map((w, i) => {
            const on = t >= w.start - 0.04 && t < w.end + 0.1;
            const said = t >= w.start - 0.04;
            return (
              <React.Fragment key={i}>
                <span style={{color: on ? L.tomato : L.ink, opacity: said ? 1 : 0.38}}>{shown(w.word)}</span>
                {i < pg.words.length - 1 ? ' ' : ''}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/** Waits for Baloo 2 before the first frame is captured (no fallback-font frames). */
export const useLemFonts = () => {
  const [handle] = React.useState(() => delayRender('lempung fonts'));
  React.useEffect(() => {
    Promise.all([document.fonts.load("800 100px 'Lem Head'"), document.fonts.load("700 60px 'Lem Head'")])
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }, [handle]);
};

// ---------- scene timeline with clay transitions ----------
export type SP = {t: number; tq: number; hold: number};
/** a..b = transition window; roll = rolling pin top→bottom; slap = dough sheet from the right (`lip` = its colour). */
export type TR = {a: number; b: number; kind: 'roll' | 'slap'; lip?: string};
const easeIO2 = (q: number) => (q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2);
/** Renders scene i (or old+new during a transition). Transitions step at 24 fps; a slap lands with a two-hold nudge. */
export const Timeline: React.FC<{t: number; scenes: React.FC<SP>[]; trs: TR[]}> = ({t, scenes, trs}) => {
  const {W, H} = useFrame();
  const hold = Math.floor(t * HZ);
  const tq = hold / HZ;
  const t24 = Math.floor(t * 24) / 24;
  const sp: SP = {t, tq, hold};
  const done = trs.filter((x) => t24 >= x.b).length;
  const tr = trs.find((x) => t24 >= x.a && t24 < x.b);
  const Cur = scenes[Math.min(done, scenes.length - 1)];
  let body: React.ReactNode = <AbsoluteFill style={{isolation: 'isolate'}}><Cur {...sp} /></AbsoluteFill>;
  if (tr) {
    const i = trs.indexOf(tr);
    const Old = scenes[i], New = scenes[i + 1];
    const q = (t24 - tr.a) / (tr.b - tr.a);
    if (tr.kind === 'roll') {
      const y = -110 + (H + 230) * easeIO2(q); // pin travels from above the frame to below it
      body = (
        <>
          <AbsoluteFill style={{clipPath: `inset(${Math.max(0, y)}px 0 0 0)`}}><Old {...sp} /></AbsoluteFill>
          <AbsoluteFill style={{clipPath: `inset(0 0 ${Math.max(0, H - y)}px 0)`}}><New {...sp} /></AbsoluteFill>
          <RollingPin y={y} />
        </>
      );
    } else {
      const x = W + 120 - (W + 280) * (1 - Math.pow(1 - q, 2.2)); // sheet edge from past the right edge to past the left
      body = (
        <>
          <AbsoluteFill style={{isolation: 'isolate'}}><Old {...sp} /></AbsoluteFill>
          <AbsoluteFill style={{clipPath: slapClip(x, {W, H})}}><New {...sp} /></AbsoluteFill>
          <DoughLip x={x} color={tr.lip ?? L.cream} />
        </>
      );
    }
  }
  const land = trs.filter((x) => x.kind === 'slap').map((x) => kAt(tq, x.b)).find((k) => k === 0 || k === 1);
  const ny = land === 0 ? 10 : land === 1 ? -4 : 0;
  return <AbsoluteFill style={{transform: `translateY(${ny}px)`}}>{body}</AbsoluteFill>;
};
