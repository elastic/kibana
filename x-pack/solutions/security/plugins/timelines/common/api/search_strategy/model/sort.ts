/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { order } from './order';

export const sortItem = z.object({
  direction: order,
  field: z.string(),
  esTypes: z.array(z.string()).optional(),
  type: z.string().optional(),
});

export const sort = z.array(sortItem);
