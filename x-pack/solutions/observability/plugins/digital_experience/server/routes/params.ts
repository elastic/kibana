/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoDateTime, z } from '@kbn/zod/v4';
import { OVERVIEW_FILTER_MAX_LENGTHS } from '../../common/overview_filters';
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

/** The Overview's filters, each narrowing the data to one value; all values when left out. */
export const overviewFiltersShape = () => ({
  browser: z.string().min(1).max(OVERVIEW_FILTER_MAX_LENGTHS.browser).optional(),
  os: z.string().min(1).max(OVERVIEW_FILTER_MAX_LENGTHS.os).optional(),
  device: z.string().min(1).max(OVERVIEW_FILTER_MAX_LENGTHS.device).optional(),
  country: z.string().min(1).max(OVERVIEW_FILTER_MAX_LENGTHS.country).optional(),
  pageUrl: z.string().min(1).max(OVERVIEW_FILTER_MAX_LENGTHS.pageUrl).optional(),
});

/** The query of a route over a time range, an optional environment and the Overview's filters. */
export const filteredTimeRangeQuery = () =>
  z
    .object({ ...timeRangeShape(), ...overviewFiltersShape() })
    .refine(isStartBeforeEnd, START_AFTER_END_ISSUE);
