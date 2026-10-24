/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FILTER_VALUE_CAP = 20;
export const FILTER_EXCLUDE_PREFIX = '!';

export interface FacetFilterValue {
  value: string;
  exclude: boolean;
}

/** Parse a URL facet param. `!value` is exclude; commas are OR within the facet. */
export const parseFilterValues = (raw?: string): FacetFilterValue[] => {
  if (!raw) {
    return [];
  }
  const seen = new Set<string>();
  const values: FacetFilterValue[] = [];
  for (const part of raw.split(',')) {
    let token = part.trim();
    if (!token) {
      continue;
    }
    const exclude = token.startsWith(FILTER_EXCLUDE_PREFIX);
    if (exclude) {
      token = token.slice(FILTER_EXCLUDE_PREFIX.length).trim();
    }
    if (!token || seen.has(token)) {
      continue;
    }
    seen.add(token);
    values.push({ value: token, exclude });
    if (values.length >= FILTER_VALUE_CAP) {
      break;
    }
  }
  return values;
};

/** Split a URL facet param into values, ignoring include/exclude polarity. */
export const splitFilterValues = (raw?: string): string[] =>
  parseFilterValues(raw).map((item) => item.value);

export const partitionFilterValues = (raw?: string): { include: string[]; exclude: string[] } => {
  const include: string[] = [];
  const exclude: string[] = [];
  for (const item of parseFilterValues(raw)) {
    (item.exclude ? exclude : include).push(item.value);
  }
  return { include, exclude };
};

/** Serialize facet selections. Excluded values are prefixed with `!`. */
export const formatFilterValues = (values: readonly FacetFilterValue[]): string => {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const item of values) {
    const value = item.value.trim();
    if (!value || seen.has(value)) {
      continue;
    }
    seen.add(value);
    parts.push(item.exclude ? `${FILTER_EXCLUDE_PREFIX}${value}` : value);
    if (parts.length >= FILTER_VALUE_CAP) {
      break;
    }
  }
  return parts.join(',');
};

/** Join selected facet values for the URL as includes. Empty list clears the param. */
export const joinFilterValues = (values: readonly string[]): string =>
  formatFilterValues(values.map((value) => ({ value, exclude: false })));

/** Toggle a value as include or exclude. Repeating the same polarity removes it. */
export const setFilterValue = (
  current: readonly FacetFilterValue[],
  value: string,
  exclude: boolean
): FacetFilterValue[] => {
  const existing = current.find((item) => item.value === value);
  if (existing && existing.exclude === exclude) {
    return current.filter((item) => item.value !== value);
  }
  const rest = current.filter((item) => item.value !== value);
  if (!existing && rest.length >= FILTER_VALUE_CAP) {
    return [...current];
  }
  return [...rest, { value, exclude }];
};
