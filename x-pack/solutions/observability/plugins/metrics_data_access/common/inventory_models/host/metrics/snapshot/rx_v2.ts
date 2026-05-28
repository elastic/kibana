/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaBasedAggregations } from '../../../shared/metrics/types';
import { networkTrafficWithInterfacesWithFilter } from '../../../shared/metrics/snapshot/network_traffic';

export const rxV2: SchemaBasedAggregations = {
  ecs: {
    rx_sum: {
      sum: {
        field: 'host.network.ingress.bytes',
      },
    },
    rx_count: {
      value_count: {
        field: 'host.network.ingress.bytes',
      },
    },
    min_timestamp: {
      min: {
        field: '@timestamp',
      },
    },
    max_timestamp: {
      max: {
        field: '@timestamp',
      },
    },
    rxV2: {
      bucket_script: {
        buckets_path: {
          value: 'rx_sum',
          count: 'rx_count',
          minTime: 'min_timestamp',
          maxTime: 'max_timestamp',
        },
        script: {
          source:
            'params.count > 0 ? params.value / ((params.maxTime - params.minTime) / 1000) : null',
          lang: 'painless',
        },
        gap_policy: 'skip',
      },
    },
  },
  semconv: networkTrafficWithInterfacesWithFilter('rxV2', 'system.network.io', 'device', {
    term: {
      direction: 'receive',
    },
  }),
};
