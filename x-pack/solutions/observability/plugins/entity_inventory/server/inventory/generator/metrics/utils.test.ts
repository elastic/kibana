/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicMetric, DynamicMetricAgg } from '@kbn/entity-store/common';
import {
  canEngineComputeMetricAgg,
  isCountMetricAgg,
  isRateMetricAgg,
  listMetricsUnsupportedOnEngine,
  listSkippedMetricsOnPlan,
  overTimeInnerAgg,
} from './utils';

const COUNT_AGGS: DynamicMetricAgg[] = ['count', 'count_distinct'];
const RATE_AGGS: DynamicMetricAgg[] = ['sum_rate', 'max_rate', 'avg_rate', 'min_rate'];
const VALUE_AGGS: DynamicMetricAgg[] = ['last', 'avg', 'min', 'max', 'sum'];

const metric = (agg: DynamicMetricAgg, name: string = agg): DynamicMetric => ({
  name,
  field: `field.${name}`,
  agg,
});

describe('isCountMetricAgg', () => {
  it.each(COUNT_AGGS)('is true for %s', (agg) => {
    expect(isCountMetricAgg(agg)).toBe(true);
  });

  it.each([...VALUE_AGGS, ...RATE_AGGS])('is false for %s', (agg) => {
    expect(isCountMetricAgg(agg)).toBe(false);
  });
});

describe('isRateMetricAgg', () => {
  it.each(RATE_AGGS)('is true for %s', (agg) => {
    expect(isRateMetricAgg(agg)).toBe(true);
  });

  it.each([...VALUE_AGGS, ...COUNT_AGGS])('is false for %s', (agg) => {
    expect(isRateMetricAgg(agg)).toBe(false);
  });
});

describe('canEngineComputeMetricAgg', () => {
  it('allows every agg under TS', () => {
    for (const agg of [...VALUE_AGGS, ...COUNT_AGGS, ...RATE_AGGS]) {
      expect(canEngineComputeMetricAgg('TS', agg)).toBe(true);
    }
  });

  it('allows value and count aggs under FROM', () => {
    for (const agg of [...VALUE_AGGS, ...COUNT_AGGS]) {
      expect(canEngineComputeMetricAgg('FROM', agg)).toBe(true);
    }
  });

  it.each(RATE_AGGS)('rejects %s under FROM', (agg) => {
    expect(canEngineComputeMetricAgg('FROM', agg)).toBe(false);
  });
});

describe('listMetricsUnsupportedOnEngine', () => {
  const metrics = [
    metric('last', 'cpu'),
    metric('sum_rate', 'bytes_in'),
    metric('count', 'restarts'),
    metric('avg_rate', 'bytes_out'),
  ];

  it('returns no metrics under TS', () => {
    expect(listMetricsUnsupportedOnEngine(metrics, 'TS')).toEqual([]);
  });

  it('returns only rate metrics under FROM', () => {
    expect(listMetricsUnsupportedOnEngine(metrics, 'FROM')).toEqual([
      metric('sum_rate', 'bytes_in'),
      metric('avg_rate', 'bytes_out'),
    ]);
  });

  it('returns an empty list when there are no metrics', () => {
    expect(listMetricsUnsupportedOnEngine([], 'FROM')).toEqual([]);
  });
});

describe('overTimeInnerAgg', () => {
  it.each([
    ['AVG', '`cpu`', 'AVG(AVG_OVER_TIME(`cpu`))'],
    ['MIN', '`mem`', 'MIN(MIN_OVER_TIME(`mem`))'],
    ['MAX', '`disk`', 'MAX(MAX_OVER_TIME(`disk`))'],
    ['SUM', '`bytes`', 'SUM(SUM_OVER_TIME(`bytes`))'],
  ] as const)('builds %s(%s_OVER_TIME(field))', (agg, field, expected) => {
    expect(overTimeInnerAgg(agg, field)).toBe(expected);
  });
});

describe('listSkippedMetricsOnPlan', () => {
  const planBase = {
    indexPattern: 'metrics-host.network-*',
    metrics: [
      metric('last', 'cpu'),
      metric('sum_rate', 'bytes_in'),
      metric('avg_rate', 'bytes_out'),
    ],
  };

  it('returns the stable A3 shape for rates under FROM', () => {
    expect(listSkippedMetricsOnPlan({ ...planBase, engine: 'FROM' })).toEqual([
      {
        indexPattern: 'metrics-host.network-*',
        engine: 'FROM',
        column: 'bytes_in',
        field: 'field.bytes_in',
        agg: 'sum_rate',
      },
      {
        indexPattern: 'metrics-host.network-*',
        engine: 'FROM',
        column: 'bytes_out',
        field: 'field.bytes_out',
        agg: 'avg_rate',
      },
    ]);
  });

  it('returns no skipped metrics under TS', () => {
    expect(listSkippedMetricsOnPlan({ ...planBase, engine: 'TS' })).toEqual([]);
  });
});
