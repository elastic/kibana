/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { order } from './order';

export const sortItem = lazySchema(() =>
  z.object({
    direction: order,
    field: z.string(),
    esTypes: z.array(z.string()).optional(),
    type: z.string().optional(),
  })
);

export const sort = lazySchema(() => z.array(sortItem));
