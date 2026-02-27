/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaBasedAggregations } from '../../../shared/metrics/types';
export const memoryFree: SchemaBasedAggregations = {
  ecs: {
    memory_total: {
      max: {
        field: 'system.memory.total',
      },
    },
    used_bytes: {
      avg: {
        field: 'system.memory.actual.used.bytes',
      },
    },
    memoryFree: {
      bucket_script: {
        buckets_path: {
          memoryTotal: 'memory_total',
          usedBytes: 'used_bytes',
        },
        script: {
          source: 'params.memoryTotal - params.usedBytes',
          lang: 'painless',
        },
        gap_policy: 'skip',
      },
    },
  },
  semconv: {
    memory_usage_cached: {
      terms: {
        field: 'state',
        include: ['cached'],
      },
      aggs: {
        avg: {
          avg: {
            field: 'system.memory.usage',
          },
        },
      },
    },
    memory_usage_free: {
      terms: {
        field: 'state',
        include: ['free'],
      },
      aggs: {
        avg: {
          avg: {
            field: 'system.memory.usage',
          },
        },
      },
    },
    memory_usage_slab_unreclaimable: {
      terms: {
        field: 'state',
        include: ['slab_unreclaimable'],
      },
      aggs: {
        avg: {
          avg: {
            field: 'system.memory.usage',
          },
        },
      },
    },
    memory_usage_slab_reclaimable: {
      terms: {
        field: 'state',
        include: ['slab_reclaimable'],
      },
      aggs: {
        avg: {
          avg: {
            field: 'system.memory.usage',
          },
        },
      },
    },
    memory_usage_cached_total: {
      sum_bucket: {
        buckets_path: 'memory_usage_cached.avg',
      },
    },
    memory_usage_free_total: {
      sum_bucket: {
        buckets_path: 'memory_usage_free.avg',
      },
    },
    memory_usage_slab_unreclaimable_total: {
      sum_bucket: {
        buckets_path: 'memory_usage_slab_unreclaimable.avg',
      },
    },
    memory_usage_slab_reclaimable_total: {
      sum_bucket: {
        buckets_path: 'memory_usage_slab_reclaimable.avg',
      },
    },
    memoryFree: {
      bucket_script: {
        buckets_path: {
          memoryCachedTotal: 'memory_usage_cached_total',
          memoryFreeTotal: 'memory_usage_free_total',
          memorySlabUnreclaimableTotal: 'memory_usage_slab_unreclaimable_total',
          memorySlabReclaimableTotal: 'memory_usage_slab_reclaimable_total',
        },
        script:
          '(params.memoryCachedTotal + params.memoryFreeTotal) - (params.memorySlabUnreclaimableTotal + params.memorySlabReclaimableTotal)',
        gap_policy: 'skip',
      },
    },
  },
};
