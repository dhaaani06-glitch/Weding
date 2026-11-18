import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CaptionPage} from '../../components/WordCaptions';
import {drawOn, p, pb, roughEllipse, useFrame} from '../shared';
import * as SK from './kit';

// SKETSA — 4 s StyleGallery demo (QA sheet, never a delivery). Moved out of StyleGallery.tsx in v1.11.
// Portrait: one column down the page. Landscape (SketsaWide): one wide ruled page — title top-left, the spotlight
// scene as the visual (thought bubble | lamp + figure, left ⅔), the pie + circled number as the note column (right ⅓),
// caption at the bottom; the note column is pencilled in from frame 0 so the page is never half empty.

const fakePage = (text: string, start: number): CaptionPage[] => {
  const ws = text.split(' ').map((word, i) => ({i, word, start: start + i * 0.32, end: start + i * 0.32 + 0.28}));
  return [{start, end: start + 6, words: ws}];
};

const useT = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return f / fps;
};

export const SketsaDemo: React.FC = () => (useFrame().wide ? <SketsaWide /> : <SketsaTall />);

const SketsaWide: React.FC = () => {
  const t = useT();
  const frame = useCurrentFrame();
  const {W, H} = useFrame();
  return (
    <AbsoluteFill>
      <SK.Page>
        <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0}}>
          <defs><SK.Boil id="sg-boil" frame={frame} /></defs>
          <g filter="url(#sg-boil)">
            <SK.Swipe x={186} y={140} w={480} h={62} q={p(t, 0, 0.6)} />
            <text x={190} y={200} fill={SK.S.ink} style={{fontFamily: SK.HEAD, fontSize: 100}}>Buku catatan</text>
            {/* pencil underdrawing: bubble and note column are sketched before the ink arrives */}
            <g opacity={0.7 - 0.6 * p(t, 2.0, 3.0)}>
              <path d={roughEllipse(410, 395, 210, 105, 9, 0.04)} {...SK.pen(1, 2.6, SK.PENCIL)} />
              <path d={roughEllipse(1310, 520, 160, 160, 4, 0.03)} {...SK.pen(1, 2.6, SK.PENCIL)} />
              <path d={roughEllipse(1630, 520, 125, 92, 7)} {...SK.pen(1, 2.6, SK.PENCIL)} />
              <path d={`M 1240 790 L 1700 790`} {...SK.pen(1, 2.6, SK.PENCIL)} />
            </g>
            {/* visual: lamp, cone and figure, the thought bubble beside the head */}
            <SK.Spotlight lamp={[780, 300]} target={[780, 820]} spread={220} q={p(t, 0.4, 1.0)} seed={3} lampScale={1.5} />
            <SK.Sc x={780} y={820} ox={780} oy={820} k={1.75}><SK.Stick x={780} base={820} q={p(t, 0.5, 1.6)} seed={5} style="spiky" color={SK.S.coral} /></SK.Sc>
            <SK.Bubble x={200} y={290} w={420} h={210} q={pb(t, 1.6, 2.0)} seed={9} tail={[700, 520]} thought>
              <text x={410} y={418} textAnchor="middle" fill={SK.S.ink} style={{fontFamily: SK.HEAD, fontSize: 68}}>hmm…</text>
            </SK.Bubble>
            {/* note column: hatched pie, the number circled in marker, a handwritten label under both */}
            <SK.Pie cx={1310} cy={520} r={160} part={0.25} q={p(t, 2.0, 2.4)} fill={p(t, 2.2, 2.8)} color={SK.S.yellow} seed={4} id="sg-pie" />
            <SK.Write id="sg-pct" x={1630} y={556} q={p(t, 2.45, 2.8)} size={104} color={SK.S.coral} anchor="middle" w={240}>25%</SK.Write>
            <path d={roughEllipse(1630, 520, 125, 92, 7)} {...drawOn(p(t, 2.6, 3.1))} fill="none" stroke={SK.S.coral} strokeWidth={6} strokeLinecap="round" />
            <SK.Write id="sg-note" x={1470} y={770} q={p(t, 2.9, 3.4)} size={72} anchor="middle" w={620}>cuma seperempat!</SK.Write>
          </g>
        </svg>
      </SK.Page>
      <SK.Caption t={t} pages={fakePage('Caption tulisan tangan dengan stabilo', 0.3)} />
    </AbsoluteFill>
  );
};

const SketsaTall: React.FC = () => {
  const t = useT();
  const {fps} = useVideoConfig();
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <SK.Page>
        <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
          <defs><SK.Boil id="sg-boil" frame={frame} /></defs>
          <g filter="url(#sg-boil)">
            <SK.Swipe x={136} y={232} w={480} h={62} q={p(t, 0, 0.6)} />
            <text x={140} y={292} fill={SK.S.ink} style={{fontFamily: SK.HEAD, fontSize: 100}}>Buku catatan</text>
            <SK.Spotlight lamp={[540, 470]} target={[540, 1150]} spread={200} q={p(t, 0.4, 1.0)} seed={3} lampScale={1.4} />
            <SK.Sc x={540} y={1150} ox={540} oy={1150} k={1.5}><SK.Stick x={540} base={1150} q={p(t, 0.5, 1.6)} seed={5} style="spiky" color={SK.S.coral} /></SK.Sc>
            <SK.Bubble x={600} y={560} w={380} h={190} q={pb(t, 1.6, 2.0)} seed={9} tail={[600, 820]} thought>
              <text x={790} y={672} textAnchor="middle" fill={SK.S.ink} style={{fontFamily: SK.HEAD, fontSize: 60}}>hmm…</text>
            </SK.Bubble>
            <SK.Pie cx={240} cy={1300} r={110} part={0.25} q={p(t, 2.0, 2.4)} fill={p(t, 2.2, 2.8)} color={SK.S.yellow} seed={4} id="sg-pie" />
            <path d={roughEllipse(850, 1300, 120, 80, 7)} {...drawOn(p(t, 2.6, 3.1))} fill="none" stroke={SK.S.coral} strokeWidth={6} strokeLinecap="round" />
          </g>
        </svg>
      </SK.Page>
      <SK.Caption t={t} pages={fakePage('Caption tulisan tangan dengan stabilo', 0.3 + 0 * fps)} />
    </AbsoluteFill>
  );
};
