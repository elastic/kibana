/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '../../../../../../../../common/api/detection_engine/model/rule_schema';
import { ClientError, RuleConcurrencyError } from '../../utils';

interface CheckConcurrencyParams {
  existingRule: RuleResponse | null;
  currentRuleRevision: number | undefined;
}

export function checkConcurrency({
  existingRule,
  currentRuleRevision,
}: CheckConcurrencyParams): void {
  if (existingRule != null && existingRule.revision !== currentRuleRevision) {
    throw new RuleConcurrencyError(
      'Someone has updated the rule already. Please provide the latest rule revision.',
      existingRule.revision
    );
  }

  if (existingRule == null && currentRuleRevision != null) {
    throw new ClientError(
      'Someone has restored this deleted rule already. Please provide the latest rule revision.',
      409
    );
  }
}
