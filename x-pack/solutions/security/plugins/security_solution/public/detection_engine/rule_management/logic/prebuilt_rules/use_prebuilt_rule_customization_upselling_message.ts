/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { useUpsellingMessage } from '../../../../common/hooks/use_upselling';

/**
 * This hook returns an upselling message when the license level is insufficient
 * for prebuilt rule customization. If the license level is sufficient, it
 * returns `undefined`.
 */
export const usePrebuiltRuleCustomizationUpsellingMessage = () => {
  // Upselling message is returned when the license level is insufficient,
  // otherwise it's undefined
  const upsellingMessage = useUpsellingMessage('prebuilt_rule_customization');

  // We show the upselling message only if the feature flag is enabled
  const isFeatureFlagEnabled = useIsExperimentalFeatureEnabled('prebuiltRulesCustomizationEnabled');
  return isFeatureFlagEnabled ? upsellingMessage : undefined;
};
