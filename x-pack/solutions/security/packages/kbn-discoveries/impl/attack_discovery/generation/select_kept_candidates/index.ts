/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CandidateAlert } from '../validate_candidate_alert_ids';

/**
 * Forwards the original candidate bytes for the candidates the gate did NOT
 * remove (Data fidelity principles 1 & 2): the gate returns only a removal set
 * of `_id`s, and the orchestration keeps every candidate whose `_id` is not in
 * that set, forwarding the literal alert strings produced by retrieval —
 * unchanged, never re-fetched, never distilled.
 *
 * Keeping is derived deterministically from the candidate universe (`keep =
 * candidates − removed`), so the gate's dominant failure modes fail safe toward
 * recall: an omitted, empty, or truncated removal set keeps every candidate, and
 * a hallucinated remove id simply matches nothing. Candidate order is preserved.
 */
export const selectKeptCandidates = ({
  candidates,
  removeAlertIds,
}: {
  candidates: CandidateAlert[];
  removeAlertIds: string[];
}): CandidateAlert[] => {
  const removeSet = new Set(removeAlertIds);

  return candidates.filter((candidate) => !removeSet.has(candidate.id));
};
