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

interface FilterTokens {
  /** Every value of the param, in order, with repeats and values past the cap. */
  values: FilterValue[];
  /** The param ends with a backslash that escapes nothing. */
  hasDanglingEscape: boolean;
  /** The param has a value of no characters, e.g. `a,,b` or a lone `!`. */
  hasEmptyValue: boolean;
}

const tokenizeFilterParam = (raw: string): FilterTokens => {
  const tokens: FilterTokens = { values: [], hasDanglingEscape: false, hasEmptyValue: false };
  let token = '';
  let exclude = false;
  let isTokenStart = true;

  const flush = () => {
    if (token === '') {
      tokens.hasEmptyValue = true;
    } else {
      tokens.values.push({ value: token, exclude });
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
    } else if (char === FILTER_ESCAPE) {
      tokens.hasDanglingEscape = true;
      token += char;
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

  return tokens;
};

/**
 * The values of a filter param: a comma-separated list, with `!` before an excluded value. A
 * comma, `!` at the start and backslash in a value are escaped with a backslash, so a page URL
 * with a comma stays one value. It reads what a link or an old bookmark holds as far as it can:
 * empty values, duplicates and values past the cap are dropped. `filterParamIssue` tells whether
 * a param needs any of that.
 */
export const parseFilterValues = (raw?: string): FilterValue[] => {
  if (!raw) {
    return [];
  }

  const seen = new Set<string>();
  return tokenizeFilterParam(raw)
    .values.filter(({ value }) => {
      const isNew = !seen.has(value);
      seen.add(value);
      return isNew;
    })
    .slice(0, FILTER_VALUE_CAP);
};

/**
 * What is wrong with a filter param that `parseFilterValues` would repair, or `undefined` when it
 * reads back as written: no dangling backslash, empty value, value past the cap, repeated value or
 * value that is both included and excluded. The routes reject such a param, so a request never
 * answers with a different filter than it asked for.
 */
export const filterParamIssue = (raw: string): string | undefined => {
  const { values, hasDanglingEscape, hasEmptyValue } = tokenizeFilterParam(raw);
  if (hasDanglingEscape) {
    return 'A backslash must escape the character after it';
  }
  if (hasEmptyValue) {
    return 'A value must not be empty';
  }
  if (values.length > FILTER_VALUE_CAP) {
    return `A filter takes at most ${FILTER_VALUE_CAP} values`;
  }
  if (new Set(values.map(({ value }) => value)).size < values.length) {
    return 'A value must not be given twice, nor both included and excluded';
  }
  return undefined;
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
