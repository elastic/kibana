/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const startDescription = 'The start of the time range, in Elasticsearch date math, like `now-24h`.';
const endDescription = 'The end of the time range, in Elasticsearch date math, like `now-`.';

export const timeRangeSchemaRequired = {
  start: z.string().describe(startDescription),
  end: z.string().describe(endDescription),
};

export function timeRangeSchemaOptional(defaultTimeRange: { start: string; end: string }) {
  return {
    start: z
      .string()
      .describe(`${startDescription} Defaults to ${defaultTimeRange.start}.`)
      .optional(),

    end: z.string().describe(`${endDescription} Defaults to ${defaultTimeRange.end}.`).optional(),
  };
}
