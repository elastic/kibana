/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuiltRulesCustomizationStatus } from '../../../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';
import { usePrebuiltRuleCustomizationUpsellingMessage } from './use_prebuilt_rule_customization_upselling_message';

/**
 * Custom hook to determine prebuilt rules customization status.
 *
 * This hook checks if the feature flag for prebuilt rules customization is
 * enabled and returns the reason why it's disabled if it's the case.
 */
export const usePrebuiltRulesCustomizationStatus = (): PrebuiltRulesCustomizationStatus => {
  // Upselling message is returned when the license level is insufficient,
  // otherwise it's undefined
  const upsellingMessage = usePrebuiltRuleCustomizationUpsellingMessage(
    'prebuilt_rule_customization'
  );

  return {
    isRulesCustomizationEnabled: !upsellingMessage,
  };
};
