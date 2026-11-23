/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A series within one strategy: two sources can report the same fingerprint, and they are two series. */
export interface SeriesId {
  fingerprint: string;
  source_id?: string;
}

/** The key a history read groups readings by. */
export function getSeriesKey({ fingerprint, source_id: sourceId }: SeriesId): string {
  return JSON.stringify([sourceId ?? null, fingerprint]);
}
