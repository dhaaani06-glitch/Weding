import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {CaptionPage} from '../../components/WordCaptions';
import {StyleFonts, useFrame} from '../shared';
import {
  Backdrop, Cam, Caption, Clay, ClayDefs, ClayGrads, ClayLine, Contact, Crumbs, drop, HZ, ID, jig, kAt, L, Pill, Place, pop, SETS, SP, SQ, Star,
  Timeline, TR, useLemFonts,
} from './kit';
import {BowlBack, BowlFront, Bubble, Dough, DOUGH_DK, Molecule, Yeast} from './props';

// LEMPUNG StyleGallery demo (QA sheet, never a delivery): a clay tabletop — letters thumb-pressed onto the paper sweep,
// dough rising in a bowl next to a measuring stick, pills pressed on — then a rolling-pin wipe into the micro set where
// the clay yeast hops and puffs bubbles. Everything steps on the 12 fps clock; the dough-strip caption is frame-exact.
// Renders in LITE quality by default (no GPU needed); pass --props='{"clay":"full"}' with --gl=angle for the full filter.

const fakePage = (text: string, start: number): CaptionPage[] => {
  const ws = text.split(' ').map((word, i) => ({i, word, start: start + i * 0.32, end: start + i * 0.32 + 0.28}));
  return [{start, end: start + 6, words: ws}];
};
const PAGES = fakePage('Caption contoh di sini', 0.3);
const RISE = [1, 1.08, 1.18, 1.3, 1.44, 1.58, 1.72, 1.84, 1.95, 2.02, 1.96, 2.0];

const Kitchen: React.FC<SP> = ({tq, hold}) => {
  const BX = 440, BB = 1440, BW = 700, BH = BW * 0.52, DW = 580, DBASE = 1185;
  const kR = kAt(tq, 0.5);
  const rise = kR < 0 ? 1 : RISE[Math.min(kR, RISE.length - 1)];
  const top1 = DBASE - 120 * (DW / 400), top2 = DBASE - 240 * (DW / 400);
  const dj = jig(hold, 3, 0.5);
  return (
    <>
      <Cam tq={tq} from={0} to={2.5} impacts={[1.4]}>
        <Backdrop set={SETS.cream} />
        <Crumbs seed={5} colors={[L.teal, L.mustard, DOUGH_DK, L.tomato]} top={1462} />
        <Contact x={890} y={1442} w={90} k={0.7} />
        <Clay f="slabB" style={{left: 874, top: 720, width: 34, height: 722, borderRadius: 17, background: L.cream}}>
          {Array.from({length: 17}).map((_, i) => <div key={i} style={{position: 'absolute', left: 0, top: 30 + i * 40, width: i % 2 ? 12 : 22, height: 4, background: 'rgba(107,69,50,0.45)'}} />)}
        </Clay>
        <Pill tq={tq} at={0.2} x={752} y={top1 - 44} w={112} h={88} color={L.cream} ink={L.cocoa} size={46}>1×</Pill>
        <Pill tq={tq} at={1.4} x={752} y={top2 - 44} w={112} h={88} color={L.tomato} ink={L.cream} size={46}>2×</Pill>
        <Contact x={BX} y={BB} w={BW * 0.9} />
        <Place x={BX - BW / 2} y={BB - BH} w={BW} h={BH}><BowlBack w={BW} /></Place>
        <Place x={BX - DW / 2 + dj.x} y={DBASE - DW * 0.75} w={DW} h={DW * 0.8} rot={dj.r * 0.5}><Dough w={DW} rise={rise} holes={kR >= 4} /></Place>
        <Place x={BX - BW / 2} y={BB - BH} w={BW} h={BH}><BowlFront w={BW} /></Place>
      </Cam>
      <ClayLine text="CONTOH" starts={[-1 / 12]} tq={tq} hold={hold} size={240} y={96} color={L.tomato} seed={2} f="txtB" />
      <ClayLine text="KATA KUNCI" starts={[0.7, 1.0]} tq={tq} hold={hold} size={118} y={360} color={L.teal} seed={3} />
      {/* topic label tag pressed on the wall from frame 0 */}
      <Pill tq={tq} at={-1 / 12} x={90} y={560} w={430} h={104} color={L.mustard} ink={L.ink} size={54} rot={-5} z={10}>SAINS DAPUR</Pill>
      <Pill tq={tq} at={1.0} x={560} y={600} w={300} h={92} color={L.lilac} ink={L.cream} size={48} rot={4} z={10}>CONTOH</Pill>
    </>
  );
};

const BUBS = [{x: 820, y: 960, d: 150}, {x: 250, y: 1010, d: 110}, {x: 180, y: 760, d: 120}, {x: 880, y: 720, d: 96}];
const Micro: React.FC<SP> = ({tq, hold}) => {
  const YX = 540, YB = 1440, YW = 460;
  const hop: SQ = (() => {
    const k = kAt(tq, 2.7);
    const rows = [[0, 1.1, 0.86], [-50, 0.92, 1.1], [-20, 0.96, 1.05], [0, 1.08, 0.93]];
    return k < 0 || k > 3 ? ID : {...ID, y: rows[k][0], sx: rows[k][1], sy: rows[k][2]};
  })();
  const puffed = tq >= 3.1;
  const j = jig(hold, 21, 0.7);
  return (
    <>
      <Cam tq={tq} from={2.2} to={4} push={0.02}>
        <Backdrop set={SETS.micro} />
        <Crumbs seed={14} colors={['#9ED3CF', '#FFFFFF', L.sky]} top={1466} />
        <Contact x={YX} y={YB} w={380} s={hop} k={0.9} />
        <Place x={YX - YW / 2 + j.x} y={YB - YW * 1.2} w={YW} h={YW * 1.2} s={hop} rot={j.r} z={5}>
          <Yeast w={YW} mood={puffed ? 'relief' : tq >= 2.7 ? 'grin' : 'smile'} arms={tq >= 2.7 && tq < 3.1 ? (hold % 4 < 2 ? 'waveR' : 'up') : 'down'} blush={puffed ? 0.9 : 0.45} />
        </Place>
        {BUBS.map((b, i) => {
          const s = pop(tq, 3.1 + i / 24);
          if (!s.on) return null;
          const d = b.d * s.sx;
          return <div key={i} style={{position: 'absolute', left: b.x - d / 2, top: b.y - d / 2 - Math.max(0, tq - 3.2) * 30, zIndex: 7}}><Bubble d={d} face={i < 2} look={(hold + i) % 6 < 3 ? -5 : 5} tag={i === 0} /></div>;
        })}
        {tq >= 3.5 && [[300, 620, 50], [790, 560, 40]].map(([x, y, sz], i) => <div key={i} style={{position: 'absolute', left: x - sz / 2, top: y - sz / 2, transform: `scale(${(hold + i) % 4 < 2 ? 1 : 0.78})`}}><Star size={sz} color={i ? L.mustard : '#FFFFFF'} /></div>)}
      </Cam>
      <ClayLine text="LEMPUNG" starts={[2.45]} tq={tq} hold={hold} size={200} y={96} color={L.lilac} seed={5} f="txtB" />
      {(() => { const s = drop(tq, 3.3, 0.8); return s.on ? <Place x={330} y={330} w={420} h={176} s={s} z={20}><Molecule w={420} /></Place> : null; })()}
      <Pill tq={tq} at={3.55} x={250} y={540} w={580} h={92} color={L.cream} ink={L.ink} size={48} z={20}>LABEL CONTOH</Pill>
    </>
  );
};

const TRS: TR[] = [{a: 2.15, b: 2.55, kind: 'roll'}];

// ---------- landscape (1920×1080) re-composition: two columns on the same tabletop ----------
// The set is the same paper sweep (wall to y ≈ 540, tabletop from ≈ 650); objects keep their portrait size or shrink a
// little (k) so a hero fits between the top margin and the floor line ≈ 800. Text column = ClayLine with x/w (a column,
// not the frame width) + pills; visual column = the props. Scene 1 puts text left / visual right, scene 2 mirrors it.
const KitchenWide: React.FC<SP> = ({tq, hold}) => {
  const k = 0.92; // bowl set scaled to the 1080-px height
  const BX = 1300, BB = 800, BW = 700 * k, BH = BW * 0.52, DW = 580 * k, DBASE = BB - 255 * k;
  const SX = BX + 434 * k, SH = 722 * k; // measuring stick: left edge and height (stands on the table at BB)
  const kR = kAt(tq, 0.5);
  const rise = kR < 0 ? 1 : RISE[Math.min(kR, RISE.length - 1)];
  const top1 = DBASE - 120 * (DW / 400), top2 = DBASE - 240 * (DW / 400);
  const dj = jig(hold, 3, 0.5);
  return (
    <>
      <Cam tq={tq} from={0} to={2.5} impacts={[1.4]}>
        <Backdrop set={SETS.cream} />
        <Crumbs seed={5} colors={[L.teal, L.mustard, DOUGH_DK, L.tomato]} top={812} />
        <Contact x={SX + 16} y={BB + 2} w={80} k={0.7} />
        <Clay f="slabB" style={{left: SX, top: BB + 2 - SH, width: 30, height: SH, borderRadius: 15, background: L.cream}}>
          {Array.from({length: 17}).map((_, i) => <div key={i} style={{position: 'absolute', left: 0, top: (30 + i * 40) * k, width: i % 2 ? 11 : 19, height: 4, background: 'rgba(107,69,50,0.45)'}} />)}
        </Clay>
        <Pill tq={tq} at={0.2} x={SX - 122} y={top1 - 44} w={112} h={88} color={L.cream} ink={L.cocoa} size={46}>1×</Pill>
        <Pill tq={tq} at={1.4} x={SX - 122} y={top2 - 44} w={112} h={88} color={L.tomato} ink={L.cream} size={46}>2×</Pill>
        <Contact x={BX} y={BB} w={BW * 0.9} />
        <Place x={BX - BW / 2} y={BB - BH} w={BW} h={BH}><BowlBack w={BW} /></Place>
        <Place x={BX - DW / 2 + dj.x} y={DBASE - DW * 0.75} w={DW} h={DW * 0.8} rot={dj.r * 0.5}><Dough w={DW} rise={rise} holes={kR >= 4} /></Place>
        <Place x={BX - BW / 2} y={BB - BH} w={BW} h={BH}><BowlFront w={BW} /></Place>
      </Cam>
      {/* text column x 110 … 910 */}
      <ClayLine text="CONTOH" starts={[-1 / 12]} tq={tq} hold={hold} size={210} x={110} w={800} y={118} color={L.tomato} seed={2} f="txtB" />
      <ClayLine text="KATA KUNCI" starts={[0.7, 1.0]} tq={tq} hold={hold} size={112} x={110} w={800} y={372} color={L.teal} seed={3} />
      <Pill tq={tq} at={-1 / 12} x={150} y={560} w={430} h={104} color={L.mustard} ink={L.ink} size={54} rot={-5} z={10}>SAINS DAPUR</Pill>
      <Pill tq={tq} at={1.0} x={610} y={590} w={300} h={92} color={L.lilac} ink={L.cream} size={48} rot={4} z={10}>CONTOH</Pill>
    </>
  );
};

const MicroWide: React.FC<SP> = ({tq, hold}) => {
  const YX = 600, YB = 812, YW = 440, k = YW / 460;
  // bubbles around the hero, kept out of the text column (x ≥ 1010)
  const bubs = [{x: 880, y: 430, d: 150}, {x: 290, y: 500, d: 110}, {x: 250, y: 280, d: 120}, {x: 830, y: 210, d: 96}].map((b) => ({...b, d: b.d * k}));
  const hop: SQ = (() => {
    const kk = kAt(tq, 2.7);
    const rows = [[0, 1.1, 0.86], [-50, 0.92, 1.1], [-20, 0.96, 1.05], [0, 1.08, 0.93]];
    return kk < 0 || kk > 3 ? ID : {...ID, y: rows[kk][0], sx: rows[kk][1], sy: rows[kk][2]};
  })();
  const puffed = tq >= 3.1;
  const j = jig(hold, 21, 0.7);
  return (
    <>
      <Cam tq={tq} from={2.2} to={4} push={0.02}>
        <Backdrop set={SETS.micro} />
        <Crumbs seed={14} colors={['#9ED3CF', '#FFFFFF', L.sky]} top={816} />
        <Contact x={YX} y={YB} w={360} s={hop} k={0.9} />
        <Place x={YX - YW / 2 + j.x} y={YB - YW * 1.2} w={YW} h={YW * 1.2} s={hop} rot={j.r} z={5}>
          <Yeast w={YW} mood={puffed ? 'relief' : tq >= 2.7 ? 'grin' : 'smile'} arms={tq >= 2.7 && tq < 3.1 ? (hold % 4 < 2 ? 'waveR' : 'up') : 'down'} blush={puffed ? 0.9 : 0.45} />
        </Place>
        {bubs.map((b, i) => {
          const s = pop(tq, 3.1 + i / 24);
          if (!s.on) return null;
          const d = b.d * s.sx;
          return <div key={i} style={{position: 'absolute', left: b.x - d / 2, top: b.y - d / 2 - Math.max(0, tq - 3.2) * 30, zIndex: 7}}><Bubble d={d} face={i < 2} look={(hold + i) % 6 < 3 ? -5 : 5} tag={i === 0} /></div>;
        })}
        {tq >= 3.5 && [[480, 190, 50], [150, 400, 40]].map(([x, y, sz], i) => <div key={i} style={{position: 'absolute', left: x - sz / 2, top: y - sz / 2, transform: `scale(${(hold + i) % 4 < 2 ? 1 : 0.78})`}}><Star size={sz} color={i ? L.mustard : '#FFFFFF'} /></div>)}
      </Cam>
      {/* text column x 1010 … 1810 (mirrored) */}
      <ClayLine text="LEMPUNG" starts={[2.45]} tq={tq} hold={hold} size={180} x={1010} w={800} y={140} color={L.lilac} seed={5} f="txtB" />
      {(() => { const s = drop(tq, 3.3, 0.8); return s.on ? <Place x={1200} y={400} w={420} h={176} s={s} z={20}><Molecule w={420} /></Place> : null; })()}
      <Pill tq={tq} at={3.55} x={1120} y={620} w={580} h={92} color={L.cream} ink={L.ink} size={48} z={20}>LABEL CONTOH</Pill>
    </>
  );
};

export const LempungDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  useLemFonts();
  const wide = useFrame().wide;
  const hold = Math.floor((frame * HZ) / fps);
  return (
    <AbsoluteFill style={{background: SETS.cream.wall, overflow: 'hidden'}}>
      <StyleFonts />
      <ClayDefs hold={hold} />
      <Timeline t={t} scenes={wide ? [KitchenWide, MicroWide] : [Kitchen, Micro]} trs={TRS} />
      <Caption t={t} pages={PAGES} />
      <ClayGrads />
    </AbsoluteFill>
  );
};
