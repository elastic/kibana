/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

export const LIST_PAGE_MIN = 1;
export const LIST_PAGE_MAX = 200;
export const LIST_PER_PAGE_MIN = 1;
export const LIST_PER_PAGE_MAX = 50;
export const LIST_PER_PAGE_DEFAULT = 20;

export const listPoliciesInputSchema = lazySchema(() =>
  z.object({
    page: z
      .number()
      .int()
      .min(LIST_PAGE_MIN)
      .max(LIST_PAGE_MAX)
      .default(LIST_PAGE_MIN)
      .describe(
        '1-based page of endpoint package policies in the current space (1–200, default 1).'
      ),
    perPage: z
      .number()
      .int()
      .min(LIST_PER_PAGE_MIN)
      .max(LIST_PER_PAGE_MAX)
      .default(LIST_PER_PAGE_DEFAULT)
      .describe('Page size (1–50, default 20).'),
    includeEndpointUsage: z
      .boolean()
      .default(false)
      .describe('When true, include per-policy enrolled-agent-backed usage classification.'),
  })
);
