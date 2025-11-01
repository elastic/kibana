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
    .describe(
      'Start of the time range (inclusive) in ISO 8601 format, for example 2024-06-18T09:00:00.000Z'
    ),
  end: z
    .string()
    .describe(
      'End of the time range (exclusive) in ISO 8601 format, for example 2024-06-18T10:00:00.000Z'
    ),
});
