/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@kbn/data-views-plugin/common/types';
import type { MetricsQueryOptions } from '../shared';
import { createMetricByFieldLookup, makeUnpackMetric, metricsToApiOptions } from '../shared';
import {
  ECS_CONTAINER_CPU_USAGE_LIMIT_PCT,
  ECS_CONTAINER_MEMORY_USAGE_BYTES,
  otelDatasetFilterDsl,
  SEMCONV_DOCKER_CONTAINER_MEMORY_PERCENT,
  SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION,
  SEMCONV_CONTAINER_CPU_USAGE,
  SEMCONV_CONTAINER_MEMORY_WORKING_SET,
} from '../shared/constants';

// --- ECS (Elastic Common Schema) ---
type ContainerMetricsFieldEcs =
  | typeof ECS_CONTAINER_CPU_USAGE_LIMIT_PCT
  | typeof ECS_CONTAINER_MEMORY_USAGE_BYTES;

const containerMetricsQueryConfigEcs: MetricsQueryOptions<ContainerMetricsFieldEcs> = {
  sourceFilter: {
    term: {
      'event.dataset': 'kubernetes.container',
    },
  },
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
    sourceFilter: otelDatasetFilterDsl('dockerstatsreceiver.otel'),
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
// Uses generic container metrics always emitted by kubeletstats,
// regardless of whether k8s resource limits are configured.
type ContainerMetricsFieldSemconvK8s =
  | typeof SEMCONV_CONTAINER_CPU_USAGE
  | typeof SEMCONV_CONTAINER_MEMORY_WORKING_SET;

const containerMetricsQueryConfigSemconvK8s: MetricsQueryOptions<ContainerMetricsFieldSemconvK8s> =
  {
    sourceFilter: otelDatasetFilterDsl('kubeletstatsreceiver.otel'),
    groupByField: 'container.id',
    metricsMap: {
      [SEMCONV_CONTAINER_CPU_USAGE]: {
        aggregation: 'avg',
        field: SEMCONV_CONTAINER_CPU_USAGE,
      },
      [SEMCONV_CONTAINER_MEMORY_WORKING_SET]: {
        aggregation: 'avg',
        field: SEMCONV_CONTAINER_MEMORY_WORKING_SET,
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

export const metricByFieldSemconvK8s = createMetricByFieldLookup(
  containerMetricsQueryConfigSemconvK8s.metricsMap
);
export const unpackMetricSemconvK8s = makeUnpackMetric(metricByFieldSemconvK8s);

/** @deprecated Use metricByFieldEcs for ECS; use unpack from getUnpackMetricsForSchema for transform */
export const metricByField = metricByFieldEcs;

export function getOptionsForSchema(
  isOtel: boolean,
  isK8sContainer?: boolean,
  filterClauseDsl?: QueryDslQueryContainer
) {
  if (isOtel) {
    return isK8sContainer
      ? metricsToApiOptions(containerMetricsQueryConfigSemconvK8s, filterClauseDsl)
      : metricsToApiOptions(containerMetricsQueryConfigSemconvDocker, filterClauseDsl);
  }
  return metricsToApiOptions(containerMetricsQueryConfigEcs, filterClauseDsl);
}
