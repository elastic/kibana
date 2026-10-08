/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventStatus } from '@kbn/significant-events-schema';

/**
 * The recovering count `N`, with the Alerting v2 director's semantics: an episode spends `N`
 * evaluations in `recovering` and resolves on the next one, so the `N+1`-th consecutive clean
 * evaluation writes `inactive`.
 */
export const RECOVERING_COUNT = 3;

/** What one evaluation concluded about a member rule, or about the series as a whole. */
export type StatusOutcome = 'breaching' | 'clean' | 'no_data';

export type LiveStatus = Extract<SignificantEventStatus, 'active' | 'recovering'>;

export interface StatusTransition {
  status: SignificantEventStatus;
  /** False when the current status stands and nothing should be written. */
  write: boolean;
}

/**
 * A series recovers only when every member is verifiably clean: any breaching member keeps it
 * breaching, and otherwise any member we could not judge keeps the status where it is. A series
 * with no judgeable members cannot be evaluated at all.
 */
export const aggregateStatusOutcomes = (outcomes: readonly StatusOutcome[]): StatusOutcome => {
  if (outcomes.includes('breaching')) {
    return 'breaching';
  }
  if (outcomes.length === 0 || outcomes.includes('no_data')) {
    return 'no_data';
  }
  return 'clean';
};

/**
 * Deterministic `active -> recovering -> inactive` transition, mirroring the Alerting v2 director's
 * basic state machine plus its count semantics (target architecture §4). A copy, not a call: see
 * `lifecycle_state_machine.ts` for why the director itself cannot be used here. `no_data` holds the
 * current status without advancing or resetting `statusCount`, like the director's `keep_last`.
 *
 * `statusCount` is the number of consecutive `recovering` versions already written for the series.
 */
export const nextStatus = ({
  current,
  outcome,
  statusCount,
  recoveringCount = RECOVERING_COUNT,
}: {
  current: LiveStatus;
  outcome: StatusOutcome;
  statusCount: number;
  recoveringCount?: number;
}): StatusTransition => {
  if (outcome === 'no_data') {
    return { status: current, write: false };
  }

  if (current === 'active') {
    return outcome === 'breaching'
      ? { status: 'active', write: false }
      : { status: 'recovering', write: true };
  }

  if (outcome === 'breaching') {
    return { status: 'active', write: true };
  }

  return statusCount >= recoveringCount
    ? { status: 'inactive', write: true }
    : { status: 'recovering', write: true };
};
