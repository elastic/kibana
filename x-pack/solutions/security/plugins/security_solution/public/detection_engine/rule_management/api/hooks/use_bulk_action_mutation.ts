/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core/public';
import { BulkActionTypeEnum } from '../../../../../common/api/detection_engine/rule_management';
import type {
  BulkActionErrorResponse,
  BulkActionResponse,
  PerformRulesBulkActionProps,
} from '../api';
import { performBulkAction } from '../api';
import { DETECTION_ENGINE_RULES_BULK_ACTION } from '../../../../../common/constants';
import { useInvalidateFindRulesQuery, useUpdateRulesCache } from './use_find_rules_query';
import { useInvalidateFetchRuleByIdQuery } from './use_fetch_rule_by_id_query';
import { useInvalidateFetchRuleManagementFiltersQuery } from './use_fetch_rule_management_filters_query';
import { useInvalidateFetchPrebuiltRulesStatusQuery } from './prebuilt_rules/use_fetch_prebuilt_rules_status_query';
import { useInvalidateFetchPrebuiltRulesUpgradeReviewQuery } from './prebuilt_rules/use_fetch_prebuilt_rules_upgrade_review_query';
import { useInvalidateFetchPrebuiltRulesInstallReviewQuery } from './prebuilt_rules/use_fetch_prebuilt_rules_install_review_query';
import { useInvalidateFetchCoverageOverviewQuery } from './use_fetch_coverage_overview_query';

export const BULK_ACTION_MUTATION_KEY = ['POST', DETECTION_ENGINE_RULES_BULK_ACTION];

export const useBulkActionMutation = (
  options?: UseMutationOptions<
    BulkActionResponse,
    IHttpFetchError<BulkActionErrorResponse>,
    PerformRulesBulkActionProps
  >
) => {
  const invalidateFindRulesQuery = useInvalidateFindRulesQuery();
  const invalidateFetchRuleByIdQuery = useInvalidateFetchRuleByIdQuery();
  const invalidateFetchRuleManagementFilters = useInvalidateFetchRuleManagementFiltersQuery();
  const invalidateFetchPrebuiltRulesStatusQuery = useInvalidateFetchPrebuiltRulesStatusQuery();
  const invalidateFetchPrebuiltRulesInstallReviewQuery =
    useInvalidateFetchPrebuiltRulesInstallReviewQuery();
  const invalidateFetchPrebuiltRulesUpgradeReviewQuery =
    useInvalidateFetchPrebuiltRulesUpgradeReviewQuery();
  const invalidateFetchCoverageOverviewQuery = useInvalidateFetchCoverageOverviewQuery();
  const updateRulesCache = useUpdateRulesCache();

  return useMutation<
    BulkActionResponse,
    IHttpFetchError<BulkActionErrorResponse>,
    PerformRulesBulkActionProps
  >((bulkActionProps: PerformRulesBulkActionProps) => performBulkAction(bulkActionProps), {
    ...options,
    mutationKey: BULK_ACTION_MUTATION_KEY,
    onSettled: (...args) => {
      const [
        response,
        error,
        {
          bulkAction: { type: actionType },
        },
      ] = args;

      const updatedRules =
        response?.attributes?.results?.updated ?? error?.body?.attributes?.results?.updated;

      switch (actionType) {
        case BulkActionTypeEnum.enable:
        case BulkActionTypeEnum.disable: {
          invalidateFetchRuleByIdQuery();
          invalidateFetchCoverageOverviewQuery();
          if (updatedRules) {
            // We have a list of updated rules, no need to invalidate all
            updateRulesCache(updatedRules);
          } else {
            // We failed to receive the list of update rules, invalidate all
            invalidateFindRulesQuery();
          }
          break;
        }
        case BulkActionTypeEnum.delete:
          invalidateFindRulesQuery();
          invalidateFetchRuleByIdQuery();
          invalidateFetchRuleManagementFilters();
          invalidateFetchPrebuiltRulesStatusQuery();
          invalidateFetchPrebuiltRulesInstallReviewQuery();
          invalidateFetchPrebuiltRulesUpgradeReviewQuery();
          invalidateFetchCoverageOverviewQuery();
          break;
        case BulkActionTypeEnum.duplicate:
          invalidateFindRulesQuery();
          invalidateFetchRuleManagementFilters();
          invalidateFetchCoverageOverviewQuery();
          break;
        case BulkActionTypeEnum.edit:
          if (updatedRules) {
            // We have a list of updated rules, no need to invalidate all
            updateRulesCache(updatedRules);
          } else {
            // We failed to receive the list of update rules, invalidate all
            invalidateFindRulesQuery();
          }
          invalidateFetchRuleByIdQuery();
          invalidateFetchRuleManagementFilters();
          invalidateFetchCoverageOverviewQuery();
          invalidateFetchPrebuiltRulesUpgradeReviewQuery();
          break;
      }

      if (options?.onSettled) {
        options.onSettled(...args);
      }
    },
  });
};
