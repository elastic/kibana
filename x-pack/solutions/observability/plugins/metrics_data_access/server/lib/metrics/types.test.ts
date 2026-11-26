/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CompositeResponseRT,
  HistogramBucketRT,
  MetricValueTypeRT,
  StatsBucketTypeRT,
} from './types';

const isRight = (decoded: { _tag: string }) => decoded._tag === 'Right';
const isLeft = (decoded: { _tag: string }) => decoded._tag === 'Left';

const grouping = (bucket: Record<string, unknown>, afterKey?: Record<string, string>) => ({
  groupings: {
    buckets: [bucket],
    ...(afterKey ? { after_key: afterKey } : {}),
  },
});

const emptyStats = {
  count: 0,
  min: null,
  max: null,
  avg: null,
  sum: null,
};

const populatedStats = {
  count: 1,
  min: 0.4,
  max: 0.4,
  avg: 0.4,
  sum: 0.4,
};

describe('StatsBucketTypeRT', () => {
  it('decodes a populated stats_bucket', () => {
    expect(isRight(StatsBucketTypeRT.decode(populatedStats))).toBe(true);
  });

  it('decodes a stats_bucket with no contributing buckets', () => {
    expect(isRight(StatsBucketTypeRT.decode(emptyStats))).toBe(true);
  });

  it('rejects a stats_bucket missing count', () => {
    expect(isLeft(StatsBucketTypeRT.decode({ min: null, max: null, avg: null, sum: null }))).toBe(
      true
    );
  });

  it('rejects an empty object', () => {
    expect(isLeft(StatsBucketTypeRT.decode({}))).toBe(true);
  });

  it('is accepted as a MetricValueType', () => {
    expect(isRight(MetricValueTypeRT.decode(emptyStats))).toBe(true);
    expect(isRight(MetricValueTypeRT.decode(populatedStats))).toBe(true);
  });
});

describe('CompositeResponseRT', () => {
  it('decodes an empty groupings result', () => {
    const decoded = CompositeResponseRT.decode({ groupings: { buckets: [] } });
    expect(isRight(decoded)).toBe(true);
  });

  it('decodes a grouping with no metric aggregations', () => {
    const decoded = CompositeResponseRT.decode(
      grouping({
        key: { groupBy0: 'semconv-host-1' },
        doc_count: 0,
        metricsets: { buckets: [] },
      })
    );
    expect(isRight(decoded)).toBe(true);
  });

  it('decodes grouping buckets that include a stats_bucket aggregation', () => {
    const decoded = CompositeResponseRT.decode(
      grouping({
        key: { groupBy0: 'semconv-host-1' },
        doc_count: 12,
        metricsets: {
          buckets: [{ key: 'cpu', doc_count: 12 }],
        },
        cpu_idle: {
          doc_count_error_upper_bound: 0,
          sum_other_doc_count: 0,
          buckets: [{ key: 'idle', doc_count: 4, avg: { value: 0.4 } }],
        },
        cpu_idle_total: { value: 0.4 },
        cpu_idle_stats: populatedStats,
        cpuV2: { value: 0.6 },
        __metadata__: {
          top: [
            {
              sort: [1562786400000],
              metrics: { 'host.name': 'semconv-host-1' },
            },
          ],
        },
      })
    );
    expect(isRight(decoded)).toBe(true);
  });

  it('decodes a stats_bucket with no contributing buckets (all stats null)', () => {
    const decoded = CompositeResponseRT.decode(
      grouping({
        key: { groupBy0: 'semconv-host-1' },
        doc_count: 1,
        metricsets: { buckets: [] },
        cpu_idle: { buckets: [] },
        cpu_idle_total: { value: 0 },
        cpu_idle_stats: emptyStats,
        cpuV2: { value: null },
      })
    );
    expect(isRight(decoded)).toBe(true);
  });

  it('decodes when the stats_bucket is absent', () => {
    const decoded = CompositeResponseRT.decode(
      grouping({
        key: { groupBy0: 'host-1' },
        doc_count: 3,
        metricsets: { buckets: [{ key: 'cpu', doc_count: 3 }] },
        cpuV2: { value: 0.2 },
      })
    );
    expect(isRight(decoded)).toBe(true);
  });

  it('decodes semconv CPU aggregations when cpu_idle_stats is omitted', () => {
    const decoded = CompositeResponseRT.decode(
      grouping({
        key: { groupBy0: 'semconv-host-1' },
        doc_count: 12,
        metricsets: { buckets: [{ key: 'cpu', doc_count: 12 }] },
        cpu_idle: {
          buckets: [{ key: 'idle', doc_count: 4, avg: { value: 0.4 } }],
        },
        cpu_idle_total: { value: 0.4 },
        cpuV2: { value: 0.6 },
      })
    );
    expect(isRight(decoded)).toBe(true);
  });

  it('decodes empty terms buckets alongside a null metric', () => {
    const decoded = CompositeResponseRT.decode(
      grouping({
        key: { groupBy0: 'semconv-host-1' },
        doc_count: 2,
        metricsets: { buckets: [] },
        memory_utilization_used: { buckets: [] },
        memory_utilization_used_total: { value: null },
        memory_utilization_used_stats: emptyStats,
        memory: { value: null },
      })
    );
    expect(isRight(decoded)).toBe(true);
  });

  it('decodes after_key used for composite pagination', () => {
    const decoded = CompositeResponseRT.decode(
      grouping(
        {
          key: { groupBy0: 'semconv-host-2' },
          doc_count: 1,
          metricsets: { buckets: [] },
          cpu_idle_stats: emptyStats,
          cpuV2: { value: null },
        },
        { groupBy0: 'semconv-host-2' }
      )
    );
    expect(isRight(decoded)).toBe(true);
  });

  it('decodes histogram grouping buckets that include stats_bucket (timeseries path)', () => {
    const histogramBucket = {
      key: { groupBy0: 'semconv-host-1' },
      doc_count: 12,
      metricsets: { buckets: [{ key: 'cpu', doc_count: 12 }] },
      histogram: {
        buckets: [
          {
            key: 1562786400000,
            key_as_string: '2019-07-10T20:00:00.000Z',
            doc_count: 6,
            cpu_idle: { buckets: [{ key: 'idle', doc_count: 2, avg: { value: 0.4 } }] },
            cpu_idle_total: { value: 0.4 },
            cpu_idle_stats: populatedStats,
            cpuV2: { value: 0.6 },
          },
          {
            key: 1562786460000,
            key_as_string: '2019-07-10T20:01:00.000Z',
            doc_count: 0,
            cpu_idle: { buckets: [] },
            cpu_idle_total: { value: 0 },
            cpu_idle_stats: emptyStats,
            cpuV2: { value: null },
          },
        ],
      },
    };

    expect(isRight(HistogramBucketRT.decode(histogramBucket))).toBe(true);
    expect(isRight(CompositeResponseRT.decode({ groupings: { buckets: [histogramBucket] } }))).toBe(
      true
    );
  });
});
