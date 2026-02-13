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
  type ContainerSemconvRuntime,
} from './container_metrics_configs';
import {
  ECS_CONTAINER_CPU_USAGE_LIMIT_PCT,
  ECS_CONTAINER_MEMORY_USAGE_BYTES,
  SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION,
  SEMCONV_DOCKER_CONTAINER_MEMORY_USAGE_TOTAL,
  SEMCONV_K8S_CONTAINER_CPU_LIMIT_UTILIZATION,
  SEMCONV_K8S_CONTAINER_MEMORY_LIMIT_UTILIZATION,
} from './constants';

export type { ContainerSemconvRuntime };
export { metricByFieldEcs, metricByField } from './container_metrics_configs';

export interface UseContainerMetricsTableOptions extends UseNodeMetricsTableOptions {
  /** When schema is 'semconv', which runtime to use. Defaults to 'docker'. */
  semconvRuntime?: ContainerSemconvRuntime;
}

export interface ContainerNodeMetricsRow {
  id: string;
  averageCpuUsage: number | null;
  averageMemoryUsage: number | null;
}

type UnpackMetricsFn = (row: MetricsExplorerRow) => Omit<ContainerNodeMetricsRow, 'id'>;

function getUnpackMetricsForSchema(
  schema: UseNodeMetricsTableOptions['schema'],
  semconvRuntime: ContainerSemconvRuntime
): UnpackMetricsFn {
  if (schema === 'semconv') {
    if (semconvRuntime === 'k8s') {
      return (row) => {
        // semconv k8s unpack metrics
        const cpuUtilization = unpackMetricSemconvK8s(
          row,
          SEMCONV_K8S_CONTAINER_CPU_LIMIT_UTILIZATION
        );
        const memoryUsage = unpackMetricSemconvK8s(
          row,
          SEMCONV_K8S_CONTAINER_MEMORY_LIMIT_UTILIZATION
        );
        return {
          averageCpuUsage: cpuUtilization !== null ? scaleUpPercentage(cpuUtilization) : null,
          averageMemoryUsage: memoryUsage !== null ? scaleUpPercentage(memoryUsage) : null,
        };
      };
    }
    return (row) => {
      // semconv docker unpack metrics
      const cpuUtilization = unpackMetricSemconvDocker(
        row,
        SEMCONV_DOCKER_CONTAINER_CPU_UTILIZATION
      );
      const memoryBytes = unpackMetricSemconvDocker(
        row,
        SEMCONV_DOCKER_CONTAINER_MEMORY_USAGE_TOTAL
      );
      return {
        averageCpuUsage: cpuUtilization !== null ? scaleUpPercentage(cpuUtilization) : null,
        averageMemoryUsage: memoryBytes !== null ? Math.floor(memoryBytes / 1_000_000) : null,
      };
    };
  }
  return (row) => {
    // ecs unpack metrics
    const rawCpu = unpackMetricEcs(row, ECS_CONTAINER_CPU_USAGE_LIMIT_PCT);
    const memoryBytes = unpackMetricEcs(row, ECS_CONTAINER_MEMORY_USAGE_BYTES);
    return {
      averageCpuUsage: rawCpu !== null ? scaleUpPercentage(rawCpu) : null,
      averageMemoryUsage: memoryBytes !== null ? Math.floor(memoryBytes / 1_000_000) : null,
    };
  };
}

export function useContainerMetricsTable({
  timerange,
  kuery,
  metricsClient,
  schema,
  semconvRuntime = 'docker',
}: UseContainerMetricsTableOptions) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [sortState, setSortState] = useState<SortState<ContainerNodeMetricsRow>>({
    field: 'averageCpuUsage',
    direction: 'desc',
  });

  const metricsExplorerOptions = useMemo(
    () => getOptionsForSchema(schema, semconvRuntime, kuery).options,
    [schema, semconvRuntime, kuery]
  );

  const transform = useMemo(() => {
    const unpackMetrics = getUnpackMetricsForSchema(schema ?? 'ecs', semconvRuntime);
    return (series: MetricsExplorerSeries): ContainerNodeMetricsRow =>
      seriesToContainerNodeMetricsRow(series, unpackMetrics);
  }, [schema, semconvRuntime]);

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
    const { averageCpuUsage, averageMemoryUsage: averageMemoryUsageMegabytes } = unpackMetrics(row);

    if (averageCpuUsage !== null) {
      averageCpuUsageValues.push(averageCpuUsage);
    }

    if (averageMemoryUsageMegabytes !== null) {
      averageMemoryUsageValues.push(averageMemoryUsageMegabytes);
    }
  });

  return {
    averageCpuUsageValues,
    averageMemoryUsageValues,
  };
}
