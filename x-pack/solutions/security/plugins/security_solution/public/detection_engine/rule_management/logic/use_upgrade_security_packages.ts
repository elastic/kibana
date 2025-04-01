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

/**
 * Install or upgrade the security packages (endpoint and prebuilt rules)
 */
export const useUpgradeSecurityPackages = () => {
  const { mutate: bootstrapPrebuiltRules } = useBootstrapPrebuiltRulesMutation();

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
