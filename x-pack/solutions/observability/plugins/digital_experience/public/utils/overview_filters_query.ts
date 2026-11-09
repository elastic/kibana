/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { OVERVIEW_KUERY_MAX_LENGTH, OVERVIEW_PERCENTILES } from '../../common/overview_filters';
import { overviewFiltersParamIssue } from '../../common/overview_filters_param';
import { filterValueRt } from './sessions_list_query';

/** The `filters` param, when `overview_filters_param.ts` takes it as it is. */
const filtersParamRt = new t.Type<string, string, unknown>(
  'OverviewFiltersParam',
  (input): input is string =>
    typeof input === 'string' && input !== '' && overviewFiltersParamIssue(input) === undefined,
  (input, context) =>
    typeof input === 'string' && input !== '' && overviewFiltersParamIssue(input) === undefined
      ? t.success(input)
      : t.failure(input, context),
  t.identity
);

/** The percentiles as the URL holds them, e.g. `percentile=95`. */
const percentileRt = t.keyof(
  Object.fromEntries(
    OVERVIEW_PERCENTILES.map((percentile) => [String(percentile), null])
  ) as Record<`${(typeof OVERVIEW_PERCENTILES)[number]}`, null>
);

/**
 * The Overview's own state in the URL: its filters as one `filters` param (Kibana filters as
 * rison, see `overview_filters_param.ts`), the percentile and the KQL query. The Sessions list has
 * `browser`, `os` and `country` params of its own, which take one value: the links between the
 * tabs carry a selection of exactly one included value over (see `use_application_links.ts`). The
 * router removes an invalid value, e.g. an empty or too long one (see `routes.tsx`).
 */
export const overviewQueryProps = {
  filters: filtersParamRt,
  percentile: percentileRt,
  kuery: filterValueRt(OVERVIEW_KUERY_MAX_LENGTH),
};

/** The filters the Sessions list has too, and so the tabs' links keep. */
export const SHARED_FILTER_NAMES = ['browser', 'os', 'country'] as const;

export type SharedFilterName = (typeof SHARED_FILTER_NAMES)[number];

export const overviewQueryRt = t.partial(overviewQueryProps);
