/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldFormat } from '../../types';
import {
  SYSTEM_CPU_PERCENTAGE_FIELD,
  DOCKER_CPU_PERCENTAGE_FIELD,
  K8S_POD_CPU_PERCENTAGE_FIELD,
  SYSTEM_MEMORY_PERCENTAGE_FIELD,
} from '../constants/field_names/infra_metrics';

export const infraMetricsFieldFormats: FieldFormat[] = [
  {
    field: SYSTEM_CPU_PERCENTAGE_FIELD,
    format: {
      id: 'percent',
      params: {},
    },
  },
  {
    field: DOCKER_CPU_PERCENTAGE_FIELD,
    format: {
      id: 'percent',
      params: {},
    },
  },
  {
    field: K8S_POD_CPU_PERCENTAGE_FIELD,
    format: {
      id: 'percent',
      params: {},
    },
  },
  {
    field: SYSTEM_MEMORY_PERCENTAGE_FIELD,
    format: {
      id: 'percent',
      params: {},
    },
  },
];
