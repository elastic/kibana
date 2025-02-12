/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React from 'react';
import type { RuleResponse } from '../../../../../common/api/detection_engine';
import { isCustomizedPrebuiltRule } from '../../../../../common/api/detection_engine';
import { PrebuiltRulesCustomizationDisabledReason } from '../../../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';
import { usePrebuiltRulesCustomizationStatus } from '../../logic/prebuilt_rules/use_prebuilt_rules_customization_status';
import * as i18n from './translations';

interface CustomizedPrebuiltRuleBadgeProps {
  rule: RuleResponse | null;
}

export const CustomizedPrebuiltRuleBadge: React.FC<CustomizedPrebuiltRuleBadgeProps> = ({
  rule,
}) => {
  const { isRulesCustomizationEnabled, customizationDisabledReason } =
    usePrebuiltRulesCustomizationStatus();

  if (
    !isRulesCustomizationEnabled &&
    customizationDisabledReason === PrebuiltRulesCustomizationDisabledReason.FeatureFlag
  ) {
    return null;
  }

  if (rule === null || !isCustomizedPrebuiltRule(rule)) {
    return null;
  }

  return <EuiBadge color="hollow">{i18n.MODIFIED_PREBUILT_RULE_LABEL}</EuiBadge>;
};
