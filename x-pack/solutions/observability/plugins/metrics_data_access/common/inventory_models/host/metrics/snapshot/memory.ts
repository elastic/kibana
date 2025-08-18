/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaBasedAggregations } from '../../../shared/metrics/types';

export const memory: SchemaBasedAggregations = {
  ecs: {
    memory: {
      avg: {
        field: 'system.memory.actual.used.pct',
      },
    },
  },
  semconv: {
    memory_utiilzation_used: {
      terms: {
        field: 'state',
        include: ['used'],
      },
      aggs: {
        avg: {
          avg: {
            field: 'system.memory.utilization',
          },
        },
      },
    },
    memory_utilization_buffered: {
      terms: {
        field: 'state',
        include: ['buffered'],
      },
      aggs: {
        avg: {
          avg: {
            field: 'system.memory.utilization',
          },
        },
      },
    },
    memory_utilization_slab_unreclaimable: {
      terms: {
        field: 'state',
        include: ['slab_unreclaimable'],
      },
      aggs: {
        avg: {
          avg: {
            field: 'system.memory.utilization',
          },
        },
      },
    },
    memory_utilization_slab_reclaimable: {
      terms: {
        field: 'state',
        include: ['slab_reclaimable'],
      },
      aggs: {
        avg: {
          avg: {
            field: 'system.memory.utilization',
          },
        },
      },
    },
    memory_utilization_used_total: {
      sum_bucket: {
        buckets_path: 'memory_utiilzation_used.avg',
      },
    },
    memory_utilization_buffered_total: {
      sum_bucket: {
        buckets_path: 'memory_utilization_buffered.avg',
      },
    },
    memory_utilization_slab_unreclaimable_total: {
      sum_bucket: {
        buckets_path: 'memory_utilization_slab_unreclaimable.avg',
      },
    },
    memory_utilization_slab_reclaimable_total: {
      sum_bucket: {
        buckets_path: 'memory_utilization_slab_reclaimable.avg',
      },
    },
    memory: {
      bucket_script: {
        buckets_path: {
          memoryUsedTotal: 'memory_utilization_used_total',
          memoryBufferedTotal: 'memory_utilization_buffered_total',
          memorySlabUnreclaimableTotal: 'memory_utilization_slab_unreclaimable_total',
          memorySlabReclaimableTotal: 'memory_utilization_slab_reclaimable_total',
        },
        script:
          'params.memoryUsedTotal + params.memoryBufferedTotal + params.memorySlabUnreclaimableTotal + params.memorySlabReclaimableTotal',
        gap_policy: 'skip',
      },
    },
  },
};
