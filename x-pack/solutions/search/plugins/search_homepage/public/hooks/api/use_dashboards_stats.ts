/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { UseQueryResult } from '@kbn/react-query';

import { useKibana } from '../use_kibana';
import { getErrorCode } from '../../utils/get_error_message';

export interface DashboardsStats {
  totalDashboards: number;
}

export const useDashboardsStats = (): UseQueryResult<DashboardsStats | null> => {
  const { http, chrome } = useKibana().services;

  const hasDashboardsNavLink = chrome.navLinks.get('dashboards') !== undefined;

  const queryResult = useQuery<DashboardsStats | null>({
    queryKey: ['fetchDashboardsStats'],
    retry: false,
    queryFn: async () => {
      try {
        const response = await http.get<{
          total: number;
        }>('/api/saved_objects/_find', {
          query: {
            type: 'dashboard',
            per_page: 0,
          },
        });

        return {
          totalDashboards: response.total,
        };
      } catch (error) {
        if (getErrorCode(error) === 403) {
          return null;
        }
        throw error;
      }
    },
    enabled: hasDashboardsNavLink,
  });

  return {
    ...queryResult,
  };
};
