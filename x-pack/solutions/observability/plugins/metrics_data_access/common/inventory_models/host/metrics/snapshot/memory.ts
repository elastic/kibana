/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaBasedAggregations } from '../../../shared/metrics/types';

export const memory: SchemaBasedAggregations = {
  ecs: {
    memory: {
      avg: {
        field: 'system.memory.actual.used.pct',
      },
    },
  },
  semconv: {
    memory_utilization_used: {
      terms: {
        field: 'state',
        include: ['used'],
      },
      aggs: {
        avg: {
          avg: {
            field: 'system.memory.utilization',
          },
        },
      },
    },
    memory_utilization_used_total: {
      sum_bucket: {
        buckets_path: 'memory_utilization_used.avg',
      },
    },
    memory_utilization_used_stats: {
      stats_bucket: {
        buckets_path: 'memory_utilization_used.avg',
      },
    },
    memory: {
      bucket_script: {
        buckets_path: {
          memoryUsedCount: 'memory_utilization_used_stats.count',
          memoryUsedTotal: 'memory_utilization_used_total',
        },
        // Align with semconv Lens formula and avoid nulling memory usage when
        // optional buffered/slab states are not reported.
        script: 'params.memoryUsedCount > 0 ? params.memoryUsedTotal : null',
        gap_policy: 'skip',
      },
    },
  },
};
