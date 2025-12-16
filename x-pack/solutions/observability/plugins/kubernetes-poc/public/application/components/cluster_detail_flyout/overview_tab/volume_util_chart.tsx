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

interface VolumeUtilChartProps {
  clusterName: string;
  timeRange: TimeRange;
  height?: number;
}

/**
 * ES|QL query for volume/filesystem usage over time with change point detection.
 *
 * The query:
 * 1. Aggregates filesystem usage by 1-minute buckets
 * 2. Applies CHANGE_POINT to detect anomalies in the time series
 */
const getVolumeUtilEsql = (clusterName: string) => `TS remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.node.name IS NOT NULL
  AND k8s.node.filesystem.usage IS NOT NULL
| STATS value = SUM(k8s.node.filesystem.usage)
  BY timestamp = TBUCKET(1 minute)
| CHANGE_POINT value ON timestamp AS type, pvalue
| KEEP timestamp, value, type, pvalue`;

export const VolumeUtilChart: React.FC<VolumeUtilChartProps> = ({
  clusterName,
  timeRange,
  height = 200,
}) => {
  const query = useMemo(() => getVolumeUtilEsql(clusterName), [clusterName]);

  const { data, changePoints, loading } = useTimeSeriesWithChangePoints({
    query,
    timeRange,
  });

  // Format value as bytes
  const valueFormatter = useCallback((value: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let scaledValue = value;

    while (scaledValue >= 1024 && unitIndex < units.length - 1) {
      scaledValue /= 1024;
      unitIndex++;
    }

    return `${scaledValue.toFixed(1)} ${units[unitIndex]}`;
  }, []);

  return (
    <TimeSeriesChart
      id={`volumeUtil-${clusterName}`}
      title={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.volumeUtilTitle', {
        defaultMessage: 'Volume util',
      })}
      data={data}
      changePoints={changePoints}
      loading={loading}
      height={height}
      seriesName={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.volumeUtilSeriesName', {
        defaultMessage: 'Volume Usage',
      })}
      valueFormatter={valueFormatter}
      yMin={0}
    />
  );
};
