/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import type {
  SignificantEvent,
  SignificantEventManualStatus,
  SignificantEventStatus,
} from '@kbn/significant-events-schema';

/**
 * What the verdicts of an event's members add up to, or what one member's verdict says. The same
 * values as Alerting v2's `AlertEventStatus`, which that plugin does not export.
 */
export type StatusOutcome = 'breached' | 'recovered' | 'no_data';

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
   * `breached` when any member asserts a breach, `recovered` when every member is healthy, `no_data`
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
  /** A closed series is reopened only by a breach: a healthy or unjudged assessment leaves it closed. */
  | 'not_a_breach';

export type LifecycleDecision =
  /** Append a version carrying `status`. */
  { write: true; status: SignificantEventStatus } | { write: false; reason: LifecycleSkipReason };

const isLive = (status: SignificantEventStatus | undefined): boolean =>
  status === ALERT_EPISODE_STATUS.ACTIVE || status === ALERT_EPISODE_STATUS.RECOVERING;

const decideAssessment = ({
  state,
  outcome,
}: {
  state: LifecycleState;
  outcome: StatusOutcome;
}): LifecycleDecision => {
  const { status } = state;

  if (!isLive(status)) {
    // A breach opens a new series or reopens a closed one (a new episode).
    if (outcome === 'breached') return { write: true, status: ALERT_EPISODE_STATUS.ACTIVE };
    // A closed series stays closed: a healthy or unjudged assessment never reopens it.
    if (status !== undefined) return { write: false, reason: 'not_a_breach' };
    // A series with no version yet is born only from evidence that points to an error. Healthy
    // members mean nothing is failing, so there is nothing to open: `recovering` and `inactive` are
    // transitions of an event that was active, never a birth. Evidence that cannot be judged opens
    // it active until it settles.
    if (outcome === 'recovered') return { write: false, reason: 'not_a_breach' };
    return { write: true, status: ALERT_EPISODE_STATUS.ACTIVE };
  }

  if (outcome === 'breached') {
    return { write: true, status: ALERT_EPISODE_STATUS.ACTIVE };
  }
  if (status === ALERT_EPISODE_STATUS.ACTIVE && outcome === 'recovered') {
    return { write: true, status: ALERT_EPISODE_STATUS.RECOVERING };
  }
  // A healthy or unjudged assessment of a recovering series, or an unjudged one of an active
  // series: the evidence is kept and the status stands. Discovery never closes a series.
  return {
    write: true,
    status:
      status === ALERT_EPISODE_STATUS.RECOVERING
        ? ALERT_EPISODE_STATUS.RECOVERING
        : ALERT_EPISODE_STATUS.ACTIVE,
  };
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
      if (change.status === ALERT_EPISODE_STATUS.INACTIVE) {
        return isLive(status)
          ? { write: true, status: ALERT_EPISODE_STATUS.INACTIVE }
          : { write: false, reason: 'already_in_state' };
      }
      // Activate overrides the assessment, like the framework's own activate action.
      return status === ALERT_EPISODE_STATUS.ACTIVE
        ? { write: false, reason: 'already_in_state' }
        : { write: true, status: ALERT_EPISODE_STATUS.ACTIVE };

    case 'rule_deleted':
      return isLive(status)
        ? { write: true, status: ALERT_EPISODE_STATUS.INACTIVE }
        : { write: false, reason: 'already_in_state' };
  }
};

export type StatusChangeDecision =
  | { write: true; event: SignificantEvent }
  | {
      write: false;
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
      return ALERT_EPISODE_STATUS.INACTIVE;
    case 'assessment':
      return ALERT_EPISODE_STATUS.ACTIVE;
  }
};

/** Applies a change to an event's latest version: the version to write, or why not. Pure. */
export const decideStatusChange = ({
  latest,
  change,
  assessmentNote,
  timestamp,
}: {
  latest: SignificantEvent;
  change: StatusChange;
  assessmentNote?: string;
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
