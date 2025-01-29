/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from '@kbn/es-query';

export const FilterIn = true;
export const FilterOut = false;

/**
 * Creates a new filter to apply to the KQL bar.
 * @param key A string value mainly representing the field of an indicator
 * @param value A string value mainly representing the value of the indicator for the field
 * @param negate Set to true when we create a negated filter (e.g. NOT threat.indicator.type: url)
 * @returns The new {@link Filter}
 */
const createFilter = ({
  key,
  value,
  negate,
  index,
}: {
  key: string;
  value: string;
  negate: boolean;
  index?: string;
}): Filter => ({
  meta: {
    alias: null,
    negate,
    disabled: false,
    type: 'phrase',
    key,
    params: { query: value },
    index,
  },
  query: { match_phrase: { [key]: value } },
});

/**
 * Checks if the key/value pair already exists in an array of filters.
 * @param filters Array of {@link Filter} retrieved from the SearchBar filterManager.
 * @param key A string value mainly representing the field of an indicator
 * @param value A string value mainly representing the value of the indicator for the field
 * @returns The new {@link Filter}
 */
const filterExistsInFiltersArray = (
  filters: Filter[],
  key: string,
  value: string
): Filter | undefined =>
  filters.find(
    (f: Filter) =>
      f.meta.key === key &&
      typeof f.meta.params === 'object' &&
      'query' in f.meta.params &&
      f.meta.params?.query === value
  );

/**
 * Returns true if the filter exists and should be removed, false otherwise (depending on a FilterIn or FilterOut action)
 * @param filter The {@link Filter}
 * @param filterType The type of action ({@link FilterIn} or {@link FilterOut})
 */
const shouldRemoveFilter = (filter: Filter | undefined, filterType: boolean): boolean =>
  filter != null && filterType === filter.meta.negate;

/**
 * Takes an array of filters and returns the updated array according to:
 * - if a filter already exists but negated, replace it by it's negation
 * - add the newly created filter
 * @param existingFilters List of {@link Filter} retrieved from the filterManager
 * @param key The value used in the newly created [@link Filter} as a key
 * @param value The value used in the newly created [@link Filter} as a params query
 * @param filterType Weather the function is called for a {@link FilterIn} or {@link FilterOut} action
 * @returns the updated array of filters
 */
export const updateFiltersArray = (
  existingFilters: Filter[],
  key: string,
  value: string | null,
  filterType: boolean,
  index?: string
): Filter[] => {
  const newFilter = createFilter({ key, value: value as string, negate: !filterType, index });

  const filter: Filter | undefined = filterExistsInFiltersArray(
    existingFilters,
    key,
    value as string
  );

  return shouldRemoveFilter(filter, filterType)
    ? [...existingFilters.filter((f: Filter) => f !== filter), newFilter]
    : [...existingFilters, newFilter];
};
