/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { UseQueryOptions } from '@kbn/react-query';
import { useQuery, useQueryClient } from '@kbn/react-query';
import { reviewRuleDeprecation } from '../../api';
import { REVIEW_RULE_DEPRECATION_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules/urls';
import type {
  ReviewRuleDeprecationRequestBody,
  ReviewRuleDeprecationResponseBody,
} from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { DEFAULT_QUERY_OPTIONS } from '../constants';

export const REVIEW_RULE_DEPRECATION_QUERY_KEY = ['POST', REVIEW_RULE_DEPRECATION_URL];

export const useFetchPrebuiltRulesDeprecationReviewQuery = (
  request: ReviewRuleDeprecationRequestBody,
  options?: UseQueryOptions<ReviewRuleDeprecationResponseBody>
) => {
  return useQuery<ReviewRuleDeprecationResponseBody>(
    [...REVIEW_RULE_DEPRECATION_QUERY_KEY, request],
    async ({ signal }) => {
      const response = await reviewRuleDeprecation({ signal, request });
      return response;
    },
    {
      ...DEFAULT_QUERY_OPTIONS,
      ...options,
    }
  );
};

export const useInvalidateFetchPrebuiltRulesDeprecationReviewQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries(REVIEW_RULE_DEPRECATION_QUERY_KEY, {
      refetchType: 'active',
    });
  }, [queryClient]);
};
