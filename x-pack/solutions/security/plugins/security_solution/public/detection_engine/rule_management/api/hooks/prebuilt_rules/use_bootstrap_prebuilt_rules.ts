/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';
import { BOOTSTRAP_PREBUILT_RULES_URL } from '../../../../../../common/api/detection_engine';
import type { BootstrapPrebuiltRulesResponse } from '../../../../../../common/api/detection_engine/prebuilt_rules/bootstrap_prebuilt_rules/bootstrap_prebuilt_rules.gen';
import { PREBUILT_RULES_PACKAGE_NAME } from '../../../../../../common/detection_engine/constants';
import { bootstrapPrebuiltRules } from '../../api';
import { useInvalidateFetchPrebuiltRulesInstallReviewQuery } from './use_fetch_prebuilt_rules_install_review_query';
import { useInvalidateFetchPrebuiltRulesStatusQuery } from './use_fetch_prebuilt_rules_status_query';
import { useInvalidateFetchPrebuiltRulesUpgradeReviewQuery } from './use_fetch_prebuilt_rules_upgrade_review_query';

export const BOOTSTRAP_PREBUILT_RULES_KEY = ['POST', BOOTSTRAP_PREBUILT_RULES_URL];

export const useBootstrapPrebuiltRulesMutation = (
  options?: UseMutationOptions<BootstrapPrebuiltRulesResponse>
) => {
  const invalidatePrePackagedRulesStatus = useInvalidateFetchPrebuiltRulesStatusQuery();
  const invalidatePrebuiltRulesInstallReview = useInvalidateFetchPrebuiltRulesInstallReviewQuery();
  const invalidatePrebuiltRulesUpdateReview = useInvalidateFetchPrebuiltRulesUpgradeReviewQuery();

  return useMutation(() => bootstrapPrebuiltRules(), {
    ...options,
    mutationKey: BOOTSTRAP_PREBUILT_RULES_KEY,
    onSuccess: (...args) => {
      const response = args[0];
      if (
        response?.packages.find((pkg) => pkg.name === PREBUILT_RULES_PACKAGE_NAME)?.status ===
        'installed'
      ) {
        // Invalidate other pre-packaged rules related queries. We need to do
        // that only in case the prebuilt rules package was installed indicating
        // that there might be new rules to install.
        invalidatePrePackagedRulesStatus();
        invalidatePrebuiltRulesInstallReview();
        invalidatePrebuiltRulesUpdateReview();
      }

      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
  });
};
