/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRateAggsBucketScript, createRateAggsBuckets } from './create_rate_aggregation';

describe('createRateAggsBucketScript', () => {
  const timeframe = { start: 0, end: 120_000 };

  it('computes rate when both window maxes exist and the counter increased, including from 0', () => {
    const aggs = createRateAggsBucketScript(timeframe, 'aggregatedValue_A');
    const { script } = aggs.aggregatedValue_A.bucket_script;

    // intervalInSeconds = Math.round(120_000 / (2 * 1000)) = 60
    expect(script).toBe(
      'params.first != null && params.second != null && params.second > params.first ? (params.second - params.first) / 60 : 0'
    );
  });

  it('does not require previous or current max to be strictly greater than 0', () => {
    const aggs = createRateAggsBucketScript(timeframe, 'aggregatedValue_A');
    const { script } = aggs.aggregatedValue_A.bucket_script;

    // Regression for https://github.com/elastic/kibana/issues/255798:
    // requiring params.first > 0.0 skipped counter increases from 0 → N.
    expect(script).not.toContain('params.first > 0.0');
    expect(script).not.toContain('params.second > 0.0');
  });
});

describe('createRateAggsBuckets', () => {
  it('creates first and second max buckets for the rate window halves', () => {
    const aggs = createRateAggsBuckets(
      { start: 0, end: 120_000 },
      'aggregatedValue_A',
      '@timestamp',
      'kubernetes.container.status.restarts'
    );

    expect(aggs.aggregatedValue_A_first_bucket.aggs).toEqual({
      maxValue: { max: { field: 'kubernetes.container.status.restarts' } },
    });
    expect(aggs.aggregatedValue_A_second_bucket.aggs).toEqual({
      maxValue: { max: { field: 'kubernetes.container.status.restarts' } },
    });
  });

  describe('range filters', () => {
    const timeframe = { start: 0, end: 120_000 };

    it('uses only the time range as the bucket filter when there is no metric filter', () => {
      const aggs = createRateAggsBuckets(timeframe, 'aggregatedValue_A', '@timestamp', 'metric');

      expect(aggs.aggregatedValue_A_first_bucket.filter).toHaveProperty('range.@timestamp');
      expect(aggs.aggregatedValue_A_second_bucket.filter).toHaveProperty('range.@timestamp');
    });

    it('combines the metric filter with the time range of both windows', () => {
      const filterQuery = { term: { status: '500' } };
      const aggs = createRateAggsBuckets(
        timeframe,
        'aggregatedValue_A',
        '@timestamp',
        'metric',
        filterQuery
      );

      [aggs.aggregatedValue_A_first_bucket, aggs.aggregatedValue_A_second_bucket].forEach(
        (bucket) => {
          expect(bucket.filter).toEqual({
            bool: { must: [{ range: { '@timestamp': expect.any(Object) } }, filterQuery] },
          });
          expect(bucket.aggs).toEqual({ maxValue: { max: { field: 'metric' } } });
        }
      );
    });
  });
});
