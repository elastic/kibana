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

type PodMetricsField = 'kubernetes.pod.cpu.usage.limit.pct' | 'kubernetes.pod.memory.usage.bytes';

const podMetricsQueryConfig: MetricsQueryOptions<PodMetricsField> = {
  sourceFilter: {
    term: {
      'event.dataset': 'kubernetes.pod',
    },
  },
  groupByField: ['kubernetes.pod.uid', 'kubernetes.pod.name'],
  metricsMap: {
    'kubernetes.pod.cpu.usage.limit.pct': {
      aggregation: 'avg',
      field: 'kubernetes.pod.cpu.usage.limit.pct',
    },
    'kubernetes.pod.memory.usage.bytes': {
      aggregation: 'avg',
      field: 'kubernetes.pod.memory.usage.bytes',
    },
  },
};

export const metricByField = createMetricByFieldLookup(podMetricsQueryConfig.metricsMap);
const unpackMetric = makeUnpackMetric(metricByField);

export interface PodNodeMetricsRow {
  id: string;
  name: string;
  averageCpuUsagePercent: number | null;
  averageMemoryUsageMegabytes: number | null;
}

export function usePodMetricsTable({
  timerange,
  filterClauseDsl,
  metricsClient,
}: UseNodeMetricsTableOptions) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [sortState, setSortState] = useState<SortState<PodNodeMetricsRow>>({
    field: 'averageCpuUsagePercent',
    direction: 'desc',
  });

  const { options: podMetricsOptions } = useMemo(
    () => metricsToApiOptions(podMetricsQueryConfig, filterClauseDsl),
    [filterClauseDsl]
  );

  const { data, isLoading } = useInfrastructureNodeMetrics<PodNodeMetricsRow>({
    metricsExplorerOptions: podMetricsOptions,
    timerange,
    transform: seriesToPodNodeMetricsRow,
    sortState,
    currentPageIndex,
    metricsClient,
  });

  return {
    currentPageIndex,
    data,
    isLoading,
    setCurrentPageIndex,
    setSortState,
    sortState,
    timerange,
  };
}

function seriesToPodNodeMetricsRow(series: MetricsExplorerSeries): PodNodeMetricsRow {
  const [id, name] = series.keys ?? [];
  if (series.rows.length === 0) {
    return rowWithoutMetrics(id, name);
  }

  return {
    id,
    name,
    ...calculateMetricAverages(series.rows),
  };
}

function rowWithoutMetrics(id: string, name: string) {
  return {
    id,
    name,
    averageCpuUsagePercent: null,
    averageMemoryUsageMegabytes: null,
  };
}

function calculateMetricAverages(rows: MetricsExplorerRow[]) {
  const { averageCpuUsagePercentValues, averageMemoryUsageMegabytesValues } =
    collectMetricValues(rows);

  let averageCpuUsagePercent = null;
  if (averageCpuUsagePercentValues.length !== 0) {
    averageCpuUsagePercent = scaleUpPercentage(averageOfValues(averageCpuUsagePercentValues));
  }

  let averageMemoryUsageMegabytes = null;
  if (averageMemoryUsageMegabytesValues.length !== 0) {
    const averageInBytes = averageOfValues(averageMemoryUsageMegabytesValues);
    const bytesPerMegabyte = 1000000;
    averageMemoryUsageMegabytes = Math.floor(averageInBytes / bytesPerMegabyte);
  }

  return {
    averageCpuUsagePercent,
    averageMemoryUsageMegabytes,
  };
}

function collectMetricValues(rows: MetricsExplorerRow[]) {
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

function unpackMetrics(row: MetricsExplorerRow): Omit<PodNodeMetricsRow, 'id' | 'name'> {
  return {
    averageCpuUsagePercent: unpackMetric(row, 'kubernetes.pod.cpu.usage.limit.pct'),
    averageMemoryUsageMegabytes: unpackMetric(row, 'kubernetes.pod.memory.usage.bytes'),
  };
}
