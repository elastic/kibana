/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import {
  GroupedTimeSeriesChart,
  type GroupedDataPoint,
  extractChangePoints,
  type FormattedChangePoint,
} from '../time_series_chart';
import { useEsqlQuery } from '../../../hooks/use_esql_query';

interface MemoryUsageTrendCardProps {
  timeRange: TimeRange;
  height?: number;
}

/**
 * ES|QL query for Memory usage by cluster over time with change point detection
 * Calculates Memory utilization as a ratio of usage to allocatable memory
 * Uses TS command with TBUCKET for time series aggregation
 *
 * Performance rules applied:
 * - k8s.cluster.name and k8s.node.name are required (BY clause fields)
 * - k8s.node.memory.usage and k8s.node.allocatable_memory are metric fields (OR condition)
 */
const MEMORY_USAGE_BY_CLUSTER_ESQL = `TS remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.node.name IS NOT NULL
  AND (k8s.node.memory.usage IS NOT NULL OR k8s.node.allocatable_memory IS NOT NULL)
| STATS 
    sum_memory_usage = SUM(k8s.node.memory.usage),
    sum_allocatable_memory = SUM(k8s.node.allocatable_memory)
  BY timestamp = TBUCKET(1 minute), k8s.cluster.name
| EVAL value = sum_memory_usage / TO_DOUBLE(sum_allocatable_memory)
| KEEP timestamp, k8s.cluster.name, value`;

/**
 * ES|QL query for change point detection on Memory usage (aggregated across all clusters)
 * This detects significant changes in overall Memory usage patterns
 */
const MEMORY_CHANGE_POINT_ESQL = `TS remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.node.name IS NOT NULL
  AND (k8s.node.memory.usage IS NOT NULL OR k8s.node.allocatable_memory IS NOT NULL)
| STATS 
    sum_memory_usage = SUM(k8s.node.memory.usage),
    sum_allocatable_memory = SUM(k8s.node.allocatable_memory)
  BY timestamp = TBUCKET(1 minute)
| EVAL value = sum_memory_usage / TO_DOUBLE(sum_allocatable_memory)
| CHANGE_POINT value ON timestamp AS type, pvalue
| WHERE type IS NOT NULL
| KEEP timestamp, type, pvalue`;

interface MemoryUsageRow {
  timestamp: string | number;
  'k8s.cluster.name': string;
  value: number | null;
}

interface ChangePointRow {
  timestamp: string | number;
  type: string | null;
  pvalue: number | null;
}

/**
 * Card displaying Memory usage by cluster as a line chart with change point annotations
 */
export const MemoryUsageTrendCard: React.FC<MemoryUsageTrendCardProps> = ({
  timeRange,
  height = 316,
}) => {
  // Fetch Memory usage data
  const { data: memoryData, loading: memoryLoading } = useEsqlQuery<MemoryUsageRow>({
    query: MEMORY_USAGE_BY_CLUSTER_ESQL,
    timeRange,
  });

  // Fetch change points
  const { data: changePointData } = useEsqlQuery<ChangePointRow>({
    query: MEMORY_CHANGE_POINT_ESQL,
    timeRange,
  });

  // Transform data for the chart
  const chartData = useMemo<GroupedDataPoint[]>(() => {
    if (!memoryData) return [];

    return memoryData
      .map((row) => {
        const timestamp =
          typeof row.timestamp === 'string'
            ? new Date(row.timestamp).getTime()
            : (row.timestamp as number);

        return {
          timestamp,
          value: row.value,
          group: row['k8s.cluster.name'],
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [memoryData]);

  // Extract change points
  const changePoints = useMemo<Record<string, FormattedChangePoint[]>>(() => {
    if (!changePointData) return {};

    const points = extractChangePoints(
      changePointData.map((row) => ({
        timestamp: row.timestamp,
        type: row.type,
        pvalue: row.pvalue,
      }))
    );

    // Return as global change points (not per-cluster)
    return { global: points };
  }, [changePointData]);

  // Format value as percentage
  const valueFormatter = useCallback((value: number) => `${(value * 100).toFixed(1)}%`, []);

  return (
    <GroupedTimeSeriesChart
      id="memoryUsageTrendChart"
      title={i18n.translate('xpack.kubernetesPoc.clusterOverview.memoryUtilTrendByClusterTitle', {
        defaultMessage: 'Memory util trend by cluster',
      })}
      data={chartData}
      changePoints={changePoints}
      loading={memoryLoading}
      height={height}
      valueFormatter={valueFormatter}
      showLegend
      yMin={0}
    />
  );
};
