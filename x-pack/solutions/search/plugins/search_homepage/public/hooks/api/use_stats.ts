/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';

import type { StatsResponse } from '../../../server/types';
import { useKibana } from '../use_kibana';
import { getErrorCode } from '../../utils/get_error_message';
import { useUsageTracker } from '../../contexts/usage_tracker_context';
import { AnalyticsEvents } from '../../analytics/constants';

export interface SizeStats {
  hasNoDocuments: boolean;
  size: StatsResponse['sizeStats']['size'];
}

export const useStats = (): UseQueryResult<SizeStats | null> => {
  const { http } = useKibana().services;
  const usageTracker = useUsageTracker();

  const queryResult = useQuery<SizeStats | null, Error>({
    queryKey: ['fetchSizeStats'],
    retry: false,
    queryFn: async () => {
      try {
        const response = await http.get<StatsResponse>('/internal/search_homepage/stats');
        return {
          hasNoDocuments: response.sizeStats.documents === 0,
          size: response.sizeStats.size,
        };
      } catch (error) {
        if (getErrorCode(error) === 403) {
          return null;
        }
        throw error;
      }
    },
  });

  useEffect(() => {
    if (queryResult.isError) {
      usageTracker.count([
        AnalyticsEvents.metricFetchFailed,
        `${AnalyticsEvents.metricFetchFailed}_storage`,
      ]);
    }
  }, [queryResult.isError, usageTracker]);

  return queryResult;
};
