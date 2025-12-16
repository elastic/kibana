/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { TimeRange } from '@kbn/es-query';
import { useEsqlQuery } from './use_esql_query';
import type {
  TimeSeriesDataPoint,
  FormattedChangePoint,
} from '../application/components/time_series_chart';
import { extractChangePoints } from '../application/components/time_series_chart';

interface UseTimeSeriesWithChangePointsParams {
  /**
   * ES|QL query that returns time series data.
   * The query should include CHANGE_POINT command and output columns:
   * - timestamp: the time column
   * - value: the metric value
   * - type: change point type (from CHANGE_POINT)
   * - pvalue: p-value (from CHANGE_POINT)
   */
  query: string;
  /** Time range for the query */
  timeRange?: TimeRange;
  /** Whether to execute the query */
  enabled?: boolean;
  /** Field name for timestamp column (default: 'timestamp') */
  timestampField?: string;
  /** Field name for value column (default: 'value') */
  valueField?: string;
  /** Field name for change point type column (default: 'type') */
  typeField?: string;
  /** Field name for p-value column (default: 'pvalue') */
  pvalueField?: string;
}

interface UseTimeSeriesWithChangePointsResult {
  /** Time series data points for the chart */
  data: TimeSeriesDataPoint[];
  /** Detected change points formatted for annotations */
  changePoints: FormattedChangePoint[];
  /** Whether data is loading */
  loading: boolean;
  /** Error if query failed */
  error: Error | null;
  /** Function to refetch data */
  refetch: () => void;
}

interface TimeSeriesRow {
  [key: string]: unknown;
}

/**
 * Hook to fetch time series data with change point detection
 *
 * This hook executes an ES|QL query that includes the CHANGE_POINT command
 * and returns both the time series data and formatted change points for
 * rendering annotations on the chart.
 *
 * @example
 * ```typescript
 * const query = `TS remote_cluster:metrics-*
 *   | WHERE k8s.cluster.name == "my-cluster"
 *   | STATS value = AVG(cpu.usage) BY timestamp = TBUCKET(1 minute)
 *   | CHANGE_POINT value ON timestamp AS type, pvalue
 *   | KEEP timestamp, value, type, pvalue`;
 *
 * const { data, changePoints, loading } = useTimeSeriesWithChangePoints({
 *   query,
 *   timeRange,
 * });
 * ```
 */
export function useTimeSeriesWithChangePoints({
  query,
  timeRange,
  enabled = true,
  timestampField = 'timestamp',
  valueField = 'value',
  typeField = 'type',
  pvalueField = 'pvalue',
}: UseTimeSeriesWithChangePointsParams): UseTimeSeriesWithChangePointsResult {
  const {
    data: rawData,
    loading,
    error,
    refetch,
  } = useEsqlQuery<TimeSeriesRow>({
    query,
    timeRange,
    enabled,
  });

  // Transform raw data into time series data points
  const data = useMemo<TimeSeriesDataPoint[]>(() => {
    if (!rawData) return [];

    return rawData
      .map((row) => {
        const timestamp = row[timestampField];
        const value = row[valueField];

        // Parse timestamp
        let parsedTimestamp: number;
        if (typeof timestamp === 'string') {
          parsedTimestamp = new Date(timestamp).getTime();
        } else if (typeof timestamp === 'number') {
          parsedTimestamp = timestamp;
        } else {
          return null;
        }

        // Parse value
        const parsedValue = typeof value === 'number' ? value : null;

        return {
          timestamp: parsedTimestamp,
          value: parsedValue,
        };
      })
      .filter((point): point is TimeSeriesDataPoint => point !== null)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [rawData, timestampField, valueField]);

  // Extract change points from the data
  const changePoints = useMemo<FormattedChangePoint[]>(() => {
    if (!rawData) return [];

    // Map raw data to the format expected by extractChangePoints
    const changePointData = rawData.map((row) => ({
      timestamp: row[timestampField] as string | number,
      type: row[typeField] as string | null,
      pvalue: row[pvalueField] as number | null,
    }));

    return extractChangePoints(changePointData, 'timestamp', 'type', 'pvalue');
  }, [rawData, timestampField, typeField, pvalueField]);

  return {
    data,
    changePoints,
    loading,
    error,
    refetch,
  };
}
