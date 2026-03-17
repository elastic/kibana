/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricsQueryOptions } from '../shared';
import { createMetricByFieldLookup, makeUnpackMetric, metricsToApiOptions } from '../shared';
import {
  ECS_CONTAINER_CPU_USAGE_LIMIT_PCT,
  ECS_CONTAINER_MEMORY_USAGE_BYTES,
  SEMCONV_DOCKER_CONTAINER_MEMORY_PERCENT,
  SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION,
  SEMCONV_K8S_CONTAINER_CPU_LIMIT_UTILIZATION,
  SEMCONV_K8S_CONTAINER_MEMORY_LIMIT_UTILIZATION,
} from '../shared/constants';

// --- ECS (Elastic Common Schema) ---
type ContainerMetricsFieldEcs =
  | typeof ECS_CONTAINER_CPU_USAGE_LIMIT_PCT
  | typeof ECS_CONTAINER_MEMORY_USAGE_BYTES;

const containerMetricsQueryConfigEcs: MetricsQueryOptions<ContainerMetricsFieldEcs> = {
  sourceFilter: `event.dataset: "kubernetes.container"`,
  groupByField: 'container.id',
  metricsMap: {
    [ECS_CONTAINER_CPU_USAGE_LIMIT_PCT]: {
      aggregation: 'avg',
      field: ECS_CONTAINER_CPU_USAGE_LIMIT_PCT,
    },
    [ECS_CONTAINER_MEMORY_USAGE_BYTES]: {
      aggregation: 'avg',
      field: ECS_CONTAINER_MEMORY_USAGE_BYTES,
    },
  },
};

// --- SemConv Docker (generic container metrics) ---
type ContainerMetricsFieldSemconvDocker =
  | typeof SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION
  | typeof SEMCONV_DOCKER_CONTAINER_MEMORY_PERCENT;

const containerMetricsQueryConfigSemconvDocker: MetricsQueryOptions<ContainerMetricsFieldSemconvDocker> =
  {
    sourceFilter: 'event.dataset: "dockerstatsreceiver.otel"',
    groupByField: 'container.id',
    metricsMap: {
      [SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION]: {
        aggregation: 'avg',
        field: SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION,
      },
      [SEMCONV_DOCKER_CONTAINER_MEMORY_PERCENT]: {
        aggregation: 'avg',
        field: SEMCONV_DOCKER_CONTAINER_MEMORY_PERCENT,
      },
    },
  };

// --- SemConv K8s (Kubernetes container metrics) ---
type ContainerMetricsFieldSemconvK8s =
  | typeof SEMCONV_K8S_CONTAINER_CPU_LIMIT_UTILIZATION
  | typeof SEMCONV_K8S_CONTAINER_MEMORY_LIMIT_UTILIZATION;

const containerMetricsQueryConfigSemconvK8s: MetricsQueryOptions<ContainerMetricsFieldSemconvK8s> =
  {
    sourceFilter: 'event.dataset: "kubeletstatsreceiver.otel"',
    groupByField: 'container.id',
    metricsMap: {
      [SEMCONV_K8S_CONTAINER_CPU_LIMIT_UTILIZATION]: {
        aggregation: 'avg',
        field: SEMCONV_K8S_CONTAINER_CPU_LIMIT_UTILIZATION,
      },
      [SEMCONV_K8S_CONTAINER_MEMORY_LIMIT_UTILIZATION]: {
        aggregation: 'avg',
        field: SEMCONV_K8S_CONTAINER_MEMORY_LIMIT_UTILIZATION,
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

export function getOptionsForSchema(isOtel: boolean, isK8sContainer?: boolean, kuery?: string) {
  if (isOtel) {
    return isK8sContainer
      ? metricsToApiOptions(containerMetricsQueryConfigSemconvK8s, kuery)
      : metricsToApiOptions(containerMetricsQueryConfigSemconvDocker, kuery);
  }
  return metricsToApiOptions(containerMetricsQueryConfigEcs, kuery);
}
