/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HuntCoordinatorResult } from '@kbn/alertzero-common';
import type { CoordinatorRun, Tier1HitRef } from '../types';

/**
 * The single place the suite touches the coordinator wire shape
 * (`HuntCoordinatorResult`, hunt_coordinator_route.gen.ts — the completed body
 * the hunt child reads back from the hidden result attachment). Everything
 * downstream (M1/M2/M3) reads `CoordinatorRun`, so a schema drift fails
 * type_check here and in the adapter test, not silently in the scores.
 *
 * Where each field lives on the wire:
 * - Tier 1: `tier1.status`, `tier1.incomplete[].reason`, `tier1.hits[]`
 *   (`id`, `index`, `matched.ioc.value`). Hits use `id`/`index`, not `_id`.
 * - Tier 2: `tier2.behaviors[]` (American spelling) with `technique_id`,
 *   `execution.{executed,hit,inconclusive_reason}` and `hits[]`.
 * - Top level: `completeness`, `tier2_skipped_reason`, `tier2_target_sources`.
 */
export const wireToCoordinatorRun = (wire: HuntCoordinatorResult): CoordinatorRun => {
  const tier1Hits: Tier1HitRef[] = wire.tier1.hits.map((h) => ({ _id: h.id, _index: h.index }));

  const byIoc = new Map<string, Tier1HitRef[]>();
  for (const h of wire.tier1.hits) {
    const value = h.matched?.ioc?.value;
    if (value !== undefined) {
      const list = byIoc.get(value) ?? [];
      list.push({ _id: h.id, _index: h.index });
      byIoc.set(value, list);
    }
  }

  const behaviors = wire.tier2?.behaviors ?? [];

  return {
    tier1_status: wire.tier1.status,
    tier1_incomplete: (wire.tier1.incomplete ?? []).map((g) => g.reason),
    tier1_hits: tier1Hits,
    tier1_matched_iocs: [...byIoc.entries()].map(([value, hits]) => ({ value, hits })),
    tier2_skipped_reason: wire.tier2_skipped_reason,
    behaviours: behaviors.map((b) => ({
      executed: b.execution?.executed ?? false,
      hit: b.execution?.hit ?? false,
      reason: b.execution?.inconclusive_reason,
      technique_id: b.technique_id,
      hits: (b.hits ?? []).map((h) => ({ _id: h.id, _index: h.index })),
    })),
    completeness: wire.completeness,
    tier2_target_sources: wire.tier2_target_sources,
  };
};

/**
 * Narrow check that a value looks like a completed coordinator result before
 * it is adapted. A failed attachment read (carries `data.error`, no
 * `data.result`) or an async run that never finished leaves no result to
 * read at all; either way there is no `tier1` here and that report is an
 * INVALID cell.
 */
export const isCoordinatorResult = (value: unknown): value is HuntCoordinatorResult => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const tier1 = v.tier1 as Record<string, unknown> | undefined;
  return (
    typeof tier1 === 'object' &&
    tier1 !== null &&
    typeof tier1.status === 'string' &&
    Array.isArray(tier1.hits) &&
    typeof v.completeness === 'string'
  );
};
