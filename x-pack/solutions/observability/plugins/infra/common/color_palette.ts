/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteColorBlind } from '@elastic/eui';
import { Color } from './color';
import type { Palette } from './color';

export { Color, sampleColor } from './color';
export type { Palette } from './color';

const euiPalette = euiPaletteColorBlind();

export const defaultPalette: Palette = {
  // TODO: Waiting for the designer input on the colors mapping
  // As a temp solution, in the old palette, colors 0..3 are the dark colors, 4..6 are the light colors and 7..9 dark again
  // I followed the same pattern here for the new palette
  [Color.color0]: euiPalette[0],
  [Color.color1]: euiPalette[2],
  [Color.color2]: euiPalette[4],
  [Color.color3]: euiPalette[6],
  [Color.color4]: euiPalette[1],
  [Color.color5]: euiPalette[3],
  [Color.color6]: euiPalette[5],
  [Color.color7]: euiPalette[8],
  [Color.color8]: euiPalette[9],
  [Color.color9]: euiPalette[7],
};

export const createPaletteTransformer = (palette: Palette) => (color: Color) => palette[color];

export const colorTransformer = createPaletteTransformer(defaultPalette);
