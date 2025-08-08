/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { get } from 'lodash';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import type { GetPrebuiltRuleBaseVersionResponseBody } from '../../../../../../common/api/detection_engine';
import { getPrebuiltRuleBaseVersion } from '../../api';
import { GET_PREBUILT_RULES_BASE_VERSION_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules/urls';
import { DEFAULT_QUERY_OPTIONS } from '../constants';
import { retryOnRateLimitedError } from './retry_on_rate_limited_error';
import { cappedExponentialBackoff } from './capped_exponential_backoff';
import * as i18n from '../translations';

export const GET_RULE_BASE_VERSION_QUERY_KEY = ['POST', GET_PREBUILT_RULES_BASE_VERSION_URL];

export interface UseFetchPrebuiltRuleBaseVersionQueryProps {
  id: string | undefined;
  enabled: boolean;
}

export const useFetchPrebuiltRuleBaseVersionQuery = (
  { id, enabled }: UseFetchPrebuiltRuleBaseVersionQueryProps,
  options?: UseQueryOptions<GetPrebuiltRuleBaseVersionResponseBody | null>
) => {
  const { addError } = useAppToasts();
  return useQuery<GetPrebuiltRuleBaseVersionResponseBody | null>(
    [...GET_RULE_BASE_VERSION_QUERY_KEY, id],
    async ({ signal }) => {
      if (id) {
        return getPrebuiltRuleBaseVersion({ signal, request: { id } });
      }
      return null;
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...options,
      enabled,
      onError: (error) => {
        const statusCode = get(error, 'response.status');
        // If we cannot find the rule base version, we suppress the error and handle it internally
        if (statusCode === 404) {
          return;
        }
        addError(error, {
          title: i18n.FETCH_PREBUILT_RULE_BASE_VERSION_ERROR,
        });
      },
      retry: retryOnRateLimitedError,
      retryDelay: cappedExponentialBackoff,
    }
  );
};

export const useInvalidateFetchPrebuiltRuleBaseVersionQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(GET_RULE_BASE_VERSION_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};
