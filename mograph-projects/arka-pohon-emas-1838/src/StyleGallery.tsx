import React from 'react';
import {AbsoluteFill, Sequence, useVideoConfig} from 'remotion';
import {StyleFonts} from './styles/shared';
import {LOOKS} from './styles/registry';

// QA sheet for the sixteen named style kits (src/styles/<look>/demo.tsx, order in src/styles/registry.tsx): 4 s each.
// StyleGallery = portrait 1080×1920 (npm run style-preview), StyleGalleryWide = landscape 1920×1080
// (npm run style-preview-wide); the same demo components re-compose for the wide frame via useFrame().
// Never the delivered video; the render always uses `Mograph`.

export const StyleGallery: React.FC = () => {
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <StyleFonts />
      {LOOKS.map(({id, Demo}, i) => (
        <Sequence key={id} from={i * 4 * fps} durationInFrames={4 * fps}><Demo /></Sequence>
      ))}
    </AbsoluteFill>
  );
};
