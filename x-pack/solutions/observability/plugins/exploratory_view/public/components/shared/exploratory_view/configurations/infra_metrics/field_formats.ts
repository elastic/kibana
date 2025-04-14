/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  METRIC_DOCKER_CPU_TOTAL_PCT,
  METRIC_KUBERNETES_POD_CPU_USAGE_NODE_PCT,
  METRIC_SYSTEM_CPU_TOTAL_NORM_PCT,
  METRIC_SYSTEM_MEMORY_USED_PCT,
} from '@kbn/observability-ui-semantic-conventions';
import { FieldFormat } from '../../types';

export const infraMetricsFieldFormats: FieldFormat[] = [
  {
    field: METRIC_SYSTEM_CPU_TOTAL_NORM_PCT,
    format: {
      id: 'percent',
      params: {},
    },
  },
  {
    field: METRIC_DOCKER_CPU_TOTAL_PCT,
    format: {
      id: 'percent',
      params: {},
    },
  },
  {
    field: METRIC_KUBERNETES_POD_CPU_USAGE_NODE_PCT,
    format: {
      id: 'percent',
      params: {},
    },
  },
  {
    field: METRIC_SYSTEM_MEMORY_USED_PCT,
    format: {
      id: 'percent',
      params: {},
    },
  },
];
