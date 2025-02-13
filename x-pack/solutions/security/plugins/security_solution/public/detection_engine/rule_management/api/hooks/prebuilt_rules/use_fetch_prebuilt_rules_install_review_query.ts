/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewRuleInstall } from '../../api';
import { REVIEW_RULE_INSTALLATION_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules/urls';
import type { ReviewRuleInstallationResponseBody } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { DEFAULT_QUERY_OPTIONS } from '../constants';
import { retryOnRateLimitedError } from './retry_on_rate_limited_error';
import { cappedExponentialBackoff } from './capped_exponential_backoff';

export const REVIEW_RULE_INSTALLATION_QUERY_KEY = ['POST', REVIEW_RULE_INSTALLATION_URL];

export const useFetchPrebuiltRulesInstallReviewQuery = (
  options?: UseQueryOptions<ReviewRuleInstallationResponseBody>
) => {
  return useQuery<ReviewRuleInstallationResponseBody>(
    REVIEW_RULE_INSTALLATION_QUERY_KEY,
    async ({ signal }) => {
      const response = await reviewRuleInstall({ signal });
      return response;
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...options,
      retry: retryOnRateLimitedError,
      retryDelay: cappedExponentialBackoff,
    }
  );
};

/**
 * We should use this hook to invalidate the prebuilt rules to install cache. For
 * example, rule mutations that affect rule set size, like installing a rule,
 * should lead to cache invalidation.
 *
 * @returns A rules cache invalidation callback
 */
export const useInvalidateFetchPrebuiltRulesInstallReviewQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(REVIEW_RULE_INSTALLATION_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};
