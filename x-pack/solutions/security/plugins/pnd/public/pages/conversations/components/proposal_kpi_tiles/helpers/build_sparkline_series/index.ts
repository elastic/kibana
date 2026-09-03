/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndActivityBucket, RecommendedAction } from '@kbn/pnd-common';

/** One hour of one tile's series, in the shape `@elastic/charts` accessors read. */
export interface PndSparklinePoint {
  /** Epoch milliseconds at the start of the hour, UTC — a time-scaled x value. */
  time: number;
  y: number;
}

export interface BuildSparklineSeriesParams {
  action: RecommendedAction;
  /** The route's 24 hourly buckets, oldest first, each carrying all four actions. */
  buckets: PndActivityBucket[];
}

/**
 * Pulls one tile's series out of the four the response packs into each bucket.
 *
 * The route sends one row per hour carrying every action rather than four series, because the four
 * tiles share one read. Nothing is filtered or coalesced here: every bucket becomes a point, so a
 * quiet hour draws as the zero the server sent rather than as a gap the chart would interpolate
 * across.
 */
export const buildSparklineSeries = ({
  action,
  buckets,
}: BuildSparklineSeriesParams): PndSparklinePoint[] =>
  buckets.map(({ counts, time }) => ({ time, y: counts[action] }));
