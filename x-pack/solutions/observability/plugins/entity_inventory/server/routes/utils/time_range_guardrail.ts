/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InventoryRequestError } from '../../inventory/errors';
import type { TimeWindow } from '../../inventory/generator';

// Interim cap on the query window until the queries are measured on large clusters. To lift it,
// remove this file and unwrap the handlers that use it.
const MAX_TIME_RANGE_HOURS = 72;
export const MAX_TIME_RANGE_MS = MAX_TIME_RANGE_HOURS * 60 * 60 * 1000;

/**
 * Wraps a route handler so it throws `InventoryRequestError` (400 through the route factory)
 * before running when `body.to - body.from` exceeds `MAX_TIME_RANGE_MS`; exactly 72 hours is allowed.
 */
export const withTimeRangeGuardrail =
  <TOptions extends { params: { body: TimeWindow } }, TResult>(
    handler: (options: TOptions) => Promise<TResult>
  ) =>
  async (options: TOptions): Promise<TResult> => {
    const { from, to } = options.params.body;
    if (Date.parse(to) - Date.parse(from) > MAX_TIME_RANGE_MS) {
      throw new InventoryRequestError(
        `the time range from ${from} to ${to} is longer than the maximum of ${MAX_TIME_RANGE_HOURS} hours`
      );
    }
    return handler(options);
  };
