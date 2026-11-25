/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { Endzones } from '@kbn/charts-plugin/public';
import type { TimeChartXDomain } from '../utils/histogram_interval';

/**
 * Shades the parts of the edge buckets outside the queried range, as Lens's `XyEndzones` does for
 * its date histograms: from the range's edges to the domain's, which reaches the end of the last
 * bucket. `isFullBin` would put the zones past the domain, where nothing shows.
 */
export function PartialBucketsEndzones({ xDomain }: { xDomain: TimeChartXDomain | undefined }) {
  const { colorMode } = useEuiTheme();

  if (!xDomain) {
    return null;
  }
  const { range } = xDomain;

  return (
    <Endzones
      isFullBin={false}
      isDarkMode={colorMode === 'DARK'}
      domainStart={range.start}
      domainEnd={range.end}
      interval={xDomain.minInterval}
      domainMin={xDomain.min}
      // The last bucket's start, not the domain's end, which lines and areas extend by an
      // interval: a range that ends on a bucket's edge would get a zone otherwise
      domainMax={xDomain.lastBucketStart}
      hideTooltips={false}
    />
  );
}
