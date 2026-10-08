/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';

const MAX_TIMESTAMP_LENGTH = 64;
const MAX_CONNECTOR_ID_LENGTH = 256;
const MAX_JOB_ID_LENGTH = 64;

export const generateBriefRequestBodySchema = lazySchema(() =>
  z.object({
    timeRange: z.object({
      from: z.string().min(1).max(MAX_TIMESTAMP_LENGTH),
      to: z.string().min(1).max(MAX_TIMESTAMP_LENGTH),
      range: z.enum(['24h', '7d', '30d']),
    }),
    generator: z.enum(['template', 'inference']),
    mode: z.enum(['names', 'ids_only']),
    connectorId: z.string().min(1).max(MAX_CONNECTOR_ID_LENGTH).optional(),
  })
);

export const briefJobParamsSchema = lazySchema(() =>
  z.object({ id: z.string().min(1).max(MAX_JOB_ID_LENGTH) })
);

export type TimeRangeCheck = { ok: true } | { ok: false; message: string };

/** Semantic check the schema cannot express: both ends are valid dates and `from` is before `to`. */
export const checkTimeRange = (timeRange: { from: string; to: string }): TimeRangeCheck => {
  const from = Date.parse(timeRange.from);
  const to = Date.parse(timeRange.to);
  if (Number.isNaN(from) || Number.isNaN(to)) {
    return { ok: false, message: 'timeRange.from and timeRange.to must be ISO timestamps' };
  }
  if (from >= to) {
    return { ok: false, message: 'timeRange.from must be before timeRange.to' };
  }
  return { ok: true };
};
