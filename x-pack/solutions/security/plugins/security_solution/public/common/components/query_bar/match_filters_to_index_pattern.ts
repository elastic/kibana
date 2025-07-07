/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { cloneDeep } from 'lodash';

/**
 * Updates each filter's `meta.index` property to match the specified index pattern.
 *
 * This ensures compatibility with the filters UI component, which requires `meta.index`
 * to match the current index pattern. If it doesn't, the UI will:
 *  - Display a vague warning: "Field does not exist in current view"
 *    (see: https://github.com/elastic/kibana/issues/178908)
 *  - Display the word "warning" instead of an actual value for filters with "AND" or "OR" operators
 *    (see: https://github.com/elastic/kibana/issues/203615)
 *  - Show an unnecessary data view selector in the filter editor
 *    (see: https://github.com/elastic/kibana/pull/174922)
 *
 * To prevent this confusing behavior, we explicitly set `meta.index` on each filter
 * to match the provided index pattern string.
 *
 * @param indexPattern Index pattern string to associate the filters with.
 * @param filters An array of filters to update.
 * @returns A new array of filters with the updated index property.
 */
export function matchFiltersToIndexPattern(indexPattern: string, filters: Filter[]): Filter[] {
  const updatedFilters = cloneDeep(filters);
  updatedFilters.forEach((filter) => {
    filter.meta.index = indexPattern;
  });
  return updatedFilters;
}
