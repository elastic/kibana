/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryResult } from '@kbn/react-query';
import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import { useKibana } from '../use_kibana';

export interface BillingInstance {
  id: string;
  name: string;
  type: string;
  totalEcu: number;
}

export interface BillingBudgetAlert {
  threshold: number;
  thresholdType: string;
  lastExceededAt?: string;
}

export interface BillingBudget {
  id: number;
  name: string;
  amount: number;
  scopeType: string;
  scopeValues: string[];
  alerts: BillingBudgetAlert[];
}

export interface BillingUsageData {
  configured: boolean;
  totalEcu?: number;
  budgets?: BillingBudget[];
  instances?: BillingInstance[];
}

export const useBillingUsage = (): UseQueryResult<BillingUsageData> => {
  const { http } = useKibana().services;

  return useQuery<BillingUsageData, Error>({
    queryKey: ['fetchBillingUsage'],
    queryFn: async () => {
      const response = await http.get<BillingUsageData>('/internal/search_homepage/billing/usage');
      return response;
    },
    refetchInterval: 5 * 60 * 1000,
  });
};

export const useSaveBillingApiKey = () => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ apiKey, organizationId }: { apiKey: string; organizationId: string }) => {
      return http.post<{ success: boolean }>('/internal/search_homepage/billing/api_key', {
        body: JSON.stringify({ apiKey, organizationId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fetchBillingUsage'] });
    },
  });
};
