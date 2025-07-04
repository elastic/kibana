/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useIsMutating } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  BOOTSTRAP_PREBUILT_RULES_KEY,
  useBootstrapPrebuiltRulesMutation,
} from '../api/hooks/prebuilt_rules/use_bootstrap_prebuilt_rules';
import { useAppToasts } from '../../../common/hooks/use_app_toasts';
import * as i18n from './translations';

/**
 * Install or upgrade the security packages (endpoint and prebuilt rules)
 */
export const useUpgradeSecurityPackages = () => {
  const { addError } = useAppToasts();

  const { mutate: bootstrapPrebuiltRules } = useBootstrapPrebuiltRulesMutation({
    onError: (error) => {
      addError(error, { title: i18n.BOOTSTRAP_PREBUILT_RULES_FAILURE });
    },
    onSuccess: ({ rules }) => {
      if (rules?.errors.length) {
        addError(new Error(rules.errors.map((error) => error.message).join('; ')), {
          title: i18n.BOOTSTRAP_PREBUILT_RULES_FAILURE,
        });
      }
    },
  });

  useEffect(() => {
    bootstrapPrebuiltRules();
  }, [bootstrapPrebuiltRules]);
};

/**
 * @returns true if the security packages are being installed or upgraded
 */
export const useIsUpgradingSecurityPackages = () => {
  const bootstrappingRules = useIsMutating({
    mutationKey: BOOTSTRAP_PREBUILT_RULES_KEY,
  });

  return bootstrappingRules > 0;
};
