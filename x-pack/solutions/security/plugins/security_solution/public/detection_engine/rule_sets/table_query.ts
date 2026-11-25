/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import type { RuleScope, RuleSetConditions } from '../../../common/api/detection_engine/rule_sets';
import {
  hasRuleSetConditions,
  liftTagCategories,
  normalizeRuleSetConditions,
} from '../../../common/detection_engine/rule_sets/rule_set_conditions';
import type { FilterOptions } from '../rule_management/logic/types';

interface SavedSet {
  id: string;
  conditions: RuleSetConditions;
}

/**
 * The facets of the rules table as rule set conditions. The search box is not part of them: it
 * finds rules (by meaning and by words) and is never saved into a set. A saved set can still
 * have a keyword `search` condition from earlier; it stays in the conditions.
 */
export const draftConditions = ({ conditions }: Pick<FilterOptions, 'conditions'>) =>
  normalizeRuleSetConditions({ ...conditions });

/** The table state that shows a saved set: its conditions in the facets, an empty search box. */
export const ruleSetFilterState = (set: SavedSet): Partial<FilterOptions> => ({
  conditions: liftTagCategories(set.conditions),
  filter: '',
  draftOf: set.id,
});

/** The facets or the search differ from the saved conditions of the selected set. */
export const isRuleSetChanged = (filterOptions: FilterOptions, set: SavedSet | undefined) =>
  set != null &&
  filterOptions.draftOf === set.id &&
  !isEqual(
    draftConditions(filterOptions),
    normalizeRuleSetConditions(liftTagCategories(set.conditions))
  );

export interface RuleQueryParams {
  rule_scope?: RuleScope;
  filter_params?: RuleSetConditions;
  search?: { term: string; mode: 'semantic' };
}

/**
 * The search box asks for `semantic`; the server keeps exact text (quotes, MITRE and rule ids) on
 * the keyword search and falls back to it without a model, and says which mode ran.
 */
const searchParam = (filter: string) => {
  const term = filter.trim();
  return term ? { search: { term, mode: 'semantic' as const } } : {};
};

/**
 * The rules that the table shows, as `_search` parameters. Without a set: the facets as
 * `filter_params` and the search. With a set: the set with the facets and the search as its
 * conditions, so an unsaved change shows at once; picked and left-out rules stay on the server.
 * Until the set's conditions are in the facets, the saved set.
 */
export const ruleQueryParams = (filterOptions: FilterOptions): RuleQueryParams => {
  const { ruleSetId, members } = filterOptions;
  if (ruleSetId && members) {
    return {
      rule_scope: { rule_set_id: ruleSetId, members },
      ...searchParam(filterOptions.filter),
    };
  }
  if (ruleSetId) {
    return {
      rule_scope:
        filterOptions.draftOf === ruleSetId
          ? { rule_set_id: ruleSetId, conditions: draftConditions(filterOptions) }
          : { rule_set_id: ruleSetId },
      ...searchParam(filterOptions.filter),
    };
  }
  return {
    ...searchParam(filterOptions.filter),
    ...(filterOptions.conditions && hasRuleSetConditions(filterOptions.conditions)
      ? { filter_params: filterOptions.conditions }
      : {}),
  };
};

/** The same rules for a bulk action by query (`QueryOrIds`). */
export const bulkScopeParams = (
  filterOptions: FilterOptions
): { ruleScope?: RuleScope; filterParams?: RuleSetConditions } => {
  const { rule_scope: ruleScope, filter_params: filterParams } = ruleQueryParams(filterOptions);
  return { ...(ruleScope ? { ruleScope } : {}), ...(filterParams ? { filterParams } : {}) };
};
