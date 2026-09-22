/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseQueryOptions } from '@kbn/react-query';
import type {
  ReviewRuleDeprecationRequestBody,
  ReviewRuleDeprecationResponseBody,
} from '../../../../../common/api/detection_engine/prebuilt_rules';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

import * as i18n from './translations';
import { useFetchPrebuiltRulesDeprecationReviewQuery } from '../../api/hooks/prebuilt_rules/use_fetch_prebuilt_rules_deprecation_review_query';

export const usePrebuiltRulesDeprecationReview = (
  request: ReviewRuleDeprecationRequestBody,
  options?: UseQueryOptions<ReviewRuleDeprecationResponseBody>
) => {
  const { addError } = useAppToasts();

  return useFetchPrebuiltRulesDeprecationReviewQuery(request, {
    onError: (error) => addError(error, { title: i18n.DEPRECATION_REVIEW_FETCH_FAILURE }),
    ...options,
  });
};
