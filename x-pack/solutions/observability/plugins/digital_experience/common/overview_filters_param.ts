/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';
import { encode, safeDecode } from '@kbn/rison';
import { FILTER_VALUE_CAP, partitionFilterValues } from './filter_values';
import {
  OVERVIEW_FILTER_MAX_LENGTHS,
  OVERVIEW_FILTER_NAMES,
  type OverviewFilterName,
  type OverviewFilters,
} from './overview_filters';

/*
 * The Overview's filters travel as one `filters` param: Kibana's own filters (`Filter[]` from
 * `@kbn/es-query`), as rison, like the filters of the SLO list or the service map. A filter is a
 * `phrase` (one value) or `phrases` (several) filter on one of the Overview's filters, with
 * `meta.negate` for the values to leave out:
 *
 *   !((meta:(key:browser,type:phrases,params:!(Chrome,Safari),negate:!f)),
 *     (meta:(key:browser,type:phrase,params:(query:Firefox),negate:!t)))
 *
 * The routes read `meta` only, and never a query a client wrote, so the param can name nothing but
 * a filter's values.
 */

/** The longest `filters` param: every filter of every field, with the values it can hold. */
export const OVERVIEW_FILTERS_PARAM_MAX_LENGTH = 8192;

/** A filter can be both included and excluded, each with its own filter. */
const MAX_FILTERS = OVERVIEW_FILTER_NAMES.length * 2;

const kibanaFilter = (key: OverviewFilterName, values: string[], negate: boolean): Filter[] => {
  if (values.length === 0) {
    return [];
  }
  const meta = { key, negate, disabled: false, alias: null };
  return [
    values.length === 1
      ? { meta: { ...meta, type: 'phrase', params: { query: values[0] } } }
      : { meta: { ...meta, type: 'phrases', params: values } },
  ];
};

/** The filters as Kibana filters: the included values of each filter, then the excluded ones. */
export const toKibanaFilters = (filters: OverviewFilters): Filter[] =>
  OVERVIEW_FILTER_NAMES.flatMap((name) => {
    const { include, exclude } = partitionFilterValues(filters[name] ?? []);
    return [...kibanaFilter(name, include, false), ...kibanaFilter(name, exclude, true)];
  });

/** The `filters` param of `filters`; `undefined` for none, which leaves the param out. */
export const encodeOverviewFilters = (filters: OverviewFilters): string | undefined => {
  const kibanaFilters = toKibanaFilters(filters);
  return kibanaFilters.length === 0 ? undefined : encode(kibanaFilters);
};

type Parsed = { filters: OverviewFilters } | { issue: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFilterName = (value: unknown): value is OverviewFilterName =>
  OVERVIEW_FILTER_NAMES.some((name) => name === value);

/** The values of a `phrase` or `phrases` filter's `meta.params`, or `undefined` for any other. */
const valuesOf = (type: unknown, params: unknown): unknown[] | undefined => {
  if (type === 'phrase' && isRecord(params)) {
    return [params.query];
  }
  return type === 'phrases' && Array.isArray(params) ? params : undefined;
};

/**
 * What a `filters` param selects, or what is wrong with it: not a list of `phrase` and `phrases`
 * filters on the Overview's filters, a value that is empty, too long or given twice, or more values
 * of a filter than it takes. It never repairs a param, so what a request asks for is what it gets.
 */
export const parseOverviewFiltersParam = (raw: string): Parsed => {
  if (raw.length > OVERVIEW_FILTERS_PARAM_MAX_LENGTH) {
    return { issue: 'The filters are too long' };
  }
  const decoded = safeDecode(raw);
  if (!Array.isArray(decoded) || decoded.length > MAX_FILTERS) {
    return { issue: `The filters must be a list of up to ${MAX_FILTERS} filters` };
  }

  const filters: OverviewFilters = {};
  for (const item of decoded) {
    const meta = isRecord(item) ? item.meta : undefined;
    if (!isRecord(meta) || !isFilterName(meta.key)) {
      return { issue: 'A filter must be on one of the Overview filters' };
    }
    const { key, type, params, negate = false, disabled = false } = meta;
    const values = valuesOf(type, params);
    if (!values || typeof negate !== 'boolean' || disabled !== false) {
      return { issue: `The ${key} filter must be an enabled phrase or phrases filter` };
    }
    for (const value of values) {
      if (
        typeof value !== 'string' ||
        value === '' ||
        value.length > OVERVIEW_FILTER_MAX_LENGTHS[key]
      ) {
        return {
          issue: `A value of ${key} must be 1 to ${OVERVIEW_FILTER_MAX_LENGTHS[key]} characters`,
        };
      }
      filters[key] = [...(filters[key] ?? []), { value, exclude: negate }];
    }
  }

  for (const name of OVERVIEW_FILTER_NAMES) {
    const values = filters[name] ?? [];
    if (values.length > FILTER_VALUE_CAP) {
      return { issue: `A filter takes at most ${FILTER_VALUE_CAP} values` };
    }
    if (new Set(values.map(({ value }) => value)).size < values.length) {
      return {
        issue: `A value of ${name} must not be given twice, nor both included and excluded`,
      };
    }
  }
  return { filters };
};

/** What is wrong with a `filters` param, or `undefined` when `parseOverviewFiltersParam` takes it. */
export const overviewFiltersParamIssue = (raw: string): string | undefined => {
  const parsed = parseOverviewFiltersParam(raw);
  return 'issue' in parsed ? parsed.issue : undefined;
};

/** The filters a param selects; none when it is unset or not valid. */
export const readOverviewFilters = (raw?: string): OverviewFilters => {
  const parsed = raw ? parseOverviewFiltersParam(raw) : undefined;
  return parsed && 'filters' in parsed ? parsed.filters : {};
};

/** The filters of `filters` that are not `names`, as a param. */
export const omitOverviewFilters = (
  raw: string | undefined,
  names: readonly OverviewFilterName[]
): string | undefined => {
  const filters = readOverviewFilters(raw);
  return encodeOverviewFilters(
    Object.fromEntries(
      OVERVIEW_FILTER_NAMES.filter((name) => !names.includes(name)).map((name) => [
        name,
        filters[name] ?? [],
      ])
    )
  );
};
