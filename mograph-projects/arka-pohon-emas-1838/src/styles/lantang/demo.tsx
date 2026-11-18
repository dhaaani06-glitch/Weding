import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CaptionPage} from '../../components/WordCaptions';
import {StyleFonts, useFrame} from '../shared';
import {Caption, Card, Echo, fillWdth, fl, Folio, Grain, L, Line, lineW, ps, punch, Roll, Rule, Stack, Tag, useMeasure, W, Walls} from './kit';

// LANTANG — 4 s StyleGallery demo (QA sheet, never a delivery): three cards that wipe over each other —
// justified lines landing word by word with a slam + echo, a word that stretches and a word walled in,
// an odometer number with the folio and the kinetic caption.
// Landscape (LantangWide): the same three cards re-set for 16:9 — card 1 as a two-column poster (980 + 80 gutter +
// 640, each column justified to its own width), card 2 as one stack on the full 1700 px measure (MELAR stretches
// across it, PADAT. is squeezed from wdth ≈126 to 50 by walls that come in from the frame edges), card 3 as words
// left + odometer right with the kinetic caption on 1400 px at the bottom.

const fakePage = (text: string, start: number): CaptionPage[] => {
  const ws = text.split(' ').map((word, i) => ({i, word, start: start + i * 0.32, end: start + i * 0.32 + 0.28}));
  return [{start, end: start + 6, words: ws}];
};
const PAGES = fakePage('Caption ikut kata ini', 2.9);
const PADAT = 400;
const PADAT_FILL = fillWdth('PADAT.', PADAT, W - 90, 0.01, 780);

export const LantangDemo: React.FC = () => (useFrame().wide ? <LantangWide /> : <LantangTall />);

const PADAT_WIDE = 320;
const PADAT_WIDE_FILL = fillWdth('PADAT.', PADAT_WIDE, 1700 - 150, 0.01, 780);

const LantangWide: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const {w: M} = useMeasure(); // 1700
  const sh = punch(t, [0.35, 2.1]);
  const wallQ = ps(t, 2.05, 2.55);
  const padW = PADAT_WIDE_FILL + (50 - PADAT_WIDE_FILL) * wallQ;
  return (
    <AbsoluteFill style={{background: L.ink, overflow: 'hidden'}}>
      <StyleFonts />
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px)`}}>
        {/* 1 — two-column poster: tag + CONTOH + slammed KATA (x 110, 980 wide) | JADI / GAMBAR / DI LAYAR. (x 1170, 640).
            While only the left block has landed it sits centred (x 470); it trucks left as the right column arrives. */}
        <Card t={t} start={0} until={1.95} bg={L.ink} wipe="cut">
          <AbsoluteFill style={{transform: `translateX(${360 * (1 - ps(t, 0.58, 0.9))}px)`}}>
          <Stack left={110} width={980} top={156} justify="flex-start" gap={22}>
            <Tag t={t} at={-0.3} text="KASUS CONTOH" bg={L.hot} color={L.ink} size={84} rot={-2} />
            <Line t={t} words={[{text: 'CONTOH', at: -0.25}]} {...fl('CONTOH', 300, undefined, 980)} />
            <div style={{position: 'relative', flexShrink: 0}}>
              <Echo t={t} at={0.35} text="KATA" {...fl('KATA', 400, undefined, 980)} color={L.hot} n={2} />
              <Line t={t} words={[{text: 'KATA', at: 0.35, color: L.hot}]} {...fl('KATA', 400, undefined, 980)} mode="slam" align="center" />
            </div>
          </Stack>
          <Stack left={1170} width={640} top={272} justify="flex-start" gap={22}>
            <Line t={t} words={[{text: 'JADI', at: 0.75, outline: L.paper}]} {...fl('JADI', 240, undefined, 640)} mode="pop" />
            <Line t={t} words={[{text: 'GAMBAR', at: 0.95}]} {...fl('GAMBAR', 240, undefined, 640)} mode="pop" />
            <Rule t={t} at={1.1} dur={0.35} h={16} color={L.hot} />
            <Line t={t} words={[{text: 'DI', at: 1.2}, {text: 'LAYAR.', at: 1.32, outline: L.paper}]} {...fl(['DI', 'LAYAR.'], 200, undefined, 640)} />
          </Stack>
          </AbsoluteFill>
        </Card>
        {/* 2 — one stack on the full measure: the stretch and the squeeze use the width */}
        <Card t={t} start={1.5} until={3.3} bg={L.hot} wipe="circle" dur={0.4}>
          <Stack gap={34}>
            <Line t={t} words={[{text: 'MELAR', at: 1.45, color: L.ink}]} {...fl('MELAR', 330, undefined, M)} mode="stretch" fromWdth={58} />
            <Rule t={t} at={1.75} dur={0.4} h={16} color={L.ink} />
            <div style={{position: 'relative', flexShrink: 0}}>
              <Walls q={wallQ} inner={lineW(['PADAT.'], padW, PADAT_WIDE, 0.01, 780)} h={PADAT_WIDE * 0.9} color={L.ink} />
              <Line t={t} words={[{text: 'PADAT.', at: 1.9}]} size={PADAT_WIDE} wdth={padW} weight={780} ls={0.01} align="center" />
            </div>
            <Line t={t} words={[{text: 'LEBAR', at: 2.25, color: L.ink}, {text: 'ATAU', at: 2.4}, {text: 'SEMPIT', at: 2.55, color: L.ink}]} {...fl(['LEBAR', 'ATAU', 'SEMPIT'], 130, undefined, M)} />
          </Stack>
        </Card>
        {/* 3 — words left (x 110, 700), odometer right (x 880, 930), caption on 1400 px at the bottom */}
        <Card t={t} start={2.85} until={9} bg={L.paper} wipe="up">
          <Folio t={t} dur={4} color={L.ink} label="TOPIK · CONTOH" show={2.85} />
          <Stack left={110} width={700} top={120} bottom={250} gap={24}>
            <Line t={t} words={[{text: 'ANGKA', at: 2.75}]} {...fl('ANGKA', 220, undefined, 700)} color={L.ink} />
            <Line t={t} words={[{text: 'CONTOH', at: 2.95, color: L.blue}]} {...fl('CONTOH', 220, undefined, 700)} />
            <Rule t={t} at={3.2} dur={0.5} h={14} color={L.ink} />
          </Stack>
          <Stack left={880} width={930} top={120} bottom={250}>
            <Roll t={t} value="100" start={2.85} lock={3.45} step={0.12} size={620} wdth={66} color={L.hot} />
          </Stack>
          <Caption t={t} pages={PAGES} color={L.ink} />
        </Card>
      </AbsoluteFill>
      <Grain />
    </AbsoluteFill>
  );
};

const LantangTall: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const sh = punch(t, [0.35, 2.1]);
  const wallQ = ps(t, 2.05, 2.55);
  const padW = PADAT_FILL + (50 - PADAT_FILL) * wallQ;
  return (
    <AbsoluteFill style={{background: L.ink, overflow: 'hidden'}}>
      <StyleFonts />
      <AbsoluteFill style={{transform: `translate(${sh.x}px, ${sh.y}px)`}}>
        {/* 1 — justified lines, slam + echo */}
        <Card t={t} start={0} until={1.95} bg={L.ink} wipe="cut">
          <Stack gap={22}>
            <Tag t={t} at={-0.3} text="KASUS CONTOH" bg={L.hot} color={L.ink} size={84} rot={-2} />
            <Line t={t} words={[{text: 'CONTOH', at: -0.25}]} {...fl('CONTOH', 360)} />
            <div style={{position: 'relative', flexShrink: 0}}>
              <Echo t={t} at={0.35} text="KATA" {...fl('KATA', 420)} color={L.hot} n={2} />
              <Line t={t} words={[{text: 'KATA', at: 0.35, color: L.hot}]} {...fl('KATA', 420)} mode="slam" align="center" />
            </div>
            <Line t={t} words={[{text: 'JADI', at: 0.75, outline: L.paper}, {text: 'GAMBAR', at: 0.95}]} {...fl(['JADI', 'GAMBAR'], 220)} mode="pop" />
            <Rule t={t} at={1.1} dur={0.35} h={16} color={L.hot} />
            <Line t={t} words={[{text: 'DI', at: 1.2}, {text: 'LAYAR.', at: 1.32, outline: L.paper}]} {...fl(['DI', 'LAYAR.'], 170)} />
          </Stack>
        </Card>
        {/* 2 — a word stretches, a word gets walled in */}
        <Card t={t} start={1.5} until={3.3} bg={L.hot} wipe="circle" dur={0.4}>
          <Stack gap={40}>
            <Line t={t} words={[{text: 'MELAR', at: 1.45, color: L.ink}]} {...fl('MELAR', 420)} mode="stretch" fromWdth={58} />
            <Rule t={t} at={1.75} dur={0.4} h={16} color={L.ink} />
            <div style={{position: 'relative', flexShrink: 0}}>
              <Walls q={wallQ} inner={lineW(['PADAT.'], padW, PADAT, 0.01, 780)} h={PADAT * 0.9} color={L.ink} />
              <Line t={t} words={[{text: 'PADAT.', at: 1.9}]} size={PADAT} wdth={padW} weight={780} ls={0.01} align="center" />
            </div>
            <Line t={t} words={[{text: 'LEBAR', at: 2.25, color: L.ink}, {text: 'ATAU', at: 2.4}, {text: 'SEMPIT', at: 2.55, color: L.ink}]} {...fl(['LEBAR', 'ATAU', 'SEMPIT'], 150)} />
          </Stack>
        </Card>
        {/* 3 — odometer number, folio and the kinetic caption */}
        <Card t={t} start={2.85} until={9} bg={L.paper} wipe="up">
          <Folio t={t} dur={4} color={L.ink} label="TOPIK · CONTOH" show={2.85} />
          <Stack gap={24} top={240} bottom={640}>
            <Line t={t} words={[{text: 'ANGKA', at: 2.75}, {text: 'CONTOH', at: 2.95, color: L.blue}]} {...fl(['ANGKA', 'CONTOH'], 180)} color={L.ink} />
            <Roll t={t} value="100" start={2.85} lock={3.45} step={0.12} size={520} wdth={66} color={L.hot} />
            <Rule t={t} at={3.2} dur={0.5} h={14} color={L.ink} />
          </Stack>
          <Caption t={t} pages={PAGES} color={L.ink} top={1330} size={130} />
        </Card>
      </AbsoluteFill>
      <Grain />
    </AbsoluteFill>
  );
};
