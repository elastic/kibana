/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { UseMutationOptions } from '@kbn/react-query';
import { useMutation } from '@kbn/react-query';
import { BOOTSTRAP_EASE_RULES_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { RuleBootstrapResults } from '../../../../../../common/api/detection_engine/prebuilt_rules/bootstrap_prebuilt_rules/bootstrap_prebuilt_rules.gen';
import { bootstrapEaseRules } from '../../api';
import { useInvalidateFindRulesQuery } from '../use_find_rules_query';

export const BOOTSTRAP_EASE_RULES_KEY = ['POST', BOOTSTRAP_EASE_RULES_URL];

export const useBootstrapEaseRulesMutation = (
  options?: UseMutationOptions<RuleBootstrapResults>
) => {
  const invalidateFindRulesQuery = useInvalidateFindRulesQuery();

  return useMutation(() => bootstrapEaseRules(), {
    ...options,
    mutationKey: BOOTSTRAP_EASE_RULES_KEY,
    onSuccess: (...args) => {
      const response = args[0];

      const hasRuleUpdates = response.deleted || response.installed || response.updated;
      if (hasRuleUpdates) {
        invalidateFindRulesQuery();
      }

      if (options?.onSuccess) {
        options.onSuccess(...args);
      }
    },
  });
};
