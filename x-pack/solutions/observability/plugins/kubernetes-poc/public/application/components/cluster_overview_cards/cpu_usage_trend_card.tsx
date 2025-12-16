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

interface CpuUsageTrendCardProps {
  timeRange: TimeRange;
  height?: number;
}

/**
 * ES|QL query for CPU usage by cluster over time with change point detection
 * Calculates CPU utilization as a ratio of usage to allocatable CPU
 * Uses TS command with TBUCKET for time series aggregation
 *
 * Performance rules applied:
 * - k8s.cluster.name and k8s.node.name are required (BY clause fields)
 * - k8s.node.cpu.usage and k8s.node.allocatable_cpu are metric fields (OR condition)
 */
const CPU_USAGE_BY_CLUSTER_ESQL = `TS remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.node.name IS NOT NULL
  AND (k8s.node.cpu.usage IS NOT NULL OR k8s.node.allocatable_cpu IS NOT NULL)
| STATS 
    sum_cpu_usage = SUM(k8s.node.cpu.usage),
    sum_allocatable_cpu = SUM(k8s.node.allocatable_cpu)
  BY timestamp = TBUCKET(1 minute), k8s.cluster.name
| EVAL value = sum_cpu_usage / sum_allocatable_cpu
| KEEP timestamp, k8s.cluster.name, value`;

/**
 * ES|QL query for change point detection on CPU usage (aggregated across all clusters)
 * This detects significant changes in overall CPU usage patterns
 */
const CPU_CHANGE_POINT_ESQL = `TS remote_cluster:metrics-*
| WHERE k8s.cluster.name IS NOT NULL
  AND k8s.node.name IS NOT NULL
  AND (k8s.node.cpu.usage IS NOT NULL OR k8s.node.allocatable_cpu IS NOT NULL)
| STATS 
    sum_cpu_usage = SUM(k8s.node.cpu.usage),
    sum_allocatable_cpu = SUM(k8s.node.allocatable_cpu)
  BY timestamp = TBUCKET(1 minute)
| EVAL value = sum_cpu_usage / sum_allocatable_cpu
| CHANGE_POINT value ON timestamp AS type, pvalue
| WHERE type IS NOT NULL
| KEEP timestamp, type, pvalue`;

interface CpuUsageRow {
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
 * Card displaying CPU usage by cluster as a line chart with change point annotations
 */
export const CpuUsageTrendCard: React.FC<CpuUsageTrendCardProps> = ({
  timeRange,
  height = 316,
}) => {
  // Fetch CPU usage data
  const { data: cpuData, loading: cpuLoading } = useEsqlQuery<CpuUsageRow>({
    query: CPU_USAGE_BY_CLUSTER_ESQL,
    timeRange,
  });

  // Fetch change points
  const { data: changePointData } = useEsqlQuery<ChangePointRow>({
    query: CPU_CHANGE_POINT_ESQL,
    timeRange,
  });

  // Transform data for the chart
  const chartData = useMemo<GroupedDataPoint[]>(() => {
    if (!cpuData) return [];

    return cpuData
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
  }, [cpuData]);

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
      id="cpuUsageTrendChart"
      title={i18n.translate('xpack.kubernetesPoc.clusterOverview.cpuUtilTrendByClusterTitle', {
        defaultMessage: 'CPU util trend by cluster',
      })}
      data={chartData}
      changePoints={changePoints}
      loading={cpuLoading}
      height={height}
      valueFormatter={valueFormatter}
      showLegend
      yMin={0}
    />
  );
};
