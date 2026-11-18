import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame, useVideoConfig} from 'remotion';
import {CaptionPage} from '../../components/WordCaptions';
import {camera, lerp, p, pb, StyleFonts, useFrame} from '../shared';
import {
  armAt, Backdrop, Burst, Caption, Clock, Dimas, DropWord, F, FlatBox, FLOOR_Y, Frame, Frog, Heart, IrisScene, LOOKS, Medal, Mood, Person, Pill, Plant, Podium, popIO,
  PriceTag, Puffs, shelfPoint, Shelf, SparkleField, SpotStage, Stage, stepAt, SvgPill,
} from './kit';

// FLATLIFE StyleGallery demo (4 s QA sheet, never a delivery): the warm stage with Dimas building a shelf that ends up
// slightly crooked, a price tag, heart and confetti; then an iris wipe to the navy spotlight with a drop-in title,
// a researcher landing with a clipboard and a podium. Both caption variants (white pill / sun pill) are shown.

const fakePage = (text: string, start: number): CaptionPage[] => {
  const ws = text.split(' ').map((word, i) => ({i, word, start: start + i * 0.32, end: start + i * 0.32 + 0.28}));
  return [{start, end: start + 6, words: ws}];
};
const PAGES_A = fakePage('Ini caption contoh', 0.15);
const PAGES_B = fakePage('Kasus contoh Flatlife', 2.7);
const FLOOR = 1390;
const SPLIT = 2.4;

export const FlatlifeDemo: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const fr = useFrame();
  if (fr.wide) return <FlatlifeWide t={t} />;
  const cam = camera(t, {x: 520, y: 990, s: 1.05, r: 0}, [{from: 0, to: SPLIT, x: 560, y: 990, s: 1.09}]);
  const tilt = 6 * p(t, 1.95, 2.35, Easing.out(Easing.back(2.6)));
  const medal = shelfPoint(760, FLOOR, 1.4, -70, -420, tilt);
  const wave = Math.sin(t * 13) * 22;
  const podH = 360 * pb(t, 2.75, 3.25);
  return (
    <AbsoluteFill style={{background: F.bg, overflow: 'hidden'}}>
      <StyleFonts />
      {/* scene A — the warm stage: character + build + props */}
      <IrisScene t={t} from={0} to={SPLIT}>
        <Stage pose={cam}>
          <Backdrop t={t} />
          <Plant x={95} y={FLOOR} s={1.05} t={t} />
          <Shelf x={760} y={FLOOR} s={1.4} build={lerp(0.12, 1, p(t, 0, 1.5, Easing.linear))} books={p(t, 1.4, 2.0)} plant={pb(t, 1.7, 2.0)} tilt={tilt} />
          <Puffs t={t} at={1.5} x={760} y={FLOOR} spread={200} />
          <Medal x={medal.x} y={medal.y} s={0.85 * pb(t, 2.0, 2.3)} rot={Math.sin(t * 3) * 6} />
          <PriceTag x={640} y={965} s={0.8 * pb(t, 1.0, 1.3)} swing={Math.sin(t * 3) * 6} string={190} text="CONTOH" size={46} />
          <Dimas t={t} x={320} y={FLOOR} s={1.45} mood={stepAt<Mood>(t, [[0, 'happy'], [0.9, 'pain'], [1.85, 'proud']])} sweat={t > 0.9 && t < 1.85 ? 1 : 0}
            armR={armAt(t, [[0, {a: 150, e: 20 + wave}], [0.85, {a: 85 + Math.sin(t * 14) * 10, e: -18, tool: 'screwdriver'}], [1.85, {a: 40, e: -100}]])}
            armL={armAt(t, [[0, {a: 14, e: 6}], [1.85, {a: 40, e: -100}]])} lookX={t > 0.85 && t < 1.85 ? 1 : 0} tilt={t > 1.85 ? -6 : 0} />
          <SvgPill x={320} y={480} q={popIO(t, 0.25, 1.6)} text="DIMAS" bg={F.coral} size={50} rot={-4} />
          <Heart x={560} y={620} s={0.75 * pb(t, 1.9, 2.2) * (1 + Math.sin(t * 8) * 0.05)} rot={-8} />
          <SparkleField t={t} from={2.0} x={760} y={1020} rx={300} ry={380} n={6} />
          <Burst t={t} at={2.0} x={760} y={760} n={24} seed={4} />
        </Stage>
        <Pill x={540} y={300} q={popIO(t, 0.15, 1.85)} bg={F.sun} color={F.navy} text="CONTOH" size={60} />
        <Pill x={540} y={300} q={popIO(t, 1.95)} bg={F.lilac} text="AGAK MIRING" size={60} rot={-5} />
      </IrisScene>
      {/* scene B — iris to the navy spotlight: drop-in title, a researcher lands, a podium rises */}
      <IrisScene t={t} from={SPLIT} to={99} cx={540} cy={900}>
        <Stage pose={{x: 540, y: 980, s: 1.0 + 0.03 * p(t, SPLIT, 4), r: 0}}>
          <SpotStage t={t} />
          <Podium x={760} y={FLOOR + 10} w={300} h={podH} color={F.coral} label="CONTOH" value="A+" />
          <Frog x={760} y={FLOOR + 10 - podH} s={0.8 * pb(t, 2.8, 3.1)} crumple={0} happy />
          <SparkleField t={t} from={3.1} x={760} y={FLOOR - podH - 60} rx={180} ry={110} n={5} />
          <Person t={t} x={330} y={FLOOR + 10} s={1.3} look={LOOKS.labGlasses} seed={11} at={SPLIT + 0.05} mood={stepAt<Mood>(t, [[0, 'happy'], [3.2, 'proud']])}
            armR={{a: 40, e: -80, tool: 'clipboard', toolRot: -40}} armL={armAt(t, [[0, {a: 14, e: 6}], [2.9, {a: 150, e: 20 + wave}]])} lookX={0.6} />
        </Stage>
        <DropWord t={t} at={2.6} text="CONTOH" size={210} top={230} color={F.sun} />
      </IrisScene>
      <Caption t={t} pages={t < SPLIT + 0.25 ? PAGES_A : PAGES_B} dark={t >= SPLIT + 0.25} />
    </AbsoluteFill>
  );
};

// Landscape 16:9 (1920×1080): the same beats re-composed as a wide room. World = screen at rest, floor y 800.
// Scene A left→right: wall picture + plant | Dimas (s 1.05) building the shelf in front of the sky circle | the opened
// flat-pack box under a wall clock — props side by side, pills on the top row, caption on the floor band.
// Scene B: the navy spotlight across the frame, title on top, the researcher left and TWO podiums as the bar chart.
const FW = FLOOR_Y.landscape; // 800
const FlatlifeWide: React.FC<{t: number}> = ({t}) => {
  const cam = camera(t, {x: 950, y: 540, s: 1.0, r: 0}, [{from: 0, to: SPLIT, x: 985, y: 540, s: 1.05}]);
  const tilt = 6 * p(t, 1.95, 2.35, Easing.out(Easing.back(2.6)));
  const SX = 1040, SS = 1.0;
  const medal = shelfPoint(SX, FW, SS, -70, -420, tilt);
  const wave = Math.sin(t * 13) * 22;
  const podA = 360 * pb(t, 2.75, 3.25), podB = 250 * pb(t, 2.85, 3.3);
  return (
    <AbsoluteFill style={{background: F.bg, overflow: 'hidden'}}>
      <StyleFonts />
      <IrisScene t={t} from={0} to={SPLIT}>
        <Stage pose={cam}>
          <Backdrop t={t} cx={830} cy={450} r={390} />
          <Frame x={300} y={330} w={190} h={150} rot={-4}>
            <circle cx={40} cy={-22} r={24} fill={F.sun} />
            <path d="M -95 75 L -30 -10 L 15 40 L 45 10 L 95 75 Z" fill={F.teal} />
          </Frame>
          <Clock x={1610} y={250} r={200} hours={0.25 + t * 0.05} q={0.55} />
          <Plant x={250} y={FW} s={0.95} t={t} />
          <FlatBox x={1610} y={FW} s={0.72} open={1} label="CONTOH" />
          <Shelf x={SX} y={FW} s={SS} build={lerp(0.12, 1, p(t, 0, 1.5, Easing.linear))} books={p(t, 1.4, 2.0)} plant={pb(t, 1.7, 2.0)} tilt={tilt} />
          <Puffs t={t} at={1.5} x={SX} y={FW} spread={150} />
          <Medal x={medal.x} y={medal.y} s={0.62 * pb(t, 2.0, 2.3)} rot={Math.sin(t * 3) * 6} />
          <PriceTag x={930} y={560} s={0.62 * pb(t, 1.0, 1.3)} swing={Math.sin(t * 3) * 6} string={190} text="CONTOH" size={46} />
          <Dimas t={t} x={630} y={FW} s={1.05} mood={stepAt<Mood>(t, [[0, 'happy'], [0.9, 'pain'], [1.85, 'proud']])} sweat={t > 0.9 && t < 1.85 ? 1 : 0}
            armR={armAt(t, [[0, {a: 150, e: 20 + wave}], [0.85, {a: 85 + Math.sin(t * 14) * 10, e: -18, tool: 'screwdriver'}], [1.85, {a: 40, e: -100}]])}
            armL={armAt(t, [[0, {a: 14, e: 6}], [1.85, {a: 40, e: -100}]])} lookX={t > 0.85 && t < 1.85 ? 1 : 0} tilt={t > 1.85 ? -6 : 0} />
          <SvgPill x={630} y={180} q={popIO(t, 0.25, 1.6)} text="DIMAS" bg={F.coral} size={44} rot={-4} />
          <Heart x={805} y={255} s={0.55 * pb(t, 1.9, 2.2) * (1 + Math.sin(t * 8) * 0.05)} rot={-8} />
          <SparkleField t={t} from={2.0} x={SX} y={560} rx={220} ry={270} n={6} />
          <Burst t={t} at={2.0} x={SX} y={470} n={24} seed={4} power={0.8} />
        </Stage>
        <Pill x={960} y={114} q={popIO(t, 0.15, 1.85)} bg={F.sun} color={F.navy} text="CONTOH" size={56} />
        <Pill x={960} y={114} q={popIO(t, 1.95)} bg={F.lilac} text="AGAK MIRING" size={56} rot={-4} />
      </IrisScene>
      <IrisScene t={t} from={SPLIT} to={99} cx={960} cy={500}>
        <Stage pose={{x: 960, y: 540, s: 1.0 + 0.03 * p(t, SPLIT, 4), r: 0}}>
          <SpotStage t={t} />
          <Podium x={1150} y={FW + 10} w={250} h={podA} color={F.coral} label="CONTOH" value="A+" labelSize={36} valueSize={88} />
          <Podium x={1440} y={FW + 10} w={250} h={podB} color={F.teal} label="BIASA" value="B" labelSize={36} valueSize={88} />
          <Frog x={1150} y={FW + 10 - podA} s={0.7 * pb(t, 2.8, 3.1)} crumple={0} happy />
          <SparkleField t={t} from={3.1} x={1150} y={FW + 10 - podA - 60} rx={170} ry={100} n={5} />
          <Person t={t} x={640} y={FW + 10} s={1.05} look={LOOKS.labGlasses} seed={11} at={SPLIT + 0.05} mood={stepAt<Mood>(t, [[0, 'happy'], [3.2, 'proud']])}
            armR={{a: 40, e: -80, tool: 'clipboard', toolRot: -40}} armL={armAt(t, [[0, {a: 14, e: 6}], [2.9, {a: 150, e: 20 + wave}]])} lookX={0.6} />
        </Stage>
        <DropWord t={t} at={2.6} text="CONTOH" size={170} top={58} color={F.sun} />
      </IrisScene>
      <Caption t={t} pages={t < SPLIT + 0.25 ? PAGES_A : PAGES_B} dark={t >= SPLIT + 0.25} />
    </AbsoluteFill>
  );
};
