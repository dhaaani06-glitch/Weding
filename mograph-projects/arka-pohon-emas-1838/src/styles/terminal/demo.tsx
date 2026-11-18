import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import type {CaptionPage} from '../../components/WordCaptions';
import {p, pb, useFrame} from '../shared';
import * as TM from './kit';

// TERMINAL — 4 s StyleGallery demo (QA sheet, never a delivery). Moved out of StyleGallery.tsx in v1.11.
// Landscape (TerminalWide): a prompt rail across the top, then tiled windows — left ⅔: the log over a status tile that
// turns into the ALERT on the glitch; right ⅓: the lock in its own tall window. The prompt-line caption is centred
// under the tiles, HexRain and the CRT finish cover the full 1920×1080.

const fakePage = (text: string, start: number): CaptionPage[] => {
  const ws = text.split(' ').map((word, i) => ({i, word, start: start + i * 0.32, end: start + i * 0.32 + 0.28}));
  return [{start, end: start + 6, words: ws}];
};

const useT = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  return f / fps;
};

export const TerminalDemo: React.FC = () => (useFrame().wide ? <TerminalWide /> : <TerminalTall />);

const TerminalWide: React.FC = () => {
  const t = useT();
  const frame = useCurrentFrame();
  const glitch = t > 1.8 && t < 2.0;
  return (
    <AbsoluteFill style={{background: TM.T.bg}}>
      <TM.HexRain t={t} />
      <div style={{position: 'absolute', left: 110, right: 110, top: 64, display: 'flex', justifyContent: 'space-between', fontFamily: TM.MONO, fontWeight: 700, fontSize: 24, color: TM.T.g, textShadow: TM.glow()}}>
        <span>kamu@contoh:~$</span><span style={{color: TM.T.amber, textShadow: TM.glow(TM.T.amber)}}>● CONTOH · TERMINAL</span>
      </div>
      {/* left ⅔: the log, and under it a status tile that turns into the ALERT on the glitch */}
      <TM.Win x={110} y={120} w={1040} h={430} title="contoh.log" q={p(t, 0, 0.3)}>
        <div style={{fontSize: 36}}>
          <div><TM.Typed text="> scan --data" t={t} start={0.2} cps={20} cursor={t < 1.6} /></div>
          <div style={{fontSize: 52, marginTop: 14}}><TM.Bar n={24} total={31} shown={Math.floor(31 * p(t, 0.6, 1.6))} missing /></div>
          <div style={{marginTop: 20, color: TM.T.dim}}>terbaca : <TM.Typed text="24 / 31 blok" t={t} start={1.6} cps={40} cursor={false} /></div>
          <div style={{color: TM.T.dim}}>hilang&nbsp;&nbsp;: <TM.Typed text="7 blok" t={t} start={1.9} cps={40} cursor={false} color={TM.T.alert} /></div>
        </div>
      </TM.Win>
      {t < 1.8 ? (
        <TM.Win x={110} y={580} w={1040} h={220} title="status.mon" q={p(t, 0.2, 0.5)} color={TM.T.dim}>
          <div style={{fontFamily: TM.HEAD, fontSize: 110, lineHeight: 1, color: TM.T.dim, textShadow: TM.glow(TM.T.dim)}}>STATUS: NORMAL</div>
        </TM.Win>
      ) : (
        <TM.Win x={110} y={580} w={1040} h={220} title="ALERT" q={pb(t, 1.8, 2.1)} color={TM.T.alert}>
          <div style={{fontFamily: TM.HEAD, fontSize: 110, lineHeight: 1, color: TM.T.alert, textShadow: TM.glow(TM.T.alert)}}>!! ANOMALI</div>
        </TM.Win>
      )}
      {/* right ⅓: the lock in its own tall window */}
      <TM.Win x={1210} y={120} w={600} h={680} title="kunci.sys" q={p(t, 0.1, 0.4)}>
        <svg width={556} height={450} style={{display: 'block'}}><TM.Lock x={278} y={262} s={2.4} open={p(t, 2.6, 3.0)} /></svg>
        <div style={{textAlign: 'center', fontFamily: TM.HEAD, fontSize: 84, lineHeight: 1, color: t < 2.8 ? TM.T.g : TM.T.amber, textShadow: TM.glow(t < 2.8 ? TM.T.g : TM.T.amber)}}>{t < 2.8 ? 'TERKUNCI' : 'TERBUKA'}</div>
      </TM.Win>
      <TM.Glitch frame={frame} active={glitch} />
      <TM.Caption t={t} pages={fakePage('Caption prompt terminal', 0.3)} />
      <TM.CRT frame={frame} />
    </AbsoluteFill>
  );
};

const TerminalTall: React.FC = () => {
  const t = useT();
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: TM.T.bg}}>
      <TM.HexRain t={t} />
      <TM.Win x={72} y={190} w={936} h={520} title="contoh.log" q={p(t, 0, 0.3)}>
        <div><TM.Typed text="> scan --data" t={t} start={0.2} cps={20} /></div>
        <div style={{fontSize: 34, marginTop: 10}}><TM.Bar n={24} total={31} shown={Math.floor(31 * p(t, 0.6, 1.6))} missing /></div>
      </TM.Win>
      <TM.Win x={120} y={780} w={840} h={260} title="ALERT" q={pb(t, 1.8, 2.1)} color={TM.T.alert}>
        <div style={{fontFamily: TM.HEAD, fontSize: 92, lineHeight: 1, color: TM.T.alert, textShadow: TM.glow(TM.T.alert)}}>!! ANOMALI</div>
      </TM.Win>
      <svg width={1080} height={400} style={{position: 'absolute', left: 0, top: 1080}}><TM.Lock x={540} y={200} s={2} open={p(t, 2.6, 3.0)} /></svg>
      <TM.Glitch frame={frame} active={t > 1.8 && t < 2.0} />
      <TM.Caption t={t} pages={fakePage('Caption prompt terminal', 0.3)} />
      <TM.CRT frame={frame} />
    </AbsoluteFill>
  );
};
