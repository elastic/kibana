/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricsUIAggregation } from '../../../types';

export const cpuV2: MetricsUIAggregation = {
  cpuV2: {
    avg: {
      field: 'system.cpu.total.norm.pct',
    },
  },
  cpuIdleOtel: {
    terms: {
      field: 'attributes.state',
      include: ['wait', 'idle'],
    },
    aggs: {
      avg: {
        avg: {
          field: 'system.cpu.utilization',
        },
      },
    },
  },
  cpuIdleTotalOtel: {
    sum_bucket: {
      buckets_path: 'cpuIdleOtel.avg',
    },
  },
  cpuV2Otel: {
    bucket_script: {
      buckets_path: {
        cpuIdleTotal: 'cpuIdleTotalOtel',
      },
      script: '1 - params.cpuIdleTotal',
    },
  },
};
