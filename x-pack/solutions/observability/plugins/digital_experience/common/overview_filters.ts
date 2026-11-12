/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterValue } from './filter_values';
import { SESSIONS_LIST_MAX_FACET_LENGTHS, type FacetBucket } from './sessions';

/** The filters of the Overview, in display order. */
export const OVERVIEW_FILTER_NAMES = [
  'browser',
  'os',
  'device',
  'country',
  'appVersion',
  'pageUrl',
  'pageContains',
] as const;

export type OverviewFilterName = (typeof OVERVIEW_FILTER_NAMES)[number];

/**
 * The filters on the page, which narrow the page loads only: the web vitals, errors and clicks
 * carry no page URL yet. `pageContains` matches part of the URL, the others a whole URL.
 */
export const PAGE_FILTER_NAMES = [
  'pageUrl',
  'pageContains',
] as const satisfies readonly OverviewFilterName[];

/**
 * The filters whose values the user writes, as there is no list to pick them from: text that the
 * page URL contains.
 */
export const FREE_TEXT_FILTER_NAMES = [
  'pageContains',
] as const satisfies readonly OverviewFilterName[];

export type FreeTextFilterName = (typeof FREE_TEXT_FILTER_NAMES)[number];

/** The filters with a list of values to pick from, each with the page loads that have it. */
export type ListedFilterName = Exclude<OverviewFilterName, FreeTextFilterName>;

export const isFreeTextFilter = (name: OverviewFilterName): name is FreeTextFilterName =>
  FREE_TEXT_FILTER_NAMES.some((freeText) => freeText === name);

/**
 * The selected values of each filter, included or excluded; a filter without any is not applied.
 * Several included values keep the documents with any of them, and the excluded values leave out
 * those with any of them.
 */
export type OverviewFilters = Partial<Record<OverviewFilterName, FilterValue[]>>;

/**
 * What narrows the Overview's data in a request: the filters as one `filters` param (see
 * `overview_filters_param.ts`) and the KQL query.
 */
export interface OverviewSearchParams {
  filters?: string;
  kuery?: string;
}

/**
 * The longest value of each filter. The values travel in the URL and the request, and a longer
 * one is left out of the lists rather than offered and rejected.
 */
export const OVERVIEW_FILTER_MAX_LENGTHS = {
  browser: SESSIONS_LIST_MAX_FACET_LENGTHS.browser,
  os: SESSIONS_LIST_MAX_FACET_LENGTHS.os,
  device: 256,
  country: SESSIONS_LIST_MAX_FACET_LENGTHS.country,
  appVersion: 256,
  pageUrl: 1024,
  pageContains: 256,
} as const satisfies Record<OverviewFilterName, number>;

/** How many values each filter lists, the most used first; the same as the Sessions facets. */
export const OVERVIEW_FILTER_SIZE = 10;

/**
 * The values of each filter with their page loads in the time range and environment, narrowed by
 * the other selected filters but not by the filter's own, so its other values stay selectable.
 */
export type OverviewFilterOptions = Record<OverviewFilterName, FacetBucket[]>;

/** The percentiles of the load time the Overview can show. */
export const OVERVIEW_PERCENTILES = [50, 75, 90, 95, 99] as const;

export type OverviewPercentile = (typeof OVERVIEW_PERCENTILES)[number];

/** A percentile as the routes take it in a query, e.g. `'95'`. */
export type OverviewPercentileParam = `${OverviewPercentile}`;

/** Every percentile as a query param, for a schema of the params. */
export const OVERVIEW_PERCENTILE_PARAMS = OVERVIEW_PERCENTILES.map(
  (percentile): OverviewPercentileParam => `${percentile}`
);

export const DEFAULT_OVERVIEW_PERCENTILE: OverviewPercentile = 75;

/** The longest KQL query the Overview takes. */
export const OVERVIEW_KUERY_MAX_LENGTH = 2048;
