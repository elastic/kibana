/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryRulesQueryRuleset } from '@elastic/elasticsearch/lib/api/types';
import { useEffect, useState } from 'react';
import { useFetchQueryRuleset } from '../../hooks/use_fetch_query_ruleset';
import type { SearchQueryRulesQueryRule } from '../../types';
import { normalizeQueryRuleset } from '../../utils/query_rules_utils';

const createEmptyRuleset = (
  rulesetId: QueryRulesQueryRuleset['ruleset_id']
): QueryRulesQueryRuleset => ({
  ruleset_id: rulesetId,
  rules: [],
});

interface UseQueryRulesetDetailStateProps {
  rulesetId: string;
  createMode: boolean;
}

const filterRules = (
  rules: SearchQueryRulesQueryRule[],
  searchFilter: string
): SearchQueryRulesQueryRule[] => {
  if (searchFilter.trim() === '') {
    return rules;
  }

  const lowerCaseFilter = searchFilter.toLowerCase();
  const shouldFilter = (rule: SearchQueryRulesQueryRule) => {
    return (
      rule.actions.docs?.some(
        (doc) =>
          doc._id.toLowerCase().includes(lowerCaseFilter) ||
          doc._index?.toLowerCase().includes(lowerCaseFilter)
      ) ||
      rule.actions.ids?.some((id) => id.toLowerCase().includes(lowerCaseFilter)) ||
      rule.criteria.some((criterion) => {
        return (
          criterion.type.toLowerCase().includes(lowerCaseFilter) ||
          criterion.values?.some((value) => value.toLowerCase().includes(lowerCaseFilter)) ||
          criterion.metadata?.toLowerCase().includes(lowerCaseFilter)
        );
      })
    );
  };
  return rules.filter(shouldFilter);
};

export const useQueryRulesetDetailState = ({
  rulesetId,
  createMode,
}: UseQueryRulesetDetailStateProps) => {
  const { data, isInitialLoading, isError, error } = useFetchQueryRuleset(rulesetId, !createMode);
  const [queryRuleset, setQueryRuleset] = useState<QueryRulesQueryRuleset | null>(
    createMode ? createEmptyRuleset(rulesetId) : null
  );
  const [rules, setRules] = useState<SearchQueryRulesQueryRule[]>([]);
  const [filteredRules, setFilteredRules] = useState<SearchQueryRulesQueryRule[]>([]);

  const [searchFilter, setSearchFilter] = useState<string>('');

  useEffect(() => {
    if (searchFilter.trim() === '') {
      setFilteredRules(rules);
    } else {
      setFilteredRules(filterRules(rules, searchFilter));
    }
  }, [rules, searchFilter]);

  useEffect(() => {
    if (!createMode && !isError && data) {
      const normalizedRuleset = normalizeQueryRuleset(data);
      setQueryRuleset(normalizedRuleset);
      setRules(normalizedRuleset.rules);
    }
  }, [data, setRules, setQueryRuleset, createMode, isError]);

  const updateRule = (updatedRule: SearchQueryRulesQueryRule) => {
    const newRules = rules.map((rule) =>
      rule.rule_id === updatedRule.rule_id ? updatedRule : rule
    );
    setRules([...newRules]);
  };

  const addNewRule = (newRule: SearchQueryRulesQueryRule) => {
    setRules((prevRules) => [
      ...prevRules,
      {
        ...newRule,
      },
    ]);
  };

  const deleteRule = (ruleId: string) => {
    const newRules = rules.filter((rule) => rule.rule_id !== ruleId);
    setRules(newRules);
  };

  return {
    queryRuleset,
    unfilteredRules: rules,
    rules: filteredRules,
    setSearchFilter,
    searchFilter,
    setNewRules: setRules,
    updateRule,
    addNewRule,
    deleteRule,
    isInitialLoading,
    isError,
    error,
  };
};
