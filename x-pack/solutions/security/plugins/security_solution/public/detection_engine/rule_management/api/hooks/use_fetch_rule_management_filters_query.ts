/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { GetRuleManagementFiltersResponse } from '../../../../../common/api/detection_engine/rule_management';
import { RULE_MANAGEMENT_FILTERS_URL } from '../../../../../common/api/detection_engine/rule_management/urls';
import { fetchRuleManagementFilters } from '../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';

export const RULE_MANAGEMENT_FILTERS_QUERY_KEY = ['GET', RULE_MANAGEMENT_FILTERS_URL];

export const useFetchRuleManagementFiltersQuery = (
  options?: UseQueryOptions<GetRuleManagementFiltersResponse>
) => {
  return useQuery<GetRuleManagementFiltersResponse>(
    RULE_MANAGEMENT_FILTERS_QUERY_KEY,
    async ({ signal }) => {
      const response = await fetchRuleManagementFilters({ signal });
      return response;
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...options,
    }
  );
};

/**
 * We should use this hook to invalidate the rule management filters cache. For
 * example, rule mutations that affect rule set size, like creation or deletion,
 * should lead to cache invalidation.
 *
 * @returns A rules cache invalidation callback
 */
export const useInvalidateFetchRuleManagementFiltersQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(RULE_MANAGEMENT_FILTERS_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};
