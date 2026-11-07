/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { transparentize, useEuiTheme } from '@elastic/eui';

/**
 * A quiet, ambient sparkline: a thin subdued line over a very faint fill, with
 * no bright accent. It reads as texture/context, never as a colored signal.
 * All colors are EUI theme tokens (tracks dark/light). A unique gradient id per
 * instance avoids SVG `<defs>` collisions when many are on screen.
 */
export const Sparkline: React.FC<{
  values: number[];
  width?: number;
  height?: number;
}> = ({ values, width = 72, height = 22 }) => {
  const { euiTheme } = useEuiTheme();
  const stroke = euiTheme.colors.textSubdued;
  const gradientId = useMemo(() => `spark-${Math.random().toString(36).slice(2, 9)}`, []);

  const { line, area } = useMemo(() => {
    if (values.length < 2) return { line: '', area: '' };
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const norm = values.map((v) => (hi === lo ? 0.5 : (v - lo) / (hi - lo)));
    const step = width / (norm.length - 1);
    const y = (p: number) => (1 - p) * (height - 4) + 2;
    const pts = norm.map((p, i) => `${(i * step).toFixed(1)},${y(p).toFixed(1)}`);
    const linePath = pts.map((pt, i) => `${i ? 'L' : 'M'}${pt}`).join(' ');
    const areaPath = `${linePath} L${width.toFixed(1)},${height} L0,${height} Z`;
    return { line: linePath, area: areaPath };
  }, [values, width, height]);

  if (!line) return null;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={transparentize(stroke, 0.85)} />
          <stop offset="100%" stopColor={transparentize(stroke, 1)} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} stroke="none" />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
    </svg>
  );
};
