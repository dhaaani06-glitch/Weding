import React from 'react';
import {AbsoluteFill, Audio, staticFile} from 'remotion';
import project from './project.json';
import {SfxTrack} from './components/SfxTrack';
import {FontFaces} from './Fonts';
import {at as a, words} from './lib/words';
import {p, pagesFor, pb, pio, rnd, shake, StyleFonts, useTime} from './styles/shared';
import {Caption, GUNUNGAN, GununganOrnament, H, HikDefs, HOUSE, Kelir, KING, Lontar, lontarText, lontarTitle, Part, Pt, Silhouette, Stage, SUN, THIEF, WOMAN} from './styles/hikayat/kit';

// HIKAYAT episode — "Arka dan Pohon Emas": a folk tale about greed and gratitude, played as wayang on a lit kelir.

const PAGES = pagesFor(words);

const sound = project as {musicFile?: string | null; musicVolume?: number; musicAutomation?: Array<{frame: number; volume: number}>};
const musicGain = (frame: number): number => {
  const base = sound.musicVolume ?? 0.24;
  const pts = sound.musicAutomation ?? [];
  if (pts.length === 0) return base;
  if (frame <= pts[0].frame) return pts[0].volume;
  if (frame >= pts[pts.length - 1].frame) return pts[pts.length - 1].volume;
  let lo = 1, hi = pts.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (pts[mid].frame >= frame) hi = mid; else lo = mid + 1;
  }
  const l = pts[lo - 1], r = pts[lo];
  const k = Math.max(0, Math.min(1, (frame - l.frame) / Math.max(1, r.frame - l.frame)));
  return l.volume + (r.volume - l.volume) * k;
};

// ---------- custom puppets ----------
const blob = (cx: number, cy: number, r: number, n: number, lumps: number, amp: number, seed: number): Pt[] =>
  Array.from({length: n}, (_, i) => {
    const th = (i / n) * Math.PI * 2;
    const rr = r * (1 + amp * Math.sin(th * lumps + seed) + amp * 0.5 * Math.sin(th * (lumps + 3) + seed * 2));
    return [cx + Math.cos(th) * rr * 1.12, cy + Math.sin(th) * rr * 0.92] as Pt;
  });
// the magic tree: wide lumpy canopy, gnarled trunk with roots
const BIGTREE: Part[] = [
  {poly: [[-70, 0], [-150, 10], [-210, -10], [-110, -40], [-60, -160], [-50, -380], [-120, -470], [-230, -520], [-210, -545], [-90, -505], [-30, -470], [0, -560], [30, -470], [110, -520], [220, -560], [235, -535], [120, -470], [55, -380], [60, -160], [110, -40], [220, -10], [160, 10], [70, 0]], perforate: 16},
  {poly: blob(0, -760, 300, 72, 7, 0.07, 1), perforate: 19},
];
const FRUITS: Pt[] = [[-180, -720], [-60, -880], [90, -800], [200, -660], [-100, -620], [40, -960], [150, -920], [-230, -860]];
const PINE: Part[] = [
  {poly: [[0, -620], [90, -430], [45, -440], [140, -250], [70, -260], [180, -60], [20, -60], [20, 0], [-20, 0], [-20, -60], [-180, -60], [-70, -260], [-140, -250], [-45, -440], [-90, -430]], perforate: 17},
];
const ROUNDTREE: Part[] = [
  {poly: [[-18, 0], [-14, -260], [14, -260], [18, 0]]},
  {poly: blob(0, -380, 150, 48, 5, 0.08, 3), perforate: 17},
];
const HUT: Part[] = [
  {poly: [[-230, -330], [0, -470], [230, -330], [180, -300], [-180, -300]], perforate: 14},
  {poly: [[-170, -300], [170, -300], [170, -40], [-170, -40]], perforate: 16},
  ...[-150, 130].map((x) => ({poly: [[x, -40], [x + 22, -40], [x + 22, 0], [x, 0]] as Pt[]})),
];
const MOUND: Pt[] = [[-200, 0], [-160, -70], [-90, -130], [0, -160], [90, -130], [160, -70], [200, 0]];
const CHEST: Part[] = [{poly: [[-70, 0], [-70, -80], [-60, -110], [0, -124], [60, -110], [70, -80], [70, 0]], perforate: 13}];
const SAPLING: Part[] = [
  {poly: [[-8, 0], [-6, -180], [6, -180], [8, 0]]},
  {poly: blob(-50, -170, 46, 24, 2, 0.05, 2), perforate: 12},
  {poly: blob(50, -210, 52, 24, 2, 0.05, 4), perforate: 12},
  {poly: blob(0, -270, 60, 24, 3, 0.05, 6), perforate: 12},
];
const LEAF = 'M 0 -16 Q 14 -4 0 16 Q -14 -4 0 -16 Z';

// props attached to Arka (local puppet coords, facing right)
const Firewood: React.FC = () => (
  <g stroke={H.dark} strokeLinecap="round">
    {[0, 1, 2, 3].map((i) => <line key={i} x1={-150} y1={-370 + i * 14} x2={60} y2={-430 + i * 14} strokeWidth={14} />)}
    <line x1={-60} y1={-420} x2={-40} y2={-360} strokeWidth={6} />
  </g>
);
const Axe: React.FC<{raise: number}> = ({raise}) => (
  <g transform={`translate(150 -350) rotate(${50 - 75 * raise})`}>
    <line x1={0} y1={0} x2={0} y2={-230} stroke={H.dark} strokeWidth={12} strokeLinecap="round" />
    <path d="M -6 -230 L 70 -260 Q 86 -210 70 -170 L -6 -200 Z" fill={H.dark} />
  </g>
);
const Hoe: React.FC<{swing: number}> = ({swing}) => (
  <g transform={`translate(140 -340) rotate(${20 + 50 * swing})`}>
    <line x1={0} y1={0} x2={0} y2={300} stroke={H.dark} strokeWidth={11} strokeLinecap="round" />
    <path d="M -4 296 L 70 300 L 66 330 L -4 318 Z" fill={H.dark} />
  </g>
);

const LT: React.FC<{y: number; w?: number; q: number; children: React.ReactNode; h?: number; x?: number}> = ({y, w = 900, q, children, h = 110, x}) => (
  <Lontar x={x ?? (1080 - w) / 2} y={y} w={w} h={h} q={q}>
    <div style={{width: '100%', textAlign: 'center'}}>{children}</div>
  </Lontar>
);
const title = lontarTitle;
const text = lontarText;
const GOLD = '#FFD27A';

export const Main: React.FC = () => {
  const {t} = useTime();
  const bob = (k: number, amp = 6) => Math.sin(t * 2.2 + k) * amp;
  const vis = (from: number, to: number, fi = 0.4, fo = 0.4) => p(t, from - fi, from) * (1 - p(t, to, to + fo));

  // ---- key times ----
  const T = {
    arka: a('arka'), miskin: a('miskin'), kaya: a('kaya'), tanpa: a('tanpa'),
    suatu: a('suatu hari'), menemukan: a('menemukan'), anehnya: a('anehnya'), keemasan: a('keemasan'),
    tiba: a('tiba-tiba'), wahai: a('wahai'), apaPun: a('apa pun'), terkejut: a('terkejut'), berbinar: a('berbinar'),
    akuIngin: a('aku ingin'), seketika: a('seketika'), tumpukan: a('tumpukan'), tertawa: a('tertawa'),
    membawa: a('ia membawa'), rumah: a('rumah besar'), pakaian: a('pakaian'), segala: a('segala'),
    namun1: a('namun'), keesokan: a('keesokan'), sepuluh: a('sepuluh'), menjawab: a('menjawab'), bukankah: a('bukankah'),
    marah: a('marah'), menebang: a('menebang'), akhirnya: a('akhirnya'), terakhir: a('terakhir'),
    namun2: a('namun', 1), membuka: a('membukanya'), seluruh: a('seluruh'), berubah2: a('berubah', 1), daun: a('daun'),
    teriak: a('berteriak'), pelan: a('pelan'), kau: a('kau telah'), tetapi2: a('tetapi kehilangan'),
    menangis: a('menangis'), memohon: a('memohon'), namun3: a('namun', 2), menghilang: a('menghilang'),
    sejak: a('sejak'), sederhana: a('sederhana'), bedanya: a('bedanya'), bekerja2: a('bekerja', 1), membantu: a('membantu'),
    mengukur: a('mengukur'), sebab: a('sebab'), kekayaan: a('kekayaan sejati'), melainkan: a('melainkan'), syukur: a('rasa syukur'),
    end: a('diberikan') + 0.9,
  };

  // ---- acts (scene windows) ----
  // A1 village 0..16.6 | A2 forest + tree 16.6..55.4 | A3 rich home 55.4..66.9 | A4 tree again 66.9..115.6 | A5 new life 115.6..end
  const A2 = 16.6, A3 = T.membawa - 0.1, A4 = 66.9, A5 = T.sejak - 0.3;

  // ---- gunungan: opening, before the forest, before the return, after the tree vanishes, closing ----
  const wipe = (c: number) => ({in: pio(t, c - 0.6, c), out: pio(t, c + 0.15, c + 0.75)});
  const W2 = wipe(A2), W4 = wipe(A4), W5 = wipe(A5);
  const g1 = pio(t, 1.0, 1.9);
  const gEnd = pio(t, T.end - 0.2, T.end + 0.8);
  let gunX = 2000, gunRot = 0, gunShow = false;
  if (t < 2) { gunX = 540 - 1300 * g1; gunRot = -32 * g1; gunShow = true; }
  else for (const [c, w] of [[A2, W2], [A4, W4], [A5, W5]] as const) {
    if (t > c - 0.65 && t < c + 0.8) { gunX = 1600 - 1060 * w.in - 1300 * w.out; gunRot = -20 + 20 * w.in - 25 * w.out; gunShow = true; }
  }
  if (t > T.end - 0.25) { gunX = 1600 - 1060 * gEnd; gunRot = -20 + 20 * gEnd; gunShow = true; }

  // ---- mood of the screen ----
  const greed = vis(T.namun1, A4 - 0.4, 0.5, 0.5);
  const anger = vis(T.marah, T.akhirnya, 0.4, 0.8);
  const ruin = vis(T.berubah2, T.pelan, 0.4, 1.2);
  const fadeAway = p(t, T.menghilang, T.menghilang + 2.4) * (t < A5 ? 1 : 0);
  const dim = Math.max(0.3 * greed, 0.35 * anger, 0.5 * ruin, 0.25 * fadeAway * (1 - p(t, A5 - 0.3, A5)), t > T.end ? 0 : 0);
  const tint = anger > 0.05 ? `rgba(150,40,20,${0.45 * anger})` : ruin > 0.05 ? `rgba(70,95,140,${0.5 * ruin})` : undefined;
  const sh = shake(t, [T.akuIngin + 0.05, T.marah + 0.1, T.menebang + 0.1, T.berubah2 + 0.05, T.teriak + 0.05], 14);

  // ---- the magic tree ----
  const inTreeAct = (t > T.menemukan - 0.3 && t < A3 + 0.6) || (t > A4 - 0.1 && t < A5);
  const treeRise = pb(t, T.menemukan - 0.3, T.menemukan + 0.7);
  const treeY = t < A3 + 0.7 && t > A2 ? 1430 + 900 * (1 - treeRise) + 900 * pio(t, A3 - 0.1, A3 + 0.5) : 1430;
  const treeOp = t > A4 ? 1 - p(t, T.menghilang, T.menghilang + 2.4) : 1;
  const TX = 740, TS = 0.9;
  const glow = p(t, T.anehnya, T.keemasan + 0.4); // fruits light up
  const speak = Math.max(vis(T.tiba, T.berbinar - 0.5, 0.3, 0.5), vis(T.menjawab, T.marah - 0.3, 0.3, 0.4), vis(T.pelan, T.menangis, 0.3, 0.5));
  const pulse = 0.75 + 0.25 * Math.sin(t * 6) * speak;
  const lastOnly = t > T.akhirnya; // only one fruit remains
  const fruitsLeft = 1 - p(t, T.akhirnya, T.akhirnya + 0.8);

  // fruit 1 falls → gold pile; last fruit → floats to Arka
  const fall1 = p(t, T.seketika + 0.6, T.seketika + 1.3, (x) => x * x);
  const f1 = FRUITS[4];
  const f1x = TX + f1[0] * TS, f1y = 1430 + f1[1] * TS;
  const pileQ = pb(t, a('berubah') - 0.1, a('berubah') + 0.5); // 'berubah menjadi tumpukan'
  const fLast = FRUITS[2];
  const fly = pio(t, T.akhirnya + 0.6, T.terakhir + 0.8);
  const lastX = TX + fLast[0] * TS + (470 - (TX + fLast[0] * TS)) * fly;
  const lastY = 1430 + fLast[1] * TS + (1060 - (1430 + fLast[1] * TS)) * fly;
  const opened = p(t, T.membuka, T.membuka + 0.5);

  // ---- Arka ----
  const walkIn = pio(t, T.arka - 1.3, T.arka - 0.1);
  const forestIn = pio(t, A2 + 0.6, T.suatu + 2.4);
  let arkaX = 380, arkaShow = false;
  if (t < A2) { arkaX = 1250 - 870 * walkIn; arkaShow = t > T.arka - 1.4; }
  else if (t < A3) { arkaX = -200 + 500 * forestIn; arkaShow = true; }
  else if (t < A4) { arkaX = 330; arkaShow = true; }
  else if (t < A5) { arkaX = 300 + 90 * pio(t, T.marah + 0.3, T.menebang) - 90 * pio(t, T.akhirnya, T.akhirnya + 0.8) - 60 * pio(t, T.teriak, T.teriak + 0.3); arkaShow = true; }
  else { arkaX = 380 - 130 * pio(t, T.sebab - 0.3, T.sebab + 0.8); arkaShow = true; }
  const rich = (t > T.pakaian && t < A4 + 0.2) || (t > A4 && t < T.berubah2);
  const arkaParts = rich ? KING : THIEF;
  const slump = t < A2 ? -6 * vis(T.miskin, T.kaya - 0.2, 0.5, 0.5) - 12 * vis(T.tanpa, A2 - 0.6, 0.5, 0.3) : 0;
  const laugh = vis(T.tertawa, T.membawa, 0.2, 0.3) * Math.sin(t * 22) * 4;
  const jolt = t > T.tiba && t < T.tiba + 0.6 ? -8 * Math.sin(p(t, T.tiba, T.tiba + 0.6) * Math.PI) : t > T.terkejut && t < T.terkejut + 0.6 ? -8 * Math.sin(p(t, T.terkejut, T.terkejut + 0.6) * Math.PI) : 0;
  const rage = anger > 0.3 ? Math.sin(t * 50) * 2.5 : 0;
  const scared = t > T.teriak && t < T.pelan ? -10 * p(t, T.teriak, T.teriak + 0.25) + Math.sin(t * 40) * 2 : 0;
  const kneel = p(t, T.menangis - 0.3, T.menangis + 0.5) * (1 - p(t, A5 - 0.4, A5));
  const greedScale = 1 + 0.18 * greed;
  const arkaS = 1.3 * greedScale * (t > T.sebab ? 1 - 0.25 * p(t, T.sebab - 0.3, T.sebab + 0.8) : 1);
  const arkaY = 1430 + 70 * kneel + (t > T.sebab ? -30 * p(t, T.sebab, T.sebab + 0.8) : 0);
  const arkaRot = slump + laugh + jolt + rage + scared + 16 * kneel + bob(2, 1.2);
  const jumpY = t > T.terkejut && t < T.terkejut + 0.5 ? -60 * Math.sin(p(t, T.terkejut, T.terkejut + 0.5) * Math.PI) : 0;
  const swing = t > A5 && t < T.membantu + 0.4 ? Math.max(0, Math.sin((t - T.bekerja2) * 5)) * p(t, T.bekerja2 - 0.3, T.bekerja2) : 0;
  const hoeShow = t > A5 + 0.5 && t < T.membantu + 0.6;
  const woodShow = (t > A2 && t < T.akuIngin) || (t > T.membantu - 0.2 && t < T.sebab);
  const axeShow = t > a('mengancam') - 0.2 && t < T.akhirnya + 0.6;
  const axeRaise = pb(t, T.menebang - 0.2, T.menebang + 0.4) * (1 - p(t, T.akhirnya - 0.1, T.akhirnya + 0.5));

  // ---- villager helped (act 5) ----
  const helpIn = pio(t, T.membantu - 0.9, T.membantu + 0.2);
  const villX = 1250 - 470 * helpIn + 150 * pio(t, T.sebab - 0.3, T.sebab + 0.8);

  // ---- rich home (act 3) ----
  const houseQ = pb(t, T.rumah - 0.4, T.rumah + 0.4) * (t < A4 ? 1 : 0);
  const chests = [0, 1, 2].map((i) => pb(t, T.segala + i * 0.35, T.segala + i * 0.35 + 0.5) * (t < A4 ? 1 : 0));

  // ---- gold → dry leaves (act 4) ----
  const pile2 = pb(t, T.seluruh - 0.2, T.seluruh + 0.4) * (t < A5 ? 1 : 0);
  const toLeaves = p(t, T.berubah2 - 0.1, T.daun + 0.6);
  const leafFall = p(t, T.daun, T.teriak + 1.5);
  const pileGoldNow = (t > T.seketika && t < A3 + 0.6) ? pileQ : 0;

  // ---- act 5 scenery ----
  const a5 = t > A5 - 0.1;
  const sunUp = pb(t, A5 + 0.3, T.sederhana + 0.4);
  const sap = pb(t, T.kekayaan - 0.3, T.kekayaan + 0.8);
  const sapGlow = p(t, T.syukur - 0.2, T.syukur + 0.6);

  // ---- flashes ----
  const fl = (s: number, peak = 0.15, dec = 0.9, k = 1) => p(t, s, s + peak) * (1 - p(t, s + peak, s + dec)) * k;
  const flash = Math.max(fl(T.tiba, 0.15, 0.8, 0.5), fl(a('berubah') - 0.05, 0.12, 1.0), fl(T.pakaian, 0.12, 0.8, 0.6), fl(T.membuka, 0.12, 1.0), fl(T.berubah2, 0.1, 0.9, 0.7), fl(T.syukur, 0.2, 1.4, 0.45));
  const label = t < T.sebab - 0.2 ? 'HIKAYAT' : 'HIKMAH';

  return (
    <AbsoluteFill style={{background: H.dark, overflow: 'hidden'}}>
      <FontFaces />
      <StyleFonts />
      <div style={{position: 'absolute', inset: 0, transform: `translate(${sh.x}px, ${sh.y}px)`}}>
        <Kelir t={t} dim={dim} tint={tint} />
        <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
          <HikDefs />
          <defs><radialGradient id="goldglow"><stop offset="0" stopColor="#FFE3A0" stopOpacity={1} /><stop offset="0.55" stopColor="#FFD27A" stopOpacity={0.45} /><stop offset="1" stopColor="#FFD27A" stopOpacity={0} /></radialGradient></defs>

          {/* ===== ACT 1 · village ===== */}
          {t < A2 + 0.8 && (
            <g>
              <Silhouette id="v-pine1" parts={PINE} x={140} y={1430} s={0.95} rod={false} opacity={0.6 * p(t, 0.4, 1.2)} />
              <Silhouette id="v-pine2" parts={PINE} x={980} y={1430} s={1.1} rod={false} opacity={0.6 * p(t, 0.5, 1.3)} />
              <Silhouette id="v-round1" parts={ROUNDTREE} x={260} y={1430} s={0.8} rod={false} opacity={0.5 * p(t, 0.6, 1.4)} />
              <Silhouette id="v-hut" parts={HUT} x={760} y={1430} s={0.85} opacity={p(t, 0.7, 1.5)} />
              {/* dream of gold above Arka */}
              {t > T.kaya - 0.3 && (
                <g opacity={vis(T.kaya, A2 - 0.5, 0.3, 0.3)}>
                  {[0, 1, 2].map((i) => <circle key={i} cx={arkaX + 70 + i * 34} cy={820 - i * 46} r={10 + i * 6} fill={H.dark} />)}
                  <ellipse cx={arkaX + 230} cy={580} rx={170} ry={110} fill={H.dark} />
                  {Array.from({length: 7}).map((_, i) => <circle key={i} cx={arkaX + 160 + (i % 4) * 46 + (i > 3 ? 23 : 0)} cy={i > 3 ? 560 : 610} r={20} fill={GOLD} opacity={0.9} />)}
                </g>
              )}
            </g>
          )}

          {/* ===== ACT 2 / 4 · forest ===== */}
          {((t > A2 - 0.2 && t < A3 + 0.8) || (t > A4 - 0.2 && t < A5 + 0.8)) && (
            <g>
              <Silhouette id="f-pine1" parts={PINE} x={90} y={1430} s={1.2} rod={false} opacity={0.5} />
              <Silhouette id="f-pine2" parts={PINE} x={1040} y={1430} s={1.0} rod={false} opacity={0.45} />
              <Silhouette id="f-round" parts={ROUNDTREE} x={500} y={1430} s={0.9} rod={false} opacity={0.35 * (1 - treeRise * 0.6)} />
            </g>
          )}
          {inTreeAct && (
            <g opacity={treeOp}>
              {glow > 0 && <ellipse cx={TX} cy={1430 - 760 * TS + (treeY - 1430)} rx={520} ry={460} fill="url(#goldglow)" opacity={0.6 * glow * pulse * (lastOnly ? 0.6 : 1)} style={{mixBlendMode: 'screen'}} />}
              <Silhouette id="bigtree" parts={BIGTREE} x={TX} y={treeY} s={TS} rot={speak > 0 ? Math.sin(t * 3) * 0.8 * speak : 0} rod={false}
                extra={glow > 0 ? (
                  <g>
                    {FRUITS.map(([fx, fy], i) => {
                      if (i === 4 && t > T.seketika + 0.6 && t < A4) return null;
                      if (i === 2 && t > T.akhirnya + 0.6) return null;
                      const op = glow * (i === 2 ? 1 : lastOnly ? fruitsLeft : 1);
                      if (op <= 0.01) return null;
                      return (
                        <g key={i} opacity={op}>
                          <circle cx={fx} cy={fy} r={46} fill="#FFE7A8" opacity={0.35 * pulse} />
                          <circle cx={fx} cy={fy} r={26} fill={GOLD} />
                          <circle cx={fx - 8} cy={fy - 8} r={8} fill="#FFF4D0" />
                        </g>
                      );
                    })}
                  </g>
                ) : undefined} />
              {/* fruit 1 falling */}
              {t > T.seketika + 0.6 && t < a('berubah') + 0.2 && (
                <g>
                  <circle cx={f1x - 40 * fall1} cy={f1y + (1400 - f1y) * fall1} r={44} fill="#FFE7A8" opacity={0.35} />
                  <circle cx={f1x - 40 * fall1} cy={f1y + (1400 - f1y) * fall1} r={24} fill={GOLD} />
                </g>
              )}
              {/* the last fruit floats to Arka and splits */}
              {t > T.akhirnya + 0.6 && t < T.seluruh + 0.6 && (
                <g opacity={1 - p(t, T.seluruh, T.seluruh + 0.5)}>
                  <circle cx={lastX} cy={lastY} r={70 + 40 * opened} fill="#FFE7A8" opacity={0.4 * (1 - opened * 0.5)} />
                  <path d={`M ${lastX} ${lastY - 26} A 26 26 0 0 0 ${lastX} ${lastY + 26} Z`} fill={GOLD} transform={`translate(${-30 * opened} 0) rotate(${-25 * opened} ${lastX} ${lastY})`} />
                  <path d={`M ${lastX} ${lastY - 26} A 26 26 0 0 1 ${lastX} ${lastY + 26} Z`} fill={GOLD} transform={`translate(${30 * opened} 0) rotate(${25 * opened} ${lastX} ${lastY})`} />
                </g>
              )}
            </g>
          )}
          {/* gold pile (act 2) */}
          {pileGoldNow > 0 && (
            <g transform={`translate(${590} ${1430 + 900 * pio(t, A3 - 0.1, A3 + 0.5)}) scale(${pileGoldNow})`}>
              <ellipse cx={0} cy={-80} rx={300} ry={200} fill="url(#goldglow)" opacity={0.75} style={{mixBlendMode: 'screen'}} />
              <path d={`M ${MOUND.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`} fill={H.dark} />
              {Array.from({length: 22}).map((_, i) => {
                const row = Math.floor(i / 6), col = i % 6;
                return <ellipse key={i} cx={-125 + col * 50 + row * 22} cy={-20 - row * 36} rx={20} ry={11} fill={GOLD} opacity={row * 22 + col * 50 < 260 ? 1 : 0} />;
              })}
            </g>
          )}

          {/* ===== ACT 3 · rich home ===== */}
          {t > A3 - 0.2 && t < A4 + 0.8 && (
            <g>
              {houseQ > 0 && <Silhouette id="mansion" parts={HOUSE} x={760} y={1430 + 700 * (1 - houseQ)} s={1.05} />}
              {chests.map((q, i) => q > 0 ? (
                <g key={i}>
                  <ellipse cx={500 + i * 120} cy={1380} rx={80} ry={60} fill="url(#goldglow)" opacity={0.75 * q} style={{mixBlendMode: 'screen'}} />
                  <Silhouette id={`chest${i}`} parts={CHEST} x={500 + i * 120} y={1430} s={0.75 * q} rod={false} />
                </g>
              ) : null)}
            </g>
          )}

          {/* ===== ACT 4 · gold pile becomes dry leaves ===== */}
          {pile2 > 0 && t > A4 && (
            <g transform={`translate(610 1430)`}>
              <ellipse cx={0} cy={-80} rx={280 * pile2} ry={190 * pile2} fill="url(#goldglow)" opacity={0.75 * (1 - toLeaves)} style={{mixBlendMode: 'screen'}} />
              <g transform={`scale(${pile2} ${pile2 * (1 - 0.5 * leafFall)})`}><path d={`M ${MOUND.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`} fill={H.dark} /></g>
              {Array.from({length: 26}).map((_, i) => {
                const row = Math.floor(i / 6), col = i % 6;
                const x0 = -125 + col * 50 + row * 22, y0 = -20 - row * 36;
                if (row * 22 + col * 50 >= 260 && i < 22) return null;
                const dx = (rnd(i) - 0.5) * 520 * leafFall, dy = -260 * Math.sin(leafFall * Math.PI) * rnd(i + 5) + 40 * leafFall;
                return (
                  <g key={i} transform={`translate(${(x0 + dx) * pile2} ${(y0 + dy) * pile2}) rotate(${toLeaves * (rnd(i + 2) * 360 + t * 90 * leafFall)})`}>
                    {toLeaves < 1 && <ellipse rx={20} ry={11} fill={GOLD} opacity={1 - toLeaves} />}
                    {toLeaves > 0 && <path d={LEAF} transform="scale(1.4)" fill="#3A1D0A" opacity={toLeaves} />}
                  </g>
                );
              })}
            </g>
          )}
          {/* tears */}
          {kneel > 0.5 && t < A5 && [0, 1, 2].map((i) => {
            const q = ((t * 1.3 + i * 0.33) % 1);
            return <path key={i} d="M 0 -12 Q 8 0 0 8 Q -8 0 0 -12 Z" transform={`translate(${arkaX + 70 + i * 6} ${arkaY - 560 + q * 160}) scale(1.4)`} fill={H.dark} opacity={(1 - q) * kneel} />;
          })}
          {/* rising golden light as the tree vanishes */}
          {fadeAway > 0 && t < A5 && Array.from({length: 24}).map((_, i) => {
            const q = (t * 0.4 + rnd(i)) % 1;
            return <circle key={i} cx={TX + (rnd(i + 3) - 0.5) * 600} cy={1300 - q * 1000} r={6 + rnd(i + 9) * 8} fill="#FFE7A8" opacity={fadeAway * (1 - q) * (1 - p(t, A5 - 0.6, A5))} />;
          })}

          {/* ===== ACT 5 · simple, grateful life ===== */}
          {a5 && (
            <g>
              <Silhouette id="sun" parts={SUN} x={830} y={560 + 420 * (1 - sunUp)} s={1} rot={t * 8} rod={false} opacity={0.9 * (1 - p(t, T.sebab, T.sebab + 1))} />
              <Silhouette id="n-hut" parts={HUT} x={820} y={1430} s={0.75} opacity={0.75 * (1 - p(t, T.sebab - 0.3, T.sebab + 0.7))} />
              <Silhouette id="n-pine" parts={PINE} x={120} y={1430} s={0.9} rod={false} opacity={0.5} />
              <Silhouette id="n-pine2" parts={PINE} x={1010} y={1430} s={0.8} rod={false} opacity={0.4 * p(t, T.sebab, T.sebab + 1)} />
              {/* field rows */}
              {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={140 + i * 70} y={1412} width={44} height={18} rx={9} fill={H.dark} opacity={0.85 * (1 - p(t, T.sebab - 0.3, T.sebab + 0.7))} />)}
              {sap > 0 && (
                <g>
                  {sapGlow > 0 && <ellipse cx={540} cy={1190} rx={260} ry={240} fill="url(#goldglow)" opacity={0.85 * sapGlow} style={{mixBlendMode: 'screen'}} />}
                  <Silhouette id="sapling" parts={SAPLING} x={540} y={1430} s={1.5 * sap} rod={false}
                    extra={sapGlow > 0 ? <circle cx={0} cy={-270} r={22} fill={GOLD} opacity={sapGlow} /> : undefined} />
                </g>
              )}
              {t > T.membantu - 1 && <Silhouette id="villager" parts={WOMAN} x={villX + bob(4, 3)} y={1430} s={1.25 * (t > T.sebab ? 1 - 0.25 * p(t, T.sebab - 0.3, T.sebab + 0.8) : 1)} flip rot={bob(5, 1.2)} />}
            </g>
          )}

          {/* ===== Arka ===== */}
          {arkaShow && (
            <Silhouette id={rich ? 'arka-rich' : 'arka'} parts={arkaParts} x={arkaX + bob(1, 3)} y={arkaY + jumpY} s={arkaS} rot={arkaRot}
              extra={
                <g>
                  {woodShow && <Firewood />}
                  {axeShow && <Axe raise={axeRaise} />}
                  {hoeShow && <Hoe swing={swing} />}
                  {/* sparkle in his eyes */}
                  {t > T.berbinar - 0.1 && t < T.akuIngin + 0.6 && [0, 1].map((i) => {
                    const q = p(t, T.berbinar + i * 0.25, T.berbinar + 0.5 + i * 0.25);
                    return <path key={i} d="M 0 -18 L 5 -5 L 18 0 L 5 5 L 0 18 L -5 5 L -18 0 L -5 -5 Z" transform={`translate(${60 + i * 50} ${-470 - i * 40}) scale(${q * (1 + 0.2 * Math.sin(t * 9))})`} fill={GOLD} />;
                  })}
                </g>
              } />
          )}

          {/* the gunungan */}
          {gunShow && <Silhouette id="gun" parts={[{poly: GUNUNGAN, perforate: 19}]} x={gunX} y={1460} s={1.08} rot={gunRot} extra={<GununganOrnament />} />}
        </svg>
        {flash > 0 && <AbsoluteFill style={{background: 'radial-gradient(circle at 60% 45%, rgba(255,240,200,.95), rgba(255,200,120,.3) 50%, transparent 75%)', opacity: flash}} />}

        {/* ===== lontar text ===== */}
        <LT y={230} w={960} h={160} q={vis(0, 3.6, 0.01, 0.4)}>
          <div style={title(36)}>HIKAYAT</div><div style={{...title(54, H.ember), whiteSpace: 'nowrap'}}>ARKA &amp; POHON EMAS</div>
        </LT>
        <LT y={230} w={520} q={vis(a('arka.') - 0.1, T.miskin - 0.35)}><div style={title(66, H.ember)}>ARKA</div></LT>
        <LT y={230} w={700} q={vis(T.miskin - 0.1, T.kaya - 0.35)}><div style={title(54)}>MISKIN · MENGELUH</div></LT>
        <LT y={230} w={940} q={vis(T.kaya - 0.1, A2 - 0.5)}><div style={text(44)}>ingin kaya, tanpa kerja keras</div></LT>
        <LT y={230} w={760} q={vis(T.menemukan - 0.1, T.anehnya - 0.35)}><div style={title(58)}>POHON TUA</div></LT>
        <LT y={230} w={820} q={vis(T.keemasan - 0.4, T.tiba - 0.35)}><div style={title(58)}>BUAH <span style={{color: '#B8860B'}}>KEEMASAN</span></div></LT>
        <LT y={230} w={860} q={vis(T.tiba - 0.05, T.wahai - 0.35)}><div style={text(46)}>suara dari dalam pohon…</div></LT>
        <LT y={220} w={960} h={160} q={vis(a('ambillah') - 0.1, T.terkejut - 0.4)}>
          <div style={text(40)}>“ambillah satu buah dariku”</div>
          <div style={{...title(40, H.ember), opacity: p(t, T.apaPun - 0.2, T.apaPun + 0.3)}}>APA PUN JADI NYATA</div>
        </LT>
        <LT y={300} w={990} h={150} q={vis(T.akuIngin - 0.05, T.seketika - 0.1, 0.05)}><div style={{...title(54, H.ember), transform: 'rotate(-2deg)'}}>“AKU INGIN EMAS!”</div></LT>
        <LT y={230} w={860} q={vis(T.tumpukan - 0.2, T.membawa - 0.35)}><div style={title(54)}>TUMPUKAN <span style={{color: '#B8860B'}}>EMAS</span></div></LT>
        <LT y={230} w={780} q={vis(T.rumah - 0.1, T.pakaian - 0.35)}><div style={title(58)}>RUMAH BESAR</div></LT>
        <LT y={230} w={820} q={vis(T.pakaian - 0.1, T.segala - 0.35)}><div style={title(58)}>PAKAIAN MEWAH</div></LT>
        <LT y={230} w={860} q={vis(T.segala - 0.1, T.namun1 - 0.35)}><div style={text(46)}>segala yang diimpikan</div></LT>
        <LT y={230} w={860} q={vis(a('keserakahannya') - 0.1, A4 - 0.7)}><div style={title(58, H.ember)}>KESERAKAHAN</div></LT>
        <LT y={300} w={990} h={150} q={vis(T.sepuluh - 0.1, T.menjawab - 0.35, 0.05)}><div style={{...title(56, H.ember), transform: 'rotate(-2deg)'}}>“EMAS × 10!”</div></LT>
        <LT y={230} w={760} q={vis(a('kekayaanmu') - 0.1, T.bukankah - 0.35)}><div style={title(58)}>SUDAH CUKUP</div></LT>
        <LT y={230} w={900} q={vis(T.bukankah - 0.1, T.marah - 0.35)}><div style={text(48)}>belajarlah bersyukur</div></LT>
        <LT y={230} w={760} q={vis(a('mengancam') - 0.1, T.akhirnya - 0.35)}><div style={title(58, H.ember)}>MENGANCAM!</div></LT>
        <LT y={230} w={820} q={vis(T.akhirnya + 0.3, T.namun2 - 0.35)}><div style={title(54)}>BUAH TERAKHIR</div></LT>
        <LT y={230} w={980} q={vis(T.berubah2 - 0.1, T.teriak - 0.35)}><div style={title(46)}><span style={{color: '#B8860B'}}>EMAS</span> → DAUN KERING</div></LT>
        <LT y={300} w={700} h={150} q={vis(T.teriak - 0.05, T.pelan - 0.35, 0.05)}><div style={{...title(64, H.ember), transform: 'rotate(2deg)'}}>TIDAAAK!</div></LT>
        <LT y={220} w={980} h={160} q={vis(T.kau - 0.1, T.menangis - 0.4)}>
          <div style={text(38)}>dapat yang kau inginkan…</div>
          <div style={{...title(36, H.ember), opacity: p(t, T.tetapi2 - 0.2, T.tetapi2 + 0.3)}}>HILANG YANG LEBIH BERHARGA</div>
        </LT>
        <LT y={230} w={700} q={vis(T.memohon - 0.1, T.namun3 - 0.35)}><div style={title(58)}>MEMOHON…</div></LT>
        <LT y={230} w={940} q={vis(T.menghilang - 0.1, A5 - 0.7)}><div style={text(46)}>lenyap bersama cahaya</div></LT>
        <LT y={230} w={860} q={vis(T.sederhana - 0.4, T.bedanya - 0.35)}><div style={title(52)}>HIDUP SEDERHANA</div></LT>
        <LT y={230} w={960} q={vis(T.bekerja2 - 0.1, T.mengukur - 0.4)}><div style={title(42)}>BEKERJA <span style={{opacity: p(t, T.membantu - 0.2, T.membantu + 0.3)}}>· MEMBANTU</span></div></LT>
        <LT y={230} w={860} q={vis(T.mengukur - 0.1, T.sebab - 0.35)}><div style={title(54)}>BAHAGIA ≠ HARTA</div></LT>
        <LT y={220} w={960} h={160} q={vis(T.kekayaan - 0.1, T.end + 0.2, 0.4, 0.4)}>
          <div style={title(42)}>KEKAYAAN SEJATI</div>
          <div style={{...title(54, H.ember), opacity: p(t, T.syukur - 0.2, T.syukur + 0.4)}}>= RASA SYUKUR</div>
        </LT>
        <Stage />
      </div>
      <div style={{position: 'absolute', right: 70, top: 96, width: 260, height: 54}}>
        <Lontar x={0} y={0} w={260} h={54} q={p(t, 0.3, 0.9)}><div style={{...title(22), width: '100%', textAlign: 'center'}}>{label}</div></Lontar>
      </div>
      <Caption t={t} pages={PAGES} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 120% 90% at 50% 40%, transparent 55%, rgba(10,4,0,.6))', pointerEvents: 'none'}} />
      <SfxTrack />
      {sound.musicFile && <Audio src={staticFile(sound.musicFile)} volume={musicGain} />}
      {project.voiceoverFile && <Audio src={staticFile(project.voiceoverFile)} />}
    </AbsoluteFill>
  );
};
