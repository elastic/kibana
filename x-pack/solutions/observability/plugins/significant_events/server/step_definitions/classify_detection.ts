/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalVerdict } from '@kbn/significant-events-schema';
import type { LiveRuleMembership } from '../lib/significant_events/events/rule_events_client';

export const PROBE_STATUSES = ['ok', 'error', 'timeout', 'no_query', 'aborted'] as const;
export type ProbeStatus = (typeof PROBE_STATUSES)[number];

/** What re-running a rule's stored query found. `hasRows` only means something when `ok`. */
export interface ProbeOutcome {
  status: ProbeStatus;
  hasRows: boolean;
}

export type DetectionDecision = 'skip' | 'needs_agent';

export const DECISION_REASONS = [
  'still_breaching',
  'still_healthy',
  'possible_recovery',
  'possible_rebreach',
  'not_live_member',
  'unjudged_member',
  'no_stored_query',
  'probe_error',
  'probe_timeout',
  'probe_aborted',
  'over_cap',
] as const;
export type DecisionReason = (typeof DECISION_REASONS)[number];

export interface DetectionClassification {
  decision: DetectionDecision;
  reason: DecisionReason;
}

export type MemberState = 'breaching' | 'healthy' | 'unjudged';

/** `confirms` is breaching and `refutes` is healthy; every other verdict cannot be judged. */
export const toMemberState = (verdict: SignalVerdict): MemberState => {
  if (verdict === 'confirms') return 'breaching';
  if (verdict === 'refutes') return 'healthy';
  return 'unjudged';
};

const NEEDS_AGENT_FOR_PROBE: Record<Exclude<ProbeStatus, 'ok'>, DecisionReason> = {
  error: 'probe_error',
  timeout: 'probe_timeout',
  aborted: 'probe_aborted',
  no_query: 'no_stored_query',
};

const needsAgent = (reason: DecisionReason): DetectionClassification => ({
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
  memberships: ReadonlyArray<Pick<LiveRuleMembership, 'verdict'>>;
  probe: ProbeOutcome;
}): DetectionClassification => {
  if (memberships.length === 0) return needsAgent('not_live_member');

  const states = memberships.map(({ verdict }) => toMemberState(verdict));
  if (states.includes('unjudged')) return needsAgent('unjudged_member');

  if (probe.status !== 'ok') return needsAgent(NEEDS_AGENT_FOR_PROBE[probe.status]);

  const hasBreachingWithoutRows = !probe.hasRows && states.includes('breaching');
  if (hasBreachingWithoutRows) return needsAgent('possible_recovery');

  const hasHealthyWithRows = probe.hasRows && states.includes('healthy');
  if (hasHealthyWithRows) return needsAgent('possible_rebreach');

  // Past both guards, either every state is breaching and rows exist, or every state is healthy
  // and no rows exist: fresh evidence matches the stored state everywhere.
  return { decision: 'skip', reason: probe.hasRows ? 'still_breaching' : 'still_healthy' };
};
