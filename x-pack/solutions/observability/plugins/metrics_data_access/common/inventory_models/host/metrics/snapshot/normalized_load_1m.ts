/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaBasedAggregations } from '../../../shared/metrics/types';

export const normalizedLoad1m: SchemaBasedAggregations = {
  ecs: {
    load_1m: {
      avg: {
        field: 'system.load.1',
      },
    },
    max_cores: {
      max: {
        field: 'system.load.cores',
      },
    },
    normalizedLoad1m: {
      bucket_script: {
        buckets_path: {
          load1m: 'load_1m',
          maxCores: 'max_cores',
        },
        script: {
          source: 'params.load1m / params.maxCores',
          lang: 'painless',
        },
        gap_policy: 'skip',
      },
    },
  },
  semconv: {
    load_1m: {
      avg: {
        // OTel hostmetricsreceiver lands these gauges under the `metrics.*`
        // prefix in `metrics-hostmetricsreceiver.otel-*`. See the equivalent
        // formula in `formulas/cpu.ts` for the matching field references —
        // omitting the prefix here made the snapshot agg return null and
        // the `bucket_script` ratio fall back to `null / null = 0`, which
        // showed as a flat 0 normalized load against real OTel data.
        field: 'metrics.system.cpu.load_average.1m',
      },
    },
    max_cores: {
      max: {
        field: 'metrics.system.cpu.logical.count',
      },
    },
    normalizedLoad1m: {
      bucket_script: {
        buckets_path: {
          load1m: 'load_1m',
          maxCores: 'max_cores',
        },
        script: {
          source: 'params.load1m / params.maxCores',
          lang: 'painless',
        },
        gap_policy: 'skip',
      },
    },
  },
};
