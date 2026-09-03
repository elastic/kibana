/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyHeadroomToDomain, applyYAxisModeToDomain, calculateDomain } from './calculate_domain';
import type { MetricsExplorerSeries } from '../../../../../../common/http_api/metrics_explorer';
import {
  MetricsExplorerYAxisMode,
  type MetricsExplorerOptionsMetric,
} from '../../../../../../common/metrics_explorer_views';
import { Color } from '../../../../../../common/color_palette';

describe('calculateDomain()', () => {
  const series: MetricsExplorerSeries = {
    id: 'test-01',
    columns: [
      { type: 'date', name: 'timestamp' },
      { type: 'number', name: 'metric_0' },
      { type: 'number', name: 'metric_1' },
      { type: 'string', name: 'groupBy' },
    ],
    rows: [
      { timestamp: 1562860500000, metric_0: null, metric_1: null },
      { timestamp: 1562860600000, metric_0: 0.1, metric_1: 0.3 },
      { timestamp: 1562860700000, metric_0: 0.5, metric_1: 0.7 },
      { timestamp: 1562860700000, metric_0: 0.4, metric_1: 0.9 },
      { timestamp: 1562860900000, metric_0: 0.01, metric_1: 0.5 },
    ],
  };
  const metrics: MetricsExplorerOptionsMetric[] = [
    {
      aggregation: 'avg',
      field: 'system.memory.free',
      color: Color.color0,
    },
    {
      aggregation: 'avg',
      field: 'system.memory.used.bytes',
      color: Color.color1,
    },
  ];
  it('should return the min and max across 2 metrics', () => {
    expect(calculateDomain(series, metrics)).toEqual({ min: 0.01, max: 0.9 });
  });
  it('should return the min and combined max across 2 metrics with 10% head room when stacked', () => {
    expect(calculateDomain(series, metrics, true)).toEqual({ min: 0.01, max: 1.4300000000000002 });
  });

  it('should return an ordered domain for negative values', () => {
    const negativeSeries: MetricsExplorerSeries = {
      ...series,
      rows: [
        { timestamp: 1562860500000, metric_0: -2, metric_1: -3 },
        { timestamp: 1562860600000, metric_0: -4, metric_1: -1 },
      ],
    };

    expect(calculateDomain(negativeSeries, metrics)).toEqual({ min: -4, max: -1 });
    expect(calculateDomain(negativeSeries, metrics, true)).toEqual({ min: -5.5, max: -3 });
  });

  it('should include zero values in the domain', () => {
    const seriesWithZero: MetricsExplorerSeries = {
      ...series,
      rows: [{ timestamp: 1562860500000, metric_0: 0, metric_1: 2 }],
    };

    expect(calculateDomain(seriesWithZero, metrics)).toEqual({ min: 0, max: 2 });
  });

  it('should return an ordered domain for a constant negative series', () => {
    const constantNegativeSeries: MetricsExplorerSeries = {
      ...series,
      rows: [
        { timestamp: 1562860500000, metric_0: -5, metric_1: -5 },
        { timestamp: 1562860600000, metric_0: -5, metric_1: -5 },
      ],
    };

    expect(calculateDomain(constantNegativeSeries, metrics)).toEqual({ min: -5, max: -5 });
    expect(calculateDomain(constantNegativeSeries, metrics, true)).toEqual({
      min: -11,
      max: -5,
    });
  });
});

describe('applyYAxisModeToDomain()', () => {
  it.each([
    [
      { min: 1, max: 5 },
      { min: 0, max: 5 },
    ],
    [
      { min: -5, max: -1 },
      { min: -5, max: 0 },
    ],
    [
      { min: -5, max: 5 },
      { min: -5, max: 5 },
    ],
    [
      { min: 0, max: 0 },
      { min: 0, max: 0 },
    ],
  ])('should include zero in a %j domain', (domain, expectedDomain) => {
    expect(applyYAxisModeToDomain(domain, MetricsExplorerYAxisMode.fromZero)).toEqual(
      expectedDomain
    );
  });

  it('should leave the domain unchanged in automatic mode', () => {
    const domain = { min: -5, max: 5 };

    expect(applyYAxisModeToDomain(domain, MetricsExplorerYAxisMode.auto)).toBe(domain);
  });
});

describe('applyHeadroomToDomain()', () => {
  it('should add 10% headroom above a positive max', () => {
    expect(applyHeadroomToDomain({ min: 1, max: 10 })).toEqual({ min: 1, max: 11 });
  });

  it('should keep min less than or equal to max for an all-negative range', () => {
    expect(applyHeadroomToDomain({ min: -10, max: -1 })).toEqual({ min: -10, max: -1.1 });
  });

  it('should keep min less than or equal to max for a constant negative domain', () => {
    expect(applyHeadroomToDomain({ min: -5, max: -5 })).toEqual({ min: -5.5, max: -5 });
  });

  it('should add 10% headroom above a mixed-sign max', () => {
    expect(applyHeadroomToDomain({ min: -4, max: 2 })).toEqual({ min: -4, max: 2.2 });
  });

  it('should apply custom min and max factors without inverting the domain', () => {
    expect(applyHeadroomToDomain({ min: 1, max: 10 }, { min: 0.9, max: 1.1 })).toEqual({
      min: 0.9,
      max: 11,
    });
    expect(applyHeadroomToDomain({ min: -10, max: -1 }, { min: 0.9, max: 1.1 })).toEqual({
      min: -9,
      max: -1.1,
    });
  });
});
