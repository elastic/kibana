/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

const countSchema = lazySchema(() => z.number().int().nonnegative());

export const populationSchema = lazySchema(() =>
  z.object({
    fetched: countSchema,
    total: countSchema,
    truncated: z.boolean(),
    fetch_unstable: z.boolean(),
    unauthorized: z.boolean(),
  })
);
export type Population = z.infer<typeof populationSchema>;
