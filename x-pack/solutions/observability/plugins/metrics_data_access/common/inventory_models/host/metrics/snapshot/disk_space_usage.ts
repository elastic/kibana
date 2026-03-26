/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaBasedAggregations } from '../../../shared/metrics/types';

export const diskSpaceUsage: SchemaBasedAggregations = {
  ecs: {
    diskSpaceUsage: { max: { field: 'system.filesystem.used.pct' } },
  },
  semconv: {
    disk_usage_state_free: {
      terms: {
        field: 'state',
        include: ['free'],
      },
      aggs: {
        sum: {
          sum: {
            field: 'metrics.system.filesystem.usage',
          },
        },
      },
    },
    disk_usage_state_free_total: {
      sum_bucket: {
        buckets_path: 'disk_usage_state_free.sum',
      },
    },
    disk_usage_state_all: {
      terms: {
        field: 'state',
      },
      aggs: {
        sum: {
          sum: {
            field: 'metrics.system.filesystem.usage',
          },
        },
      },
    },
    disk_usage_state_all_total: {
      sum_bucket: {
        buckets_path: 'disk_usage_state_all.sum',
      },
    },
    diskSpaceUsage: {
      bucket_script: {
        buckets_path: {
          freeTotal: 'disk_usage_state_free_total',
          usageTotal: 'disk_usage_state_all_total',
        },
        script: 'params.usageTotal > 0 ? 1 - params.freeTotal / params.usageTotal : 0',
        gap_policy: 'skip',
      },
    },
  },
};
