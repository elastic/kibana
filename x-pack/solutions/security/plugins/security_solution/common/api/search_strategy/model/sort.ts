/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { Direction, order } from './order';

export const sort = z
  .object({
    direction: order.default(Direction.desc),
    field: z.string().default('@timestamp'),
  })
  .default({ direction: Direction.desc, field: '@timestamp' });
