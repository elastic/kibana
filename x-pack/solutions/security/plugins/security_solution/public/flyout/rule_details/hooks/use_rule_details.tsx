/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import { useRuleWithFallback } from '../../../detection_engine/rule_management/logic/use_rule_with_fallback';

export interface UseRuleDetailsParams {
  /**
   * Id of the rule
   */
  ruleId: string;
}

export interface UseRuleDetailsResult {
  /**
   * Whether the rule exists
   */
  isExistingRule: boolean;
  /**
   * Whether the data is loading
   */
  loading: boolean;
  /**
   * Rule object that represents relevant information about a rule
   */
  rule: RuleResponse | null;
}

/**
 * Hook to retrieve rule details for rule details flyout
 */
export const useRuleDetails = ({ ruleId }: UseRuleDetailsParams): UseRuleDetailsResult => {
  const [rule, setRule] = useState<RuleResponse | null>(null);
  const { rule: maybeRule, loading, isExistingRule } = useRuleWithFallback(ruleId ?? '');

  // persist rule until refresh is complete
  useEffect(() => {
    if (maybeRule != null) {
      setRule(maybeRule);
    }
  }, [maybeRule]);

  return useMemo(
    () => ({
      rule,
      loading,
      isExistingRule,
    }),
    [loading, isExistingRule, rule]
  );
};
