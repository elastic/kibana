/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

const countSchema = lazySchema(() => z.number().int().nonnegative());

export const truncatedFlagSchema = lazySchema(() => z.literal(true));

export const truncationSchema = lazySchema(() =>
  z.object({
    total: countSchema,
    returned: countSchema,
    truncated: z.boolean(),
  })
);
export type Truncation = z.infer<typeof truncationSchema>;
