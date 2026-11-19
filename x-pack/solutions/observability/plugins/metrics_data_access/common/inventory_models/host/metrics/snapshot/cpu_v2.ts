/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaBasedAggregations } from '../../../shared/metrics/types';

export const cpuV2: SchemaBasedAggregations = {
  ecs: {
    cpuV2: {
      avg: {
        field: 'system.cpu.total.norm.pct',
      },
    },
  },
  semconv: {
    cpu_idle: {
      terms: {
        field: 'state',
        // `wait` is optional in OTel datasets and can null the computed value.
        include: ['idle'],
      },
      aggs: {
        avg: {
          avg: {
            // OTel lands this gauge under the `metrics.*` prefix; the unprefixed
            // field returned null and coerced to `1 - 0 = 100%`.
            field: 'metrics.system.cpu.utilization',
          },
        },
      },
    },
    cpu_idle_total: {
      sum_bucket: {
        buckets_path: 'cpu_idle.avg',
      },
    },
    cpu_idle_stats: {
      stats_bucket: {
        buckets_path: 'cpu_idle.avg',
      },
    },
    cpuV2: {
      bucket_script: {
        buckets_path: {
          cpuIdleCount: 'cpu_idle_stats.count',
          cpuIdleTotal: 'cpu_idle_total',
        },
        script: 'params.cpuIdleCount > 0 ? 1 - params.cpuIdleTotal : null',
        gap_policy: 'skip',
      },
    },
  },
};
