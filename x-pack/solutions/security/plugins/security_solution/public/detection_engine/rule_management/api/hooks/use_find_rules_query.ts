/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@kbn/react-query';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import type { GapFillStatus } from '@kbn/alerting-plugin/common';
import type { RuleResponse, WarningSchema } from '../../../../../common/api/detection_engine';
import type { SortOrder } from '../../../../../common/api/detection_engine/model/sorting.gen';
import type {
  FindRulesSortField,
  SearchRulesAggregations,
  SearchRulesField,
  SearchRulesSearchAfterItem,
  GranularRulesSearch,
} from '../../../../../common/api/detection_engine/rule_management';
import { RULE_MANAGEMENT_RULES_URL_SEARCH } from '../../../../../common/api/detection_engine/rule_management/urls';
import type { PaginationOptions } from '../../logic';
import { fetchSearchRules } from '../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';

export interface FindRulesQueryArgs {
  fields?: SearchRulesField[];
  filter?: string;
  search?: GranularRulesSearch;
  sort_field?: FindRulesSortField;
  sort_order?: SortOrder;
  pagination?: Pick<PaginationOptions, 'page' | 'perPage'>;
  aggregations?: SearchRulesAggregations;
  search_after?: SearchRulesSearchAfterItem[];
  gap_fill_statuses?: GapFillStatus[];
  gaps_range_start?: string;
  gaps_range_end?: string;
  gap_auto_fill_scheduler_id?: string;
}

const FIND_RULES_QUERY_KEY = ['POST', RULE_MANAGEMENT_RULES_URL_SEARCH];

export interface RulesQueryResponse {
  rules: RuleResponse[];
  total: number;
  warnings?: WarningSchema[];
}

/**
 * A wrapper around useQuery provides default values to the underlying query,
 * like query key, abortion signal.
 *
 * @param queryPrefix - query prefix used to differentiate the query from other
 * findRules queries
 * @param queryArgs - fetch rules filters/pagination
 * @param queryOptions - react-query options
 * @returns useQuery result
 */
export const useFindRulesQuery = (
  queryArgs: FindRulesQueryArgs,
  queryOptions?: UseQueryOptions<
    RulesQueryResponse,
    Error,
    RulesQueryResponse,
    [...string[], FindRulesQueryArgs]
  >
) => {
  return useQuery(
    [...FIND_RULES_QUERY_KEY, queryArgs],
    async ({ signal }) => {
      const response = await fetchSearchRules({
        signal,
        ...queryArgs,
      });

      return { rules: response.data, total: response.total, warnings: response.warnings };
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      // Mark this query as immediately stale helps to avoid problems related to filtering.
      // e.g. enabled and disabled state filter require data update which happens at the backend side
      staleTime: 0,
      ...queryOptions,
    }
  );
};

/**
 * We should use this hook to invalidate the rules cache. For example, rule
 * mutations that affect rule set size, like creation or deletion, should lead
 * to cache invalidation.
 *
 * @returns A rules cache invalidation callback
 */
export const useInvalidateFindRulesQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    /**
     * Invalidate all queries that start with FIND_RULES_QUERY_KEY. This
     * includes the in-memory query cache and paged query cache.
     */
    queryClient.invalidateQueries(FIND_RULES_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};

/**
 * We should use this hook to update the rules cache when modifying rules
 * without changing the rules collection size. Use it with the new rules data
 * after operations like bulk or single rule edit or rule enabling, but not
 * when adding or removing rules. When adding/removing rules, we should
 * invalidate the cache instead.
 *
 * @returns A rules cache update callback
 */
export const useUpdateRulesCache = () => {
  const queryClient = useQueryClient();
  /**
   * Use this method to update rules data cached by react-query.
   * It is useful when we receive new rules back from a mutation query (bulk edit, etc.);
   * we can merge those rules with the existing cache to avoid an extra roundtrip to re-fetch updated rules.
   */
  return useCallback(
    (newRules: RuleResponse[]) => {
      queryClient.setQueriesData<ReturnType<typeof useFindRulesQuery>['data']>(
        FIND_RULES_QUERY_KEY,
        (currentData) =>
          currentData
            ? {
                rules: updateRules(currentData.rules, newRules),
                total: currentData.total,
                warnings: currentData.warnings,
              }
            : undefined
      );
    },
    [queryClient]
  );
};

/**
 * Update cached rules with the new ones
 *
 * @param currentRules
 * @param newRules
 */
export function updateRules(
  currentRules: RuleResponse[],
  newRules: RuleResponse[]
): RuleResponse[] {
  const newRulesMap = new Map(newRules.map((rule) => [rule.id, rule]));

  if (currentRules.some((rule) => newRulesMap.has(rule.id))) {
    return currentRules.map((rule) => newRulesMap.get(rule.id) ?? rule);
  }

  return currentRules;
}
