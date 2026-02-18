/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions } from '@kbn/react-query';
import { useMutation } from '@kbn/react-query';
import { DETECTION_ENGINE_RULES_URL_HISTORY } from '../../../../../common/constants';
import { restoreChangeById } from '../api';
import { useInvalidateFindRulesQuery } from './use_find_rules_query';
// import { useUpdateRuleByIdCache } from './use_fetch_rule_by_id_query';
import { useInvalidateFetchRuleManagementFiltersQuery } from './use_fetch_rule_management_filters_query';
import { useInvalidateFetchCoverageOverviewQuery } from './use_fetch_coverage_overview_query';
import { useInvalidateFetchPrebuiltRulesUpgradeReviewQuery } from './prebuilt_rules/use_fetch_prebuilt_rules_upgrade_review_query';
import { useInvalidateFetchPrebuiltRuleBaseVersionQuery } from './prebuilt_rules/use_fetch_prebuilt_rule_base_version_query';

export const RESTORE_CHANGE_MUTATION_KEY = ['PATCH', DETECTION_ENGINE_RULES_URL_HISTORY];

export const useRestoreChangeMutation = (
  options?: UseMutationOptions<{ ok: boolean }, Error, { changeId: string }>
) => {
  const invalidateFindRulesQuery = useInvalidateFindRulesQuery();
  const invalidateFetchRuleManagementFilters = useInvalidateFetchRuleManagementFiltersQuery();
  const invalidateFetchCoverageOverviewQuery = useInvalidateFetchCoverageOverviewQuery();
  const invalidatePrebuiltRulesUpdateReview = useInvalidateFetchPrebuiltRulesUpgradeReviewQuery();
  const invalidateFetchPrebuiltRuleBaseVerison = useInvalidateFetchPrebuiltRuleBaseVersionQuery();
  // const updateRuleCache = useUpdateRuleByIdCache();

  return useMutation<{ ok: boolean }, Error, { id: string; changeId: string }>(
    ({ id, changeId }: { id: string; changeId: string }) => restoreChangeById({ id, changeId }),
    {
      ...options,
      mutationKey: RESTORE_CHANGE_MUTATION_KEY,
      onSettled: (...args) => {
        invalidateFindRulesQuery();
        invalidateFetchRuleManagementFilters();
        invalidateFetchCoverageOverviewQuery();
        invalidatePrebuiltRulesUpdateReview();
        invalidateFetchPrebuiltRuleBaseVerison();

        // const [response] = args;

        // if (response) {
        //   updateRuleCache(response);
        // }

        options?.onSettled?.(...args);
      },
    }
  );
};
