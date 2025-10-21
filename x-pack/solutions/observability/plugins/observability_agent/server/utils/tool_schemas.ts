/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export const timeRangeSchema = z.object({
  start: z
    .string()
    .describe('The start of the time range, in Elasticsearch date math, like `now`.'),
  end: z
    .string()
    .describe('The end of the time range, in Elasticsearch date math, like `now-24h`.'),
});
