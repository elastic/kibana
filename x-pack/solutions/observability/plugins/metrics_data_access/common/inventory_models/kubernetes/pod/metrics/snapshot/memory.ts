/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION,
  SEMCONV_K8S_POD_MEMORY_NODE_UTILIZATION,
} from '../../../../../constants';
import type { SchemaBasedAggregations } from '../../../../shared/metrics/types';

export const memory: SchemaBasedAggregations = {
  ecs: {
    memory_with_limit: {
      avg: {
        field: 'kubernetes.pod.memory.usage.limit.pct',
      },
    },
    memory_without_limit: {
      avg: {
        field: 'kubernetes.pod.memory.usage.node.pct',
      },
    },
    memory: {
      bucket_script: {
        buckets_path: {
          with_limit: 'memory_with_limit',
          without_limit: 'memory_without_limit',
        },
        script: {
          source: 'params.with_limit > 0.0 ? params.with_limit : params.without_limit',
          lang: 'painless',
        },
        gap_policy: 'skip',
      },
    },
  },
  semconv: {
    memory_with_limit: {
      avg: {
        field: SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION,
      },
    },
    memory_without_limit: {
      avg: {
        field: SEMCONV_K8S_POD_MEMORY_NODE_UTILIZATION,
      },
    },
    memory_node_utilization_count: {
      value_count: {
        field: SEMCONV_K8S_POD_MEMORY_NODE_UTILIZATION,
      },
    },
    memory: {
      bucket_script: {
        buckets_path: {
          with_limit: 'memory_with_limit',
          without_limit: 'memory_without_limit',
          without_limit_count: 'memory_node_utilization_count',
        },
        script: {
          source:
            'params.with_limit > 0.0 ? params.with_limit : (params.without_limit_count > 0 ? params.without_limit : null)',
          lang: 'painless',
        },
        // Zeros empty limit buckets so pods without limits fall back to node utilization.
        // A zero count means that fallback field is absent, so the value stays null.
        // ECS memory keeps skip and does not use this fallback.
        gap_policy: 'insert_zeros',
      },
    },
  },
};
