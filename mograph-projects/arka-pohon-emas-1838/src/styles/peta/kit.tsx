import React from 'react';
import {AbsoluteFill, Easing} from 'remotion';
import {CaptionPage} from '../../components/WordCaptions';
import {display, FORMAT, lerp, noise, p, pageAt, pb, renderQuality, spline, useFrame} from '../shared';
import {SIZE} from '../../format';
import NUSANTARA from './map-nusantara.json';

// PETA style kit — video-essay map explainer (Vox / map-channel feel). A real Natural Earth map (public domain) baked to
// SVG paths by scripts/make-map.mjs; `map-nusantara.json` (Indonesia + neighbours) is bundled and works offline. One camera
// flies between places (van Wijk smooth zoom); every mark placed ON the map (labels, pins, lines, badges) is drawn in
// SCREEN space from projected lon/lat, so strokes and type stay crisp at any zoom. Muted paper palette, one vermilion,
// one highlighter yellow, DM Serif Display titles + Barlow Condensed labels. Every geo helper takes an optional `map`.

export const PETA = {
  sea: '#D7E3E1', land: '#F3EEE2', border: '#BDB3A0', ink: '#1F2A33', red: '#E2553A', yellow: '#F6CF3A', grey: '#8C949A', card: '#FFFDF8',
  coast: '#A89E8B', deep: '#B4CBCF', shelf: '#E6D8B6', hatch: '#C8B286', seaText: '#6F8C88',
  west: '#6E93A8', east: '#DE8A5E', // the two "sides" of a comparison (cool / warm tints)
};
const M = PETA;
export const SERIF = "'Peta Head', serif";
export const LABEL = "'Peta Label', sans-serif";
export const GLIDE = Easing.bezier(0.65, 0, 0.25, 1);
export const pg = (t: number, a0: number, b0: number) => p(t, a0, b0, GLIDE);
/** in at a, out at b (each `d` long) */
export const inOut = (t: number, a: number, b: number, d = 0.35, dOut = d) => pg(t, a, a + d) * (1 - pg(t, b - dOut, b));

// ---------- map data (shape written by scripts/make-map.mjs) ----------
export type PetaMap = {
  w: number; h: number; bbox: number[]; // bbox = [lonMin, lonMax, latMin, latMax]
  land: string; borders?: string; deep?: string;
  countries?: Record<string, string>; islands?: Record<string, string>;
  detail?: {rect: number[]; land: string; coast: string; deep?: string; islands?: Record<string, string>; country?: string};
  places?: Record<string, number[]>;
};
/** The bundled map: lon 86..160, lat -48..48 (Indonesia, SE Asia, Australia), 10m close-up box lon 112.6..119, lat -13..-3.5. */
export const NUSANTARA_MAP = NUSANTARA as PetaMap;
const DEF = NUSANTARA_MAP;

// ---------- LITE render path (chat sandbox: 2 cores, software GL) ----------
// renderQuality() === 'lite' (input prop quality:'lite', or auto on software GL with ≤ 4 threads). FULL is unchanged.
// LITE: the map is drawn on a CPU canvas (see CanvasMap) with paths thinned to ~2.4 screen px when zoomed out, no slow
// push-in while the camera holds (an unchanged map is not redrawn), the dry shelf fades in as one fill (no growing
// coast, no hatch), no land shadow, no multiply grain, hard card shadows.
const isLite = () => renderQuality() === 'lite';
const thinCache = new Map<string, Map<number, string>>();
/** LITE: drop path vertices within ~2.4 screen px at zoom s (4 buckets, so geometry changes only a few times per fly). */
const thinD = (d: string | undefined, s: number): string | undefined => {
  if (!d || !isLite()) return d;
  const tol = 2.4 / s;
  if (tol < 1.8) return d; // baked data is ~1.3 map px already
  return thinTol(d, tol < 3 ? 2 : tol < 5 ? 3.5 : tol < 8 ? 6 : 10);
};
/** Ramer–Douglas–Peucker over every subpath of an M…L…Z path string (cached per path and tolerance in map px). */
const thinTol = (d: string, b: number): string => {
  let byTol = thinCache.get(d);
  if (!byTol) thinCache.set(d, (byTol = new Map()));
  const hit = byTol.get(b);
  if (hit) return hit;
  const out: string[] = [];
  for (const sub of d.split('M')) {
    if (!sub) continue;
    const closed = sub.endsWith('Z');
    const nums = sub.replace(/[LZ]/g, ' ').trim().split(/\s+/).map(Number);
    const pts: Array<[number, number]> = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (closed && Math.max(x1 - x0, y1 - y0) < b * 1.5) continue; // specks under ~2 screen px
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack: Array<[number, number]> = [[0, pts.length - 1]];
    while (stack.length) {
      const [i0, i1] = stack.pop() as [number, number];
      const [ax, ay] = pts[i0], [bx, by] = pts[i1];
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-9;
      let best = -1, bi = -1;
      for (let i = i0 + 1; i < i1; i++) {
        const dd = len > 1e-6 ? Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len : Math.hypot(pts[i][0] - ax, pts[i][1] - ay);
        if (dd > best) [best, bi] = [dd, i];
      }
      if (best > b) { keep[bi] = 1; stack.push([i0, bi], [bi, i1]); }
    }
    const kept = pts.filter((_, i) => keep[i]);
    if (closed && kept.length < 3) continue;
    out.push('M' + kept.map(([x, y]) => `${x} ${y}`).join('L') + (closed ? 'Z' : ''));
  }
  const r = out.join('');
  byTol.set(b, r);
  return r;
};

// ---------- projection (same Mercator as the baker) ----------
const R = Math.PI / 180;
const merc = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * R) / 2));
const scaleOf = (map: PetaMap) => map.w / ((map.bbox[1] - map.bbox[0]) * R);
export type LL = [number, number];
/** lon/lat → map px. */
export const proj = (lon: number, lat: number, map: PetaMap = DEF): [number, number] => {
  const k = scaleOf(map);
  return [(lon - map.bbox[0]) * R * k, (merc(map.bbox[3]) - merc(lat)) * k];
};
/** map px → lon/lat. */
export const unproj = (x: number, y: number, map: PetaMap = DEF): LL => {
  const k = scaleOf(map);
  return [map.bbox[0] + x / k / R, (2 * Math.atan(Math.exp(merc(map.bbox[3]) - y / k)) - Math.PI / 2) / R];
};

// ---------- camera: (x, y) map px at the screen centre, s = screen px per map px ----------
/** Screen size a camera is shown at (portrait 1080×1920 or landscape 1920×1080; a useFrame() result fits). */
export type View = {W: number; H: number};
/** Default view = the delivery format in src/project.json (what the `Mograph` comp renders at). */
const DEF_VIEW: View = {W: SIZE[FORMAT].width, H: SIZE[FORMAT].height};
/** `view` (optional): the screen this camera is shown at; flyCam stamps it, toScreen centres on it. Unset = DEF_VIEW. */
export type Cam = {x: number; y: number; s: number; view?: View};
const viewOf = (cam: Cam): View => cam.view ?? DEF_VIEW;
/** A camera pose centred on lon/lat with zoom s (s = 1: one map px per screen px). */
export const shot = (lon: number, lat: number, s: number, map: PetaMap = DEF): Cam => {
  const [x, y] = proj(lon, lat, map);
  return {x, y, s};
};
const RHO = 1.2;
/** van Wijk & Nuij smooth zoom (what d3.interpolateZoom does), viewport measured by its long side (`span` px, as d3-zoom). */
const zoomLerp = (a: Cam, b: Cam, q: number, span: number): Cam => {
  const w0 = span / a.s, w1 = span / b.s;
  const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
  const r2 = RHO * RHO, r4 = r2 * r2;
  if (d2 < 1e-9) {
    const S = Math.log(w1 / w0) / RHO;
    return {x: a.x + q * dx, y: a.y + q * dy, s: span / (w0 * Math.exp(RHO * q * S))};
  }
  const d1 = Math.sqrt(d2);
  const b0 = (w1 * w1 - w0 * w0 + r4 * d2) / (2 * w0 * r2 * d1);
  const b1 = (w1 * w1 - w0 * w0 - r4 * d2) / (2 * w1 * r2 * d1);
  const rr0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
  const rr1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const S = (rr1 - rr0) / RHO;
  const s = q * S;
  const u = (w0 / (r2 * d1)) * (Math.cosh(rr0) * Math.tanh(RHO * s + rr0) - Math.sinh(rr0));
  const w = (w0 * Math.cosh(rr0)) / Math.cosh(RHO * s + rr0);
  return {x: a.x + u * dx, y: a.y + u * dy, s: span / w};
};
export type Fly = {at: number; dur: number; to: Cam; drift?: number};
const FLY = Easing.bezier(0.6, 0, 0.3, 1);
/** Camera at time t: holds slowly push in (drift per second, eased in), flies between holds. Moves must not overlap.
 *  `view` (default start.view, else the project format) is stamped on the result: pass useFrame() when the comp size can
 *  differ from src/project.json (QA sheets such as Look-PETA-Wide). */
export const flyCam = (t: number, start: Cam, moves: Fly[], drift0 = 0.012, view?: View): Cam => {
  const v = view ?? start.view;
  const V = v ?? DEF_VIEW;
  const cam = flyRaw(t, start, moves, drift0, Math.max(V.W, V.H));
  return v ? {x: cam.x, y: cam.y, s: cam.s, view: v} : cam;
};
const flyRaw = (t: number, start: Cam, moves: Fly[], drift0: number, span: number): Cam => {
  const held = (c: Cam, dt: number, d: number) => {
    const e = Math.max(0, dt);
    if (isLite()) return c; // LITE: hold still, so the map raster is re-used between flies
    return {...c, s: c.s * Math.exp(d * ((e * e) / (e + 0.9)))};
  };
  let cur = start, since = 0, drift = drift0;
  for (const m of moves) {
    if (t < m.at) return held(cur, t - since, drift);
    const from = held(cur, m.at - since, drift);
    if (t < m.at + m.dur) return zoomLerp(from, m.to, FLY((t - m.at) / m.dur), span);
    cur = m.to;
    since = m.at + m.dur;
    drift = m.drift ?? drift0;
  }
  return held(cur, t - since, drift);
};
/** lon/lat → screen px under `cam`. */
export const toScreen = (cam: Cam, lon: number, lat: number, map: PetaMap = DEF): [number, number] => {
  const [x, y] = proj(lon, lat, map);
  const v = viewOf(cam);
  return [v.W / 2 + (x - cam.x) * cam.s, v.H / 2 + (y - cam.y) * cam.s];
};
/** km per screen pixel at the camera centre (Mercator is conformal: same in every direction). */
export const kmPerPx = (cam: Cam, map: PetaMap = DEF) => (6371 * Math.cos(unproj(cam.x, cam.y, map)[1] * R)) / (scaleOf(map) * cam.s);

// ---------- the map ----------
/** Fill one named land polygon (`map.islands`, baked with --island). */
export type IslandFill = {name: string; color: string; o: number};
export type MapFx = {
  deep?: number; // 0..1 tint of the sea deeper than the baked contour (needs map.deep)
  sonar?: {lon: number; lat: number; r: number}; // reveal `deep` inside a growing circle (r in map px)
  shelf?: number; // dry shallow shelf (e.g. ice age): dilation of the coast in map px, clipped to the shallow sea (0 = off)
  shelfFull?: number; // dilation at which the shelf is fully dry (default 340); LITE fades the whole shelf in by shelf/shelfFull
  shelfTints?: Array<{region: LL[]; color: string; o: number}>; // tint the dry shelf inside lon/lat polygons
  fills?: IslandFill[];
  countries?: Array<{name: string; color?: string; o: number}>; // country fills (map.countries, baked with --country)
};
const PAD = 80;
const rectD = ([x0, y0, x1, y1]: number[]) => `M${x0} ${y0}H${x1}V${y1}H${x0}Z`;
const polyD = (pts: LL[], map: PetaMap) => 'M' + pts.map(([lo, la]) => proj(lo, la, map).map((v) => v.toFixed(1)).join(' ')).join('L') + 'Z';

const Graticule: React.FC<{map: PetaMap; step: number; lon: [number, number]; lat: [number, number]}> = ({map, step, lon, lat}) => {
  if (lon[1] <= lon[0] || lat[1] <= lat[0]) return null;
  const lines: React.ReactNode[] = [];
  for (let lo = Math.ceil(lon[0] / step) * step; lo <= lon[1]; lo += step) {
    const [x] = proj(lo, 0, map);
    lines.push(<line key={`o${lo}`} vectorEffect="non-scaling-stroke" x1={x} y1={proj(0, lat[1], map)[1]} x2={x} y2={proj(0, lat[0], map)[1]} />);
  }
  for (let la = Math.ceil(lat[0] / step) * step; la <= lat[1]; la += step) {
    const [, y] = proj(0, la, map);
    lines.push(<line key={`a${la}`} vectorEffect="non-scaling-stroke" x1={proj(lon[0], 0, map)[0]} y1={y} x2={proj(lon[1], 0, map)[0]} y2={y} />);
  }
  return <g stroke="#ffffff" strokeWidth={1.5} strokeDasharray="6 8" opacity={0.75}>{lines}</g>;
};

/** One complete map render for a data set (main map or its 10m detail box). FULL quality (SVG). */
const MapLayers: React.FC<{id: string; map: PetaMap; cam: Cam; fx: MapFx; detail: boolean; grid: number}> = ({id, map, cam, fx, detail, grid}) => {
  const D = map.detail;
  const dd = detail && D ? D : null;
  const land = dd ? dd.land : map.land;
  const coast = dd ? dd.coast : map.land;
  const deep = dd ? dd.deep : map.deep;
  const frameRect = dd ? dd.rect : [-PAD, -PAD, map.w + PAD, map.h + PAD];
  const frame = rectD(frameRect);
  const shelf = fx.shelf ?? 0;
  const hatch = 9 / cam.s;
  const [lo0, la1] = unproj(frameRect[0], frameRect[1], map);
  const [lo1, la0] = unproj(frameRect[2], frameRect[3], map);
  const gridRange: [[number, number], [number, number]] = dd ? [[lo0, lo1], [la0, la1]] : [[map.bbox[0], map.bbox[1]], [map.bbox[2], map.bbox[3]]];
  const islandD = (n: string) => (dd?.islands?.[n] ?? map.islands?.[n]);
  const countryD = (n: string) => (dd ? (dd.country === n ? dd.land : undefined) : map.countries?.[n]);
  return (
    <g>
      <defs>
        {deep && <clipPath id={`${id}-shelf`}><path d={frame + deep} clipRule="evenodd" /></clipPath>}
        {(fx.shelfTints ?? []).map((r, i) => <clipPath key={i} id={`${id}-tint${i}`}><path d={polyD(r.region, map)} /></clipPath>)}
        {fx.sonar && <clipPath id={`${id}-sonar`}><circle cx={proj(fx.sonar.lon, fx.sonar.lat, map)[0]} cy={proj(fx.sonar.lon, fx.sonar.lat, map)[1]} r={Math.max(0.01, fx.sonar.r)} /></clipPath>}
        <pattern id={`${id}-hatch`} patternUnits="userSpaceOnUse" width={hatch} height={hatch} patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={hatch} stroke={M.hatch} strokeWidth={2.2 / cam.s} />
        </pattern>
      </defs>
      <path d={frame} fill={M.sea} />
      {deep && (fx.deep ?? 0) > 0 && (
        <g clipPath={fx.sonar ? `url(#${id}-sonar)` : undefined}>
          <path d={deep} fill={M.deep} opacity={fx.deep} />
        </g>
      )}
      <Graticule map={map} step={dd ? Math.max(1, grid / 5) : grid} lon={gridRange[0]} lat={gridRange[1]} />
      {deep && shelf > 0.5 && (
        <g clipPath={`url(#${id}-shelf)`}>
          <path d={land} fill={M.shelf} stroke={M.shelf} strokeWidth={shelf} strokeLinejoin="round" />
          <path d={land} fill={`url(#${id}-hatch)`} stroke={`url(#${id}-hatch)`} strokeWidth={shelf} strokeLinejoin="round" opacity={0.7} />
          {(fx.shelfTints ?? []).map((r, i) => r.o > 0 && (
            <g key={i} clipPath={`url(#${id}-tint${i})`}>
              <path d={land} fill={r.color} stroke={r.color} strokeWidth={shelf} strokeLinejoin="round" opacity={r.o} />
            </g>
          ))}
        </g>
      )}
      <path d={land} fill={M.ink} opacity={0.08} transform={`translate(${1.5 / cam.s} ${3.5 / cam.s})`} />
      <path d={land} fill={M.land} />
      {(fx.countries ?? []).map((c) => {
        const d = countryD(c.name);
        return d && c.o > 0 ? <path key={c.name} d={d} fill={c.color ?? M.yellow} opacity={c.o} /> : null;
      })}
      {(fx.fills ?? []).map((f) => {
        const d = islandD(f.name);
        return d && f.o > 0 ? <path key={f.name + f.color} d={d} fill={f.color} opacity={f.o} /> : null;
      })}
      {!dd && map.borders && <path d={map.borders} fill="none" stroke={M.border} strokeWidth={1.3} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
      <path d={coast} fill="none" stroke={M.coast} strokeWidth={2.2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </g>
  );
};

// ---------- LITE map: the same layers on a CPU canvas ----------
// In software GL Chrome rasterises SVG paths through SwiftShader, re-running every big path for every tile: one map
// re-raster cost ~3 s CPU, and the map re-rasters on every frame the camera or an effect moves. A 2D canvas created with
// willReadFrequently is CPU-backed (software Skia): the same Path2D data fills in a few tens of ms. Redrawn only on change.
const pathCache = new Map<string, Path2D>();
const P2 = (d: string) => {
  let p2 = pathCache.get(d);
  if (!p2) pathCache.set(d, (p2 = new Path2D(d)));
  return p2;
};
const drawMap = (ctx: CanvasRenderingContext2D, map: PetaMap, cam: Cam, fx: MapFx, detail: boolean, grid: number, v: View) => {
  const s = cam.s;
  const dd = detail ? map.detail ?? null : null;
  const land = dd ? dd.land : (thinD(map.land, s) as string);
  const coast = dd ? dd.coast : land;
  const deep = dd ? dd.deep : thinD(map.deep, s);
  const fr = dd ? dd.rect : [-PAD, -PAD, map.w + PAD, map.h + PAD];
  ctx.save();
  if (dd) {
    ctx.beginPath();
    ctx.rect(fr[0], fr[1], fr[2] - fr[0], fr[3] - fr[1]);
    ctx.clip();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = M.sea;
  ctx.fillRect(fr[0], fr[1], fr[2] - fr[0], fr[3] - fr[1]);
  if (deep && (fx.deep ?? 0) > 0) {
    ctx.save();
    if (fx.sonar) {
      const [cx, cy] = proj(fx.sonar.lon, fx.sonar.lat, map);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0.01, fx.sonar.r), 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.globalAlpha = fx.deep ?? 0;
    ctx.fillStyle = M.deep;
    ctx.fill(P2(deep));
    ctx.restore();
  }
  // graticule, only inside the viewport; dash phase anchored to the map so holds stay still
  const step = dd ? Math.max(1, grid / 5) : grid;
  const hx = v.W / 2 + 60, hy = v.H / 2 + 60; // half viewport + margin, screen px
  const [vl0, va1] = unproj(Math.max(fr[0], cam.x - hx / s), Math.max(fr[1], cam.y - hy / s), map);
  const [vl1, va0] = unproj(Math.min(fr[2], cam.x + hx / s), Math.min(fr[3], cam.y + hy / s), map);
  const lonA = Math.max(vl0, map.bbox[0]), lonB = Math.min(vl1, map.bbox[1]), latA = Math.max(va0, map.bbox[2]), latB = Math.min(va1, map.bbox[3]);
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5 / s;
  ctx.setLineDash([6 / s, 8 / s]);
  const yA = proj(0, latB, map)[1], yB = proj(0, latA, map)[1], xA = proj(lonA, 0, map)[0], xB = proj(lonB, 0, map)[0];
  for (let lo = Math.ceil(lonA / step) * step; lo <= lonB; lo += step) {
    const x = proj(lo, 0, map)[0];
    ctx.lineDashOffset = ((yA % (14 / s)) + 14 / s) % (14 / s);
    ctx.beginPath();
    ctx.moveTo(x, yA);
    ctx.lineTo(x, yB);
    ctx.stroke();
  }
  for (let la = Math.ceil(latA / step) * step; la <= latB; la += step) {
    const y = proj(0, la, map)[1];
    ctx.lineDashOffset = ((xA % (14 / s)) + 14 / s) % (14 / s);
    ctx.beginPath();
    ctx.moveTo(xA, y);
    ctx.lineTo(xB, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // dry shelf: the shallow-sea region (frame minus deep) faded in, tinted inside lon/lat polygons
  const shelf = fx.shelf ?? 0;
  if (deep && shelf > 0.5) {
    const q = Math.min(1, shelf / (fx.shelfFull ?? 340));
    const sh = P2(rectD(fr) + deep);
    ctx.globalAlpha = q;
    ctx.fillStyle = M.shelf;
    ctx.fill(sh, 'evenodd');
    for (const r of fx.shelfTints ?? []) {
      if (r.o <= 0) continue;
      ctx.save();
      ctx.clip(P2(polyD(r.region, map)));
      ctx.globalAlpha = q * r.o;
      ctx.fillStyle = r.color;
      ctx.fill(sh, 'evenodd');
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = M.land;
  ctx.fill(P2(land));
  for (const c of fx.countries ?? []) {
    const d = dd ? (dd.country === c.name ? dd.land : undefined) : thinD(map.countries?.[c.name], s);
    if (!d || c.o <= 0) continue;
    ctx.globalAlpha = c.o;
    ctx.fillStyle = c.color ?? M.yellow;
    ctx.fill(P2(d));
  }
  for (const f of fx.fills ?? []) {
    const d = dd?.islands?.[f.name] ?? thinD(map.islands?.[f.name], s);
    if (!d || f.o <= 0) continue;
    ctx.globalAlpha = f.o;
    ctx.fillStyle = f.color;
    ctx.fill(P2(d));
  }
  ctx.globalAlpha = 1;
  ctx.lineJoin = 'round';
  if (!dd && map.borders) {
    ctx.strokeStyle = M.border;
    ctx.lineWidth = 1.3 / s;
    ctx.stroke(P2(thinD(map.borders, s) as string));
  }
  ctx.strokeStyle = M.coast;
  ctx.lineWidth = 2.2 / s;
  ctx.stroke(P2(coast));
  ctx.restore();
};
const CanvasMap: React.FC<{cam: Cam; fx: MapFx; map: PetaMap; grid: number; main: boolean; detail: boolean; v: View}> = ({cam, fx, map, grid, main, detail, v}) => {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const last = React.useRef('');
  React.useLayoutEffect(() => {
    const key = JSON.stringify([cam, fx, main, detail, grid, v]);
    if (key === last.current) return; // unchanged since the last frame this tab drew: keep the pixels
    const ctx = ref.current?.getContext('2d', {willReadFrequently: true});
    if (!ctx) return;
    last.current = key;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = M.sea;
    ctx.fillRect(0, 0, v.W, v.H);
    ctx.setTransform(cam.s, 0, 0, cam.s, v.W / 2 - cam.x * cam.s, v.H / 2 - cam.y * cam.s);
    if (main) drawMap(ctx, map, cam, fx, false, grid, v);
    if (detail) drawMap(ctx, map, cam, fx, true, grid, v);
  });
  return <canvas ref={ref} width={v.W} height={v.H} style={{position: 'absolute', left: 0, top: 0}} />;
};

/**
 * Full-frame map under `cam` (render it first, everything else on top). With a baked 10m `detail` box the close-up
 * coast fades in over the 50m map while zooming in (s from detailAt[0] to detailAt[1]). Two MapViews in one frame need
 * different `id`s. `grid` = graticule step in degrees (the detail box uses grid/5). LITE quality draws on a canvas.
 */
export const MapView: React.FC<{cam: Cam; fx?: MapFx; map?: PetaMap; id?: string; grid?: number; detailAt?: [number, number]}> = ({
  cam, fx = {}, map = DEF, id = 'peta', grid = 5, detailAt = [4.2, 5.5],
}) => {
  const fr = useFrame();
  const v: View = cam.view ?? {W: fr.W, H: fr.H}; // the comp size; same centre as toScreen() when flyCam got the view
  const D = map.detail;
  const lod0 = D ? Math.min(1, Math.max(0, (cam.s - detailAt[0]) / (detailAt[1] - detailAt[0]))) : 0;
  const lite = isLite();
  const lod = lite ? (lod0 >= 0.5 ? 1 : 0) : lod0; // LITE: switch at the midpoint instead of drawing both maps
  // viewport in map px; skip the 50m map when the detail fully covers it
  const vx0 = cam.x - v.W / 2 / cam.s, vx1 = cam.x + v.W / 2 / cam.s, vy0 = cam.y - v.H / 2 / cam.s, vy1 = cam.y + v.H / 2 / cam.s;
  const covered = !!D && lod >= 1 && vx0 > D.rect[0] && vx1 < D.rect[2] && vy0 > D.rect[1] && vy1 < D.rect[3];
  if (lite) return <CanvasMap cam={cam} fx={fx} map={map} grid={grid} main={!covered} detail={!!D && lod > 0} v={v} />;
  return (
    <svg width={v.W} height={v.H} style={{position: 'absolute', left: 0, top: 0}}>
      {D && <defs><clipPath id={`${id}-detail-rect`}><path d={rectD(D.rect)} /></clipPath></defs>}
      <g transform={`translate(${v.W / 2} ${v.H / 2}) scale(${cam.s}) translate(${-cam.x} ${-cam.y})`}>
        {!covered && <MapLayers id={`${id}m`} map={map} cam={cam} fx={fx} detail={false} grid={grid} />}
        {D && lod > 0 && (
          <g clipPath={`url(#${id}-detail-rect)`} opacity={lod}>
            <MapLayers id={`${id}d`} map={map} cam={cam} fx={fx} detail grid={grid} />
          </g>
        )}
      </g>
    </svg>
  );
};

// ---------- screen-space marks on the map ----------
/** Smooth screen path through lon/lat points. */
export const geoPath = (cam: Cam, pts: LL[], map: PetaMap = DEF) => spline(pts.map(([lo, la]) => toScreen(cam, lo, la, map)));

/** Map label with a paper halo (SVG text, use inside an overlay <svg>). */
export const MapLabel: React.FC<{x: number; y: number; text: string; q: number; size?: number; color?: string; halo?: string; spacing?: number; serif?: boolean; italic?: boolean; anchor?: 'start' | 'middle' | 'end'; weight?: number}> = ({
  x, y, text, q, size = 34, color = M.ink, halo = M.land, spacing, serif, italic, anchor = 'middle', weight = 800,
}) => {
  if (q <= 0.01) return null;
  const lines = text.split('\n');
  return (
    <text x={x} y={y + (1 - q) * 14} textAnchor={anchor} opacity={Math.min(1, q * 1.4)} fill={color} stroke={halo} strokeWidth={size * 0.22} strokeLinejoin="round" paintOrder="stroke"
      style={{fontFamily: serif ? SERIF : LABEL, fontWeight: serif ? 400 : weight, fontStyle: italic ? 'italic' : 'normal', fontSize: size, letterSpacing: spacing ?? (serif ? size * 0.06 : size * 0.22)}}>
      {lines.map((l, i) => <tspan key={i} x={x} dy={i === 0 ? 0 : size * 1.08}>{l}</tspan>)}
    </text>
  );
};

/** Teardrop pin with pulse rings; tip at (x, y). */
export const Pin: React.FC<{x: number; y: number; q: number; t: number; color?: string; dot?: string; rings?: boolean; scale?: number}> = ({x, y, q, t, color = M.ink, dot = M.yellow, rings = true, scale = 1}) => {
  if (q <= 0.01) return null;
  const k = Math.min(1, q);
  return (
    <g>
      {rings && [0, 1].map((i) => {
        const ph = (((t + i * 0.8) % 1.6) + 1.6) % 1.6 / 1.6;
        return <circle key={i} cx={x} cy={y} r={(16 + ph * 90) * scale} fill="none" stroke={color} strokeWidth={3.5} opacity={(1 - ph) * 0.55 * k} />;
      })}
      <g transform={`translate(${x} ${y - (1 - k) * 220}) scale(${Math.min(1.15, q) * scale})`} opacity={k}>
        <ellipse cx={0} cy={2} rx={12} ry={4} fill={M.ink} opacity={0.25} />
        <path d="M 0 0 C -10 -20 -32 -37 -32 -61 A 32 32 0 1 1 32 -61 C 32 -37 10 -20 0 0 Z" fill={color} />
        <circle cx={0} cy={-61} r={13} fill={dot} />
      </g>
    </g>
  );
};

/** Red ✕ stamp: two strokes slam in. */
export const Cross: React.FC<{x: number; y: number; q: number; size?: number}> = ({x, y, q, size = 46}) => {
  if (q <= 0.01) return null;
  const a = pg(q, 0.2, 0.6), b = pg(q, 0.5, 1);
  const s = size;
  return (
    <g transform={`translate(${x} ${y}) rotate(-6) scale(${1.5 - 0.5 * Math.min(1, q * 1.6)})`}>
      <circle r={s * 1.25} fill={M.card} opacity={0.9 * Math.min(1, q * 2)} stroke={M.red} strokeWidth={5} />
      <line x1={-s * 0.62} y1={-s * 0.62} x2={-s * 0.62 + s * 1.24 * a} y2={-s * 0.62 + s * 1.24 * a} stroke={M.red} strokeWidth={s * 0.3} strokeLinecap="round" opacity={a > 0.01 ? 1 : 0} />
      <line x1={s * 0.62} y1={-s * 0.62} x2={s * 0.62 - s * 1.24 * b} y2={-s * 0.62 + s * 1.24 * b} stroke={M.red} strokeWidth={s * 0.3} strokeLinecap="round" opacity={b > 0.01 ? 1 : 0} />
    </g>
  );
};

/** Distance bar between two screen points with end ticks; draws on with q, label chip in the middle. */
export const Measure: React.FC<{a: [number, number]; b: [number, number]; q: number; label: string; labelQ: number; color?: string}> = ({a, b, q, label, labelQ, color = M.red}) => {
  if (q <= 0.01) return null;
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const nx = -Math.sin(ang) * 18, ny = Math.cos(ang) * 18;
  const half = pg(q, 0, 1) / 2;
  const p0 = [lerp(mx, a[0], half * 2), lerp(my, a[1], half * 2)], p1 = [lerp(mx, b[0], half * 2), lerp(my, b[1], half * 2)];
  const tick = pg(q, 0.7, 1);
  return (
    <g>
      <line x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} stroke={M.card} strokeWidth={11} strokeLinecap="round" />
      <line x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} stroke={color} strokeWidth={5} strokeLinecap="round" />
      {[a, b].map((e, i) => <line key={i} x1={e[0] - nx * tick} y1={e[1] - ny * tick} x2={e[0] + nx * tick} y2={e[1] + ny * tick} stroke={color} strokeWidth={5} strokeLinecap="round" opacity={tick > 0.01 ? 1 : 0} />)}
      {labelQ > 0.01 && (
        <g transform={`translate(${mx} ${my - 70}) scale(${0.7 + 0.3 * pb(labelQ, 0, 1)})`} opacity={Math.min(1, labelQ * 2)}>
          <rect x={-104} y={-38} width={208} height={66} fill={M.ink} />
          <path d="M -12 28 L 0 44 L 12 28 Z" fill={M.ink} />
          <text x={0} y={12} textAnchor="middle" fill="#fff" style={{fontFamily: LABEL, fontWeight: 800, fontSize: 44, letterSpacing: 4}}>{label}</text>
        </g>
      )}
    </g>
  );
};

/** Scale bar (top right; x = its right end): picks a round distance for the current zoom. */
export const ScaleBar: React.FC<{cam: Cam; map?: PetaMap; x?: number; y?: number; o?: number}> = ({cam, map = DEF, x: xp, y: yp, o = 1}) => {
  const fr = useFrame();
  const x = xp ?? fr.W - fr.pick(130, fr.safe.side), y = yp ?? fr.pick(128, 100);
  const kpp = kmPerPx(cam, map);
  const nice = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];
  const km = nice.find((n) => n / kpp >= 110) ?? 2000;
  const len = km / kpp;
  return (
    <svg width={fr.W} height={Math.max(220, y + 92)} style={{position: 'absolute', left: 0, top: 0, opacity: o}}>
      <g transform={`translate(${x} ${y})`}>
        <rect x={-len} y={-6} width={len / 2} height={10} fill={M.ink} />
        <rect x={-len / 2} y={-6} width={len / 2} height={10} fill={M.card} stroke={M.ink} strokeWidth={2} />
        <rect x={-len} y={-6} width={len} height={10} fill="none" stroke={M.ink} strokeWidth={2} />
        <text x={0} y={-16} textAnchor="end" fill={M.ink} style={{fontFamily: LABEL, fontWeight: 800, fontSize: 24, letterSpacing: 3}}>{km.toLocaleString('id-ID')} KM</text>
        <text x={-len} y={-16} textAnchor="start" fill={M.ink} style={{fontFamily: LABEL, fontWeight: 800, fontSize: 24}}>0</text>
        <g transform={`translate(${-len - 46} -2)`}>
          <path d="M 0 -26 L 11 10 L 0 3 L -11 10 Z" fill={M.ink} />
          <text x={0} y={34} textAnchor="middle" fill={M.ink} style={{fontFamily: LABEL, fontWeight: 800, fontSize: 22}}>U</text>
        </g>
      </g>
    </svg>
  );
};

// ---------- cards & type ----------
/** Highlighter sweep behind inline text. */
export const Hl: React.FC<{q: number; children: React.ReactNode; color?: string}> = ({q, children, color = M.yellow}) => (
  <span style={{background: `linear-gradient(${color}, ${color}) no-repeat 0 88% / ${100 * q}% 40%`, padding: '0 4px', margin: '0 -4px'}}>{children}</span>
);
export const Kicker: React.FC<{children: React.ReactNode; color?: string; size?: number}> = ({children, color = M.red, size = 34}) => (
  <div style={{fontFamily: LABEL, fontWeight: 800, fontSize: size, letterSpacing: size * 0.3, color}}>{children}</div>
);
/** Headline block over the map (kicker + serif lines), slides in/out; `q` 0..1. Landscape default: top-left column
 *  (left 110, 1000 px wide); pass `left`/`width` to put it elsewhere (e.g. the right half). */
export const Headline: React.FC<{q: number; top?: number; kicker?: React.ReactNode; children: React.ReactNode; size?: number; kickerColor?: string; left?: number; width?: number}> = ({q, top: topP, kicker, children, size = 112, kickerColor, left: leftP, width}) => {
  const fr = useFrame();
  if (q <= 0.01) return null;
  const top = topP ?? fr.pick(200, 116), left = leftP ?? fr.pick(70, fr.safe.side);
  const right = width !== undefined ? fr.W - left - width : fr.pick(110, fr.W - left - 1000);
  return (
    <div style={{position: 'absolute', left, right, top, opacity: Math.min(1, q * 1.5), transform: `translateY(${(1 - q) * -40}px)`}}>
      {kicker && <Kicker color={kickerColor}>{kicker}</Kicker>}
      <div style={{fontFamily: SERIF, fontSize: size, lineHeight: 1.02, color: M.ink, marginTop: kicker ? 12 : 0}}>{children}</div>
    </div>
  );
};
/** Paper veil at the top so headlines read over the map (landscape default height 440). */
export const TopVeil: React.FC<{o: number; h?: number}> = ({o, h}) => {
  const fr = useFrame();
  return o > 0.01 ? <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: h ?? fr.pick(720, 440), opacity: o, background: `linear-gradient(${M.sea}F2 0%, ${M.sea}D9 45%, ${M.sea}00 100%)`}} /> : null;
};

/** Vox-style white card with a thin rule and a source line. Landscape default: a 900 px column at the left (pass
 *  left/right for the right column, e.g. left = W − 110 − 900, right = 110). */
export const Card: React.FC<{q: number; top: number; children: React.ReactNode; source?: string; left?: number; right?: number; pad?: string}> = ({q, top, children, source, left: leftP, right: rightP, pad = '34px 40px 26px'}) => {
  const fr = useFrame();
  const left = leftP ?? fr.pick(70, fr.safe.side), right = rightP ?? fr.pick(110, fr.W - left - 900);
  return q > 0.01 ? (
    <div style={{position: 'absolute', left, right, top, opacity: Math.min(1, q * 1.5), transform: `translateY(${(1 - q) * 70}px)`, background: M.card, boxShadow: isLite() ? '0 10px 0 rgba(31,42,51,0.10)' : '0 18px 50px rgba(31,42,51,0.18)', padding: pad}}>
      {children}
      {source && <div style={{marginTop: 18, paddingTop: 12, borderTop: `2px solid ${M.ink}18`, fontFamily: LABEL, fontWeight: 600, fontSize: 24, letterSpacing: 3, color: M.grey}}>{source}</div>}
    </div>
  ) : null;
};

export const LowerThird: React.FC<{q: number; top: number; title: string; sub: string; accent?: string; icon?: React.ReactNode; size?: number; left?: number}> = ({q, top, title, sub, accent = M.red, icon, size = 74, left}) => {
  const fr = useFrame();
  return q > 0.01 ? (
    <div style={{position: 'absolute', left: left ?? fr.pick(70, fr.safe.side), top, display: 'flex', alignItems: 'stretch'}}>
      <div style={{width: 16, background: accent, transform: `scaleY(${pb(q, 0, 0.5)})`}} />
      <div style={{display: 'flex', alignItems: 'center', gap: 22, background: M.card, padding: '20px 30px 18px 22px', clipPath: `inset(0 ${100 - 100 * pg(q, 0.15, 1)}% 0 0)`, boxShadow: isLite() ? '0 8px 0 rgba(31,42,51,0.10)' : '0 14px 40px rgba(31,42,51,0.18)'}}>
        {icon}
        <div>
          <div style={{fontFamily: SERIF, fontSize: size, lineHeight: 1, color: M.ink}}>{title}</div>
          <div style={{fontFamily: LABEL, fontWeight: 800, fontSize: 30, letterSpacing: 5, color: accent, marginTop: 10}}>{sub}</div>
        </div>
      </div>
    </div>
  ) : null;
};

/** Small dark chip (legend / tag). */
export const Chip: React.FC<{q: number; x: number; y: number; children: React.ReactNode; bg?: string; color?: string; size?: number}> = ({q, x, y, children, bg = M.ink, color = '#fff', size = 30}) =>
  q > 0.01 ? (
    <div style={{position: 'absolute', left: x, top: y, background: bg, color, padding: '8px 16px 7px', fontFamily: LABEL, fontWeight: 800, fontSize: size, letterSpacing: size * 0.18, opacity: Math.min(1, q * 1.6),
      transformOrigin: '0 50%', transform: `scaleX(${0.6 + 0.4 * pg(q, 0, 1)})`, display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap'}}>
      {children}
    </div>
  ) : null;

export const Grain: React.FC = () => isLite()
  ? <AbsoluteFill style={{backgroundImage: noise(0.75, 3, 4, 360), opacity: 0.06, pointerEvents: 'none', willChange: 'transform'}} />
  : <AbsoluteFill style={{backgroundImage: noise(0.75, 3, 4, 360), opacity: 0.16, mixBlendMode: 'multiply', pointerEvents: 'none'}} />;

/** Word-synced caption (prototype design): dark box, spoken word in highlighter yellow. Portrait: top 1580. Landscape:
 *  centred, ≤ 1400 px wide, bottom edge 130 px above the frame bottom (grows upward); `top` overrides both. */
export const Caption: React.FC<{t: number; pages: CaptionPage[]; top?: number}> = ({t, pages, top}) => {
  const fr = useFrame();
  const page = pageAt(t, pages);
  if (!page) return null;
  const pop = pg(t, page.start - 0.08, page.start + 0.12);
  const side = fr.pick(60, (fr.W - fr.captionW) / 2);
  const place: React.CSSProperties = top !== undefined || !fr.wide ? {top: top ?? 1580} : {bottom: fr.safe.bottom + 10};
  return (
    <div style={{position: 'absolute', left: side, right: side, ...place, display: 'flex', justifyContent: 'center', opacity: pop, transform: `translateY(${(1 - pop) * 10}px)`}}>
      <div style={{background: 'rgba(31,42,51,0.86)', padding: '10px 24px', fontFamily: LABEL, fontWeight: 600, fontSize: 56, lineHeight: 1.15, color: '#fff', textAlign: 'center', letterSpacing: 0.5}}>
        {page.words.map((w, i) => {
          const on = t >= w.start - 0.04 && t < w.end + 0.1;
          return <React.Fragment key={i}><span style={{color: on ? M.yellow : t >= w.start - 0.04 ? '#fff' : '#ffffff66'}}>{display(w.word)}</span>{i < page.words.length - 1 ? ' ' : ''}</React.Fragment>;
        })}
      </div>
    </div>
  );
};

// ---------- original flat icons (drawn in a -50..50 box, facing right) ----------
const OR = '#E08A3C', CREAM = '#F7EBD3', BRANCH = '#8A6A4A';
export type AnimalKind = 'harimau' | 'badak' | 'gajah' | 'orangutan' | 'kakatua' | 'kuskus' | 'kanguru' | 'burung';
export const AnimalArt: React.FC<{kind: AnimalKind}> = ({kind}) => {
  const ink = M.ink;
  switch (kind) {
    case 'harimau':
      return (
        <g>
          <path d="M -30 -4 C -42 -8 -46 -20 -40 -30" fill="none" stroke={OR} strokeWidth={6} strokeLinecap="round" />
          <path d="M -40 -30 C -42 -26 -42 -24 -40 -21" fill="none" stroke={ink} strokeWidth={6} strokeLinecap="round" />
          {[-27, -14, 8, 19].map((x, i) => <rect key={i} x={x} y={0} width={9} height={22} rx={4} fill={i % 2 ? '#D27A2E' : OR} />)}
          <rect x={-34} y={-18} width={58} height={26} rx={13} fill={OR} />
          <path d="M -26 -18 q 5 9 0 18 M -14 -18 q 5 10 0 20 M -2 -18 q 5 9 0 18 M 10 -17 q 4 8 0 15" fill="none" stroke={ink} strokeWidth={3.2} strokeLinecap="round" />
          <circle cx={19} cy={-27} r={5.5} fill={OR} /><circle cx={33} cy={-28} r={5.5} fill={OR} />
          <circle cx={19} cy={-27} r={2.4} fill={ink} /><circle cx={33} cy={-28} r={2.4} fill={ink} />
          <circle cx={26} cy={-14} r={14} fill={OR} />
          <ellipse cx={34} cy={-8} rx={8} ry={6} fill={CREAM} />
          <circle cx={39} cy={-10} r={2.6} fill={ink} />
          <circle cx={27} cy={-17} r={2.2} fill={ink} />
          <path d="M 17 -22 l 4 4 M 14 -15 l 5 1" stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
        </g>
      );
    case 'badak':
      return (
        <g>
          {[-26, -12, 8, 20].map((x, i) => <rect key={i} x={x} y={2} width={11} height={22} rx={3} fill={i % 2 ? '#6F787E' : '#7C858B'} />)}
          <ellipse cx={-4} cy={-2} rx={32} ry={19} fill="#8C949A" />
          <path d="M 16 -14 Q 34 -14 46 2 L 46 10 Q 34 14 16 12 Z" fill="#8C949A" />
          <path d="M 41 0 L 49 -17 L 46 3 Z" fill={CREAM} stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
          <path d="M 33 -7 L 36 -16 L 38 -6 Z" fill={CREAM} stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
          <path d="M 18 -14 L 21 -26 L 26 -13 Z" fill="#7C858B" />
          <circle cx={30} cy={-4} r={2.2} fill={ink} />
          <path d="M -18 -18 q 3 14 0 30 M 6 -18 q -3 14 0 30" fill="none" stroke="#6F787E" strokeWidth={2.4} />
          <path d="M -36 -6 q -6 4 -4 10" fill="none" stroke="#6F787E" strokeWidth={3} strokeLinecap="round" />
        </g>
      );
    case 'gajah':
      return (
        <g>
          {[-30, -16, 4, 16].map((x, i) => <rect key={i} x={x} y={4} width={13} height={22} rx={4} fill={i % 2 ? '#6C7880' : '#76828A'} />)}
          <ellipse cx={-8} cy={-4} rx={32} ry={24} fill="#7E8A93" />
          <path d="M -40 -6 q -6 6 -3 14" fill="none" stroke="#6C7880" strokeWidth={3} strokeLinecap="round" />
          <circle cx={24} cy={-12} r={17} fill="#7E8A93" />
          <path d="M 36 -6 C 46 4 44 18 37 26" fill="none" stroke="#7E8A93" strokeWidth={10} strokeLinecap="round" />
          <path d="M 33 4 q 8 4 12 -2" fill="none" stroke={CREAM} strokeWidth={4} strokeLinecap="round" />
          <ellipse cx={14} cy={-8} rx={11} ry={16} fill="#9AA5AD" />
          <circle cx={30} cy={-16} r={2.4} fill={ink} />
        </g>
      );
    case 'orangutan':
      return (
        <g>
          <path d="M -15 -6 C -30 6 -34 24 -28 38" fill="none" stroke="#B5582A" strokeWidth={10} strokeLinecap="round" />
          <path d="M 15 -6 C 30 6 34 24 28 38" fill="none" stroke="#B5582A" strokeWidth={10} strokeLinecap="round" />
          <ellipse cx={0} cy={12} rx={20} ry={23} fill="#C0612B" />
          <ellipse cx={-10} cy={34} rx={10} ry={6} fill="#A94F24" /><ellipse cx={10} cy={34} rx={10} ry={6} fill="#A94F24" />
          <circle cx={0} cy={-20} r={15} fill="#C0612B" />
          <ellipse cx={0} cy={-16} rx={10} ry={11} fill="#E9B48C" />
          <circle cx={-4} cy={-20} r={2.2} fill={ink} /><circle cx={4} cy={-20} r={2.2} fill={ink} />
          <path d="M -4 -11 q 4 3 8 0" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" />
          <path d="M -6 -35 q 2 -6 6 -2 q 3 -6 6 0" fill="none" stroke="#C0612B" strokeWidth={4} strokeLinecap="round" />
        </g>
      );
    case 'kakatua':
      return (
        <g>
          <line x1={-34} y1={32} x2={34} y2={26} stroke={BRANCH} strokeWidth={6} strokeLinecap="round" />
          <path d="M 2 -27 C -2 -42 -10 -48 -20 -48 C -8 -42 -4 -36 -2 -28 Z" fill={M.yellow} stroke={ink} strokeWidth={1.8} strokeLinejoin="round" />
          <path d="M 5 -28 C 4 -44 -2 -52 -10 -55 C -2 -46 0 -38 0 -29 Z" fill={M.yellow} stroke={ink} strokeWidth={1.8} strokeLinejoin="round" />
          <path d="M 8 -28 C 10 -42 6 -50 2 -54 C 8 -46 10 -38 5 -28 Z" fill={M.yellow} stroke={ink} strokeWidth={1.8} strokeLinejoin="round" />
          <path d="M -8 18 L -16 42 L -2 38 Z" fill="#fff" stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
          <ellipse cx={-2} cy={4} rx={15} ry={23} transform="rotate(-14 -2 4)" fill="#fff" stroke={ink} strokeWidth={2.2} />
          <path d="M -12 -2 C -8 12 -2 20 6 22" fill="none" stroke="#D9D4C6" strokeWidth={3} />
          <circle cx={8} cy={-18} r={12} fill="#fff" stroke={ink} strokeWidth={2.2} />
          <path d="M 17 -22 C 26 -22 26 -11 19 -9 C 18 -13 17 -16 17 -22 Z" fill="#3A434A" />
          <circle cx={10} cy={-20} r={2.3} fill={ink} />
          <path d="M -4 26 l -2 6 M 4 26 l 1 6" stroke={ink} strokeWidth={2.6} strokeLinecap="round" />
        </g>
      );
    case 'kuskus':
      return (
        <g>
          <line x1={-40} y1={24} x2={40} y2={20} stroke={BRANCH} strokeWidth={6} strokeLinecap="round" />
          <path d="M -22 12 C -38 16 -40 34 -28 36 C -20 37 -20 28 -26 28" fill="none" stroke="#E4D5B2" strokeWidth={7} strokeLinecap="round" />
          <ellipse cx={-4} cy={6} rx={24} ry={18} fill="#EDE2C8" stroke="#CDBB94" strokeWidth={2} />
          {[[-14, 0], [-4, 12], [6, 2], [-18, 14]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx={5} ry={4} fill="#B79E7A" opacity={0.75} />)}
          <circle cx={19} cy={-8} r={15} fill="#EDE2C8" stroke="#CDBB94" strokeWidth={2} />
          <circle cx={9} cy={-20} r={3.5} fill="#CDBB94" /><circle cx={27} cy={-21} r={3.5} fill="#CDBB94" />
          <circle cx={14} cy={-10} r={5} fill={ink} /><circle cx={25} cy={-10} r={5} fill={ink} />
          <circle cx={15.5} cy={-11.5} r={1.6} fill="#fff" /><circle cx={26.5} cy={-11.5} r={1.6} fill="#fff" />
          <ellipse cx={20} cy={-2} rx={3.4} ry={2.4} fill="#D98C7C" />
        </g>
      );
    case 'kanguru':
      return (
        <g>
          <line x1={-40} y1={18} x2={40} y2={14} stroke={BRANCH} strokeWidth={6} strokeLinecap="round" />
          <path d="M -8 16 C -14 28 -12 40 -6 50" fill="none" stroke="#8A4E31" strokeWidth={8} strokeLinecap="round" />
          <ellipse cx={0} cy={-2} rx={16} ry={21} fill="#9A5A3A" />
          <ellipse cx={3} cy={2} rx={9} ry={14} fill="#D9A877" />
          <ellipse cx={-8} cy={16} rx={9} ry={5} fill="#8A4E31" /><ellipse cx={10} cy={16} rx={9} ry={5} fill="#8A4E31" />
          <circle cx={-3} cy={-36} r={4.6} fill="#8A4E31" /><circle cx={11} cy={-36} r={4.6} fill="#8A4E31" />
          <circle cx={4} cy={-27} r={11.5} fill="#9A5A3A" />
          <ellipse cx={8} cy={-23} rx={6} ry={4.5} fill="#D9A877" />
          <circle cx={1} cy={-29} r={2} fill={ink} /><circle cx={9} cy={-29} r={2} fill={ink} />
          <circle cx={9} cy={-24} r={1.8} fill={ink} />
          <path d="M 12 -6 q 8 4 10 12 M -12 -6 q -6 6 -6 14" fill="none" stroke="#8A4E31" strokeWidth={5} strokeLinecap="round" />
        </g>
      );
    case 'burung':
      return (
        <g>
          <line x1={-34} y1={26} x2={34} y2={22} stroke={BRANCH} strokeWidth={6} strokeLinecap="round" />
          <path d="M -16 6 L -40 -2 L -36 12 Z" fill="#3E5A6E" />
          <ellipse cx={-2} cy={6} rx={20} ry={15} fill="#4F6E83" />
          <ellipse cx={4} cy={10} rx={12} ry={9} fill="#E9D7A6" />
          <circle cx={14} cy={-10} r={11} fill="#4F6E83" />
          <path d="M 24 -12 L 34 -9 L 24 -6 Z" fill="#E2A33A" />
          <circle cx={17} cy={-12} r={2.2} fill={ink} />
          <path d="M -12 2 q 10 -8 20 0" fill="none" stroke="#3E5A6E" strokeWidth={3} strokeLinecap="round" />
          <path d="M -2 21 l -2 5 M 6 21 l 1 5" stroke={ink} strokeWidth={2.4} strokeLinecap="round" />
        </g>
      );
  }
};
export const ANIMAL_NAME: Record<AnimalKind, string> = {
  harimau: 'HARIMAU', badak: 'BADAK', gajah: 'GAJAH', orangutan: 'ORANGUTAN', kakatua: 'KAKATUA', kuskus: 'KUSKUS', kanguru: 'KANGURU POHON', burung: 'BURUNG',
};

/**
 * Round icon badge with a name tag, centred at (x, y); optional leader line to a map point `anchor` (screen px).
 * Uses an animal from the library (`kind`) or any art drawn in a -50..50 box (`art` + `name`).
 */
export const Badge: React.FC<{x: number; y: number; q: number; kind?: AnimalKind; art?: React.ReactNode; name?: string; ring?: string; r?: number; anchor?: [number, number]; label?: boolean; t?: number}> = ({
  x, y, q, kind, art, name: nameProp, ring = M.ink, r = 62, anchor, label = true, t = 0,
}) => {
  if (q <= 0.01) return null;
  const k = Math.min(1, q);
  const bob = Math.sin(t * 2.2 + x * 0.01) * 3 * k;
  const name = nameProp ?? (kind ? ANIMAL_NAME[kind] : '');
  const tw = name.length * 15 + 26;
  return (
    <g opacity={Math.min(1, q * 2)}>
      {anchor && (
        <>
          <line x1={anchor[0]} y1={anchor[1]} x2={lerp(anchor[0], x, k)} y2={lerp(anchor[1], y + bob, k)} stroke={M.ink} strokeWidth={3} />
          <circle cx={anchor[0]} cy={anchor[1]} r={7} fill={M.ink} stroke={M.card} strokeWidth={3} />
        </>
      )}
      <g transform={`translate(${x} ${y + bob}) scale(${q})`}>
        <circle r={r + 4} fill={M.ink} opacity={0.16} cy={6} />
        <circle r={r} fill={M.card} stroke={ring} strokeWidth={5} />
        <g transform={`scale(${(r / 62) * 0.98})`}>{art ?? (kind ? <AnimalArt kind={kind} /> : null)}</g>
        {label && name && (
          <g transform={`translate(0 ${r + 24})`}>
            <rect x={-tw / 2} y={-20} width={tw} height={38} fill={ring} />
            <text x={0} y={9} textAnchor="middle" fill="#fff" style={{fontFamily: LABEL, fontWeight: 800, fontSize: 26, letterSpacing: 3}}>{name}</text>
          </g>
        )}
      </g>
    </g>
  );
};

/** Wooden sailing boat, centred on its waterline (move it along a route with a bob). */
export const Boat: React.FC = () => (
  <g>
    <path d="M -34 0 L 34 0 L 24 14 L -24 14 Z" fill="#7A5236" stroke={M.ink} strokeWidth={2.5} strokeLinejoin="round" />
    <line x1={0} y1={0} x2={0} y2={-52} stroke={M.ink} strokeWidth={3} />
    <path d="M 3 -50 L 30 -6 L 3 -6 Z" fill={M.card} stroke={M.ink} strokeWidth={2.5} strokeLinejoin="round" />
    <path d="M -3 -42 L -24 -6 L -3 -6 Z" fill="#EADFC8" stroke={M.ink} strokeWidth={2.5} strokeLinejoin="round" />
  </g>
);
/** Modern car ferry, centred on its waterline. */
export const Ferry: React.FC = () => (
  <g>
    <path d="M -46 0 L 46 0 L 38 16 L -40 16 Z" fill={M.card} stroke={M.ink} strokeWidth={3} strokeLinejoin="round" />
    <rect x={-46} y={4} width={92} height={5} fill={M.red} />
    <rect x={-30} y={-18} width={56} height={18} fill={M.card} stroke={M.ink} strokeWidth={3} />
    <rect x={-16} y={-32} width={30} height={14} fill={M.card} stroke={M.ink} strokeWidth={3} />
    {[-24, -14, -4, 6, 16].map((x) => <rect key={x} x={x} y={-12} width={6} height={6} fill={M.ink} />)}
    <rect x={2} y={-44} width={7} height={12} fill={M.ink} />
  </g>
);
/** Generic explorer silhouette (no likeness): brimmed hat, collar, satchel strap. */
export const Explorer: React.FC<{size?: number}> = ({size = 120}) => (
  <svg width={size} height={size} viewBox="-50 -50 100 100" style={{display: 'block', background: M.yellow}}>
    <path d="M -40 50 C -38 20 -22 12 0 12 C 22 12 38 20 40 50 Z" fill={M.ink} />
    <path d="M -14 14 L 0 30 L 14 14" fill="none" stroke={M.yellow} strokeWidth={3} />
    <path d="M -26 20 L 22 50" stroke="#C49A5A" strokeWidth={5} />
    <ellipse cx={0} cy={-6} rx={16} ry={19} fill={M.ink} />
    <ellipse cx={0} cy={-20} rx={34} ry={7} fill={M.ink} />
    <path d="M -18 -21 C -16 -42 16 -42 18 -21 Z" fill={M.ink} />
    <rect x={-18} y={-26} width={36} height={5} fill="#C49A5A" />
  </svg>
);
export const ClockIcon: React.FC<{t: number; size?: number}> = ({t, size = 56}) => (
  <svg width={size} height={size} viewBox="-30 -30 60 60" style={{display: 'block'}}>
    <circle r={26} fill={M.card} stroke={M.ink} strokeWidth={5} />
    <line x1={0} y1={0} x2={0} y2={-16} stroke={M.ink} strokeWidth={4} strokeLinecap="round" transform={`rotate(${t * 40})`} />
    <line x1={0} y1={0} x2={0} y2={-20} stroke={M.red} strokeWidth={3} strokeLinecap="round" transform={`rotate(${t * 480})`} />
    <circle r={3.5} fill={M.ink} />
  </svg>
);

// ---------- chart pieces ----------
/** Vertical sea-level gauge: water drops to `level` metres (negative). */
export const LevelGauge: React.FC<{level: number; h?: number; min?: number}> = ({level, h = 230, min = -150}) => {
  const y = (m: number) => 14 + (m / min) * (h - 28);
  return (
    <svg width={150} height={h} style={{display: 'block'}}>
      <rect x={30} y={8} width={60} height={h - 16} fill={M.land} stroke={M.ink} strokeWidth={3} />
      <rect x={33} y={y(level)} width={54} height={Math.max(0, h - 11 - y(level))} fill={M.deep} />
      <line x1={33} y1={y(level)} x2={87} y2={y(level)} stroke={M.red} strokeWidth={4} />
      {[0, -50, -100, -150].map((m) => (
        <g key={m}>
          <line x1={90} y1={y(m)} x2={m % 100 === 0 ? 108 : 100} y2={y(m)} stroke={M.ink} strokeWidth={2.5} />
          {m % 100 === 0 && <text x={112} y={y(m) + 8} fill={M.ink} style={{fontFamily: LABEL, fontWeight: 800, fontSize: 22}}>{m === 0 ? '0' : m}</text>}
        </g>
      ))}
      <line x1={22} y1={y(0)} x2={30} y2={y(0)} stroke={M.ink} strokeWidth={2.5} strokeDasharray="4 3" />
      <text x={2} y={h - 4} fill={M.grey} style={{fontFamily: LABEL, fontWeight: 800, fontSize: 18, letterSpacing: 2}}>M</text>
    </svg>
  );
};

/** Default schematic seabed (x 0..1, metres): coast, shallow shelf, steep drop, deep channel, slope, far coast. */
export const STRAIT_BED: Array<[number, number]> = [[0, 34], [0.07, 14], [0.12, -30], [0.24, -70], [0.31, -130], [0.39, -270], [0.5, -320], [0.6, -280], [0.7, -140], [0.8, -50], [0.88, 10], [1, 42]];
/**
 * Schematic sea cross-section (860 × 360, y axis 0 … −400 m): seabed `bed`, today's level and a lowered level (`level` m,
 * `drop` 0..1 shows the dry seabed hatched); water stays only below the lowered line. Put it in a Card marked SKEMATIS.
 */
export const StraitSection: React.FC<{level: number; drop: number; t: number; bed?: Array<[number, number]>; left?: string; right?: string;
  nowLabel?: string; lowLabel?: string; dropLabel?: string; keepLabel?: string}> = ({
  level, drop, t, bed = STRAIT_BED, left = 'BALI', right = 'LOMBOK', nowLabel = 'MUKA LAUT KINI', lowLabel = 'MUKA LAUT ZAMAN ES', dropLabel = '> 100 M', keepLabel = 'TETAP LAUT',
}) => {
  const Wd = 860, Hd = 360, x0 = 78;
  const y = (m: number) => 96 + (-m / 400) * 330; // 0 m at y 96, -300 m at y 343
  const X = (u: number) => x0 + u * (Wd - x0 - 6);
  const bedD = spline(bed.map(([u, m]) => [X(u), y(m)] as [number, number]));
  const ground = `${bedD} L ${X(1)} ${Hd} L ${X(0)} ${Hd} Z`;
  const L = level;
  const surf = y(L);
  const wave = `M ${X(0)} ${surf} ` + Array.from({length: 26}, (_, i) => `Q ${X((i + 0.5) / 26)} ${surf + Math.sin(t * 3 + i * 1.7) * 3} ${X((i + 1) / 26)} ${surf}`).join(' ');
  const label = (x: number, yy: number, text: string, color: string = M.ink, anchor: 'start' | 'middle' | 'end' = 'start', size = 22) => (
    <text x={x} y={yy} textAnchor={anchor} fill={color} style={{fontFamily: LABEL, fontWeight: 800, fontSize: size, letterSpacing: 2.5}}>{text}</text>
  );
  return (
    <svg width={Wd} height={Hd} style={{display: 'block'}}>
      <defs>
        <clipPath id="sec-water"><rect x={X(0)} y={surf} width={Wd} height={Hd} /></clipPath>
        <clipPath id="sec-dry"><rect x={X(0)} y={y(0)} width={Wd} height={Math.max(0, surf - y(0))} /></clipPath>
        <pattern id="sec-hatch" patternUnits="userSpaceOnUse" width={10} height={10} patternTransform="rotate(45)"><line x1={0} y1={0} x2={0} y2={10} stroke={M.hatch} strokeWidth={2.6} /></pattern>
      </defs>
      {[0, -100, -200, -300].map((m) => (
        <g key={m}>
          <line x1={x0} y1={y(m)} x2={Wd} y2={y(m)} stroke={M.ink} strokeOpacity={m ? 0.1 : 0} strokeWidth={2} />
          <text x={x0 - 10} y={y(m) + 8} textAnchor="end" fill={M.grey} style={{fontFamily: LABEL, fontWeight: 600, fontSize: 22}}>{m === 0 ? '0 M' : `${m}`}</text>
        </g>
      ))}
      <g clipPath="url(#sec-water)"><rect x={X(0)} y={0} width={Wd} height={Hd} fill={M.deep} /></g>
      <path d={ground} fill="#E4DAC4" />
      <g clipPath="url(#sec-dry)" opacity={drop}>
        <path d={ground} fill={M.shelf} />
        <path d={ground} fill="url(#sec-hatch)" />
      </g>
      <path d={bedD} fill="none" stroke={M.coast} strokeWidth={3} />
      <path d={wave} fill="none" stroke="#5E8C99" strokeWidth={3} />
      {/* today's level stays as a dashed reference once the sea drops */}
      <line x1={X(0)} y1={y(0)} x2={Wd} y2={y(0)} stroke={M.ink} strokeWidth={2.5} strokeDasharray={drop > 0.05 ? '9 7' : '0'} />
      {label(X(0.0), y(0) - 52, left, M.ink, 'start', 26)}
      {label(X(1), y(0) - 52, right, M.ink, 'end', 26)}
      {label(X(0.5), y(0) - 12, nowLabel, M.ink, 'middle')}
      <g opacity={drop}>
        {label(X(0.5), surf + 30, lowLabel, M.red, 'middle')}
        <line x1={X(0.5)} y1={y(0) + 6} x2={X(0.5)} y2={surf - 8} stroke={M.red} strokeWidth={4} />
        <path d={`M ${X(0.5) - 9} ${surf - 16} L ${X(0.5)} ${surf - 4} L ${X(0.5) + 9} ${surf - 16} Z`} fill={M.red} />
        {label(X(0.5) + 16, (y(0) + surf) / 2 + 9, dropLabel, M.red, 'start', 26)}
        {label(X(0.5), y(-245), keepLabel, M.ink, 'middle', 24)}
      </g>
    </svg>
  );
};

/** Two-sided spectrum bar (cool → warm) with a sliding marker at u (0..1) and an end label under each side. */
export const Spectrum: React.FC<{q: number; u: number; left: string; right: string; width?: number; leftColor?: string; rightColor?: string}> = ({
  q, u, left, right, width = 860, leftColor = M.west, rightColor = M.east,
}) =>
  q > 0.01 ? (
    <div style={{opacity: Math.min(1, q * 1.5), width}}>
      <div style={{position: 'relative', height: 26, background: `linear-gradient(90deg, ${leftColor}, #C8BFA8 50%, ${rightColor})`, clipPath: `inset(0 ${100 - 100 * pg(q, 0, 1)}% 0 0)`}}>
        <div style={{position: 'absolute', left: `calc(${100 * u}% - 14px)`, top: -12, width: 28, height: 50, background: M.ink, border: `4px solid ${M.card}`, boxSizing: 'border-box'}} />
      </div>
      <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 12, fontFamily: LABEL, fontWeight: 800, fontSize: 28, letterSpacing: 6}}>
        <span style={{color: leftColor}}>{left}</span><span style={{color: rightColor}}>{right}</span>
      </div>
    </div>
  ) : null;
