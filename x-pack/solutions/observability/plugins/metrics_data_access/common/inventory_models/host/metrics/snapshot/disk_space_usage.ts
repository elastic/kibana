/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationSchemaVariant } from '../../../shared/metrics/types';

export const diskSpaceUsage: AggregationSchemaVariant = {
  ecs: {
    diskSpaceUsage: { max: { field: 'system.filesystem.used.pct' } },
  },
  semconv: {
    disk_space_usage_used_bytes: {
      terms: {
        field: 'state',
        include: ['used'],
      },
      aggs: {
        max: {
          max: {
            field: 'system.filesystem.usage',
          },
        },
      },
    },
    disk_space_usage_available: {
      terms: {
        field: 'state',
        include: ['free', 'used'],
      },
      aggs: {
        max: {
          max: {
            field: 'system.filesystem.usage',
          },
        },
      },
    },
    disk_space_usage_used_bytes_total: {
      max_bucket: {
        buckets_path: 'disk_space_usage_used_bytes.max',
      },
    },
    disk_space_usage_available_total: {
      max_bucket: {
        buckets_path: 'disk_space_usage_available.max',
      },
    },
    diskSpaceUsage: {
      bucket_script: {
        buckets_path: {
          diskSpaceUsageUsedBytesTotal: 'disk_space_usage_used_bytes_total',
          diskSpaceUsageAvailableTotal: 'disk_space_usage_available_total',
        },
        script: 'params.diskSpaceUsageUsedBytesTotal / params.diskSpaceUsageAvailableTotal',
        gap_policy: 'skip',
      },
    },
  },
};
