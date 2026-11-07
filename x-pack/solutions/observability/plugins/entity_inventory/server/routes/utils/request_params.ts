/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { MAX_PLAN_ROWS } from '../../inventory/executor';

// An ISO 8601 instant with a numeric offset and nanosecond precision is 35 characters long.
const INSTANT_MAX_LENGTH = 64;

/** Every plan asks for one row more than the request, so a request may ask for at most `MAX_PLAN_ROWS - 1`. */
const MAX_LIST_LIMIT = MAX_PLAN_ROWS - 1;

// A date and time with `Z` or a numeric offset, so every bound names one instant.
export const instantParam = lazySchema(() =>
  z.iso.datetime({ offset: true }).max(INSTANT_MAX_LENGTH)
);

export const listLimitParam = lazySchema(() =>
  z.number().int().min(1).max(MAX_LIST_LIMIT).default(MAX_LIST_LIMIT)
);
