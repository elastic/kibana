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
import type { MetricsQueryOptions, SortState, UseNodeMetricsTableOptions } from '../shared';
import {
  averageOfValues,
  createMetricByFieldLookup,
  makeUnpackMetric,
  metricsToApiOptions,
  scaleUpPercentage,
  useInfrastructureNodeMetrics,
} from '../shared';
import {
  SEMCONV_SYSTEM_CPU_LOGICAL_COUNT,
  SEMCONV_SYSTEM_CPU_UTILIZATION,
  SEMCONV_SYSTEM_MEMORY_LIMIT,
  SEMCONV_SYSTEM_MEMORY_UTILIZATION,
  SYSTEM_CPU_CORES,
  SYSTEM_CPU_TOTAL_NORM_PCT,
  SYSTEM_MEMORY_TOTAL,
  SYSTEM_MEMORY_USED_PCT,
} from '../shared/constants';

type HostMetricsField =
  | typeof SYSTEM_CPU_CORES
  | typeof SYSTEM_CPU_TOTAL_NORM_PCT
  | typeof SYSTEM_MEMORY_TOTAL
  | typeof SYSTEM_MEMORY_USED_PCT;

const hostsMetricsQueryConfig: MetricsQueryOptions<HostMetricsField> = {
  sourceFilter: 'event.module: "system"',
  groupByField: 'host.name',
  metricsMap: {
    [SYSTEM_CPU_CORES]: { aggregation: 'max', field: SYSTEM_CPU_CORES },
    [SYSTEM_CPU_TOTAL_NORM_PCT]: {
      aggregation: 'avg',
      field: SYSTEM_CPU_TOTAL_NORM_PCT,
    },
    [SYSTEM_MEMORY_TOTAL]: { aggregation: 'max', field: SYSTEM_MEMORY_TOTAL },
    [SYSTEM_MEMORY_USED_PCT]: {
      aggregation: 'avg',
      field: SYSTEM_MEMORY_USED_PCT,
    },
  },
};

type HostMetricsFieldsOtel =
  | typeof SEMCONV_SYSTEM_CPU_LOGICAL_COUNT
  | typeof SEMCONV_SYSTEM_CPU_UTILIZATION
  | typeof SEMCONV_SYSTEM_MEMORY_LIMIT
  | typeof SEMCONV_SYSTEM_MEMORY_UTILIZATION;

const hostsMetricsQueryConfigOtel: MetricsQueryOptions<HostMetricsFieldsOtel> = {
  sourceFilter: 'event.dataset: "hostmetricsreceiver.otel"',
  groupByField: 'host.name',
  metricsMap: {
    [SEMCONV_SYSTEM_CPU_LOGICAL_COUNT]: {
      aggregation: 'max',
      field: SEMCONV_SYSTEM_CPU_LOGICAL_COUNT,
    },
    [SEMCONV_SYSTEM_CPU_UTILIZATION]: {
      aggregation: 'avg',
      field: SEMCONV_SYSTEM_CPU_UTILIZATION,
    },
    [SEMCONV_SYSTEM_MEMORY_LIMIT]: {
      aggregation: 'max',
      field: SEMCONV_SYSTEM_MEMORY_LIMIT,
    },
    [SEMCONV_SYSTEM_MEMORY_UTILIZATION]: {
      aggregation: 'avg',
      field: SEMCONV_SYSTEM_MEMORY_UTILIZATION,
    },
  },
};
export const metricByField = createMetricByFieldLookup(hostsMetricsQueryConfig.metricsMap);
const unpackMetric = makeUnpackMetric(metricByField);

export interface HostNodeMetricsRow {
  name: string;
  cpuCount: number | null;
  averageCpuUsagePercent: number | null;
  totalMemoryMegabytes: number | null;
  averageMemoryUsagePercent: number | null;
}

export function useHostMetricsTable({
  timerange,
  kuery,
  metricsClient,
  isOtel,
}: UseNodeMetricsTableOptions) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [sortState, setSortState] = useState<SortState<HostNodeMetricsRow>>({
    field: 'averageCpuUsagePercent',
    direction: 'desc',
  });

  const { options: hostMetricsOptions } = useMemo(
    () => metricsToApiOptions(hostsMetricsQueryConfig, kuery),
    [kuery]
  );

  const { options: hostMetricsOptionsOtel } = useMemo(
    () => metricsToApiOptions(hostsMetricsQueryConfigOtel, kuery),
    [kuery]
  );
  const { data, isLoading, metricIndices } = useInfrastructureNodeMetrics<HostNodeMetricsRow>({
    metricsExplorerOptions: isOtel ? hostMetricsOptionsOtel : hostMetricsOptions,
    timerange,
    transform: seriesToHostNodeMetricsRow,
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

function seriesToHostNodeMetricsRow(series: MetricsExplorerSeries): HostNodeMetricsRow {
  if (series.rows.length === 0) {
    return rowWithoutMetrics(series.id);
  }

  return {
    name: series.id,
    ...calculateMetricAverages(series.rows),
  };
}

function rowWithoutMetrics(name: string) {
  return {
    name,
    cpuCount: null,
    averageCpuUsagePercent: null,
    totalMemoryMegabytes: null,
    averageMemoryUsagePercent: null,
  };
}

function calculateMetricAverages(rows: MetricsExplorerRow[]) {
  const {
    cpuCountValues,
    averageCpuUsagePercentValues,
    totalMemoryMegabytesValues,
    averageMemoryUsagePercentValues,
  } = collectMetricValues(rows);

  let cpuCount = null;
  if (cpuCountValues.length !== 0) {
    cpuCount = cpuCountValues.at(-1)!;
  }

  let averageCpuUsagePercent = null;
  if (averageCpuUsagePercentValues.length !== 0) {
    averageCpuUsagePercent = scaleUpPercentage(averageOfValues(averageCpuUsagePercentValues));
  }

  let totalMemoryMegabytes = null;
  if (totalMemoryMegabytesValues.length !== 0) {
    const memoryInBytes = totalMemoryMegabytesValues.at(-1);
    const bytesPerMegabyte = 1000000;
    totalMemoryMegabytes = Math.floor(memoryInBytes! / bytesPerMegabyte);
  }

  let averageMemoryUsagePercent = null;
  if (averageMemoryUsagePercentValues.length !== 0) {
    averageMemoryUsagePercent = scaleUpPercentage(averageOfValues(averageMemoryUsagePercentValues));
  }

  return {
    cpuCount,
    averageCpuUsagePercent,
    totalMemoryMegabytes,
    averageMemoryUsagePercent,
  };
}

function collectMetricValues(rows: MetricsExplorerRow[]) {
  const cpuCountValues: number[] = [];
  const averageCpuUsagePercentValues: number[] = [];
  const totalMemoryMegabytesValues: number[] = [];
  const averageMemoryUsagePercentValues: number[] = [];

  rows.forEach((row) => {
    const { cpuCount, averageCpuUsagePercent, totalMemoryMegabytes, averageMemoryUsagePercent } =
      unpackMetrics(row);

    if (cpuCount !== null) {
      cpuCountValues.push(cpuCount);
    }

    if (averageCpuUsagePercent !== null) {
      averageCpuUsagePercentValues.push(averageCpuUsagePercent);
    }

    if (totalMemoryMegabytes !== null) {
      totalMemoryMegabytesValues.push(totalMemoryMegabytes);
    }

    if (averageMemoryUsagePercent !== null) {
      averageMemoryUsagePercentValues.push(averageMemoryUsagePercent);
    }
  });

  return {
    cpuCountValues,
    averageCpuUsagePercentValues,
    totalMemoryMegabytesValues,
    averageMemoryUsagePercentValues,
  };
}

function unpackMetrics(row: MetricsExplorerRow): Omit<HostNodeMetricsRow, 'name'> {
  return {
    cpuCount: unpackMetric(row, SYSTEM_CPU_CORES),
    averageCpuUsagePercent: unpackMetric(row, SYSTEM_CPU_TOTAL_NORM_PCT),
    totalMemoryMegabytes: unpackMetric(row, SYSTEM_MEMORY_TOTAL),
    averageMemoryUsagePercent: unpackMetric(row, SYSTEM_MEMORY_USED_PCT),
  };
}
