/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import type {
  MetricsExplorerRow,
  MetricsExplorerSeries,
} from '../../../../common/http_api/metrics_explorer';
import type { SortState, UseNodeMetricsTableOptions } from '../shared';
import { averageOfValues, scaleUpPercentage, useInfrastructureNodeMetrics } from '../shared';
import {
  getOptionsForSchema,
  unpackMetricEcs,
  unpackMetricSemconvDocker,
  unpackMetricSemconvK8s,
} from './container_metrics_configs';
import {
  ECS_CONTAINER_CPU_USAGE_LIMIT_PCT,
  ECS_CONTAINER_MEMORY_USAGE_BYTES,
  SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION,
  SEMCONV_DOCKER_CONTAINER_MEMORY_PERCENT,
  SEMCONV_K8S_CONTAINER_CPU_LIMIT_UTILIZATION,
  SEMCONV_K8S_CONTAINER_MEMORY_LIMIT_UTILIZATION,
} from '../shared/constants';

export { metricByFieldEcs, metricByField } from './container_metrics_configs';

export interface UseContainerMetricsTableOptions extends UseNodeMetricsTableOptions {
  isK8sContainer?: boolean;
}

export interface ContainerNodeMetricsRow {
  id: string;
  averageCpuUsage: number | null;
  averageMemoryUsage: number | null;
}

type UnpackMetricsFn = (row: MetricsExplorerRow) => Omit<ContainerNodeMetricsRow, 'id'>;

const semconvDockerUnpackMetrics = (row: MetricsExplorerRow) => {
  // semconv docker unpack metrics
  const cpuUtilization = unpackMetricSemconvDocker(row, SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION);
  const memoryUtilization = unpackMetricSemconvDocker(row, SEMCONV_DOCKER_CONTAINER_MEMORY_PERCENT);
  return {
    averageCpuUsage: cpuUtilization !== null ? scaleUpPercentage(cpuUtilization) : null,
    averageMemoryUsage: memoryUtilization !== null ? memoryUtilization : null,
  };
};

const semconvK8sUnpackMetrics = (row: MetricsExplorerRow) => {
  // semconv k8s unpack metrics
  const cpuUtilization = unpackMetricSemconvK8s(row, SEMCONV_K8S_CONTAINER_CPU_LIMIT_UTILIZATION);
  const memoryUsage = unpackMetricSemconvK8s(row, SEMCONV_K8S_CONTAINER_MEMORY_LIMIT_UTILIZATION);
  return {
    averageCpuUsage: cpuUtilization !== null ? scaleUpPercentage(cpuUtilization) : null,
    averageMemoryUsage: memoryUsage !== null ? scaleUpPercentage(memoryUsage) : null,
  };
};

const ecsUnpackMetrics = (row: MetricsExplorerRow) => {
  const rawCpu = unpackMetricEcs(row, ECS_CONTAINER_CPU_USAGE_LIMIT_PCT);
  const memoryBytes = unpackMetricEcs(row, ECS_CONTAINER_MEMORY_USAGE_BYTES);
  return {
    averageCpuUsage: rawCpu !== null ? scaleUpPercentage(rawCpu) : null,
    averageMemoryUsage: memoryBytes !== null ? Math.floor(memoryBytes / 1_000_000) : null,
  };
};

function getUnpackMetricsForSchema(isOtel: boolean, isK8sContainer?: boolean): UnpackMetricsFn {
  if (isOtel) {
    if (isK8sContainer) {
      // semconv k8s metrics unpacking
      return semconvK8sUnpackMetrics;
    }
    // semconv docker metrics unpacking
    return semconvDockerUnpackMetrics;
  }
  // ecs metrics unpacking
  return ecsUnpackMetrics;
}

export function useContainerMetricsTable({
  timerange,
  kuery,
  metricsClient,
  isOtel,
  isK8sContainer,
}: UseContainerMetricsTableOptions) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [sortState, setSortState] = useState<SortState<ContainerNodeMetricsRow>>({
    field: 'averageCpuUsage',
    direction: 'desc',
  });

  const metricsExplorerOptions = useMemo(
    () => getOptionsForSchema(isOtel ?? false, isK8sContainer, kuery).options,
    [isOtel, isK8sContainer, kuery]
  );

  const transform = useMemo(() => {
    const unpackMetrics = getUnpackMetricsForSchema(isOtel ?? false, isK8sContainer);
    return (series: MetricsExplorerSeries): ContainerNodeMetricsRow =>
      seriesToContainerNodeMetricsRow(series, unpackMetrics);
  }, [isOtel, isK8sContainer]);

  const { data, isLoading, metricIndices } = useInfrastructureNodeMetrics<ContainerNodeMetricsRow>({
    metricsExplorerOptions,
    timerange,
    transform,
    sortState,
    currentPageIndex,
    metricsClient,
  });
  return {
    data,
    isLoading,
    metricIndices,
    setCurrentPageIndex,
    setSortState,
    sortState,
    timerange,
  };
}

function seriesToContainerNodeMetricsRow(
  series: MetricsExplorerSeries,
  unpackMetrics: UnpackMetricsFn
): ContainerNodeMetricsRow {
  if (series.rows.length === 0) {
    return rowWithoutMetrics(series.id);
  }

  return {
    id: series.id,
    ...calculateMetricAverages(series.rows, unpackMetrics),
  };
}

function rowWithoutMetrics(id: string): ContainerNodeMetricsRow {
  return {
    id,
    averageCpuUsage: null,
    averageMemoryUsage: null,
  };
}

function calculateMetricAverages(rows: MetricsExplorerRow[], unpackMetrics: UnpackMetricsFn) {
  const { averageCpuUsageValues, averageMemoryUsageValues } = collectMetricValues(
    rows,
    unpackMetrics
  );

  let averageCpuUsage: number | null = null;
  if (averageCpuUsageValues.length !== 0) {
    averageCpuUsage = averageOfValues(averageCpuUsageValues);
  }

  let averageMemoryUsage: number | null = null;
  if (averageMemoryUsageValues.length !== 0) {
    averageMemoryUsage = Math.floor(averageOfValues(averageMemoryUsageValues));
  }

  return {
    averageCpuUsage,
    averageMemoryUsage,
  };
}

function collectMetricValues(rows: MetricsExplorerRow[], unpackMetrics: UnpackMetricsFn) {
  const averageCpuUsageValues: number[] = [];
  const averageMemoryUsageValues: number[] = [];
  rows.forEach((row) => {
    const { averageCpuUsage, averageMemoryUsage } = unpackMetrics(row);

    if (averageCpuUsage !== null) {
      averageCpuUsageValues.push(averageCpuUsage);
    }

    if (averageMemoryUsage !== null) {
      averageMemoryUsageValues.push(averageMemoryUsage);
    }
  });

  return {
    averageCpuUsageValues,
    averageMemoryUsageValues,
  };
}
