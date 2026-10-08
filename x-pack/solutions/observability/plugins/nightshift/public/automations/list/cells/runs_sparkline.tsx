/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import {
  SPARKLINE_WIDTH,
  SPARKLINE_HEIGHT,
  SPARKLINE_BUCKETS,
  FAILED_RUN_STATUSES,
  RUNNING_RUN_STATUSES,
  toSparklinePath,
} from './sparkline_path';

export const RunsSparkline = ({
  runs,
  startedAfter,
  startedBefore,
}: {
  runs: Array<{ status: string; startedAt?: string }>;
  startedAfter: string;
  startedBefore: string;
}) => {
  const { euiTheme } = useEuiTheme();
  const start = Date.parse(startedAfter);
  const span = Date.parse(startedBefore) - start;
  const series = [
    {
      color: euiTheme.colors.vis.euiColorVisSuccess0,
      matches: (status: string) => status === 'completed',
    },
    {
      color: euiTheme.colors.vis.euiColorVisDanger0,
      matches: (status: string) => FAILED_RUN_STATUSES.has(status),
    },
    {
      color: euiTheme.colors.vis.euiColorVis1,
      matches: (status: string) => RUNNING_RUN_STATUSES.has(status),
    },
  ].map(({ color, matches }) => {
    const buckets = new Array<number>(SPARKLINE_BUCKETS).fill(0);
    runs.forEach(({ status, startedAt }) => {
      if (!startedAt || !matches(status)) return;
      const bucket = Math.floor(((Date.parse(startedAt) - start) / span) * SPARKLINE_BUCKETS);
      buckets[Math.min(Math.max(bucket, 0), SPARKLINE_BUCKETS - 1)] += 1;
    });
    return { color, buckets };
  });
  const max = Math.max(1, ...series.flatMap(({ buckets }) => buckets));

  return (
    <svg
      aria-hidden="true"
      width={SPARKLINE_WIDTH}
      height={SPARKLINE_HEIGHT}
      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
    >
      {series.map(({ color, buckets }, index) => {
        if (index > 0 && buckets.every((count) => count === 0)) return null;
        const line = toSparklinePath(buckets, max);
        return (
          <g key={color}>
            <path
              d={`${line} L${SPARKLINE_WIDTH},${SPARKLINE_HEIGHT} L0,${SPARKLINE_HEIGHT} Z`}
              fill={color}
              fillOpacity={0.2}
            />
            <path d={line} fill="none" stroke={color} strokeWidth={1.5} />
          </g>
        );
      })}
    </svg>
  );
};
