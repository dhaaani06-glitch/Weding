import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {CaptionPage} from '../../components/WordCaptions';
import {p, StyleFonts, useFrame} from '../shared';
import {
  BarsPattern, CC, Chrome, CrtTv, Crt, Floor, Globe, GOLD, HEAD, hitBands, K, Osd, OSD, pauseBand, PictureStack, slam, slide, StatRow, Tab, TapeLayer, trackBand, VhsFilter, VhsTape,
} from './kit';

// KASET StyleGallery demo (QA sheet, never a delivery): a 90s broadcast played back from tape — studio set,
// chrome title, a TV on colour bars, a tape sliding in, a stat row; a tracking band rolls through, then the deck
// PAUSEs (frozen picture + jitter + noise band) and plays on. Deck OSD, date stamp and Line-21 captions stay crisp.
// Landscape (Look-KASET-Wide): the same studio set re-composed for 16:9 — the floor and globe span the width, the
// headline stack (tab, chrome title, stat row) is a left column, the TV + tape sit right; date stamp bottom-left,
// Line-21 captions bottom-centre beside it. Same beats, same timing.

const fakePage = (text: string, start: number): CaptionPage[] => {
  const ws = text.split(' ').map((word, i) => ({i, word, start: start + i * 0.32, end: start + i * 0.32 + 0.28}));
  return [{start, end: start + 6, words: ws}];
};
const PAGES = fakePage('CAPTION CONTOH GAYA KASET', 0.05);
const PAUSE: [number, number] = [2.9, 3.55];

const Scene: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill style={{background: `radial-gradient(ellipse 85% 55% at 50% 34%, #3A5CF7 0%, ${K.blue} 46%, ${K.navy} 100%)`, overflow: 'hidden'}}>
    <Floor t={t} horizon={1180} />
    <div style={{position: 'absolute', left: 140, top: 250, opacity: 0.35}}><Globe t={t} r={380} /></div>
    <div style={{position: 'absolute', left: 64, top: 236, ...slide(t, -0.2, -500, 0, 0.4)}}>
      <Tab bg={K.red} fg={K.white} size={80}>SIARAN KHUSUS</Tab>
    </div>
    <div style={{position: 'absolute', left: 0, right: 0, top: 340, display: 'flex', justifyContent: 'center'}}>
      <Chrome text="CONTOH" size={240} grad={GOLD} deep="#6A2A0A" n={14} glint={p(t, 1.0, 1.8)} style={slam(t, 0.3, 1.5)} />
    </div>
    <div style={{position: 'absolute', left: 150, top: 690}}>
      <CrtTv w={600} screen={(sw, sh) => (
        <>
          <BarsPattern w={sw} h={sh} />
          <div style={{position: 'absolute', left: sw * 0.16, right: sw * 0.16, top: sh * 0.3, height: sh * 0.34, background: '#06060A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{fontFamily: OSD, fontSize: 20, letterSpacing: 4, color: K.yellow}}>KANAL 9</div>
            <div style={{fontFamily: HEAD, fontSize: 56, lineHeight: 1, color: K.white}}>KASUS CONTOH</div>
          </div>
        </>
      )} />
    </div>
    <div style={{position: 'absolute', left: 560, top: 1010, transform: 'rotate(7deg)'}}>
      <div style={slide(t, 0.75, 700, 0, 0.4)}><VhsTape w={400} t={t} label="CONTOH" /></div>
    </div>
    <div style={{position: 'absolute', left: 90, top: 1250, ...slide(t, 1.3, -900, 0, 0.35)}}>
      <StatRow label="FORMAT" value="CONTOH" w={760} size={80} />
    </div>
  </AbsoluteFill>
);

// 16:9: 110 px side margins; left column x 110–890 under the OSD (tab 226, chrome title 330–580, stat row 640), right
// column TV + tape (x 1150–1800, antenna from y 64, TV feet clear of the caption row); horizon 720 so the TV stands on the grid; the bottom 250 px belong
// to the date stamp (left) and the Line-21 captions (centre).
const WideScene: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill style={{background: `radial-gradient(ellipse 72% 92% at 46% 30%, #3A5CF7 0%, ${K.blue} 46%, ${K.navy} 100%)`, overflow: 'hidden'}}>
    <Floor t={t} horizon={720} />
    <div style={{position: 'absolute', left: 190, top: 90, opacity: 0.35}}><Globe t={t} r={330} /></div>
    <div style={{position: 'absolute', left: 110, top: 226, ...slide(t, -0.2, -500, 0, 0.4)}}>
      <Tab bg={K.red} fg={K.white} size={80}>SIARAN KHUSUS</Tab>
    </div>
    <div style={{position: 'absolute', left: 110, top: 330}}>
      <Chrome text="CONTOH" size={240} grad={GOLD} deep="#6A2A0A" n={14} glint={p(t, 1.0, 1.8)} style={slam(t, 0.3, 1.5)} />
    </div>
    <div style={{position: 'absolute', left: 1150, top: 316}}>
      <CrtTv w={600} screen={(sw, sh) => (
        <>
          <BarsPattern w={sw} h={sh} />
          <div style={{position: 'absolute', left: sw * 0.16, right: sw * 0.16, top: sh * 0.3, height: sh * 0.34, background: '#06060A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{fontFamily: OSD, fontSize: 20, letterSpacing: 4, color: K.yellow}}>KANAL 9</div>
            <div style={{fontFamily: HEAD, fontSize: 56, lineHeight: 1, color: K.white}}>KASUS CONTOH</div>
          </div>
        </>
      )} />
    </div>
    <div style={{position: 'absolute', left: 1416, top: 662, transform: 'rotate(7deg)'}}>
      <div style={slide(t, 0.75, 700, 0, 0.4)}><VhsTape w={360} t={t} label="CONTOH" /></div>
    </div>
    <div style={{position: 'absolute', left: 110, top: 640, ...slide(t, 1.3, -900, 0, 0.35)}}>
      <StatRow label="FORMAT" value="CONTOH" w={780} size={80} />
    </div>
  </AbsoluteFill>
);

export const KasetDemo: React.FC = () => {
  const fr = useFrame();
  const t = useCurrentFrame() / useVideoConfig().fps;
  const paused = t >= PAUSE[0] && t < PAUSE[1];
  const tp = paused ? PAUSE[0] : t;
  const jitter = paused ? (Math.floor(t * 15) % 2 ? 3 : -3) : 0;
  const bands = fr.wide
    ? [...trackBand(t, 1.2, 2.3, fr.H), ...hitBands(t, 0.3, 330, 260), ...pauseBand(t, PAUSE[0], PAUSE[1], fr.H)]
    : [...trackBand(t, 1.2, 2.3), ...hitBands(t, 0.3, 380, 300), ...pauseBand(t, PAUSE[0], PAUSE[1])];
  const S = fr.wide ? WideScene : Scene;
  const since = paused ? PAUSE[0] : t >= PAUSE[1] ? PAUSE[1] : 0;
  return (
    <AbsoluteFill style={{background: '#030304', overflow: 'hidden'}}>
      <StyleFonts />
      <VhsFilter />
      <PictureStack t={t} scene={(x) => <S t={paused ? tp : x} />} bands={bands} jitter={jitter} />
      <TapeLayer t={t} />
      <Osd mode={paused ? 'PAUSE' : 'PLAY'} pop={p(t, since, since + 0.12)} counter={4521 + t - Math.max(0, Math.min(t, PAUSE[1]) - PAUSE[0])}
        line1="TAHUN 1993" line2={`21:04:${String(17 + Math.floor(t)).padStart(2, '0')}`} />
      <CC t={t} pages={PAGES} />
      <Crt />
    </AbsoluteFill>
  );
};
