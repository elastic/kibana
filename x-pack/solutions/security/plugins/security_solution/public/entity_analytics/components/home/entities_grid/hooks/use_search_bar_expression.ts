/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { getFilterField, isCombinedFilter } from '@kbn/es-query';
import { convertFiltersToESQLExpression, convertQueryToESQLExpression } from '@kbn/esql-utils';
import { useDeepEqualSelector } from '../../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../../common/store/inputs';
import type { RowsMode } from '../common';
import { joinAnd } from '../queries/esql';
import { translateSearch } from '../queries/kql_to_esql';
import { applyResolvedEntityFilterOverrides } from '../queries/resolved_entities';
import type { ResolvedEntityFilterOverrides } from '../queries/resolved_entities';
import { useResolvedEntityOverrides } from './use_entity_grid_data';
import { useGridContext } from './use_entity_grid_context';

const getFilterFields = (filter: Filter): string[] => {
  if (isCombinedFilter(filter)) {
    return filter.meta.params.flatMap(getFilterFields);
  }
  const field = getFilterField(filter);
  return field ? [field] : [];
};

/**
 * Filters from other pages or flyouts can name fields the entity docs don't have, and ES|QL fails
 * the whole query on an unknown column. A filter with any such field is `ignored` whole, and the fields
 * that put it there are listed. Filters that name no field are `applicable`.
 */
export const splitFiltersByFields = (
  filters: readonly Filter[],
  fieldNames: ReadonlySet<string>
): { applicable: Filter[]; ignoredFields: string[] } => {
  const ignoredFields = new Set<string>();
  const applicable = filters.filter((filter) => {
    if (filter.meta?.disabled) return true;
    const unknownFields = getFilterFields(filter).filter((field) => !fieldNames.has(field));
    unknownFields.forEach((field) => ignoredFields.add(field));
    return unknownFields.length === 0;
  });
  return { applicable, ignoredFields: [...ignoredFields] };
};

/** A search on resolved rows that is not judged on the groups: it matches the main entities' own values only. */
const isMainEntityOnlySearch = (
  rowsMode: RowsMode,
  hasSearch: boolean,
  isJudgedOnGroups: boolean
): boolean => rowsMode === 'resolved' && hasSearch && !isJudgedOnGroups;

interface SearchBarExpression {
  /** The pills the entity docs can answer; the others are left out of every query. */
  applicableFilters: Filter[];
  /** The fields that got a pill left out. */
  ignoredFields: string[];
  /** The search bar's query and pills as one ES|QL expression, patched with the overrides; `undefined` when empty. */
  searchExpression?: string;
  /** The same patch for DSL queries; absent when the search is not judged on groups. */
  searchOverrides?: ResolvedEntityFilterOverrides;
  isSearchOverridesPending: boolean;
  /** The search bar's query and pills before the overrides: the search as the user typed it. */
  rawSearchExpression?: string;
  /** The search text, when it matches the main entities' own values only; `undefined` otherwise. */
  mainEntityOnlySearch?: string;
}

/**
 * The search bar as one ES|QL expression. On resolved rows a KQL search on group fields matches the
 * group's values, as the row shows them: overrides add and remove the groups where that differs from
 * the main entity's. Any other search matches the main entities' own values.
 * With the entity `dataView`, pills on fields it lacks are left out instead of failing the query,
 * and the fields that put them there are the `ignoredFields`. Without it (loading) none is left out.
 */
export const useSearchBarExpression = (
  rowsMode: RowsMode,
  dataView?: DataView
): SearchBarExpression => {
  const getGlobalFilters = useMemo(() => inputsSelectors.globalFiltersQuerySelector(), []);
  const getGlobalQuery = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalFilters = useDeepEqualSelector(getGlobalFilters);
  const globalQuery = useDeepEqualSelector(getGlobalQuery);

  const { applicableFilters, ignoredFields } = useMemo(() => {
    const fieldNames = dataView && new Set(dataView.fields.getAll().map(({ name }) => name));
    const { applicable, ignoredFields: ignored } = fieldNames
      ? splitFiltersByFields(globalFilters, fieldNames)
      : { applicable: globalFilters, ignoredFields: [] };
    return { applicableFilters: applicable, ignoredFields: ignored };
  }, [globalFilters, dataView]);

  const expression = useMemo(() => {
    const { esqlExpression: filterBarExpr } = convertFiltersToESQLExpression(applicableFilters);
    return joinAnd(filterBarExpr, convertQueryToESQLExpression(globalQuery));
  }, [applicableFilters, globalQuery]);

  const { query, language } = globalQuery;
  const kql = language === 'kuery' && typeof query === 'string' ? query.trim() : '';
  const hasSearch =
    !!applicableFilters.length || (typeof query === 'string' ? !!query.trim() : true);
  const translation = useMemo(() => (kql ? translateSearch(kql) : undefined), [kql]);
  // Pills are not translated, so a search with pills stays on the main entities' own values.
  const conditions = rowsMode === 'resolved' && !applicableFilters.length ? translation : undefined;

  const { data, error } = useResolvedEntityOverrides(useGridContext(), conditions);
  // A failed overrides query leaves the search on the main entities' own values, like an untranslated one.
  const isJudgedOnGroups = !!conditions && !error;
  // A failed refetch keeps the lists it loaded before, which no longer apply.
  const searchOverrides = isJudgedOnGroups ? data : undefined;

  const searchExpression = useMemo(
    () =>
      expression && searchOverrides
        ? applyResolvedEntityFilterOverrides(expression, searchOverrides)
        : expression,
    [expression, searchOverrides]
  );

  return {
    applicableFilters,
    ignoredFields,
    searchExpression,
    searchOverrides,
    isSearchOverridesPending: isJudgedOnGroups && searchOverrides === undefined,
    rawSearchExpression: expression,
    mainEntityOnlySearch: isMainEntityOnlySearch(rowsMode, hasSearch, isJudgedOnGroups)
      ? expression
      : undefined,
  };
};
