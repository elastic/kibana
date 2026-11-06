/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { isoDateTime, z } from '@kbn/zod/v4';
import { filterParamIssue, parseFilterValues } from '../../common/filter_values';
import {
  OVERVIEW_FILTER_MAX_LENGTHS,
  OVERVIEW_FILTER_PARAM_MAX_LENGTH,
  OVERVIEW_KUERY_MAX_LENGTH,
  type OverviewFilterName,
} from '../../common/overview_filters';
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
 * A filter's param: its values, which `parseFilterValues` reads (a comma-separated list, with `!`
 * before an excluded value), each as short as the filter's lists keep them. A param that the
 * parser would repair, e.g. one with too many values, is rejected instead of answered with other
 * filters than it asked for.
 */
const filterParam = (name: OverviewFilterName) =>
  z
    .string()
    .min(1)
    .max(OVERVIEW_FILTER_PARAM_MAX_LENGTH)
    .refine((raw) => filterParamIssue(raw) === undefined, {
      error: ({ input }) => `${name}: ${filterParamIssue(String(input))}`,
    })
    .refine(
      (raw) =>
        parseFilterValues(raw).every(
          ({ value }) => value.length <= OVERVIEW_FILTER_MAX_LENGTHS[name]
        ),
      { message: `A value of ${name} is too long` }
    )
    .optional();

/**
 * The Overview's filters, each narrowing the data to its values, and its KQL query (over the stored
 * fields of the OTel indices); all the data when left out.
 */
export const overviewFiltersShape = () => ({
  browser: filterParam('browser'),
  os: filterParam('os'),
  device: filterParam('device'),
  country: filterParam('country'),
  pageUrl: filterParam('pageUrl'),
  kuery: z.string().min(1).max(OVERVIEW_KUERY_MAX_LENGTH).optional(),
});

/** The params of a route over a time range, an optional environment and the Overview's filters. */
export const filteredTimeRangeShape = () => ({ ...timeRangeShape(), ...overviewFiltersShape() });

/** The query of a route over a time range, an optional environment and the Overview's filters. */
export const filteredTimeRangeQuery = () =>
  z.object(filteredTimeRangeShape()).refine(isStartBeforeEnd, START_AFTER_END_ISSUE);

/**
 * The query of a route whose documents carry no page URL (e.g. the errors): the filters of
 * `filteredTimeRangeQuery` but the page, which is left out, not applied.
 */
export const documentFilteredTimeRangeQuery = () =>
  z
    .object({ ...timeRangeShape(), ...omit(overviewFiltersShape(), 'pageUrl') })
    .refine(isStartBeforeEnd, START_AFTER_END_ISSUE);
