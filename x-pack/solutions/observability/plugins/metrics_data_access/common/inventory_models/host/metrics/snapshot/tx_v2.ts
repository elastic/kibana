/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { networkTrafficWithInterfacesWithFilter } from '../../../shared/metrics/snapshot/network_traffic';
import type { SchemaBasedAggregations } from '../../../shared/metrics/types';

export const txV2: SchemaBasedAggregations = {
  ecs: {
    tx_sum: {
      sum: {
        field: 'host.network.egress.bytes',
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
    txV2: {
      bucket_script: {
        buckets_path: {
          value: 'tx_sum',
          minTime: 'min_timestamp',
          maxTime: 'max_timestamp',
        },
        script: {
          source: 'params.value / ((params.maxTime - params.minTime) / 1000)',
          lang: 'painless',
        },
        gap_policy: 'skip',
      },
    },
  },
  semconv: networkTrafficWithInterfacesWithFilter('txV2', 'system.network.io', 'device', {
    term: {
      direction: 'transmit',
    },
  }),
};
