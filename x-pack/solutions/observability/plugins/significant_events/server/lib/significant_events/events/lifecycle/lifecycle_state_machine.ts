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
import { nextStatus, type StatusOutcome } from './status_transition';

/**
 * The one place that decides a significant event's status. Every caller
 * submits a typed input; none of them picks a status. Pure: no I/O, no caller identity. Who may
 * submit which input is the write authority's concern, not this function's.
 *
 * The evaluation path deliberately copies the Alerting v2 director's transition table
 * (`CountTimeframeStrategy`) instead of calling it: the director only runs inside a rule's
 * execution and needs a rule (`RuleResponse`) to read its `state_transition`, our events have no
 * backing rule and are written through `create_alert`, which never runs it, and it is internal to
 * `alerting_v2`.
 */
export type LifecycleInput =
  /** One scheduled evaluation of the series' member rules. */
  | { kind: 'evaluation'; outcome: StatusOutcome }
  /**
   * What discovery's stored verdicts say about the event's members after a write is merged:
   * `breaching` when any member asserts a breach, `clean` when every member is healthy, `no_data`
   * when none asserts a breach but some cannot be judged. Observed once per discovery write, so
   * it carries no count.
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

/**
 * `evaluations` is read only while the status is `recovering`. A framework action (an operator
 * activating or deactivating in the alerts UI) copies a version's data verbatim, so a stale count
 * can sit on an active or inactive version, and must be ignored there.
 */
export interface LifecycleState {
  /** Undefined when the event has no version yet. */
  status: SignificantEventStatus | undefined;
  /** Evaluations the series has spent in `recovering`; ignored in every other state. */
  evaluations: number;
}

export type LifecycleSkipReason =
  /** The input does not change the status. */
  | 'unchanged'
  /** An evaluation could not judge a member; the status stands. */
  | 'no_data'
  /** The series is already in the state the input asks for. */
  | 'already_in_state'
  /** Only a breach opens an event: a healthy or unjudged assessment of a closed or new series. */
  | 'not_a_breach'
  /** The input needs a live series and there is none. */
  | 'not_live';

export type LifecycleDecision =
  /** Append a version carrying `status`; `evaluations` is set only while `recovering`. */
  | { write: true; status: SignificantEventStatus; evaluations?: number }
  | { write: false; reason: LifecycleSkipReason };

const isLive = (status: SignificantEventStatus | undefined): boolean =>
  status === 'active' || status === 'recovering';

const decideEvaluation = ({
  state,
  outcome,
}: {
  state: LifecycleState;
  outcome: StatusOutcome;
}): LifecycleDecision => {
  const { status, evaluations } = state;
  if (status !== 'active' && status !== 'recovering') {
    return { write: false, reason: 'not_live' };
  }

  const transition = nextStatus({
    current: status,
    outcome,
    statusCount: evaluations,
  });
  if (!transition.write) {
    return { write: false, reason: outcome === 'no_data' ? 'no_data' : 'unchanged' };
  }
  return transition.status === 'recovering'
    ? {
        write: true,
        status: 'recovering',
        evaluations: (status === 'recovering' ? evaluations : 0) + 1,
      }
    : { write: true, status: transition.status };
};

const decideAssessment = ({
  state,
  outcome,
}: {
  state: LifecycleState;
  outcome: StatusOutcome;
}): LifecycleDecision => {
  const { status, evaluations } = state;

  if (status !== 'active' && status !== 'recovering') {
    // Only a breach opens or reopens (a new episode on an inactive series).
    return outcome === 'breaching'
      ? { write: true, status: 'active' }
      : { write: false, reason: 'not_a_breach' };
  }

  if (outcome === 'breaching') {
    return { write: true, status: 'active' };
  }
  if (status === 'active' && outcome === 'clean') {
    return { write: true, status: 'recovering', evaluations: 1 };
  }
  // A healthy or unjudged assessment of a recovering series, or an unjudged one of an active
  // series: the evidence is kept and the status stands. Discovery never closes a series, and it
  // does not advance the count: assessments are not periodic.
  return status === 'recovering'
    ? { write: true, status: 'recovering', evaluations }
    : { write: true, status: 'active' };
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
    case 'evaluation':
      return decideEvaluation({ state, outcome: input.outcome });

    case 'assessment':
      return decideAssessment({ state, outcome: input.outcome });

    case 'operator':
      if (input.intent === 'deactivate') {
        return isLive(status)
          ? { write: true, status: 'inactive' }
          : { write: false, reason: 'already_in_state' };
      }
      // Activate overrides the engine's assessment, like the framework's own activate action.
      return status === 'active'
        ? { write: false, reason: 'already_in_state' }
        : { write: true, status: 'active' };

    case 'rule_deleted':
      return isLive(status)
        ? { write: true, status: 'inactive' }
        : { write: false, reason: 'already_in_state' };
  }
};
