/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TimeRange } from '@kbn/es-query';
import {
  MultiSeriesTimeSeriesChart,
  type MultiSeriesDataPoint,
  type SeriesConfig,
  extractChangePoints,
  type FormattedChangePoint,
} from '../../time_series_chart';
import { useEsqlQuery } from '../../../../hooks/use_esql_query';

interface NetworkTrafficChartProps {
  clusterName: string;
  timeRange: TimeRange;
  height?: number;
}

/**
 * ES|QL query for network inbound/outbound traffic rate over time with change point detection.
 *
 * The query:
 * 1. Uses TS command with RATE() function to calculate the rate of change for counter metrics
 * 2. Aggregates inbound and outbound traffic by 1-minute buckets
 *
 * Note: CHANGE_POINT is applied separately to each series for better detection
 */
const getNetworkTrafficEsql = (clusterName: string) => `TS remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.node.name IS NOT NULL
  AND k8s.node.network.io IS NOT NULL
| STATS 
    inbound = SUM(RATE(k8s.node.network.io)) WHERE direction == "receive",
    outbound = SUM(RATE(k8s.node.network.io)) WHERE direction == "transmit"
  BY timestamp = TBUCKET(1 minute)`;

/**
 * ES|QL query for change point detection on inbound traffic
 */
const getInboundChangePointEsql = (clusterName: string) => `TS remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.node.name IS NOT NULL
  AND k8s.node.network.io IS NOT NULL
  AND direction == "receive"
| STATS value = SUM(RATE(k8s.node.network.io))
  BY timestamp = TBUCKET(1 minute)
| CHANGE_POINT value ON timestamp AS type, pvalue
| WHERE type IS NOT NULL
| KEEP timestamp, type, pvalue`;

/**
 * ES|QL query for change point detection on outbound traffic
 */
const getOutboundChangePointEsql = (clusterName: string) => `TS remote_cluster:metrics-*
| WHERE k8s.cluster.name == "${clusterName}" 
  AND k8s.node.name IS NOT NULL
  AND k8s.node.network.io IS NOT NULL
  AND direction == "transmit"
| STATS value = SUM(RATE(k8s.node.network.io))
  BY timestamp = TBUCKET(1 minute)
| CHANGE_POINT value ON timestamp AS type, pvalue
| WHERE type IS NOT NULL
| KEEP timestamp, type, pvalue`;

interface NetworkTrafficRow {
  timestamp: string | number;
  inbound: number | null;
  outbound: number | null;
}

interface ChangePointRow {
  timestamp: string | number;
  type: string | null;
  pvalue: number | null;
}

export const NetworkTrafficChart: React.FC<NetworkTrafficChartProps> = ({
  clusterName,
  timeRange,
  height = 200,
}) => {
  const { euiTheme } = useEuiTheme();

  // Fetch main time series data
  const trafficQuery = useMemo(() => getNetworkTrafficEsql(clusterName), [clusterName]);
  const { data: trafficData, loading: trafficLoading } = useEsqlQuery<NetworkTrafficRow>({
    query: trafficQuery,
    timeRange,
  });

  // Fetch change points for inbound traffic
  const inboundCpQuery = useMemo(() => getInboundChangePointEsql(clusterName), [clusterName]);
  const { data: inboundCpData } = useEsqlQuery<ChangePointRow>({
    query: inboundCpQuery,
    timeRange,
  });

  // Fetch change points for outbound traffic
  const outboundCpQuery = useMemo(() => getOutboundChangePointEsql(clusterName), [clusterName]);
  const { data: outboundCpData } = useEsqlQuery<ChangePointRow>({
    query: outboundCpQuery,
    timeRange,
  });

  // Transform traffic data for the chart
  const chartData = useMemo<MultiSeriesDataPoint[]>(() => {
    if (!trafficData) return [];

    return trafficData
      .map((row) => {
        const timestamp =
          typeof row.timestamp === 'string'
            ? new Date(row.timestamp).getTime()
            : (row.timestamp as number);

        return {
          timestamp,
          inbound: row.inbound,
          outbound: row.outbound,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [trafficData]);

  // Extract change points for each series
  const changePoints = useMemo<Record<string, FormattedChangePoint[]>>(() => {
    const inboundPoints = inboundCpData
      ? extractChangePoints(
          inboundCpData.map((row) => ({
            timestamp: row.timestamp,
            type: row.type,
            pvalue: row.pvalue,
          }))
        )
      : [];

    const outboundPoints = outboundCpData
      ? extractChangePoints(
          outboundCpData.map((row) => ({
            timestamp: row.timestamp,
            type: row.type,
            pvalue: row.pvalue,
          }))
        )
      : [];

    return {
      inbound: inboundPoints,
      outbound: outboundPoints,
    };
  }, [inboundCpData, outboundCpData]);

  // Series configuration
  const series = useMemo<SeriesConfig[]>(
    () => [
      {
        key: 'inbound',
        name: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.networkInbound', {
          defaultMessage: 'Inbound',
        }),
        color: euiTheme.colors.vis.euiColorVis0,
      },
      {
        key: 'outbound',
        name: i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.networkOutbound', {
          defaultMessage: 'Outbound',
        }),
        color: euiTheme.colors.vis.euiColorVis1,
      },
    ],
    [euiTheme.colors.vis.euiColorVis0, euiTheme.colors.vis.euiColorVis1]
  );

  // Format value as bytes/sec
  const valueFormatter = useCallback((value: number) => {
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let unitIndex = 0;
    let scaledValue = Math.abs(value);

    while (scaledValue >= 1024 && unitIndex < units.length - 1) {
      scaledValue /= 1024;
      unitIndex++;
    }

    return `${scaledValue.toFixed(1)} ${units[unitIndex]}`;
  }, []);

  return (
    <MultiSeriesTimeSeriesChart
      id={`networkTraffic-${clusterName}`}
      title={i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.networkTrafficTitle', {
        defaultMessage: 'Network traffic',
      })}
      data={chartData}
      series={series}
      changePoints={changePoints}
      loading={trafficLoading}
      height={height}
      valueFormatter={valueFormatter}
      showLegend
      yMin={0}
    />
  );
};
