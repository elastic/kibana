/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { difference, first } from 'lodash';
import { colorVis } from '@elastic/eui-theme-borealis';

export type Color =
  | 'color0'
  | 'color1'
  | 'color2'
  | 'color3'
  | 'color4'
  | 'color5'
  | 'color6'
  | 'color7'
  | 'color8'
  | 'color9';

export type Palette = {
  [K in Color]: string;
};

// Same values as EUI's euiPaletteColorBlind(), without importing @elastic/eui
const euiPalette = [
  colorVis.euiColorVis0,
  colorVis.euiColorVis1,
  colorVis.euiColorVis2,
  colorVis.euiColorVis3,
  colorVis.euiColorVis4,
  colorVis.euiColorVis5,
  colorVis.euiColorVis6,
  colorVis.euiColorVis7,
  colorVis.euiColorVis8,
  colorVis.euiColorVis9,
];

export const defaultPalette: Palette = {
  color0: euiPalette[1], // (blue)
  color1: euiPalette[2], // (pink)
  color2: euiPalette[0], // (green-ish)
  color3: euiPalette[3], // (purple)
  color4: euiPalette[4], // (light pink)
  color5: euiPalette[5], // (yellow)
  color6: euiPalette[6], // (tan)
  color7: euiPalette[7], // (orange)
  color8: euiPalette[8], // (brown)
  color9: euiPalette[9], // (red)
};

export const createPaletteTransformer = (palette: Palette) => (color: Color) => palette[color];

export const colorTransformer = createPaletteTransformer(defaultPalette);

export const sampleColor = (usedColors: Color[] = []): Color => {
  const allColors: Color[] = [
    'color0',
    'color1',
    'color2',
    'color3',
    'color4',
    'color5',
    'color6',
    'color7',
    'color8',
    'color9',
  ];
  const available = difference(allColors, usedColors);
  return first(available) || allColors[0];
};
