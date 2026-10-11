/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInitialRuleBaseVersionStatus } from './get_initial_usage';
import type { RuleBaseVersionCounts, RuleMetric } from './types';

type RuleBaseVersionInfo = Pick<RuleMetric, 'is_customized' | 'has_base_version'>;

/**
 * Cross-tabs prebuilt rules by customization and base version presence. Expects all installed
 * prebuilt rules, including legacy ones without a persisted `ruleSource`.
 */
export const getRuleBaseVersionStatus = (
  prebuiltRules: ReadonlyArray<RuleBaseVersionInfo>
): RuleBaseVersionCounts => {
  const counts = getInitialRuleBaseVersionStatus();

  prebuiltRules.forEach((rule) => {
    if (rule.is_customized && rule.has_base_version) {
      counts.customized_with_base_version += 1;
      return;
    }

    if (rule.is_customized) {
      counts.customized_without_base_version += 1;
      return;
    }

    if (rule.has_base_version) {
      counts.noncustomized_with_base_version += 1;
      return;
    }

    counts.noncustomized_without_base_version += 1;
  });

  return counts;
};
