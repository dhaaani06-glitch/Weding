import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {CaptionPage} from '../../components/WordCaptions';
import {StyleFonts, useFrame} from '../shared';
import {Badge, Caption, flyCam, Grain, Headline, Hl, LABEL, LowerThird, MapLabel, MapView, Measure, PETA as M, pg, Pin, ScaleBar, shot, toScreen, TopVeil} from './kit';

// PETA StyleGallery demo (4 s QA sheet, not a delivery): the bundled map under a flying camera, a highlighted island,
// a pin, a distance bar, an icon badge, a lower third, the scale bar and the PETA caption.

const fakePage = (text: string, start: number): CaptionPage[] => {
  const ws = text.split(' ').map((word, i) => ({i, word, start: start + i * 0.32, end: start + i * 0.32 + 0.28}));
  return [{start, end: start + 6, words: ws}];
};
const PAGES = fakePage('Caption contoh mengikuti suara narator', 0.1);

export const PetaDemo: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  if (useFrame().wide) return <PetaWide t={t} />;
  const cam = flyCam(t, shot(109.0, -5.2, 1.0), [{at: 0.45, dur: 1.5, to: shot(110.5, -7.3, 2.6)}], 0.03);
  const S = (lon: number, lat: number) => toScreen(cam, lon, lat);
  const pin = S(110.42, -7.0), m0 = S(109.0, -6.2), m1 = S(111.6, -6.2), anchor = S(108.3, -6.95), jawa = S(110.2, -8.75);
  const ring = pg(t, 2.5, 3.6);
  return (
    <AbsoluteFill style={{background: M.sea, overflow: 'hidden'}}>
      <StyleFonts />
      <MapView
        cam={cam}
        fx={{
          fills: [{name: 'Jawa', color: M.yellow, o: 0.75 * pg(t, 0.2, 0.8)}],
          deep: pg(t, 2.5, 2.8),
          sonar: {lon: 110.42, lat: -7.0, r: 520 * pg(t, 2.5, 3.6)},
        }}
      />
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
        <MapLabel x={jawa[0]} y={jawa[1]} text="JAWA" q={pg(t, 0.3, 0.8)} size={40} />
        <Measure a={m0} b={m1} q={pg(t, 1.7, 2.3)} label="JARAK" labelQ={pg(t, 2.0, 2.4)} />
        {ring > 0 && ring < 1 && <circle cx={pin[0]} cy={pin[1]} r={520 * ring * cam.s} fill="none" stroke="#5E8C99" strokeWidth={5} opacity={1 - ring} />}
        <Pin x={pin[0]} y={pin[1]} q={pg(t, 1.2, 1.6)} t={t} color={M.red} dot={M.card} />
        <Badge x={anchor[0] - 20} y={anchor[1] - 250} q={pg(t, 1.9, 2.3)} kind="badak" anchor={anchor} t={t} r={62} ring={M.west} />
      </svg>
      <TopVeil o={1} />
      <Headline q={pg(t, -0.5, 0.05)} kicker="BAB 1 · CONTOH" size={120}>
        Kasus <Hl q={pg(t, 0.3, 1.0)}>Contoh</Hl>
      </Headline>
      <LowerThird q={pg(t, 2.4, 3.0)} top={1270} title="Lokasi Contoh" sub="KETERANGAN · SUMBER" />
      <div style={{position: 'absolute', left: 70, top: 108, display: 'flex', alignItems: 'center', gap: 12, fontFamily: LABEL, fontWeight: 800, fontSize: 24, letterSpacing: 6, color: M.ink, opacity: 0.85}}>
        <div style={{width: 26, height: 6, background: M.red}} />TOPIK · CONTOH
      </div>
      <ScaleBar cam={cam} o={0.9} />
      <Grain />
      <Caption t={t} pages={PAGES} />
    </AbsoluteFill>
  );
};

// Landscape (1920×1080) re-composition: the wide frame shows more east-west, so the camera opens on the archipelago
// (Sumatera → Sulawesi) and flies into Java + Bali + Lombok laid along the frame. Headline top-left (≤ 1000 px), scale
// bar top-right with the icon badge under it (leader line to its place), marks on the map in screen space, the lower
// third bottom-left in the open ocean ABOVE the caption band (bottom ≤ 840), caption bottom-centre. The top veil goes under the marks here (it spans the full width). flyCam gets useFrame() so toScreen() centres on this comp even when project.json is
// portrait (QA sheet); in a landscape delivery the project format already says so.
const PetaWide: React.FC<{t: number}> = ({t}) => {
  const fr = useFrame();
  const cam = flyCam(t, shot(113.6, -3.4, 0.95), [{at: 0.45, dur: 1.5, to: shot(110.4, -7.55, 3.0)}], 0.03, fr);
  const S = (lon: number, lat: number) => toScreen(cam, lon, lat);
  const pin = S(110.42, -7.0), m0 = S(111.1, -6.35), m1 = S(113.5, -6.35), anchor = S(114.0, -7.9), jawa = S(110.2, -8.75);
  const ring = pg(t, 2.5, 3.6);
  return (
    <AbsoluteFill style={{background: M.sea, overflow: 'hidden'}}>
      <StyleFonts />
      <MapView
        cam={cam}
        fx={{
          fills: [{name: 'Jawa', color: M.yellow, o: 0.75 * pg(t, 0.2, 0.8)}],
          deep: pg(t, 2.5, 2.8),
          sonar: {lon: 110.42, lat: -7.0, r: 520 * pg(t, 2.5, 3.6)},
        }}
      />
      {/* wide: the veil spans the whole top band, so draw it BEFORE the marks (a mark up there would fade) */}
      <TopVeil o={1} />
      <svg width={fr.W} height={fr.H} style={{position: 'absolute', left: 0, top: 0}}>
        <MapLabel x={jawa[0]} y={jawa[1]} text="JAWA" q={pg(t, 0.3, 0.8)} size={40} />
        <Measure a={m0} b={m1} q={pg(t, 1.7, 2.3)} label="JARAK" labelQ={pg(t, 2.0, 2.4)} />
        {ring > 0 && ring < 1 && <circle cx={pin[0]} cy={pin[1]} r={520 * ring * cam.s} fill="none" stroke="#5E8C99" strokeWidth={5} opacity={1 - ring} />}
        <Pin x={pin[0]} y={pin[1]} q={pg(t, 1.2, 1.6)} t={t} color={M.red} dot={M.card} />
        <Badge x={fr.W - fr.safe.side - 170} y={290} q={pg(t, 1.9, 2.3)} kind="badak" anchor={anchor} t={t} r={62} ring={M.west} />
      </svg>
      <Headline q={pg(t, -0.5, 0.05)} kicker="BAB 1 · CONTOH" size={116} width={900}>
        Kasus <Hl q={pg(t, 0.3, 1.0)}>Contoh</Hl>
      </Headline>
      <LowerThird q={pg(t, 2.4, 3.0)} top={676} title="Lokasi Contoh" sub="KETERANGAN · SUMBER" />
      <div style={{position: 'absolute', left: fr.safe.side, top: fr.safe.top, display: 'flex', alignItems: 'center', gap: 12, fontFamily: LABEL, fontWeight: 800, fontSize: 24, letterSpacing: 6, color: M.ink, opacity: 0.85}}>
        <div style={{width: 26, height: 6, background: M.red}} />TOPIK · CONTOH
      </div>
      <ScaleBar cam={cam} o={0.9} />
      <Grain />
      <Caption t={t} pages={PAGES} />
    </AbsoluteFill>
  );
};
