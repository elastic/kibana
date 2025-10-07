/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricsUIAggregation } from '../../../types';

export const rate = (id: string, field: string): MetricsUIAggregation => {
  return {
    [`${id}_max`]: { max: { field } },
    [`${id}_deriv`]: {
      derivative: {
        buckets_path: `${id}_max`,
        gap_policy: 'skip',
        unit: '1s',
      },
    },
    [id]: {
      bucket_script: {
        buckets_path: { value: `${id}_deriv[normalized_value]` },
        script: {
          source: 'params.value > 0.0 ? params.value : 0.0',
          lang: 'painless',
        },
        gap_policy: 'skip',
      },
    },
  };
};

// Single-bucket version for snapshot API refactor
// Uses min/max timestamps to calculate rate over the query time range
export const rateSingleBucket = (id: string, field: string): MetricsUIAggregation => {
  return {
    [`${id}_sum`]: {
      sum: {
        field,
      },
    },
    [`${id}_min_timestamp`]: {
      min: {
        field: '@timestamp',
      },
    },
    [`${id}_max_timestamp`]: {
      max: {
        field: '@timestamp',
      },
    },
    [id]: {
      bucket_script: {
        buckets_path: {
          value: `${id}_sum`,
          minTime: `${id}_min_timestamp`,
          maxTime: `${id}_max_timestamp`,
        },
        script: {
          source: `
            if (params.value == null || params.minTime == null || params.maxTime == null) {
              return 0;
            }
            double timeDiff = (params.maxTime - params.minTime) / 1000.0;
            return timeDiff > 0 ? params.value / timeDiff : 0;
          `,
          lang: 'painless',
        },
        gap_policy: 'skip',
      },
    },
  };
};
