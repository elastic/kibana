/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import type { LegendConfig, ValueFormatter, WaffleBounds } from '../../types';
import { getColorPalette } from '../../utils/color_from_value';

interface LegendGradientProps {
  legendConfig: LegendConfig;
  bounds: WaffleBounds;
  formatter?: ValueFormatter;
}

/**
 * Legend gradient preview component showing min/max values with color scale
 */
export const LegendGradient: React.FC<LegendGradientProps> = ({
  legendConfig,
  bounds,
  formatter,
}) => {
  const { euiTheme } = useEuiTheme();
  const colors = getColorPalette(
    legendConfig.palette,
    legendConfig.steps,
    legendConfig.reverseColors
  );

  const effectiveBounds = legendConfig.autoBounds
    ? bounds
    : { min: legendConfig.bounds.min, max: legendConfig.bounds.max };

  // Use formatter if provided, otherwise fall back to toFixed(2)
  const formatValue = formatter ?? ((value: number) => value.toFixed(2));

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      css={css`
        padding: ${euiTheme.size.s};
        background: ${euiTheme.colors.lightestShade};
        border-radius: ${euiTheme.border.radius.medium};
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiText size="xs">{formatValue(effectiveBounds.min)}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <div
          css={css`
            height: 12px;
            border-radius: ${euiTheme.border.radius.small};
            background: linear-gradient(to right, ${colors.join(', ')});
          `}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">{formatValue(effectiveBounds.max)}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
