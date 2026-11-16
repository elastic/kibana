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

/** Shades the edge buckets that cover only part of the queried range, as Lens's `XyEndzones` does. */
export function PartialBucketsEndzones({ xDomain }: { xDomain: TimeChartXDomain | undefined }) {
  const { colorMode } = useEuiTheme();

  if (!xDomain) {
    return null;
  }
  const { range, hasBars } = xDomain;

  return (
    <Endzones
      isFullBin={!hasBars}
      isDarkMode={colorMode === 'DARK'}
      domainStart={range.start}
      domainEnd={range.end}
      interval={xDomain.minInterval}
      domainMin={xDomain.min}
      domainMax={xDomain.max}
      hideTooltips={false}
    />
  );
}
