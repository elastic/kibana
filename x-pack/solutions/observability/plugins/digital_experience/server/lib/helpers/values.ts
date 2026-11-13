/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

/** `value` when it is a finite number, else `fallback`. */
export const numberOr = <T>(value: unknown, fallback: T): number | T =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** `value` when it is a non-empty string, else `null`. */
export const stringOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

/** The non-empty strings of a value that holds one, several, or none of them. */
export const stringsOf = (value: unknown): string[] =>
  (Array.isArray(value) ? value : [value]).filter(
    (item): item is string => typeof item === 'string' && item.length > 0
  );

/** The total of a search response, whichever shape `track_total_hits` gave it. */
export const totalHitsOf = (total: estypes.SearchTotalHits | number | undefined): number =>
  typeof total === 'number' ? total : total?.value ?? 0;
