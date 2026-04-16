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
  otelDatasetFilterDsl,
  SEMCONV_K8S_POD_CPU_NODE_UTILIZATION,
  SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION,
  SEMCONV_K8S_POD_MEMORY_WORKING_SET,
} from '../shared/constants';

type PodMetricsField = typeof ECS_POD_CPU_USAGE_LIMIT_PCT | typeof MEMORY_LIMIT_UTILIZATION;

const podMetricsQueryConfig: MetricsQueryOptions<PodMetricsField> = {
  sourceFilter: {
    term: {
      'event.dataset': 'kubernetes.pod',
    },
  },
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
  | typeof SEMCONV_K8S_POD_CPU_NODE_UTILIZATION
  | typeof SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION
  | typeof SEMCONV_K8S_POD_MEMORY_WORKING_SET;

const podMetricsQueryConfigOtel: MetricsQueryOptions<PodMetricsFieldsOtel> = {
  sourceFilter: otelDatasetFilterDsl('kubeletstatsreceiver.otel'),
  groupByField: ['k8s.pod.uid', 'k8s.pod.name'],
  metricsMap: {
    [SEMCONV_K8S_POD_CPU_NODE_UTILIZATION]: {
      aggregation: 'avg',
      field: SEMCONV_K8S_POD_CPU_NODE_UTILIZATION,
    },
    [SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION]: {
      aggregation: 'avg',
      field: SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION,
    },
    [SEMCONV_K8S_POD_MEMORY_WORKING_SET]: {
      aggregation: 'avg',
      field: SEMCONV_K8S_POD_MEMORY_WORKING_SET,
    },
  },
};

export const metricByField = createMetricByFieldLookup(podMetricsQueryConfig.metricsMap);
const unpackMetric = makeUnpackMetric(metricByField);

const metricByFieldOtel = createMetricByFieldLookup(podMetricsQueryConfigOtel.metricsMap);
const unpackMetricOtel = makeUnpackMetric(metricByFieldOtel);

export interface PodNodeMetricsRow {
  id: string;
  name: string;
  averageCpuUsagePercent: number | null;
  averageMemoryUsagePercent: number | null;
  memoryUnit: '%' | ' MB';
}

export function usePodMetricsTable({
  timerange,
  filterClauseDsl,
  metricsClient,
  isOtel,
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

  const { options: podMetricsOptionsOtel } = useMemo(
    () => metricsToApiOptions(podMetricsQueryConfigOtel, filterClauseDsl),
    [filterClauseDsl]
  );

  const transform = useMemo(
    () => (series: MetricsExplorerSeries) => seriesToPodNodeMetricsRow(series, isOtel ?? false),
    [isOtel]
  );

  const { data, isLoading, metricIndices } = useInfrastructureNodeMetrics<PodNodeMetricsRow>({
    metricsExplorerOptions: isOtel ? podMetricsOptionsOtel : podMetricsOptions,
    timerange,
    transform,
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

function seriesToPodNodeMetricsRow(
  series: MetricsExplorerSeries,
  isOtel: boolean
): PodNodeMetricsRow {
  const [id, name] = series.keys ?? [];
  if (series.rows.length === 0) {
    return rowWithoutMetrics(id, name, isOtel);
  }

  return {
    id,
    name,
    ...calculateMetricAverages(series.rows, isOtel),
  };
}

function rowWithoutMetrics(id: string, name: string, isOtel: boolean) {
  return {
    id,
    name,
    averageCpuUsagePercent: null,
    averageMemoryUsagePercent: null,
    memoryUnit: (isOtel ? ' MB' : '%') as PodNodeMetricsRow['memoryUnit'],
  };
}

function calculateMetricAverages(
  rows: MetricsExplorerRow[],
  isOtel: boolean
): Omit<PodNodeMetricsRow, 'id' | 'name'> {
  const unpackRow = isOtel ? unpackMetricsOtel : unpackMetrics;
  const averageCpuUsagePercentValues: number[] = [];
  const averageMemoryUsagePercentValues: number[] = [];
  let memoryUnit: PodNodeMetricsRow['memoryUnit'] = '%';

  for (const row of rows) {
    const {
      averageCpuUsagePercent,
      averageMemoryUsagePercent,
      memoryUnit: rowMemoryUnit,
    } = unpackRow(row);

    if (averageCpuUsagePercent !== null) {
      averageCpuUsagePercentValues.push(averageCpuUsagePercent);
    }
    if (averageMemoryUsagePercent !== null) {
      averageMemoryUsagePercentValues.push(averageMemoryUsagePercent);
    }
    memoryUnit = rowMemoryUnit;
  }

  const averageCpuUsagePercent =
    averageCpuUsagePercentValues.length === 0
      ? null
      : scaleUpPercentage(averageOfValues(averageCpuUsagePercentValues));

  const averageMemoryUsagePercent =
    averageMemoryUsagePercentValues.length === 0
      ? null
      : memoryUnit === '%'
      ? scaleUpPercentage(averageOfValues(averageMemoryUsagePercentValues))
      : Math.floor(averageOfValues(averageMemoryUsagePercentValues));

  return { averageCpuUsagePercent, averageMemoryUsagePercent, memoryUnit };
}

function unpackMetrics(row: MetricsExplorerRow): Omit<PodNodeMetricsRow, 'id' | 'name'> {
  return {
    averageCpuUsagePercent: unpackMetric(row, ECS_POD_CPU_USAGE_LIMIT_PCT),
    averageMemoryUsagePercent: unpackMetric(row, MEMORY_LIMIT_UTILIZATION),
    memoryUnit: '%',
  };
}

function unpackMetricsOtel(row: MetricsExplorerRow): Omit<PodNodeMetricsRow, 'id' | 'name'> {
  const cpuUtilization = unpackMetricOtel(row, SEMCONV_K8S_POD_CPU_NODE_UTILIZATION);
  const memLimitUtil = unpackMetricOtel(row, SEMCONV_K8S_POD_MEMORY_LIMIT_UTILIZATION);

  if (memLimitUtil != null) {
    return {
      averageCpuUsagePercent: cpuUtilization,
      averageMemoryUsagePercent: memLimitUtil,
      memoryUnit: '%',
    };
  }

  const memoryBytes = unpackMetricOtel(row, SEMCONV_K8S_POD_MEMORY_WORKING_SET);
  const memoryMegabytes =
    typeof memoryBytes === 'number' && Number.isFinite(memoryBytes)
      ? memoryBytes / 1_000_000
      : null;

  return {
    averageCpuUsagePercent: cpuUtilization,
    averageMemoryUsagePercent: memoryMegabytes,
    memoryUnit: ' MB',
  };
}
