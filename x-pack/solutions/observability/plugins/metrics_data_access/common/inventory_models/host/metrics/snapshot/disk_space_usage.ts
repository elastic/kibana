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
    disk_space_usage_free_bytes: {
      terms: {
        field: 'state',
        include: ['free'],
      },
      aggs: {
        max: {
          max: {
            field: 'system.filesystem.usage',
          },
        },
      },
    },
    disk_usage_space_available: {
      terms: {
        field: 'state',
      },
      aggs: {
        sum: {
          sum: {
            field: 'system.filesystem.usage',
          },
        },
      },
    },
    disk_space_usage_free_bytes_total: {
      max_bucket: {
        buckets_path: 'disk_space_usage_free_bytes.max',
      },
    },
    disk_usage_space_available_total: {
      sum_bucket: {
        buckets_path: 'disk_usage_space_available.sum',
      },
    },
    diskSpaceUsage: {
      bucket_script: {
        buckets_path: {
          diskSpaceUsageFreeBytesTotal: 'disk_space_usage_free_bytes_total',
          diskSpaceUsageAvailableTotal: 'disk_usage_space_available_total',
        },
        script: '1 - params.diskSpaceUsageFreeBytesTotal / params.diskSpaceUsageAvailableTotal',
        gap_policy: 'skip',
      },
    },
  },
};
