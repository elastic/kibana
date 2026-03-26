/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInitialRuleUpgradeStatus } from './get_initial_usage';
import type { RuleMetric } from './types';

export function calculateRuleUpgradeStatus(upgradeableRules: RuleMetric[]) {
  return upgradeableRules.reduce((acc, rule) => {
    acc.total += 1;
    if (rule.is_customized) {
      acc.customized += 1;
    }
    if (rule.enabled) {
      acc.enabled += 1;
    } else {
      acc.disabled += 1;
    }
    return acc;
  }, getInitialRuleUpgradeStatus());
}
