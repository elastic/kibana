/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StatusError } from '../../lib/errors/status_error';

/**
 * Parse a required ISO-8601 datetime query/body string into a `Date`.
 * Uses Zod's native ISO check (same as other SigEvents routes) before the
 * transform so invalid shapes never reach `Date#toISOString`.
 */
export function makeIsoDateFromString(description: string) {
  return z.iso
    .datetime({ offset: true })
    .describe(description)
    .transform((input) => new Date(input));
}

/** Reject inverted ranges so occurrence readers never see `from > to`. */
export function assertValidDateRange(from: Date, to: Date): void {
  if (from.getTime() > to.getTime()) {
    throw new StatusError('`from` must be less than or equal to `to`', 400);
  }
}
