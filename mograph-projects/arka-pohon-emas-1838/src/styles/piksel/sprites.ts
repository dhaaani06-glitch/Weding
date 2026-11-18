// Pixel-map primitives (no imports, so kit.tsx can re-export this file without a cycle).
export type Pix = string[];
export const pixW = (m: Pix) => Math.max(...m.map((r) => r.length));
export const pixH = (m: Pix) => m.length;

/** Add a 1-px outline (4-neighbour) around a fill-only map; grows the map by 1 px on every side. */
export const outline = (fill: Pix, c = 'k'): Pix => {
  const h = fill.length;
  const w = pixW(fill);
  const at = (x: number, y: number) => (y >= 0 && y < h && x >= 0 && x < fill[y].length ? fill[y][x] : '.');
  const out: Pix = [];
  for (let y = -1; y <= h; y++) {
    let row = '';
    for (let x = -1; x <= w; x++) {
      const ch = at(x, y);
      if (ch !== '.') row += ch;
      else row += [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const n = at(x + dx, y + dy); return n !== '.' && n !== c; }) ? c : '.';
    }
    out.push(row);
  }
  return out;
};

/** Tiny raster painter for procedural sprites. */
export class Grid {
  g: string[][];
  constructor(public w: number, public h: number) {
    this.g = Array.from({length: h}, () => Array(w).fill('.'));
  }
  get(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.g[y][x] : '.'; }
  set(x: number, y: number, c: string) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.g[y][x] = c; return this; }
  rect(x: number, y: number, w: number, h: number, c: string) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); return this; }
  ell(cx: number, cy: number, rx: number, ry: number, c: string | ((x: number, y: number) => string)) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.set(x, y, typeof c === 'string' ? c : c(x, y));
    }
    return this;
  }
  rows(): Pix { return this.g.map((r) => r.join('')); }
}


// Original PIKSEL sprites. Codes: k ink · p plum · r red · o orange · y yellow · l lime · g green · t teal · d deep ·
// b blue · s sky · c cyan · w white · 1/2/3 greys · H/h = per-month header colour (sub map).

// ---- month "calendar buddy" 16×16 (outline included) ----
const MONTH_TOP = [
  '....kk....kk....',
  '...k11k..k11k...',
  '.kkk11kkkk11kkk.',
  'kHHHHHHHHHHHHHHk',
  'kHHHHHHHHHHHHHHk',
  'khhhhhhhhhhhhhhk',
  'kwwwwwwwwwwwwwwk',
];
const MONTH_BOTTOM = [
  'k1wwwwwwwwwwww1k',
  'k11111111111111k',
  '.kkkkkkkkkkkkkk.',
  '...kk......kk...',
  '................',
];
export const MONTH_HAPPY: Pix = [...MONTH_TOP,
  'kwwkkwwwwwwkkwwk',
  'kwwkkwwwwwwkkwwk',
  'kwrrwwkwwkwwrrwk',
  'kwwwwwwkkwwwwwwk',
  ...MONTH_BOTTOM];
export const MONTH_SAD: Pix = [...MONTH_TOP,
  'kwwkkwwwwwwkkwwk',
  'kwwkkwwwwwwkkwwk',
  'kwrrwwwkkwwwrrwk',
  'kwwwwwkwwkwwwwwk',
  ...MONTH_BOTTOM];
export const MONTH_HURT: Pix = [...MONTH_TOP,
  'kwwwwwwwwwwwwwwk',
  'kwkkkwwwwwwkkkwk',
  'kwrrwwwkkwwwrrwk',
  'kwwwwwwkkwwwwwwk',
  ...MONTH_BOTTOM];
/** sweat drop (draw next to a sad buddy) */
export const SWEAT: Pix = ['.k.', 'kck', 'kck', '.k.'];

// ---- shadow thief 16×16, two run frames (faces left; flip to face right) ----
const THIEF_TOP = [
  '................',
  '.....kkkkkk.....',
  '....k333333k....',
  '...k33333333k...',
  '...k3yy33yy3k...',
  '...k3yy33yy3k...',
  '...k33333333k...',
  '...kpppppppppk..',
  '...k33333333kppk',
  '..k3333333333k..',
  '..k3k333333k3k..',
  '..kk.k3333k.kk..',
];
export const THIEF_A: Pix = [...THIEF_TOP, '....k33kk33k....', '...k33k..k33k...', '...kkk....kkk...', '................'];
export const THIEF_B: Pix = [...THIEF_TOP, '.....k3333k.....', '.....k3kk3k.....', '......kk.kk.....', '................'];

// ---- UI icons ----
export const POINTER: Pix = [
  'kk......',
  'kwk.....',
  'kwwk....',
  'kwywk...',
  'kwyywk..',
  'kwyyywk.',
  'kwyyyywk',
  'kwyyywk.',
  'kwyywk..',
  'kwywk...',
  'kwwk....',
  'kwk.....',
  'kk......',
];
export const DOWN_ARROW: Pix = ['kkkkkkkkk', 'kyyyyyyyk', '.kyyyyyk.', '..kyyyk..', '...kyk...', '....k....'];
export const SPARK_A: Pix = ['..y..', '..y..', 'yywyy', '..y..', '..y..'];
export const SPARK_B: Pix = ['.....', '..w..', '.wyw.', '..w..', '.....'];
export const CROWN_ICON: Pix = outline([
  'y...y...y',
  'yy.yyy.yy',
  'yyyyyyyyy',
  'yryycyyry',
  'yyyyyyyyy',
  'ooooooooo',
]);
export const SCROLL_ICON: Pix = outline([
  '.oyyyyyyyo.',
  'oywwwwwwwyo',
  '.y1111111y.',
  '.ywwwwwwwy.',
  '.y11111wwy.',
  '.ywwwwwwwy.',
  'oywwwwwwwyo',
  '.oyyyyyyyo.',
]);
export const PIN_ICON: Pix = outline([
  '.rrrr.',
  'rrwwrr',
  'rrwwrr',
  'rrrrrr',
  '.rrrr.',
  '..rr..',
  '..rr..',
  '...r..',
]);
export const LOCK_ICON: Pix = outline(['.111.', '1...1', '1...1', 'yyyyy', 'yykyy', 'yykyy', 'yyyyy']);

/** 8-point star badge (fill + outline), ~26 px */
export const STAR: Pix = (() => {
  const S = 24;
  const g = new Grid(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = x + 0.5 - S / 2, dy = y + 0.5 - S / 2;
    const r = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
    const R = (S / 2) * (0.72 + 0.28 * Math.cos(8 * th));
    if (r <= R) g.set(x, y, dx + dy > 6 ? 'o' : 'y');
  }
  return outline(g.rows());
})();

// ---- Roman king (Romulus) and lineup variants, 32×40 fill → 34×42 with outline ----
export type KingOpts = {crown?: boolean; scepter?: boolean; hood?: boolean; flutter?: boolean};
export const buildKing = (o: KingOpts = {}): Pix => {
  const crown = o.crown ?? true;
  const scepter = o.scepter ?? true;
  const g = new Grid(32, 40);
  const robe = o.hood ? '3' : 'w';
  const robeShade = o.hood ? 'k' : '1';
  // cape (behind)
  for (let r = 16; r <= 36; r++) {
    const hw = 8.5 + ((r - 16) / 20) * 3;
    const x0 = Math.round(15.5 - hw - (o.flutter && r >= 32 ? (r % 2 ? 1 : 0) : 0));
    const x1 = Math.round(15.5 + hw) - 1 + (o.flutter && r >= 33 ? (r % 2 ? 0 : 1) : 0);
    for (let x = x0; x <= x1; x++) g.set(x, r, x - x0 < 2 || x1 - x < 2 ? 'p' : 'r');
  }
  // legs + sandals
  for (const lx of [12, 17]) {
    g.rect(lx, 34, 3, 3, 'y');
    g.rect(lx, 34, 1, 3, 'o');
    g.rect(lx - 1, 37, 5, 2, 'p');
  }
  // robe / toga
  for (let r = 16; r <= 33; r++) {
    let x0 = 10, x1 = 21;
    if (r <= 18) { x0 = 9; x1 = 22; }
    if (r >= 29) { x0 = 9; x1 = 22; }
    if (r >= 32) { x0 = 8; x1 = 23; }
    for (let x = x0; x <= x1; x++) g.set(x, r, x <= x0 + 1 ? robeShade : robe);
  }
  if (!o.hood) {
    for (let r = 22; r <= 33; r++) g.set(13 + Math.floor((r - 22) / 3), r, '1'); // fold
    for (let r = 24; r <= 33; r++) g.set(19 + Math.floor((r - 24) / 4), r, '1'); // fold
    // sash
    for (let r = 17; r <= 30; r++) {
      const x = 9 + Math.round(((r - 17) * 12) / 13);
      [[x, 'r'], [x + 1, 'r'], [x + 2, 'p']].forEach(([xx, c]) => { if ('w1'.includes(g.get(xx as number, r))) g.set(xx as number, r, c as string); });
    }
    // belt clasp
    g.rect(15, 24, 2, 2, 'y');
  }
  // left arm (viewer's left)
  g.rect(6, 17, 3, 7, robe); g.rect(6, 17, 1, 7, robeShade);
  g.rect(6, 24, 3, 4, 'y'); g.rect(6, 24, 1, 4, 'o');
  g.rect(6, 28, 3, 2, 'y');
  // scepter
  if (scepter) {
    g.rect(26, 7, 1, 31, 'o'); g.rect(27, 7, 1, 31, 'y');
    g.ell(26.5, 5, 2.6, 2.6, 'y'); g.set(25, 4, 'w'); g.set(27, 6, 'o'); g.set(28, 5, 'o');
  }
  // right arm holding the sceptre
  g.rect(23, 17, 3, 5, robe); g.rect(25, 17, 1, 5, robeShade);
  g.rect(23, 22, 3, 2, 'y');
  g.rect(24, 22, 4, 3, 'y'); g.set(24, 24, 'o');
  // neck
  g.rect(14, 14, 4, 3, 'o');
  if (o.hood) {
    g.ell(15.5, 10, 7.4, 8.2, 'p');
    g.ell(15.5, 11.5, 4.6, 4.8, 'k');
    g.rect(13, 10, 2, 1, 'y'); g.rect(17, 10, 2, 1, 'y');
    return outline(g.rows());
  }
  // head
  g.ell(15.5, 10.5, 5.6, 5.9, (x) => (x <= 11 ? 'o' : 'y'));
  // hair + sideburns
  g.rect(11, 5, 10, 2, 'p'); g.rect(10, 6, 1, 6, 'p'); g.rect(21, 6, 1, 6, 'p');
  // brows, eyes, nose
  g.rect(12, 8, 3, 1, 'p'); g.rect(17, 8, 3, 1, 'p');
  g.rect(13, 9, 1, 2, 'k'); g.rect(18, 9, 1, 2, 'k');
  g.set(12, 9, 'w'); g.set(17, 9, 'w');
  g.rect(15, 10, 1, 2, 'o');
  // beard + mustache + mouth
  g.rect(11, 12, 1, 3, 'p'); g.rect(20, 12, 1, 3, 'p');
  g.rect(13, 12, 6, 1, 'p');
  g.rect(11, 13, 10, 3, 'p');
  g.rect(13, 16, 6, 1, 'p');
  g.rect(15, 13, 2, 1, 'r');
  g.set(12, 14, '3'); g.set(19, 14, '3');
  // laurel wreath
  for (let x = 9; x <= 22; x++) g.set(x, 6, x % 2 ? 'g' : 'l');
  [[9, 5], [22, 5], [9, 7], [22, 7], [10, 5], [21, 5]].forEach(([x, y]) => g.set(x, y, 'g'));
  if (!crown) [[11, 4], [13, 4], [18, 4], [20, 4], [12, 5], [19, 5]].forEach(([x, y]) => g.set(x, y, 'l'));
  // crown
  if (crown) {
    [[11, 0], [15, 0], [16, 0], [20, 0]].forEach(([x, y]) => g.set(x, y, 'y'));
    [11, 14, 15, 16, 17, 20].forEach((x) => g.set(x, 1, 'y'));
    [11, 12, 14, 15, 16, 17, 19, 20].forEach((x) => g.set(x, 2, 'y'));
    g.rect(11, 3, 10, 2, 'y');
    g.set(12, 4, 'r'); g.set(19, 4, 'r'); g.rect(15, 4, 2, 1, 'c');
    g.set(12, 3, 'w');
    g.rect(11, 5, 10, 1, 'o');
  }
  return outline(g.rows());
};
export const KING_A = buildKing();
export const KING_B = buildKing({flutter: true});
export const EMPEROR = buildKing({crown: false, scepter: false});
export const HOOD = buildKing({hood: true, scepter: false, crown: false});

// ---- Roman temple + cypress for the ROMA beat ----
export const TEMPLE: Pix = (() => {
  const W = 50, H = 36;
  const g = new Grid(W, H);
  for (let r = 0; r <= 9; r++) {
    const hw = 3 + r * 2.3;
    for (let x = Math.round(W / 2 - hw); x < Math.round(W / 2 + hw); x++) g.set(x, r, r >= 3 && r <= 7 && Math.abs(x - W / 2) < hw - 3 ? '1' : 'w');
  }
  g.rect(2, 10, W - 4, 3, 'w'); g.rect(2, 12, W - 4, 1, '1');
  for (let i = 0; i < 6; i++) {
    const cx = 4 + i * 8;
    g.rect(cx, 13, 5, 15, 'w'); g.rect(cx + 3, 13, 2, 15, '1'); g.rect(cx - 1, 13, 7, 1, 'w');
  }
  g.rect(2, 28, W - 4, 2, '1'); g.rect(0, 30, W, 3, 'w'); g.rect(0, 33, W, 3, '1');
  return outline(g.rows());
})();
export const CYPRESS: Pix = outline([
  '..l..', '.lgg.', '.lgg.', 'lggtg', 'lggtg', 'lgttg', 'lggtg', 'gggtt', 'ggttt', '.gtt.', '..p..', '..p..',
]);
export const CLOUD: Pix = outline([
  '.......www..........',
  '....wwwwwwww..ww....',
  '..wwwwwwwwwwwwwwww..',
  'wwwwwwwwwwwwwwwwwwww',
  '11111111111111111111',
]);

/** "#1" medal: gold disc with ring + two ribbon tails */
export const MEDAL: Pix = (() => {
  const g = new Grid(26, 34);
  // ribbons
  for (let r = 18; r < 34; r++) {
    const k = r - 18;
    g.rect(5 + Math.floor(k / 3), r, 6, 1, k > 13 && k % 2 ? '.' : 'r');
    g.rect(15 - Math.floor(k / 3), r, 6, 1, k > 13 && k % 2 ? '.' : 'p');
  }
  g.ell(13, 12, 12, 12, (x, y) => (Math.hypot(x + 0.5 - 13, y + 0.5 - 12) > 9.6 ? 'o' : 'y'));
  g.set(8, 5, 'w'); g.set(7, 6, 'w');
  return outline(g.rows());
})();
export const MOON: Pix = (() => {
  const g = new Grid(22, 22);
  g.ell(11, 11, 11, 11, (x, y) => (x + y > 26 ? '1' : 'w'));
  [[6, 7], [7, 7], [13, 13], [14, 13], [14, 14], [9, 15]].forEach(([x, y]) => g.set(x, y, '1'));
  return g.rows();
})();
export const HILL: Pix = (() => {
  const g = new Grid(92, 28);
  g.ell(46, 30, 46, 29, (x, y) => (y < 3 ? 'l' : y < 6 && (x + y) % 2 ? 'l' : 'g'));
  return g.rows();
})();

// ======================= episode sprites (66 HARI) =======================
// ---- hero "KAMU" (faces right), 14×19 fill → 16×21, two walk frames ----
const HERO_TOP = [
  '....rrrrr.....',
  '...rrrrrrr....',
  '..rrrrrrrrrrr.',
  '..ppyyyyyy....',
  '..pyyyyyky....',
  '..pyyyyyky....',
  '..oyyyyyyy....',
  '...oyyyyo.....',
  '....oyy.......',
  '.obbbbbbbb....',
  'oobbbbbbbbb...',
  'oobdbbbbbby...',
  '.ydbbbbbbby...',
  '..dddddddd....',
];
export const HERO_A: Pix = outline([...HERO_TOP, '..ddd..ddd....', '..ddd..ddd....', '..ddd..ddd....', '.www...www....', '.www...www....']);
export const HERO_B: Pix = outline([...HERO_TOP, '..ddd...ddd...', '.ddd.....ddd..', '.dd.......dd..', 'www.......www.', '..............']);
/** arms up (cheer / jump) */
export const HERO_CHEER: Pix = outline([
  'y...rrrrr...y.', 'y..rrrrrrr..y.', 'yyrrrrrrrrrry.', '.yppyyyyyyy...', '..pyykyykyy...', '..pyyyyyyyy...', '..oyyykkyyy...', '...oyyyyo.....', '....oyy.......',
  '.obbbbbbbb....', 'oobbbbbbbb....', 'oobdbbbbbb....', '.odbbbbbbb....', '..dddddddd....', '..ddd..ddd....', '..ddd..ddd....', '..ddd..ddd....', '.www...www....', '.www...www....',
]);

// ---- doctor NPC (front), surgical cap + head mirror, white coat ----
export const DOCTOR: Pix = outline([
  '....tttttt....',
  '...ttt1w1ttt..',
  '...tttt1tttt..',
  '...yyyyyyyy...',
  '...ykkyykky...',
  '...yyyoyyyy...',
  '...yyyyyyyy...',
  '....yyrry.....',
  '.....yyyy.....',
  '..wwwtttwww...',
  '.wwwwtrtwwww..',
  '.w1wwtrtww1w..',
  '.w1wwwtwww1w..',
  '.y1wwwwwww1y..',
  '..1wwwwwww1...',
  '..wwwwwwwww...',
  '...ddd.ddd....',
  '...ddd.ddd....',
  '..kkkk.kkkk...',
]);
// ---- patient: bandaged head → new face ----
const GOWN = [
  '.....yyyy.....',
  '..ssssssssss..',
  '.ssssssssssss.',
  '.yssbssssbssy.',
  '.y1ssssssss1y.',
  '..ssssssssss..',
  '..ssbssssbss..',
  '...yy....yy...',
  '...yy....yy...',
  '..www....www..',
];
export const PATIENT_WRAP: Pix = outline([
  '....wwwwww....', '...w1wwww1w...', '...wwwwwwww...', '...1w1111w1...', '...wkwwwwkw...', '...wwwwwwww...', '...1ww11ww1...', '....wwwwww....', ...GOWN,
]);
export const PATIENT_FACE: Pix = outline([
  '....pppppp....', '...pppppppp...', '...pyyyyyyp...', '...yyyyyyyy...', '...ykyyyyky...', '...yryyyyry...', '...yyykkyyy...', '....yyyyyy....', ...GOWN,
]);
export const MIRROR: Pix = outline([
  '..yyyy..', '.yccwcy.', 'ycccwccy', 'yccccccy', 'yccccccy', 'yscccccy', '.ysccsy.', '..yyyy..', '...oo...', '...oo...', '...oo...', '...pp...',
]);

// ---- old book: closed / half-open / open ----
export const BOOK_CLOSED: Pix = (() => {
  const g = new Grid(22, 16);
  g.rect(0, 0, 22, 14, 'r'); g.rect(0, 0, 3, 14, 'p'); g.rect(3, 13, 19, 3, 'w'); g.rect(3, 15, 19, 1, '1');
  g.rect(7, 3, 11, 1, 'y'); g.rect(7, 6, 11, 4, 'o'); g.rect(8, 7, 9, 2, 'y'); g.rect(7, 11, 11, 1, 'y');
  return outline(g.rows());
})();
export const BOOK_OPEN: Pix = (() => {
  const g = new Grid(34, 16);
  g.rect(0, 2, 34, 14, 'r');
  g.rect(1, 0, 16, 14, 'w'); g.rect(17, 0, 16, 14, 'w');
  g.rect(15, 0, 2, 14, '1'); g.rect(17, 0, 1, 14, '1');
  for (let i = 0; i < 5; i++) { g.rect(3, 2 + i * 2, i === 4 ? 7 : 11, 1, '1'); g.rect(20, 2 + i * 2, i === 2 ? 6 : 11, 1, '1'); }
  return outline(g.rows());
})();
export const BOOK_FLIP: Pix = (() => {
  const g = new Grid(34, 16);
  g.rect(0, 2, 34, 14, 'r'); g.rect(1, 2, 16, 12, 'w'); g.rect(17, 2, 16, 12, 'w');
  for (let r = 0; r < 14; r++) g.rect(17, r, Math.max(2, 14 - r), 1, r < 2 ? '1' : 'w');
  return outline(g.rows());
})();

// ---- tiny party member for the 96-player grid (h = hair, S = shirt) ----
export const MINI: Pix = outline(['..hhh..', '.hhhhh.', '.hyyyh.', '..yyy..', '.SSSSS.', 'ySSSSSy', '.SSSSS.', '.dd.dd.', '.kk.kk.']);
export const MINI_B: Pix = outline(['..hhh..', '.hhhhh.', '.hyyyh.', '..yyy..', 'ySSSSSy', '.SSSSS.', '.SSSSS.', '.dd.dd.', 'kk...kk']);

// ---- items ----
export const WATER: Pix = outline(['.bbbb.', '.bbbb.', '..cc..', '.cccc.', 'cwcccc', 'cwssss', 'cwssss', 'cwssss', 'cwssss', 'csssss', 'csssss', '.cccc.']);
export const FRUIT: Pix = outline(['....p.gg.', '....pgg..', '.rrrprrr.', 'rrwrrrrrr', 'rwrrrrrrr', 'rrrrrrrrr', 'rrrrrrrrp', '.rrrrrrp.', '..rrppp..']);
export const DUMBBELL: Pix = outline(['.22........22.', '2112......2112', '2112wwwwww2112', '21121111112112', '21122222222112', '2112......2112', '.22........22.']);
export const CRYSTAL: Pix = (() => {
  const g = new Grid(13, 19);
  for (let y = 0; y < 19; y++) for (let x = 0; x < 13; x++) {
    const dx = (x + 0.5 - 6.5) / 6.5, dy = (y + 0.5 - 9.5) / 9.5;
    if (Math.abs(dx) + Math.abs(dy) <= 1) g.set(x, y, dy < -0.35 && dx < 0.2 ? 'w' : dx < 0 ? 'c' : dy > 0.3 ? 'b' : 's');
  }
  return outline(g.rows());
})();
export const FLAG_A: Pix = outline(['1rrrrrr..', '1rrrrrrr.', '1rrwrrrrr', '1rrrrrrr.', '1rrrrrr..', '1........', '1........', '1........', '1........', '1........', '1........', '2........']);
export const FLAG_B: Pix = outline(['1rrrrrrr.', '1rrrrrrrr', '1rrwrrrr.', '1rrrrrrrr', '1rrrrrrr.', '1........', '1........', '1........', '1........', '1........', '1........', '2........']);
export const CHECK: Pix = outline(['.......gg', '......ggl', '.....ggl.', 'gg..ggl..', 'lgggggl..', '.lgggl...', '..lgl....']);
export const CROSS: Pix = outline(['rr...rr', 'rrr.rrr', '.rrrrr.', '..rrr..', '.rrrrr.', 'rrr.rrr', 'rr...rr']);
export const COIN: Pix = (() => {
  const g = new Grid(20, 20);
  g.ell(10, 10, 10, 10, (x, y) => (Math.hypot(x + 0.5 - 10, y + 0.5 - 10) > 8.2 ? 'o' : 'y'));
  g.set(5, 5, 'w'); g.set(6, 4, 'w'); g.set(4, 6, 'w');
  return outline(g.rows());
})();
/** gear ("OTOMATIS"), two rotation frames */
const gear = (rot: number): Pix => {
  const g = new Grid(18, 18);
  for (let y = 0; y < 18; y++) for (let x = 0; x < 18; x++) {
    const dx = x + 0.5 - 9, dy = y + 0.5 - 9;
    const r = Math.hypot(dx, dy), th = Math.atan2(dy, dx) + rot;
    const tooth = Math.cos(th * 8) > 0.35 ? 8.6 : 6.6;
    if (r <= tooth) g.set(x, y, r < 2.6 ? '.' : r < 4.2 ? 'o' : dx + dy > 4 ? '2' : '1');
  }
  return outline(g.rows());
};
export const GEAR_A = gear(0);
export const GEAR_B = gear(Math.PI / 8);
export const HOURGLASS_A: Pix = outline(['ppppppppp', '.yyyyyyy.', '.ywwwwwy.', '..ywwwy..', '...yoy...', '...yoy...', '..yooy...', '.yooooy..', '.yooooyy.', 'ppppppppp']);
export const HOURGLASS_B: Pix = outline(['ppppppppp', '.yooooyy.', '.yooooy..', '..yooy...', '...yoy...', '...yoy...', '..ywwwy..', '.ywwwwwy.', '.yyyyyyy.', 'ppppppppp']);
export const SUN: Pix = (() => {
  const g = new Grid(26, 26);
  g.ell(13, 13, 13, 13, (x, y) => (Math.hypot(x + 0.5 - 13, y + 0.5 - 13) > 11 ? 'o' : 'y'));
  return g.rows();
})();
export const TREE: Pix = (() => {
  const g = new Grid(20, 26);
  g.rect(8, 16, 4, 10, 'p'); g.rect(8, 16, 1, 10, 'r');
  g.ell(10, 9, 9.6, 9, (x, y) => (x + y < 12 ? 'l' : x + y > 22 ? 't' : 'g'));
  return outline(g.rows());
})();
export const BUSH: Pix = (() => {
  const g = new Grid(18, 9);
  g.ell(5, 7, 5, 6, (x, y) => (y < 3 ? 'l' : 'g')); g.ell(12, 6, 6, 7, (x, y) => (y < 2 ? 'l' : 'g'));
  return outline(g.rows());
})();
export const HEART: Pix = outline(['.rr.rr.', 'rwrrrrr', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...']);
export const FOOTPRINT: Pix = ['.33.', '3333', '3333', '.33.', '....', '.33.', '.33.'];
