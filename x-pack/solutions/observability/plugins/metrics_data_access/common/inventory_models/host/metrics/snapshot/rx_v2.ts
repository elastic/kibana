/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationSchemaVariant } from '../../../shared/metrics/types';

export const rxV2: AggregationSchemaVariant = {
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
        first_rx_byte: {
          min: {
            field: 'system.network.io',
          },
        },
        last_rx_byte: {
          max: {
            field: 'system.network.io',
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
      },
    },
    rxV2: {
      bucket_script: {
        buckets_path: {
          firstRxByte: 'rx_receive>first_rx_byte',
          lastRxByte: 'rx_receive>last_rx_byte',
          minTime: 'rx_receive>min_timestamp',
          maxTime: 'rx_receive>max_timestamp',
        },
        script:
          '(params.lastRxByte - params.firstRxByte) / ((params.maxTime - params.minTime) / 1000)',
        gap_policy: 'skip',
      },
    },
  },
};
