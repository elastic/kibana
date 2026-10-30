/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { difference, first, values } from 'lodash';

// Pure color identifiers shared by server and browser code. The mapping to actual
// EUI palette colors lives in `./color_palette`, which browser code imports.

export enum Color {
  color0 = 'color0',
  color1 = 'color1',
  color2 = 'color2',
  color3 = 'color3',
  color4 = 'color4',
  color5 = 'color5',
  color6 = 'color6',
  color7 = 'color7',
  color8 = 'color8',
  color9 = 'color9',
}

export type Palette = {
  [K in keyof typeof Color]: string;
};

export const sampleColor = (usedColors: Color[] = []): Color => {
  const available = difference(values(Color) as Color[], usedColors);
  return first(available) || Color.color0;
};
