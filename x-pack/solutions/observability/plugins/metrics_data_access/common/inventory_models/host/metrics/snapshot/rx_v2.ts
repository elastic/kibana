/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaBasedAggregations } from '../../../shared/metrics/types';
import { networkTrafficWithInterfaces } from '../../../shared/metrics/snapshot/network_traffic_with_interfaces';

export const rxV2: SchemaBasedAggregations = {
  ecs: {
    rx_sum: {
      sum: {
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
  semconv: {
    rx_receive: {
      filter: {
        term: {
          direction: 'receive',
        },
      },
      aggs: {
        per_interval: {
          auto_date_histogram: {
            field: '@timestamp',
            buckets: 30,
          },
          aggs: networkTrafficWithInterfaces('rx_otel', 'system.network.io', 'device'),
        },
      },
    },
    rxV2: {
      avg_bucket: {
        buckets_path: 'rx_receive>per_interval>rx_otel',
        gap_policy: 'skip',
      },
    },
  },
};
