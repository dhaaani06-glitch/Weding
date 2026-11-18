import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {CaptionPage} from '../../components/WordCaptions';
import {StyleFonts, useFrame} from '../shared';
import {
  Backdrop, Callout, clamp01, Dot, DotCanvas, dotText, drawDot, drawLattice, DriftLayer, Formation, gridPos, Hud, Legend, mixRGB, MonoCaption, morph, pctID, ping,
  rgb, ShareBar, SNAP, Stat, Step, sunflower, tick, TK, useAsyncLayout,
} from './kit';

// TITIK StyleGallery demo (4 s QA sheet): 200 unit dots bloom as a sunflower, morph into a 20 × 10 waffle where 35 %
// turn coral, then pour into the dot-text "CONTOH"; Stat hand-offs, a Callout, the ShareBar and the mono caption.

const N = 200;
const SHARE = 0.35; // 70 of 200
const WH = rgb(TK.dot), CO = rgb(TK.coral);
const fakePage = (text: string, start: number): CaptionPage[] => {
  const ws = text.split(' ').map((word, i) => ({i, word, start: start + i * 0.32, end: start + i * 0.32 + 0.28}));
  return [{start, end: start + 6, words: ws}];
};
const PAGES = fakePage('Satu titik = satu unit', 0);
const WAFFLE = (k: number) => gridPos(k, 20, 141, 660, 42);
const buildDemo = () => ({word: dotText('CONTOH', (px) => `800 ${px}px 'Tik Head'`, {cx: 540, cy: 860, w: 800, h: 215}, N)});

export const TitikDemo: React.FC = () => {
  const {fps} = useVideoConfig();
  const t = useCurrentFrame() / fps;
  return useFrame().wide ? <TitikWide t={t} /> : <TitikPortrait t={t} />;
};

const TitikPortrait: React.FC<{t: number}> = ({t}) => {
  const L = useAsyncLayout('demo', buildDemo);

  const steps = useMemo<Step[] | null>(() => {
    if (!L) return null;
    const fWaffle: Formation = (i, tt) => {
      const [x, y] = WAFFLE(i);
      // the share fills row by row from the bottom-left, landing at 1.6 s
      const filled = i >= N - Math.round(N * SHARE);
      const q = filled ? SNAP(clamp01((tt - 1.15 - ((N - 1 - i) / 70) * 0.4) / 0.25)) : 0;
      return {x, y, r: 13, a: 1, c: mixRGB(WH, CO, q)};
    };
    const fWord: Formation = (i) => {
      const [x, y] = L.word.pts[i];
      return {x, y, r: L.word.s * 0.4, a: 1, c: i % 7 === 0 ? CO : WH};
    };
    return [
      {at: 0.75, dur: 0.6, to: fWaffle, delay: (i) => (i % 20) * 0.012 + Math.floor(i / 20) * 0.01, arc: 0.22, swirl: true},
      {at: 2.25, dur: 0.6, to: fWord, delay: (i) => (L.word.pts[i][0] / 1080) * 0.3, arc: 0.14, swirl: true},
    ];
  }, [L]);

  const fBloom: Formation = (i, tt) => {
    const k = (i + 1) / N;
    const [x, y] = sunflower(i, 540, 880, 30, tt * 0.22);
    const g = SNAP(clamp01((tt + 0.3 - k * 0.7) / 0.3));
    return {x, y, r: (5 + 6 * k) * g, a: 0.3 + 0.7 * g, c: WH} as Dot;
  };
  const draw = steps
    ? (ctx: CanvasRenderingContext2D, tt: number) => {
        drawLattice(ctx, tt);
        for (let i = 0; i < N; i++) drawDot(ctx, morph(i, tt, fBloom, steps), morph(i, tt - 1 / 120, fBloom, steps), tt);
        ping(ctx, tt, 1.6, WAFFLE(N - 70)[0], WAFFLE(N - 70)[1], CO, 14, 80, 0.6);
      }
    : null;

  const count = Math.round(N * clamp01((tick(t) + 0.3) / 0.7));
  const share = SHARE * SNAP(clamp01((t - 1.1) / 0.6));
  const shareTxt = SHARE * SNAP(clamp01((tick(t) - 1.1) / 0.6)); // readouts change ≤ 20×/s
  return (
    <AbsoluteFill style={{background: TK.ink, overflow: 'hidden'}}>
      <StyleFonts />
      <Backdrop />
      <DotCanvas t={t} draw={draw} />
      <DriftLayer t={t}>
        <Callout q={clamp01((t - 1.65) / 0.45) * (1 - clamp01((t - 2.15) / 0.2))} from={WAFFLE(N - 60)} elbow={[110, 1090]} to={[80, 1090]} text={['70 DARI 200 UNIT = 35%']} color={TK.coral} align="below" />
      </DriftLayer>
      <Hud t={t} duration={4} live={count} topic="CONTOH · DATA" chapter={1} chapters={1} legend={<Legend text="= 1 UNIT" />} />
      <Stat t={t} inAt={-0.45} outAt={0.75} num={String(count).padStart(3, '0')} label={['UNIT', 'CONTOH DATA']} />
      <Stat t={t} inAt={0.95} outAt={2.1} num={pctID(SHARE, 0)} color={TK.coral} label={['BAGIAN', 'CONTOH']} />
      <Stat t={t} inAt={2.3} num="Contoh" label={['1 TITIK', '= 1 UNIT']} />
      <ShareBar v={1 - share} o={clamp01((t - 0.9) / 0.3)} left="SISANYA" right="BAGIAN" leftValue={pctID(1 - shareTxt, 0)} rightValue={pctID(shareTxt, 0)} leftColor={TK.cyan} mid={null} />
      <MonoCaption t={t} pages={PAGES} />
    </AbsoluteFill>
  );
};

// ---------- landscape (1920×1080) re-composition ----------
// Two columns under the HUD: numbers on the left (Stat header, callout text, a column ShareBar), the dot visual on the
// right (x 860 … 1810, centre 1335). The bloom opens at the frame centre and pours sideways into a wide 25 × 8 waffle,
// then into the dot word; the HUD rules run the full width (100 / 790) and the mono caption sits under them (890).
const WX = 1335, WY = 455; // centre of the visual column
const WAFFLE_W = (k: number) => gridPos(k, 25, WX - 12 * 38, WY - 3.5 * 38, 38);
const buildDemoWide = () => ({word: dotText('CONTOH', (px) => `800 ${px}px 'Tik Head'`, {cx: WX, cy: WY, w: 880, h: 230}, N)});

const TitikWide: React.FC<{t: number}> = ({t}) => {
  const fr = useFrame();
  const L = useAsyncLayout('demo-wide', buildDemoWide);

  const steps = useMemo<Step[] | null>(() => {
    if (!L) return null;
    const fWaffle: Formation = (i, tt) => {
      const [x, y] = WAFFLE_W(i);
      const filled = i >= N - Math.round(N * SHARE);
      const q = filled ? SNAP(clamp01((tt - 1.15 - ((N - 1 - i) / 70) * 0.4) / 0.25)) : 0;
      return {x, y, r: 12, a: 1, c: mixRGB(WH, CO, q)};
    };
    const fWord: Formation = (i) => {
      const [x, y] = L.word.pts[i];
      return {x, y, r: L.word.s * 0.4, a: 1, c: i % 7 === 0 ? CO : WH};
    };
    return [
      {at: 0.75, dur: 0.6, to: fWaffle, delay: (i) => (i % 25) * 0.01 + Math.floor(i / 25) * 0.012, arc: 0.22, swirl: true},
      {at: 2.25, dur: 0.6, to: fWord, delay: (i) => ((L.word.pts[i][0] - (WX - 440)) / 880) * 0.3, arc: 0.14, swirl: true},
    ];
  }, [L]);

  const fBloom: Formation = (i, tt) => {
    const k = (i + 1) / N;
    const [x, y] = sunflower(i, fr.cx + 80, WY + 15, 22, tt * 0.22);
    const g = SNAP(clamp01((tt + 0.3 - k * 0.7) / 0.3));
    return {x, y, r: (5 + 6 * k) * g, a: 0.3 + 0.7 * g, c: WH} as Dot;
  };
  const draw = steps
    ? (ctx: CanvasRenderingContext2D, tt: number) => {
        drawLattice(ctx, tt);
        for (let i = 0; i < N; i++) drawDot(ctx, morph(i, tt, fBloom, steps), morph(i, tt - 1 / 120, fBloom, steps), tt);
        ping(ctx, tt, 1.6, WAFFLE_W(N - 70)[0], WAFFLE_W(N - 70)[1], CO, 14, 80, 0.6);
      }
    : null;

  const count = Math.round(N * clamp01((tick(t) + 0.3) / 0.7));
  const share = SHARE * SNAP(clamp01((t - 1.1) / 0.6));
  const shareTxt = SHARE * SNAP(clamp01((tick(t) - 1.1) / 0.6));
  const from = WAFFLE_W(150); // first coral dot of the left column
  return (
    <AbsoluteFill style={{background: TK.ink, overflow: 'hidden'}}>
      <StyleFonts />
      <Backdrop />
      <DotCanvas t={t} draw={draw} />
      <DriftLayer t={t}>
        <Callout q={clamp01((t - 1.65) / 0.45) * (1 - clamp01((t - 2.15) / 0.2))} from={from} elbow={[from[0] - 70, 590]} to={[fr.safe.side, 590]} text={['70 DARI 200 UNIT = 35%']} color={TK.coral} align="below" />
      </DriftLayer>
      <Hud t={t} duration={4} live={count} topic="CONTOH · DATA" chapter={1} chapters={1} legend={<Legend text="= 1 UNIT" />} />
      <Stat t={t} inAt={-0.45} outAt={0.75} num={String(count).padStart(3, '0')} label={['UNIT', 'CONTOH DATA']} />
      <Stat t={t} inAt={0.95} outAt={2.1} num={pctID(SHARE, 0)} color={TK.coral} label={['BAGIAN', 'CONTOH']} />
      {/* a word Stat is wider than a number: size 170 keeps Stat + label inside the left column (≤ 800) */}
      <Stat t={t} inAt={2.3} num="Contoh" size={170} label={['1 TITIK', '= 1 UNIT']} />
      <ShareBar v={1 - share} o={clamp01((t - 0.9) / 0.3)} width={640} left="SISANYA" right="BAGIAN" leftValue={pctID(1 - shareTxt, 0)} rightValue={pctID(shareTxt, 0)} leftColor={TK.cyan} mid={null} />
      <MonoCaption t={t} pages={PAGES} />
    </AbsoluteFill>
  );
};
