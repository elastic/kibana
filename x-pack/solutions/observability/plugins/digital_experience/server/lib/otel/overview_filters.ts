/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { partitionFilterValues } from '../../../common/filter_values';
import type { FacetBucket } from '../../../common/sessions';
import { SESSION_ATTRIBUTE_FIELDS } from '../../../common/session_attribute_fields';
import {
  isFreeTextFilter,
  OVERVIEW_FILTER_MAX_LENGTHS,
  OVERVIEW_FILTER_NAMES,
  OVERVIEW_FILTER_SIZE,
  PAGE_FILTER_NAMES,
  type ListedFilterName,
  type OverviewFilterName,
  type OverviewFilterOptions,
  type OverviewFilters,
} from '../../../common/overview_filters';
import { ENVIRONMENT_FIELDS, EVENT_NAVIGATION_TIMING } from '../../../common/otel_data';
import {
  DEVICE_DESKTOP_LABEL,
  DEVICE_MOBILE_LABEL,
  SOURCE_APP_VERSION_FIELDS,
  SOURCE_MOBILE_FIELDS,
  SOURCE_URL_FIELD,
  SOURCE_URL_TEMPLATE_FIELD,
} from '../../../common/otel_source_fields';
import { environmentFilter } from '../helpers/environment';
import { eventCount } from './queries';

/** What a field that is not a name says, per value: the device name of `browser.mobile`. */
export const FIELD_VALUE_LABELS: Record<string, Record<string, string>> = Object.fromEntries(
  SOURCE_MOBILE_FIELDS.map((field) => [
    field,
    { true: DEVICE_MOBILE_LABEL, false: DEVICE_DESKTOP_LABEL },
  ])
);

/**
 * The fields each filter reads, in priority order. The session summaries' lists come first, so a
 * browser, OS, device or country means the same in the Overview and the Sessions where they have
 * one; the device then falls back to `browser.mobile`.
 */
export const FILTER_SOURCE_FIELDS: Record<OverviewFilterName, readonly string[]> = {
  browser: SESSION_ATTRIBUTE_FIELDS.browser,
  os: SESSION_ATTRIBUTE_FIELDS.os,
  device: [...SESSION_ATTRIBUTE_FIELDS.device, ...SOURCE_MOBILE_FIELDS],
  country: SESSION_ATTRIBUTE_FIELDS.countryIso,
  appVersion: SOURCE_APP_VERSION_FIELDS,
  // The route the app reports, like `/products/{slug}`, groups the URLs of a page; without one, as
  // with an SDK that doesn't add routes, the page is its URL
  pageUrl: [SOURCE_URL_TEMPLATE_FIELD, SOURCE_URL_FIELD],
  // The text of the URL itself, which the route doesn't have
  pageContains: [SOURCE_URL_FIELD],
};

/** The runtime field that coalesces the alternatives of a filter. */
const runtimeFieldOf = (name: OverviewFilterName) => `digital_experience_filter_${name}`;

/** The field to filter and aggregate a filter on. */
export const filterFieldOf = (name: OverviewFilterName): string =>
  FILTER_SOURCE_FIELDS[name].length > 1 ? runtimeFieldOf(name) : FILTER_SOURCE_FIELDS[name][0];

/**
 * Takes the first non-empty value of the fields, like the session summaries do, so a
 * document with the same value in both scopes is counted once. Unmapped fields are skipped: the
 * OTel indices map only what their data had. A field with `params.labels` says its value in other
 * words, e.g. `true` as "Mobile"; a value without a label is skipped.
 */
const COALESCE_SCRIPT = `
  for (def field : params.fields) {
    if (doc.containsKey(field) && doc[field].size() > 0) {
      String value = doc[field].value.toString().trim();
      def labels = params.labels.get(field);
      if (labels != null) {
        value = labels.getOrDefault(value, '');
      }
      if (value != '' && value != 'null') {
        emit(value);
        break;
      }
    }
  }
`;

/** The runtime fields of the filters that read more than one field; add them to a search. */
export const filterRuntimeMappings = (): estypes.MappingRuntimeFields =>
  Object.fromEntries(
    OVERVIEW_FILTER_NAMES.filter((name) => FILTER_SOURCE_FIELDS[name].length > 1).map((name) => [
      runtimeFieldOf(name),
      {
        type: 'keyword' as const,
        script: {
          source: COALESCE_SCRIPT,
          params: { fields: [...FILTER_SOURCE_FIELDS[name]], labels: FIELD_VALUE_LABELS },
        },
      },
    ])
  );

/** `value` as a wildcard pattern's literal text: `*` and `?` match themselves. */
const escapeWildcard = (value: string): string => value.replace(/[\\*?]/g, '\\$&');

/** One query for the page URLs that contain `text`, whatever its case. */
const containsQuery = (field: string, text: string): estypes.QueryDslQueryContainer => ({
  wildcard: { [field]: { value: `*${escapeWildcard(text)}*`, case_insensitive: true } },
});

/**
 * Keeps the documents with any included value of a filter and none of its excluded values. The
 * values of a filter that matches text are patterns: the URLs that contain any included text and
 * none of the excluded.
 */
const filterClause = (
  name: OverviewFilterName,
  filters: OverviewFilters
): estypes.QueryDslQueryContainer[] => {
  const { include, exclude } = partitionFilterValues(filters[name] ?? []);
  const field = filterFieldOf(name);
  if (isFreeTextFilter(name)) {
    return [
      ...(include.length > 0
        ? [
            {
              bool: {
                should: include.map((text) => containsQuery(field, text)),
                minimum_should_match: 1,
              },
            },
          ]
        : []),
      ...(exclude.length > 0
        ? [{ bool: { must_not: exclude.map((text) => containsQuery(field, text)) } }]
        : []),
    ];
  }
  return [
    ...(include.length > 0 ? [{ terms: { [field]: include } }] : []),
    ...(exclude.length > 0 ? [{ bool: { must_not: [{ terms: { [field]: exclude } }] } }] : []),
  ];
};

/**
 * The selected filters that narrow every document of the Overview, except `exclude`'s own. The
 * page filters are left out: the web vitals, errors and clicks carry no page URL yet, so they
 * narrow the page loads only (`pageLoadFilters`).
 */
export const documentFilters = (
  filters: OverviewFilters,
  exclude?: OverviewFilterName
): estypes.QueryDslQueryContainer[] =>
  OVERVIEW_FILTER_NAMES.filter(
    (name) => !PAGE_FILTER_NAMES.some((page) => page === name) && name !== exclude
  ).flatMap((name) => filterClause(name, filters));

/** The selected page filters, which narrow the page loads (except `exclude`'s own). */
export const pageLoadFilters = (
  filters: OverviewFilters,
  exclude?: OverviewFilterName
): estypes.QueryDslQueryContainer[] =>
  PAGE_FILTER_NAMES.filter((name) => name !== exclude).flatMap((name) =>
    filterClause(name, filters)
  );

const optionsKeyOf = (name: ListedFilterName) => `${name}Options` as const;

/** The aggregation of one filter: its values with their page loads. */
export interface FilterOptionsAggregation {
  values: { buckets: Array<{ key: string | number; doc_count: number }> };
}

export type FilterOptionsAggregations = Record<
  `${ListedFilterName}Options`,
  FilterOptionsAggregation
>;

const LISTED_FILTER_NAMES = OVERVIEW_FILTER_NAMES.filter(
  (name): name is ListedFilterName => !isFreeTextFilter(name)
);

/**
 * Each listed filter's most used values among the page loads of `environment`, narrowed by the
 * other selected filters. A filter that matches text has no list.
 */
export const filterOptionsAggs = (
  filters: OverviewFilters,
  environment: string | undefined
): Record<string, estypes.AggregationsAggregationContainer> =>
  Object.fromEntries(
    LISTED_FILTER_NAMES.map((name) => [
      optionsKeyOf(name),
      {
        filter: {
          bool: {
            filter: [
              environmentFilter(ENVIRONMENT_FIELDS, environment),
              eventCount(EVENT_NAVIGATION_TIMING).filter,
              ...documentFilters(filters, name),
              ...pageLoadFilters(filters, name),
            ],
          },
        },
        aggs: { values: { terms: { field: filterFieldOf(name), size: OVERVIEW_FILTER_SIZE } } },
      },
    ])
  );

const toBuckets = (name: ListedFilterName, aggregation?: FilterOptionsAggregation) =>
  (aggregation?.values.buckets ?? []).flatMap(({ key, doc_count: count }): FacetBucket[] => {
    const value = String(key);
    // Longer values could not be selected: the routes and the URL accept no more.
    return value.length <= OVERVIEW_FILTER_MAX_LENGTHS[name] ? [{ key: value, count }] : [];
  });

/** The values of every filter; empty ones for the empty data of indices that do not exist. */
export const toFilterOptions = (
  aggregations?: Partial<FilterOptionsAggregations>
): OverviewFilterOptions => ({
  browser: toBuckets('browser', aggregations?.browserOptions),
  os: toBuckets('os', aggregations?.osOptions),
  device: toBuckets('device', aggregations?.deviceOptions),
  country: toBuckets('country', aggregations?.countryOptions),
  appVersion: toBuckets('appVersion', aggregations?.appVersionOptions),
  pageUrl: toBuckets('pageUrl', aggregations?.pageUrlOptions),
  // Text the URL contains is written, not picked from a list.
  pageContains: [],
});
