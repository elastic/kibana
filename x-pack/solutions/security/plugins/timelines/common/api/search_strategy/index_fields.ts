/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

const indexFieldsRequestBase = lazySchema(() =>
  z.object({
    onlyCheckIfIndicesExist: z.boolean().optional(),
    includeUnmapped: z.boolean().optional(),
  })
);

export const indexFieldsRequestSchema = lazySchema(() =>
  z.union([
    indexFieldsRequestBase.extend({
      indices: z.array(z.string()),
    }),
    indexFieldsRequestBase.extend({ dataViewId: z.string() }),
  ])
);

export type IndexFieldsRequestInput = z.input<typeof indexFieldsRequestSchema>;

export type IndexFieldsRequest = z.infer<typeof indexFieldsRequestSchema>;
