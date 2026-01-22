/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CPU_USAGE_LABEL } from '../../../shared/charts/constants';
import type { SchemaBasedFormula } from '../../../shared/metrics/types';

export const dockerContainerCpuUsage: SchemaBasedFormula = {
  label: CPU_USAGE_LABEL,
  value: {
    ecs: 'average(docker.cpu.total.pct)',
    semconv:
      '1 - average(metrics.container.cpu.utilization, kql="state: idle") + average(metrics.container.cpu.utilization, kql="state: wait")',
  },
  format: 'percent',
  decimals: 1,
};

export const k8sContainerCpuUsage: SchemaBasedFormula = {
  label: CPU_USAGE_LABEL,
  value: {
    ecs: 'average(kubernetes.container.cpu.usage.limit.pct)',
    semconv: 'average(metrics.k8s.container.cpu_limit_utilization)',
  },
  format: 'percent',
  decimals: 1,
};
