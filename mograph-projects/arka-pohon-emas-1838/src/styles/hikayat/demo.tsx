import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CaptionPage} from '../../components/WordCaptions';
import {p, useFrame} from '../shared';
import * as HK from './kit';

// HIKAYAT — 4 s StyleGallery demo (QA sheet, never a delivery). Moved out of StyleGallery.tsx in v1.11.
// Landscape (HikayatWide): the kelir spans the width, a mountain range stretched with scalePts runs behind, the
// gunungan opens centre stage and sweeps off left, then two puppets face each other across the screen.

const fakePage = (text: string, start: number): CaptionPage[] => {
  const ws = text.split(' ').map((word, i) => ({i, word, start: start + i * 0.32, end: start + i * 0.32 + 0.28}));
  return [{start, end: start + 6, words: ws}];
};

const useT = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return f / fps;
};

export const HikayatDemo: React.FC = () => (useFrame().wide ? <HikayatWide /> : <HikayatTall />);

const RANGE = HK.scalePts(HK.MOUNTAINS, 1.65, 0.9);

const HikayatWide: React.FC = () => {
  const t = useT();
  const {W, H} = useFrame();
  const sweep = p(t, 1.2, 2.2);
  return (
    <AbsoluteFill style={{background: HK.H.dark}}>
      <HK.Kelir t={t} />
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        <HK.HikDefs />
        <HK.Silhouette id="sg-mtn" parts={[{poly: RANGE, perforate: 24}]} x={960} y={770} opacity={0.55} rod={false} />
        <HK.Silhouette id="sg-gun" parts={[{poly: HK.GUNUNGAN, perforate: 19}]} x={960 - 1500 * sweep} y={830} s={0.72} rot={-30 * sweep} extra={<HK.GununganOrnament />} />
        <HK.Silhouette id="sg-woman" parts={HK.WOMAN} x={640} y={820} s={1.15} opacity={p(t, 1.9, 2.5)} />
        <HK.Silhouette id="sg-king" parts={HK.KING} x={1290} y={820} s={1.15} flip opacity={p(t, 1.6, 2.2)} />
      </svg>
      <HK.Lontar x={110} y={64} w={780} q={p(t, 0.2, 0.6)}><div style={{...HK.lontarTitle(48), width: '100%', textAlign: 'center'}}>HIKAYAT · CONTOH</div></HK.Lontar>
      <HK.Stage />
      <HK.Caption t={t} pages={fakePage('Caption di daun lontar', 0.3)} />
    </AbsoluteFill>
  );
};

const HikayatTall: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{background: HK.H.dark}}>
      <HK.Kelir t={t} />
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <HK.HikDefs />
        <HK.Silhouette id="sg-mtn" parts={[{poly: HK.MOUNTAINS, perforate: 24}]} x={540} y={1180} opacity={0.55} rod={false} />
        <HK.Silhouette id="sg-gun" parts={[{poly: HK.GUNUNGAN, perforate: 19}]} x={540 - 1300 * p(t, 1.2, 2.2)} y={1460} s={1.08} rot={-30 * p(t, 1.2, 2.2)} extra={<HK.GununganOrnament />} />
        <HK.Silhouette id="sg-king" parts={HK.KING} x={720} y={1430} s={1.25} flip opacity={p(t, 1.6, 2.2)} />
        <HK.Silhouette id="sg-woman" parts={HK.WOMAN} x={380} y={1430} s={1.25} opacity={p(t, 1.9, 2.5)} />
      </svg>
      <HK.Lontar x={90} y={230} w={900} q={p(t, 0.2, 0.6)}><div style={{...HK.lontarTitle(52), width: '100%', textAlign: 'center'}}>HIKAYAT · CONTOH</div></HK.Lontar>
      <HK.Stage />
      <HK.Caption t={t} pages={fakePage('Caption di daun lontar', 0.3)} />
    </AbsoluteFill>
  );
};
