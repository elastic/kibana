/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QueryObserverResult,
  RefetchOptions,
  RefetchQueryFilters,
  useQuery,
} from '@tanstack/react-query';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { INTERNAL_ALERTING_API_FIND_RULES_PATH } from '@kbn/alerting-plugin/common';
import { HttpSetup } from '@kbn/core/public';
import { SLO_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import { useKibana } from './use_kibana';
import { sloKeys } from './query_key_factory';
import { WindowSchema } from '../typings';

export interface SloRule extends Record<string, unknown> {
  windows: WindowSchema[];
}

interface RuleApiResponse {
  page: number;
  total: number;
  per_page: number;
  data: Array<Rule<SloRule>>;
}

export interface UseFetchSLOsWithBurnRateRuleParams {
  search?: string;
}

export interface UseFetchSLOsWithBurnRateRulesResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  data: Array<Rule<SloRule>> | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<Array<Rule<SloRule>> | undefined, unknown>>;
}

async function fetchRules({
  search,
  http,
  signal,
}: {
  search?: string;
  http: HttpSetup;
  signal?: AbortSignal;
}) {
  const body = {
    search,
    fields: ['id', 'params.windows', 'name'],
    per_page: 1000,
    rule_type_ids: SLO_RULE_TYPE_IDS,
  };

  const response = await http.post<RuleApiResponse>(INTERNAL_ALERTING_API_FIND_RULES_PATH, {
    body: JSON.stringify({ ...body }),
    signal,
  });

  return response.data;
}

export function useFetchSLOsWithBurnRateRules({
  search = '',
}: UseFetchSLOsWithBurnRateRuleParams): UseFetchSLOsWithBurnRateRulesResponse {
  const { http } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data, refetch } = useQuery(
    {
      queryKey: sloKeys.burnRateRules(search),
      queryFn: async ({ signal }) => {
        try {
          return fetchRules({ search, http, signal });
        } catch (error) {
          // ignore error for retrieving slos
        }
      },
      refetchOnWindowFocus: false,
      keepPreviousData: true,
    }
  );

  return {
    data,
    isLoading,
    isInitialLoading,
    isRefetching,
    isSuccess,
    isError,
    refetch,
  };
}
