/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoDateTime, z } from '@kbn/zod/v4';
import { MAX_ENVIRONMENT_LENGTH } from '../lib/constants';

/** The query of a route over a time range and an optional environment; `start` precedes `end`. */
export const timeRangeQuery = () =>
  z
    .object({
      start: isoDateTime(),
      end: isoDateTime(),
      // All environments when left out.
      environment: z.string().min(1).max(MAX_ENVIRONMENT_LENGTH).optional(),
    })
    .refine(({ start, end }) => Date.parse(start) < Date.parse(end), {
      message: '`start` must be before `end`',
      path: ['end'],
    });
