/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryRulesQueryRuleset } from '@elastic/elasticsearch/lib/api/types';
import { useEffect, useState } from 'react';
import { useFetchQueryRuleset } from '../../hooks/use_fetch_query_ruleset';
import { SearchQueryRulesQueryRule } from '../../types';
import { normalizeQueryRuleset } from '../../utils/query_rules_utils';

interface UseQueryRulesetDetailStateProps {
  rulesetId: string;
}

export const useQueryRulesetDetailState = ({ rulesetId }: UseQueryRulesetDetailStateProps) => {
  const { data, isInitialLoading, isError, error } = useFetchQueryRuleset(rulesetId);
  const [queryRuleset, setQueryRuleset] = useState<QueryRulesQueryRuleset | null>(null);
  const [rules, setRules] = useState<SearchQueryRulesQueryRule[]>([]);

  useEffect(() => {
    if (data) {
      const normalizedRuleset = normalizeQueryRuleset(data);
      setQueryRuleset(normalizedRuleset);
      setRules(normalizedRuleset.rules);
    }
  }, [data, setRules, setQueryRuleset]);

  const updateRule = (updatedRule: SearchQueryRulesQueryRule) => {
    const newRules = rules.map((rule) =>
      rule.rule_id === updatedRule.rule_id ? updatedRule : rule
    );
    setRules([...newRules]);
  };

  return {
    queryRuleset,
    rules,
    setNewRules: setRules,
    updateRule,
    isInitialLoading,
    isError,
    error,
  };
};
