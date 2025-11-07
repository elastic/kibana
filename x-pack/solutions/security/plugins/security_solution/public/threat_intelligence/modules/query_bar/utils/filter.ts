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
 * Create a single phrase (match_phrase) filter for a field/value.
 * @param key   Field name
 * @param value Exact value to match
 * @param negate Whether the filter is negated
 * @param index Optional data view id
 * @returns A Kibana {@link Filter} with meta.type 'phrase'
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
 * Should an existing matching filter be replaced to flip its negation?
 * @param existing  Existing matching filter
 * @param filterType {@link FilterIn} or {@link FilterOut}
 * @returns true to replace (toggle negation), false to add another filter
 */
const shouldReplaceNegation = (existing: Filter | undefined, filterType: boolean): boolean =>
  !!existing && filterType === existing.meta.negate;

/**
 * Update filters:
 * - Normalizes values to unique strings
 * - For a single value: add or replace a phrase filter
 * - For multiple values: applies the same logic for each value, adding one phrase filter per value
 *
 * @param existingFilters Current filters from filterManager
 * @param key             Field name
 * @param value           String or string[] (multi-value supported)
 * @param filterType      {@link FilterIn} (include) or {@link FilterOut} (exclude)
 * @param index           Optional data view id
 * @returns Updated filters array
 */
export const updateFiltersArray = (
  existingFilters: Filter[],
  key: string,
  value: Value,
  filterType: boolean,
  index?: string
): Filter[] => {
  // Normalize to unique non-empty strings
  const nonEmptyValues = [value].flat().filter(isNonEmptyString);
  const sanitizedValues = Array.from(new Set(nonEmptyValues));

  if (sanitizedValues.length === 0) return existingFilters;

  return sanitizedValues.reduce<Filter[]>((result, v) => {
    const existing = filterExistsInFiltersArray(result, key, v);
    const newFilter = createFilter({ key, value: v, negate: !filterType, index });

    if (shouldReplaceNegation(existing, filterType)) {
      // Flip negation by replacing the opposite one
      return [...result.filter((f) => f !== existing), newFilter];
    }

    return [...result, newFilter];
  }, existingFilters);
};
