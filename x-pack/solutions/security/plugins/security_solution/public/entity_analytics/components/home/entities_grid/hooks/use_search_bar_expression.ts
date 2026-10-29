/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { convertFiltersToESQLExpression, convertQueryToESQLExpression } from '@kbn/esql-utils';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../../common/store/inputs';
import type { RowsMode } from '../common';
import { joinAnd } from '../queries/esql';
import { translateSearch } from '../queries/kql_to_esql';
import { applyResolvedEntityFilterOverrides } from '../queries/resolved_entities';
import type {
  ResolvedEntityConditions,
  ResolvedEntityFilterOverrides,
} from '../queries/resolved_entities';
import { useResolvedEntityOverrides } from './use_entity_grid_data';
import { useGridContext } from './use_entity_grid_context';

/** A search on resolved rows that has no group conditions: it matches the main entities' own values only. */
const isMainEntityOnlySearch = (
  rowsMode: RowsMode,
  hasSearch: boolean,
  conditions: ResolvedEntityConditions | undefined
): boolean => rowsMode === 'resolved' && hasSearch && !conditions;

interface SearchBarExpression {
  /** The search bar's query and pills as one ES|QL expression, patched with the overrides; `undefined` when empty. */
  searchExpression?: string;
  /** The same patch for DSL queries; absent when the search is not judged on groups. */
  searchOverrides?: ResolvedEntityFilterOverrides;
  isSearchPending: boolean;
  searchOverridesError: unknown;
  /** The search text, when it matches the main entities' own values only; `undefined` otherwise. */
  mainEntityOnlySearch?: string;
}

/**
 * The search bar as one ES|QL expression. On resolved rows a KQL search on group fields matches the
 * group's values, as the row shows them: overrides add and remove the groups where that differs from
 * the main entity's. Any other search matches the main entities' own values.
 */
export const useSearchBarExpression = (rowsMode: RowsMode): SearchBarExpression => {
  const getGlobalFilters = useMemo(() => inputsSelectors.globalFiltersQuerySelector(), []);
  const getGlobalQuery = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalFilters = useDeepEqualSelector(getGlobalFilters);
  const globalQuery = useDeepEqualSelector(getGlobalQuery);

  const expression = useMemo(() => {
    const { esqlExpression: filterBarExpr } = convertFiltersToESQLExpression(globalFilters);
    return joinAnd(filterBarExpr, convertQueryToESQLExpression(globalQuery));
  }, [globalFilters, globalQuery]);

  const { query, language } = globalQuery;
  const kql = language === 'kuery' && typeof query === 'string' ? query.trim() : '';
  const hasSearch = !!globalFilters.length || (typeof query === 'string' ? !!query.trim() : true);
  const translation = useMemo(() => (kql ? translateSearch(kql) : undefined), [kql]);
  // Pills are not translated, so a search with pills stays on the main entities' own values.
  const conditions = rowsMode === 'resolved' && !globalFilters.length ? translation : undefined;

  const { data: searchOverrides, error } = useResolvedEntityOverrides(useGridContext(), conditions);

  const searchExpression = useMemo(
    () =>
      expression && searchOverrides
        ? applyResolvedEntityFilterOverrides(expression, searchOverrides)
        : expression,
    [expression, searchOverrides]
  );

  return {
    searchExpression,
    searchOverrides,
    isSearchPending: !!conditions && searchOverrides === undefined && !error,
    searchOverridesError: error,
    mainEntityOnlySearch: isMainEntityOnlySearch(rowsMode, hasSearch, conditions)
      ? expression
      : undefined,
  };
};
