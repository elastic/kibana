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

interface PodsUtilChartProps {
  clusterName: string;
  timeRange: TimeRange;
  height?: number;
}

/**
 * ES|QL query for pod utilization percentage over time with change point detection.
 *
 * The query:
 * 1. Uses FROM instead of TS because COUNT_DISTINCT on keyword fields is not supported in time series mode
 * 2. Calculates pod utilization using fallback of 110 pods/node (Kubernetes default)
 * 3. Applies CHANGE_POINT to detect anomalies in the time series
 */
const getPodsUtilEsql = (clusterName: string) => `FROM remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.pod.uid IS NOT NULL
  AND k8s.pod.phase IS NOT NULL
| STATS 
    pod_count = COUNT_DISTINCT(k8s.pod.uid),
    node_count = COUNT_DISTINCT(k8s.node.name)
  BY timestamp = BUCKET(@timestamp, 1 minute)
| EVAL max_pods = node_count * 110
| EVAL value = TO_DOUBLE(pod_count) / TO_DOUBLE(max_pods)
| CHANGE_POINT value ON timestamp AS type, pvalue
| KEEP timestamp, value, type, pvalue
| SORT timestamp ASC`;

export const PodsUtilChart: React.FC<PodsUtilChartProps> = ({
  clusterName,
  timeRange,
  height = 200,
}) => {
  const query = useMemo(() => getPodsUtilEsql(clusterName), [clusterName]);

  const { data, changePoints, loading } = useTimeSeriesWithChangePoints({
    query,
    timeRange,
  });

  // Format value as percentage
  const valueFormatter = useCallback((value: number) => `${(value * 100).toFixed(1)}%`, []);

  return (
    <TimeSeriesChart
      id={`podsUtil-${clusterName}`}
      title={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.podsUtilTitle', {
        defaultMessage: 'Pods util',
      })}
      data={data}
      changePoints={changePoints}
      loading={loading}
      height={height}
      seriesName={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.podsUtilSeriesName', {
        defaultMessage: 'Pod Utilization',
      })}
      valueFormatter={valueFormatter}
      yMin={0}
    />
  );
};
