#!/usr/bin/env node
// PETA map baker — turns Natural Earth GeoJSON (public domain) into the small JSON of SVG paths that the PETA kit reads
// (`<MapView map={...}>`, `shot`, `toScreen`, … in src/styles/peta/kit.tsx). One Mercator for everything; paths are in
// "map px" (0..width across the bbox). Run it once per region, commit the JSON, import it in your episode.
//
// Get the data (needs network egress; files are public domain) from
//   https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/<name>.geojson
//   ne_50m_land            coastlines for the main map               (1.6 MB)
//   ne_50m_admin_0_countries  borders + country fills (property ADMIN) (3 MB)
//   ne_10m_land            detailed coast for one close-up box       (10 MB)   optional
//   ne_10m_bathymetry_K_200   sea deeper than 200 m                   (4 MB)    optional
// Offline? The bundled src/styles/peta/map-nusantara.json (Indonesia, lon 86..160, lat -48..48) needs no download.
//
// usage:
//   node scripts/make-map.mjs --out src/styles/peta/map-<region>.json --bbox lonMin,lonMax,latMin,latMax [--width 3200]
//     --land ne_50m_land.geojson [--countries ne_50m_admin_0_countries.geojson] [--country Italy --country Greece]
//     [--deep ne_10m_bathymetry_K_200.geojson]
//     [--island Sicilia=14.2,37.5 ...]                        land polygon that contains the point -> islands.<Name>
//     [--detail-land ne_10m_land.geojson --detail-box lonMin,lonMax,latMin,latMax [--detail-island Name=lon,lat ...]
//      [--detail-country Italy]]                               close-up box drawn from 10m data when the camera zooms in;
//                                                              --detail-country = all detail land belongs to that country
//     [--place Roma=12.4964,41.9028 ...]                      projected points -> places.<Name>
//     [--tol 1.3] [--detail-tol 0.07]                         simplification tolerance in map px
//
// Pick the bbox ~20% larger than the widest shot: land is clipped at the bbox, and a clipped continent shows a straight
// edge if the camera ever sees it. Keep the JSON under ~1.5 MB (raise --tol, shrink the bbox or the detail box).
//
// Output shape (all strings are SVG path data in map px):
//   {w, h, bbox, land, borders?, countries?: {Name: d}, deep?, islands?: {Name: d},
//    detail?: {rect: [x0, y0, x1, y1], land, coast, deep?, islands?: {Name: d}, country?}, places?: {Name: [x, y]}}
import fs from 'node:fs';

// ---------- args ----------
const argv = process.argv.slice(2);
const opt = {};
const multi = {country: [], island: [], 'detail-island': [], place: []};
for (let i = 0; i < argv.length; i++) {
  const k = argv[i].replace(/^--/, '');
  const v = argv[i + 1];
  if (!argv[i].startsWith('--') || v === undefined) {
    console.error(`bad argument near "${argv[i]}"`);
    process.exit(2);
  }
  if (k in multi) multi[k].push(v);
  else opt[k] = v;
  i++;
}
if (!opt.out || !opt.bbox || !opt.land) {
  console.error('usage: node scripts/make-map.mjs --out <map.json> --bbox lonMin,lonMax,latMin,latMax --land <ne_50m_land.geojson> [options]  (see header)');
  process.exit(2);
}
const nums = (s, n, what) => {
  const a = s.split(',').map(Number);
  if (a.length !== n || a.some((x) => !Number.isFinite(x))) throw new Error(`${what} needs ${n} numbers: ${s}`);
  return a;
};
const named = (list, what) =>
  Object.fromEntries(list.map((s) => {
    const [name, ll] = s.split('=');
    if (!name || !ll) throw new Error(`${what} must look like Name=lon,lat: ${s}`);
    return [name, nums(ll, 2, what)];
  }));

const [lonMin, lonMax, latMin, latMax] = nums(opt.bbox, 4, '--bbox');
const W = Number(opt.width ?? 3200);
const TOL = Number(opt.tol ?? 1.3);
const DTOL = Number(opt['detail-tol'] ?? 0.07);

// ---------- projection (the kit uses the same formulas) ----------
const R = Math.PI / 180;
const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * R) / 2));
const k = W / ((lonMax - lonMin) * R);
const proj = ([lon, lat]) => [(lon - lonMin) * R * k, (merc(latMax) - merc(lat)) * k];
const H = Math.round(proj([lonMin, latMin])[1]);

// ---------- geometry ----------
// Sutherland–Hodgman against an axis-aligned rectangle.
const clipRect = (ring, [x0, y0, x1, y1]) => {
  const inside = [(p) => p[0] >= x0, (p) => p[0] <= x1, (p) => p[1] >= y0, (p) => p[1] <= y1];
  const cut = [
    (a, b) => [x0, a[1] + ((x0 - a[0]) / (b[0] - a[0])) * (b[1] - a[1])],
    (a, b) => [x1, a[1] + ((x1 - a[0]) / (b[0] - a[0])) * (b[1] - a[1])],
    (a, b) => [a[0] + ((y0 - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), y0],
    (a, b) => [a[0] + ((y1 - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), y1],
  ];
  let pts = ring;
  for (let e = 0; e < 4 && pts.length; e++) {
    const next = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const ia = inside[e](a), ib = inside[e](b);
      if (ia) next.push(a);
      if (ia !== ib) next.push(cut[e](a, b));
    }
    pts = next;
  }
  return pts;
};
// Ramer–Douglas–Peucker on an open polyline.
const rdp = (pts, tol) => {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [i0, i1] = stack.pop();
    const [ax, ay] = pts[i0], [bx, by] = pts[i1];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-9;
    let best = -1, bi = -1;
    for (let i = i0 + 1; i < i1; i++) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (d > best) [best, bi] = [d, i];
    }
    if (best > tol) {
      keep[bi] = 1;
      stack.push([i0, bi], [bi, i1]);
    }
  }
  return pts.filter((_, i) => keep[i]);
};
const simplifyRing = (pts, tol) => {
  if (pts.length < 4) return pts;
  let far = 0, fd = -1; // split the ring at its farthest point so RDP sees two open halves
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > fd) [fd, far] = [d, i];
  }
  const a = rdp(pts.slice(0, far + 1), tol), b = rdp([...pts.slice(far), pts[0]], tol);
  return [...a, ...b.slice(1, -1)];
};
const fmt = (dp) => (p) => `${p[0].toFixed(dp)} ${p[1].toFixed(dp)}`;
const ringD = (pts, dp) => (pts.length < 3 ? '' : 'M' + pts.map(fmt(dp)).join('L') + 'Z');
const area = (pts) => {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s / 2);
};
const polysOf = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []);
const pip = (pt, ring) => {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
/** Project + clip + simplify polygons into one fill path; minArea (map px²) drops specks. */
const bake = (polys, rect, tol, dp, minArea = 0) =>
  polys
    .map((poly) =>
      poly.map((ring, ri) => {
        const pts = simplifyRing(clipRect(ring.map(proj), rect), tol);
        if (pts.length < 3) return '';
        if (ri === 0 && area(pts) < minArea) return null;
        return ringD(pts, dp);
      }),
    )
    .filter((rings) => rings[0] !== null)
    .map((rings) => rings.filter(Boolean).join(''))
    .join('');
/** Coastline strokes that skip segments lying on the clip rectangle (no straight seams at the box edge). */
const coastD = (polys, rect, tol, dp, minArea = 0) => {
  const [x0, y0, x1, y1] = rect;
  const eps = 1e-6;
  const onEdge = (a, b) =>
    (Math.abs(a[0] - x0) < eps && Math.abs(b[0] - x0) < eps) || (Math.abs(a[0] - x1) < eps && Math.abs(b[0] - x1) < eps) ||
    (Math.abs(a[1] - y0) < eps && Math.abs(b[1] - y0) < eps) || (Math.abs(a[1] - y1) < eps && Math.abs(b[1] - y1) < eps);
  let d = '';
  for (const poly of polys) {
    for (const [ri, ring] of poly.entries()) {
      const pts = simplifyRing(clipRect(ring.map(proj), rect), tol);
      if (pts.length < 3) continue;
      if (ri === 0 && area(pts) < minArea) break;
      const n = pts.length;
      const cutAt = [];
      for (let i = 0; i < n; i++) if (onEdge(pts[i], pts[(i + 1) % n])) cutAt.push(i);
      if (!cutAt.length) {
        d += ringD(pts, dp);
        continue;
      }
      for (let c = 0; c < cutAt.length; c++) {
        const s = (cutAt[c] + 1) % n, e = cutAt[(c + 1) % cutAt.length];
        const seg = [];
        for (let i = s; ; i = (i + 1) % n) {
          seg.push(pts[i]);
          if (i === e) break;
        }
        if (seg.length > 1) d += 'M' + seg.map(fmt(dp)).join('L');
      }
    }
  }
  return d;
};
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const all = (G) => G.features.flatMap((f) => polysOf(f.geometry));
const pick = (polys, pt, rect, tol, dp, what) => {
  const hit = polys.find((poly) => pip(pt, poly[0]));
  if (!hit) throw new Error(`${what}: no land polygon contains ${pt} (pick a point well inside the island)`);
  return bake([hit], rect, tol, dp);
};

// ---------- main map ----------
const PAD = 80;
const MAIN = [-PAD, -PAD, W + PAD, H + PAD];
const landPolys = all(read(opt.land));
const out = {w: W, h: H, bbox: [lonMin, lonMax, latMin, latMax], land: bake(landPolys, MAIN, TOL, 1, 0.6)};
if (opt.countries) {
  const C = read(opt.countries);
  out.borders = C.features.map((f) => bake(polysOf(f.geometry), MAIN, TOL, 1, 0.6)).filter(Boolean).join('');
  if (multi.country.length) {
    out.countries = {};
    for (const name of multi.country) {
      const f = C.features.find((x) => x.properties.ADMIN === name || x.properties.NAME === name);
      if (!f) throw new Error(`--country ${name}: not found (use the ADMIN name, e.g. "United Kingdom")`);
      out.countries[name] = bake(polysOf(f.geometry), MAIN, TOL, 1, 0.6);
    }
  }
}
const deepPolys = opt.deep ? all(read(opt.deep)) : null;
if (deepPolys) out.deep = bake(deepPolys, MAIN, TOL + 0.3, 1, 6);
const isl = named(multi.island, '--island');
if (Object.keys(isl).length) out.islands = Object.fromEntries(Object.entries(isl).map(([n, pt]) => [n, pick(landPolys, pt, MAIN, TOL, 1, `--island ${n}`)]));

// ---------- optional 10m close-up ----------
if (opt['detail-land'] || opt['detail-box']) {
  if (!opt['detail-land'] || !opt['detail-box']) throw new Error('--detail-land and --detail-box go together');
  const [bx0, bx1, by0, by1] = nums(opt['detail-box'], 4, '--detail-box');
  const [dx0, dy0] = proj([bx0, by1]);
  const [dx1, dy1] = proj([bx1, by0]);
  const DR = [dx0, dy0, dx1, dy1];
  const M = 0.6; // keep polygons with a vertex near the box, or that contain its centre
  const centre = [(bx0 + bx1) / 2, (by0 + by1) / 2];
  const near = (polys) => polys.filter((poly) => poly[0].some(([lon, lat]) => lon > bx0 - M && lon < bx1 + M && lat < by1 + M && lat > by0 - M) || pip(centre, poly[0]));
  const dPolys = near(all(read(opt['detail-land'])));
  out.detail = {rect: DR.map((v) => +v.toFixed(2)), land: bake(dPolys, DR, DTOL, 2, 0.002), coast: coastD(dPolys, DR, DTOL, 2, 0.002)};
  if (deepPolys) out.detail.deep = bake(deepPolys, DR, DTOL + 0.03, 2, 0.01);
  const dIsl = named(multi['detail-island'], '--detail-island');
  if (Object.keys(dIsl).length) out.detail.islands = Object.fromEntries(Object.entries(dIsl).map(([n, pt]) => [n, pick(dPolys, pt, DR, DTOL, 2, `--detail-island ${n}`)]));
  if (opt['detail-country']) out.detail.country = opt['detail-country'];
}

const pl = named(multi.place, '--place');
if (Object.keys(pl).length) out.places = Object.fromEntries(Object.entries(pl).map(([n, ll]) => [n, proj(ll).map((v) => +v.toFixed(2))]));

fs.writeFileSync(opt.out, JSON.stringify(out));
const kb = (s) => `${((s ?? '').length / 1024).toFixed(0)}k`;
console.log(`map ${W}x${H}  land ${kb(out.land)} borders ${kb(out.borders)} deep ${kb(out.deep)} countries ${kb(JSON.stringify(out.countries ?? {}))} islands ${kb(JSON.stringify(out.islands ?? {}))}` +
  (out.detail ? `  detail land ${kb(out.detail.land)} coast ${kb(out.detail.coast)} deep ${kb(out.detail.deep)}` : ''));
console.log(`${opt.out}: ${(fs.statSync(opt.out).size / 1024).toFixed(0)} KB`);
