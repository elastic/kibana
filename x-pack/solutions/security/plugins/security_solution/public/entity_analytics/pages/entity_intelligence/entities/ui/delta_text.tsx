/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { formatDelta } from '../presentation';

/**
 * A small, quiet trend delta. Color is a *signal*, not decoration: the danger
 * token appears ONLY when the change is a worsening of an actionable metric
 * (e.g. more high-risk entities / rising risk). Improvements and neutral moves
 * stay subdued so the eye is only drawn to things getting worse. A flat or
 * unavailable delta renders a muted em dash to keep a consistent baseline.
 */
export const DeltaText: React.FC<{
  value: number | undefined;
  /** When true, an increase is bad (worsening → danger). Default false. */
  invert?: boolean;
  /** Neutral metrics are always muted regardless of direction. */
  neutral?: boolean;
}> = ({ value, invert = false, neutral = false }) => {
  const { euiTheme } = useEuiTheme();

  if (value === undefined || value === 0) {
    return (
      <span
        css={css`
          font-size: 11px;
          line-height: 1;
          color: ${euiTheme.colors.textDisabled};
          font-variant-numeric: tabular-nums;
        `}
      >
        {'—'}
      </span>
    );
  }

  const up = value > 0;
  // Only a worsening move of an actionable metric earns danger color.
  const worsening = !neutral && (invert ? up : !up);
  const color = worsening ? euiTheme.colors.textDanger : euiTheme.colors.textSubdued;

  return (
    <span
      css={css`
        display: inline-flex;
        align-items: center;
        gap: 2px;
        font-size: 11px;
        line-height: 1;
        font-weight: ${euiTheme.font.weight.medium};
        color: ${color};
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      `}
    >
      <span
        css={css`
          font-size: 7px;
          line-height: 1;
        `}
        aria-hidden="true"
      >
        {up ? '▲' : '▼'}
      </span>
      {formatDelta(value)}
    </span>
  );
};
