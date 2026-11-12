/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SPARKLINE_WIDTH = 72;
export const SPARKLINE_HEIGHT = 16;
export const SPARKLINE_BUCKETS = 12;
export const FAILED_RUN_STATUSES = new Set(['failed', 'cancelled', 'timed_out']);
export const RUNNING_RUN_STATUSES = new Set([
  'pending',
  'waiting',
  'waiting_for_input',
  'waiting_for_child',
  'running',
  'queued',
]);

export const toSparklinePath = (values: number[], max: number): string => {
  const step = SPARKLINE_WIDTH / (values.length - 1);
  const points = values.map((value, index) => ({
    x: index * step,
    y: SPARKLINE_HEIGHT - 1 - (value / max) * (SPARKLINE_HEIGHT - 2),
  }));
  return points
    .map(({ x, y }, index) => {
      if (index === 0) return `M${x},${y}`;
      const previous = points[index - 1];
      const midX = (previous.x + x) / 2;
      return `C${midX},${previous.y} ${midX},${y} ${x},${y}`;
    })
    .join(' ');
};
