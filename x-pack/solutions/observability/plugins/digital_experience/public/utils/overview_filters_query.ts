/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  OVERVIEW_FILTER_PARAM_MAX_LENGTH,
  OVERVIEW_KUERY_MAX_LENGTH,
  OVERVIEW_PERCENTILES,
} from '../../common/overview_filters';
import { filterValueRt } from './sessions_list_query';

const filterParamRt = filterValueRt(OVERVIEW_FILTER_PARAM_MAX_LENGTH);

/** The percentiles as the URL holds them, e.g. `percentile=95`. */
const percentileRt = t.keyof(
  Object.fromEntries(
    OVERVIEW_PERCENTILES.map((percentile) => [String(percentile), null])
  ) as Record<`${(typeof OVERVIEW_PERCENTILES)[number]}`, null>
);

/**
 * The Overview's own state in the URL. Each filter is one param with its values (see
 * `parseFilterValues`), a plain value being one included value. `browser`, `os` and `country` are
 * the Sessions list's params too, which take one value, so a selection of exactly one included
 * value carries over between the two tabs. The router removes an invalid value, e.g. an empty or
 * too long one (see `routes.tsx`).
 */
export const overviewQueryProps = {
  browser: filterParamRt,
  os: filterParamRt,
  device: filterParamRt,
  country: filterParamRt,
  pageUrl: filterParamRt,
  percentile: percentileRt,
  kuery: filterValueRt(OVERVIEW_KUERY_MAX_LENGTH),
};

/** The filters the Sessions list has too, and so the tabs' links keep. */
export const SHARED_FILTER_NAMES = ['browser', 'os', 'country'] as const;

export type SharedFilterName = (typeof SHARED_FILTER_NAMES)[number];

export const overviewQueryRt = t.partial(overviewQueryProps);
