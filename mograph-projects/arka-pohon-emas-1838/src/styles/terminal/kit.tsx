import React from 'react';
import {AbsoluteFill} from 'remotion';
import {CaptionPage} from '../../components/WordCaptions';
import {display, noise, p, pageAt, renderQuality, rnd, useFrame} from '../shared';

// TERMINAL style kit — green-phosphor CRT (typed logs, windows, block bars, glitch alerts, dithered pixel art).
export const TERMINAL = {bg: '#040806', g: '#3DFF8C', dim: '#1F8A52', faint: '#0E3A24', amber: '#FFB547', alert: '#FF3D7F', white: '#D8FFE8'};
export const T = TERMINAL;
export const HEAD = "'Term Head', monospace";
export const MONO = "'Term Mono', monospace";
export const glow = (c = T.g) => `0 0 10px ${c}99, 0 0 2px ${c}`;
export const GRAIN = noise(1.1, 2, 9, 300);

// ---------- render quality (v1.9) ----------
// On a CPU-only renderer the CRT grain was the cost: it slides every frame across the whole screen, so Chrome
// re-rasterised EVERYTHING (hex rain text, windows, text glows, scanlines, vignette) every frame. LITE holds the grain
// still and puts the CRT finish, the hex rain and the phone on their own compositor layers, so a frame only repaints
// what changed; hex digits use fill-opacity (opacity gave each of the 616 digit groups its own offscreen layer).
const lite = () => renderQuality() === 'lite';


export const Typed: React.FC<{text: string; t: number; start: number; cps?: number; color?: string; cursor?: boolean}> = ({text, t, start, cps = 38, color = T.g, cursor = true}) => {
  const n = Math.max(0, Math.min(text.length, Math.floor((t - start) * cps)));
  const typing = t >= start && (n < text.length || Math.floor(t * 2.4) % 2 === 0);
  return (
    <span style={{color, textShadow: glow(color)}}>
      {text.slice(0, n)}
      {cursor && t >= start && <span style={{opacity: typing ? 1 : 0, background: color, color: T.bg, boxShadow: `0 0 10px ${color}`}}>&nbsp;</span>}
    </span>
  );
};

export const Win: React.FC<{x: number; y: number; w: number; h: number; title: string; q: number; color?: string; children?: React.ReactNode; shake?: number}> = ({x, y, w, h, title, q, color = T.g, children, shake = 0}) => {
  const {wide} = useFrame();
  if (q <= 0) return null;
  return (
    <div style={{position: 'absolute', left: x + shake, top: y, width: w, height: h * q, overflow: 'hidden', border: `2px solid ${color}`, background: `${T.bg}ee`,
      boxShadow: `0 0 24px ${color}44, inset 0 0 40px ${color}14`}}>
      <div style={{height: 46, borderBottom: `2px solid ${color}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, fontFamily: MONO, fontWeight: 700, fontSize: 22, color, textShadow: glow(color)}}>
        <span>┌─</span><span>{title}</span><span style={{flex: 1, overflow: 'hidden', whiteSpace: 'nowrap'}}>{'─'.repeat(wide ? 140 : 60)}</span><span>[x]</span>
      </div>
      <div style={{padding: '18px 22px', fontFamily: MONO, fontWeight: 600, fontSize: 30, lineHeight: 1.45}}>{children}</div>
    </div>
  );
};

/** Ordered-dither pixel bust (Bayer 4×4), drawn as green cells. */
export const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const PixelBust: React.FC<{q: number; laurel: number}> = ({q, laurel}) => {
  const cells = React.useMemo(() => {
    const out: Array<[number, number, string]> = [];
    const W = 36, Hh = 44;
    for (let j = 0; j < Hh; j++) for (let i = 0; i < W; i++) {
      const x = i - 18, y = j;
      const head = ((x - 1) ** 2) / 90 + ((y - 13) ** 2) / 120 < 1;
      const nose = x > 8 && x < 13 && y > 11 && y < 16 && x - 8 < (16 - y) * 1.2;
      const neck = x > -5 && x < 5 && y >= 22 && y < 30;
      const body = y >= 29 && Math.abs(x) < 6 + (y - 29) * 1.1;
      const wreath = y > 2 && y < 9 && ((x - 1) ** 2) / 120 + ((y - 13) ** 2) / 150 < 1.15 && ((x - 1) ** 2) / 90 + ((y - 13) ** 2) / 120 > 0.7;
      if (!(head || nose || neck || body || wreath)) continue;
      const light = wreath ? 0.95 : 0.25 + 0.6 * Math.max(0, Math.min(1, (x + 18) / 30)) - (body ? 0.15 : 0);
      if (light * 16 > BAYER[(j % 4) * 4 + (i % 4)]) out.push([i, j, wreath ? 'w' : 'g']);
    }
    return out;
  }, []);
  return (
    <svg width={360} height={440} viewBox="0 0 360 440">
      {cells.map(([i, j, k], n) => (
        <rect key={n} x={i * 10} y={j * 10} width={9} height={9} fill={k === 'w' ? T.amber : T.g} opacity={(k === 'w' ? laurel : 1) * (rnd(n) < q ? 1 : 0)} />
      ))}
    </svg>
  );
};

export const Bar: React.FC<{n: number; total: number; shown: number; missing?: boolean}> = ({n, total, shown, missing}) => (
  <span style={{letterSpacing: -2}}>
    {Array.from({length: total}).map((_, i) => {
      const filled = i < n;
      const vis = i < shown;
      return <span key={i} style={{color: filled ? T.g : T.alert, textShadow: glow(filled ? T.g : T.alert), opacity: vis ? 1 : 0.12}}>{filled ? '█' : missing ? '░' : ' '}</span>;
    })}
  </span>
);

/** Prompt-line caption, the spoken word inverted. Portrait: full-width bar at `top` 1500. Landscape (no `top`): a
 * centred bar max 1400 wide whose bottom edge sits 130 px above the frame bottom (≈ y 856–950), 42 px. */
export const Caption: React.FC<{t: number; pages: CaptionPage[]; top?: number}> = ({t, pages, top}) => {
  const fr = useFrame();
  const pg = pageAt(t, pages);
  if (!pg) return null;
  const side = fr.pick(72, Math.max(fr.safe.side, (fr.W - fr.captionW) / 2));
  const pos = top !== undefined || !fr.wide ? {top: top ?? 1500} : {bottom: fr.safe.bottom + 10};
  return (
    <div style={{position: 'absolute', left: side, right: side, ...pos, border: `2px solid ${T.dim}`, background: `${T.bg}f2`, padding: '16px 22px', fontFamily: MONO, fontWeight: 700, fontSize: fr.pick(46, 42), lineHeight: 1.3}}>
      <span style={{color: T.dim}}>&gt; </span>
      {pg.words.map((w, i) => {
        const on = t >= w.start - 0.04 && t < w.end + 0.1;
        const said = t >= w.start - 0.04;
        return (
          <React.Fragment key={i}>
            <span style={{background: on ? T.g : 'transparent', color: on ? T.bg : said ? T.g : T.faint, textShadow: on ? 'none' : glow(), padding: '0 4px'}}>{display(w.word)}</span>
            {i < pg.words.length - 1 ? ' ' : ''}
          </React.Fragment>
        );
      })}
      <span style={{opacity: Math.floor(t * 2.4) % 2 === 0 ? 1 : 0, background: T.g, marginLeft: 6}}>&nbsp;</span>
    </div>
  );
};


/** Scrolling hex columns behind everything (dim). */
export const HexRain: React.FC<{t: number; opacity?: number}> = ({t, opacity = 0.22}) => {
  // LITE: own layer (repaints only on its 8 Hz ticks) and fill-opacity per digit group instead of opacity (no layer each)
  const lt = lite();
  // fills the frame: 14 columns × 44 rows on 1080×1920, 25 × 25 on 1920×1080 (same 76 / 44 px pitch)
  const {W, H} = useFrame();
  const cols = Math.round((W - 30) / 76), rows = Math.ceil(H / 44);
  return (
  <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, opacity, willChange: lt ? 'transform' : undefined}}>
    {Array.from({length: cols}).map((_, c) => (
      <text key={c} x={30 + c * 76} y={0} fill={TERMINAL.dim} style={{fontFamily: MONO, fontSize: 22}}>
        {Array.from({length: rows}).map((__, r) => (
          <tspan key={r} x={30 + c * 76} dy={44} {...{[lt ? 'fillOpacity' : 'opacity']: 0.3 + 0.7 * rnd(c * 100 + r + Math.floor(t * 8 + c))}}>{Math.floor(rnd(c * 31 + r * 7 + Math.floor(t * 6 + c * 3)) * 65535).toString(16).padStart(4, '0').toUpperCase()}</tspan>
        ))}
      </text>
    ))}
  </svg>
  );
};

/** CRT finish: scanlines, moving grain, vignette. Render last. LITE: still grain, all three on one static layer. */
export const CRT: React.FC<{frame: number}> = ({frame}) => (lite() ? (
  <AbsoluteFill style={{willChange: 'transform', pointerEvents: 'none'}}>
    <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,.32) 0 2px, transparent 2px 5px)'}} />
    <AbsoluteFill style={{backgroundImage: GRAIN, backgroundSize: '300px', opacity: 0.07}} />
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 110% 85% at 50% 48%, transparent 58%, rgba(0,0,0,.75))'}} />
  </AbsoluteFill>
) : (
  <>
    <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,.32) 0 2px, transparent 2px 5px)', pointerEvents: 'none'}} />
    <AbsoluteFill style={{backgroundImage: GRAIN, backgroundSize: '300px', backgroundPosition: `${(frame * 37) % 300}px ${(frame * 53) % 300}px`, opacity: 0.07, mixBlendMode: 'screen'}} />
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 110% 85% at 50% 48%, transparent 58%, rgba(0,0,0,.75))', pointerEvents: 'none'}} />
  </>
));

/** Horizontal glitch slices for a few frames (pass active=false outside the glitch window). Spread over the frame height. */
export const Glitch: React.FC<{frame: number; active: boolean}> = ({frame, active}) => {
  const {H} = useFrame();
  return active ? (
  <>
    {Array.from({length: 7}).map((_, i) => (
      <div key={i} style={{position: 'absolute', left: 0, right: 0, top: rnd(frame * 7 + i) * (H - 120), height: 6 + rnd(frame + i) * 40, background: i % 2 ? `${TERMINAL.alert}55` : `${TERMINAL.g}44`,
        transform: `translateX(${(rnd(frame * 3 + i) - 0.5) * 200}px)`, mixBlendMode: 'screen'}} />
    ))}
  </>
  ) : null;
};

// ---------- phone + lock (from the TERMINAL demo) ----------
export const Lock: React.FC<{x: number; y: number; s?: number; open?: number; color?: string}> = ({x, y, s = 1, open = 0, color = T.g}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} style={{filter: `drop-shadow(0 0 8px ${color}99)`}}>
    <path d={`M -34 -10 L -34 -48 A 34 34 0 0 1 34 -48 L 34 ${-10 - 46 * open}`} fill="none" stroke={color} strokeWidth={12} transform={`rotate(${-28 * open} -34 -10)`} />
    <rect x={-52} y={-12} width={104} height={84} rx={10} fill={T.bg} stroke={color} strokeWidth={8} />
    <rect x={-6} y={14} width={12} height={30} rx={6} fill={color} />
  </g>
);

/** Terminal-styled phone, a 780×1250 body (children laid out for that size). Placed by its centre (`cx`, `cy`) and
 * scaled by `s`: portrait default 540, 825, 1 (the v1.10 spot); landscape default 450, 445, 0.6 → 468×750 in the
 * left column (y 70–820), so the right ⅔ stays free for windows/text and the caption band below stays clear.
 * At 0.6 the phone's 38 px message text reads as 23 px: in landscape give `Bubble` size ≈ 56 and titles ≈ 90. */
export const Phone: React.FC<{q: number; children?: React.ReactNode; ting?: number; cx?: number; cy?: number; s?: number}> = ({q, children, ting = 0, cx: cx0, cy: cy0, s: s0}) => {
  const fr = useFrame();
  if (q <= 0) return null;
  const cx = cx0 ?? fr.pick(540, 450), cy = cy0 ?? fr.pick(825, 445), s = s0 ?? fr.pick(1, 0.6);
  return (
    <div style={{position: 'absolute', left: cx - 390, top: cy - 625, width: 780, height: 1250, transform: `translateY(${(1 - q) * 300 * s}px) scale(${(0.9 + 0.1 * q) * s})`, opacity: Math.min(1, q * 2)}}>
      {ting > 0 && [0, 1, 2].map((i) => {
        const k = (ting + i * 0.25) % 1;
        return <div key={i} style={{position: 'absolute', left: 390 - 340 * (0.6 + k), top: 120 - 340 * (0.6 + k) * 0.5, width: 680 * (0.6 + k), height: 340 * (0.6 + k), borderRadius: '50%', border: `3px solid ${T.g}`, opacity: (1 - k) * 0.6}} />;
      })}
      <div style={{position: 'absolute', inset: 0, borderRadius: 64, border: `4px solid ${T.g}`, background: `${T.bg}f5`, boxShadow: `0 0 40px ${T.g}55, inset 0 0 50px ${T.g}18`, willChange: lite() ? 'transform' : undefined}}>
        <div style={{position: 'absolute', left: 310, top: 18, width: 160, height: 30, borderRadius: 15, border: `3px solid ${T.dim}`}} />
        <div style={{position: 'absolute', left: 40, right: 40, top: 64, display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontWeight: 700, fontSize: 24, color: T.dim}}>
          <span>06:31</span><span>▮▮▮ 4G ▮</span>
        </div>
        <div style={{position: 'absolute', left: 34, right: 34, top: 120, bottom: 40}}>{children}</div>
      </div>
    </div>
  );
};

/** Message in the phone. `size` = message text px (default 38; ≈ 56 inside a landscape phone, which is scaled 0.6). */
export const Bubble: React.FC<{q: number; from?: string; color?: string; children: React.ReactNode; dim?: number; size?: number}> = ({q, from, color = T.g, children, dim = 0, size = 38}) =>
  q > 0 ? (
    <div style={{marginBottom: 22, transform: `translateY(${(1 - q) * 30}px)`, opacity: Math.min(1, q * 2) * (1 - dim)}}>
      {from && <div style={{fontFamily: MONO, fontWeight: 700, fontSize: size === 38 ? 24 : Math.round(size * 0.63), color: T.dim, marginBottom: 8}}>{from}</div>}
      <div style={{border: `3px solid ${color}`, padding: '20px 22px', fontFamily: MONO, fontWeight: 600, fontSize: size, lineHeight: 1.35, color, textShadow: glow(color), background: `${color}10`}}>{children}</div>
    </div>
  ) : null;

