/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CandidateAlert } from '../validate_candidate_alert_ids';

/**
 * Deduplicates candidate alerts by backing `_id` using a richest-wins policy
 * (Data fidelity principle 4): when the same `_id` arrives from multiple
 * retrieval sources with different field sets, the version with the most
 * content (longest alert string) is kept so fields are never silently lost by
 * choosing a thinner copy.
 *
 * The tiebreak is deterministic: when two candidates with the same `_id` have
 * equal length, the first-seen one wins (retrieval source order is preserved).
 * The output preserves first-seen `_id` order.
 */
export const dedupeCandidatesById = (candidates: CandidateAlert[]): CandidateAlert[] => {
  const richestById = candidates.reduce<Map<string, CandidateAlert>>((acc, candidate) => {
    const existing = acc.get(candidate.id);

    // Strictly-greater keeps the first-seen candidate on a length tie
    // (deterministic tiebreak).
    if (existing == null || candidate.alert.length > existing.alert.length) {
      return new Map(acc).set(candidate.id, candidate);
    }

    return acc;
  }, new Map<string, CandidateAlert>());

  // Preserve first-seen `_id` order rather than Map insertion order (which a
  // richer-later replacement would otherwise reorder).
  const seen = new Set<string>();

  return candidates.flatMap((candidate) => {
    if (seen.has(candidate.id)) {
      return [];
    }
    seen.add(candidate.id);

    const richest = richestById.get(candidate.id);

    return richest != null ? [richest] : [];
  });
};
