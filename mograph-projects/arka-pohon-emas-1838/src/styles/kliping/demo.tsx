import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {CaptionPage} from '../../components/WordCaptions';
import {roughEllipse, roughLine, StyleFonts, useFrame} from '../shared';
import {
  arrowHead, BLOCK, Burst, Caption, Clipping, Cut, Desk, Face, FAT, GRAIN, HAND, Ink, makeHold, Marker, Note, Person, Q, Ransom, Scrap,
  Stamp, Tape,
} from './kit';

// KLIPING StyleGallery demo (QA sheet, never a delivery): kraft desk, ransom letters, a torn clipping with tape,
// a rubber stamp, halftone cut-outs, a star sticker, marker scribbles — all on the 12 fps stop-motion clock —
// and the frame-exact torn-paper caption.

const fakePage = (text: string, start: number): CaptionPage[] => {
  const ws = text.split(' ').map((word, i) => ({i, word, start: start + i * 0.32, end: start + i * 0.32 + 0.28}));
  return [{start, end: start + 6, words: ws}];
};
const PAGES = fakePage('Caption contoh di sini', 0.3);
const PEOPLE = [
  {x: 80, bg: Q.cobalt, pc: Q.mustard, hair: 0, name: 'Contoh A', r: -4},
  {x: 400, bg: Q.pink, pc: Q.mint, hair: 2, name: 'Contoh B', r: 3},
  {x: 720, bg: Q.mint, pc: Q.pink, hair: 3, name: 'Contoh C', r: -2},
];

export const KlipingDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const h = makeHold(frame, fps); // graphics move on held 12 fps steps; the caption below uses the exact t
  if (useFrame().wide) return <KlipingWide t={t} h={h} />;
  return (
    <AbsoluteFill style={{background: Q.kraft, overflow: 'hidden'}}>
      <StyleFonts />
      <Desk />
      <Ransom h={h} at={-0.1} text="CONTOH!" size={128} x={80} y={150} seed={3} per={1 / 20} rot={-3} />
      {/* glued before frame 0, so the first frame is never empty */}
      <Clipping h={h} at={-0.5} x={80} y={360} w={560} hgt={500} seed={11} rot={-4} head={<div style={{fontFamily: FAT, fontSize: 70, color: Q.red}}>Kasus Contoh</div>} photo={Q.mustard} lines={4}>
        <Stamp h={h} at={1.0} x={290} y={360} text="BOHONG" size={62} rot={-14} blend={false} />
      </Clipping>
      <Tape h={h} at={0.4} x={40} y={350} rot={-28} seed={4} />
      <Tape h={h} at={0.45} x={520} y={330} rot={20} seed={5} />
      <Burst h={h} at={0.6} x={850} y={470} size={280} color={Q.pink} text="BARU!" fontSize={58} rot={12} />
      <Cut h={h} at={1.5} x={690} y={620} rot={6} z={8} big={1.25}><Face w={270} mood="kaget" bg={Q.mustard} n={h.n} /></Cut>
      <Scrap h={h} at={1.6} x={720} y={880} w={220} hgt={80} color={Q.mustard} rot={-4} seed={21} z={9}><div style={{fontFamily: BLOCK, fontSize: 44, color: Q.ink}}>KAGET</div></Scrap>
      {PEOPLE.map((p, i) => (
        <React.Fragment key={i}>
          <Scrap h={h} at={-0.5} x={p.x} y={990} w={270} hgt={300} color={p.bg} rot={p.r} seed={30 + i} halftone={Q.paper} z={3} />
          <Cut h={h} at={1.2 + i * 0.17} x={p.x + 25} y={1040} rot={p.r} z={4} seed={i} big={1.2}><Person w={220} bg={p.pc} hair={p.hair} seed={40 + i} glasses={i === 0} /></Cut>
          <Scrap h={h} at={1.3 + i * 0.17} x={p.x + 30} y={1280} w={210} hgt={70} color={Q.paper} rot={-p.r * 1.5} seed={50 + i} z={6}>
            <div style={{fontFamily: HAND, fontWeight: 700, fontSize: 38, color: Q.ink}}>{p.name}</div>
          </Scrap>
        </React.Fragment>
      ))}
      <Scrap h={h} at={2.1} x={80} y={1380} w={620} hgt={110} color={Q.ink} rot={-2} seed={60} z={10}>
        <div style={{fontFamily: BLOCK, fontSize: 52, color: Q.paper}}>LABEL <span style={{color: Q.mustard}}>CONTOH</span></div>
      </Scrap>
      <Note h={h} at={2.4} x={714} y={1404} text="catatan!" size={58} color={Q.cobalt} rot={-6} />
      <Ink>
        <Marker h={h} at={1.3} d={roughEllipse(365, 725, 250, 110, 7, 0.06, 1.12)} width={11} dur={0.4} />
        <Marker h={h} at={2.6} d={roughLine([760, 1390], [660, 1330], 5, 4) + arrowHead(658, 1328, -150, 30)} color={Q.cobalt} width={9} dur={0.3} />
      </Ink>
      <AbsoluteFill style={{backgroundImage: GRAIN, opacity: 0.14, mixBlendMode: 'multiply', pointerEvents: 'none'}} />
      <Caption t={t} pages={PAGES} />
    </AbsoluteFill>
  );
};

// Landscape 16:9 (1920×1080): the same pieces and cues laid out as a wide desk in three zones — left: ransom title over
// the stamped clipping; middle: the BARU! sticker over the shocked face; right: the label strip heading the three
// people cut-outs, the marker note under them. Caption on the desk below everything (bottom safe margin).
const PEOPLE_W = [
  {x: 1090, bg: Q.cobalt, pc: Q.mustard, hair: 0, name: 'Contoh A', r: -4},
  {x: 1330, bg: Q.pink, pc: Q.mint, hair: 2, name: 'Contoh B', r: 3},
  {x: 1570, bg: Q.mint, pc: Q.pink, hair: 3, name: 'Contoh C', r: -2},
];
const KlipingWide: React.FC<{t: number; h: ReturnType<typeof makeHold>}> = ({t, h}) => (
  <AbsoluteFill style={{background: Q.kraft, overflow: 'hidden'}}>
    <StyleFonts />
    <Desk />
    <Ransom h={h} at={-0.1} text="CONTOH!" size={118} x={110} y={66} seed={3} per={1 / 20} rot={-3} />
    <Clipping h={h} at={-0.5} x={120} y={252} w={560} hgt={530} seed={11} rot={-4} head={<div style={{fontFamily: FAT, fontSize: 70, color: Q.red}}>Kasus Contoh</div>} photo={Q.mustard} lines={4}>
      <Stamp h={h} at={1.0} x={290} y={378} text="BOHONG" size={62} rot={-14} blend={false} />
    </Clipping>
    <Tape h={h} at={0.4} x={80} y={240} rot={-28} seed={4} />
    <Tape h={h} at={0.45} x={560} y={222} rot={20} seed={5} />
    <Burst h={h} at={0.6} x={915} y={300} size={270} color={Q.pink} text="BARU!" fontSize={54} rot={12} />
    <Cut h={h} at={1.5} x={765} y={452} rot={6} z={8} big={1.25}><Face w={262} mood="kaget" bg={Q.mustard} n={h.n} /></Cut>
    <Scrap h={h} at={1.6} x={792} y={728} w={210} hgt={76} color={Q.mustard} rot={-4} seed={21} z={9}><div style={{fontFamily: BLOCK, fontSize: 42, color: Q.ink}}>KAGET</div></Scrap>
    {PEOPLE_W.map((p, i) => (
      <React.Fragment key={i}>
        <Scrap h={h} at={-0.5} x={p.x} y={286} w={230} hgt={300} color={p.bg} rot={p.r} seed={30 + i} halftone={Q.paper} z={3} />
        <Cut h={h} at={1.2 + i * 0.17} x={p.x + 18} y={334} rot={p.r} z={4} seed={i} big={1.2}><Person w={196} bg={p.pc} hair={p.hair} seed={40 + i} glasses={i === 0} /></Cut>
        <Scrap h={h} at={1.3 + i * 0.17} x={p.x + 20} y={576} w={190} hgt={66} color={Q.paper} rot={-p.r * 1.5} seed={50 + i} z={6}>
          <div style={{fontFamily: HAND, fontWeight: 700, fontSize: 36, color: Q.ink}}>{p.name}</div>
        </Scrap>
      </React.Fragment>
    ))}
    <Scrap h={h} at={2.1} x={1090} y={124} w={680} hgt={110} color={Q.ink} rot={-2} seed={60} z={10}>
      <div style={{fontFamily: BLOCK, fontSize: 52, color: Q.paper}}>LABEL <span style={{color: Q.mustard}}>CONTOH</span></div>
    </Scrap>
    <Note h={h} at={2.4} x={1566} y={712} text="catatan!" size={60} color={Q.cobalt} rot={-6} />
    <Ink>
      <Marker h={h} at={1.3} d={roughEllipse(411, 630, 250, 110, 7, 0.06, 1.12)} width={11} dur={0.4} />
      <Marker h={h} at={2.6} d={roughLine([1606, 710], [1506, 658], 5, 4) + arrowHead(1504, 656, -152, 30)} color={Q.cobalt} width={9} dur={0.3} />
    </Ink>
    <AbsoluteFill style={{backgroundImage: GRAIN, opacity: 0.14, mixBlendMode: 'multiply', pointerEvents: 'none'}} />
    <Caption t={t} pages={PAGES} />
  </AbsoluteFill>
);
