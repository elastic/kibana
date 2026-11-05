/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ByEnvironmentAggregations } from '../../../lib/otel/environments';

// The aggregations `search_request.ts` asks for, by the same names.

/** The latest error of a group, as `top_hits` returns it with `fields`. */
export interface MessageAggregation {
  hits: { hits: Array<{ fields?: Record<string, unknown[]> }> };
}

/** The errors of one type and stack trace; the key is `[type, stacktrace]`. */
export interface ErrorGroupBucket {
  key: [string, string];
  doc_count: number;
  message: MessageAggregation;
  /** Epoch milliseconds of the latest error, `null` without one. */
  lastSeen: { value: number | null };
}

/** `errorsSearch`: the error groups in the selected environment, and every environment. */
export type ErrorsAggregations = ByEnvironmentAggregations<{
  exceptions: { groups: { buckets: ErrorGroupBucket[]; sum_other_doc_count?: number } };
}>;
