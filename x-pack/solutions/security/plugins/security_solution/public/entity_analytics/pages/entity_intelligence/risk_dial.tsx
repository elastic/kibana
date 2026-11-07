/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { RiskLevel } from './common';
import { getRiskLevelColor } from './common';

const DIAL_DIMENSIONS = {
  m: { size: 132, stroke: 10, fontSize: 30 },
  l: { size: 156, stroke: 12, fontSize: 38 },
} as const;

export type RiskDialSize = keyof typeof DIAL_DIMENSIONS;

/**
 * Circular SVG gauge showing the normalized risk score (0-100) with a
 * severity-colored arc.
 */
export const RiskDial: React.FC<{
  score: number | undefined;
  level: RiskLevel;
  levelLabel?: string;
  size?: RiskDialSize;
}> = ({ score, level, levelLabel, size = 'm' }) => {
  const { euiTheme } = useEuiTheme();
  const { size: DIAL_SIZE, stroke: STROKE_WIDTH, fontSize } = DIAL_DIMENSIONS[size];
  const color = getRiskLevelColor(euiTheme, level);
  const radius = (DIAL_SIZE - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, score ?? 0));
  const dashOffset = circumference * (1 - clampedScore / 100);

  const wrapperStyle = css`
    position: relative;
    width: ${DIAL_SIZE}px;
    height: ${DIAL_SIZE}px;
    margin: 0 auto;
  `;

  const centerStyle = css`
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
  `;

  const scoreStyle = css`
    font-size: ${fontSize}px;
    line-height: 1;
    font-weight: ${euiTheme.font.weight.bold};
    font-variant-numeric: tabular-nums;
    color: ${euiTheme.colors.textHeading};
  `;

  const levelStyle = css`
    font-size: 11px;
    font-weight: ${euiTheme.font.weight.semiBold};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color};
  `;

  return (
    <div css={wrapperStyle} data-test-subj="entityIntelligenceRiskDial">
      <svg
        width={DIAL_SIZE}
        height={DIAL_SIZE}
        viewBox={`0 0 ${DIAL_SIZE} ${DIAL_SIZE}`}
        role="img"
        aria-hidden="true"
      >
        <circle
          cx={DIAL_SIZE / 2}
          cy={DIAL_SIZE / 2}
          r={radius}
          fill="none"
          stroke={euiTheme.colors.lightestShade}
          strokeWidth={STROKE_WIDTH}
        />
        <circle
          cx={DIAL_SIZE / 2}
          cy={DIAL_SIZE / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${DIAL_SIZE / 2} ${DIAL_SIZE / 2})`}
        />
      </svg>
      <div css={centerStyle}>
        <span css={scoreStyle}>{score !== undefined ? Math.round(score) : '—'}</span>
        <span css={levelStyle}>{levelLabel ?? level}</span>
      </div>
    </div>
  );
};

/** Minimal SVG polyline sparkline for risk score history (0-100 domain). */
export const RiskSparkline: React.FC<{ values: number[]; color: string; height?: number }> = ({
  values,
  color,
  height = 48,
}) => {
  const { euiTheme } = useEuiTheme();
  const width = 280;
  if (values.length < 2) {
    return null;
  }
  const stepX = width / (values.length - 1);
  const points = values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - (Math.max(0, Math.min(100, value)) / 100) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-hidden="true"
      css={css`
        display: block;
        border-bottom: ${euiTheme.border.thin};
      `}
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
};
