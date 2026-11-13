/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, isoDateTime } from '@kbn/zod/v4';

export const DEFAULT_LOOKBACK_HOURS = 72;
export const MAX_LOOKBACK_HOURS = 720;
export const MAX_MARGIN_HOURS = 72;

const HOUR_MS = 60 * 60 * 1000;

/**
 * The time scoping both forensic tools accept: either an absolute incident window (`start`/`end`,
 * widened by `margin_hours`) or a lookback counted from now. Absolute bounds win when present.
 * A factory so each tool schema builds it inside its own `lazySchema`.
 */
export const searchWindowShape = () => ({
  time_window_hours: z
    .number()
    .int()
    .min(1)
    .max(MAX_LOOKBACK_HOURS)
    .optional()
    .default(DEFAULT_LOOKBACK_HOURS)
    .describe(
      'Lookback window in hours counted back from now. Ignored when `start` and `end` are given.'
    ),
  start: isoDateTime({ offset: true })
    .optional()
    .describe('Absolute start of the incident window (ISO-8601). Requires `end`.'),
  end: isoDateTime({ offset: true })
    .optional()
    .describe('Absolute end of the incident window (ISO-8601). Requires `start`.'),
  margin_hours: z
    .number()
    .int()
    .min(0)
    .max(MAX_MARGIN_HOURS)
    .optional()
    .default(0)
    .describe('Hours to widen the incident window on each side. Only used with `start`/`end`.'),
});

export type SearchWindowInput = z.infer<z.ZodObject<ReturnType<typeof searchWindowShape>>>;

/**
 * Adds the `start`/`end` pairing and ordering checks to a tool schema that includes `searchWindowShape`.
 * Equal bounds are valid: a single cited alert, or a discovery with no alert times, is one instant that
 * `margin_hours` then widens.
 */
export const withSearchWindowChecks = <T extends z.ZodType<{ start?: string; end?: string }>>(
  schema: T
): T =>
  schema
    .refine(({ start, end }) => (start === undefined) === (end === undefined), {
      message: '`start` and `end` must be given together',
    })
    .refine(
      ({ start, end }) =>
        start === undefined || end === undefined || Date.parse(start) <= Date.parse(end),
      { message: '`start` must not be after `end`' }
    ) as T;

export interface ResolvedSearchWindow {
  /** Inclusive ISO-8601 start of the range the telemetry is searched over. */
  start: string;
  /** Inclusive ISO-8601 end of the range the telemetry is searched over. */
  end: string;
  /** `incident` when anchored on absolute bounds, `lookback` when counted back from now. */
  anchor: 'incident' | 'lookback';
}

/** Resolves the tool's time inputs to one absolute range so every query and result cites the same bounds. */
export const resolveSearchWindow = (
  { time_window_hours: timeWindowHours, start, end, margin_hours: marginHours }: SearchWindowInput,
  now: Date = new Date()
): ResolvedSearchWindow => {
  if (start !== undefined && end !== undefined) {
    const marginMs = marginHours * HOUR_MS;
    return {
      start: new Date(Date.parse(start) - marginMs).toISOString(),
      end: new Date(Date.parse(end) + marginMs).toISOString(),
      anchor: 'incident',
    };
  }
  return {
    start: new Date(now.getTime() - timeWindowHours * HOUR_MS).toISOString(),
    end: now.toISOString(),
    anchor: 'lookback',
  };
};

/** The ES|QL `WHERE` fragment for a resolved window, inclusive on both ends. */
export const toEsqlTimestampClause = ({ start, end }: ResolvedSearchWindow): string =>
  `@timestamp >= TO_DATETIME("${start}") AND @timestamp <= TO_DATETIME("${end}")`;
