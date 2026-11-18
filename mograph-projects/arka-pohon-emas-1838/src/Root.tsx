import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Main';
import {KitGallery} from './KitGallery';
import {StyleGallery} from './StyleGallery';
import {LookDemo, LOOKS} from './styles/registry';
import {FORMAT, SIZE} from './format';
import project from './project.json';

const P = SIZE.portrait, L = SIZE.landscape;

export const Root: React.FC = () => (
  <>
  {/* The delivered video. Size follows "format" in src/project.json (portrait default, landscape on request). */}
  <Composition
    id="Mograph"
    component={Main}
    width={SIZE[FORMAT].width}
    height={SIZE[FORMAT].height}
    fps={60}
    durationInFrames={Math.max(60, Math.ceil(project.durationSeconds * 60))}
  />
  {/* Component kit preview / QA sheet: npm run kit-preview (-wide). Never the delivered video. */}
  <Composition id="KitGallery" component={KitGallery} width={P.width} height={P.height} fps={60} durationInFrames={28 * 60} />
  <Composition id="KitGalleryWide" component={KitGallery} width={L.width} height={L.height} fps={60} durationInFrames={28 * 60} />
  {/* Named style kits QA sheet: npm run style-preview (-wide). Never the delivered video. */}
  <Composition id="StyleGallery" component={StyleGallery} width={P.width} height={P.height} fps={60} durationInFrames={LOOKS.length * 4 * 60} />
  <Composition id="StyleGalleryWide" component={StyleGallery} width={L.width} height={L.height} fps={60} durationInFrames={LOOKS.length * 4 * 60} />
  {/* One look at a time (4 s): npm run stills -- --comp=Look-KASET-Wide out/qc 0.5 1.5 2.5 3.5 */}
  {LOOKS.map(({id}) => (
    <React.Fragment key={id}>
      <Composition id={`Look-${id}`} component={LookDemo} defaultProps={{id}} width={P.width} height={P.height} fps={60} durationInFrames={4 * 60} />
      <Composition id={`Look-${id}-Wide`} component={LookDemo} defaultProps={{id}} width={L.width} height={L.height} fps={60} durationInFrames={4 * 60} />
    </React.Fragment>
  ))}
  </>
);
