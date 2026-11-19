/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewBase } from '@kbn/es-query';
import { Aggregators } from '../../common/alerting/metrics';
import type { MetricExpressionCustomMetric } from '../../common/alerting/metrics';
import { createCustomMetricsAggregations } from './create_custom_metrics_aggregations';

const keywordDataView: DataViewBase = {
  title: 'metrics-*',
  fields: [{ name: 'machine.os.keyword', type: 'string', esTypes: ['keyword'] }],
};

describe('createCustomMetricsAggregations', () => {
  describe('count aggregation with a KQL filter', () => {
    const countMetric: MetricExpressionCustomMetric = {
      name: 'A',
      aggType: Aggregators.COUNT,
      filter: 'machine.os.keyword: *win 7*',
    };

    describe('when dataView is provided with keyword field mapping', () => {
      const result = createCustomMetricsAggregations(
        'aggregatedValue',
        [countMetric],
        undefined,
        keywordDataView
      );

      test('uses a wildcard query instead of query_string', () => {
        const filterAgg = (result as any).aggregatedValue_A.filter;
        expect(JSON.stringify(filterAgg)).not.toContain('query_string');
        expect(JSON.stringify(filterAgg)).toContain('wildcard');
      });

      test('includes a bucket_script for the equation', () => {
        expect((result as any).aggregatedValue).toHaveProperty('bucket_script');
      });

      test('bucket_script buckets_path references the count filter agg', () => {
        const script = (result as any).aggregatedValue.bucket_script;
        expect(script.buckets_path).toEqual({ A: 'aggregatedValue_A>_count' });
      });
    });

    describe('when dataView is not provided', () => {
      const result = createCustomMetricsAggregations('aggregatedValue', [countMetric]);

      test('falls back to query_string for the wildcard pattern', () => {
        const filterAgg = (result as any).aggregatedValue_A.filter;
        expect(JSON.stringify(filterAgg)).toContain('query_string');
      });
    });
  });

  describe('count aggregation without a filter', () => {
    const countMetricNoFilter: MetricExpressionCustomMetric = {
      name: 'A',
      aggType: Aggregators.COUNT,
    };

    test('uses match_all when no filter is set', () => {
      const result = createCustomMetricsAggregations('aggregatedValue', [countMetricNoFilter]);
      const filterAgg = (result as any).aggregatedValue_A.filter;
      expect(filterAgg).toEqual({ match_all: {} });
    });
  });

  describe('non-count aggregation (average)', () => {
    const avgMetric: MetricExpressionCustomMetric = {
      name: 'A',
      aggType: Aggregators.AVERAGE,
      field: 'system.cpu.user.pct',
    };

    test('generates an avg aggregation on the specified field', () => {
      const result = createCustomMetricsAggregations('aggregatedValue', [avgMetric]);
      expect((result as any).aggregatedValue_A).toEqual({ avg: { field: 'system.cpu.user.pct' } });
    });
  });

  describe('custom equation', () => {
    const metrics: MetricExpressionCustomMetric[] = [
      { name: 'A', aggType: Aggregators.COUNT, filter: 'machine.os.keyword: *win 7*' },
      { name: 'B', aggType: Aggregators.AVERAGE, field: 'system.cpu.user.pct' },
    ];

    test('translates equation variables to painless params', () => {
      const result = createCustomMetricsAggregations(
        'aggregatedValue',
        metrics,
        'A / B',
        keywordDataView
      );
      const script = (result as any).aggregatedValue.bucket_script.script.source;
      expect(script).toBe('params.A / params.B');
    });

    test('defaults equation to sum of all metrics when not provided', () => {
      const result = createCustomMetricsAggregations(
        'aggregatedValue',
        metrics,
        undefined,
        keywordDataView
      );
      const script = (result as any).aggregatedValue.bucket_script.script.source;
      expect(script).toBe('params.A + params.B');
    });
  });

  describe('when customMetrics is empty', () => {
    test('returns an empty object', () => {
      const result = createCustomMetricsAggregations('aggregatedValue', []);
      expect(result).toEqual({});
    });
  });
});
