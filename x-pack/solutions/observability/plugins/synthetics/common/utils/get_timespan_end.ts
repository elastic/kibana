/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * `monitor.timespan` is a `date_range` field. Documents are indexed with an exclusive end
 * (`{ gte, lt }`), but synthetic `_source` (enabled by the `logsdb` index mode) rebuilds the
 * value from doc values as an inclusive range, `{ gte, lte }`, where `lte` is `lt - 1ms`.
 */
export interface TimespanBounds {
  lt?: string;
  lte?: string;
}

/**
 * Returns the exclusive end of a `monitor.timespan` as an ISO string, whichever shape it was
 * read back in: `lt` as stored, or `lte + 1ms` when synthetic `_source` returned `lte`.
 */
export const getTimespanEnd = (timespan?: TimespanBounds): string | undefined => {
  if (!timespan) {
    return undefined;
  }
  const { lt, lte } = timespan;
  if (lt) {
    return lt;
  }
  if (!lte) {
    return undefined;
  }
  const inclusiveEnd = new Date(lte).getTime();
  return Number.isNaN(inclusiveEnd) ? undefined : new Date(inclusiveEnd + 1).toISOString();
};
