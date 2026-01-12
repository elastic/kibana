/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UseQueryResult } from '@kbn/react-query';
import { useKibana } from '../use_kibana';

export interface DashboardsStats {
  totalDashboards: number;
}

export const useDashboardsStats = (): UseQueryResult<DashboardsStats> => {
  const { http } = useKibana().services;

  const queryResult = useQuery<DashboardsStats>({
    queryKey: ['fetchDashboardsStats'],
    queryFn: async () => {
      const response = await http.get<{
        saved_objects: Array<{ id: string; type: string }>;
        total: number;
      }>('/api/saved_objects/_find', {
        query: {
          type: 'dashboard',
          per_page: 10000,
          fields: 'title',
        },
      });

      return {
        totalDashboards: response.total,
      };
    },
  });

  return {
    ...queryResult,
  };
};
