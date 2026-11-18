import React from 'react';
import {AbsoluteFill} from 'remotion';
import {StyleFonts} from './shared';
import {ArsipDemo} from './arsip/demo';
import {BlueprintDemo} from './blueprint/demo';
import {SketsaDemo} from './sketsa/demo';
import {HikayatDemo} from './hikayat/demo';
import {GeometrikDemo} from './geometrik/demo';
import {TerminalDemo} from './terminal/demo';
import {LantangDemo} from './lantang/demo';
import {FlatlifeDemo} from './flatlife/demo';
import {CairDemo} from './cair/demo';
import {PetaDemo} from './peta/demo';
import {KlipingDemo} from './kliping/demo';
import {LempungDemo} from './lempung/demo';
import {KasetDemo} from './kaset/demo';
import {PikselDemo} from './piksel/demo';
import {TitikDemo} from './titik/demo';
import {MabarDemo} from './mabar/demo';

// The sixteen kit looks in StyleGallery order. Each demo is 4 s and reads useFrame(), so the same component renders
// the portrait sheet (StyleGallery, Look-<ID>) and the landscape sheet (StyleGalleryWide, Look-<ID>-Wide).
// MIDNIGHT and MINIATUR use the base kit: KitGallery / KitGalleryWide.
export const LOOKS: Array<{id: string; Demo: React.FC}> = [
  {id: 'ARSIP', Demo: ArsipDemo},
  {id: 'BLUEPRINT', Demo: BlueprintDemo},
  {id: 'SKETSA', Demo: SketsaDemo},
  {id: 'HIKAYAT', Demo: HikayatDemo},
  {id: 'GEOMETRIK', Demo: GeometrikDemo},
  {id: 'TERMINAL', Demo: TerminalDemo},
  {id: 'LANTANG', Demo: LantangDemo},
  {id: 'FLATLIFE', Demo: FlatlifeDemo},
  {id: 'CAIR', Demo: CairDemo},
  {id: 'PETA', Demo: PetaDemo},
  {id: 'KLIPING', Demo: KlipingDemo},
  {id: 'LEMPUNG', Demo: LempungDemo},
  {id: 'KASET', Demo: KasetDemo},
  {id: 'PIKSEL', Demo: PikselDemo},
  {id: 'TITIK', Demo: TitikDemo},
  {id: 'MABAR', Demo: MabarDemo},
];

/** One look's demo on its own (Look-<ID> / Look-<ID>-Wide compositions). */
export const LookDemo: React.FC<{id: string}> = ({id}) => {
  const Demo = LOOKS.find((l) => l.id === id)?.Demo ?? (() => null);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <StyleFonts />
      <Demo />
    </AbsoluteFill>
  );
};
