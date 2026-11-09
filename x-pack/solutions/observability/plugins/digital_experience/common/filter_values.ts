/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The most values one filter takes, included and excluded together. */
export const FILTER_VALUE_CAP = 10;

export interface FilterValue {
  value: string;
  /** Leaves out the documents with this value, instead of keeping only those. */
  exclude: boolean;
}

/**
 * `current` with `value` included or excluded; picking the polarity it already has removes it, and
 * a value past the cap is not added.
 */
export const toggleFilterValue = (
  current: readonly FilterValue[],
  value: string,
  exclude: boolean
): FilterValue[] => {
  const existing = current.find((item) => item.value === value);
  if (existing?.exclude === exclude) {
    return current.filter((item) => item.value !== value);
  }
  const rest = current.filter((item) => item.value !== value);
  if (!existing && rest.length >= FILTER_VALUE_CAP) {
    return [...current];
  }
  return [...rest, { value, exclude }];
};

/**
 * The value of a filter that is exactly one included value, which a filter with a single value,
 * such as the Sessions list's, can take; `undefined` for none, several or an exclusion.
 */
export const singleIncludedValue = (values: readonly FilterValue[] = []): string | undefined =>
  values.length === 1 && !values[0].exclude ? values[0].value : undefined;

/** The values of `values` that are included, and those that are excluded. */
export const partitionFilterValues = (
  values: readonly FilterValue[]
): { include: string[]; exclude: string[] } => ({
  include: values.filter(({ exclude }) => !exclude).map(({ value }) => value),
  exclude: values.filter(({ exclude }) => exclude).map(({ value }) => value),
});
