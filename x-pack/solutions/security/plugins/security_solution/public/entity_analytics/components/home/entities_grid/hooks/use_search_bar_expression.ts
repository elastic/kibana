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
import { joinAnd } from '../queries/esql';

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

/**
 * The search bar's query and filter pills as one ES|QL expression; `undefined` when empty.
 * With the entity `dataView`, pills on fields it lacks are left out instead of failing the query,
 * and the fields that put them there are the `ignoredFields`. Without it (loading) none is left out.
 */
export const useSearchBarExpression = (
  dataView?: DataView
): {
  searchExpression: string | undefined;
  applicableFilters: Filter[];
  ignoredFields: string[];
} => {
  const getGlobalFilters = useMemo(() => inputsSelectors.globalFiltersQuerySelector(), []);
  const getGlobalQuery = useMemo(() => inputsSelectors.globalQuerySelector(), []);
  const globalFilters = useDeepEqualSelector(getGlobalFilters);
  const globalQuery = useDeepEqualSelector(getGlobalQuery);

  return useMemo(() => {
    const fieldNames = dataView && new Set(dataView.fields.getAll().map(({ name }) => name));
    const { applicable, ignoredFields } = fieldNames
      ? splitFiltersByFields(globalFilters, fieldNames)
      : { applicable: globalFilters, ignoredFields: [] };
    const { esqlExpression: filterBarExpr } = convertFiltersToESQLExpression(applicable);
    return {
      searchExpression: joinAnd(filterBarExpr, convertQueryToESQLExpression(globalQuery)),
      applicableFilters: applicable,
      ignoredFields,
    };
  }, [globalFilters, globalQuery, dataView]);
};
