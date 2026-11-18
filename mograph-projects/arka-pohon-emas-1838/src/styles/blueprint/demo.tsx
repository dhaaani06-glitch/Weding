import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CaptionPage} from '../../components/WordCaptions';
import {p, useFrame} from '../shared';
import * as BP from './kit';

// BLUEPRINT — 4 s StyleGallery demo (QA sheet, never a delivery). Moved out of StyleGallery.tsx in v1.11.

const fakePage = (text: string, start: number): CaptionPage[] => {
  const ws = text.split(' ').map((word, i) => ({i, word, start: start + i * 0.32, end: start + i * 0.32 + 0.28}));
  return [{start, end: start + 6, words: ws}];
};

const useT = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return f / fps;
};

export const BlueprintDemo: React.FC = () => {
  const t = useT();
  const {wide} = useFrame();
  if (wide) return <BlueprintWide t={t} />;
  const iso = BP.isoAt(540, 1020, 280);
  return (
    <AbsoluteFill style={{background: BP.B.bg}}>
      <svg width={1080} height={1920}>
        <defs>
          <pattern id="sg-min" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M 36 0 L 0 0 0 36" fill="none" stroke="#fff" strokeOpacity="0.07" /></pattern>
          <pattern id="sg-maj" width="180" height="180" patternUnits="userSpaceOnUse"><path d="M 180 0 L 0 0 0 180" fill="none" stroke="#fff" strokeOpacity="0.15" strokeWidth="1.5" /></pattern>
        </defs>
        <rect width={1080} height={1920} fill="url(#sg-min)" /><rect width={1080} height={1920} fill="url(#sg-maj)" />
        <BP.Typed x={96} y={280} text="DETAIL A — CONTOH" t={t} start={0.1} size={34} color={BP.B.cyan} />
        <text x={96} y={380} fill={BP.B.line} style={{fontFamily: BP.HEAD, fontWeight: 700, fontSize: 90}}>Gambar teknik</text>
        <BP.IsoBox iso={iso} x0={-0.5} x1={0.5} y0={-0.5} y1={0.5} z0={0} z1={0.3} q={p(t, 0.3, 1.3)} />
        <BP.IsoBox iso={iso} x0={-0.5} x1={0.5} y0={-0.5} y1={0.5} z0={0.4 + 0.3 * p(t, 1.6, 2.2)} z1={0.76 + 0.3 * p(t, 1.6, 2.2)} topInset={0.12} q={p(t, 0.7, 1.6)} />
        <BP.Callout a={iso(-0.3, 0.2, 0.9)} l={[300, 640]} n="1" label="KEYCAP" side="left" t={t} start={2.0} />
        <BP.Callout a={iso(0.35, 0.1, 0.12)} l={[820, 1150]} n="2" label="MODUL" t={t} start={2.3} color={BP.B.yellow} />
        <BP.Dim a={[180, 1400]} b={[900, 1400]} text="DIMENSI 720" q={p(t, 2.4, 3.0)} />
        <BP.Hatch x={140} y={1240} w={120} h={120} q={p(t, 1.0, 1.6)} id="sg-h" />
        <BP.BreakMark x={760} y={560} w={120} q={p(t, 2.6, 3.0)} />
      </svg>
      <BP.Caption t={t} pages={fakePage('Caption mono dengan tanda potong', 0.3)} />
    </AbsoluteFill>
  );
};

// Landscape 1920×1080: one drawing sheet in two columns — a title block on the left (sheet number, statement, typed
// specs, a hatched section sample) and the exploded iso drawing on the right with its callouts kept inside x ≤ 1810.
// Callouts go on the drawing's free (right) side so labels never cross the title block. The drawing and its dimension
// line end above y ≈ 800; the caption is bottom-anchored below (kit default).
const BlueprintWide: React.FC<{t: number}> = ({t}) => {
  const {W, H} = useFrame();
  const iso = BP.isoAt(1230, 560, 310);
  const lift = 0.3 * p(t, 1.6, 2.2);
  return (
    <AbsoluteFill style={{background: BP.B.bg}}>
      <svg width={W} height={H}>
        <defs>
          <pattern id="sgw-min" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M 36 0 L 0 0 0 36" fill="none" stroke="#fff" strokeOpacity="0.07" /></pattern>
          <pattern id="sgw-maj" width="180" height="180" patternUnits="userSpaceOnUse"><path d="M 180 0 L 0 0 0 180" fill="none" stroke="#fff" strokeOpacity="0.15" strokeWidth="1.5" /></pattern>
        </defs>
        <rect width={W} height={H} fill="url(#sgw-min)" /><rect width={W} height={H} fill="url(#sgw-maj)" />
        {/* title block (left column) */}
        <BP.Typed x={120} y={190} text="DETAIL A — CONTOH" t={t} start={0.1} size={34} color={BP.B.cyan} />
        <text x={116} y={300} fill={BP.B.line} style={{fontFamily: BP.HEAD, fontWeight: 700, fontSize: 104}}>Gambar teknik</text>
        <line x1={120} y1={350} x2={760} y2={350} {...BP.line(p(t, 0.4, 1.0), 2, BP.B.line2)} />
        <BP.Typed x={120} y={420} text="01  KEYCAP   · ABS" t={t} start={0.7} size={30} />
        <BP.Typed x={120} y={470} text="02  MODUL    · SAKLAR" t={t} start={1.0} size={30} color={BP.B.yellow} />
        <BP.Typed x={120} y={520} text="SKALA 1:1   · mm" t={t} start={1.3} size={30} color={BP.B.line2} />
        <BP.Hatch x={120} y={590} w={170} h={170} q={p(t, 1.0, 1.6)} id="sgw-h" />
        <BP.Typed x={320} y={690} text="POTONGAN A–A" t={t} start={1.5} size={26} color={BP.B.line2} />
        {/* exploded drawing (right column) */}
        <BP.IsoBox iso={iso} x0={-0.5} x1={0.5} y0={-0.5} y1={0.5} z0={0} z1={0.3} q={p(t, 0.3, 1.3)} />
        <BP.IsoBox iso={iso} x0={-0.5} x1={0.5} y0={-0.5} y1={0.5} z0={0.4 + lift} z1={0.76 + lift} topInset={0.12} q={p(t, 0.7, 1.6)} />
        <BP.Callout a={iso(0.42, -0.25, 0.9)} l={[1560, 200]} n="1" label="KEYCAP" t={t} start={2.0} />
        <BP.Callout a={iso(0.35, 0.1, 0.12)} l={[1560, 700]} n="2" label="MODUL" t={t} start={2.3} color={BP.B.yellow} />
        <BP.Dim a={[960, 790]} b={[1500, 790]} text="DIMENSI 720" q={p(t, 2.4, 3.0)} />
        <BP.BreakMark x={1690} y={440} w={130} q={p(t, 2.6, 3.0)} />
      </svg>
      <BP.Caption t={t} pages={fakePage('Caption mono dengan tanda potong', 0.3)} />
    </AbsoluteFill>
  );
};
