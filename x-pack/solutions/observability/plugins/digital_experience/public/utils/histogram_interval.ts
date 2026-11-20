/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { getAdjustedInterval } from '@kbn/charts-plugin/public';
import type { HistogramBuckets } from '../../common/types/applications';

/** The x domain of a date histogram chart, with what its partial edge buckets are shaded by. */
export interface TimeChartXDomain {
  min: number;
  max: number;
  /** The length of the shortest bucket. */
  minInterval: number;
  /** The queried range, which the edge buckets may cover only part of. */
  range: Pick<HistogramBuckets, 'start' | 'end'>;
  /** Whether the chart draws bars, whose histogram mode spans each bucket. */
  hasBars: boolean;
}

/**
 * The x domain of a date histogram chart over the range of `histogram`, as Lens computes it
 * (`getXDomain` in `expression_xy`): bars' histogram mode draws past `max` by one interval, areas
 * add it to `max`.
 */
export const getTimeChartXDomain = ({
  points,
  histogram,
  timeZone,
  hasBars,
}: {
  /** The buckets, sorted by their start in epoch milliseconds. */
  points: ReadonlyArray<{ timestamp: number }>;
  /** No domain until the response is known. */
  histogram: HistogramBuckets | undefined;
  timeZone: string;
  hasBars: boolean;
}): TimeChartXDomain | undefined => {
  if (!histogram || points.length === 0) {
    return undefined;
  }
  const {
    interval: { value, unit },
    start,
    end,
  } = histogram;
  const keys = points.map(({ timestamp }) => {
    return timestamp;
  });
  const nominalInterval = moment.duration(value, unit).asMilliseconds();
  const maxKey = Math.max(end - nominalInterval, keys[keys.length - 1]);
  return {
    min: Math.min(keys[0], start),
    max: hasBars ? maxKey : maxKey + nominalInterval,
    minInterval: unit === 's' ? nominalInterval : getAdjustedInterval(keys, value, unit, timeZone),
    range: { start, end },
    hasBars,
  };
};
