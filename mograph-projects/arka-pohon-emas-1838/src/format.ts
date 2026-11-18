import {useVideoConfig} from 'remotion';
import project from './project.json';

// Delivery format (v1.11). Portrait 1080×1920 is the default; landscape 1920×1080 only when the buyer asks for it in
// words ("landscape", "16:9", "horizontal", "buat YouTube"). Set "format": "landscape" in src/project.json: the
// `Mograph` composition, render-safe, stills and the export gate all follow it. A landscape film is RE-COMPOSED for
// the wide frame (layouts read useFrame()), never a portrait film cropped or padded.

export type Format = 'portrait' | 'landscape';
export const FORMAT: Format = (project as {format?: string}).format === 'landscape' ? 'landscape' : 'portrait';
export const SIZE = {portrait: {width: 1080, height: 1920}, landscape: {width: 1920, height: 1080}} as const;

export type Frame = {
  /** canvas width / height in px */
  W: number;
  H: number;
  /** true for 16:9 landscape */
  wide: boolean;
  /** canvas centre */
  cx: number;
  cy: number;
  /** keep headlines, labels and CTAs inside these margins (platform UI sits outside them) */
  safe: {top: number; bottom: number; side: number};
  /** default top edge of a caption block */
  captionY: number;
  /** default max caption width */
  captionW: number;
  /** pick(portraitValue, landscapeValue) */
  pick: <T>(portrait: T, landscape: T) => T;
};

export const frameOf = (W: number, H: number): Frame => {
  const wide = W > H;
  return {
    W, H, wide, cx: W / 2, cy: H / 2,
    safe: wide ? {top: 64, bottom: 120, side: 110} : {top: 160, bottom: 280, side: 100},
    captionY: wide ? H - 250 : 1470,
    captionW: wide ? 1400 : 940,
    pick: (a, b) => (wide ? b : a),
  };
};

/** Size of the composition being rendered (Mograph, StyleGalleryWide, Look-<X>-Wide …) with layout helpers. */
export const useFrame = (): Frame => {
  const {width, height} = useVideoConfig();
  return frameOf(width, height);
};
