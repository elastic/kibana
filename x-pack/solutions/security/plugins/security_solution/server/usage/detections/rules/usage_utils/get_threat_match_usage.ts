/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleSearchResult } from '../../../types';

export const getThreatMatchUsage = (
  ruleAttributes: RuleSearchResult
): {
  hasDoesNotMatchCondition?: boolean;
} => {
  if (ruleAttributes.params.type !== 'threat_match') {
    return {};
  }

  const hasDoesNotMatchCondition = ruleAttributes.params.threatMapping
    .flatMap((item) => item.entries)
    .some((entry) => entry.negate);

  return { hasDoesNotMatchCondition };
};
