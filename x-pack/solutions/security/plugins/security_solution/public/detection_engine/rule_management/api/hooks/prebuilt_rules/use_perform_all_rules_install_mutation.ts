/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@kbn/react-query';
import { useMutation } from '@kbn/react-query';
import type { PerformRuleInstallationResponseBody } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { PERFORM_RULE_INSTALLATION_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules/urls';
import { performInstallAllRules } from '../../api';
import { useInvalidateFetchCoverageOverviewQuery } from '../use_fetch_coverage_overview_query';
import { useInvalidateFetchRuleManagementFiltersQuery } from '../use_fetch_rule_management_filters_query';
import { useInvalidateFetchRulesSnoozeSettingsQuery } from '../use_fetch_rules_snooze_settings_query';
import { useInvalidateFindRulesQuery } from '../use_find_rules_query';
import { retryOnRateLimitedError } from './retry_on_rate_limited_error';
import { useInvalidateFetchPrebuiltRulesInstallReviewQuery } from './use_fetch_prebuilt_rules_install_review_query';
import { useInvalidateFetchPrebuiltRulesStatusQuery } from './use_fetch_prebuilt_rules_status_query';
import { useInvalidateFetchPrebuiltRulesDeprecationReviewQuery } from './use_fetch_prebuilt_rules_deprecation_review_query';
import { cappedExponentialBackoff } from './capped_exponential_backoff';
import { useInvalidateBrowseRuleLibraryQuery } from './use_browse_rule_library_query';

export const PERFORM_ALL_RULES_INSTALLATION_KEY = [
  'POST',
  'ALL_RULES',
  PERFORM_RULE_INSTALLATION_URL,
];

export interface UsePerformAllRulesInstallParams {
  // Installs the rules of this library only. Without it, the rules of every library are installed.
  libraryId?: string;
}

export const usePerformAllRulesInstallMutation = (
  options?: UseMutationOptions<
    PerformRuleInstallationResponseBody,
    unknown,
    UsePerformAllRulesInstallParams | void
  >
) => {
  const invalidateBrowseRuleLibrary = useInvalidateBrowseRuleLibraryQuery();
  const invalidateFindRulesQuery = useInvalidateFindRulesQuery();
  const invalidateFetchRulesSnoozeSettings = useInvalidateFetchRulesSnoozeSettingsQuery();
  const invalidateFetchRuleManagementFilters = useInvalidateFetchRuleManagementFiltersQuery();
  const invalidateFetchPrebuiltRulesInstallReview =
    useInvalidateFetchPrebuiltRulesInstallReviewQuery();
  const invalidateRuleStatus = useInvalidateFetchPrebuiltRulesStatusQuery();
  const invalidateFetchCoverageOverviewQuery = useInvalidateFetchCoverageOverviewQuery();
  const invalidateFetchPrebuiltRulesDeprecationReview =
    useInvalidateFetchPrebuiltRulesDeprecationReviewQuery();

  return useMutation<
    PerformRuleInstallationResponseBody,
    unknown,
    UsePerformAllRulesInstallParams | void
  >((params) => performInstallAllRules(params?.libraryId), {
    ...options,
    mutationKey: PERFORM_ALL_RULES_INSTALLATION_KEY,
    onSettled: (...args) => {
      invalidateBrowseRuleLibrary();
      invalidateFindRulesQuery();
      invalidateFetchRulesSnoozeSettings();
      invalidateFetchRuleManagementFilters();

      invalidateFetchPrebuiltRulesInstallReview();
      invalidateRuleStatus();
      invalidateFetchCoverageOverviewQuery();
      invalidateFetchPrebuiltRulesDeprecationReview();

      if (options?.onSettled) {
        options.onSettled(...args);
      }
    },
    retry: retryOnRateLimitedError,
    retryDelay: cappedExponentialBackoff,
  });
};
