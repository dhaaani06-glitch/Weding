import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame, useVideoConfig} from 'remotion';
import {CaptionPage} from '../../components/WordCaptions';
import {lerp, p, pb, StyleFonts, useFrame} from '../shared';
import {Abs, Blob, Caption, Chip, Crystal, Drift, Glass, GlassRect, Gloss, Goo, gooFilter, Headline, Hex, K, Ring, Shot, Shots, tick, tumblerPath, txt, wave} from './kit';

// StyleGallery demo for CAIR (4 s QA sheet, never a delivery): two blobs merge into one goo mass under a frosted counter
// card, chips pop, three glass tubes fill, then a liquid sweep reveals a second shot (a tumbler filling under a glass card).

const fakePage = (text: string, start: number): CaptionPage[] => {
  const ws = text.split(' ').map((word, i) => ({i, word, start: start + i * 0.32, end: start + i * 0.32 + 0.28}));
  return [{start, end: start + 6, words: ws}];
};
const PAGES: CaptionPage[] = [
  {...fakePage('Caption kaca gaya Cair', 0.05)[0], end: 2.9},
  ...fakePage('Sapuan cairan ganti adegan', 2.95),
];

const ShotBlobs = (t: number) => {
  const merge = p(t, 0.45, 1.7, Easing.inOut(Easing.cubic));
  const R = lerp(225, 262, merge);
  const sx = lerp(880, 400, merge), sy = lerp(440, 760, merge);
  const n = Math.round(lerp(0, 120, p(tick(t), 0.15, 1.8, Easing.out(Easing.cubic))));
  const tubes = [{x: 300, to: 0.45, c: K.cyan}, {x: 540, to: 0.7, c: K.violet}, {x: 780, to: 0.9, c: K.pink}];
  return (
    <Drift t={t} seed={3}>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <Goo id="cairDemoGoo" blur={16} />
          {tubes.map((tb, i) => <clipPath key={i} id={`cairDemoTube${i}`}><rect x={tb.x - 70} y={1050} width={140} height={400} rx={70} /></clipPath>)}
        </defs>
        <g {...gooFilter('cairDemoGoo')}>
          <Blob x={400} y={760} r={R} fill={K.violet} t={t} seed={2} />
          <Blob x={sx} y={sy} r={lerp(118, 40, merge) * (1 - p(t, 1.55, 1.75))} fill={K.violet} t={t} seed={5} />
        </g>
        <Gloss x={400} y={760} r={R} />
        {tubes.map((tb, i) => {
          const f = pb(t, 0.3 + i * 0.25, 1.4 + i * 0.25);
          const lv = lerp(1450 - 70, 1450 - 400 * tb.to, f);
          return (
            <g key={i}>
              <g clipPath={`url(#cairDemoTube${i})`}>
                <path d={wave(tb.x - 80, tb.x + 80, lv, 1460, t, 5 + 10 * Math.max(0, 1 - Math.abs(f - 1) * 3), i)} fill={tb.c} />
                <path d={wave(tb.x - 80, tb.x + 80, lv + 16, 1460, t + 0.4, 4, i + 3)} fill="#ffffff22" />
              </g>
              <GlassRect x={tb.x - 70} y={1050} w={140} h={400} r={70} />
              <text x={tb.x} y={lv - 26} textAnchor="middle" fill={K.white} opacity={p(t, 1.2 + i * 0.25, 1.6 + i * 0.25)} style={txt(56, 800)}>{Math.round(tb.to * 100)}</text>
            </g>
          );
        })}
      </svg>
      <Abs x={250} w={300} y={690} style={{transform: `scale(${0.88 + 0.12 * pb(t, 0.0, 0.45)})`}}>
        <Glass style={{padding: '18px 0 22px', textAlign: 'center'}}>
          <div style={{...txt(120, 800), fontVariantNumeric: 'tabular-nums', lineHeight: 1}}>{n}</div>
          <div style={{...txt(38, 600), letterSpacing: 8, marginTop: 4}}>LITER</div>
        </Glass>
      </Abs>
      <div style={{position: 'absolute', left: 690, top: 600, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 18}}>
        <Chip t={t} at={1.5} text="Contoh A" color={K.cyan} />
        <Chip t={t} at={1.75} text="Contoh B" icon={<Hex />} />
        <Chip t={t} at={2.0} text="Contoh C" icon={<Crystal />} />
        <Chip t={t} at={2.25} text="Contoh D" icon={<Ring />} />
      </div>
      <Headline t={t} items={[{at: -1, text: 'CONTOH · CAIR'}, {at: 1.8, text: <span>Volume <span style={{color: K.cyan}}>= cairan</span></span>}]} />
    </Drift>
  );
};

const CUP = tumblerPath(540, 640, 1420, 470, 390);
const ShotGlass = (t: number) => {
  const lv = lerp(1180, 820, p(t, 2.9, 3.95, Easing.out(Easing.cubic)));
  return (
    <Drift t={t} seed={7}>
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <defs><clipPath id="cairDemoCup"><path d={CUP} /></clipPath></defs>
        <path d={CUP} fill="rgba(255,255,255,0.07)" />
        <g clipPath="url(#cairDemoCup)">
          <path d={wave(260, 820, lv, 1440, t, 14, 2)} fill={K.cyan} />
          <path d={wave(260, 820, lv + 18, 1440, t + 0.4, 8, 5)} fill="#ffffff22" />
          {[0, 1, 2, 3, 4, 5, 6].map((k) => <circle key={k} cx={380 + k * 50} cy={1380 - (((t * 220 + k * 97) % 420))} r={6 + (k % 3) * 4} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={3} />)}
        </g>
        <path d={CUP} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={4} />
        <path d="M 345 700 L 375 1330" stroke="#fff" strokeOpacity={0.3} strokeWidth={16} strokeLinecap="round" />
      </svg>
      <Abs center y={200}>
        <Glass style={{padding: '26px 64px 32px', textAlign: 'center'}}>
          <div style={txt(110, 800)}>Kasus Contoh</div>
          <div style={{...txt(44, 400), opacity: 0.9, marginTop: 6}}>kartu kaca + gelas cair</div>
        </Glass>
      </Abs>
    </Drift>
  );
};

const SHOTS: Shot[] = [
  {from: 0, render: ShotBlobs, bg: 'night'},
  {from: 3.0, render: ShotGlass, bg: 'aqua', sweep: {at: 2.85, dur: 0.8, dir: 'up', colors: [K.cyan, K.violet], seed: 3}},
];

export const CairDemo: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const fr = useFrame();
  return (
    <AbsoluteFill style={{background: K.night, overflow: 'hidden'}}>
      <StyleFonts />
      <Shots t={t} shots={fr.wide ? SHOTS_WIDE : SHOTS} />
      <Caption t={t} pages={PAGES} />
    </AbsoluteFill>
  );
};

// ---------- landscape 16:9 (1920×1080): same beats, re-composed in columns ----------
// Shot 1: the goo mass + counter card on the left third, the chips as a middle column, the three tubes on the right
// (taller, 440 px), headline top-centre. Shot 2: two columns — the glass title card left, the tumbler filling right.
const ShotBlobsWide = (t: number) => {
  const merge = p(t, 0.45, 1.7, Easing.inOut(Easing.cubic));
  const R = lerp(225, 262, merge);
  const BX = 470, BY = 540;
  const sx = lerp(930, BX, merge), sy = lerp(250, BY, merge);
  const n = Math.round(lerp(0, 120, p(tick(t), 0.15, 1.8, Easing.out(Easing.cubic))));
  const TY = 290, TH = 440, TB = TY + TH;
  const tubes = [{x: 1220, to: 0.45, c: K.cyan}, {x: 1450, to: 0.7, c: K.violet}, {x: 1680, to: 0.9, c: K.pink}];
  return (
    <Drift t={t} seed={3}>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <Goo id="cairDemoGooW" blur={16} />
          {tubes.map((tb, i) => <clipPath key={i} id={`cairDemoTubeW${i}`}><rect x={tb.x - 70} y={TY} width={140} height={TH} rx={70} /></clipPath>)}
        </defs>
        <g {...gooFilter('cairDemoGooW')}>
          <Blob x={BX} y={BY} r={R} fill={K.violet} t={t} seed={2} />
          <Blob x={sx} y={sy} r={lerp(118, 40, merge) * (1 - p(t, 1.55, 1.75))} fill={K.violet} t={t} seed={5} />
        </g>
        <Gloss x={BX} y={BY} r={R} />
        {tubes.map((tb, i) => {
          const f = pb(t, 0.3 + i * 0.25, 1.4 + i * 0.25);
          const lv = lerp(TB - 70, TB - TH * tb.to, f);
          return (
            <g key={i}>
              <g clipPath={`url(#cairDemoTubeW${i})`}>
                <path d={wave(tb.x - 80, tb.x + 80, lv, TB + 10, t, 5 + 10 * Math.max(0, 1 - Math.abs(f - 1) * 3), i)} fill={tb.c} />
                <path d={wave(tb.x - 80, tb.x + 80, lv + 16, TB + 10, t + 0.4, 4, i + 3)} fill="#ffffff22" />
              </g>
              <GlassRect x={tb.x - 70} y={TY} w={140} h={TH} r={70} />
              <text x={tb.x} y={lv - 26} textAnchor="middle" fill={K.white} opacity={p(t, 1.2 + i * 0.25, 1.6 + i * 0.25)} style={txt(56, 800)}>{Math.round(tb.to * 100)}</text>
            </g>
          );
        })}
      </svg>
      <Abs x={BX - 150} w={300} y={BY - 70} style={{transform: `scale(${0.88 + 0.12 * pb(t, 0.0, 0.45)})`}}>
        <Glass style={{padding: '18px 0 22px', textAlign: 'center'}}>
          <div style={{...txt(120, 800), fontVariantNumeric: 'tabular-nums', lineHeight: 1}}>{n}</div>
          <div style={{...txt(38, 600), letterSpacing: 8, marginTop: 4}}>LITER</div>
        </Glass>
      </Abs>
      <div style={{position: 'absolute', left: 800, top: 340, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 18}}>
        <Chip t={t} at={1.5} text="Contoh A" color={K.cyan} />
        <Chip t={t} at={1.75} text="Contoh B" icon={<Hex />} />
        <Chip t={t} at={2.0} text="Contoh C" icon={<Crystal />} />
        <Chip t={t} at={2.25} text="Contoh D" icon={<Ring />} />
      </div>
      <Headline t={t} items={[{at: -1, text: 'CONTOH · CAIR'}, {at: 1.8, text: <span>Volume <span style={{color: K.cyan}}>= cairan</span></span>}]} />
    </Drift>
  );
};

const CX2 = 1420, TOP2 = 150, BOT2 = 800;
const CUP_W = tumblerPath(CX2, TOP2, BOT2, 430, 360);
const ShotGlassWide = (t: number) => {
  const lv = lerp(TOP2 + 445, TOP2 + 150, p(t, 2.9, 3.95, Easing.out(Easing.cubic)));
  return (
    <Drift t={t} seed={7}>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <defs><clipPath id="cairDemoCupW"><path d={CUP_W} /></clipPath></defs>
        <path d={CUP_W} fill="rgba(255,255,255,0.07)" />
        <g clipPath="url(#cairDemoCupW)">
          <path d={wave(CX2 - 280, CX2 + 280, lv, BOT2 + 20, t, 14, 2)} fill={K.cyan} />
          <path d={wave(CX2 - 280, CX2 + 280, lv + 18, BOT2 + 20, t + 0.4, 8, 5)} fill="#ffffff22" />
          {[0, 1, 2, 3, 4, 5, 6].map((k) => <circle key={k} cx={CX2 - 150 + k * 50} cy={BOT2 - 40 - (((t * 220 + k * 97) % 350))} r={6 + (k % 3) * 4} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={3} />)}
        </g>
        <path d={CUP_W} fill="none" stroke="#fff" strokeOpacity={0.5} strokeWidth={4} />
        <path d={`M ${CX2 - 165} ${TOP2 + 55} L ${CX2 - 140} ${BOT2 - 75}`} stroke="#fff" strokeOpacity={0.3} strokeWidth={16} strokeLinecap="round" />
      </svg>
      <Abs x={130} w={900} y={350} style={{display: 'flex', justifyContent: 'center'}}>
        <Glass style={{padding: '26px 64px 32px', textAlign: 'center'}}>
          <div style={txt(110, 800)}>Kasus Contoh</div>
          <div style={{...txt(44, 400), opacity: 0.9, marginTop: 6}}>kartu kaca + gelas cair</div>
        </Glass>
      </Abs>
    </Drift>
  );
};

const SHOTS_WIDE: Shot[] = [
  {from: 0, render: ShotBlobsWide, bg: 'night'},
  {from: 3.0, render: ShotGlassWide, bg: 'aqua', sweep: {at: 2.85, dur: 0.8, dir: 'up', colors: [K.cyan, K.violet], seed: 3}},
];
