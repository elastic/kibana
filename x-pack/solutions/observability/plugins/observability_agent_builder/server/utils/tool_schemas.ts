/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const startDescription =
  'The start time of the query window using Elasticsearch date math (e.g., "now-24h", "now-15m").';
const endDescription =
  'The end time of the query window using Elasticsearch date math (e.g., "now").';

export const indexDescription =
  'Concrete index or index pattern to analyze (for example `logs-payments.api-default`).';

export const timeRangeSchemaRequired = {
  start: z.string().describe(startDescription),
  end: z.string().describe(endDescription),
};

export function timeRangeSchemaOptional(defaultTimeRange: { start: string; end: string }) {
  return {
    start: z
      .string()
      .describe(`${startDescription} Defaults to ${defaultTimeRange.start}.`)
      .default(defaultTimeRange.start),

    end: z
      .string()
      .describe(`${endDescription} Defaults to ${defaultTimeRange.end}.`)
      .default(defaultTimeRange.end),
  };
}
