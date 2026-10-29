/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrushEndListener } from '@elastic/charts';
import type { TimeRange } from '../hooks/use_time_range';

/** Receives the time range dragged over a chart, as absolute ISO dates. */
export type TimeRangeSelect = (timeRange: TimeRange) => void;

/** A chart's `onBrushEnd` that selects the range dragged over its time axis. */
export const onBrushTimeRange =
  (onTimeRangeSelect: TimeRangeSelect): BrushEndListener =>
  (brushArea) => {
    const [start, end] = ('x' in brushArea && brushArea.x) || [];
    // A time axis gives epoch milliseconds.
    if (typeof start === 'number' && typeof end === 'number') {
      onTimeRangeSelect({
        rangeFrom: new Date(start).toISOString(),
        rangeTo: new Date(end).toISOString(),
      });
    }
  };
