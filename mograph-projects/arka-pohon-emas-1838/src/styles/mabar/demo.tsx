import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {CaptionPage} from '../../components/WordCaptions';
import {lerp, p, pb, pio, useFrame} from '../shared';
import {Avatar, Burst, Chip, Cloud, Cursor, Look, MabarCaption, MabarFonts, MB, Platform, ScreenClip, Sparkle, whipDist} from './kit';
import {Button, Gem, ItemCard, LabBg, Panel, Pigeon, SkinnerBox} from './props';

// MABAR StyleGallery demo (4 s QA sheet, never a delivery): a gacha panel in a sky lobby — ★5 bait card, cursor
// click, ★3 dud, chip counter, avatar reacting, 1–2-word caption — then a whip pan to the lab: the pigeon in the
// operant box pecking the button, peck counter in the HUD chip, +1 food.
// Landscape (Look-MABAR-Wide): two columns — the hero waist-up on the left with the caption above his head, the gacha
// panel on the right; after the whip the lab is a wide set: the box centre-left, the hero watching from the right
// (player vs pigeon side by side), caption on the floor. Chip top centre, whip = W + 100.

const fakePage = (text: string, start: number, end: number): CaptionPage[] => {
  const ws = text.split(' ').map((word, i) => ({i, word, start: start + i * 0.3, end: start + i * 0.3 + 0.26}));
  return [{start, end, words: ws}];
};
const PAGES = [...fakePage('Satu lagi!', 0.1, 1.2), ...fakePage('pasti dapet', 1.25, 2.2), ...fakePage('Kotak Skinner', 2.35, 4.2)];
const HOT = {dapet: MB.gold, skinner: MB.gold};
const HERO: Look = {shirt: '#22B8A6', shirtSh: '#178A7C', pants: '#3A3F7A', pantsSh: '#2A2E5E', shoe: '#FFFFFF', hair: 'spiky', hairCol: '#3B2A1E', hairSh: '#26190F'};
const WHIP = 2.25;
const PECKS = [2.75, 3.15, 3.55];

const MabarDemoWide: React.FC = () => {
  const fr = useFrame();
  const {W, H} = fr;
  const t = useCurrentFrame() / useVideoConfig().fps;
  const click = 0.9;
  const dud = t > click + 0.1;
  const q = pio(t, WHIP - 0.12, WHIP + 0.12);
  const peck = PECKS.map((x) => (t >= x - 0.08 && t < x + 0.14 ? Math.sin(((t - x + 0.08) / 0.22) * Math.PI) : 0)).reduce((m, v) => Math.max(m, v), 0);
  const n = PECKS.filter((x) => t >= x).length;
  const D = whipDist(W);
  const press = t > click - 0.02 && t < click + 0.1 ? 1 : 0;
  return (
    <AbsoluteFill style={{background: MB.sky, overflow: 'hidden'}}>
      <MabarFonts />
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
        <defs><ScreenClip id="mbd-screen" /></defs>
        {t < WHIP + 0.15 && (
          <g transform={`translate(${-D * q} 0)`}><g clipPath="url(#mbd-screen)">
            <rect x={0} y={0} width={W} height={H} fill={MB.sky} />
            {[[230, 250, 0.8], [1760, 330, 0.9], [700, 130, 0.6], [1500, 96, 0.55]].map(([x, y, s], i) => <Cloud key={i} x={x + t * 20} y={y} s={s} />)}
            <Platform x={-80} y={900} w={W + 160} h={400} seed={3} />
            <Panel x={1260} y={540} w={860} h={640} title="GACHA">
              <g transform="translate(290 -250)"><Gem x={-60} y={0} s={0.8} /><text x={-20} y={16} fill="#fff" style={{fontFamily: "'Mabar UI', sans-serif", fontWeight: 900, fontSize: 42}}>{dud ? 900 : 1000}</text></g>
              {dud
                ? <ItemCard x={0} y={-60} s={0.8} kind="sandal" stars={3} name="Sendal Jepit" q={pb(t, click + 0.1, click + 0.3)} />
                : <ItemCard x={0} y={-60} s={0.8} kind="sword" stars={5} name="Pedang Naga" t={t} />}
              <Button x={0} y={228} w={420} label="TARIK x1" press={press} gem="100" />
            </Panel>
            <Avatar t={t} x={470} y={1278} s={1.15} look={HERO} mood={t < click + 0.3 ? 'grin' : t < 1.3 ? 'angry' : 'smug'} seed={4} lx={0.7} ly={-0.3} armL={t > 1.3 ? 150 : 8} armR={t > 1.3 ? 150 : 8} />
            <Cursor x={lerp(1700, 1330, pio(t, 0.2, click - 0.05))} y={lerp(1000, 790, pio(t, 0.2, click - 0.05))} press={press} ring={p(t, click, click + 0.35, (x) => x)} />
            <Sparkle t={t} at={click + 0.12} x={1400} y={300} col="#fff" />
            <Burst t={t} at={1.3} out={2.0} x={1560} y={330} text="LAGI!" s={0.45} rot={8} />
          </g></g>
        )}
        {t > WHIP - 0.15 && (
          <g transform={`translate(${D * (1 - q)} 0)`}><g clipPath="url(#mbd-screen)">
            <g transform="translate(960 540) scale(1) translate(-820 -1130)">
              <LabBg t={t} />
              <SkinnerBox t={t} x={560} y={1380} w={540} h={500} seeds={n} badge="MODE: ACAK" badgeCol={MB.red} mystery chuteQ={1}
                button={<g transform="translate(205 -200)"><path d="M -46 -80 h 92 v 150 h -92 Z" fill="#C9C4DB" stroke={MB.ink} strokeWidth={6} /><circle cx={0} cy={6} r={30} fill={MB.red} stroke={MB.ink} strokeWidth={6} /></g>}>
                <Pigeon t={t} x={-20} y={-8} s={0.75} peck={peck * 0.5} mood={n >= 2 ? 'wild' : 'calm'} seed={3} />
              </SkinnerBox>
              <Avatar t={t} x={1270} y={1430} s={0.72} look={HERO} mood={n >= 2 ? 'shock' : 'neutral'} seed={6} lx={-0.8} ly={0.1} armL={n >= 3 ? 40 : 6} armR={6} />
            </g>
          </g></g>
        )}
        <Chip icon={t < WHIP ? 'star' : 'peck'} text={t < WHIP ? `TARIKAN ${dud ? 1 : 0}` : `PATUK ${n}`} pop={t < WHIP ? p(t, click, click + 0.3, (x) => x) : n ? p(t, PECKS[n - 1], PECKS[n - 1] + 0.3, (x) => x) : 0} />
        {t < WHIP
          ? <MabarCaption t={t} pages={PAGES} x={470} y={420} maxW={700} hot={HOT} />
          : <MabarCaption t={t} pages={PAGES} x={900} y={910} hot={HOT} />}
      </svg>
    </AbsoluteFill>
  );
};

const MabarDemoTall: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const click = 0.9;
  const dud = t > click + 0.1;
  const q = pio(t, WHIP - 0.12, WHIP + 0.12);
  const peck = PECKS.map((x) => (t >= x - 0.08 && t < x + 0.14 ? Math.sin(((t - x + 0.08) / 0.22) * Math.PI) : 0)).reduce((m, v) => Math.max(m, v), 0);
  const n = PECKS.filter((x) => t >= x).length;
  return (
    <AbsoluteFill style={{background: MB.sky, overflow: 'hidden'}}>
      <MabarFonts />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
        <defs><clipPath id="mbd-screen"><rect x={0} y={0} width={1080} height={1920} /></clipPath></defs>
        {t < WHIP + 0.15 && (
          <g transform={`translate(${-1180 * q} 0)`}><g clipPath="url(#mbd-screen)">
            <rect x={0} y={0} width={1080} height={1920} fill={MB.sky} />
            {[[160, 250, 0.8], [880, 430, 0.9], [520, 120, 0.6]].map(([x, y, s], i) => <Cloud key={i} x={x + t * 20} y={y} s={s} />)}
            <Platform x={-80} y={1700} w={1240} h={400} seed={3} />
            <Panel x={540} y={680} w={900} h={760} title="GACHA">
              <g transform="translate(300 -300)"><Gem x={-60} y={0} s={0.8} /><text x={-20} y={16} fill="#fff" style={{fontFamily: "'Mabar UI', sans-serif", fontWeight: 900, fontSize: 42}}>{dud ? 900 : 1000}</text></g>
              {dud
                ? <ItemCard x={0} y={-60} s={0.92} kind="sandal" stars={3} name="Sendal Jepit" q={pb(t, click + 0.1, click + 0.3)} />
                : <ItemCard x={0} y={-60} s={0.92} kind="sword" stars={5} name="Pedang Naga" t={t} />}
              <Button x={0} y={270} w={440} label="TARIK x1" press={t > click - 0.02 && t < click + 0.1 ? 1 : 0} gem="100" />
            </Panel>
            <Avatar t={t} x={540} y={2090} s={1.15} look={HERO} mood={t < click + 0.3 ? 'grin' : t < 1.3 ? 'angry' : 'smug'} seed={4} ly={-0.6} armL={t > 1.3 ? 150 : 8} armR={t > 1.3 ? 150 : 8} />
            <Cursor x={lerp(900, 600, pio(t, 0.2, click - 0.05))} y={lerp(1400, 980, pio(t, 0.2, click - 0.05))} press={t > click - 0.02 && t < click + 0.1 ? 1 : 0} ring={p(t, click, click + 0.35, (x) => x)} />
            <Sparkle t={t} at={click + 0.12} x={700} y={420} col="#fff" />
            <Burst t={t} at={1.3} out={2.0} x={820} y={420} text="LAGI!" s={0.45} rot={8} />
          </g></g>
        )}
        {t > WHIP - 0.15 && (
          <g transform={`translate(${1180 * (1 - q)} 0)`}><g clipPath="url(#mbd-screen)">
            <g transform="translate(540 960) scale(1.15) translate(-600 -1080)">
              <LabBg t={t} />
              <SkinnerBox t={t} x={600} y={1380} w={540} h={500} seeds={n} badge="MODE: ACAK" badgeCol={MB.red} mystery chuteQ={1}
                button={<g transform="translate(205 -200)"><path d="M -46 -80 h 92 v 150 h -92 Z" fill="#C9C4DB" stroke={MB.ink} strokeWidth={6} /><circle cx={0} cy={6} r={30} fill={MB.red} stroke={MB.ink} strokeWidth={6} /></g>}>
                <Pigeon t={t} x={-20} y={-8} s={0.75} peck={peck * 0.5} mood={n >= 2 ? 'wild' : 'calm'} seed={3} />
              </SkinnerBox>
            </g>
          </g></g>
        )}
        <Chip icon={t < WHIP ? 'star' : 'peck'} text={t < WHIP ? `TARIKAN ${dud ? 1 : 0}` : `PATUK ${n}`} pop={t < WHIP ? p(t, click, click + 0.3, (x) => x) : n ? p(t, PECKS[n - 1], PECKS[n - 1] + 0.3, (x) => x) : 0} />
        <MabarCaption t={t} pages={PAGES} y={t < WHIP ? 1190 : 1600} hot={HOT} />
      </svg>
    </AbsoluteFill>
  );
};

export const MabarDemo: React.FC = () => (useFrame().wide ? <MabarDemoWide /> : <MabarDemoTall />);
