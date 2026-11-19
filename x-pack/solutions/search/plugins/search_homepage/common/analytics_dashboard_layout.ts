/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsDashboardGrid } from './analytics';

const GRID_WIDTH = 48;
const METRIC_HEIGHT = 7;
const CHART_HEIGHT = 13;

/** The column a time series is bucketed into, in built-in and generated panels alike. */
export const TIME_BUCKET_COLUMN = 'bucket';
export const TIME_BUCKETS = 30;

/**
 * Turns time buckets into labels in time order. Lens draws nothing on a time axis when every
 * event falls into one bucket and Elasticsearch does not report the bucket width, which is what
 * a source that has just started to receive events looks like; categories always draw.
 */
export const TIME_BUCKETS_AS_LABELS = `SORT ${TIME_BUCKET_COLUMN} | EVAL ${TIME_BUCKET_COLUMN} = DATE_FORMAT("MMM d, HH:mm", ${TIME_BUCKET_COLUMN})`;

/** Metrics share the first row; charts follow two to a row, the first one wide when left over. */
export const layOutDashboardGrids = (
  metricCount: number,
  chartCount: number
): { metrics: AnalyticsDashboardGrid[]; charts: AnalyticsDashboardGrid[] } => {
  const metricWidth = GRID_WIDTH / Math.max(metricCount, 1);
  const hasWideChart = chartCount % 2 === 1;
  const chartsTop = metricCount > 0 ? METRIC_HEIGHT : 0;

  return {
    metrics: Array.from({ length: metricCount }, (_, index) => ({
      x: index * metricWidth,
      y: 0,
      w: metricWidth,
      h: METRIC_HEIGHT,
    })),
    charts: Array.from({ length: chartCount }, (_, index) => {
      if (hasWideChart && index === 0) {
        return { x: 0, y: chartsTop, w: GRID_WIDTH, h: CHART_HEIGHT };
      }
      const position = hasWideChart ? index + 1 : index;

      return {
        x: (position % 2) * (GRID_WIDTH / 2),
        y: chartsTop + Math.floor(position / 2) * CHART_HEIGHT,
        w: GRID_WIDTH / 2,
        h: CHART_HEIGHT,
      };
    }),
  };
};
