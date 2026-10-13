/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SignificantEvent,
  SignificantEventManualStatus,
  SignificantEventStatus,
} from '@kbn/significant-events-schema';
import type { StatusOutcome } from './status_outcome';

/**
 * The one place that decides a significant event's status. Every caller submits a typed change, built with `StatusChange`;
 * none of them picks a status. Pure: no I/O, no caller identity. Who may submit which change is the
 * write authority's concern, not this function's.
 *
 * A new way to change a status is a new change kind and one case in `decideLifecycle`.
 */
export type StatusChange =
  /**
   * What discovery's stored verdicts say about the event's members after a write is merged:
   * `breaching` when any member asserts a breach, `clean` when every member is healthy, `no_data`
   * when none asserts a breach but some cannot be judged.
   */
  | { kind: 'assessment'; outcome: StatusOutcome }
  /** The status an operator chose, through the update route or a chat tool. */
  | { kind: 'operator'; status: SignificantEventManualStatus }
  /** The rule backing the event no longer exists. */
  | { kind: 'rule_deleted' };

/** Named constructors for a `StatusChange`, so callers never spell out the union. */
export const StatusChange = {
  /** The status an operator chose, through the update route or a chat tool. */
  byOperator: (status: SignificantEventManualStatus): StatusChange => ({
    kind: 'operator',
    status,
  }),
  /** The rule backing the event no longer exists. */
  ruleDeleted: (): StatusChange => ({ kind: 'rule_deleted' }),
  /** What discovery's stored verdicts say about the event's members after a write is merged. */
  assessed: (outcome: StatusOutcome): StatusChange => ({ kind: 'assessment', outcome }),
};

export interface LifecycleState {
  /** Undefined when the event has no version yet. */
  status: SignificantEventStatus | undefined;
}

export type LifecycleSkipReason =
  /** The series is already in the state the change asks for. */
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
  change,
}: {
  state: LifecycleState;
  change: StatusChange;
}): LifecycleDecision => {
  const { status } = state;

  switch (change.kind) {
    case 'assessment':
      return decideAssessment({ state, outcome: change.outcome });

    case 'operator':
      if (change.status === 'inactive') {
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

export type StatusChangeDecision =
  /** Write `event`, the version that follows `latest`. */
  | { write: true; event: SignificantEvent }
  | {
      write: false;
      /** The status the series keeps. */
      status: SignificantEventStatus;
      reason: LifecycleSkipReason;
    };

/**
 * The status a change asks for, for a caller to report when there is no event to apply it to.
 */
export const requestedStatus = (change: StatusChange): SignificantEventStatus => {
  switch (change.kind) {
    case 'operator':
      return change.status;
    case 'rule_deleted':
      return 'inactive';
    case 'assessment':
      return 'active';
  }
};

/**
 * Everything about a status transition: applies a change to an event's latest version and
 * returns the version to write, or why nothing should be written. Pure: the caller reads `latest`,
 * persists the result and guards against concurrent writers, and knows none of the transition
 * rules.
 */
export const decideStatusChange = ({
  latest,
  change,
  assessmentNote,
  timestamp,
}: {
  latest: SignificantEvent;
  change: StatusChange;
  assessmentNote?: string;
  /** `@timestamp` of the version to write. */
  timestamp: string;
}): StatusChangeDecision => {
  const decision = decideLifecycle({ state: { status: latest.status }, change });
  if (!decision.write) {
    return { write: false, status: latest.status, reason: decision.reason };
  }
  // A decision that keeps the status (an assessment that only confirms it) writes nothing.
  if (decision.status === latest.status) {
    return { write: false, status: latest.status, reason: 'already_in_state' };
  }

  // A blank note counts as omitted, so it cannot overwrite the existing one.
  const note = assessmentNote?.trim();
  return {
    write: true,
    event: {
      ...latest,
      '@timestamp': timestamp,
      status: decision.status,
      ...(note ? { assessment_note: note } : {}),
    },
  };
};
