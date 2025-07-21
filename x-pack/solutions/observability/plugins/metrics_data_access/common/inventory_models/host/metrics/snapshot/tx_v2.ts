/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  semconv: {
    tx_transmit: {
      filter: {
        term: {
          direction: 'transmit',
        },
      },
      aggs: {
        first_tx_byte: {
          min: {
            field: 'system.network.io',
          },
        },
        last_tx_byte: {
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
    txV2: {
      bucket_script: {
        buckets_path: {
          firstTxByte: 'tx_transmit>first_tx_byte',
          lastTxByte: 'tx_transmit>last_tx_byte',
          minTime: 'tx_transmit>min_timestamp',
          maxTime: 'tx_transmit>max_timestamp',
        },
        script:
          '(params.lastTxByte - params.firstTxByte) / ((params.maxTime - params.minTime) / 1000)',
        gap_policy: 'skip',
      },
    },
  },
};
