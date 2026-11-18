import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {StyleFonts} from '../shared';
import type {CaptionPage} from '../../components/WordCaptions';
import {
  alignWalk, Banner, Buddy, Cells, DayTile, DialogFrame, DialogText, FieldBg, Hero, hop, Hud, MenuBg, opening, P, Pointer, PxScreen, pxShake,
  Sparkle, Spr, STAR, step, tick, Trans, Tx, typed, useFontsReady, usePx, Win,
} from './kit';

// PIKSEL StyleGallery demo (QA sheet, 4 s): a quest on the overworld (walking hero + habit buddy, quest window with a day
// counter and XP cells, a LEVEL UP banner), then a square-sweep into the status menu (portrait, HP cells taking a "-3" hit,
// inventory tiles, command menu with the pointer). Captions = the RPG dialog box.
// Landscape (Look-PIKSEL-Wide): the same grid turned sideways (480×270 logical, ×4). Content lives in y 40–170 between
// the Hud (y 16) and the full-width dialog box (y 184–240): the overworld becomes a wide field with the quest window
// top-left and the party on the path; the status menu becomes two columns (status + commands | inventory grid).

const fakePage = (text: string, start: number): CaptionPage[] => {
  const ws = text.split(' ').map((word, i) => ({i, word, start: start + i * 0.32, end: start + i * 0.32 + 0.28}));
  return [{start, end: start + 6, words: ws}];
};
const PAGES: CaptionPage[] = [{...fakePage('Contoh caption gaya PIKSEL', 0.1)[0], end: 2.3}, ...fakePage('Kotak dialog RPG, mesin ketik', 2.3)];
const XW: [number, number] = [2.05, 2.3];
const LEVEL = 1.3;
const HIT = 2.95;

const Overworld: React.FC<{t: number}> = ({t}) => {
  const day = Math.min(12, Math.floor(tick(t) * 9) + 1);
  const cheer = t >= alignWalk(LEVEL);
  return (
    <g>
      <FieldBg t={t} scroll={t * 24} />
      <Win x={12} y={54} w={246} h={74} tone="blue">
        <Tx x={24} y={62} c={P.yellow}>QUEST:</Tx>
        <Tx x={80} y={62}>{typed('CONTOH', t, 0.15)}</Tx>
        <Tx x={24} y={78} c={P.g1}>HARI</Tx>
        <Tx x={24} y={92} s={24} c={day >= 12 ? P.yellow : P.white} sh={P.ink}>{String(day).padStart(2, '0')}</Tx>
        <Tx x={132} y={78} c={P.g1}>XP</Tx>
        <Cells x={132} y={94} n={12} cw={7} h={14} color={(i) => (i < day ? (i % 2 ? P.green : P.lime) : P.g3)} />
      </Win>
      {t >= LEVEL && <Banner y={136} open={opening(t, LEVEL)} tone="gold" l1="LEVEL UP!" c1={P.white} sh={P.red} />}
      <Sparkle x={18} y={132} t={t} at={LEVEL + 0.08} dur={0.7} />
      <Sparkle x={244} y={160} t={t} at={LEVEL + 0.2} dur={0.7} />
      <Buddy x={36} y={236} s={3} t={t} />
      <Hero x={100} y={194} s={4} t={t} walk={!cheer} cheer={cheer} />
      {t >= LEVEL && <Tx x={172} y={180 + hop(t, LEVEL, 6)} s={16} c={P.yellow} ol={P.ink} sh={P.red}>+1</Tx>}
    </g>
  );
};

const StatusMenu: React.FC<{t: number}> = ({t}) => {
  const sh = pxShake(t, [HIT], 2);
  const hp = t < HIT + 0.08 ? 20 : t < HIT + 0.18 ? 19 : t < HIT + 0.28 ? 18 : 17;
  const k = t - HIT;
  const dmgY = k < 0 ? 0 : k < 0.1 ? -Math.round((k / 0.1) * 14) : k < 0.22 ? -14 + Math.round(((k - 0.1) / 0.12) * 8) : -6;
  return (
    <g>
      <MenuBg t={t} id="dotsDemo" />
      <g transform={`translate(${sh.x} ${sh.y})`}>
        <Win x={12} y={56} w={246} h={96} tone="blue">
          <rect x={22} y={134} width={64} height={6} fill={P.ink} />
          <Buddy x={22} y={68} s={4} t={t} mood={t >= HIT && t < HIT + 0.5 ? 'hurt' : 'happy'} />
          <Tx x={100} y={66} s={16} c={P.yellow} sh={P.ink}>CONTOH</Tx>
          <Tx x={100} y={90} c={P.g1}>HP</Tx>
          <Cells x={120} y={89} n={20} cw={5} h={10} color={(i) => (i < hp ? (i % 2 ? P.green : P.lime) : i < 20 && t >= HIT ? P.red : P.g3)} />
          <Tx x={100} y={110} s={16} c={hp < 20 ? P.red : P.white} sh={P.ink}>{String(hp)}</Tx>
          <Tx x={132} y={110} s={16} c={P.g1} sh={P.ink}>/20</Tx>
          {t >= HIT && <Tx x={38} y={72 + dmgY} s={24} c={P.yellow} ol={P.ink} sh={P.red}>-3</Tx>}
        </Win>
      </g>
      <Win x={12} y={158} w={246} h={92} tone="dark">
        <Tx x={24} y={166} c={P.g1}>INVENTORI</Tx>
        {Array.from({length: 16}).map((_, i) => {
          const at = 2.45 + (i % 8) * 0.04 + Math.floor(i / 8) * 0.16;
          const x = 26 + (i % 8) * 28, y = 182 + Math.floor(i / 8) * 28;
          return t >= at ? <DayTile key={i} x={x} y={y + hop(t, at, 2)} w={22} h={20} n={i + 1} /> : <rect key={i} x={x} y={y} width={22} height={20} fill={P.g3} />;
        })}
      </Win>
      <Win x={12} y={256} w={246} h={86} tone="blue">
        <Tx x={36} y={268} c={P.yellow}>SELIDIKI</Tx>
        <Tx x={150} y={268}>TANYA</Tx>
        <Tx x={36} y={290}>ITEM</Tx>
        <Tx x={150} y={290}>KABUR</Tx>
        <Pointer x={22} y={265} t={t} />
        <Spr m={STAR} x={206} y={306 + (step(t, 2) % 2)} />
        <Tx x={36} y={318} c={P.lime}>{typed('HADIAH +1', t, 3.3)}</Tx>
      </Win>
    </g>
  );
};

// ───── landscape (480×270 logical): two columns at x 28–232 and 244–452 ─────
const OverworldWide: React.FC<{t: number}> = ({t}) => {
  const day = Math.min(12, Math.floor(tick(t) * 9) + 1);
  const cheer = t >= alignWalk(LEVEL);
  return (
    <g>
      <FieldBg t={t} scroll={t * 24} />
      <Win x={28} y={42} w={204} h={70} tone="blue">
        <Tx x={40} y={50} c={P.yellow}>QUEST:</Tx>
        <Tx x={96} y={50}>{typed('CONTOH', t, 0.15)}</Tx>
        <Tx x={40} y={66} c={P.g1}>HARI</Tx>
        <Tx x={40} y={80} s={24} c={day >= 12 ? P.yellow : P.white} sh={P.ink}>{String(day).padStart(2, '0')}</Tx>
        <Tx x={118} y={66} c={P.g1}>XP</Tx>
        <Cells x={118} y={82} n={12} cw={7} h={14} color={(i) => (i < day ? (i % 2 ? P.green : P.lime) : P.g3)} />
      </Win>
      {t >= LEVEL && <Banner x={252} y={46} w={200} open={opening(t, LEVEL)} tone="gold" l1="LEVEL UP!" c1={P.white} sh={P.red} />}
      <Sparkle x={256} y={42} t={t} at={LEVEL + 0.08} dur={0.7} />
      <Sparkle x={440} y={70} t={t} at={LEVEL + 0.2} dur={0.7} />
      <Buddy x={262} y={118} s={3} t={t} />
      <Hero x={318} y={78} s={4} t={t} walk={!cheer} cheer={cheer} />
      {t >= LEVEL && <Tx x={390} y={86 + hop(t, LEVEL, 6)} s={16} c={P.yellow} ol={P.ink} sh={P.red}>+1</Tx>}
    </g>
  );
};

const StatusMenuWide: React.FC<{t: number}> = ({t}) => {
  const sh = pxShake(t, [HIT], 2);
  const hp = t < HIT + 0.08 ? 20 : t < HIT + 0.18 ? 19 : t < HIT + 0.28 ? 18 : 17;
  const k = t - HIT;
  const dmgY = k < 0 ? 0 : k < 0.1 ? -Math.round((k / 0.1) * 14) : k < 0.22 ? -14 + Math.round(((k - 0.1) / 0.12) * 8) : -6;
  return (
    <g>
      <MenuBg t={t} id="dotsDemo" />
      <g transform={`translate(${sh.x} ${sh.y})`}>
        <Win x={28} y={42} w={212} h={78} tone="blue">
          <rect x={38} y={102} width={64} height={6} fill={P.ink} />
          <Buddy x={38} y={52} s={4} t={t} mood={t >= HIT && t < HIT + 0.5 ? 'hurt' : 'happy'} />
          <Tx x={112} y={52} s={16} c={P.yellow} sh={P.ink}>CONTOH</Tx>
          <Tx x={112} y={74} c={P.g1}>HP</Tx>
          <Cells x={130} y={73} n={20} cw={4} h={10} color={(i) => (i < hp ? (i % 2 ? P.green : P.lime) : i < 20 && t >= HIT ? P.red : P.g3)} />
          <Tx x={112} y={92} s={16} c={hp < 20 ? P.red : P.white} sh={P.ink}>{String(hp)}</Tx>
          <Tx x={144} y={92} s={16} c={P.g1} sh={P.ink}>/20</Tx>
          {t >= HIT && <Tx x={54} y={56 + dmgY} s={24} c={P.yellow} ol={P.ink} sh={P.red}>-3</Tx>}
        </Win>
      </g>
      <Win x={28} y={124} w={212} h={46} tone="blue">
        <Tx x={52} y={132} c={P.yellow}>SELIDIKI</Tx>
        <Tx x={150} y={132}>TANYA</Tx>
        <Tx x={52} y={146}>ITEM</Tx>
        <Tx x={150} y={146}>KABUR</Tx>
        <Pointer x={38} y={129} t={t} />
        <Tx x={52} y={158} c={P.lime}>{typed('HADIAH +1', t, 3.3)}</Tx>
        <Spr m={STAR} x={208} y={140 + (step(t, 2) % 2)} />
      </Win>
      <Win x={248} y={42} w={204} h={128} tone="dark">
        <Tx x={260} y={50} c={P.g1}>INVENTORI</Tx>
        {Array.from({length: 16}).map((_, i) => {
          const at = 2.45 + (i % 4) * 0.04 + Math.floor(i / 4) * 0.08;
          const x = 260 + (i % 4) * 46, y = 64 + Math.floor(i / 4) * 26;
          return t >= at ? <DayTile key={i} x={x} y={y + hop(t, at, 2)} w={38} h={20} n={i + 1} /> : <rect key={i} x={x} y={y} width={38} height={20} fill={P.g3} />;
        })}
      </Win>
    </g>
  );
};

export const PikselDemo: React.FC = () => {
  useFontsReady();
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const {wide} = usePx();
  const O = wide ? OverworldWide : Overworld, M = wide ? StatusMenuWide : StatusMenu;
  return (
    <AbsoluteFill style={{background: P.ink}}>
      <StyleFonts />
      <PxScreen>
        {t < XW[0] ? <O t={t} /> : t < XW[1] ? <Trans kind="squares" t={t} a={XW[0]} b={XW[1]} id="dx" from={<O t={t} />} to={<M t={t} />} /> : <M t={t} />}
        <Hud chapter={t < (XW[0] + XW[1]) / 2 ? 'CONTOH' : 'STATUS'} idx={t < (XW[0] + XW[1]) / 2 ? 1 : 2} n={5} t={t} />
        <DialogFrame t={t} pages={PAGES} />
      </PxScreen>
      <DialogText t={t} pages={PAGES} />
    </AbsoluteFill>
  );
};
