/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricsUIAggregation } from '../../../types';

export const logRate: MetricsUIAggregation = {
  count: {
    bucket_script: {
      buckets_path: { count: '_count' },
      script: {
        source: 'count * 1',
        lang: 'expression',
      },
      gap_policy: 'skip',
    },
  },
  cumsum: {
    cumulative_sum: {
      buckets_path: 'count',
    },
  },
  logRate: {
    derivative: {
      buckets_path: 'cumsum',
      gap_policy: 'skip',
      unit: '1s',
    },
  },
};

// Single-bucket version for snapshot API refactor
// Uses document counts over time range to calculate log rate
export const logRateSingleBucket: MetricsUIAggregation = {
  logRate_min_timestamp: {
    min: {
      field: '@timestamp',
    },
  },
  logRate_max_timestamp: {
    max: {
      field: '@timestamp',
    },
  },
  logRate: {
    bucket_script: {
      buckets_path: {
        count: '_count',
        minTime: 'logRate_min_timestamp',
        maxTime: 'logRate_max_timestamp',
      },
      script: {
        source: `
          if (params.count == null || params.minTime == null || params.maxTime == null) {
            return 0;
          }
          double timeDiff = (params.maxTime - params.minTime) / 1000.0;
          return timeDiff > 0 ? params.count / timeDiff : 0;
        `,
        lang: 'painless',
      },
      gap_policy: 'skip',
    },
  },
};
