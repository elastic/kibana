/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryObserverResult, RefetchOptions, RefetchQueryFilters } from '@kbn/react-query';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import { INTERNAL_BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import type { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import type { AsApiContract } from '@kbn/actions-plugin/common';
import { transformRule } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from '../utils/kibana_react';

export interface UseFetchRuleResponse {
  isInitialLoading: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isSuccess: boolean;
  isError: boolean;
  isRuleNotFound: boolean;
  rule: Rule | undefined;
  refetch: <TPageData>(
    options?: (RefetchOptions & RefetchQueryFilters<TPageData>) | undefined
  ) => Promise<QueryObserverResult<Rule | undefined, unknown>>;
}

const isRuleNotFoundError = (error: unknown): boolean => {
  const status = (error as IHttpFetchError<{ statusCode?: number }>)?.response?.status;
  return status === 404;
};

export function useFetchRule({
  ruleId,
  enabled = true,
}: {
  ruleId?: string;
  enabled?: boolean;
}): UseFetchRuleResponse {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data, refetch, error } =
    useQuery({
      queryKey: ['fetchRule', ruleId],
      queryFn: async ({ signal }) => {
        if (!ruleId) return;

        const res = await http.get<AsApiContract<Rule>>(
          `${INTERNAL_BASE_ALERTING_API_PATH}/rule/${encodeURIComponent(ruleId)}`,
          {
            signal,
          }
        );

        return transformRule(res);
      },
      keepPreviousData: true,
      enabled: Boolean(ruleId) && enabled,
      refetchOnWindowFocus: false,
      retry: (failureCount, retryError) => {
        const status = (retryError as IHttpFetchError<{ statusCode?: number }>)?.response?.status;
        if (status === 403 || status === 404) {
          return false;
        }
        return failureCount < 3;
      },
      onError: (queryError: Error) => {
        if (isRuleNotFoundError(queryError)) {
          return;
        }
        toasts.addError(queryError, {
          title: i18n.translate('xpack.observability.ruleDetails.ruleLoadError', {
            defaultMessage: 'Unable to load rule',
          }),
          toastMessage:
            queryError instanceof Error
              ? queryError.message
              : typeof queryError === 'string'
              ? queryError
              : '',
        });
      },
    });

  return {
    rule: data,
    isLoading,
    isInitialLoading,
    isRefetching,
    isSuccess,
    isError,
    isRuleNotFound: isError && isRuleNotFoundError(error),
    refetch,
  };
}
