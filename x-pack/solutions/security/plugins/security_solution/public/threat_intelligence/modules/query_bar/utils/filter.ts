/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';

export const FilterIn = true;
export const FilterOut = false;

type Value = string | string[] | null;

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

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
      f.meta?.type === 'phrase' &&
      f.meta?.key === key &&
      typeof f.meta.params === 'object' &&
      'query' in f.meta.params &&
      f.meta.params?.query === value
  );

/**
 * Returns true if the filter exists and should be removed, false otherwise (depending on a FilterIn or FilterOut action)
 * @param filter The {@link Filter}
 * @param filterType The type of action ({@link FilterIn} or {@link FilterOut})
 */
const shouldReplaceNegation = (existing: Filter | undefined, filterType: boolean): boolean =>
  !!existing && filterType === existing.meta.negate;

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
  value: Value,
  filterType: boolean,
  index?: string
): Filter[] => {
  // Normalize to unique list of strings

  const values: string[] = Array.isArray(value)
    ? [...new Set(value.filter(isNonEmptyString))]
    : isNonEmptyString(value)
    ? [value]
    : [];

  if (values.length === 0) return existingFilters;

  // Single value
  if (values.length === 1) {
    const v = values[0];
    const newFilter = createPhraseFilter({ key, value: v, negate: !filterType, index });
    const existing = findPhraseFilter(existingFilters, key, v);

    return shouldReplaceNegation(existing, filterType)
      ? [...existingFilters.filter((f) => f !== existing), newFilter]
      : [...existingFilters, newFilter];
  }

  // Multi-value: apply the same per-value logic, accumulating results
  let result = existingFilters.slice();

  for (const v of values) {
    const existing = findPhraseFilter(result, key, v);
    const newFilter = createPhraseFilter({ key, value: v, negate: !filterType, index });

    if (shouldReplaceNegation(existing, filterType)) {
      // Replace opposite-negated filter with the new one
      result = [...result.filter((f) => f !== existing), newFilter];
    } else {
      // Add a new filter
      result = [...result, newFilter];
    }
  }

  return result;
};
