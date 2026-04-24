/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { useKibana } from '../use_kibana';

interface MetricDataPoint {
  x: number;
  y: number;
}

interface MetricSeries {
  name: string;
  data: MetricDataPoint[];
}

export interface SearchUsageResult {
  totalVcu: number;
}

export const useSearchUsage = (): UseQueryResult<SearchUsageResult> => {
  const { http } = useKibana().services;

  return useQuery<SearchUsageResult, Error>({
    queryKey: ['fetchSearchUsage'],
    queryFn: async () => {
      const dataStreamsResponse = await http.get<{ name: string }[]>(
        '/internal/api/data_usage/data_streams',
        { version: '1' }
      );

      const dataStreamNames = dataStreamsResponse.map((ds) => ds.name);

      if (dataStreamNames.length === 0) {
        return { totalVcu: 0 };
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const metrics = await http.post<Record<string, MetricSeries[]>>(
        '/internal/api/data_usage/metrics',
        {
          version: '1',
          body: JSON.stringify({
            from: startOfMonth.toISOString(),
            to: now.toISOString(),
            metricTypes: ['search_vcu'],
            dataStreams: dataStreamNames,
          }),
        }
      );

      const searchVcuSeries = metrics.search_vcu ?? [];
      const totalVcu = searchVcuSeries.reduce((total, series) => {
        const seriesTotal = series.data.reduce((sum, point) => sum + point.y, 0);
        return total + seriesTotal;
      }, 0);

      return { totalVcu: Math.round(totalVcu * 100) / 100 };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
    onError: () => {},
  });
};
