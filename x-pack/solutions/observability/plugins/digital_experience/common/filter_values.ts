/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Marks an excluded value in a filter param, e.g. `Firefox,!Chrome`. */
export const FILTER_EXCLUDE_PREFIX = '!';
const FILTER_SEPARATOR = ',';
const FILTER_ESCAPE = '\\';

/** The most values one filter takes, included and excluded together. */
export const FILTER_VALUE_CAP = 10;

export interface FilterValue {
  value: string;
  /** Leaves out the documents with this value, instead of keeping only those. */
  exclude: boolean;
}

/**
 * The values of a filter param: a comma-separated list, with `!` before an excluded value. A
 * comma, `!` at the start and backslash in a value are escaped with a backslash, so a page URL
 * with a comma stays one value. Duplicates and values past the cap are dropped.
 */
export const parseFilterValues = (raw?: string): FilterValue[] => {
  if (!raw) {
    return [];
  }

  const values: FilterValue[] = [];
  const seen = new Set<string>();
  let token = '';
  let exclude = false;
  let isTokenStart = true;

  const flush = () => {
    if (token !== '' && !seen.has(token) && values.length < FILTER_VALUE_CAP) {
      seen.add(token);
      values.push({ value: token, exclude });
    }
    token = '';
    exclude = false;
    isTokenStart = true;
  };

  for (let index = 0; index < raw.length; index++) {
    const char = raw[index];
    if (char === FILTER_ESCAPE && index + 1 < raw.length) {
      index++;
      token += raw[index];
      isTokenStart = false;
    } else if (char === FILTER_SEPARATOR) {
      flush();
    } else if (char === FILTER_EXCLUDE_PREFIX && isTokenStart) {
      exclude = true;
      isTokenStart = false;
    } else {
      token += char;
      isTokenStart = false;
    }
  }
  flush();

  return values;
};

const escapeValue = (value: string): string => {
  const escaped = value
    .replace(/\\/g, `${FILTER_ESCAPE}${FILTER_ESCAPE}`)
    .replace(/,/g, `${FILTER_ESCAPE}${FILTER_SEPARATOR}`);
  return escaped.startsWith(FILTER_EXCLUDE_PREFIX) ? `${FILTER_ESCAPE}${escaped}` : escaped;
};

/** The param of `values`, which `parseFilterValues` reads back; empty for no values. */
export const formatFilterValues = (values: readonly FilterValue[]): string =>
  values
    .filter(({ value }) => value !== '')
    .map(({ value, exclude }) => `${exclude ? FILTER_EXCLUDE_PREFIX : ''}${escapeValue(value)}`)
    .join(FILTER_SEPARATOR);

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
 * The value of a param that is exactly one included value, which a filter with a single value,
 * such as the Sessions list's, can take; `undefined` for none, several or an exclusion.
 */
export const singleIncludedValue = (raw?: string): string | undefined => {
  const values = parseFilterValues(raw);
  return values.length === 1 && !values[0].exclude ? values[0].value : undefined;
};

/** The values of `values` that are included, and those that are excluded. */
export const partitionFilterValues = (
  values: readonly FilterValue[]
): { include: string[]; exclude: string[] } => ({
  include: values.filter(({ exclude }) => !exclude).map(({ value }) => value),
  exclude: values.filter(({ exclude }) => exclude).map(({ value }) => value),
});
