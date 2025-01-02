/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MetricsUIAggregation } from '../../../types';
export const normalizedLoad1m: MetricsUIAggregation = {
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
};
