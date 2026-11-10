/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoDateTime, z } from '@kbn/zod/v4';
import {
  OVERVIEW_KUERY_MAX_LENGTH,
  PAGE_FILTER_NAMES,
  type OverviewFilterName,
} from '../../common/overview_filters';
import {
  OVERVIEW_FILTERS_PARAM_MAX_LENGTH,
  overviewFiltersParamIssue,
  readOverviewFilters,
} from '../../common/overview_filters_param';
import { MAX_ENVIRONMENT_LENGTH } from '../lib/constants';

/** The params of a route over a time range and an optional environment. */
export const timeRangeShape = () => ({
  start: isoDateTime(),
  end: isoDateTime(),
  // All environments when left out.
  environment: z.string().min(1).max(MAX_ENVIRONMENT_LENGTH).optional(),
});

/** Whether the `start` of a query of `timeRangeShape` (and more) precedes its `end`. */
export const isStartBeforeEnd = ({ start, end }: { start: string; end: string }) =>
  Date.parse(start) < Date.parse(end);

/** Reported on `end` when `isStartBeforeEnd` fails. */
export const START_AFTER_END_ISSUE = {
  message: '`start` must be before `end`',
  path: ['end'],
};

/** The query of a route over a time range and an optional environment; `start` precedes `end`. */
export const timeRangeQuery = () =>
  z.object(timeRangeShape()).refine(isStartBeforeEnd, START_AFTER_END_ISSUE);

/**
 * The `filters` param: Kibana filters as rison (see `overview_filters_param.ts`). A param that
 * would need repairing, e.g. one with too many values, is rejected instead of answered with other
 * filters than it asked for; so is one with a filter in `unsupported`, which the route would
 * silently ignore.
 */
const filtersParam = (unsupported: readonly OverviewFilterName[] = []) =>
  z
    .string()
    .min(1)
    .max(OVERVIEW_FILTERS_PARAM_MAX_LENGTH)
    .refine((raw) => overviewFiltersParamIssue(raw) === undefined, {
      error: ({ input }) => overviewFiltersParamIssue(String(input)),
    })
    .refine(
      (raw) => unsupported.every((name) => (readOverviewFilters(raw)[name] ?? []).length === 0),
      { message: `This route takes no filter on ${unsupported.join(', ')}` }
    )
    .optional();

/**
 * The Overview's filters, each narrowing the data to its values, and its KQL query (over the stored
 * fields of the OTel indices); all the data when left out.
 */
export const overviewFiltersShape = (unsupported: readonly OverviewFilterName[] = []) => ({
  filters: filtersParam(unsupported),
  kuery: z.string().min(1).max(OVERVIEW_KUERY_MAX_LENGTH).optional(),
});

/** The params of a route over a time range, an optional environment and the Overview's filters. */
export const filteredTimeRangeShape = (unsupported: readonly OverviewFilterName[] = []) => ({
  ...timeRangeShape(),
  ...overviewFiltersShape(unsupported),
});

/** The query of a route over a time range, an optional environment and the Overview's filters. */
export const filteredTimeRangeQuery = () =>
  z.object(filteredTimeRangeShape()).refine(isStartBeforeEnd, START_AFTER_END_ISSUE);

/**
 * The query of a route whose documents carry no page URL (e.g. the errors): the filters of
 * `filteredTimeRangeQuery` but the page, which is rejected, not applied.
 */
export const documentFilteredTimeRangeQuery = () =>
  z
    .object(filteredTimeRangeShape(PAGE_FILTER_NAMES))
    .refine(isStartBeforeEnd, START_AFTER_END_ISSUE);
