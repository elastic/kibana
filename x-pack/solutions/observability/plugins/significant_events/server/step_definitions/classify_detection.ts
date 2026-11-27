/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NeedsAgentReason, SignalVerdict, SkipReason } from '@kbn/significant-events-schema';

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
 * Decides whether a detection needs the discovery agent, by comparing whether the rule's query returns
 * rows now (`breached`: the rule recorded a breach in its last runs) with the member's stored state in
 * every live series it is in. The agent is only needed when the two disagree; a skip requires positive
 * evidence that nothing changed, so any gap in that evidence sends the detection to the agent.
 */
export const classifyDetection = ({
  memberships,
  breached,
}: {
  memberships: ReadonlyArray<{ verdict: SignalVerdict; evidenceFound?: boolean }>;
  breached: boolean;
}): DetectionClassification => {
  if (memberships.length === 0) return needsAgent('not_live_member');

  const states = memberships.map(({ verdict }) => toMemberState(verdict));

  // A change seen in any judged membership is observable whatever the others say, so it is checked
  // before the unjudged ones: a recovery candidate must reach the agent, not wait behind a member
  // whose verdict cannot be read.
  //
  // A healthy verdict reached on found rows cannot be revalidated by row presence alone, because the
  // breach record does not say what the rows were.
  if (memberships.some(({ verdict, evidenceFound }) => verdict === 'refutes' && evidenceFound)) {
    return needsAgent('state_changed');
  }

  // A breach expects rows; a healthy verdict expects none.
  if (states.some((state) => state !== 'unjudged' && (state === 'breaching') !== breached)) {
    return needsAgent('state_changed');
  }

  if (states.includes('unjudged')) return needsAgent('unjudged_member');

  // The rule agrees with every member, so they all expect what it recorded.
  return { decision: 'skip', reason: breached ? 'still_breaching' : 'still_healthy' };
};
