/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInitialRuleBaseVersionStatus } from './get_initial_usage';
import type { ExternalRuleSourceInfo } from './get_rule_customization_status';
import type { RuleBaseVersionCounts } from './types';

export const getRuleBaseVersionStatus = (
  ruleSources: ReadonlyArray<ExternalRuleSourceInfo>
): RuleBaseVersionCounts => {
  const counts = getInitialRuleBaseVersionStatus();

  ruleSources.forEach((ruleSource) => {
    if (ruleSource.is_customized && ruleSource.has_base_version) {
      counts.customized_with_base_version += 1;
      return;
    }

    if (ruleSource.is_customized) {
      counts.customized_without_base_version += 1;
      return;
    }

    if (ruleSource.has_base_version) {
      counts.noncustomized_with_base_version += 1;
      return;
    }

    counts.noncustomized_without_base_version += 1;
  });

  return counts;
};
