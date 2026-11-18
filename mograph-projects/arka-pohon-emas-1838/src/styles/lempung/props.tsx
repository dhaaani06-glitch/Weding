import React from 'react';
import {blobEllipse, blobRect, cf, ClayG, HEAD, L, LITE, mixColor, useBoil, wobPath} from './kit';
import {useFrame} from '../shared';

// LEMPUNG props — clay puppets and set pieces (yeast character, bubbles, CO2 model, bowl, dough, magnifier, hands,
// flour sack, gluten strands, balloon grid, oven, gauge, loaf, bread slice). All are SVGs with a viewBox, so the clay
// filter (primitives live in the SVG's user space) scales with the prop. Parts that read as separate clay pieces sit in
// separate filtered <g>; parts that never overlap share one. Every body fill goes through cf() so LITE gets volume.

export const DOUGH = '#F2DBAE';
export const DOUGH_DK = '#E3C48E';
export const YEAST = '#F6D06F';
export const BUBBLE = '#E2F3F6';
export const GLUTEN = '#E58F5A';
export const CRUST = '#C27A3A';

const mix = mixColor;
export {mixColor};

// ---------- the yeast (ragi): a single-cell fungus, oval clay blob with a face ----------
export type Mood = 'smile' | 'grin' | 'open' | 'chomp' | 'o' | 'sleep' | 'puff' | 'worry' | 'relief' | 'effort';
export type Arms = 'down' | 'up' | 'waveL' | 'waveR' | 'side' | 'pump1' | 'pump2';
const YBODY = 'M 100 16 C 162 16 192 80 192 142 C 192 202 154 232 100 232 C 46 232 8 202 8 142 C 8 80 38 16 100 16 Z';
const ARM: Record<string, [number, number, number]> = {
  dL: [14, 160, 22], dR: [186, 160, -22], uL: [20, 70, -28], uR: [180, 70, 28], sL: [4, 128, 70], sR: [196, 128, -70],
};
export type YeastOpts = {mood?: Mood; look?: number; arms?: Arms; blush?: number; sweat?: number; color?: string; dim?: number; seed?: number; boil?: number};
/** Yeast body parts in its 200×240 box (no filter) — compose many into one filtered group for crowds. */
export const yeastBody = ({arms = 'down', color = YEAST, dim = 0, seed = 1, boil = 0}: YeastOpts) => {
  const body = dim ? mix(color, '#D9CBA8', dim) : color;
  const dark = mix(body, '#B9852F', 0.35);
  const armSet = arms === 'up' ? ['uL', 'uR'] : arms === 'waveL' ? ['uL', 'dR'] : arms === 'waveR' ? ['dL', 'uR'] : arms === 'side' ? ['sL', 'sR']
    : arms === 'pump1' ? ['uL', 'sR'] : arms === 'pump2' ? ['sL', 'uR'] : ['dL', 'dR'];
  return (
    <>
      {armSet.map((k) => {
        const [x, y, r] = ARM[k];
        return <path key={k} d={blobEllipse(x, y, 15, 32, seed * 3 + x, boil, 0.09, 8)} transform={`rotate(${r} ${x} ${y})`} fill={cf(body)} />;
      })}
      <path d={blobEllipse(70, 230, 26, 13, seed + 5, boil, 0.1, 8)} fill={cf(dark)} />
      <path d={blobEllipse(130, 230, 26, 13, seed + 6, boil, 0.1, 8)} fill={cf(dark)} />
      <path d={wobPath(YBODY, seed, boil, 3.4)} fill={cf(body)} />
      {/* bud scars: lighter dimples on the cell wall */}
      <circle cx={150} cy={62} r={11} fill={cf(mix(body, '#FFF6DA', 0.45))} />
      <circle cx={44} cy={192} r={8} fill={cf(mix(body, '#FFF6DA', 0.4))} />
      <circle cx={160} cy={190} r={6} fill={cf(mix(body, '#FFF6DA', 0.4))} />
    </>
  );
};
/** Yeast face in the same box (no filter). */
export const yeastFace = ({mood = 'smile', look = 0, blush = 0.45, sweat = 0, color = YEAST, dim = 0}: YeastOpts) => {
  const body = dim ? mix(color, '#D9CBA8', dim) : color;
  const closed = mood === 'sleep' || mood === 'relief' || mood === 'effort';
  return (
    <>
      {closed ? (
        <>
          <path d={mood === 'effort' ? 'M 56 104 L 86 114 L 56 124' : 'M 56 114 Q 72 128 88 114'} stroke={L.ink} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d={mood === 'effort' ? 'M 144 104 L 114 114 L 144 124' : 'M 112 114 Q 128 128 144 114'} stroke={L.ink} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <ellipse cx={72} cy={112} rx={18} ry={mood === 'worry' ? 22 : 20} fill={cf('#FFFDF6')} />
          <ellipse cx={128} cy={112} rx={18} ry={mood === 'worry' ? 22 : 20} fill={cf('#FFFDF6')} />
          <circle cx={72 + look} cy={115} r={9.5} fill={cf(L.ink)} />
          <circle cx={128 + look} cy={115} r={9.5} fill={cf(L.ink)} />
          <circle cx={75 + look} cy={110} r={3} fill="#fff" />
          <circle cx={131 + look} cy={110} r={3} fill="#fff" />
        </>
      )}
      {mood === 'puff' ? (
        <>
          <ellipse cx={50} cy={150} rx={30} ry={24} fill={cf(mix(body, L.pink, 0.55))} />
          <ellipse cx={150} cy={150} rx={30} ry={24} fill={cf(mix(body, L.pink, 0.55))} />
          <ellipse cx={100} cy={160} rx={9} ry={6} fill={cf(L.ink)} />
        </>
      ) : (
        <>
          <ellipse cx={52} cy={146} rx={16} ry={10} fill={cf(L.pink)} opacity={Math.min(1, blush)} />
          <ellipse cx={148} cy={146} rx={16} ry={10} fill={cf(L.pink)} opacity={Math.min(1, blush)} />
        </>
      )}
      {mood === 'smile' || mood === 'relief' ? <path d="M 80 148 Q 100 168 120 148" stroke={L.ink} strokeWidth={7} fill="none" strokeLinecap="round" /> : null}
      {mood === 'grin' ? <path d="M 76 146 Q 100 176 124 146 Z" fill={cf(L.ink)} stroke={L.ink} strokeWidth={4} strokeLinejoin="round" /> : null}
      {mood === 'open' ? <><ellipse cx={100} cy={158} rx={20} ry={18} fill={cf(L.ink)} /><ellipse cx={100} cy={168} rx={11} ry={6} fill={cf(L.tomato)} /></> : null}
      {mood === 'chomp' ? <path d="M 82 156 Q 100 150 118 156" stroke={L.ink} strokeWidth={8} fill="none" strokeLinecap="round" /> : null}
      {mood === 'o' ? <ellipse cx={100} cy={158} rx={10} ry={12} fill={cf(L.ink)} /> : null}
      {mood === 'worry' ? <path d="M 80 158 Q 90 150 100 158 Q 110 166 120 158" stroke={L.ink} strokeWidth={6} fill="none" strokeLinecap="round" /> : null}
      {mood === 'effort' ? <path d="M 82 152 L 118 152" stroke={L.ink} strokeWidth={8} strokeLinecap="round" /> : null}
      {mood === 'sleep' ? <path d="M 90 154 Q 100 160 110 154" stroke={L.ink} strokeWidth={6} fill="none" strokeLinecap="round" /> : null}
      {sweat > 0 && <path d={`M 166 ${44 + sweat} C 174 ${60 + sweat} 180 ${70 + sweat} 172 ${80 + sweat} C 164 ${88 + sweat} 154 ${80 + sweat} 158 ${68 + sweat} C 160 ${60 + sweat} 164 ${52 + sweat} 166 ${44 + sweat} Z`} fill={cf(L.sky)} />}
    </>
  );
};
/** One yeast puppet (body + face as separate clay pieces). */
export const Yeast: React.FC<{w: number; f?: string} & YeastOpts> = ({w, f = 'slabB', ...o}) => {
  const boil = useBoil(true);
  return (
    <svg width={w} height={w * 1.2} viewBox="0 0 200 240" style={{overflow: 'visible', willChange: LITE ? 'transform' : undefined}}>
      <ClayG f={f}>{yeastBody({...o, boil})}</ClayG>
      <ClayG f="fine">{yeastFace(o)}</ClayG>
    </svg>
  );
};
export type CrowdItem = {x: number; base: number; w: number; sx?: number; sy?: number; dy?: number; on?: boolean} & YeastOpts;
const rowTf = (it: CrowdItem) => `translate(${it.x} ${it.base + (it.dy ?? 0)}) scale(${(it.w / 200) * (it.sx ?? 1)} ${(it.w / 200) * (it.sy ?? 1)}) translate(-100 -240)`;
/** A row of yeast in ONE svg: all bodies share one filter, all faces another (rows must not overlap sideways). */
export const YeastRow: React.FC<{items: CrowdItem[]; f: string}> = ({items, f}) => {
  const {W} = useFrame();
  const boil = useBoil(false); // crowds don't boil in lite: dozens of re-rasterised bodies per hold
  // the svg is sized to the row's bounding box (not the whole frame) and, in lite, is its own compositor layer:
  // a waving/boiling row then re-rasterises only itself instead of everything under a full-frame box (software GL)
  const vis = items.filter((it) => it.on !== false);
  const x0 = Math.min(...vis.map((it) => it.x - it.w * 0.75), 0) - 20, x1 = Math.max(...vis.map((it) => it.x + it.w * 0.75), W) + 20;
  const y0 = Math.min(...vis.map((it) => it.base + (it.dy ?? 0) - it.w * 1.6), 1e9) - 20, y1 = Math.max(...vis.map((it) => it.base + it.w * 0.2), -1e9) + 30;
  if (!vis.length) return null;
  return (
    <svg width={x1 - x0} height={y1 - y0} viewBox={`${x0} ${y0} ${x1 - x0} ${y1 - y0}`} style={{position: 'absolute', left: x0, top: y0, overflow: 'visible', willChange: LITE ? 'transform' : undefined}}>
      <ClayG f={f} flat>{items.map((it, i) => (it.on === false ? null : <g key={i} transform={rowTf(it)}>{yeastBody({seed: i + 1, ...it, boil})}</g>))}</ClayG>
      <ClayG f="fine" flat>{items.map((it, i) => (it.on === false ? null : <g key={i} transform={rowTf(it)}>{yeastFace(it)}</g>))}</ClayG>
    </svg>
  );
};

// ---------- gas bubble (opaque clay bubble with a glassy highlight); optional face / CO2 tag ----------
export const Bubble: React.FC<{d: number; face?: boolean; look?: number; tag?: boolean; color?: string; f?: string}> = ({d, face, look = 0, tag, color = BUBBLE, f = 'fine'}) => (
  <svg width={d} height={d} viewBox="0 0 100 100" style={{overflow: 'visible'}}>
    <ClayG f={f}>
      <circle cx={50} cy={50} r={46} fill={cf(color)} />
      <circle cx={52} cy={53} r={38} fill={cf(mix(color, '#FFFFFF', 0.45))} />
      <ellipse cx={33} cy={30} rx={13} ry={8} transform="rotate(-35 33 30)" fill="#FFFFFF" />
      <circle cx={70} cy={72} r={4} fill="#FFFFFF" opacity={0.8} />
      {face && (
        <>
          <circle cx={40 + look} cy={52} r={6} fill={cf(L.ink)} />
          <circle cx={62 + look} cy={52} r={6} fill={cf(L.ink)} />
          <path d={`M ${44 + look} 66 Q ${51 + look} 72 ${58 + look} 66`} stroke={L.ink} strokeWidth={4} fill="none" strokeLinecap="round" />
        </>
      )}
      {tag && (
        <text x={50} y={60} textAnchor="middle" fontFamily={HEAD} fontWeight={800} fontSize={30} fill={cf(L.ink)}>
          CO<tspan fontSize={18} dy={6}>2</tspan>
        </text>
      )}
    </ClayG>
  </svg>
);

/** Ball-and-stick CO2 model: O = C = O. */
export const Molecule: React.FC<{w: number}> = ({w}) => {
  const boil = useBoil(true);
  return (
  <svg width={w} height={w * 0.42} viewBox="0 0 300 126" style={{overflow: 'visible'}}>
    <ClayG f="slabA">
      <rect x={60} y={50} width={180} height={24} rx={12} fill={cf(L.cream)} />
      <path d={blobEllipse(52, 62, 46, 46, 11, boil, 0.05)} fill={cf(L.tomato)} />
      <path d={blobEllipse(248, 62, 46, 46, 12, boil, 0.05)} fill={cf(L.tomato)} />
      <path d={blobEllipse(150, 62, 54, 54, 13, boil, 0.05)} fill={cf(L.ink)} />
    </ClayG>
    <g fontFamily={HEAD} fontWeight={800} textAnchor="middle">
      <text x={52} y={78} fontSize={46} fill={cf(L.cream)}>O</text>
      <text x={150} y={80} fontSize={52} fill={cf(L.cream)}>C</text>
      <text x={248} y={78} fontSize={46} fill={cf(L.cream)}>O</text>
    </g>
  </svg>
  );
};

// ---------- kitchen pieces ----------
/** Mixing bowl, split so dough can sit between the inside (back) and the front wall. */
export const BowlBack: React.FC<{w: number}> = ({w}) => {
  const boil = useBoil();
  return (
    <svg width={w} height={w * 0.52} viewBox="0 0 640 330" style={{overflow: 'visible'}}>
      <ClayG f="slabA">
        <path d={blobEllipse(320, 64, 320, 56, 21, boil, 0.018, 14)} fill={cf('#3FB0A2')} />
        <path d={blobEllipse(320, 68, 286, 40, 22, boil, 0.016, 14)} fill={cf('#1F6E65')} />
      </ClayG>
    </svg>
  );
};
export const BowlFront: React.FC<{w: number}> = ({w}) => {
  const boil = useBoil();
  return (
  <svg width={w} height={w * 0.52} viewBox="0 0 640 330" style={{overflow: 'visible'}}>
    <ClayG f="slabA">
      <path d={wobPath('M 0 66 Q 6 326 320 326 Q 634 326 640 66 Q 600 110 320 112 Q 40 110 0 66 Z', 23, boil, 4.5)} fill={cf(L.teal)} />
      <path d="M 60 170 Q 120 250 220 270" stroke="rgba(255,255,255,0.18)" strokeWidth={14} fill="none" strokeLinecap="round" />
      <rect x={250} y={318} width={140} height={14} rx={7} fill={cf('#23786E')} />
    </ClayG>
  </svg>
  );
};

/** Dough dome whose height really changes (not a CSS stretch), so the light stays round. rise 1 = base height. */
export const Dough: React.FC<{w: number; rise?: number; color?: string; score?: number; f?: string; holes?: boolean}> = ({w, rise = 1, color = DOUGH, score = 0, f = 'slabA', holes}) => {
  const h = 120 * rise;
  const top = 300 - h;
  const boil = useBoil();
  const d = wobPath(`M 12 300 C 4 ${top + h * 0.45} ${60} ${top} 200 ${top} C ${340} ${top} 396 ${top + h * 0.45} 388 300 Z`, 31, boil, 3.5);
  return (
    <svg width={w} height={w * 0.8} viewBox="0 0 400 320" style={{overflow: 'visible'}}>
      <ClayG f={f}>
        <path d={d} fill={cf(color)} />
        {score > 0 && [0, 1, 2].map((i) => (
          <path key={i} d={`M ${120 + i * 70} ${top + h * 0.28} q 22 ${h * 0.12} 46 ${h * 0.05}`} stroke={mix(color, '#FFF3DC', score)} strokeWidth={14} strokeLinecap="round" fill="none" />
        ))}
        {holes && [[150, 0.6], [240, 0.45], [205, 0.75]].map(([x, k], i) => <circle key={i} cx={x} cy={300 - h * k} r={7} fill={cf(mix(color, '#A57B45', 0.35))} />)}
      </ClayG>
    </svg>
  );
};

/** Magnifying glass: clay rim + handle; the lens shows `children` (a 2r × 2r view). */
export const Magnifier: React.FC<{r: number; handle?: boolean; children?: React.ReactNode; tint?: string}> = ({r, handle = true, children, tint = DOUGH}) => (
  <div style={{position: 'absolute', left: -r, top: -r, width: 2 * r, height: 2 * r}}>
    {handle && (
      <svg width={2 * r} height={2 * r} viewBox="-100 -100 200 200" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <ClayG f="slabB"><rect x={78} y={-16} width={110} height={32} rx={16} transform="rotate(45)" fill={cf(L.cocoa)} /></ClayG>
      </svg>
    )}
    <div style={{position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', background: tint}}>{children}</div>
    <svg width={2 * r} height={2 * r} viewBox="-100 -100 200 200" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <path d="M -62 -40 A 74 74 0 0 1 -30 -68" stroke="rgba(255,255,255,0.55)" strokeWidth={7} fill="none" strokeLinecap="round" />
      <ClayG f="slabA"><circle cx={0} cy={0} r={98} fill="none" stroke={L.tomato} strokeWidth={13} /></ClayG>
    </svg>
  </div>
);

export const WaterDrop: React.FC<{w: number; face?: boolean; color?: string}> = ({w, face = true, color = L.sky}) => {
  const boil = useBoil(true);
  return (
  <svg width={w} height={w * 1.3} viewBox="0 0 100 130" style={{overflow: 'visible'}}>
    <ClayG f="slabC">
      <path d={wobPath('M 50 4 C 70 40 96 62 96 88 C 96 114 76 128 50 128 C 24 128 4 114 4 88 C 4 62 30 40 50 4 Z', 41, boil, 1.8)} fill={cf(color)} />
      <ellipse cx={30} cy={78} rx={9} ry={16} transform="rotate(20 30 78)" fill={cf('#E6F6FD')} />
    </ClayG>
    {face && (
      <ClayG f="fine">
        <circle cx={40} cy={92} r={5.5} fill={cf(L.ink)} />
        <circle cx={62} cy={92} r={5.5} fill={cf(L.ink)} />
        <path d="M 44 104 Q 51 110 58 104" stroke={L.ink} strokeWidth={4} fill="none" strokeLinecap="round" />
      </ClayG>
    )}
  </svg>
  );
};

/** Warm steam / aroma / alcohol wisp: a wavy clay noodle; phase wiggles it per hold. */
export const Wisp: React.FC<{h: number; color: string; phase?: number; width?: number}> = ({h, color, phase = 0, width = 16}) => {
  const pts: string[] = [];
  for (let i = 0; i <= 8; i++) {
    const y = 200 - i * 25;
    const x = 30 + Math.sin(i * 0.95 + phase) * 14;
    pts.push(`${i ? 'L' : 'M'} ${x.toFixed(1)} ${y}`);
  }
  return (
    <svg width={h * 0.3} height={h} viewBox="0 0 60 200" style={{overflow: 'visible'}}>
      <ClayG f="fine"><path d={pts.join(' ')} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" /></ClayG>
    </svg>
  );
};

/** Sugar cube with a lit top face and sugar grains. */
export const SugarCube: React.FC<{w: number}> = ({w}) => (
  <svg width={w} height={w} viewBox="0 0 100 100" style={{overflow: 'visible'}}>
    <ClayG f="slabC">
      <rect x={6} y={18} width={80} height={78} rx={12} fill={cf('#F4EDE0')} />
      <path d="M 6 30 L 22 6 L 98 6 L 86 30 Z" fill="#FFFFFF" />
      <path d="M 86 30 L 98 6 L 98 82 L 86 96 Z" fill={cf('#E4DACA')} />
      {[[24, 44], [52, 60], [34, 78], [66, 40], [70, 80]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={3} fill="#FFFFFF" />)}
    </ClayG>
  </svg>
);

/** Generic flour sack with a plain-text label. */
export const FlourSack: React.FC<{w: number}> = ({w}) => {
  const boil = useBoil();
  return (
  <svg width={w} height={w * 1.25} viewBox="0 0 280 350" style={{overflow: 'visible'}}>
    <ClayG f="slabA">
      <path d={wobPath('M 40 70 C 30 160 10 300 40 340 L 240 340 C 270 300 250 160 240 70 C 200 84 80 84 40 70 Z', 51, boil, 3.5)} fill={cf('#F3E9D6')} />
      <path d={wobPath('M 60 74 C 90 30 110 10 140 30 C 170 10 190 30 220 74 C 180 86 100 86 60 74 Z', 52, boil, 3)} fill={cf('#EADCC2')} />
    </ClayG>
    <ClayG f="fine">
      <rect x={96} y={58} width={88} height={18} rx={9} fill={cf(L.cocoa)} />
      <rect x={58} y={170} width={164} height={110} rx={18} fill={cf(L.tomato)} />
      <text x={140} y={218} textAnchor="middle" fontFamily={HEAD} fontWeight={800} fontSize={36} fill={cf(L.cream)}>TEPUNG</text>
      <text x={140} y={258} textAnchor="middle" fontFamily={HEAD} fontWeight={800} fontSize={32} fill={cf(L.cream)}>TERIGU</text>
    </ClayG>
  </svg>
  );
};

/** Clay mitten hand seen from above (kneading), with a lilac sleeve. Mirror with flip. */
export const Hand: React.FC<{w: number; flip?: boolean}> = ({w, flip}) => {
  const boil = useBoil(true);
  const sd = flip ? 70 : 60;
  return (
    <svg width={w} height={w * 1.3} viewBox="0 0 200 260" style={{overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined}}>
      <ClayG f="slabB"><path d={blobRect(50, -1000, 110, 1100, 40, sd, boil, 4)} fill={cf(L.lilac)} /></ClayG>
      <ClayG f="slabA">
        <path d={blobRect(34, 70, 136, 170, 64, sd + 1, boil, 3.5)} fill={cf(L.skin)} />
        <path d={blobEllipse(172, 150, 26, 44, sd + 2, boil, 0.08, 8)} transform="rotate(-24 172 150)" fill={cf(L.skin)} />
        <path d="M 70 210 L 70 236 M 100 214 L 100 242 M 130 210 L 130 236" stroke={L.skinDk} strokeWidth={6} strokeLinecap="round" />
      </ClayG>
    </svg>
  );
};

// ---------- gluten ----------
type Pt = [number, number];
/** Loose wiggly protein strand (before kneading links them). */
export const strand = (cx: number, cy: number, len: number, ang: number, ph: number) => {
  const pts: Pt[] = [];
  for (let i = 0; i <= 6; i++) {
    const k = i / 6 - 0.5;
    const nx = Math.cos(ang), ny = Math.sin(ang);
    const off = Math.sin(i * 1.7 + ph) * 16;
    pts.push([cx + nx * k * len - ny * off, cy + ny * k * len + nx * off]);
  }
  return 'M ' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ');
};

// ---------- balloons network (gluten = millions of linked balloons) ----------
export const BALLOON_COLS = [L.lilac, L.pink, '#7FCBC0', L.sky, '#F5C76A', '#F2A48A'];
export type BalloonNode = {x: number; y: number; ring: number; c: string};
/** Hex-packed nodes inside an ellipse (dough cross-section). */
export const balloonNodes = (cx: number, cy: number, rx: number, ry: number, step: number): BalloonNode[] => {
  const out: BalloonNode[] = [];
  const rows = Math.ceil((ry * 2) / (step * 0.87));
  for (let r = -rows; r <= rows; r++) {
    const y = cy + r * step * 0.87;
    for (let c = -20; c <= 20; c++) {
      const x = cx + c * step + (r % 2 ? step / 2 : 0);
      const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (e <= 1 && y < cy + ry * 0.92) out.push({x, y, ring: Math.round(Math.hypot((x - cx) / step, (y - cy) / step)), c: BALLOON_COLS[(Math.abs(r) * 2 + Math.abs(c)) % BALLOON_COLS.length]});
    }
  }
  return out;
};

// ---------- oven + gauge ----------
export const OVEN = {w: 940, h: 900, win: {x: 100, y: 236, w: 740, h: 508}};
/** Retro clay oven (body only; the window interior is drawn by the scene in a clipped box on top). */
export const OvenBody: React.FC<{lamp: number}> = ({lamp}) => {
  const boil = useBoil();
  return (
  <svg width={OVEN.w} height={OVEN.h} viewBox={`0 0 ${OVEN.w} ${OVEN.h}`} style={{overflow: 'visible'}}>
    <ClayG f="slabA">
      <path d={blobRect(10, 20, 920, 850, 70, 81, boil, 5)} fill={cf(L.teal)} />
      <rect x={30} y={872} width={90} height={30} rx={12} fill={cf('#23786E')} />
      <rect x={820} y={872} width={90} height={30} rx={12} fill={cf('#23786E')} />
    </ClayG>
    <ClayG f="slabB"><path d={blobRect(46, 46, 848, 130, 40, 82, boil, 3)} fill={cf(L.cream)} /></ClayG>
    <ClayG f="fine">
      {[150, 300, 640, 790].map((x, i) => <circle key={x} cx={x} cy={111} r={40} fill={cf([L.mustard, L.tomato, L.lilac, L.mustard][i])} />)}
      {[150, 300, 640, 790].map((x) => <rect key={x} x={x - 6} y={78} width={12} height={34} rx={6} fill={cf(L.ink)} opacity={0.6} />)}
      <circle cx={470} cy={111} r={24} fill={cf(lamp ? '#FF9A3D' : '#8C6A55')} />
    </ClayG>
    <ClayG f="slabB"><rect x={260} y={196} width={420} height={30} rx={15} fill={cf(L.cream)} /></ClayG>
    <ClayG f="slabC">
      <path d={blobRect(OVEN.win.x - 26, OVEN.win.y - 26, OVEN.win.w + 52, OVEN.win.h + 52, 56, 83, boil, 3)} fill={cf('#23786E')} />
    </ClayG>
  </svg>
  );
};

/** Round clay temperature gauge (no numbers): green → mustard → tomato arc, needle at angle a (deg, -120..120). */
export const Gauge: React.FC<{d: number; a: number}> = ({d, a}) => {
  const arc = (r: number, a0: number, a1: number) => {
    const p = (an: number) => [Math.sin((an * Math.PI) / 180) * r, -Math.cos((an * Math.PI) / 180) * r];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };
  return (
    <svg width={d} height={d} viewBox="-120 -120 240 240" style={{overflow: 'visible'}}>
      <ClayG f="slabA"><circle cx={0} cy={0} r={112} fill={cf(L.cream)} /></ClayG>
      <ClayG f="fine">
        <path d={arc(80, -120, -45)} stroke="#55B88C" strokeWidth={22} fill="none" strokeLinecap="round" />
        <path d={arc(80, -30, 35)} stroke={L.mustard} strokeWidth={22} fill="none" strokeLinecap="round" />
        <path d={arc(80, 50, 120)} stroke={L.tomato} strokeWidth={22} fill="none" strokeLinecap="round" />
      </ClayG>
      <ClayG f="fine" transform={`rotate(${a})`}>
        <rect x={-8} y={-86} width={16} height={96} rx={8} fill={cf(L.ink)} />
        <circle cx={0} cy={0} r={20} fill={cf(L.cocoa)} />
      </ClayG>
      <text x={0} y={70} textAnchor="middle" fontFamily={HEAD} fontWeight={800} fontSize={30} fill={cf(L.cocoa)}>SUHU</text>
    </svg>
  );
};

// ---------- bread ----------
/** Loaf on its side (dome + scoring); bake 0 = raw dough, 1 = golden-brown crust. */
export const Loaf: React.FC<{w: number; bake: number}> = ({w, bake}) => {
  const c = mix(DOUGH, CRUST, bake);
  const hi = mix(mix(DOUGH, '#FFF1D8', 0.5), '#E9A25C', bake);
  const boil = useBoil();
  return (
    <svg width={w} height={w * 0.56} viewBox="0 0 640 360" style={{overflow: 'visible'}}>
      <ClayG f="big">
        <path d={wobPath('M 30 350 C 10 200 120 40 320 40 C 520 40 630 200 610 350 Z', 91, boil, 5)} fill={cf(c)} />
        {[0, 1, 2, 3].map((i) => <path key={i} d={`M ${170 + i * 95} ${120 + Math.abs(i - 1.5) * 26} q 30 26 64 14`} stroke={hi} strokeWidth={22} strokeLinecap="round" fill="none" />)}
      </ClayG>
    </svg>
  );
};

/** Bread slice: crust ring, soft crumb with air holes; optional bite taken out of the top-right. */
export const Slice: React.FC<{w: number; bite?: number; id: string}> = ({w, bite = 0, id}) => {
  const boil = useBoil();
  const outer = wobPath('M 60 600 L 60 270 C -6 240 -4 86 120 64 C 200 4 360 4 440 64 C 564 86 566 240 500 270 L 500 600 Q 280 618 60 600 Z', 95, boil, 4.5);
  const holes: [number, number, number][] = [];
  for (let i = 0; i < 34; i++) holes.push([110 + rnd(i * 3.1) * 340, 150 + rnd(i * 5.7) * 410, 5 + rnd(i * 9.3) * 12]);
  return (
    <svg width={w} height={w * 1.12} viewBox="0 0 560 628" style={{overflow: 'visible'}}>
      <defs>
        <mask id={`bite-${id}`}>
          <rect x={-50} y={-50} width={700} height={720} fill="#fff" />
          {bite > 0 && [[470, 70, 70], [400, 30, 56], [520, 150, 56]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r * bite} fill="#000" />)}
        </mask>
      </defs>
      <g mask={`url(#bite-${id})`}>
        <ClayG f="big">
          <path d={outer} fill={cf(CRUST)} />
          <path d={outer} transform="translate(280 330) scale(0.9) translate(-280 -330)" fill={cf('#F8E7C4')} />
          {holes.map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.75} fill={cf('#E6CB98')} />)}
        </ClayG>
      </g>
    </svg>
  );
};

const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
