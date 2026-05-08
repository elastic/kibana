/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Returns the first bool/should filter whose should clauses include an exists query
 * on a field under `host.*` (used by composite agg integration tests).
 */
export function findBoolFilterWithHostExistsInShould(filters: unknown[]): unknown {
  return filters.find((f) => {
    if (!isRecord(f) || !('bool' in f)) return false;
    const bool = f.bool;
    if (!isRecord(bool) || !Array.isArray(bool.should)) return false;
    return bool.should.some((clause) => {
      if (!isRecord(clause) || !('exists' in clause)) return false;
      const exists = clause.exists;
      return (
        isRecord(exists) && typeof exists.field === 'string' && exists.field.startsWith('host.')
      );
    });
  });
}

/** True if the filter is a term query on `event.outcome`. */
export function isEventOutcomeTermFilter(f: unknown): boolean {
  if (!isRecord(f) || !('term' in f)) return false;
  const term = f.term;
  return isRecord(term) && Object.prototype.hasOwnProperty.call(term, 'event.outcome');
}

export function getBoolMinimumShouldMatch(f: unknown): number | undefined {
  if (!isRecord(f) || !('bool' in f)) return undefined;
  const bool = f.bool;
  if (!isRecord(bool)) return undefined;
  const m = bool.minimum_should_match;
  return typeof m === 'number' ? m : undefined;
}
