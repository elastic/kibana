/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InventoryColorPalette,
  InfraWaffleMapLegend,
  InfraWaffleMapStepRule,
} from '../../../../common/inventory/types';
import { getColorPalette } from './get_color_palette';

export const createLegend = (
  name: InventoryColorPalette,
  steps: number = 10,
  reverse: boolean = false,
  rules: InfraWaffleMapStepRule[] = [],
  type: 'gradient' | 'steps' = 'gradient'
): InfraWaffleMapLegend => {
  const paletteColors = getColorPalette(name, steps, reverse);
  return type === 'steps' && rules.length > 0
    ? {
        type: 'steps',
        rules,
      }
    : {
        type: 'steppedGradient',
        rules: paletteColors.map((color, index) => ({
          color,
          value: (index + 1) / steps,
        })),
      };
};
