/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useEuiTheme } from '@elastic/eui';

interface RunSparklineProps {
  seed: string;
  color?: string;
  bars?: number;
  width?: number;
  height?: number;
}

const toUint32 = (n: number): number => n - Math.floor(n / 4294967296) * 4294967296;

const hashSeed = (seed: string): number => {
  let s = 0;
  for (let i = 0; i < seed.length; i++) {
    s = toUint32(s * 31 + seed.charCodeAt(i));
  }
  return s;
};

export const RunSparkline: React.FC<RunSparklineProps> = ({
  seed,
  color,
  bars = 18,
  width = 56,
  height = 18,
}) => {
  const { euiTheme } = useEuiTheme();
  const fill = color ?? euiTheme.colors.primary;

  const rects = useMemo(() => {
    let s = hashSeed(seed);
    const rnd = () => {
      s = toUint32(s * 1664525 + 1013904223);
      return s / 4294967296;
    };
    const bw = width / bars;
    return Array.from({ length: bars }, (_, i) => {
      const t = bars > 1 ? i / (bars - 1) : 1;
      const v = 0.22 + 0.58 * rnd() + 0.2 * t;
      const h = Math.max(2, v * height);
      return {
        x: i * bw,
        y: height - h,
        w: Math.max(1, bw - 1.6),
        h,
      };
    });
  }, [seed, bars, width, height]);

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx={1} fill={fill} opacity={0.75} />
      ))}
    </svg>
  );
};
