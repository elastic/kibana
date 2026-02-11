/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricsQueryOptions, UseNodeMetricsTableOptions } from '../shared';
import { createMetricByFieldLookup, makeUnpackMetric, metricsToApiOptions } from '../shared';

export type ContainerSemconvRuntime = 'k8s' | 'docker';

// --- ECS (Elastic Common Schema) ---
type ContainerMetricsFieldEcs =
  | 'kubernetes.container.cpu.usage.limit.pct'
  | 'kubernetes.container.memory.usage.bytes';

const containerMetricsQueryConfigEcs: MetricsQueryOptions<ContainerMetricsFieldEcs> = {
  sourceFilter: `event.dataset: "kubernetes.container"`,
  groupByField: 'container.id',
  metricsMap: {
    'kubernetes.container.cpu.usage.limit.pct': {
      aggregation: 'avg',
      field: 'kubernetes.container.cpu.usage.limit.pct',
    },
    'kubernetes.container.memory.usage.bytes': {
      aggregation: 'avg',
      field: 'kubernetes.container.memory.usage.bytes',
    },
  },
};

// --- SemConv Docker (generic container metrics) ---
type ContainerMetricsFieldSemconvDocker =
  | 'metrics.container.cpu.utilization'
  | 'metrics.container.memory.usage.total';

const containerMetricsQueryConfigSemconvDocker: MetricsQueryOptions<ContainerMetricsFieldSemconvDocker> =
  {
    sourceFilter: '',
    groupByField: 'container.id',
    metricsMap: {
      'metrics.container.cpu.utilization': {
        aggregation: 'avg',
        field: 'metrics.container.cpu.utilization',
      },
      'metrics.container.memory.usage.total': {
        aggregation: 'avg',
        field: 'metrics.container.memory.usage.total',
      },
    },
  };

// --- SemConv K8s (Kubernetes container metrics) ---
type ContainerMetricsFieldSemconvK8s =
  | 'metrics.k8s.container.cpu_limit_utilization'
  | 'metrics.k8s.container.memory_limit_utilization';

const containerMetricsQueryConfigSemconvK8s: MetricsQueryOptions<ContainerMetricsFieldSemconvK8s> =
  {
    sourceFilter: '',
    groupByField: 'container.id',
    metricsMap: {
      'metrics.k8s.container.cpu_limit_utilization': {
        aggregation: 'avg',
        field: 'metrics.k8s.container.cpu_limit_utilization',
      },
      'metrics.k8s.container.memory_limit_utilization': {
        aggregation: 'avg',
        field: 'metrics.k8s.container.memory_limit_utilization',
      },
    },
  };

export const metricByFieldEcs = createMetricByFieldLookup(
  containerMetricsQueryConfigEcs.metricsMap
);
export const unpackMetricEcs = makeUnpackMetric(metricByFieldEcs);

const metricByFieldSemconvDocker = createMetricByFieldLookup(
  containerMetricsQueryConfigSemconvDocker.metricsMap
);
export const unpackMetricSemconvDocker = makeUnpackMetric(metricByFieldSemconvDocker);

const metricByFieldSemconvK8s = createMetricByFieldLookup(
  containerMetricsQueryConfigSemconvK8s.metricsMap
);
export const unpackMetricSemconvK8s = makeUnpackMetric(metricByFieldSemconvK8s);

/** @deprecated Use metricByFieldEcs for ECS; use unpack from getUnpackMetricsForSchema for transform */
export const metricByField = metricByFieldEcs;

export function getOptionsForSchema(
  schema: UseNodeMetricsTableOptions['schema'],
  semconvRuntime: ContainerSemconvRuntime,
  kuery?: string
) {
  if (schema === 'semconv') {
    return semconvRuntime === 'k8s'
      ? metricsToApiOptions(containerMetricsQueryConfigSemconvK8s, kuery)
      : metricsToApiOptions(containerMetricsQueryConfigSemconvDocker, kuery);
  }
  return metricsToApiOptions(containerMetricsQueryConfigEcs, kuery);
}
