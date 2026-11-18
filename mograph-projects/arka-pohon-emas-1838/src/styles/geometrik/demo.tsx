import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CaptionPage} from '../../components/WordCaptions';
import {pb, useFrame} from '../shared';
import * as GM from './kit';

// GEOMETRIK — 4 s StyleGallery demo (QA sheet, never a delivery). Moved out of StyleGallery.tsx in v1.11.

const fakePage = (text: string, start: number): CaptionPage[] => {
  const ws = text.split(' ').map((word, i) => ({i, word, start: start + i * 0.32, end: start + i * 0.32 + 0.28}));
  return [{start, end: start + 6, words: ws}];
};

const useT = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return f / fps;
};

export const GeometrikDemo: React.FC = () => {
  const t = useT();
  const {wide} = useFrame();
  if (wide) return <GeometrikWide t={t} />;
  return (
    <AbsoluteFill>
      <GM.GridPage />
      <div style={{position: 'absolute', left: 72, top: 200}}><GM.Big size={120} stretch={70}>DATA GEOMETRIK</GM.Big></div>
      <GM.Block x={72} y={520} w={300} h={300} color={GM.G.red} q={pb(t, 0.3, 0.7)}><GM.Big size={200} color="#fff">72</GM.Big></GM.Block>
      <GM.Block x={400} y={520} w={300} h={300} color={GM.G.yellow} q={pb(t, 0.6, 1.0)} round><GM.Big size={140}>%</GM.Big></GM.Block>
      <GM.Block x={72} y={880} w={936} h={170} color={GM.G.blue} q={GM.ps(t, 1.0, 1.4)} from="left"><div style={GM.label(44, '#fff')}>BLOK = DATA</div></GM.Block>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        {[28, 30, 31].map((n, i) => <rect key={n} x={120 + i * 300} y={1400 - n * 9 * GM.ps(t, 1.4 + i * 0.2, 1.9 + i * 0.2)} width={220} height={n * 9 * GM.ps(t, 1.4 + i * 0.2, 1.9 + i * 0.2)} fill={[GM.G.red, GM.G.blue, GM.G.ink][i]} />)}
      </svg>
      <GM.Caption t={t} pages={fakePage('Caption blok hitam stabilo kuning', 0.3)} />
    </AbsoluteFill>
  );
};

// Landscape 1920×1080 on the 90 px grid (columns at x 60 + 90n, rows at y 90n): headline across the top, the number
// and its symbol as two big shapes on the left, the bar chart on the right, one full-width colour band tying them
// together, caption bottom-anchored below the band (kit default). Same beats as portrait.
const GeometrikWide: React.FC<{t: number}> = ({t}) => {
  const {W, H} = useFrame();
  return (
    <AbsoluteFill>
      <GM.GridPage />
      <div style={{position: 'absolute', left: 150, top: 96}}><GM.Big size={140} stretch={70}>DATA GEOMETRIK</GM.Big></div>
      <GM.Block x={150} y={270} w={360} h={360} color={GM.G.red} q={pb(t, 0.3, 0.7)}><GM.Big size={240} color="#fff">72</GM.Big></GM.Block>
      <GM.Block x={540} y={270} w={360} h={360} color={GM.G.yellow} q={pb(t, 0.6, 1.0)} round><GM.Big size={170}>%</GM.Big></GM.Block>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
        {[28, 30, 31].map((n, i) => {
          const q = GM.ps(t, 1.4 + i * 0.2, 1.9 + i * 0.2);
          return <rect key={n} x={1050 + i * 270} y={630 - n * 13 * q} width={180} height={n * 13 * q} fill={[GM.G.red, GM.G.blue, GM.G.ink][i]} />;
        })}
      </svg>
      <GM.Block x={150} y={660} w={1620} h={150} color={GM.G.blue} q={GM.ps(t, 1.0, 1.4)} from="left"><div style={GM.label(48, '#fff')}>BLOK = DATA</div></GM.Block>
      <GM.Caption t={t} pages={fakePage('Caption blok hitam stabilo kuning', 0.3)} />
    </AbsoluteFill>
  );
};
