/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  NeedsAgentReason,
  ProbeStatus,
  SignalVerdict,
  SkipReason,
} from '@kbn/significant-events-schema';

/** What re-running a rule's stored query found. `hasRows` only means something when `ok`. */
export interface ProbeOutcome {
  status: ProbeStatus;
  hasRows: boolean;
}

export type DetectionClassification =
  | { decision: 'skip'; reason: SkipReason }
  | { decision: 'needs_agent'; reason: NeedsAgentReason };

type MemberState = 'breaching' | 'healthy' | 'unjudged';

/** `confirms` is breaching and `refutes` is healthy; every other verdict cannot be judged. */
export const toMemberState = (verdict: SignalVerdict): MemberState => {
  if (verdict === 'confirms') return 'breaching';
  if (verdict === 'refutes') return 'healthy';
  return 'unjudged';
};

const needsAgent = (reason: NeedsAgentReason): DetectionClassification => ({
  decision: 'needs_agent',
  reason,
});

/**
 * Decides whether a detection needs the discovery agent, by comparing fresh evidence (does the
 * stored query still return rows) with the member's stored state in every live series it is in.
 * The agent is only needed when the two disagree; a skip requires positive evidence that nothing
 * changed, so any gap in that evidence sends the detection to the agent.
 */
export const classifyDetection = ({
  memberships,
  probe,
}: {
  memberships: ReadonlyArray<{ verdict: SignalVerdict; evidenceFound?: boolean }>;
  probe: ProbeOutcome;
}): DetectionClassification => {
  if (memberships.length === 0) return needsAgent('not_live_member');

  const states = memberships.map(({ verdict }) => toMemberState(verdict));
  if (states.includes('unjudged')) return needsAgent('unjudged_member');

  if (probe.status !== 'ok') return needsAgent('probe_unavailable');

  // A healthy verdict reached on found rows cannot be revalidated by row presence alone, because the
  // probe does not inspect row content.
  if (memberships.some(({ verdict, evidenceFound }) => verdict === 'refutes' && evidenceFound)) {
    return needsAgent('state_changed');
  }

  // A breach expects rows; a healthy verdict expects none.
  const expectsRows = memberships.map((_, index) => states[index] === 'breaching');

  if (expectsRows.some((expected) => expected !== probe.hasRows)) {
    return needsAgent('state_changed');
  }

  // The probe agrees with every member's expectation.
  return {
    decision: 'skip',
    reason: states.includes('breaching') && probe.hasRows ? 'still_breaching' : 'still_healthy',
  };
};
