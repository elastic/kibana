/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';

export const FilterIn = true;
export const FilterOut = false;

/**
 * Creates a new filter to apply to the KQL bar.
 *
 * @param key A string value mainly representing the field of an indicator
 * @param value A string value mainly representing the value of the indicator for the field
 * @param negate Set to true when we create a negated filter (e.g. NOT threat.indicator.type: url)
 * @returns The new {@link Filter}
 */
const createFilter = ({
  key,
  value,
  negate,
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
  },
  query: { match_phrase: { [key]: value } },
});

/**
 * Checks if the key/value pair already exists in an array of filters.
 *
 * @param filters Array of {@link Filter} retrieved from the SearchBar filterManager.
 * @param key A string value mainly representing the field of an indicator
 * @param value A string value mainly representing the value of the indicator for the field
 * @returns The new {@link Filter}
 */
export const filterExistsInFiltersArray = (
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
 * Takes an array of filters and returns the updated array according to:
 * - if the filter already exists, we remove it
 * - if the filter does not exist, we add it
 * This assumes that the only filters that can exist are negated filters.
 *
 * @param existingFilters List of {@link Filter} retrieved from the filterManager
 * @param key The value used in the newly created {@link Filter} as a key
 * @param value The value used in the newly created {@link Filter} as a params query
 * @param filterType Weather the function is called for a {@link FilterIn} or {@link FilterOut} action
 * @returns the updated array of filters
 */
export const updateFiltersArray = (
  existingFilters: Filter[],
  key: string,
  value: string | null,
  filterType: boolean
): Filter[] => {
  const newFilter = createFilter({ key, value: value as string, negate: !filterType });

  const filter: Filter | undefined = filterExistsInFiltersArray(
    existingFilters,
    key,
    value as string
  );

  return filter
    ? existingFilters.filter((f: Filter) => f !== filter)
    : [...existingFilters, newFilter];
};
