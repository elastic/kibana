/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_SHORT_STRING_LENGTH } from './schema_limits';

const startDescription =
  'The start time of the query window using Elasticsearch date math. Examples: "now-24h", "now-15m".';
const endDescription =
  'The end time of the query window using Elasticsearch date math. Example: "now".';

export const indexDescription = 'Concrete index or index pattern to analyze. Example: "logs-*".';

// Allowlist for Elasticsearch date math values.
// https://www.elastic.co/docs/reference/elasticsearch/rest-apis/common-options#date-math
//
// Bounds the charset as well as the length: these values reach server-log lines on the failure
// path, and the default layout preserves `\n` and `\r` (see
// `src/core/packages/logging/common-internal/src/layouts/conversions/message.ts`), so an
// unconstrained value can forge log entries (CWE-117: https://cwe.mitre.org/data/definitions/117.html).
const DATE_MATH_PATTERN = /^[A-Za-z0-9:.+\-/ |]+$/;
const dateMathMessage =
  'must be an Elasticsearch date math expression, for example "now-24h" or "2024-01-01T00:00:00.000Z"';

export const timeRangeSchemaRequired = {
  start: z
    .string()
    .max(MAX_SHORT_STRING_LENGTH)
    .regex(DATE_MATH_PATTERN, dateMathMessage)
    .describe(startDescription),
  end: z
    .string()
    .max(MAX_SHORT_STRING_LENGTH)
    .regex(DATE_MATH_PATTERN, dateMathMessage)
    .describe(endDescription),
};

export function timeRangeSchemaOptional(defaultTimeRange: { start: string; end: string }) {
  return {
    start: z
      .string()
      .max(MAX_SHORT_STRING_LENGTH)
      .regex(DATE_MATH_PATTERN, dateMathMessage)
      .describe(`${startDescription} Defaults to ${defaultTimeRange.start}.`)
      .default(defaultTimeRange.start),

    end: z
      .string()
      .max(MAX_SHORT_STRING_LENGTH)
      .regex(DATE_MATH_PATTERN, dateMathMessage)
      .describe(`${endDescription} Defaults to ${defaultTimeRange.end}.`)
      .default(defaultTimeRange.end),
  };
}
