/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Groups an array of records by entityId, building an accumulator T for each
 * unique id. `seed` creates the initial value for the first record seen;
 * `merge` folds each subsequent record into the existing accumulator.
 */
export function groupByEntityId<R extends { entityId: string }, T>(
  records: R[],
  seed: (r: R) => T,
  merge: (acc: T, r: R) => T
): Map<string, T> {
  return records.reduce((map, r) => {
    const existing = map.get(r.entityId);
    map.set(r.entityId, existing !== undefined ? merge(existing, r) : seed(r));
    return map;
  }, new Map<string, T>());
}
