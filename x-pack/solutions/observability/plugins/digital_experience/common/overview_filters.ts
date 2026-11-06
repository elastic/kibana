/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FacetBucket } from './sessions';

/** The filters of the Overview, in display order. */
export const OVERVIEW_FILTER_NAMES = ['browser', 'os', 'device', 'country', 'pageUrl'] as const;

export type OverviewFilterName = (typeof OVERVIEW_FILTER_NAMES)[number];

/** The selected value of each filter; a filter without one is not applied. */
export type OverviewFilters = Partial<Record<OverviewFilterName, string>>;

/**
 * The longest value of each filter. The values travel in the URL and the request, and a longer
 * one is left out of the lists rather than offered and rejected.
 */
export const OVERVIEW_FILTER_MAX_LENGTHS = {
  browser: 256,
  os: 256,
  device: 256,
  country: 16,
  pageUrl: 1024,
} as const satisfies Record<OverviewFilterName, number>;

/** How many values each filter lists, the most used first; the same as the Sessions facets. */
export const OVERVIEW_FILTER_SIZE = 10;

/**
 * The values of each filter with their page loads in the time range and environment, narrowed by
 * the other selected filters but not by the filter's own, so its other values stay selectable.
 */
export type OverviewFilterOptions = Record<OverviewFilterName, FacetBucket[]>;
