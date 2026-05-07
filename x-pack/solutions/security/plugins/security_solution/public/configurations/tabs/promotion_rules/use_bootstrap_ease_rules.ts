/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useIsMutating } from '@kbn/react-query';
import {
  INITIALIZATION_FLOW_INIT_PREBUILT_RULES,
  INITIALIZATION_FLOW_STATUS_READY,
  INITIALIZATION_FLOW_STATUS_ERROR,
} from '../../../../common/api/initialization';
import { useSecuritySolutionInitialization } from '../../../common/components/initialization/use_security_solution_initialization';
import { useUserPrivileges } from '../../../common/components/user_privileges';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import {
  BOOTSTRAP_EASE_RULES_KEY,
  useBootstrapEaseRulesMutation,
} from '../../../detection_engine/rule_management/api/hooks/prebuilt_rules/use_bootstrap_ease_rules';
import * as i18n from '../../../detection_engine/rule_management/logic/translations';

/**
 * Bootstraps EASE rules after the prebuilt rules package is installed.
 * Only runs when the user has rule edit privileges.
 * Call this from EASE-specific components (e.g., the PromotionRules wrapper).
 */
export const useBootstrapEaseRules = () => {
  const { addError } = useAppToasts();
  const { edit: canEditRules } = useUserPrivileges().rulesPrivileges.rules;

  const initState = useSecuritySolutionInitialization([INITIALIZATION_FLOW_INIT_PREBUILT_RULES]);
  const prebuiltRulesFlowState = initState[INITIALIZATION_FLOW_INIT_PREBUILT_RULES];
  const prebuiltRulesPackageReady =
    prebuiltRulesFlowState?.result?.status === INITIALIZATION_FLOW_STATUS_READY;

  const prebuiltRulesPackageError =
    prebuiltRulesFlowState?.result?.status === INITIALIZATION_FLOW_STATUS_ERROR
      ? prebuiltRulesFlowState.result.error ?? 'Unknown error'
      : null;

  const { mutate: bootstrapEaseRules } = useBootstrapEaseRulesMutation({
    onError: (error) => {
      addError(error, { title: i18n.BOOTSTRAP_EASE_RULES_FAILURE });
    },
    onSuccess: ({ errors }) => {
      if (errors.length) {
        addError(new Error(errors.map((error) => error.message).join('; ')), {
          title: i18n.BOOTSTRAP_EASE_RULES_FAILURE,
        });
      }
    },
  });

  useEffect(() => {
    if (prebuiltRulesPackageError !== null) {
      addError(new Error(prebuiltRulesPackageError), {
        title: i18n.BOOTSTRAP_PREBUILT_RULES_PACKAGE_FAILURE,
      });
    }
  }, [prebuiltRulesPackageError, addError]);

  useEffect(() => {
    if (prebuiltRulesPackageReady && canEditRules) {
      bootstrapEaseRules();
    }
  }, [prebuiltRulesPackageReady, canEditRules, bootstrapEaseRules]);
};

/**
 * @returns true if EASE rules are currently being bootstrapped
 */
export const useIsBootstrappingEaseRules = () => {
  return useIsMutating({ mutationKey: BOOTSTRAP_EASE_RULES_KEY }) > 0;
};
