import React from 'react';
import {CaptionPage} from '../../components/WordCaptions';
import {display, noise, p, pageAt, renderQuality, rnd, useFrame} from '../shared';

// HIKAYAT style kit — history & legend as a shadow-puppet play (kelir, carved perforated silhouettes, gunungan, lontar).
export const HIKAYAT = {
  glow: '#F7C66C', glow2: '#E08A36', edge: '#5E240C', dark: '#1B0D06', leaf: '#D9B678', leafDark: '#B98E4E',
  ink: '#3A2211', ember: '#C2410F', stage: '#2A160A',
};
export const H = HIKAYAT;
export const HEAD = "'Hik Head', serif";
export const TEXT = "'Hik Text', serif";
export const CLOTH = noise(0.55, 3, 21, 512);
export const FIBER = noise(0.02, 2, 5, 512);

// ---------- render quality (v1.9) ----------
// On a CPU-only renderer a FULL frame cost ~2 s: every Silhouette is an SVG mask with hundreds-to-thousands of
// perforation ellipses plus a blurred second shadow, all re-drawn every frame (puppets bob, water drifts, rain falls),
// and the lamp flicker repaints the whole kelir (gradient + two blend layers) under everything. LITE draws each
// perforated part as a fill with a cached hole pattern plus a solid rim (no mask) and a hard, unblurred second
// shadow, freezes the flicker and keeps the kelir and the stage on their own static compositor layers.
const lite = () => renderQuality() === 'lite';


export type Pt = [number, number];
export const polyD = (pts: Pt[]) => `M ${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ')} Z`;
export const inside = ([x, y]: Pt, poly: Pt[]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
/** Perforation points (tatahan) inside a polygon, keeping a solid rim of `rim` px. */
export const holes = (poly: Pt[], step: number, rim: number, seed: number): Pt[] => {
  const xs = poly.map((q) => q[0]), ys = poly.map((q) => q[1]);
  const out: Pt[] = [];
  // lattice anchored at 0,0 (not at the shape's bounding box) so a morphing or moving shape keeps its holes still
  for (let y = Math.floor(Math.min(...ys) / step) * step; y <= Math.max(...ys); y += step) {
    const row = Math.round(y / step);
    for (let x = Math.floor(Math.min(...xs) / step) * step + (row % 2 ? step / 2 : 0); x <= Math.max(...xs); x += step) {
      const pt: Pt = [x + (rnd(seed + x * 0.1 + y) - 0.5) * 2, y];
      if ([[0, 0], [rim, 0], [-rim, 0], [0, rim], [0, -rim]].every(([dx, dy]) => inside([pt[0] + dx, pt[1] + dy], poly))) out.push(pt);
    }
  }
  return out;
};

// ---------- puppets (polygons in local coords, feet/rod point at 0,0, facing right) ----------
export type Part = {poly: Pt[]; perforate?: number};
export const KING: Part[] = [
  {poly: [[-60, -470], [-52, -560], [-34, -520], [-22, -600], [-6, -532], [10, -590], [22, -528], [40, -572], [44, -486], [-40, -470]], perforate: 13},
  {poly: [[-46, -470], [40, -478], [52, -456], [92, -446], [56, -430], [50, -404], [26, -392], [-4, -384], [-34, -396], [-48, -430]]},
  {poly: [[-40, -392], [30, -392], [58, -250], [-58, -244]], perforate: 15},
  {poly: [[-62, -250], [62, -254], [120, -40], [70, -24], [26, 0], [-34, 0], [-80, -30], [-118, -60]], perforate: 17},
  {poly: [[-40, -388], [-118, -300], [-150, -110], [-128, -104], [-104, -290], [-30, -360]]},
  {poly: [[18, -388], [96, -318], [150, -380], [164, -366], [104, -292], [12, -356]]},
];
export const THIEF: Part[] = [
  {poly: [[-40, -470], [36, -476], [50, -458], [86, -450], [52, -430], [46, -404], [20, -394], [-6, -388], [-32, -400], [-44, -432]]},
  {poly: [[-46, -480], [42, -492], [60, -470], [-50, -458]]},
  {poly: [[-38, -394], [28, -394], [48, -260], [-50, -252]], perforate: 15},
  {poly: [[-52, -256], [50, -258], [74, -40], [30, 0], [-26, 0], [-70, -46]], perforate: 17},
  {poly: [[-38, -386], [-110, -300], [-138, -120], [-118, -116], [-94, -288], [-30, -360]]},
  {poly: [[16, -386], [92, -330], [150, -352], [156, -334], [98, -306], [10, -354]]},
];
export const WOLF: Pt[] = [[-200, -150], [-150, -200], [-60, -214], [40, -212], [110, -250], [130, -300], [150, -262], [190, -250], [232, -226], [200, -206], [160, -200], [140, -150], [150, -20], [124, -20], [110, -120], [20, -120], [-60, -120], [-80, -20], [-106, -20], [-110, -130], [-170, -120], [-230, -170], [-270, -150], [-232, -196]];
export const QMARK: Pt[] = [[-120, -620], [-60, -700], [40, -716], [120, -670], [140, -580], [100, -500], [30, -450], [20, -360], [-50, -360], [-56, -470], [10, -540], [56, -590], [40, -640], [-10, -650], [-54, -610], [-66, -560]];
export const gunungan = (): Pt[] => {
  const pts: Pt[] = [];
  const N = 90;
  for (let i = 0; i <= N; i++) {
    const k = i / N;
    const w = 300 * Math.pow(1 - k, 0.72) * (1 + 0.28 * Math.sin(Math.PI * k)) + (k > 0.04 && k < 0.96 ? 10 * Math.abs(Math.sin(k * Math.PI * 9)) : 0);
    pts.push([w, -1050 * k]);
  }
  for (let i = N; i >= 0; i--) pts.push([-pts[i][0], pts[i][1]]);
  return pts;
};
export const GUNUNGAN = gunungan();

/** The local rect a silhouette is drawn (and clipped) in. Portrait: the fixed v1.10 rect −600..600 × −1200..100 (parts
 * outside it are cut, e.g. WATER's ±1300). Landscape: the parts' own bounding box, so widened scenery (scalePts) and
 * WATER span the whole 1920 width, and each mask covers only its puppet. */
const PORTRAIT_BOX = {x: -600, y: -1200, w: 1200, h: 1300};
const boxOf = (parts: Part[], wide: boolean) => {
  if (!wide) return PORTRAIT_BOX;
  const xs = parts.flatMap((pt) => pt.poly.map((q) => q[0])), ys = parts.flatMap((pt) => pt.poly.map((q) => q[1]));
  const x = Math.floor(Math.min(...xs)) - 4, y = Math.floor(Math.min(...ys)) - 4;
  return {x, y, w: Math.ceil(Math.max(...xs)) + 4 - x, h: Math.ceil(Math.max(...ys)) + 4 - y};
};

/** A carved leather silhouette: solid rim, perforations show the lamp light, a soft second shadow on the screen. */
export const Silhouette: React.FC<{id: string; parts: Part[]; x: number; y: number; s?: number; rot?: number; flip?: boolean; rod?: boolean; extra?: React.ReactNode; opacity?: number}> = ({
  id, parts, x, y, s = 1, rot = 0, flip = false, rod = true, extra, opacity = 1,
}) => {
  const lt = lite();
  const {wide} = useFrame();
  const box = React.useMemo(() => boxOf(parts, wide), [parts, wide]);
  const hs = React.useMemo(() => (lt ? [] : parts.flatMap((pt, i) => (pt.perforate ? holes(pt.poly, pt.perforate, 9, i * 7 + id.length) : []))), [parts, id, lt]);
  const body = (
    <>
      {parts.map((pt, i) => <path key={i} d={polyD(pt.poly)} />)}
    </>
  );
  if (lt) return <SilhouetteLite id={id} parts={parts} x={x} y={y} s={s} rot={rot} flip={flip} rod={rod} extra={extra} opacity={opacity} box={box} />;
  const tf = `translate(${x} ${y}) rotate(${rot}) scale(${flip ? -s : s} ${s})`;
  return (
    <g opacity={opacity}>
      <defs>
        <mask id={`m-${id}`} maskUnits="userSpaceOnUse" x={-2000} y={-3000} width={4000} height={4000}>
          <g fill="#fff">{body}</g>
          <g fill="#000">{hs.map(([hx, hy], i) => <ellipse key={i} cx={hx} cy={hy} rx={3.6} ry={5.2} />)}</g>
        </mask>
      </defs>
      {/* second shadow: the puppet a little off the screen */}
      <g transform={`translate(${x + 22} ${y + 10}) rotate(${rot}) scale(${flip ? -s * 1.04 : s * 1.04} ${s * 1.04})`} fill={H.dark} opacity={0.32} filter="url(#hik-soft)">{body}</g>
      <g transform={tf}>
        <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={H.dark} mask={`url(#m-${id})`} />
        {extra}
        {rod && <line x1={0} y1={0} x2={0} y2={420} stroke={H.dark} strokeWidth={7} />}
      </g>
    </g>
  );
};

// LITE silhouette: no mask and no blur. A perforated part is filled with a tiny repeating hole pattern (the same
// lattice FULL punches, anchored at 0,0 of the puppet; Chrome rasterises the tile once) and gets a solid 9 px rim by
// stroking its outline 18 px wide, clipped to itself. The second shadow is the parts' union as a hard offset at 32%.
// Everything is clipped to the same rect as FULL (boxOf: the fixed portrait rect, or the parts' bbox in landscape).
const holeD = (x: number, y: number) => `M${x - 3.6} ${y}A3.6 5.2 0 1 0 ${x + 3.6} ${y}A3.6 5.2 0 1 0 ${x - 3.6} ${y}Z`;
const tileD = (st: number) => `M0 0H${st}V${2 * st}H0Z` + [[0, 0], [st, 0], [0, 2 * st], [st, 2 * st], [st / 2, st]].map(([hx, hy]) => holeD(hx, hy)).join('');
const SilhouetteLite: React.FC<{id: string; parts: Part[]; x: number; y: number; s: number; rot: number; flip: boolean; rod: boolean; extra?: React.ReactNode; opacity: number; box: typeof PORTRAIT_BOX}> = ({
  id, parts, x, y, s, rot, flip, rod, extra, opacity, box,
}) => {
  const ds = parts.map((pt) => polyD(pt.poly));
  const steps = [...new Set(parts.map((pt) => pt.perforate).filter((v): v is number => !!v))];
  return (
    <g opacity={opacity}>
      <defs>
        {steps.map((st) => (
          <pattern key={st} id={`lp-${id}-${st}`} patternUnits="userSpaceOnUse" x={0} y={0} width={st} height={2 * st}>
            <path d={tileD(st)} fill={H.dark} />
          </pattern>
        ))}
        <clipPath id={`lc-${id}`}><rect x={box.x} y={box.y} width={box.w} height={box.h} /></clipPath>
        {parts.map((pt, i) => (pt.perforate ? <clipPath key={i} id={`lr-${id}-${i}`}><path d={ds[i]} /></clipPath> : null))}
      </defs>
      <path transform={`translate(${x + 22} ${y + 10}) rotate(${rot}) scale(${flip ? -s * 1.04 : s * 1.04} ${s * 1.04})`} d={ds.join(' ')} fill={H.dark} fillOpacity={0.32} />
      <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -s : s} ${s})`}>
        <g clipPath={`url(#lc-${id})`}>
          {parts.map((pt, i) => (pt.perforate ? (
            <React.Fragment key={i}>
              <path d={ds[i]} fill={`url(#lp-${id}-${pt.perforate})`} />
              <path d={ds[i]} fill="none" stroke={H.dark} strokeWidth={18} clipPath={`url(#lr-${id}-${i})`} />
            </React.Fragment>
          ) : <path key={i} d={ds[i]} fill={H.dark} />))}
        </g>
        {extra}
        {rod && <line x1={0} y1={0} x2={0} y2={420} stroke={H.dark} strokeWidth={7} />}
      </g>
    </g>
  );
};

// ---------- lontar ----------
export const Lontar: React.FC<{x: number; y: number; w: number; h?: number; q: number; children?: React.ReactNode; rot?: number}> = ({x, y, w, h = 110, q, children, rot = 0}) => {
  if (q <= 0) return null;
  const lt = lite();
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, transform: `rotate(${rot}deg) translateY(${(1 - q) * -30}px)`, opacity: Math.min(1, q * 2),
      clipPath: `inset(0 ${(1 - q) * 100}% 0 0 round ${h / 2}px)`}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: `${h * 0.45}px / ${h / 2}px`, ...(lt ? LEAF_BAKED : {background: `linear-gradient(180deg, #E6C88E, ${H.leaf} 45%, ${H.leafDark})`}),
        boxShadow: '0 14px 26px rgba(20,8,2,.55), inset 0 2px 0 rgba(255,240,200,.5)'}}>
        {!lt && <div style={{position: 'absolute', inset: 0, borderRadius: 'inherit', backgroundImage: `repeating-linear-gradient(180deg, transparent 0 9px, rgba(90,55,20,.18) 9px 10px), ${FIBER}`, backgroundSize: '100% 100%, 512px', mixBlendMode: 'multiply', opacity: 0.7}} />}
        {[0.07, 0.93].map((k) => <div key={k} style={{position: 'absolute', left: `${k * 100}%`, top: '50%', width: 14, height: 14, marginLeft: -7, marginTop: -7, borderRadius: 7, background: '#3a2211', boxShadow: 'inset 0 2px 2px #000'}} />)}
      </div>
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: `0 ${h * 0.9}px`}}>{children}</div>
    </div>
  );
};
/** LITE lontar leaf: the vein lines and FIBER (pre-faded to the 70% FULL shows) multiplied into one background. */
const FIBER_70 = (() => {
  const f = ['R', 'G', 'B'].map((c) => `<feFunc${c} type='linear' slope='0.7' intercept='0.3'/>`).join('');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.02' numOctaves='2' seed='5' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/><feComponentTransfer color-interpolation-filters='sRGB'>${f}</feComponentTransfer></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
})();
const LEAF_BAKED: React.CSSProperties = {
  backgroundImage: `repeating-linear-gradient(180deg, transparent 0 9px, rgba(90,55,20,.126) 9px 10px), ${FIBER_70}, linear-gradient(180deg, #E6C88E, ${HIKAYAT.leaf} 45%, ${HIKAYAT.leafDark})`,
  backgroundSize: '100% 100%, 512px, 100% 100%', backgroundBlendMode: 'multiply, multiply, normal',
};
export const incised: React.CSSProperties = {color: H.ink, textShadow: '0 1.5px 0 rgba(255,236,190,.55), 0 -1px 0 rgba(40,20,5,.35)'};

export const Tally: React.FC<{n: number; shown: number; color?: string}> = ({n, shown, color = H.ink}) => (
  <div style={{display: 'flex', gap: 7, alignItems: 'center'}}>
    {Array.from({length: n}).map((_, i) => (
      <div key={i} style={{width: 7, height: 54, borderRadius: 3, background: color, opacity: i < shown ? 1 : 0, marginRight: (i + 1) % 7 === 0 ? 14 : 0,
        transform: `rotate(${(rnd(i) - 0.5) * 8}deg)`, boxShadow: '0 1px 0 rgba(255,236,190,.5)'}} />
    ))}
  </div>
);

/** Caption on a lontar leaf, the spoken word in ember. Portrait: `top` 1488 (above the stage at 1700). Landscape (no
 * `top`): bottom edge 132 px above the frame bottom, i.e. just above the landscape stage (960), max 1400 wide, 54 px. */
export const Caption: React.FC<{t: number; pages: CaptionPage[]; top?: number}> = ({t, pages, top}) => {
  const fr = useFrame();
  const pg = pageAt(t, pages);
  if (!pg) return null;
  const pop = p(t, pg.start - 0.08, pg.start + 0.12);
  const side = fr.pick(60, fr.safe.side);
  const pos = top !== undefined || !fr.wide ? {top: top ?? 1488} : {bottom: fr.safe.bottom + 12};
  return (
    <div style={{position: 'absolute', left: side, right: side, ...pos, display: 'flex', justifyContent: 'center', opacity: pop}}>
      <div style={{position: 'relative', padding: '18px 70px', borderRadius: '50px / 48px', background: `linear-gradient(180deg, #E6C88E, ${H.leaf} 45%, ${H.leafDark})`,
        boxShadow: '0 14px 26px rgba(20,8,2,.6)', fontFamily: TEXT, fontWeight: 700, fontSize: fr.pick(58, 54), lineHeight: 1.12, textAlign: 'center', maxWidth: fr.pick(960, 1400)}}>
        {pg.words.map((w, i) => {
          const on = t >= w.start - 0.04 && t < w.end + 0.1;
          const said = t >= w.start - 0.04;
          return (
            <React.Fragment key={i}>
              <span style={{...incised, color: on ? H.ember : said ? H.ink : 'rgba(58,34,17,.45)'}}>{display(w.word)}</span>
              {i < pg.words.length - 1 ? ' ' : ''}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};


/** Ornaments drawn on top of the gunungan silhouette (tree + gate). */
export const GununganOrnament: React.FC = () => (
  <g fill="#1B0D06" stroke="#1B0D06">
    <rect x={-14} y={-820} width={28} height={760} stroke="none" />
    {[0, 1, 2, 3, 4, 5].map((i) => [-1, 1].map((sd) => <path key={`${i}${sd}`} d={`M 0 ${-260 - i * 95} Q ${sd * 90} ${-300 - i * 95} ${sd * (190 - i * 26)} ${-380 - i * 95}`} fill="none" strokeWidth={12} strokeLinecap="round" />))}
    <path d="M -120 -60 L 120 -60 L 120 -210 L 0 -290 L -120 -210 Z" stroke="none" />
    <rect x={-40} y={-190} width={80} height={130} fill="#E9A54E" opacity={0.85} stroke="none" />
  </g>
);

/** The lit screen: warm lamp glow, cloth weave, flicker. Put it first inside an AbsoluteFill. */
export const Kelir: React.FC<{t: number; dim?: number; tint?: string}> = ({t, dim = 0, tint}) => {
  const lt = lite();
  // the lamp pool: tall over the portrait screen, wide across the landscape one (same hot spot, same falloff stops)
  const fr = useFrame();
  const pool = fr.pick('ellipse 820px 1150px at 52% 38%', 'ellipse 1400px 860px at 50% 40%');
  const flare = fr.pick('ellipse 700px 900px at 52% 36%', 'ellipse 1150px 720px at 50% 37%');
  // LITE: no flicker (it repainted the whole screen every frame) and the kelir sits on its own static layer
  const flick = lt ? 1 : 1 + 0.05 * Math.sin(t * 13.1) + 0.035 * Math.sin(t * 29.7 + 1) + 0.025 * Math.sin(t * 6.3 + 2);
  const Wrap = lt ? KelirLayer : React.Fragment;
  return (
    <Wrap>
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(${pool}, ${HIKAYAT.glow} 0%, ${HIKAYAT.glow2} 38%, ${HIKAYAT.edge} 78%, #1E0B04 100%)`}} />
      {tint && <div style={{position: 'absolute', inset: 0, background: lt ? quantTint(tint) : tint, mixBlendMode: 'multiply'}} />}
      <div style={{position: 'absolute', inset: 0, backgroundImage: CLOTH, backgroundSize: '512px', opacity: 0.22, mixBlendMode: 'multiply'}} />
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(${flare}, rgba(255,226,160,${0.22 * flick}), transparent 70%)`, mixBlendMode: 'screen'}} />
      <div style={{position: 'absolute', inset: 0, background: '#0A0402', opacity: dim, willChange: lt ? 'opacity' : undefined}} />
    </Wrap>
  );
};
/** LITE: a fading rgba() tint repaints the whole kelir each frame; step its alpha by 0.05 (dim fades on its own layer). */
const quantTint = (tint: string) => tint.replace(/rgba\(([^,]+),([^,]+),([^,]+),\s*([\d.]+)\s*\)/, (_m, r, g, b, a) => `rgba(${r},${g},${b},${Math.round(Number(a) * 20) / 20})`);
const KelirLayer: React.FC<{children?: React.ReactNode}> = ({children}) => <div style={{position: 'absolute', inset: 0, willChange: 'transform'}}>{children}</div>;

/** Banana-trunk stage at the bottom where the rods stand. LITE: on its own static layer, so the scene above it can
 * repaint without re-blurring the stage shadow. `top` default 1700 portrait / 960 landscape; it runs to the frame bottom. */
export const Stage: React.FC<{top?: number}> = ({top: top0}) => {
  const fr = useFrame();
  const top = top0 ?? fr.pick(1700, 960);
  return (
  <div style={{position: 'absolute', left: 0, right: 0, top, height: fr.H - top, background: `linear-gradient(180deg, ${HIKAYAT.stage}, #120802)`, boxShadow: '0 -20px 40px rgba(0,0,0,.5)', willChange: lite() ? 'transform' : undefined}}>
    <div style={{position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 46px, rgba(0,0,0,.25) 46px 48px)'}} />
  </div>
  );
};

/** SVG defs every HIKAYAT svg needs once (soft second shadow). */
export const HikDefs: React.FC = () => (
  <defs><filter id="hik-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9" /></filter></defs>
);

// ---------- puppet & scenery library (from the HIKAYAT demo) ----------
export const WOMAN: Part[] = [
  {poly: [[-40, -470], [36, -476], [50, -458], [80, -452], [52, -432], [46, -404], [20, -394], [-6, -388], [-32, -400], [-44, -432]]},
  {poly: [[-44, -470], [-78, -500], [-96, -468], [-84, -436], [-46, -440]]},
  {poly: [[-36, -394], [28, -394], [44, -262], [-46, -256]], perforate: 14},
  {poly: [[-50, -262], [46, -264], [64, 0], [-64, 0]], perforate: 15},
  {poly: [[-34, -386], [-96, -300], [-112, -150], [-94, -146], [-80, -292], [-28, -360]]},
  {poly: [[14, -386], [70, -320], [96, -250], [80, -244], [56, -306], [8, -356]]},
];
export const CHILD: Part[] = KING.slice(1);
export const FISH: Pt[] = [[-200, -60], [-120, -118], [0, -140], [110, -110], [190, -40], [205, 0], [190, 40], [110, 110], [0, 140], [-120, 118], [-200, 60], [-300, 140], [-276, 0], [-300, -140]];
/** Rumah adat with an upswept saddle roof, on stilts. */
export const HOUSE: Part[] = [
  {poly: [[-300, -540], [-210, -440], [-140, -390], [0, -372], [140, -390], [210, -440], [300, -540], [250, -300], [-250, -300]], perforate: 15},
  {poly: [[-200, -300], [200, -300], [182, -150], [-182, -150]], perforate: 17},
  ...[-165, -60, 45, 140].map((x) => ({poly: [[x, -150], [x + 28, -150], [x + 28, 0], [x, 0]] as Pt[]})),
];
export const MOUNTAINS: Pt[] = [[-620, 0], [-470, -380], [-390, -300], [-230, -560], [-70, -320], [40, -430], [220, -190], [360, -480], [520, -260], [620, -340], [620, 0]];
export const VOLCANO: Pt[] = [[-560, 0], [-150, -660], [-80, -630], [0, -660], [80, -630], [150, -660], [560, 0]];
export const CALDERA: Pt[] = [[-560, 0], [-320, -390], [-230, -300], [0, -290], [230, -300], [320, -390], [560, 0]];
export const ISLAND: Part[] = [
  {poly: [[-280, 0], [-190, -120], [-60, -180], [70, -160], [190, -96], [280, 0]], perforate: 16},
  ...[-120, 0, 110].map((x, i) => ({poly: [[x - 40, -150 + i * 8], [x, -300 + i * 20], [x + 40, -150 + i * 8]] as Pt[]})),
];
export const circlePts = (r: number, n = 40): Pt[] => Array.from({length: n}, (_, i) => [Math.cos((i / n) * Math.PI * 2) * r, Math.sin((i / n) * Math.PI * 2) * r] as Pt);
export const SUN: Part[] = [{poly: circlePts(110), perforate: 15}];
/** Stretch a scenery polygon (landscape: widen MOUNTAINS / WATER / VOLCANO to span 1920 without making them taller). */
export const scalePts = (pts: Pt[], sx: number, sy = 1): Pt[] => pts.map(([x, y]) => [x * sx, y * sy] as Pt);
export const lerpPts = (A: Pt[], B: Pt[], k: number): Pt[] => A.map(([x, y], i) => [x + (B[i][0] - x) * k, y + (B[i][1] - y) * k]);
export const wave = (w: number, amp: number, period: number, depth: number): Pt[] => {
  const pts: Pt[] = [];
  for (let x = -w; x <= w; x += 20) pts.push([x, -amp * Math.sin((x / period) * Math.PI * 2)]);
  pts.push([w, depth], [-w, depth]);
  return pts;
};
export const WATER = wave(1300, 22, 170, 900);


/** Lontar label styles: ALWAYS one line (nowrap). For two lines, give the Lontar h >= 150. */
export const lontarTitle = (size = 56, color: string = HIKAYAT.ink): React.CSSProperties => ({...incised, fontFamily: HEAD, fontWeight: 800, fontSize: size, letterSpacing: 4, color, whiteSpace: 'nowrap', lineHeight: 1.1});
export const lontarText = (size = 38): React.CSSProperties => ({...incised, fontFamily: TEXT, fontWeight: 700, fontSize: size, whiteSpace: 'nowrap'});
