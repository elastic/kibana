/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseQueryOptions } from '@tanstack/react-query';
import type { ReviewRuleUpgradeResponseBody } from '../../../../../common/api/detection_engine/prebuilt_rules';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

import * as i18n from '../translations';
import { useFetchPrebuiltRulesUpgradeReviewQuery } from '../../api/hooks/prebuilt_rules/use_fetch_prebuilt_rules_upgrade_review_query';

/**
 * A wrapper around useQuery provides default values to the underlying query,
 * like query key, abortion signal, and error handler.
 *
 * @returns useQuery result
 */
export const usePrebuiltRulesUpgradeReview = (
  options?: UseQueryOptions<ReviewRuleUpgradeResponseBody>
) => {
  const { addError } = useAppToasts();

  return useFetchPrebuiltRulesUpgradeReviewQuery({
    onError: (error) => addError(error, { title: i18n.RULE_AND_TIMELINE_FETCH_FAILURE }),
    ...options,
  });
};
