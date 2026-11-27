/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { MAX_LIST_LIMIT } from '../../../common';

// An ISO 8601 instant with a numeric offset and nanosecond precision is 35 characters long.
const INSTANT_MAX_LENGTH = 64;

// A date and time with `Z` or a numeric offset, so every bound names one instant.
export const instantParam = lazySchema(() =>
  z.iso.datetime({ offset: true }).max(INSTANT_MAX_LENGTH)
);

export const listLimitParam = lazySchema(() =>
  z.number().int().min(1).max(MAX_LIST_LIMIT).default(MAX_LIST_LIMIT)
);

export const isFromEarlierThanTo = ({ from, to }: { from: string; to: string }): boolean =>
  Date.parse(from) < Date.parse(to);

export const dateRangeRefinement = {
  message: 'from must be earlier than to',
  path: ['to'],
};

// The body of `_plan`: the window and row limit shared by every list-shaped request.
export const planRequestBodySchema = lazySchema(() =>
  z
    .object({
      from: instantParam,
      to: instantParam,
      limit: listLimitParam,
    })
    .strict()
    .refine(isFromEarlierThanTo, dateRangeRefinement)
);

// The body of `_list`: the `_plan` body plus the opt-in alert counts.
export const listRequestBodySchema = lazySchema(() =>
  z
    .object({
      from: instantParam,
      to: instantParam,
      limit: listLimitParam,
      // Also count the active alerts of each entity.
      includeAlertCounts: z.boolean().default(false),
    })
    .strict()
    .refine(isFromEarlierThanTo, dateRangeRefinement)
);
