/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one or more
 * contributor license agreements. Licensed under the Elastic License 2.0.
 */

/**
 * SUT-faithful fixture builder for the M3/CleanValidity tests. This mirrors
 * completeness.ts / hunt_coordinator.ts gap semantics ONLY so fixtures carry a
 * wire-realistic `completeness`; production reads the field off the wire and
 * never re-derives it. Mirrors rev7_check.py sut_completeness, checked against
 * hunt_coordinator.test.ts:1505-1541 at the pin.
 */
import type {
  BehaviourRun,
  CoordinatorRun,
  HuntCompleteness,
  HuntIncompleteReason,
  HuntTier1Status,
} from '../types';

const RETRYABLE: ReadonlySet<string> = new Set([
  'search_partial',
  'index_unavailable',
  'generation_failed',
  'query_out_of_scope',
  'query_ungrounded',
  'quote_ungrounded',
  'execute_failed',
]);
const T2_UNAVAILABLE: ReadonlySet<string> = new Set([
  'no_inference',
  'no_report_text',
  'tier2_failed',
]);

export const mirrorCompletenessOf = (
  run: Omit<CoordinatorRun, 'completeness'>
): HuntCompleteness => {
  const gaps: HuntIncompleteReason[] = [...(run.tier1_incomplete ?? [])];
  for (const b of run.behaviours) if (b.reason) gaps.push(b.reason);
  if (run.tier2_skipped_reason && T2_UNAVAILABLE.has(run.tier2_skipped_reason)) {
    gaps.push('generation_failed');
  }
  const t2Executed = run.behaviours.some((b) => b.executed);
  if (run.tier1_status === 'no_searchable_terms' && !t2Executed) gaps.push('nothing_searched');
  if (gaps.length === 0) return 'complete';
  // N1 (hunt_coordinator.ts treatAsFinal): query_ungrounded is final only when
  // Tier 1 had nothing searchable AND nothing in Tier 2 executed.
  const final =
    run.tier1_status === 'no_searchable_terms' && !t2Executed
      ? (new Set(['query_ungrounded']) as ReadonlySet<string>)
      : new Set();
  const retryable = gaps.some((g) => RETRYABLE.has(g) && !final.has(g));
  return retryable ? 'incomplete_retryable' : 'incomplete_final';
};

/** Attaches the coordinator's completeness, as the wire response would. */
export const sut = (run: Omit<CoordinatorRun, 'completeness'>): CoordinatorRun => ({
  ...run,
  completeness: mirrorCompletenessOf(run),
});

export const behNone: BehaviourRun[] = [];
export const behExecNoHit: BehaviourRun[] = [{ executed: true, hit: false }];
export const behExecHit: BehaviourRun[] = [{ executed: true, hit: true }];

/** Every Tier 2 failure shape the reviewer listed (rev7_check T2_FAILURES). */
export const T2_FAILURES: Record<
  string,
  Pick<CoordinatorRun, 'behaviours' | 'tier2_skipped_reason'>
> = {
  tier2_failed: { behaviours: [], tier2_skipped_reason: 'tier2_failed' },
  no_inference: { behaviours: [], tier2_skipped_reason: 'no_inference' },
  no_report_text: { behaviours: [], tier2_skipped_reason: 'no_report_text' },
  generation_failed: { behaviours: [{ executed: false, hit: false, reason: 'generation_failed' }] },
  execute_failed: { behaviours: [{ executed: false, hit: false, reason: 'execute_failed' }] },
  'query_ungrounded (T1 reached -> retryable)': {
    behaviours: [{ executed: false, hit: false, reason: 'query_ungrounded' }],
  },
};

export const fixture = (
  tier1Status: HuntTier1Status,
  behaviours: BehaviourRun[],
  extra: Partial<Omit<CoordinatorRun, 'tier1_status' | 'behaviours'>> = {}
): Omit<CoordinatorRun, 'completeness'> => ({
  tier1_status: tier1Status,
  behaviours,
  ...extra,
});