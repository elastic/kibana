/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import { TimeSeriesChart } from '../../time_series_chart';
import { useTimeSeriesWithChangePoints } from '../../../../hooks/use_time_series_with_change_points';

interface CpuUtilChartProps {
  clusterName: string;
  timeRange: TimeRange;
  height?: number;
}

/**
 * ES|QL query for CPU utilization percentage over time with change point detection.
 *
 * The query:
 * 1. Aggregates CPU usage and allocatable CPU by 1-minute buckets
 * 2. Calculates CPU utilization as a ratio
 * 3. Applies CHANGE_POINT to detect anomalies in the time series
 */
const getCpuUtilEsql = (clusterName: string) => `TS remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.node.name IS NOT NULL
  AND (k8s.node.cpu.usage IS NOT NULL OR k8s.node.allocatable_cpu IS NOT NULL)
| STATS 
    sum_cpu_usage = SUM(k8s.node.cpu.usage),
    sum_allocatable_cpu = SUM(k8s.node.allocatable_cpu)
  BY timestamp = TBUCKET(1 minute)
| EVAL value = sum_cpu_usage / sum_allocatable_cpu
| CHANGE_POINT value ON timestamp AS type, pvalue
| KEEP timestamp, value, type, pvalue`;

export const CpuUtilChart: React.FC<CpuUtilChartProps> = ({
  clusterName,
  timeRange,
  height = 200,
}) => {
  const query = useMemo(() => getCpuUtilEsql(clusterName), [clusterName]);

  const { data, changePoints, loading } = useTimeSeriesWithChangePoints({
    query,
    timeRange,
  });

  // Format value as percentage
  const valueFormatter = useCallback((value: number) => `${(value * 100).toFixed(1)}%`, []);

  return (
    <TimeSeriesChart
      id={`cpuUtil-${clusterName}`}
      title={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.cpuUtilTitle', {
        defaultMessage: 'CPU util',
      })}
      data={data}
      changePoints={changePoints}
      loading={loading}
      height={height}
      seriesName={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.cpuUtilSeriesName', {
        defaultMessage: 'CPU Utilization',
      })}
      valueFormatter={valueFormatter}
      yMin={0}
    />
  );
};
