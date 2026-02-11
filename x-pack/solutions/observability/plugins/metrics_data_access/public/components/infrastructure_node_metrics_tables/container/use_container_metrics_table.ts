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

export type { ContainerSemconvRuntime };
export { metricByFieldEcs, metricByField } from './container_metrics_configs';

export interface UseContainerMetricsTableOptions extends UseNodeMetricsTableOptions {
  /** When schema is 'semconv', which runtime to use. Defaults to 'docker'. */
  semconvRuntime?: ContainerSemconvRuntime;
}

export interface ContainerNodeMetricsRow {
  id: string;
  averageCpuUsagePercent: number | null;
  averageMemoryUsageMegabytes: number | null;
}

type UnpackMetricsFn = (row: MetricsExplorerRow) => Omit<ContainerNodeMetricsRow, 'id'>;

function getUnpackMetricsForSchema(
  schema: UseNodeMetricsTableOptions['schema'],
  semconvRuntime: ContainerSemconvRuntime
): UnpackMetricsFn {
  if (schema === 'semconv') {
    if (semconvRuntime === 'k8s') {
      return (row) => {
        const cpuUtilization = unpackMetricSemconvK8s(
          row,
          'metrics.k8s.container.cpu_limit_utilization'
        );
        const memoryUsage = unpackMetricSemconvK8s(
          row,
          'metrics.k8s.container.memory_limit_utilization'
        );
        return {
          averageCpuUsagePercent:
            cpuUtilization !== null ? scaleUpPercentage(cpuUtilization) : null,
          averageMemoryUsageMegabytes: memoryUsage !== null ? scaleUpPercentage(memoryUsage) : null,
        };
      };
    }
    return (row) => {
      const cpuUtilization = unpackMetricSemconvDocker(row, 'metrics.container.cpu.utilization');
      const memoryBytes = unpackMetricSemconvDocker(row, 'metrics.container.memory.usage.total');
      return {
        averageCpuUsagePercent: cpuUtilization !== null ? scaleUpPercentage(cpuUtilization) : null,
        averageMemoryUsageMegabytes:
          memoryBytes !== null ? Math.floor(memoryBytes / 1000000) : null,
      };
    };
  }
  return (row) => {
    const rawCpu = unpackMetricEcs(row, 'kubernetes.container.cpu.usage.limit.pct');
    const memoryBytes = unpackMetricEcs(row, 'kubernetes.container.memory.usage.bytes');
    return {
      averageCpuUsagePercent: rawCpu !== null ? scaleUpPercentage(rawCpu) : null,
      averageMemoryUsageMegabytes: memoryBytes !== null ? Math.floor(memoryBytes / 1000000) : null,
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
    field: 'averageCpuUsagePercent',
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
    averageCpuUsagePercent: null,
    averageMemoryUsageMegabytes: null,
  };
}

function calculateMetricAverages(rows: MetricsExplorerRow[], unpackMetrics: UnpackMetricsFn) {
  const { averageCpuUsagePercentValues, averageMemoryUsageMegabytesValues } = collectMetricValues(
    rows,
    unpackMetrics
  );

  let averageCpuUsagePercent: number | null = null;
  if (averageCpuUsagePercentValues.length !== 0) {
    averageCpuUsagePercent = averageOfValues(averageCpuUsagePercentValues);
  }

  let averageMemoryUsageMegabytes: number | null = null;
  if (averageMemoryUsageMegabytesValues.length !== 0) {
    averageMemoryUsageMegabytes = Math.floor(averageOfValues(averageMemoryUsageMegabytesValues));
  }

  return {
    averageCpuUsagePercent,
    averageMemoryUsageMegabytes,
  };
}

function collectMetricValues(rows: MetricsExplorerRow[], unpackMetrics: UnpackMetricsFn) {
  const averageCpuUsagePercentValues: number[] = [];
  const averageMemoryUsageMegabytesValues: number[] = [];

  rows.forEach((row) => {
    const { averageCpuUsagePercent, averageMemoryUsageMegabytes } = unpackMetrics(row);

    if (averageCpuUsagePercent !== null) {
      averageCpuUsagePercentValues.push(averageCpuUsagePercent);
    }

    if (averageMemoryUsageMegabytes !== null) {
      averageMemoryUsageMegabytesValues.push(averageMemoryUsageMegabytes);
    }
  });

  return {
    averageCpuUsagePercentValues,
    averageMemoryUsageMegabytesValues,
  };
}
