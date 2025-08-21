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
        include: ['idle', 'wait'],
      },
      aggs: {
        avg: {
          avg: {
            field: 'system.cpu.utilization',
          },
        },
      },
    },
    cpu_idle_total: {
      sum_bucket: {
        buckets_path: 'cpu_idle.avg',
      },
    },
    cpuV2: {
      bucket_script: {
        buckets_path: {
          cpuIdleTotal: 'cpu_idle_total',
        },
        script: '1 - params.cpuIdleTotal',
        gap_policy: 'skip',
      },
    },
  },
};
