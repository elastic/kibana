/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment-timezone';
import { useEuiTheme } from '@elastic/eui';
import { Endzones } from '@kbn/charts-plugin/public';
import type { HistogramInterval } from '../../common/types/applications';
import type { QueriedRange } from '../utils/time_range_query';

/** The interval of a chart without buckets, which shades nothing. */
export const NO_BUCKETS_INTERVAL: HistogramInterval = { value: 1, unit: 's' };

/** The end of the bucket starting at `key`, in `timeZone`, as a calendar month or day can vary. */
export const getBucketEnd = (
  key: number,
  { value, unit }: HistogramInterval,
  timeZone: string
): number => {
  return moment.tz(key, timeZone).add(value, unit).valueOf();
};

/** Shades the first and last buckets of a chart where they cover only part of the queried range. */
export function PartialBucketsEndzones({
  points,
  interval,
  range,
  timeZone,
}: {
  /** The buckets, sorted by their start in epoch milliseconds. */
  points: Array<{ timestamp: number }>;
  interval: HistogramInterval;
  /** Nothing is shaded until the range of the response is known. */
  range: QueriedRange | undefined;
  timeZone: string;
}) {
  const { colorMode } = useEuiTheme();

  if (!range || points.length === 0) {
    return null;
  }

  const firstKey = points[0].timestamp;
  const lastKey = points[points.length - 1].timestamp;

  return (
    <Endzones
      isDarkMode={colorMode === 'DARK'}
      domainStart={range.start}
      domainEnd={range.end}
      domainMin={firstKey}
      domainMax={lastKey}
      // `Endzones` shades the end when `domainEnd - interval < domainMax`, i.e. before the last
      // bucket's own end, so a long month isn't measured by the shortest one.
      interval={getBucketEnd(lastKey, interval, timeZone) - lastKey}
      hideTooltips={false}
    />
  );
}
