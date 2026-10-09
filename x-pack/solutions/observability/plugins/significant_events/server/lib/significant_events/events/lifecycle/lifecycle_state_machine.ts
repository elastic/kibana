/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SignificantEventManualStatus,
  SignificantEventStatus,
} from '@kbn/significant-events-schema';
import type { StatusOutcome } from './status_outcome';

/**
 * The one place that decides a significant event's status. Every caller submits a typed input;
 * none of them picks a status. Pure: no I/O, no caller identity. Who may submit which input is the
 * write authority's concern, not this function's.
 *
 * A new way to change a status is a new input kind and one case in `decideLifecycle`.
 */
export type LifecycleInput =
  /**
   * What discovery's stored verdicts say about the event's members after a write is merged:
   * `breaching` when any member asserts a breach, `clean` when every member is healthy, `no_data`
   * when none asserts a breach but some cannot be judged.
   */
  | { kind: 'assessment'; outcome: StatusOutcome }
  /** An operator's intent, through the update route or a chat tool. */
  | { kind: 'operator'; intent: 'activate' | 'deactivate' }
  /** The rule backing the event no longer exists. */
  | { kind: 'rule_deleted' };

/** The operator input for a status a person or tool chose: `active` activates, `inactive` deactivates. */
export const operatorInputFor = (status: SignificantEventManualStatus): LifecycleInput => ({
  kind: 'operator',
  intent: status === 'active' ? 'activate' : 'deactivate',
});

export interface LifecycleState {
  /** Undefined when the event has no version yet. */
  status: SignificantEventStatus | undefined;
}

export type LifecycleSkipReason =
  /** The series is already in the state the input asks for. */
  | 'already_in_state'
  /** Only a breach opens an event: a healthy or unjudged assessment of a closed or new series. */
  | 'not_a_breach';

export type LifecycleDecision =
  /** Append a version carrying `status`. */
  { write: true; status: SignificantEventStatus } | { write: false; reason: LifecycleSkipReason };

const isLive = (status: SignificantEventStatus | undefined): boolean =>
  status === 'active' || status === 'recovering';

const decideAssessment = ({
  state,
  outcome,
}: {
  state: LifecycleState;
  outcome: StatusOutcome;
}): LifecycleDecision => {
  const { status } = state;

  if (!isLive(status)) {
    // Only a breach opens or reopens (a new episode on an inactive series).
    return outcome === 'breaching'
      ? { write: true, status: 'active' }
      : { write: false, reason: 'not_a_breach' };
  }

  if (outcome === 'breaching') {
    return { write: true, status: 'active' };
  }
  if (status === 'active' && outcome === 'clean') {
    return { write: true, status: 'recovering' };
  }
  // A healthy or unjudged assessment of a recovering series, or an unjudged one of an active
  // series: the evidence is kept and the status stands. Discovery never closes a series.
  return { write: true, status: status === 'recovering' ? 'recovering' : 'active' };
};

export const decideLifecycle = ({
  state,
  input,
}: {
  state: LifecycleState;
  input: LifecycleInput;
}): LifecycleDecision => {
  const { status } = state;

  switch (input.kind) {
    case 'assessment':
      return decideAssessment({ state, outcome: input.outcome });

    case 'operator':
      if (input.intent === 'deactivate') {
        return isLive(status)
          ? { write: true, status: 'inactive' }
          : { write: false, reason: 'already_in_state' };
      }
      // Activate overrides the assessment, like the framework's own activate action.
      return status === 'active'
        ? { write: false, reason: 'already_in_state' }
        : { write: true, status: 'active' };

    case 'rule_deleted':
      return isLive(status)
        ? { write: true, status: 'inactive' }
        : { write: false, reason: 'already_in_state' };
  }
};
