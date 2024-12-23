/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { reviewRuleUpgrade } from '../../api';
import { REVIEW_RULE_UPGRADE_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules/urls';
import type { ReviewRuleUpgradeResponseBody } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { DEFAULT_QUERY_OPTIONS } from '../constants';

export const REVIEW_RULE_UPGRADE_QUERY_KEY = ['POST', REVIEW_RULE_UPGRADE_URL];

export const useFetchPrebuiltRulesUpgradeReviewQuery = (
  options?: UseQueryOptions<ReviewRuleUpgradeResponseBody>
) => {
  return useQuery<ReviewRuleUpgradeResponseBody>(
    REVIEW_RULE_UPGRADE_QUERY_KEY,
    async ({ signal }) => {
      const response = await reviewRuleUpgrade({ signal });
      return response;
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...options,
    }
  );
};

/**
 * We should use this hook to invalidate the prebuilt rules to upgrade cache. For
 * example, rule mutations that affect rule set size, like upgrading a rule,
 * should lead to cache invalidation.
 *
 * @returns A rules cache invalidation callback
 */
export const useInvalidateFetchPrebuiltRulesUpgradeReviewQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(REVIEW_RULE_UPGRADE_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};
