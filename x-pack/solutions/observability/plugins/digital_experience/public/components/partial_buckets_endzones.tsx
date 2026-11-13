/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { Endzones, getAdjustedInterval } from '@kbn/charts-plugin/public';
import type { HistogramInterval } from '../../common/types/applications';
import type { QueriedRange } from '../utils/time_range_query';

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

  const bucketKeys = points.map(({ timestamp }) => timestamp);

  const intervalMs = getAdjustedInterval(bucketKeys, interval.value, interval.unit, timeZone);

  return (
    <Endzones
      isDarkMode={colorMode === 'DARK'}
      domainStart={range.start}
      domainEnd={range.end}
      domainMin={bucketKeys[0]}
      // `Endzones` subtracts the interval from `domainEnd` itself, so this is the last bucket's start.
      domainMax={bucketKeys[bucketKeys.length - 1]}
      interval={intervalMs}
      hideTooltips={false}
    />
  );
}
