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
  useInfrastructureNodeMetrics,
} from '../shared';

// OTel K8s node metrics fields
type OtelHostMetricsField = 'metrics.k8s.node.cpu.usage' | 'metrics.k8s.node.memory.usage';

const otelHostMetricsQueryConfig: MetricsQueryOptions<OtelHostMetricsField> = {
  sourceFilter: {
    bool: {
      filter: [
        {
          term: {
            'data_stream.dataset': 'kubeletstatsreceiver.otel',
          },
        },
        {
          // Ensure we only get node-level metrics (not pod/container metrics)
          exists: {
            field: 'metrics.k8s.node.cpu.usage',
          },
        },
      ],
    },
  },
  groupByField: 'resource.attributes.k8s.node.name',
  metricsMap: {
    'metrics.k8s.node.cpu.usage': {
      aggregation: 'avg',
      field: 'metrics.k8s.node.cpu.usage',
    },
    'metrics.k8s.node.memory.usage': {
      aggregation: 'avg',
      field: 'metrics.k8s.node.memory.usage',
    },
  },
};

export const metricByField = createMetricByFieldLookup(otelHostMetricsQueryConfig.metricsMap);
const unpackMetric = makeUnpackMetric(metricByField);

export interface OtelHostNodeMetricsRow {
  name: string;
  cpuCount: number | null;
  averageCpuUsagePercent: number | null;
  totalMemoryMegabytes: number | null;
  averageMemoryUsagePercent: number | null;
}

export function useOtelHostMetricsTable({
  timerange,
  filterClauseDsl,
  metricsClient,
}: UseNodeMetricsTableOptions) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [sortState, setSortState] = useState<SortState<OtelHostNodeMetricsRow>>({
    field: 'averageCpuUsagePercent',
    direction: 'desc',
  });

  const { options: hostMetricsOptions } = useMemo(
    () => metricsToApiOptions(otelHostMetricsQueryConfig, filterClauseDsl),
    [filterClauseDsl]
  );

  const { data, isLoading } = useInfrastructureNodeMetrics<OtelHostNodeMetricsRow>({
    metricsExplorerOptions: hostMetricsOptions,
    timerange,
    transform: seriesToOtelHostNodeMetricsRow,
    sortState,
    currentPageIndex,
    metricsClient,
  });

  return {
    data,
    isLoading,
    setCurrentPageIndex,
    setSortState,
    sortState,
    timerange,
  };
}

function seriesToOtelHostNodeMetricsRow(series: MetricsExplorerSeries): OtelHostNodeMetricsRow {
  if (series.rows.length === 0) {
    return rowWithoutMetrics(series.id);
  }

  return {
    name: series.id,
    ...calculateMetricAverages(series.rows),
  };
}

function rowWithoutMetrics(name: string): OtelHostNodeMetricsRow {
  return {
    name,
    cpuCount: null,
    averageCpuUsagePercent: null,
    totalMemoryMegabytes: null,
    averageMemoryUsagePercent: null,
  };
}

function calculateMetricAverages(rows: MetricsExplorerRow[]) {
  const { cpuUsageValues, memoryUsageValues } = collectMetricValues(rows);

  // For OTel kubeletstats, k8s.node.cpu.usage is in CPU cores (e.g., 0.5 = 50% of 1 core)
  // We display it as a raw value since we don't have allocatable info
  let averageCpuUsagePercent = null;
  if (cpuUsageValues.length !== 0) {
    // k8s.node.cpu.usage is already in CPU cores, multiply by 100 for display
    averageCpuUsagePercent = averageOfValues(cpuUsageValues) * 100;
  }

  // Memory usage in bytes, convert to MB for display
  let totalMemoryMegabytes = null;
  let averageMemoryUsagePercent = null;
  if (memoryUsageValues.length !== 0) {
    const avgMemoryUsage = averageOfValues(memoryUsageValues);
    const bytesPerMegabyte = 1000000;
    totalMemoryMegabytes = Math.floor(avgMemoryUsage / bytesPerMegabyte);
    // Without allocatable, we can't calculate percentage - set to null
    averageMemoryUsagePercent = null;
  }

  return {
    cpuCount: null, // Not available from kubeletstatsreceiver
    averageCpuUsagePercent,
    totalMemoryMegabytes,
    averageMemoryUsagePercent,
  };
}

function collectMetricValues(rows: MetricsExplorerRow[]) {
  const cpuUsageValues: number[] = [];
  const memoryUsageValues: number[] = [];

  rows.forEach((row) => {
    const { cpuUsage, memoryUsage } = unpackMetrics(row);

    if (cpuUsage !== null) {
      cpuUsageValues.push(cpuUsage);
    }
    if (memoryUsage !== null) {
      memoryUsageValues.push(memoryUsage);
    }
  });

  return {
    cpuUsageValues,
    memoryUsageValues,
  };
}

function unpackMetrics(row: MetricsExplorerRow) {
  return {
    cpuUsage: unpackMetric(row, 'metrics.k8s.node.cpu.usage'),
    memoryUsage: unpackMetric(row, 'metrics.k8s.node.memory.usage'),
  };
}
