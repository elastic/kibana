/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PndDiscoveryContext } from '@kbn/pnd-common';

import { getBlastRadiusEntityId } from '../get_blast_radius_entity_id';

/** One chip in the blast radius: an entity every visible proposal's discoveries agreed on. */
export interface PndBlastRadiusEntity {
  /**
   * Every Attack Discovery that contributed this entity — what a chip click filters the queue by,
   * which is why the merge keeps them rather than only their number.
   */
  correlationIds: string[];
  /** Constituent detection alerts carrying the term, summed across those discoveries. */
  count: number;
  field: string;
  /** The `(field, value)` identity, from {@link getBlastRadiusEntityId}. */
  id: string;
  value: string;
}

/**
 * Folds `GET /internal/pnd/discovery-context` into the one chip row annotation 3 draws.
 *
 * The route answers one context **per Attack Discovery**, because that is the granularity the
 * aggregation runs at. The blast radius is a claim about the queue as a whole — everything the
 * proposals on screen reached — so the fold across discoveries happens here, and a chip's count is
 * the sum of the per-discovery counts rather than any one of them.
 *
 * Ordering is the same rule the route applies within a context: highest count first, then field, then
 * value. Re-sorting after summing is what keeps it true of the merged row; leaving the per-context
 * order in place would reshuffle the chips whenever two entities swapped rank. The result is a
 * function of the *set* of contexts, not of the order they arrived in, which the contract explicitly
 * says is not significant.
 */
export const mergeDiscoveryEntities = (contexts: PndDiscoveryContext[]): PndBlastRadiusEntity[] => {
  const merged = contexts.reduce<Map<string, PndBlastRadiusEntity>>(
    (byId, { correlationId, entities }) =>
      entities.reduce((accumulated, { count, field, value }) => {
        const id = getBlastRadiusEntityId({ field, value });
        const existing = accumulated.get(id);

        return accumulated.set(id, {
          correlationIds: [...(existing?.correlationIds ?? []), correlationId].sort(),
          count: (existing?.count ?? 0) + count,
          field,
          id,
          value,
        });
      }, byId),
    new Map()
  );

  return [...merged.values()].sort(
    (a, b) => b.count - a.count || a.field.localeCompare(b.field) || a.value.localeCompare(b.value)
  );
};
