/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CandidateAlert } from '../validate_candidate_alert_ids';

/**
 * Forwards the original candidate bytes for the gate's keep-set (Data fidelity
 * principles 1 & 2): the gate returns only a keep-set of `_id`s, and the
 * orchestration forwards the literal alert strings produced by retrieval for
 * exactly those ids — unchanged, never re-fetched, never distilled.
 *
 * The keep-set is intersected with the actual candidate `_id`s so a gate that
 * hallucinates an unknown id cannot inject an alert that was never retrieved;
 * candidate order is preserved.
 */
export const selectKeptCandidates = ({
  candidates,
  keepAlertIds,
}: {
  candidates: CandidateAlert[];
  keepAlertIds: string[];
}): CandidateAlert[] => {
  const keepSet = new Set(keepAlertIds);

  return candidates.filter((candidate) => keepSet.has(candidate.id));
};
