import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CaptionPage} from '../../components/WordCaptions';
import {p, useFrame} from '../shared';
import * as AR from './kit';

// ARSIP — 4 s StyleGallery demo (QA sheet, never a delivery). Moved out of StyleGallery.tsx in v1.11.

const fakePage = (text: string, start: number): CaptionPage[] => {
  const ws = text.split(' ').map((word, i) => ({i, word, start: start + i * 0.32, end: start + i * 0.32 + 0.28}));
  return [{start, end: start + 6, words: ws}];
};

const useT = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return f / fps;
};

export const ArsipDemo: React.FC = () => {
  const t = useT();
  const {wide} = useFrame();
  if (wide) return <ArsipWide t={t} />;
  return (
    <AbsoluteFill style={{background: AR.A.desk}}>
      <AbsoluteFill style={{backgroundImage: AR.DESK, backgroundSize: '1024px 300px', opacity: 0.3, mixBlendMode: 'overlay'}} />
      <AR.Sheet x={80} y={200} w={560} h={300} rot={-2}>
        <div style={{position: 'absolute', left: 30, top: 24, fontFamily: AR.TYPE, fontWeight: 700, fontSize: 24, color: AR.A.red}}>
          <AR.TypeOn text="BERKAS No. 01 · ARSIP" t={t} start={0.1} cps={24} />
        </div>
        <div style={{position: 'absolute', left: 30, top: 70, fontFamily: AR.HEAD, fontWeight: 900, fontSize: 84, lineHeight: 1, color: AR.A.ink}}>Kasus<br />Contoh</div>
      </AR.Sheet>
      <AR.Mugshot x={600} y={300} rot={3} q={p(t, 0.4, 0.8)} n="#1" v="laurel" plate="ARSIP · 01" />
      <AR.CalendarPage t={t} x={90} y={620} w={480} rot={-1.5} shown={Math.floor(28 * p(t, 0.6, 1.6))} title="FEBRUARI" sub="CONTOH" markers={3} markerAt={1.7} circle28={p(t, 1.6, 2.0)} />
      <AR.Card x={600} y={980} w={400} h={200} rot={2} q={p(t, 1.0, 1.4)}>
        <div style={{position: 'absolute', left: 24, top: 24, fontFamily: AR.TYPE, fontWeight: 700, fontSize: 30, color: AR.A.ink}}>Card + Pin + Ring</div>
      </AR.Card>
      <AR.Pin x={800} y={990} q={p(t, 1.3, 1.4)} />
      <AR.Ring cx={800} cy={1080} rx={190} ry={80} q={p(t, 1.6, 2.1)} />
      <AR.Stamp id="gallery" t={t} at={2.2} x={540} y={760} w={600} h={190} rot={-9} lines={['STEMPEL', '— CONTOH —']} size={80} />
      <AR.Caption t={t} pages={fakePage('Caption kertas sobek dengan stabilo', 0.3)} />
    </AbsoluteFill>
  );
};

// Landscape 1920×1080: one desk station read left → right — case header + pinned card | calendar (the anchor) |
// suspect polaroid. Everything sits between y 80 and ~780; the torn caption is bottom-anchored below it (kit default).
const ArsipWide: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill style={{background: AR.A.desk}}>
    <AbsoluteFill style={{backgroundImage: AR.DESK, backgroundSize: '1024px 300px', opacity: 0.3, mixBlendMode: 'overlay'}} />
    <AR.Sheet x={110} y={90} w={600} h={320} rot={-2}>
      <div style={{position: 'absolute', left: 32, top: 26, fontFamily: AR.TYPE, fontWeight: 700, fontSize: 26, color: AR.A.red}}>
        <AR.TypeOn text="BERKAS No. 01 · ARSIP" t={t} start={0.1} cps={24} />
      </div>
      <div style={{position: 'absolute', left: 32, top: 76, fontFamily: AR.HEAD, fontWeight: 900, fontSize: 92, lineHeight: 1, color: AR.A.ink}}>Kasus<br />Contoh</div>
    </AR.Sheet>
    <AR.Card x={140} y={470} w={540} h={250} rot={2} q={p(t, 1.0, 1.4)}>
      <div style={{position: 'absolute', left: 28, top: 30, fontFamily: AR.TYPE, fontWeight: 700, fontSize: 34, color: AR.A.ink}}>Card + Pin + Ring</div>
    </AR.Card>
    <AR.Pin x={420} y={482} q={p(t, 1.3, 1.4)} />
    <AR.Ring cx={410} cy={595} rx={285} ry={150} q={p(t, 1.6, 2.1)} />
    <AR.CalendarPage t={t} x={770} y={100} w={560} rot={-1.5} shown={Math.floor(28 * p(t, 0.6, 1.6))} title="FEBRUARI" sub="CONTOH" markers={3} markerAt={1.7} circle28={p(t, 1.6, 2.0)} />
    <AR.Mugshot x={1390} y={130} rot={3} q={p(t, 0.4, 0.8)} n="#1" v="laurel" plate="ARSIP · 01" />
    <AR.Stamp id="gallery-wide" t={t} at={2.2} x={1260} y={390} w={620} h={200} rot={-9} lines={['STEMPEL', '— CONTOH —']} size={84} />
    <AR.Caption t={t} pages={fakePage('Caption kertas sobek dengan stabilo', 0.3)} />
  </AbsoluteFill>
);
