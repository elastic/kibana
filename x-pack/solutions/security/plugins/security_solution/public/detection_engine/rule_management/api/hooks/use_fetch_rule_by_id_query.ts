/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import { transformInput } from '../../../../detections/containers/detection_engine/rules/transforms';
import { fetchRuleById } from '../api';
import { DEFAULT_QUERY_OPTIONS } from './constants';

const FIND_ONE_RULE_QUERY_KEY = ['GET', DETECTION_ENGINE_RULES_URL];

/**
 * A wrapper around useQuery provides default values to the underlying query,
 * like query key, abortion signal, and error handler.
 *
 * @param id - rule's id, not rule_id
 * @param options - react-query options
 * @returns useQuery result
 */
export const useFetchRuleByIdQuery = (id: string, options?: UseQueryOptions<RuleResponse>) => {
  return useQuery<RuleResponse>(
    [...FIND_ONE_RULE_QUERY_KEY, id],
    async ({ signal }) => {
      const response = await fetchRuleById({ signal, id });

      return transformInput(response);
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...options,
      // Mark this query as immediately stale helps to avoid problems related to filtering.
      // e.g. enabled and disabled state filter require data update which happens at the backend side
      staleTime: 0,
      enabled: !!id,
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
export const useInvalidateFetchRuleByIdQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(FIND_ONE_RULE_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};

/**
 * We should use this hook to update the rules cache when modifying a rule.
 * Use it with the new rule data after operations like rule edit.
 *
 * @returns A rules cache update callback
 */
export const useUpdateRuleByIdCache = () => {
  const queryClient = useQueryClient();
  /**
   * Use this method to update rules data cached by react-query.
   * It is useful when we receive new rules back from a mutation query (bulk edit, etc.);
   * we can merge those rules with the existing cache to avoid an extra roundtrip to re-fetch updated rules.
   */
  return useCallback(
    (updatedRuleResponse: RuleResponse) => {
      queryClient.setQueryData<ReturnType<typeof useFetchRuleByIdQuery>['data']>(
        [...FIND_ONE_RULE_QUERY_KEY, updatedRuleResponse.id],
        transformInput(updatedRuleResponse)
      );
    },
    [queryClient]
  );
};
