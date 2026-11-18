import React from 'react';
import {lerp, p, pb, rnd, useFrame} from '../shared';
import {Block, Confetti, HEAD, MB, rp, star, UI} from './kit';

// MABAR props: animals, game UI and story objects. Same rules as kit.tsx — flat fills, one shade tone, ink outline.
const K = MB.ink;

// ---------- pigeon ----------
export type PigeonMood = 'calm' | 'happy' | 'wild' | 'star' | 'cool' | 'shock';
/** Blocky pigeon facing right. Origin = feet; ~360 px tall at s=1. peck 0..1 dips the head to the right. */
export const Pigeon: React.FC<{
  t: number; x: number; y: number; s?: number; peck?: number; mood?: PigeonMood; flip?: boolean; sx?: number; sy?: number;
  shades?: number; hair?: string; shirt?: string; seed?: number;
}> = ({t, x, y, s = 1, peck = 0, mood = 'calm', flip, sx = 1, sy = 1, shades = 0, hair, shirt, seed = 1}) => {
  const sw = 7 / s;
  const bob = Math.sin(t * 3.4 + seed) * 4;
  const blink = (t + rnd(seed) * 3) % 3.1 < 0.1;
  const pk = Math.sin(Math.min(1, Math.max(0, peck)) * Math.PI);
  return (
    <g transform={`translate(${x} ${y}) scale(${s * sx * (flip ? -1 : 1)} ${s * sy})`}>
      <ellipse cx={0} cy={2} rx={130} ry={14} fill={K} opacity={0.18} />
      {[-36, 22].map((lx) => (
        <g key={lx}>
          <path d={rp(lx - 9, -60, 18, 60, 6)} fill="#E8556B" stroke={K} strokeWidth={sw * 0.8} />
          <path d={`M ${lx - 26} 0 L ${lx + 30} 0`} stroke="#E8556B" strokeWidth={sw * 2} strokeLinecap="round" />
          <path d={`M ${lx - 26} 0 L ${lx + 30} 0`} stroke={K} strokeWidth={sw * 0.6} strokeLinecap="round" opacity={0.6} />
        </g>
      ))}
      <g transform={`translate(0 ${bob * 0.5})`}>
        <path d="M -140 -150 L -236 -118 L -226 -76 L -132 -96 Z" fill="#7E87A0" stroke={K} strokeWidth={sw} strokeLinejoin="round" />
        <path d={rp(-160, -250, 290, 200, 96)} fill="#8790A8" />
        <path d={rp(-160, -250, 290, 150, [96, 96, 40, 40])} fill="#A3AABF" />
        {shirt && <path d={rp(-160, -190, 290, 110, [20, 20, 80, 80])} fill={shirt} />}
        <path d={rp(-160, -250, 290, 200, 96)} fill="none" stroke={K} strokeWidth={sw} />
        <path d={rp(-120, -210, 170, 104, 50)} fill="#7E87A0" stroke={K} strokeWidth={sw} />
        {[-176, -150].map((yy) => <path key={yy} d={`M -96 ${yy} Q -30 ${yy + 12} 30 ${yy}`} stroke="#4A5068" strokeWidth={sw * 1.4} fill="none" strokeLinecap="round" />)}
        {/* neck + head (pivot at the neck) */}
        <g transform={`translate(70 -230) rotate(${pk * 38}) translate(${pk * 20} ${pk * 6})`}>
          <path d={rp(-40, -40, 104, 70, 30)} fill="#4FB98A" stroke={K} strokeWidth={sw} />
          <path d={rp(-40, -6, 104, 30, [0, 0, 26, 26])} fill="#8A63F2" />
          <path d={rp(-40, -40, 104, 70, 30)} fill="none" stroke={K} strokeWidth={sw} />
          <path d={rp(-30, -170, 150, 140, 62)} fill="#B8BED0" stroke={K} strokeWidth={sw} />
          {hair && <path d="M -26 -118 L -30 -170 L 0 -150 L 22 -196 L 44 -152 L 78 -186 L 84 -146 L 118 -150 L 104 -114 Q 50 -132 -26 -118 Z" fill={hair} stroke={K} strokeWidth={sw} strokeLinejoin="round" />}
          <path d="M 116 -104 L 160 -92 L 116 -78 Z" fill="#E8D9C2" stroke={K} strokeWidth={sw} strokeLinejoin="round" />
          <path d={rp(104, -112, 18, 14, 6)} fill="#fff" stroke={K} strokeWidth={sw * 0.6} />
          {mood === 'star' ? (
            <path d={star(66, -104, 5, 30, 13)} fill={MB.gold} stroke={K} strokeWidth={sw} strokeLinejoin="round" />
          ) : blink && mood !== 'wild' && mood !== 'shock' ? (
            <path d="M 46 -104 Q 66 -96 86 -104" stroke={K} strokeWidth={sw * 1.2} fill="none" strokeLinecap="round" />
          ) : (
            <g>
              <circle cx={66} cy={-104} r={mood === 'wild' || mood === 'shock' ? 28 : 23} fill="#fff" stroke="#FF9F1C" strokeWidth={sw * 1.4} />
              <circle cx={66} cy={-104} r={mood === 'wild' || mood === 'shock' ? 30 : 25} fill="none" stroke={K} strokeWidth={sw * 0.7} />
              <circle cx={mood === 'wild' ? 66 + Math.sin(t * 9) * 6 : 72} cy={-104} r={mood === 'wild' || mood === 'shock' ? 7 : 11} fill={K} />
              {mood === 'happy' && <path d="M 44 -82 Q 66 -70 88 -82" stroke={K} strokeWidth={sw} fill="none" strokeLinecap="round" />}
            </g>
          )}
          {shades > 0.01 && (
            <g transform={`translate(0 ${(1 - shades) * -120})`} opacity={Math.min(1, shades * 2)}>
              <path d={rp(20, -126, 110, 40, 12)} fill={K} />
              <line x1={-26} y1={-112} x2={22} y2={-110} stroke={K} strokeWidth={sw} />
              <path d="M 36 -118 L 56 -118" stroke="#fff" strokeWidth={sw * 0.8} strokeLinecap="round" />
            </g>
          )}
        </g>
      </g>
    </g>
  );
};

// ---------- brain ----------
/** Cute block brain. glow 0..1 lights a gold spot (lit region). */
export const Brain: React.FC<{x: number; y: number; s?: number; glow?: number; t?: number; label?: string; labelCol?: string}> = ({x, y, s = 1, glow = 0, t = 0, label, labelCol = '#fff'}) => {
  const sw = 7 / s;
  const pulse = 1 + Math.sin(t * 5) * 0.02 * glow;
  return (
    <g transform={`translate(${x} ${y}) scale(${s * pulse})`}>
      {glow > 0.01 && [0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2 + t * 0.6;
        return <path key={i} d={`M ${Math.cos(a) * 150} ${Math.sin(a) * 120} L ${Math.cos(a) * (150 + 50 * glow)} ${Math.sin(a) * (120 + 40 * glow)}`} stroke={MB.gold} strokeWidth={sw * 2.2} strokeLinecap="round" />;
      })}
      {[[-70, -40, 62], [0, -62, 66], [70, -40, 62], [-80, 26, 58], [80, 26, 58], [0, 40, 66]].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="#F4A7C0" stroke={K} strokeWidth={sw} />
      ))}
      <path d={rp(-120, -70, 240, 140, 60)} fill="#F4A7C0" />
      <path d="M -4 -110 Q 10 -40 -4 30 Q -12 70 4 96" stroke={K} strokeWidth={sw} fill="none" strokeLinecap="round" />
      {[[-90, -40, -40, -10], [-70, 30, -20, 50], [40, -50, 90, -20], [30, 30, 90, 40]].map(([a, b, c, d], i) => (
        <path key={i} d={`M ${a} ${b} Q ${(a + c) / 2} ${b - 24} ${c} ${d}`} stroke="#D9799A" strokeWidth={sw * 1.2} fill="none" strokeLinecap="round" />
      ))}
      {glow > 0.01 && <g><circle cx={-46} cy={22} r={36 * glow} fill={MB.gold} stroke={K} strokeWidth={sw} /><circle cx={-58} cy={10} r={10 * glow} fill="#fff" /></g>}
      {label && (
        <text x={0} y={190} textAnchor="middle" fill={labelCol} stroke={K} strokeWidth={10 / s} paintOrder="stroke" strokeLinejoin="round" style={{fontFamily: UI, fontWeight: 900, fontSize: 44 / s}}>{label}</text>
      )}
    </g>
  );
};

// ---------- game UI ----------
/** Dark game panel with white rim, solid drop and an optional gold header ribbon. (x, y) = centre. */
export const Panel: React.FC<{x: number; y: number; w: number; h: number; title?: string; titleCol?: string; children?: React.ReactNode; fill?: string}> = ({x, y, w, h, title, titleCol = MB.gold, children, fill = MB.panel}) => (
  <g transform={`translate(${x} ${y})`}>
    <path d={rp(-w / 2, -h / 2, w, h, 40)} fill={K} transform="translate(0 16)" />
    <path d={rp(-w / 2, -h / 2, w, h, 40)} fill={fill} stroke="#fff" strokeWidth={8} />
    <path d={rp(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, 44)} fill="none" stroke={K} strokeWidth={6} />
    {children}
    {title && (
      <g transform={`translate(0 ${-h / 2})`}>
        <path d={rp(-Math.min(w * 0.42, 40 + title.length * 26), -48, Math.min(w * 0.84, 80 + title.length * 52), 96, 26)} fill={titleCol} stroke={K} strokeWidth={7} />
        <text x={0} y={22} textAnchor="middle" fill="#fff" stroke={K} strokeWidth={11} paintOrder="stroke" strokeLinejoin="round" style={{fontFamily: HEAD, fontWeight: 800, fontSize: 66}}>{title}</text>
      </g>
    )}
  </g>
);

/** Chunky game button. press 0..1 pushes it down; pulse 0..1 bounces it. */
export const Button: React.FC<{x: number; y: number; w: number; h?: number; label: string; col?: string; sh?: string; press?: number; pulse?: number; q?: number; size?: number; gem?: string}> = ({
  x, y, w, h = 120, label, col = MB.gold, sh = MB.goldSh, press = 0, pulse = 0, q = 1, size = 58, gem,
}) => {
  if (q <= 0.001) return null;
  const sc = q * (1 + Math.sin(pulse * Math.PI * 2) * 0.05);
  const d = 14 * (1 - press);
  return (
    <g transform={`translate(${x} ${y}) scale(${sc})`}>
      <path d={rp(-w / 2, -h / 2 + 14, w, h, 30)} fill={K} />
      <path d={rp(-w / 2, -h / 2 + 14 - d * 0.0, w, h, 30)} fill={sh} stroke={K} strokeWidth={7} />
      <g transform={`translate(0 ${14 - d})`}>
        <path d={rp(-w / 2, -h / 2 - 14, w, h, 30)} fill={col} stroke={K} strokeWidth={7} />
        <path d={rp(-w / 2 + 18, -h / 2 - 4, w * 0.5, 14, 7)} fill="#ffffff66" />
        <text x={gem ? -30 : 0} y={size * 0.34 - 14} textAnchor="middle" fill="#fff" stroke={K} strokeWidth={size * 0.2} paintOrder="stroke" strokeLinejoin="round" style={{fontFamily: HEAD, fontWeight: 800, fontSize: size}}>{label}</text>
        {gem && (
          <g transform={`translate(${w / 2 - 110} -14)`}>
            <Gem x={0} y={0} s={0.7} />
            <text x={30} y={14} fill="#fff" stroke={K} strokeWidth={8} paintOrder="stroke" style={{fontFamily: UI, fontWeight: 900, fontSize: 40}}>{gem}</text>
          </g>
        )}
      </g>
    </g>
  );
};

export const Gem: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M -26 -12 L -12 -28 L 12 -28 L 26 -12 L 0 26 Z" fill="#5BC8FF" stroke={K} strokeWidth={6} strokeLinejoin="round" />
    <path d="M -26 -12 L 26 -12 M -12 -28 L -6 -12 L 0 26 M 12 -28 L 6 -12" stroke={K} strokeWidth={3} fill="none" opacity={0.6} />
    <path d="M -14 -22 L -8 -14" stroke="#fff" strokeWidth={5} strokeLinecap="round" />
  </g>
);

export const Stars: React.FC<{x: number; y: number; n: number; of?: number; s?: number; col?: string}> = ({x, y, n, of = 5, s = 1, col = MB.gold}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {Array.from({length: of}, (_, i) => (
      <path key={i} d={star((i - (of - 1) / 2) * 50, 0, 5, 24, 11)} fill={i < n ? col : '#4A4270'} stroke={K} strokeWidth={5} strokeLinejoin="round" />
    ))}
  </g>
);

export type ItemKind = 'sword' | 'sandal' | 'stone' | 'sock' | 'capsule' | 'gem' | 'star';
/** Item icon centred at (x, y), ~200 px. */
export const Item: React.FC<{kind: ItemKind; x: number; y: number; s?: number; rot?: number; open?: number}> = ({kind, x, y, s = 1, rot = 0, open = 0}) => {
  const sw = 7 / s;
  let g: React.ReactNode = null;
  if (kind === 'sword') g = (
    <g transform="rotate(-35)">
      <path d="M -16 -120 L 0 -150 L 16 -120 L 16 40 L -16 40 Z" fill="#E6ECF5" stroke={K} strokeWidth={sw} strokeLinejoin="round" />
      <line x1={0} y1={-130} x2={0} y2={30} stroke="#B9C3D6" strokeWidth={sw} />
      <path d={rp(-62, 40, 124, 28, 12)} fill={MB.gold} stroke={K} strokeWidth={sw} />
      <path d={rp(-14, 68, 28, 66, 8)} fill="#8A5A3B" stroke={K} strokeWidth={sw} />
      <circle cx={0} cy={146} r={18} fill={MB.gold} stroke={K} strokeWidth={sw} />
      <circle cx={0} cy={54} r={11} fill={MB.red} stroke={K} strokeWidth={sw * 0.7} />
    </g>
  );
  if (kind === 'sandal') g = (
    <g transform="rotate(-12)">
      <path d={rp(-58, -110, 116, 220, 58)} fill="#FF8A3D" stroke={K} strokeWidth={sw} />
      <path d={rp(-46, -98, 92, 196, 46)} fill="#FFB27A" />
      <path d="M -50 -10 Q 0 -60 50 -10" stroke="#2F6BFF" strokeWidth={sw * 2.4} fill="none" strokeLinecap="round" />
      <path d="M 0 -60 L 0 -30" stroke="#2F6BFF" strokeWidth={sw * 2} strokeLinecap="round" />
    </g>
  );
  if (kind === 'stone') g = (
    <g>
      <path d="M -96 40 Q -110 -20 -60 -60 Q -10 -96 50 -70 Q 110 -40 96 30 Q 80 76 0 76 Q -80 76 -96 40 Z" fill="#9C95B5" stroke={K} strokeWidth={sw} />
      <path d="M 40 -50 Q 80 -30 80 10" stroke="#C9C4DB" strokeWidth={sw * 1.6} fill="none" strokeLinecap="round" />
      <circle cx={-30} cy={20} r={10} fill="#7D7696" />
    </g>
  );
  if (kind === 'sock') g = (
    <g transform="rotate(10)">
      <path d="M -40 -110 L 40 -110 L 40 30 Q 40 100 -20 100 L -90 100 Q -120 100 -120 70 Q -120 40 -80 36 L -40 30 Z" fill="#fff" stroke={K} strokeWidth={sw} strokeLinejoin="round" />
      {[-90, -60].map((yy) => <rect key={yy} x={-40} y={yy} width={80} height={16} fill={MB.red} />)}
      <path d="M -40 -110 L 40 -110 L 40 30 Q 40 100 -20 100 L -90 100 Q -120 100 -120 70 Q -120 40 -80 36 L -40 30 Z" fill="none" stroke={K} strokeWidth={sw} strokeLinejoin="round" />
    </g>
  );
  if (kind === 'gem') g = <Gem x={0} y={0} s={3.2} />;
  if (kind === 'star') g = <path d={star(0, 0, 5, 110, 48)} fill={MB.gold} stroke={K} strokeWidth={sw} strokeLinejoin="round" />;
  if (kind === 'capsule') g = (
    <g>
      <g transform={`translate(0 ${-open * 60}) rotate(${-open * 25})`}>
        <path d="M -100 0 A 100 100 0 0 1 100 0 Z" fill={MB.gold} stroke={K} strokeWidth={sw} />
        <path d="M -70 -50 Q -40 -80 0 -84" stroke="#fff" strokeWidth={sw * 1.6} fill="none" strokeLinecap="round" />
      </g>
      <path d="M -100 0 A 100 100 0 0 0 100 0 Z" fill="#fff" stroke={K} strokeWidth={sw} />
      <path d={rp(-104, -10, 208, 20, 8)} fill={K} />
      {open < 0.1 && <text x={0} y={-14} textAnchor="middle" fill="#fff" stroke={K} strokeWidth={10} paintOrder="stroke" style={{fontFamily: HEAD, fontWeight: 800, fontSize: 96}}>?</text>}
    </g>
  );
  return <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>{g}</g>;
};

/** Gacha result card: rarity frame + item + stars + name. */
export const ItemCard: React.FC<{x: number; y: number; s?: number; kind: ItemKind; stars: number; name: string; rot?: number; q?: number; t?: number}> = ({x, y, s = 1, kind, stars, name, rot = 0, q = 1, t = 0}) => {
  if (q <= 0.001) return null;
  const legend = stars >= 5;
  const fill = legend ? MB.gold : '#4A4270';
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s * q})`}>
      <path d={rp(-170, -230, 340, 460, 34)} fill={K} transform="translate(0 14)" />
      <path d={rp(-170, -230, 340, 460, 34)} fill={fill} stroke="#fff" strokeWidth={10} />
      <path d={rp(-176, -236, 352, 472, 38)} fill="none" stroke={K} strokeWidth={6} />
      {legend && <g opacity={0.35}>{Array.from({length: 10}, (_, i) => { const a0 = t * 0.6 + (i / 10) * Math.PI * 2, a1 = a0 + Math.PI / 10; return <path key={i} d={`M 0 -40 L ${Math.cos(a0) * 300} ${-40 + Math.sin(a0) * 300} L ${Math.cos(a1) * 300} ${-40 + Math.sin(a1) * 300} Z`} fill="#fff" />; })}</g>}
      <Item kind={kind} x={0} y={-50} s={0.95} />
      <Stars x={0} y={128} n={stars} s={0.9} />
      <text x={0} y={200} textAnchor="middle" fill="#fff" stroke={K} strokeWidth={10} paintOrder="stroke" strokeLinejoin="round" style={{fontFamily: UI, fontWeight: 900, fontSize: 40}}>{name}</text>
    </g>
  );
};

/** Speech bubble with a tail pointing down-left. */
export const Bubble: React.FC<{x: number; y: number; text: string; q?: number; rot?: number; w?: number; size?: number}> = ({x, y, text, q = 1, rot = 0, w, size = 36}) => {
  if (q <= 0.001) return null;
  const ww = w ?? 60 + text.length * size * 0.52;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${q})`}>
      <path d={`M ${-ww / 2 + 40} 36 L ${-ww / 2 + 20} 76 L ${-ww / 2 + 80} 36 Z`} fill="#fff" stroke={K} strokeWidth={6} strokeLinejoin="round" />
      <path d={rp(-ww / 2, -44, ww, 88, 44)} fill="#fff" stroke={K} strokeWidth={6} />
      <path d={`M ${-ww / 2 + 44} 32 L ${-ww / 2 + 80} 32`} stroke="#fff" strokeWidth={10} />
      <text x={0} y={size * 0.36} textAnchor="middle" fill={K} style={{fontFamily: UI, fontWeight: 900, fontSize: size}}>{text}</text>
    </g>
  );
};

/** Tilted white "level" card that slams in (big text + small sub line) with confetti. Flies in from the top-right
 *  corner and out to the left of the frame; default spot = upper centre (540, 620 portrait · 960, 400 landscape). */
export const SlamCard: React.FC<{t: number; at: number; out: number; x?: number; y?: number; text: string; sub?: string; col?: string; size?: number}> = ({
  t, at, out, x: xp, y: yp, text, sub, col = MB.green, size = 170,
}) => {
  const fr = useFrame();
  const x = xp ?? fr.cx, y = yp ?? fr.pick(620, 400);
  if (t < at - 0.12 || t > out + 0.3) return null;
  const q = pb(t, at - 0.1, at + 0.22);
  const o = p(t, out, out + 0.28, (k) => k * k);
  const px = lerp(fr.W + 70, x, q) - o * (fr.W + 220), py = lerp(-260, y, q) + o * 120;
  const rot = lerp(22, -6, q) - o * 12;
  return (
    <g>
      <Confetti t={t} at={at + 0.1} x={x} y={y - 140} n={22} seed={Math.round(at * 7)} />
      <g transform={`translate(${px} ${py}) rotate(${rot})`}>
        <path d={rp(-420, -150, 840, 300, 46)} fill={K} transform="translate(0 16)" />
        <path d={rp(-420, -150, 840, 300, 46)} fill="#fff" stroke={K} strokeWidth={8} />
        <path d={rp(-400, -130, 800, 260, 34)} fill="none" stroke={col} strokeWidth={18} />
        {sub && <text x={0} y={-66} textAnchor="middle" fill={MB.greySh} style={{fontFamily: UI, fontWeight: 900, fontSize: 38, letterSpacing: 6}}>{sub}</text>}
        <text x={0} y={sub ? 84 : 58} textAnchor="middle" fill={col} stroke={K} strokeWidth={size * 0.12} paintOrder="stroke" strokeLinejoin="round" style={{fontFamily: HEAD, fontWeight: 800, fontSize: size}}>{text}</text>
      </g>
    </g>
  );
};

// ---------- lab set + Skinner box ----------
/** Lab wall + window + bottle shelf + checker floor at `floor`. World coordinates; spans 600 px past the frame width. */
export const LabBg: React.FC<{t: number; floor?: number}> = ({t, floor = 1380}) => {
  const {W, wide} = useFrame();
  const X1 = W + 620; // right edge of the set (1700 portrait)
  return (
  <g>
    <rect x={-600} y={-600} width={X1 + 600} height={floor + 600} fill="#BFEBD9" />
    {Array.from({length: wide ? Math.ceil((X1 + 120) / 170) : 9}, (_, i) => <rect key={i} x={-120 + i * 170} y={-600} width={80} height={floor + 600} fill="#B2E3CF" />)}
    <path d={rp(80, 230, 300, 240, 20)} fill="#86D5F7" stroke={K} strokeWidth={7} />
    <path d="M 230 230 V 470 M 80 350 H 380" stroke={K} strokeWidth={7} />
    <path d={rp(120, 260, 60, 40, 10)} fill="#fff" opacity={0.8} transform={`translate(${(t * 6) % 140} 0)`} />
    <path d={rp(700, 300, 300, 30, 8)} fill="#8A5A3B" stroke={K} strokeWidth={6} />
    {[[740, 230, MB.pink], [800, 216, MB.blue], [870, 240, MB.gold], [940, 226, MB.green]].map(([x, y, c], i) => (
      <path key={i} d={rp(x as number, y as number, 44, 300 - (y as number), [10, 10, 4, 4])} fill={c as string} stroke={K} strokeWidth={6} />
    ))}
    <rect x={-600} y={floor - 40} width={X1 + 600} height={50} fill="#9AD3BC" stroke={K} strokeWidth={6} />
    {Array.from({length: wide ? Math.ceil((X1 + 600) / 120) : 16}, (_, i) => Array.from({length: 6}, (_, j) => (
      <rect key={`${i}-${j}`} x={(wide ? -600 : -400) + i * 120} y={floor + 10 + j * 120} width={120} height={120} fill={(i + j) % 2 ? '#F2E5C6' : '#E2CFA2'} />
    )))}
    <line x1={-600} y1={floor + 10} x2={X1} y2={floor + 10} stroke={K} strokeWidth={6} />
  </g>
  );
};

/** The operant box. (x, y) = bottom centre. cover 0..1 = front "?" panel still on (1) / lifted (0).
 *  light 0..1 lights the button lamp; seeds = pellets in the tray; badge = mode sign on top. */
export const SkinnerBox: React.FC<{
  t: number; x: number; y: number; w?: number; h?: number; cover?: number; press?: number; seeds?: number; badge?: string; badgeCol?: string; badgeQ?: number;
  chuteQ?: number; mystery?: boolean; children?: React.ReactNode; button?: React.ReactNode;
}> = ({t, x, y, w = 560, h = 520, cover = 0, press = 0, seeds = 0, badge, badgeCol = MB.green, badgeQ = 1, chuteQ = 0, mystery, children, button}) => {
  const L = -w / 2, T = -h;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={rp(L - 20, T - 20, w + 40, h + 40, 30)} fill="#3B3360" stroke={K} strokeWidth={8} />
      <path d={rp(L, T, w, h, 14)} fill="#F4F1FA" />
      {Array.from({length: 5}, (_, i) => <line key={i} x1={L} y1={T + 90 + i * 90} x2={L + w} y2={T + 90 + i * 90} stroke="#E4DFF0" strokeWidth={5} />)}
      {/* lever/button panel on the right wall */}
      {button ?? (
        <g transform={`translate(${L + w - 65} -200)`}>
          <path d={rp(-44, -70, 88, 140, 16)} fill="#C9C4DB" stroke={K} strokeWidth={6} />
          <circle cx={0} cy={-34} r={16} fill={press > 0.2 ? MB.gold : '#8A82A8'} stroke={K} strokeWidth={5} />
          <circle cx={0} cy={22} r={30} fill={MB.red} stroke={K} strokeWidth={6} transform={`translate(${-press * 6} 0)`} />
        </g>
      )}
      {/* mystery sign above the button, tray under the hatch */}
      {mystery && chuteQ > 0.01 && (
        <g transform={`translate(${L + w - 65} -330) scale(${chuteQ})`}>
          <circle cx={0} cy={0} r={34} fill={MB.red} stroke={K} strokeWidth={6} />
          <text x={0} y={18} textAnchor="middle" fill="#fff" style={{fontFamily: HEAD, fontWeight: 800, fontSize: 54}}>?</text>
        </g>
      )}
      <g transform={`translate(${L + w - 65} -30)`}>
        <path d={rp(-60, -20, 120, 44, [6, 6, 18, 18])} fill="#8A82A8" stroke={K} strokeWidth={6} />
        {Array.from({length: Math.min(8, Math.floor(seeds))}, (_, i) => (
          <ellipse key={i} cx={-36 + (i % 4) * 24} cy={-20 - Math.floor(i / 4) * 13} rx={12} ry={8} fill={MB.gold} stroke={K} strokeWidth={4} />
        ))}
      </g>
      <g>{children}</g>
      {/* glass front */}
      <path d={`M ${L + 40} ${T + 30} L ${L + 120} ${T + 30} L ${L + 30} ${T + 200} Z`} fill="#fff" opacity={0.5} />
      <path d={`M ${L + 150} ${T + 30} L ${L + 180} ${T + 30} L ${L + 90} ${T + 200} L ${L + 60} ${T + 200} Z`} fill="#fff" opacity={0.35} />
      <path d={rp(L, T, w, h, 14)} fill="none" stroke={K} strokeWidth={8} />
      {cover > 0.001 && (
        <g transform={`translate(0 ${-(1 - cover) * (h + 200)})`}>
          <path d={rp(L - 24, T - 24, w + 48, h + 48, 30)} fill="#C88A55" stroke={K} strokeWidth={8} />
          <path d={`M ${L - 24} ${T - 24} L ${L + w + 24} ${T + h + 24} M ${L + w + 24} ${T - 24} L ${L - 24} ${T + h + 24}`} stroke="#A86E3E" strokeWidth={22} />
          <path d={rp(L - 24, T - 24, w + 48, h + 48, 30)} fill="none" stroke={K} strokeWidth={8} />
          <circle cx={0} cy={T + h / 2} r={110} fill={MB.gold} stroke={K} strokeWidth={8} />
          <text x={0} y={T + h / 2 + 58} textAnchor="middle" fill="#fff" stroke={K} strokeWidth={14} paintOrder="stroke" style={{fontFamily: HEAD, fontWeight: 800, fontSize: 170}}>?</text>
        </g>
      )}
      {badge && badgeQ > 0.01 && (
        <g transform={`translate(0 ${T - 60}) scale(${badgeQ})`}>
          <path d={rp(-210, -46, 420, 92, 46)} fill={badgeCol} stroke={K} strokeWidth={7} />
          <text x={0} y={18} textAnchor="middle" fill="#fff" stroke={K} strokeWidth={9} paintOrder="stroke" style={{fontFamily: HEAD, fontWeight: 800, fontSize: 52}}>{badge}</text>
        </g>
      )}
    </g>
  );
};

// ---------- loot box, flag, gavel, clipboard, meter ----------
export const Chest: React.FC<{x: number; y: number; s?: number; open?: number; locked?: number; t?: number}> = ({x, y, s = 1, open = 0, locked = 0, t = 0}) => {
  const sw = 7 / s;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={8} rx={210} ry={20} fill={K} opacity={0.18} />
      <Block x={-190} y={-200} w={380} h={200} r={20} fill="#C88A55" shade="#A86E3E" sw={sw} />
      {[-120, 120].map((bx) => <rect key={bx} x={bx - 18} y={-200} width={36} height={200} fill={MB.gold} stroke={K} strokeWidth={sw * 0.8} />)}
      <g transform={`translate(0 -200) rotate(${-open * 30} -190 0)`}>
        <path d="M -200 0 L -200 -90 Q 0 -170 200 -90 L 200 0 Z" fill="#B97A47" stroke={K} strokeWidth={sw} strokeLinejoin="round" />
        {[-120, 120].map((bx) => <path key={bx} d={`M ${bx - 18} 0 L ${bx - 18} ${-110 - (bx < 0 ? 0 : 0)} L ${bx + 18} ${-118} L ${bx + 18} 0 Z`} fill={MB.gold} stroke={K} strokeWidth={sw * 0.8} />)}
      </g>
      <path d={rp(-44, -236, 88, 90, 16)} fill={MB.gold} stroke={K} strokeWidth={sw} />
      <path d={rp(-26, -212, 52, 12, 6)} fill={K} />
      <text x={0} y={-160} textAnchor="middle" fill={K} style={{fontFamily: HEAD, fontWeight: 800, fontSize: 52}}>$</text>
      {locked > 0.01 && (
        <g opacity={Math.min(1, locked * 2)}>
          {[-1, 1].map((d) => (
            <g key={d} transform={`rotate(${d * 22})`}>
              {Array.from({length: 9}, (_, i) => <path key={i} d={rp(-210 + i * 50, -140 - 12, 44, 26, 13)} fill="none" stroke="#7D7696" strokeWidth={sw * 1.4} transform={`translate(0 ${(1 - locked) * -40})`} />)}
            </g>
          ))}
          <g transform={`translate(0 ${-100 + (1 - Math.min(1, locked)) * -60})`}>
            <path d="M -30 -40 Q -30 -86 0 -86 Q 30 -86 30 -40" fill="none" stroke="#7D7696" strokeWidth={sw * 2.4} />
            <path d={rp(-50, -44, 100, 84, 14)} fill="#9C95B5" stroke={K} strokeWidth={sw} />
            <circle cx={0} cy={-10} r={10} fill={K} />
          </g>
        </g>
      )}
    </g>
  );
};

/** Belgian national flag on a pole (black / yellow / red vertical bands). (x, y) = pole foot. */
export const FlagBE: React.FC<{t: number; x: number; y: number; s?: number}> = ({t, x, y, s = 1}) => {
  const wave = (k: number) => Math.sin(t * 4 + k * 3) * 10 * k;
  const band = (i: number, c: string) => {
    const x0 = 20 + i * 90, x1 = x0 + 90;
    return <path key={i} d={`M ${x0} ${-560 + wave(i / 3)} L ${x1} ${-560 + wave((i + 1) / 3)} L ${x1} ${-380 + wave((i + 1) / 3)} L ${x0} ${-380 + wave(i / 3)} Z`} fill={c} />;
  };
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-10} y={-600} width={20} height={600} rx={8} fill="#8A82A8" stroke={K} strokeWidth={6} />
      <circle cx={0} cy={-606} r={16} fill={MB.gold} stroke={K} strokeWidth={6} />
      {band(0, '#1E1A1A')}{band(1, '#FDDA24')}{band(2, '#EF3340')}
      <path d={`M 20 ${-560} L 290 ${-560 + wave(1)} L 290 ${-380 + wave(1)} L 20 ${-380}`} fill="none" stroke={K} strokeWidth={6} strokeLinejoin="round" />
      <line x1={20} y1={-560} x2={20} y2={-380} stroke={K} strokeWidth={6} />
    </g>
  );
};

export const Gavel = () => (
  <g transform="rotate(90)">
    <rect x={-10} y={-20} width={20} height={150} rx={8} fill="#8A5A3B" stroke={K} strokeWidth={7} />
    <path d={rp(-60, 120, 120, 56, 14)} fill="#A86E3E" stroke={K} strokeWidth={7} />
    <rect x={-66} y={128} width={12} height={40} rx={4} fill={MB.gold} stroke={K} strokeWidth={4} />
    <rect x={54} y={128} width={12} height={40} rx={4} fill={MB.gold} stroke={K} strokeWidth={4} />
  </g>
);

export const Clipboard = () => (
  <g transform="translate(-60 -40)">
    <path d={rp(0, 0, 120, 160, 12)} fill="#C88A55" stroke={K} strokeWidth={7} />
    <path d={rp(14, 18, 92, 128, 6)} fill="#fff" stroke={K} strokeWidth={5} />
    <path d={rp(36, -10, 48, 22, 6)} fill="#9C95B5" stroke={K} strokeWidth={5} />
    {[50, 74, 98, 122].map((y) => <line key={y} x1={28} y1={y} x2={92} y2={y} stroke="#9C95B5" strokeWidth={5} />)}
  </g>
);

/** Horizontal stat meter (label left, fill v 0..1+, MAX tag when v ≥ 1). */
export const Meter: React.FC<{x: number; y: number; w: number; label: string; v: number; col?: string; t?: number}> = ({x, y, w, label, v, col = MB.pink, t = 0}) => {
  const f = Math.max(0, Math.min(1, v));
  return (
    <g transform={`translate(${x} ${y})`}>
      <text x={-w / 2} y={-34} fill="#fff" stroke={K} strokeWidth={10} paintOrder="stroke" style={{fontFamily: UI, fontWeight: 900, fontSize: 42, letterSpacing: 3}}>{label}</text>
      <path d={rp(-w / 2, -14, w, 70, 35)} fill={MB.panel} stroke="#fff" strokeWidth={6} />
      {f > 0.01 && <path d={rp(-w / 2 + 10, -4, Math.max(50, (w - 20) * f), 50, 25)} fill={col} />}
      {Array.from({length: 9}, (_, i) => <line key={i} x1={-w / 2 + ((i + 1) * w) / 10} y1={-4} x2={-w / 2 + ((i + 1) * w) / 10} y2={46} stroke={MB.panel} strokeWidth={5} />)}
      <path d={rp(-w / 2 - 6, -20, w + 12, 82, 41)} fill="none" stroke={K} strokeWidth={5} />
      {v >= 1 && (
        <g transform={`translate(${w / 2 - 20} 20) rotate(${8 + Math.sin(t * 6) * 3})`}>
          <path d={rp(-70, -36, 140, 72, 20)} fill={MB.red} stroke={K} strokeWidth={6} />
          <text x={0} y={16} textAnchor="middle" fill="#fff" style={{fontFamily: HEAD, fontWeight: 800, fontSize: 48}}>MAX!</text>
        </g>
      )}
    </g>
  );
};

/** Red rubber stamp word. */
export const Stamp: React.FC<{x: number; y: number; text: string; q: number; rot?: number; size?: number}> = ({x, y, text, q, rot = -12, size = 120}) => {
  if (q <= 0.001) return null;
  const sc = lerp(2.2, 1, Math.min(1, q));
  const w = text.length * size * 0.62 + 80;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${sc})`} opacity={Math.min(1, q * 1.5)}>
      <path d={rp(-w / 2, -size * 0.75, w, size * 1.4, 22)} fill="#ffffffdd" stroke={MB.red} strokeWidth={14} />
      <text x={0} y={size * 0.36} textAnchor="middle" fill={MB.red} style={{fontFamily: HEAD, fontWeight: 800, fontSize: size, letterSpacing: 6}}>{text}</text>
    </g>
  );
};
