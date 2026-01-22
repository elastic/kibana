/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { MEMORY_USAGE_LABEL } from '../../../shared/charts/constants';
import type { SchemaBasedFormula } from '../../../shared/metrics/types';

export const dockerContainerMemoryUsage: SchemaBasedFormula = {
  label: MEMORY_USAGE_LABEL,
  value: {
    ecs: 'average(docker.memory.usage.pct)',
    semconv:
      'average(metrics.container.memory.usage) / (average(metrics.container.memory.usage) + average(metrics.container.memory.available))',
  },
  format: 'percent',
  decimals: 1,
};

export const k8sContainerMemoryUsage: SchemaBasedFormula = {
  label: MEMORY_USAGE_LABEL,
  value: {
    ecs: 'average(kubernetes.container.memory.usage.limit.pct)',
    semconv: 'average(metrics.k8s.container.memory_limit_utilization)',
  },
  format: 'percent',
  decimals: 1,
};
