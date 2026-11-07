/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseFilterValues, type FilterValue } from './filter_values';
import { SESSIONS_LIST_MAX_FACET_LENGTHS, type FacetBucket } from './sessions';

/** The filters of the Overview, in display order. */
export const OVERVIEW_FILTER_NAMES = ['browser', 'os', 'device', 'country', 'pageUrl'] as const;

export type OverviewFilterName = (typeof OVERVIEW_FILTER_NAMES)[number];

/**
 * The selected values of each filter, included or excluded; a filter without any is not applied.
 * Several included values keep the documents with any of them, and the excluded values leave out
 * those with any of them.
 */
export type OverviewFilters = Partial<Record<OverviewFilterName, FilterValue[]>>;

/** The filters as the URL and the route carry them: one param each, see `parseFilterValues`. */
export type OverviewFilterParams = Partial<Record<OverviewFilterName, string>>;

/** What narrows the Overview's data in a request: the filters' params and the KQL query. */
export type OverviewSearchParams = OverviewFilterParams & { kuery?: string };

/** The filters a param holds, each with the values `parseFilterValues` reads from it. */
export const parseOverviewFilterParams = (params: OverviewFilterParams): OverviewFilters => ({
  browser: parseFilterValues(params.browser),
  os: parseFilterValues(params.os),
  device: parseFilterValues(params.device),
  country: parseFilterValues(params.country),
  pageUrl: parseFilterValues(params.pageUrl),
});

/**
 * The longest value of each filter. The values travel in the URL and the request, and a longer
 * one is left out of the lists rather than offered and rejected.
 */
export const OVERVIEW_FILTER_MAX_LENGTHS = {
  browser: SESSIONS_LIST_MAX_FACET_LENGTHS.browser,
  os: SESSIONS_LIST_MAX_FACET_LENGTHS.os,
  device: 256,
  country: SESSIONS_LIST_MAX_FACET_LENGTHS.country,
  pageUrl: 1024,
} as const satisfies Record<OverviewFilterName, number>;

/** The longest param of a filter, which holds up to `FILTER_VALUE_CAP` values and their marks. */
export const OVERVIEW_FILTER_PARAM_MAX_LENGTH = 2048;

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

export const DEFAULT_OVERVIEW_PERCENTILE: OverviewPercentile = 75;

/** The longest KQL query the Overview takes. */
export const OVERVIEW_KUERY_MAX_LENGTH = 2048;
