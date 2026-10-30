/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationRoundKind } from '../client/round_kind';
import type { InvestigationToolCall } from '../decision_trees/accessed_trees';
import type { CausalCheckResult } from './causal_check';
import { findRecoveryOutcome, type RecoveryOutcome } from './recovery_outcome';

export const ROUND_VERDICT_SOURCES = [
  'initial_round',
  'recovery_outcome',
  'causal_check',
  'none',
] as const;

/** What a round tells the learners about the investigation's earlier conclusion. */
export interface RoundVerdict {
  /** The round corrects, confirms, or contradicts an earlier conclusion. */
  isFeedback: boolean;
  /** The round proved the root cause. Only then may a learner reinforce or promote it. */
  causalConfirmed: boolean;
  /** What was confirmed or what was wrong, for the learners' prompts. Empty when not feedback. */
  causalSummary: string;
  /** What a human taught the investigator, for the learning tools. */
  learning: string;
  source: (typeof ROUND_VERDICT_SOURCES)[number];
}

export const NO_VERDICT: RoundVerdict = {
  isFeedback: false,
  causalConfirmed: false,
  causalSummary: '',
  learning: '',
  source: 'none',
};

const hypothesesWith = (outcome: RecoveryOutcome, result: 'supported' | 'contradicted') =>
  outcome.hypotheses
    .filter((hypothesis) => hypothesis.outcome === result)
    .map((hypothesis) => `- ${hypothesis.candidate}`);

const describeRecovery = (outcome: RecoveryOutcome, verb: string): string => {
  const supported = hypothesesWith(outcome, 'supported');
  const contradicted = hypothesesWith(outcome, 'contradicted');
  return [
    `The alert recovered and ${verb} the root cause reported before it. ${outcome.resolution}`,
    ...(supported.length > 0 ? ['Supported by the recovery:', ...supported] : []),
    ...(contradicted.length > 0 ? ['Contradicted by the recovery:', ...contradicted] : []),
  ].join('\n');
};

/**
 * A snooze or maintenance window says nothing about the cause, and an unresolved verdict
 * tested nothing, so neither counts as feedback.
 */
export const verdictFromRecoveryOutcome = (outcome: RecoveryOutcome | undefined): RoundVerdict => {
  if (!outcome || outcome.resolved_by === 'suppressed' || outcome.verdict === 'unresolved') {
    return NO_VERDICT;
  }
  if (outcome.verdict === 'confirmed') {
    return {
      isFeedback: true,
      causalConfirmed: true,
      causalSummary: describeRecovery(outcome, 'confirmed'),
      learning: '',
      source: 'recovery_outcome',
    };
  }
  return {
    isFeedback: true,
    causalConfirmed: false,
    causalSummary: describeRecovery(
      outcome,
      outcome.verdict === 'contradicted' ? 'contradicted' : 'only partly supported'
    ),
    learning: '',
    source: 'recovery_outcome',
  };
};

export const classifyRound = async ({
  roundKind,
  toolCalls,
  runCausalCheck,
}: {
  roundKind: InvestigationRoundKind;
  toolCalls: readonly InvestigationToolCall[];
  /** Only called for a follow-up that is not an alert recovery. */
  runCausalCheck: () => Promise<CausalCheckResult>;
}): Promise<RoundVerdict> => {
  if (roundKind === 'initial') {
    return { ...NO_VERDICT, source: 'initial_round' };
  }
  if (roundKind === 'alert_recovery') {
    return verdictFromRecoveryOutcome(findRecoveryOutcome(toolCalls));
  }
  const result = await runCausalCheck();
  return {
    isFeedback: result.isFeedback,
    causalConfirmed: result.causalConfirmed,
    causalSummary: result.isFeedback ? result.causalSummary : '',
    learning: result.isFeedback ? result.learning : '',
    source: 'causal_check',
  };
};
