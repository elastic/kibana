/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Each entry in `remoteNames` becomes a `wildcard { _index: "<alias>:*" }`
// clause in a `bool.should`. ES enforces an `indices.query.bool.max_clause_count`
// (default 1024) across the whole compiled query, so an unbounded list can both
// slow queries down and trip that ceiling. 50 covers realistic cross-cluster
// deployments with room to spare; bump if a customer ever credibly exceeds it.
export const MAX_REMOTE_NAMES = 50;

export type ParseRemoteNamesResult =
  | { ok: true; value: string[] | undefined }
  | { ok: false; reason: 'too_many'; received: number; max: number };

/**
 * Parses the comma-separated `remoteNames` query param into a whitespace-tolerant,
 * deduplicated list of cluster aliases capped at `maxCount`. Returns `undefined`
 * (under `ok: true`) when no names are provided so callers can skip CCS scoping
 * entirely.
 *
 * Trim/dedupe live here so every route gets the same normalization and the
 * downstream ES query builder receives a clean list it can map 1:1 to wildcard
 * clauses.
 */
export const parseRemoteNames = (
  raw: string | undefined,
  { maxCount = MAX_REMOTE_NAMES }: { maxCount?: number } = {}
): ParseRemoteNamesResult => {
  if (!raw) return { ok: true, value: undefined };

  const tokens = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (tokens.length === 0) return { ok: true, value: undefined };

  const deduped = Array.from(new Set(tokens));

  if (deduped.length > maxCount) {
    return { ok: false, reason: 'too_many', received: deduped.length, max: maxCount };
  }

  return { ok: true, value: deduped };
};
