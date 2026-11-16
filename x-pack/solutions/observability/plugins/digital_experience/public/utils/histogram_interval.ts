/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { getAdjustedInterval } from '@kbn/charts-plugin/public';
import type { HistogramInterval } from '../../common/types/applications';
import type { QueriedRange } from './time_range_query';

/** The interval of a chart without buckets, which shades nothing. */
export const NO_BUCKETS_INTERVAL: HistogramInterval = { value: 1, unit: 's' };

/** The x domain of a date histogram chart; `minInterval` is the length of its shortest bucket. */
export interface TimeChartXDomain {
  min: number;
  max: number;
  minInterval: number;
}

/**
 * The x domain of a date histogram chart over `range`, as Lens computes it (`getXDomain` in
 * `expression_xy`): bars' histogram mode draws past `max` by one interval, areas add it to `max`.
 */
export const getTimeChartXDomain = ({
  points,
  interval: { value, unit },
  range,
  timeZone,
  hasBars,
}: {
  /** The buckets, sorted by their start in epoch milliseconds. */
  points: ReadonlyArray<{ timestamp: number }>;
  interval: HistogramInterval;
  /** No domain until the range of the response is known. */
  range: QueriedRange | undefined;
  timeZone: string;
  hasBars: boolean;
}): TimeChartXDomain | undefined => {
  if (!range || points.length === 0) {
    return undefined;
  }
  const keys = points.map(({ timestamp }) => {
    return timestamp;
  });
  const nominalInterval = moment.duration(value, unit).asMilliseconds();
  const maxKey = Math.max(range.end - nominalInterval, keys[keys.length - 1]);
  return {
    min: Math.min(keys[0], range.start),
    max: hasBars ? maxKey : maxKey + nominalInterval,
    minInterval: unit === 's' ? nominalInterval : getAdjustedInterval(keys, value, unit, timeZone),
  };
};
