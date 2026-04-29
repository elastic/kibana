/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import type { StatsResponse, TrialUsageResponse } from '../../../server/types';
import { useKibana } from '../use_kibana';

interface MlInfoResponse {
  limits: {
    effective_max_model_memory_limit?: string;
  };
}

interface MlNodeCountResponse {
  count: number;
}

export interface TrialUsageData {
  trialDaysLeft: number;
  storageUsage: string;
  mlNodeCount?: number;
  mlMemoryLimit?: string;
  llmTotalTokens?: number;
  searchPowerMax?: number;
  searchPowerMin?: number;
  boostWindowHours?: number;
}

export const useTrialUsageData = () => {
  const { http } = useKibana().services;

  return useQuery<TrialUsageData, Error>({
    queryKey: ['fetchTrialUsageData'],
    queryFn: async () => {
      const [trialUsage, stats, mlNodeCount, mlInfo] = await Promise.all([
        http.get<TrialUsageResponse>('/internal/search_homepage/trial_usage'),
        http.get<StatsResponse>('/internal/search_homepage/stats'),
        http
          .get<MlNodeCountResponse>('/internal/ml/ml_node_count', { version: '1' })
          .catch(() => undefined),
        http.get<MlInfoResponse>('/internal/ml/info', { version: '1' }).catch(() => undefined),
      ]);

      return {
        trialDaysLeft: trialUsage.trialDaysLeft,
        storageUsage: stats.sizeStats.size,
        mlNodeCount: mlNodeCount?.count,
        mlMemoryLimit: mlInfo?.limits?.effective_max_model_memory_limit,
        llmTotalTokens: trialUsage.llmTotalTokens,
        searchPowerMax: trialUsage.searchPowerMax,
        searchPowerMin: trialUsage.searchPowerMin,
        boostWindowHours: trialUsage.boostWindowHours,
      };
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};
