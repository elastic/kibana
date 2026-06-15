/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';

export const CoverageRing = ({
  coveragePct,
  size = 40,
}: {
  coveragePct: number;
  size?: number;
}) => {
  const { euiTheme } = useEuiTheme();
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const dash = (coveragePct / 100) * circumference;
  const level =
    coveragePct >= 70 ? euiTheme.colors.success : coveragePct >= 30 ? euiTheme.colors.warning : euiTheme.colors.danger;

  return (
    <div
      css={css`
        position: relative;
        width: ${size}px;
        height: ${size}px;
        flex-shrink: 0;
      `}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        css={css`
          transform: rotate(-90deg);
        `}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={euiTheme.border.color}
          strokeWidth={3}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={level}
          strokeWidth={3}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <div
        css={css`
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${euiTheme.size.xs};
          font-weight: ${euiTheme.font.weight.medium};
        `}
      >
        {coveragePct}%
      </div>
    </div>
  );
};
