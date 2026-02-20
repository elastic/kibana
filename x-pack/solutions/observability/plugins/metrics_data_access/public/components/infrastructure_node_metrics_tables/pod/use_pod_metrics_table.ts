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
  ECS_POD_CPU_USAGE_LIMIT_PCT,
  KUBERNETES_NODE_MEMORY_ALLOCATABLE_BYTES,
  KUBERNETES_NODE_MEMORY_USAGE_BYTES,
  MEMORY_LIMIT_UTILIZATION,
  SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION,
  SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION,
} from '../shared/constants';

type PodMetricsField = typeof ECS_POD_CPU_USAGE_LIMIT_PCT | typeof MEMORY_LIMIT_UTILIZATION;

const podMetricsQueryConfig: MetricsQueryOptions<PodMetricsField> = {
  sourceFilter: `event.dataset: "kubernetes.pod"`,
  groupByField: ['kubernetes.pod.uid', 'kubernetes.pod.name'],
  metricsMap: {
    [ECS_POD_CPU_USAGE_LIMIT_PCT]: {
      aggregation: 'avg',
      field: ECS_POD_CPU_USAGE_LIMIT_PCT,
    },
    [MEMORY_LIMIT_UTILIZATION]: {
      aggregation: 'custom',
      field: MEMORY_LIMIT_UTILIZATION,
      custom_metrics: [
        {
          name: 'A',
          aggregation: 'max',
          field: KUBERNETES_NODE_MEMORY_ALLOCATABLE_BYTES,
        },
        {
          name: 'B',
          aggregation: 'avg',
          field: KUBERNETES_NODE_MEMORY_USAGE_BYTES,
        },
      ],
      equation: 'B / A',
    },
  },
};

type PodMetricsFieldsOtel =
  | typeof SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION
  | typeof MEMORY_LIMIT_UTILIZATION;

const podMetricsQueryConfigOtel: MetricsQueryOptions<PodMetricsFieldsOtel> = {
  sourceFilter: 'event.dataset: "kubeletstatsreceiver.otel"',
  groupByField: ['k8s.pod.uid', 'k8s.pod.name'],
  metricsMap: {
    // this is an optional field and wont populate unless specifically enabled in kubeletstatreceiver.
    // There are not pod metrics that can derive this value.
    [SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION]: {
      aggregation: 'avg',
      field: SEMCONV_K8S_POD_CPU_LIMIT_UTILIZATION, // this is an opt-in field.
    },
    [MEMORY_LIMIT_UTILIZATION]: {
      field: MEMORY_LIMIT_UTILIZATION,
      aggregation: 'custom',
      custom_metrics: [
        {
          name: 'A',
          aggregation: 'avg',
          field: SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION,
        },
      ],
      equation: 'A',
    },
  },
};

export const metricByField = createMetricByFieldLookup(podMetricsQueryConfig.metricsMap);
const unpackMetric = makeUnpackMetric(metricByField);

export interface PodNodeMetricsRow {
  id: string;
  name: string;
  averageCpuUsagePercent: number | null;
  averageMemoryUsagePercent: number | null;
}

export function usePodMetricsTable({
  timerange,
  kuery,
  metricsClient,
  isOtel,
}: UseNodeMetricsTableOptions) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [sortState, setSortState] = useState<SortState<PodNodeMetricsRow>>({
    field: 'averageCpuUsagePercent',
    direction: 'desc',
  });

  const { options: podMetricsOptions } = useMemo(
    () => metricsToApiOptions(podMetricsQueryConfig, kuery),
    [kuery]
  );

  const { options: podMetricsOptionsOtel } = useMemo(
    () => metricsToApiOptions(podMetricsQueryConfigOtel, kuery),
    [kuery]
  );

  const { data, isLoading, metricIndices } = useInfrastructureNodeMetrics<PodNodeMetricsRow>({
    metricsExplorerOptions: isOtel ? podMetricsOptionsOtel : podMetricsOptions,
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
    metricIndices,
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
    averageMemoryUsagePercent: null,
  };
}

function calculateMetricAverages(rows: MetricsExplorerRow[]) {
  const { averageCpuUsagePercentValues, averageMemoryUsagePercentValues } =
    collectMetricValues(rows);

  let averageCpuUsagePercent = null;
  if (averageCpuUsagePercentValues.length !== 0) {
    averageCpuUsagePercent = scaleUpPercentage(averageOfValues(averageCpuUsagePercentValues));
  }

  let averageMemoryUsagePercent = null;
  if (averageMemoryUsagePercentValues.length !== 0) {
    averageMemoryUsagePercent = scaleUpPercentage(averageOfValues(averageMemoryUsagePercentValues));
  }
  return {
    averageCpuUsagePercent,
    averageMemoryUsagePercent,
  };
}

function collectMetricValues(rows: MetricsExplorerRow[]) {
  const averageCpuUsagePercentValues: number[] = [];
  const averageMemoryUsagePercentValues: number[] = [];

  rows.forEach((row) => {
    const { averageCpuUsagePercent, averageMemoryUsagePercent } = unpackMetrics(row);

    if (averageCpuUsagePercent !== null) {
      averageCpuUsagePercentValues.push(averageCpuUsagePercent);
    }

    if (averageMemoryUsagePercent !== null) {
      averageMemoryUsagePercentValues.push(averageMemoryUsagePercent);
    }
  });

  return {
    averageCpuUsagePercentValues,
    averageMemoryUsagePercentValues,
  };
}

function unpackMetrics(row: MetricsExplorerRow): Omit<PodNodeMetricsRow, 'id' | 'name'> {
  return {
    averageCpuUsagePercent: unpackMetric(row, ECS_POD_CPU_USAGE_LIMIT_PCT),
    averageMemoryUsagePercent: unpackMetric(row, MEMORY_LIMIT_UTILIZATION),
  };
}
