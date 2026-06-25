/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse, RuleSignatureId } from '../../../../common/api/detection_engine';
import { useFindRulesQuery } from '../api/hooks/use_find_rules_query';

/**
 * Fetches an already-installed prebuilt rule by its prebuilt `rule_id`
 * (signature ID, not the alerting saved-object UUID). Returns at most one rule
 * — `rule_id` is unique per installed alerting rule.
 *
 * Used by the Add Rules deep-link flow: when the install-review endpoint
 * returns nothing for a requested `rule_id`, the rule has either been
 * installed (common) or doesn't exist (rare). This hook covers the installed
 * case so the preview flyout can still render the rule with disabled install
 * buttons.
 */
export const useFindInstalledPrebuiltRuleByRuleId = (
  ruleId: RuleSignatureId | undefined,
  options?: { enabled?: boolean }
): { rule: RuleResponse | undefined; isFetching: boolean; isFetched: boolean } => {
  const queryResult = useFindRulesQuery(
    {
      filter: ruleId ? { term: `alert.attributes.params.ruleId: "${ruleId}"` } : undefined,
      pagination: { page: 1, perPage: 1 },
    },
    { enabled: Boolean(ruleId) && (options?.enabled ?? true) }
  );

  return {
    rule: queryResult.data?.rules[0],
    isFetching: queryResult.isFetching,
    isFetched: queryResult.isFetched,
  };
};
