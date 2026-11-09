/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { OVERVIEW_FILTER_MAX_LENGTHS } from '../../common/overview_filters';
import { filterValueRt } from './sessions_list_query';

/**
 * The Overview's filters in the URL. `browser`, `os` and `country` are the Sessions list's own
 * params too, so a selection carries over between the two tabs. The router removes an invalid
 * value, e.g. an empty or too long one (see `routes.tsx`).
 */
export const overviewFiltersQueryProps = {
  browser: filterValueRt(OVERVIEW_FILTER_MAX_LENGTHS.browser),
  os: filterValueRt(OVERVIEW_FILTER_MAX_LENGTHS.os),
  device: filterValueRt(OVERVIEW_FILTER_MAX_LENGTHS.device),
  country: filterValueRt(OVERVIEW_FILTER_MAX_LENGTHS.country),
  pageUrl: filterValueRt(OVERVIEW_FILTER_MAX_LENGTHS.pageUrl),
};

/** The filters the Sessions list has too, and so the tabs' links keep. */
export const SHARED_FILTER_NAMES = ['browser', 'os', 'country'] as const;

export type SharedFilterName = (typeof SHARED_FILTER_NAMES)[number];

export const overviewFiltersQueryRt = t.partial(overviewFiltersQueryProps);
