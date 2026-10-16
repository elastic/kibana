/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInfiniteQuery, useQueryClient } from '@kbn/react-query';
import { useCallback } from 'react';
import type { RuleChangesHistoryResponse } from '../../../../../common/api/detection_engine/rule_management';
import { RULE_HISTORY_URL } from '../../../../../common/api/detection_engine/rule_management';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { fetchRuleChangeHistoryById } from '../api';
import * as i18n from './translations';

const RULE_CHANGE_HISTORY_QUERY_KEY = ['GET', RULE_HISTORY_URL];
const PER_PAGE = 20;
const ONE_MINUTE = 60000;

export const useInvalidateChangeHistory = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(RULE_CHANGE_HISTORY_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};

export interface UseInfiniteChangeHistoryArgs {
  ruleId: string;
}

export function useInfiniteChangeHistory({ ruleId }: UseInfiniteChangeHistoryArgs) {
  const { addError } = useAppToasts();

  return useInfiniteQuery<RuleChangesHistoryResponse, Error>(
    [...RULE_CHANGE_HISTORY_QUERY_KEY, { ruleId }],
    ({ signal, pageParam = 1 }) =>
      fetchRuleChangeHistoryById({ signal, ruleId, page: pageParam as number, perPage: PER_PAGE }),
    {
      staleTime: ONE_MINUTE,
      getNextPageParam: (lastPage) => {
        const totalLoaded = lastPage.page * lastPage.per_page;
        return totalLoaded < lastPage.total ? lastPage.page + 1 : undefined;
      },
      retry: shouldRetryChangeHistoryFetch,
      onError: (error) => {
        if (!isRuleChangeTrackingDisabledError(error)) {
          addError(error, { title: i18n.HISTORY_FETCH_ERROR });
        }
      },
    }
  );
}

/**
 * The history API returns 403 when rule changes history is disabled, either via the
 * advanced setting or because `security` isn't included in the alerting plugin's
 * `xpack.alerting.ruleChangeTracking.scope`.
 */
export const isRuleChangeTrackingDisabledError = (error: unknown): boolean =>
  (error as { response?: { status?: number } } | null | undefined)?.response?.status === 403;

/**
 * Disabled is a stable condition, not a transient failure: retrying just delays the
 * disabled placeholder from showing. Other failures still get react-query's default
 * retry count.
 */
const shouldRetryChangeHistoryFetch = (failureCount: number, error: unknown): boolean =>
  !isRuleChangeTrackingDisabledError(error) && failureCount < 3;
