/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from '@emotion/styled';
import type { InventoryColorPalette } from '../../../../../common/inventory/types';
import { getColorPalette } from '../../lib/get_color_palette';

interface Props {
  palette: InventoryColorPalette;
  steps: number;
  reverse: boolean;
}

export const PalettePreview = ({ steps, palette, reverse }: Props) => {
  const colors = getColorPalette(palette, steps, reverse);
  return (
    <Swatches>
      {colors.map((color) => (
        <Swatch key={color} style={{ backgroundColor: color }} />
      ))}
    </Swatches>
  );
};

const Swatch = styled.div`
  max-width: 15px;
  height: 12px;
  flex: 1 1 auto;
  &:first-child {
    border-radius: ${(props) => props.theme.euiTheme.border.radius} 0 0 ${(props) =>
  props.theme.euiTheme.border.radius};
  }
  &:last-child {
    border-radius: 0 ${(props) => props.theme.euiTheme.border.radius} ${(props) =>
  props.theme.euiTheme.border.radius} 0;
`;

const Swatches = styled.div`
  display: flex;
`;
